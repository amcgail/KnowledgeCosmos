/**
 * Handles specialized tour actions and interactions
 */
export class TourActions {
    constructor(animationManager) {
        this.animations = animationManager;
        this.eventListeners = [];
        this.setupHandlers();
    }

    /**
     * Set up action handlers
     */
    setupHandlers() {
        // Any shared setup code would go here
    }

    /**
     * Setup element selectors for dynamic elements
     */
    setupElementSelectors(action) {
        // This method prepares selectors for dynamic elements that may not exist yet
        if (!action || !action.element) return action;
        
        // Special handling for different elements
        if (action.element === ".label-computer-science") {
            // Make the Computer Science label selector more robust
            // Instead of looking for a specific class that doesn't exist, look for the label text
            const annotations = document.querySelectorAll(".annotation-label");
            for (const label of annotations) {
                if (label.textContent.toLowerCase().includes("computer science")) {
                    action.element = `#${label.closest('.annotation').id}`;
                    break;
                }
            }
            
            // If we still can't find it, try more general approach
            if (action.element === ".label-computer-science") {
                const allElements = document.querySelectorAll("*");
                for (const elem of allElements) {
                    if (elem.textContent && elem.textContent.toLowerCase().includes("computer science")) {
                        action.element = `#${elem.id || 'annotation-' + Math.floor(Math.random() * 1000)}`;
                        if (!elem.id) elem.id = action.element.substring(1); // Set ID if none exists
                        break;
                    }
                }
            }
        }
        
        if (action.element === ".annotation-link" || action.element === ".filter-icon") {
            // Look for the annotation filter link which appears after clicking on labels
            setTimeout(() => {
                const filterIcons = document.querySelectorAll(".filter-icon");
                if (filterIcons.length > 0) {
                    action.element = `#${filterIcons[0].id || 'filter-icon'}`;
                    if (!filterIcons[0].id) filterIcons[0].id = 'filter-icon';
                } else {
                    // Fallback to any annotation button
                    const annotationButtons = document.querySelectorAll(".annotation-buttons");
                    if (annotationButtons.length > 0) {
                        const links = annotationButtons[0].querySelectorAll("a, div, svg");
                        if (links.length > 0) {
                            action.element = `#${links[0].id || 'annotation-button'}`;
                            if (!links[0].id) links[0].id = 'annotation-button';
                        }
                    }
                }
            }, 500); // Short delay to let annotation appear
        }
        
        return action;
    }

    /**
     * CRITICAL METHOD - DO NOT MODIFY
     * Trigger multiple clicks on problematic elements
     * This method took significant time to get working correctly
     */
    triggerMultipleClicks(element) {
        if (!element) {
            console.log("Element not found for clicking");
            return;
        }
        
        // Get the containing annotation if this is a child element
        const annotation = element.closest('.annotation');
        
        console.log(element, annotation);
        
        // Helper function to safely click an element (handles SVG elements)
        const safeClick = (el) => {
            if (!el) return;
            
            try {
                // Try normal click first
                if (typeof el.click === 'function') {
                    el.click();
                } else {
                    // For SVG elements that don't have click method
                    const evt = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    el.dispatchEvent(evt);
                }
            } catch (err) {
                console.error("Error clicking element:", err);
            }
        };
        
        // Sequence of attempts that led to success
        // Method 1: Basic click first
        safeClick(element);
        
        // Method 2: Click the annotation-titlebar after a short delay
        setTimeout(() => {
            if (annotation) {
                const titlebar = annotation.querySelector('.annotation-titlebar');
                if (titlebar) {
                    safeClick(titlebar);
                }
            }
        }, 200);
        
        // Method 3: Click the annotation-label - this was the successful one!
        setTimeout(() => {
            if (annotation) {
                const label = annotation.querySelector('.annotation-label');
                if (label) {
                    safeClick(label);
                }
                
                // For filter icon specifically
                if (element.classList.contains('filter-icon') || 
                    (element.id && element.id.includes('filter')) ||
                    (element.tagName.toLowerCase() === 'svg')) {
                    const filterIcon = annotation.querySelector('.filter-icon');
                    if (filterIcon) {
                        safeClick(filterIcon);
                        
                        // Also try clicking the SVG path inside
                        const path = filterIcon.querySelector('path');
                        if (path) {
                            safeClick(path);
                        }
                    }
                }
            }
        }, 400);
    }

