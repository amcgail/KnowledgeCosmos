import * as THREE from "/libs/three.js/build/three.module.js";
import { TourAnimations } from "./tourAnimations.js";
import { TourContent } from "./tourContent.js";
import { TourUI } from "./tourUI.js";
import { TourActions } from "./tourActions.js";

/**
 * TourController - Main controller class for the 3D visualization tour system
 * Coordinates animations, UI management, and tour flow
 */
export class TourController {
    constructor(viewer) {
        this.viewer = viewer;
        this.currentStep = 0;
        this.isActive = false;
        this.isNavigating = false;
        
        // Initialize component modules
        this.animations = new TourAnimations();
        this.tourContent = new TourContent();
        this.tourUI = new TourUI();
        this.actions = new TourActions(this.animations);
        
        // Set animation overlay reference
        this.animations.setOverlay(this.tourUI.clickAnimationOverlay);
        
        // Bind navigation event handlers
        this.bindEventHandlers();
        
        // Set up Celeste helper and load SVG
        this.setupCelesteHelper();
    }

    /**
     * Bind navigation button event handlers
     */
    bindEventHandlers() {
        const { prevButton, nextButton, closeButton } = this.tourUI;
        if (prevButton) prevButton.addEventListener('click', () => this.prevStep());
        if (nextButton) nextButton.addEventListener('click', () => this.nextStep());
        if (closeButton) closeButton.addEventListener('click', () => this.endTour());
    }

    /**
     * Set up Celeste helper
     */
    setupCelesteHelper() {
        const celesteElement = this.tourUI.celesteElement;
        if (celesteElement) {
            // Add click event listener with a check for tour status
            celesteElement.addEventListener('click', (e) => {
                if (!this.isActive) {
                    this.startTour();
                }
            });
            
            // Load the SVG on initialization
            this.tourUI.loadCelesteSVG();
        }
    }

    /**
     * Start the tour
     */
    startTour() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.currentStep = 0;
        
        // Show the tour UI
        this.tourUI.showTourUI();
        
        // Update Celeste's appearance for tour mode
        this.tourUI.setCelesteTourMode(true);
        
        // Create tour contents sidebar
        this.tourUI.setupTourContents(
            this.tourContent.getPhases(), 
            this.currentStep,
            (stepIndex) => {
                this.currentStep = stepIndex;
                // Get the correct step information using the absolute index
                const stepInfo = this.tourContent.getPhaseAndStep(stepIndex);
                if (stepInfo) {
                    this.showStep(stepInfo.stepIndex);
                } else {
                    console.warn('Invalid step index:', stepIndex);
                    // Fallback to first step
                    this.currentStep = 0;
                    this.showStep(0);
                }
            }
        );
        