    /**
     * Handle click action on elements
     */
    setupClickAction(action, isActive, clickAnimationOverlay) {
        // Handle dynamic selectors first
        action = this.setupElementSelectors(action);
        
        // Add delay before action (increased from 1500ms to 3000ms)
        const initialDelay = action.delay || 3000;
        
        // Handle array of elements - click on each in sequence
        if (Array.isArray(action.element)) {
            // Add delay before starting
            const timerId = setTimeout(() => {
                this.clickElementsSequentially(action.element, 0, null, isActive);
            }, initialDelay);
            this.animations.trackTimer(timerId);
            return;
        }
        
        // New: If clickAll parameter is true, find all matching elements and click them
        if (action.clickAll) {
            const elements = document.querySelectorAll(action.element);
            if (elements && elements.length > 0) {
                // Convert NodeList to Array for sequential clicking
                const elementArray = Array.from(elements).map((_, index) => action.element);
                
                // Add delay before starting
                const timerId = setTimeout(() => {
                    this.clickElementsSequentially(elementArray, 0, null, isActive);
                }, initialDelay);
                this.animations.trackTimer(timerId);
                return;
            }
        }
        
        // Find the element to click
        const element = document.querySelector(action.element);
        if (element) {
            // Create shrinking circles visual indicator instead of highlighting
            const circleContainer = this.animations.createShrinkingCircleIndicator(element);
            if (circleContainer) {
                this.eventListeners.push({
                    type: 'circleIndicator',
                    element: circleContainer
                });
            }
            
            // ADDED: Check if we need to focus the render area first (specific to annotation and filter clicks)
            if (action.focusFirst) {
                const renderArea = document.getElementById('potree_render_area');
                if (renderArea) {
                    const timerId = setTimeout(() => {
                        // Focus on render area first
                        renderArea.focus();
                        renderArea.click();
                        console.log("Focusing potree_render_area first");
                    }, initialDelay - 1500); // Focus earlier than the main click
                    this.animations.trackTimer(timerId);
                }
            }
            
            // Handle Computer Science label click (add visual emphasis)
            if (action.element.includes("label") && action.element.toLowerCase().includes("computer")) {
                // Add a visual emphasis
                const emphasisTimerId = setTimeout(() => {
                    // Add pulsing effect to show the constellation
                    const pulse = document.createElement('div');
                    pulse.className = 'constellation-pulse';
                    document.body.appendChild(pulse);
                    
                    // Position and size the pulse
                    const rect = element.getBoundingClientRect();
                    pulse.style.left = `${rect.left - 100}px`;
                    pulse.style.top = `${rect.top - 100}px`;
                    pulse.style.width = '300px';
                    pulse.style.height = '300px';
                    
                    // Add to cleanup
                    this.eventListeners.push({
                        type: 'constellationPulse',
                        element: pulse
                    });
                }, 1000);
                this.animations.trackTimer(emphasisTimerId);
            }
            
            // Create a click animation after the delay
            const clickTimerId = setTimeout(() => {
                // Get the position of the element to click
                const rect = element.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                // Create the click animation
                this.animations.simulateClick(centerX, centerY, () => {
                    // MODIFIED: For specific problem elements, use a more robust click approach
                    if (action.focusFirst) {
                        // For annotation and filter clicks that need special handling
                        this.triggerMultipleClicks(element);
                    } else {
                        // For normal elements, use regular click
                        element.click();
                    }
                });
            }, initialDelay);
            this.animations.trackTimer(clickTimerId);
        } else {
            console.warn(`Element not found: ${action.element}`);
            // If element not found, try again after a short delay
            const retryTimerId = setTimeout(() => {
                const delayedElement = document.querySelector(action.element);
                if (delayedElement) {
                    // Recursively try again with the same action
                    this.setupClickAction(action, isActive, clickAnimationOverlay);
                } else {
                    console.error(`Element not found after retry: ${action.element}`);
                }
            }, 1000);
            this.animations.trackTimer(retryTimerId);
        }
    }

    /**
     * Click elements in sequence
     */
    clickElementsSequentially(elements, currentIndex, cursor, isActive) {
        if (!isActive || currentIndex >= elements.length) return;
        
        const selector = elements[currentIndex];
        const element = document.querySelector(selector);
        
        if (!element) {
            console.warn(`Element not found: ${selector}, skipping to next`);
            this.clickElementsSequentially(elements, currentIndex + 1, cursor, isActive);
            return;
        }
        
        // Use shrinking circle indicator instead of highlighting
        const circleContainer = this.animations.createShrinkingCircleIndicator(element);
        if (circleContainer) {
            this.eventListeners.push({
                type: 'circleIndicator',
                element: circleContainer
            });
        }
        
        // Create or reuse mouse cursor visual
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'mouse-cursor';
            cursor.innerHTML = '<i class="fas fa-mouse-pointer"></i>';
            
            const clickAnimationOverlay = document.querySelector('.click-animation-overlay');
            if (clickAnimationOverlay) {
                clickAnimationOverlay.innerHTML = '';
                clickAnimationOverlay.appendChild(cursor);
            }
            
            // Store for cleanup
            this.eventListeners.push({
                type: 'mouseCursor',
                element: cursor
            });
            
            // Start at center of screen
            const startX = window.innerWidth / 2;
            const startY = window.innerHeight / 2;
            
            cursor.style.left = `${startX}px`;
            cursor.style.top = `${startY}px`;
        }
        
        // Get position of current element
        const rect = element.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;
        
        // Get cursor's current position
        const cursorRect = cursor.getBoundingClientRect();
        const cursorX = cursorRect.left + cursorRect.width / 2;
        const cursorY = cursorRect.top + cursorRect.height / 2;
        
        // Move cursor to element
        this.animations.animateCursorMovement(cursor, cursorX, cursorY, targetX, targetY, () => {
            // Click on the element
            this.animations.simulateClick(targetX, targetY, () => {
                // Trigger the actual click
                element.click();
                
                // Add delay between clicks - longer delay for better visibility
                const nextTimerId = setTimeout(() => {
                    // Move to next element
                    this.clickElementsSequentially(elements, currentIndex + 1, cursor, isActive);
                }, 1200); // Delay between clicks
                this.animations.trackTimer(nextTimerId);
            });
        });
    }

    /**
     * Setup input field action
     */
    setupInputField(action, isActive) {
        if (!isActive) return;
        
        // Handle dynamic selectors first
        if (action.inputField) {
            const inputElement = document.querySelector(action.inputField);
            if (inputElement) {
                inputElement.classList.add('tour-highlight');
                
                // Create a cursor visual
                const cursor = document.createElement('div');
                cursor.className = 'mouse-cursor';
                cursor.innerHTML = '<i class="fas fa-mouse-pointer"></i>';
                
                const clickAnimationOverlay = document.querySelector('.click-animation-overlay');
                if (clickAnimationOverlay) {
                    clickAnimationOverlay.innerHTML = '';
                    clickAnimationOverlay.appendChild(cursor);
                }
                
                // Store for cleanup
                this.eventListeners.push({
                    type: 'mouseCursor',
                    element: cursor
                });
                
                // Position cursor at input field
                const rect = inputElement.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                cursor.style.left = `${centerX}px`;
                cursor.style.top = `${centerY}px`;
                
                // Click on the input field first
                const clickTimerId = setTimeout(() => {
                    this.animations.simulateClick(centerX, centerY, () => {
                        // Focus the input element
                        inputElement.focus();
                        
                        // Type the text character by character
                        const text = action.inputText || '';
                        let charIndex = 0;
                        
                        const typeNextChar = () => {
                            if (!isActive) return;
                            
                            if (charIndex < text.length) {
                                // Add next character
                                inputElement.value += text[charIndex];
                                charIndex++;
                                
                                // Dispatch input event to trigger any listeners
                                const inputEvent = new Event('input', { bubbles: true });
                                inputElement.dispatchEvent(inputEvent);
                                
                                // Continue typing with a small delay between characters
                                const typeTimerId = setTimeout(typeNextChar, 150);
                                this.animations.trackTimer(typeTimerId);
                            } else {
                                // When finished typing, click the submit button if provided
                                if (action.submitButton) {
                                    const submitButton = document.querySelector(action.submitButton);
                                    if (submitButton) {
                                        // Move cursor to submit button
                                        const submitRect = submitButton.getBoundingClientRect();
                                        const submitX = submitRect.left + submitRect.width / 2;
                                        const submitY = submitRect.top + submitRect.height / 2;
                                        
                                        // Animate cursor movement
                                        this.animations.animateCursorMovement(cursor, centerX, centerY, submitX, submitY, () => {
                                            this.animations.simulateClick(submitX, submitY, () => {
                                                submitButton.click();
                                                inputElement.classList.remove('tour-highlight');
                                                submitButton.classList.remove('tour-highlight');
                                            });
                                        });
                                    }
                                } else {
                                    // Just remove highlight if no submit button
                                    inputElement.classList.remove('tour-highlight');
                                }
                            }
                        };
                        
                        // Clear input field first
                        inputElement.value = '';
                        
                        // Start typing
                        typeNextChar();
                    });
                }, 1000);
                this.animations.trackTimer(clickTimerId);
            }
        }
    }

    /**
     * Clean up event listeners
     */
    removeEventListeners() {
        this.eventListeners.forEach(entry => {
            if (entry.type === 'mouseCursor' || 
               entry.type === 'homeButtonPointer' || 
               entry.type === 'constellationPulse' ||
               entry.type === 'circleIndicator') {
                // Remove UI elements
                if (entry.element && entry.element.parentNode) {
                    entry.element.parentNode.removeChild(entry.element);
                }
            } else if (entry.element) {
                // Remove event listener from element
                entry.element.removeEventListener(entry.type, entry.listener);
            } else {
                // Remove global event listener
                window.removeEventListener(entry.type, entry.listener);
            }
        });
        
        // Clear event listeners
        this.eventListeners = [];
    }
} 