        // Start first step
        this.showStep(0);
    }

    /**
     * Show a specific tour step
     */
    showStep(stepIndex) {
        if (!this.isActive) return;
        
        // Get current phase and step
        const { currentPhaseIndex, phase, step } = this.getCurrentStepInfo();
        const steps = phase.steps;
        
        // Ensure step index is valid
        if (stepIndex < 0 || stepIndex >= steps.length) return;
        
        // Calculate absolute step index
        let absoluteStepIndex = 0;
        for (let i = 0; i < currentPhaseIndex; i++) {
            absoluteStepIndex += this.tourContent.getPhases()[i].steps.length;
        }
        absoluteStepIndex += stepIndex;
        
        // Store current step index
        this.currentStep = absoluteStepIndex;
        
        // Clean up previous step
        this.actions.removeEventListeners();
        this.animations.clearActiveTimers();
        
        // Get step data
        const currentStep = steps[stepIndex];
        
        // Apply the arrangement for this specific step
        this.tourUI.applyArrangement(currentStep.arrangement || 1);
        
        // Update message content
        this.tourUI.updateStepContent(currentStep);
        
        // Update button states
        this.tourUI.updateNavigationButtons(this.currentStep, this.tourContent.getTotalSteps());
        
        // Update active phase and step in sidebar
        const { currentStepInPhase } = this.getCurrentStepInfo();
        this.tourUI.updateContentsHighlight(currentPhaseIndex, currentStepInPhase);
        
        // Set arrow key visibility immediately based on step title - don't wait for the animation
        this.updateArrowKeyVisibility(currentStep.title);
        
        // Add a small delay before starting any animations to ensure UI is fully updated
        setTimeout(() => {
            // If there's an action, disable navigation buttons during animation
            if (currentStep.action) {
                // Disable navigation buttons during animation
                this.isNavigating = true;
                this.tourUI.disableNavigationButtons(true);
                
                // Perform the step's action with a callback to re-enable navigation
                this.performAction(currentStep.action, () => {
                    this.isNavigating = false;
                    this.tourUI.disableNavigationButtons(false);
                });
            }
        }, 0);
    }

    /**
     * Perform a tour action
     */
    performAction(action, completionCallback) {
        // Ensure action is valid
        if (!action || !action.type) {
            console.warn('Invalid action provided to performAction:', action);
            if (completionCallback) completionCallback();
            return;
        }
        
        // Handle action sequences
        if (action.type === 'sequence') {
            if (!action.actions || !Array.isArray(action.actions) || action.actions.length === 0) {
                console.warn('Invalid sequence action provided:', action);
                if (completionCallback) completionCallback();
                return;
            }
            
            // Perform actions in sequence with delays between them
            let currentIndex = 0;
            
            const performNextAction = () => {
                if (currentIndex >= action.actions.length || !this.isActive) {
                    if (completionCallback) completionCallback();
                    return;
                }
                
                const currentAction = action.actions[currentIndex];
                
                // Make sure each action gets its base delay (if not present, use from parent)
                if (!currentAction.delay && action.delay) {
                    currentAction.delay = action.delay;
                }
                
                // Perform current action
                this.performAction(currentAction, () => {
                    // Move to next index
                    currentIndex++;
                    
                    // Schedule next action after delay if there are more actions
                    if (currentIndex < action.actions.length) {
                        const previousAction = action.actions[currentIndex - 1];
                        // Use sequenceDelay for timing between actions or fall back to a default
                        const delay = previousAction.sequenceDelay || 1500;
                        
                        console.log(`Scheduling next action in sequence after ${delay}ms delay`);
                        
                        // Track the timer to ensure it gets cleaned up properly
                        const timerId = setTimeout(performNextAction, delay);
                        this.animations.trackTimer(timerId);
                    } else {
                        // All actions in sequence complete
                        if (completionCallback) completionCallback();
                    }
                });
            };
            
            // Start the sequence after a small delay
            const initialTimerId = setTimeout(performNextAction, 100);
            this.animations.trackTimer(initialTimerId);
            return;
        }
        
        // Handle JavaScript function execution
        if (action.type === 'jsFunction') {
            if (typeof action.functionToExecute === 'function') {
                // Execute the directly passed function
                try {
                    const delay = action.delay || 50;
                    this.animations.trackTimer(setTimeout(() => {
                        action.functionToExecute();
                        if (completionCallback) completionCallback();
                    }, delay));
                } catch (error) {
                    console.error('Error executing function:', error);
                    if (completionCallback) completionCallback();
                }
                return;
            } else if (!action.functionName) {
                console.warn('Missing function reference in jsFunction action:', action);
                if (completionCallback) completionCallback();
                return;
            }
            
            try {
                // Use action.delay if provided, otherwise a small default delay
                const delay = action.delay || 50;
                
                // Execute function after specified delay
                this.animations.trackTimer(setTimeout(() => {
                    // Check if this is an inline function definition (starts with "function()")
                    if (action.functionName.startsWith('function(')) {
                        // This is a custom function string, evaluate it and execute
                        try {
                            const customFunc = new Function('return ' + action.functionName)();
                            customFunc();
                        } catch (evalError) {
                            console.error('Error executing custom function:', evalError);
                        }
                        if (completionCallback) completionCallback();
                        return;
                    }
                    
                    // Standard function lookup
                    // Determine context for function execution
                    let context = window;
                    if (action.context === 'viewer') {
                        context = this.viewer;
                    } else if (action.context === 'yearFilter') {
                        // Use the globally available controls object instead of viewer.controls
                        context = window.controls.yearFilter;
                    }
                    
                    // Get the function
                    const func = action.functionName.split('.').reduce((obj, prop) => {
                        // Handle jQuery-style functions for the yearRange slider
                        if (prop === 'yearRange.slider' && obj === window.controls.yearFilter) {
                            return function(method, values) {
                                $('#year-range-slider').slider(method, values);
                            };
                        }
                        return obj[prop];
                    }, context);
                    
                    if (typeof func === 'function') {
                        // Execute function with parameters if provided
                        if (action.params) {
                            func.apply(context, action.params);
                        } else {
                            func.call(context);
                        }
                        if (completionCallback) completionCallback();
                    } else {
                        console.warn(`Function ${action.functionName} is not callable:`, func);
                        if (completionCallback) completionCallback();
                    }
                }, delay));
            } catch (error) {
                console.error(`Error executing function ${action.functionName}:`, error);
                if (completionCallback) completionCallback();
            }
            return;
        }
        
        // Small delay to ensure UI is ready
        setTimeout(() => {
            try {
                // Track if an action has an internal completion callback
                let actionHasCallback = false;
                
                switch (action.type) {
                    case 'keyboardEvent':
                        this.setupKeyboardAction(action, completionCallback);
                        actionHasCallback = true;
                        break;
                    case 'mouseEvent':
                        // Future implementation
                        break;
                    case 'doubleClickEvent':
                        this.setupDoubleClickAction(action, completionCallback);
                        actionHasCallback = true;
                        break;
                    case 'clickEvent':
                        this.actions.setupClickAction(action, this.isActive, this.tourUI.clickAnimationOverlay, completionCallback);
                        actionHasCallback = true;
                        break;
                    case 'rotateEvent':
                        this.setupRotateAction(action, completionCallback);
                        actionHasCallback = true;
                        break;
                    case 'inputField':
                        this.actions.setupInputField(action, this.isActive, completionCallback);
                        actionHasCallback = true;
                        break;
                    case 'findPaper':
                        this.actions.findAndSelectPaper(action, this.isActive, completionCallback);
                        actionHasCallback = true;
                        break;
                    case 'rangeSlider':
                        // Future implementation
                        break;
                    default:
                        console.warn(`Unknown action type: ${action.type}`);
                }
                
                // For actions that don't have internal callbacks yet, use a timeout
                if (!actionHasCallback && completionCallback) {
                    const fallbackDuration = (action.delay || 4000) + 4000;
                    const fallbackTimerId = setTimeout(completionCallback, fallbackDuration);
                    this.animations.trackTimer(fallbackTimerId);
                }
            } catch (error) {
                console.error(`Error performing action ${action.type}:`, error);
                // Ensure callback is called even if there's an error
                if (completionCallback) completionCallback();
            }
        }, action.delay || 50); // Use action.delay if provided, otherwise a small default
    }

    /**
     * Setup keyboard action
     */
    setupKeyboardAction(action, completionCallback) {
        // Ensure we have valid keys
        if (!action.keys || !Array.isArray(action.keys) || action.keys.length === 0) {
            console.warn('Invalid keys in keyboard action:', action);
            if (completionCallback) completionCallback();
            return;
        }
        
        // Note: Container visibility is now handled by updateArrowKeyVisibility
        // in the showStep method, so we don't need to set it here
        
        // Map of HTML elements for all four arrow keys
        const keyElements = {
            'arrowup': document.getElementById('arrow-up-key'),
            'arrowdown': document.getElementById('arrow-down-key'),
            'arrowleft': document.getElementById('arrow-left-key'),
            'arrowright': document.getElementById('arrow-right-key')
        };
        
        // Demo the key presses in sequence
        this.demoKeyPresses(keyElements, action, completionCallback);
        
        // Register keyboard events for all arrow keys
        const keyListener = (event) => {
            const key = event.key.toLowerCase();
            if (keyElements[key]) {
                keyElements[key].classList.add('pressed');
                this.animations.trackTimer(setTimeout(() => {
                    if (keyElements[key]) { // Check element still exists
                        keyElements[key].classList.remove('pressed');
                    }
                }, 300));
            }
        };
        
        window.addEventListener('keydown', keyListener);
        
        // Add to cleanup list
        this.actions.eventListeners.push({
            type: 'keydown',
            listener: keyListener
        });
    }

    /**
     * Demo key presses animation
     */
    demoKeyPresses(keyElements, action, completionCallback) {
        if (!this.isActive) {
            if (completionCallback) completionCallback();
            return;
        }
        
        // Determine sequence based on step info
        const currentStepInfo = this.getCurrentStepInfo();
        const step = currentStepInfo.step;
        
        // Default sequence
        let demoSequence = [
            { key: 'arrowleft', duration: 1000 },
            { key: 'arrowright', duration: 1000 }
        ];
        
        // Customize sequence based on step title
        if (step) {
            if (step.title === "Moving around") {
                // Show all arrow keys and animate left/right
                Object.keys(keyElements).forEach(key => {
                    if (keyElements[key]) {
                        keyElements[key].style.display = 'flex';
                    }
                });
                
                demoSequence = [
                    { key: 'arrowleft', duration: 1000 },
                    { key: 'arrowright', duration: 1000 }
                ];
            } else if (step.title === "Zooming in and out") {
                // Show all arrow keys and animate up/down
                Object.keys(keyElements).forEach(key => {
                    if (keyElements[key]) {
                        keyElements[key].style.display = 'flex';
                    }
                });
                
                demoSequence = [
                    { key: 'arrowup', duration: 5000 },
                    { key: 'arrowdown', duration: 3000 }
                ];
            } else {
                // For other steps, we already hide the entire container in updateArrowKeyVisibility
                // But ensure all keys are properly visible inside the container for when it's shown again
                Object.keys(keyElements).forEach(key => {
                    if (keyElements[key]) {
                        keyElements[key].style.display = 'flex';
                    }
                });
            }
        }
        
        let index = 0;
        
        const playNextDemo = () => {
            if (!this.isActive || index >= demoSequence.length) {
                if (completionCallback) completionCallback();
                return;
            }
            
            const demo = demoSequence[index];
            const keyElement = keyElements[demo.key];
            
            if (keyElement) {
                // Simulate key press visually
                keyElement.classList.add('pressed');
                
                // Simulate actual movement
                this.animations.simulateKeyPress(demo.key, demo.duration);
                
                // Remove pressed state after duration
                const keyPressTimerId = setTimeout(() => {
                    keyElement.classList.remove('pressed');
                    
                    // Move to next key in sequence
                    index++;
                    if (index < demoSequence.length && this.isActive) {
                        const nextKeyTimerId = setTimeout(playNextDemo, 300);
                        this.animations.trackTimer(nextKeyTimerId);
                    } else {
                        // Sequence completed
                        if (completionCallback) completionCallback();
                    }
                }, demo.duration);
                
                this.animations.trackTimer(keyPressTimerId);
            } else {
                // Skip this step if the key element doesn't exist
                index++;
                if (index < demoSequence.length && this.isActive) {
                    const skipKeyTimerId = setTimeout(playNextDemo, 300);
                    this.animations.trackTimer(skipKeyTimerId);
                } else {
                    // Sequence completed
                    if (completionCallback) completionCallback();
                }
            }
        };
        
        // Start the demo sequence
        playNextDemo();
    }

    /**
     * Setup double click action
     */
    setupDoubleClickAction(action, completionCallback) {
        // Create mouse cursor visual
        const cursor = document.createElement('div');
        cursor.className = 'mouse-cursor';
        cursor.innerHTML = '<i class="fas fa-mouse-pointer"></i>';
        
        // Clear and use the existing animation overlay
        if (this.tourUI.clickAnimationOverlay) {
            this.tourUI.clickAnimationOverlay.innerHTML = '';
            this.tourUI.clickAnimationOverlay.appendChild(cursor);
        }
        
        // Store for cleanup
        this.actions.eventListeners.push({
            type: 'mouseCursor',
            element: cursor
        });
        
        // Position at center of screen
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        cursor.style.left = `${centerX}px`;
        cursor.style.top = `${centerY}px`;
        
        // Start double-click animation after a delay
        const timerId = this.animations.trackTimer(setTimeout(() => {
            if (!this.isActive) {
                if (completionCallback) completionCallback();
                return; // Check if tour is still active
            }
            
            this.animateDoubleClick(cursor, centerX, centerY, () => {
                // Perform the double-click effect
                if (this.isActive) { // Verify tour is still active before starting animation
                    this.animations.performJumpAnimation(this.viewer, () => {
                        // Animation complete, call the completion callback
                        if (completionCallback) completionCallback();
                    });
                } else {
                    if (completionCallback) completionCallback();
                }
            });
        }, 1500));
    }
    
    /**
     * Animate a double click
     */
    animateDoubleClick(cursor, x, y, callback) {
        // Add animation class to cursor
        cursor.classList.add('active');
        
        // First click
        this.animations.simulateClick(x, y, () => {
            // Brief pause between clicks
            this.animations.trackTimer(setTimeout(() => {
                // Second click
                this.animations.simulateClick(x, y, () => {
                    // After double-click completes, remove active state and call callback
                    cursor.classList.remove('active');
                    if (callback) callback();
                });
            }, 150));
        });
    }

    /**
     * Setup rotate action
     */
    setupRotateAction(action, completionCallback) {
        if (!this.tourUI.clickAnimationOverlay) {
            if (completionCallback) completionCallback();
            return;
        }
        
        // Clear animation overlay
        this.tourUI.clickAnimationOverlay.innerHTML = '';
        
        // Create mouse cursor visual
        const cursor = document.createElement('div');
        cursor.className = 'mouse-cursor';
        cursor.innerHTML = '<i class="fas fa-mouse-pointer"></i>';
        this.tourUI.clickAnimationOverlay.appendChild(cursor);
        
        // Store for cleanup
        this.actions.eventListeners.push({
            type: 'mouseCursor',
            element: cursor
        });
        
        // Start at center position
        let currentX = window.innerWidth / 2;
        let currentY = window.innerHeight / 2;
        
        cursor.style.left = `${currentX}px`;
        cursor.style.top = `${currentY}px`;
        
        // Define circle parameters
        const centerX = currentX;
        const centerY = currentY;
        const radius = 80;
        const rotationDuration = 6000; // 6 seconds for a full rotation
        
        // Start rotation animation
        const rotateTimerId = setTimeout(() => {
            if (!this.isActive) {
                if (completionCallback) completionCallback();
                return;
            }
            
            // First move cursor to the edge of the circle 
            // We'll place it at the rightmost point of the circle (angle 0)
            const targetX = centerX + radius;
            const targetY = centerY;
            
            // Animate cursor movement to the edge
            this.animations.animateCursorMovement(cursor, centerX, centerY, targetX, targetY, () => {
                // Brief pause before mouse down for more natural feeling
                setTimeout(() => {
                    // Now that we're at the edge, simulate mouse down
                    cursor.classList.add('active');
                    
                    // Animate mouse movement in a circular path to simulate rotation
                    let angle = 0;
                    const startTime = performance.now();
                    
                    // Previous position to draw path segments
                    let prevX = targetX;
                    let prevY = targetY;
                    
                    // Array to store path segments
                    const pathSegments = [];
                    
                    const animateRotation = () => {
                        const elapsed = performance.now() - startTime;
                        const progress = Math.min(1, elapsed / rotationDuration);
                        
                        // Move in a circular path, starting from angle 0
                        angle = progress * Math.PI * 2;
                        currentX = centerX + Math.cos(angle) * radius;
                        currentY = centerY + Math.sin(angle) * radius;
                        
                        cursor.style.left = `${currentX}px`;
                        cursor.style.top = `${currentY}px`;
                        
                        // Create path segment
                        if (Math.abs(currentX - prevX) > 5 || Math.abs(currentY - prevY) > 5) {
                            const pathSegment = document.createElement('div');
                            pathSegment.className = 'drag-path';
                            
                            // Calculate length and angle
                            const length = Math.sqrt(Math.pow(currentX - prevX, 2) + Math.pow(currentY - prevY, 2));
                            const angleRad = Math.atan2(currentY - prevY, currentX - prevX);
                            
                            // Position and rotate
                            pathSegment.style.width = `${length}px`;
                            pathSegment.style.left = `${prevX}px`;
                            pathSegment.style.top = `${prevY}px`;
                            pathSegment.style.transform = `rotate(${angleRad}rad)`;
                            
                            this.tourUI.clickAnimationOverlay.appendChild(pathSegment);
                            pathSegments.push(pathSegment);
                            
                            // Fade out older segments gradually
                            if (pathSegments.length > 10) {
                                pathSegments[0].classList.add('fading');
                                const segmentTimerId = setTimeout(() => {
                                    if (pathSegments[0].parentNode) {
                                        pathSegments[0].parentNode.removeChild(pathSegments[0]);
                                    }
                                    pathSegments.shift();
                                }, 500);
                                this.animations.trackTimer(segmentTimerId);
                            }
                            
                            // Update previous position
                            prevX = currentX;
                            prevY = currentY;
                        }
                        
                        // Rotate the camera
                        this.animations.rotateCamera(this.viewer, progress * 360);
                        
                        if (progress < 1 && this.isActive) {
                            const animationId = requestAnimationFrame(animateRotation);
                            // Track animation frame ID
                            this.animations.trackAnimationFrame(animationId);
                        } else {
                            // End the rotation
                            cursor.classList.remove('active');
                            
                            // Clean up path segments
                            pathSegments.forEach(segment => {
                                segment.classList.add('fading');
                            });
                            
                            const cleanupTimerId = setTimeout(() => {
                                pathSegments.forEach(segment => {
                                    if (segment.parentNode) {
                                        segment.parentNode.removeChild(segment);
                                    }
                                });
                                
                                // Animation complete, call the completion callback
                                if (completionCallback) completionCallback();
                            }, 500);
                            this.animations.trackTimer(cleanupTimerId);
                        }
                    };
                    
                    const initialAnimationId = requestAnimationFrame(animateRotation);
                    this.animations.trackAnimationFrame(initialAnimationId);
                }, 300); // Small delay before starting rotation
            });
        }, 1500);
        
        // Track the rotation timer ID
        this.animations.trackTimer(rotateTimerId);
    }

    /**
     * Get current phase, step, and related info
     */
    getCurrentStepInfo() {
        // Get data from content manager
        const result = this.tourContent.getPhaseAndStep(this.currentStep);
        
        if (!result) return {
            currentPhaseIndex: 0,
            phase: this.tourContent.getPhases()[0],
            step: this.tourContent.getPhases()[0].steps[0],
            currentStepInPhase: 0
        };
        
        return {
            currentPhaseIndex: result.phaseIndex,
            phase: result.phase,
            step: result.step,
            currentStepInPhase: result.stepIndex
        };
    }

    /**
     * Navigate to next step
     */
    nextStep() {
        if (!this.isActive || this.isNavigating) return;
        
        // Set navigating flag to prevent multiple rapid clicks
        this.isNavigating = true;
        
        // Calculate total steps across all phases
        const totalSteps = this.tourContent.getTotalSteps();
        
        // If we're at the last step, end the tour
        if (this.currentStep >= totalSteps - 1) {
            this.endTour();
            return;
        }
        
        // Calculate the current phase and step index within phase
        const { currentPhaseIndex, currentStepInPhase } = this.getCurrentStepInfo();
        const stepsInCurrentPhase = this.tourContent.getPhases()[currentPhaseIndex].steps.length;
        
        // Clean up existing animations before proceeding
        this.actions.removeEventListeners();
        this.animations.clearActiveTimers();
        
        if (currentStepInPhase < stepsInCurrentPhase - 1) {
            // Next step in same phase
            this.showStep(currentStepInPhase + 1);
        } else {
            // First step in next phase (if there is one)
            if (currentPhaseIndex < this.tourContent.getPhases().length - 1) {
                // Update the currentStep directly
                this.currentStep++;
                // Show first step of next phase
                this.showStep(0);
            } else {
                // We're at the last step of the last phase
                this.endTour();
            }
        }
        
        // Reset navigating flag after a short delay to prevent rapid clicking
        setTimeout(() => {
            this.isNavigating = false;
        }, 500);
    }

    /**
     * Navigate to previous step
     */
    prevStep() {
        if (!this.isActive || this.isNavigating || this.currentStep <= 0) return;
        
        // Set navigating flag to prevent multiple rapid clicks
        this.isNavigating = true;
        
        // Calculate the current phase and step index within phase
        const { currentPhaseIndex, currentStepInPhase } = this.getCurrentStepInfo();
        
        // Clean up existing animations before proceeding
        this.actions.removeEventListeners();
        this.animations.clearActiveTimers();
        
        if (currentStepInPhase > 0) {
            // Previous step in same phase
            this.showStep(currentStepInPhase - 1);
        } else if (currentPhaseIndex > 0) {
            // Last step in previous phase
            const previousPhaseIndex = currentPhaseIndex - 1;
            const previousPhaseStepCount = this.tourContent.getPhases()[previousPhaseIndex].steps.length;
            
            // Update the currentStep directly
            this.currentStep--;
            // Show the last step of the previous phase
            this.showStep(previousPhaseStepCount - 1);
        }
        
        // Reset navigating flag after a short delay to prevent rapid clicking
        setTimeout(() => {
            this.isNavigating = false;
        }, 500);
    }

    /**
     * End the tour
     */
    endTour() {
        if (!this.isActive) return;
        
        // Set inactive flag first to stop any ongoing animations
        this.isActive = false;
        this.isNavigating = false;
        
        // Hide arrow keys
        if (this.tourUI.keyVisualsContainer) {
            this.tourUI.keyVisualsContainer.style.display = 'none';
        }
        
        // Hide the tour UI
        this.tourUI.hideTourUI();
        
        // Return Celeste to helper mode
        this.tourUI.setCelesteTourMode(false);
        
        // Clean up all listeners and animations
        this.actions.removeEventListeners();
        this.animations.clearActiveTimers();
        
        // Show Celeste helper only if intro is completed
        if (this.tourUI.celesteElement && document.getElementById('skip_intro').style.display === 'none') {
            this.tourUI.celesteElement.style.display = 'block';
        }
        
        // Return to normal viewer state
        this.tourUI.restoreNormalViewerState();
        
        // Final sweep for any remaining tour elements
        setTimeout(() => {
            this.tourUI.removeTourElements();
        }, 100);
    }

    /**
     * Update arrow key visibility based on step title
     */
    updateArrowKeyVisibility(stepTitle) {
        const { keyVisualsContainer } = this.tourUI;
        if (keyVisualsContainer) {
            if (stepTitle === "Moving around") {
                keyVisualsContainer.style.display = 'flex';
            } else if (stepTitle === "Zooming in and out") {
                keyVisualsContainer.style.display = 'flex';
            } else {
                keyVisualsContainer.style.display = 'none';
            }
        }
    }
} 