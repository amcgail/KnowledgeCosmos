/**
 * Handles UI elements and interactions for the tour system
 */
export class TourUI {
    constructor() {
        this.tourUI = null;
        this.overlay = null;
        this.messageElement = null;
        this.contentsElement = null;
        this.clickAnimationOverlay = null;
        this.keyVisualsContainer = null;
        this.titleElement = null;
        this.messageTextElement = null;
        this.nextReminderElement = null;
        this.prevButton = null;
        this.nextButton = null;
        this.skipButton = null;
        this.celesteElement = null;
        this.phaseElements = [];
        
        // Initialize UI references
        this.initUIElements();
    }

    /**
     * Initialize references to UI elements
     */
    initUIElements() {
        // Primary UI containers
        this.tourUI = document.getElementById('tour-ui');
        this.overlay = document.querySelector('.tour-overlay');
        this.messageElement = document.querySelector('.tour-message');
        this.contentsElement = document.querySelector('.tour-contents');
        this.clickAnimationOverlay = document.querySelector('.click-animation-overlay');
        this.keyVisualsContainer = document.querySelector('.key-visuals-container');
        
        // Message elements
        if (this.messageElement) {
            this.titleElement = this.messageElement.querySelector('.step-title');
            this.messageTextElement = this.messageElement.querySelector('.step-message');
            this.nextReminderElement = this.messageElement.querySelector('.next-reminder');
            
            // Navigation buttons
            this.navButtons = this.messageElement.querySelector('.tour-nav-buttons');
            this.prevButton = this.messageElement.querySelector('.tour-prev');
            this.nextButton = this.messageElement.querySelector('.tour-next');
            this.closeButton = this.messageElement.querySelector('.close-tour-button');
        }
        
        // Celeste element - single element for both helper and tour modes
        this.celesteElement = document.querySelector('.celeste-helper');
    }

    /**
     * Load the Celeste SVG
     */
    loadCelesteSVG() {
        if (this.celesteElement && !this.celesteElement.querySelector('svg')) {
            fetch('/static/celeste.svg')
                .then(response => response.text())
                .then(svgContent => {
                    this.celesteElement.innerHTML = svgContent;
                })
                .catch(error => {
                    console.error('Failed to load Celeste SVG:', error);
                });
        }
    }

    /**
     * Set up the tour contents sidebar
     */
    setupTourContents(tourPhases, currentStep, onStepSelect) {
        if (!this.contentsElement) return;
        
        // Clear any existing phase elements
        this.phaseElements = [];
        this.contentsElement.innerHTML = '<h3 style="margin-top: 0; text-align: center; margin-bottom: 15px;">Tour Contents</h3>';
        
        tourPhases.forEach((phase, index) => {
            const phaseElement = document.createElement('div');
            phaseElement.className = 'tour-phase';
            phaseElement.textContent = phase.title;
            phaseElement.dataset.phase = index;
            
            // Create step list for each phase
            const stepsList = document.createElement('div');
            stepsList.className = 'phase-steps';
            
            phase.steps.forEach((step, stepIndex) => {
                const stepElement = document.createElement('div');
                stepElement.className = 'tour-step';
                stepElement.textContent = step.title;
                stepElement.dataset.step = stepIndex;
                
                // Calculate absolute step index
                let absoluteStepIndex = 0;
                for (let i = 0; i < index; i++) {
                    absoluteStepIndex += tourPhases[i].steps.length;
                }
                absoluteStepIndex += stepIndex;
                
                stepElement.addEventListener('click', () => {
                    if (onStepSelect) onStepSelect(absoluteStepIndex);
                });
                
                stepsList.appendChild(stepElement);
            });
            
            // Initially hide step list
            stepsList.style.display = 'none';
            
            // Add click handler to toggle step list visibility
            phaseElement.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = stepsList.style.display !== 'none';
                stepsList.style.display = isVisible ? 'none' : 'block';
                phaseElement.classList.toggle('expanded', !isVisible);
            });
            
            this.phaseElements.push(phaseElement);
            this.contentsElement.appendChild(phaseElement);
            this.contentsElement.appendChild(stepsList);
        });
    }

    /**
     * Update step content 
     */
    updateStepContent(step) {
        if (!step) return;
        
        if (this.titleElement) this.titleElement.textContent = step.title;
        if (this.messageTextElement) this.messageTextElement.textContent = step.message;
        if (this.nextReminderElement) {
            this.nextReminderElement.style.color = '#64d9ff';
            this.nextReminderElement.style.marginTop = '10px';
            this.nextReminderElement.style.fontSize = '14px';
        }
    }
    
    /**
     * Update navigation button states
     */
    updateNavigationButtons(currentStep, totalSteps) {
        if (this.prevButton) this.prevButton.disabled = currentStep === 0;
        if (this.nextButton) {
            if (currentStep === totalSteps - 1) {
                this.nextButton.style.display = 'none';
            } else {
                this.nextButton.style.display = '';
                this.nextButton.disabled = false;
            }
        }
    }

    /**
     * Update contents highlight
     */
    updateContentsHighlight(currentPhaseIndex, currentStepInPhase) {
        // Update phase highlights
        this.phaseElements.forEach((el, i) => {
            el.classList.toggle('active', i === currentPhaseIndex);
            el.classList.toggle('expanded', i === currentPhaseIndex);
        });
        
        // Update step highlights
        const stepElements = this.contentsElement.querySelectorAll('.tour-step');
        stepElements.forEach(stepEl => {
            stepEl.classList.remove('active');
        });
        
        // Hide all step lists first
        const phaseStepsList = this.contentsElement.querySelectorAll('.phase-steps');
        phaseStepsList.forEach((stepList, i) => {
            stepList.style.display = i === currentPhaseIndex ? 'block' : 'none';
        });
        
        // Find and highlight current step
        if (phaseStepsList[currentPhaseIndex]) {
            // Find the step element
            const stepEl = phaseStepsList[currentPhaseIndex].querySelector(`[data-step="${currentStepInPhase}"]`);
            if (stepEl) {
                stepEl.classList.add('active');
                
                // Ensure it's visible by scrolling if needed
                stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    /**
     * Set Celeste's tour mode
     */
    setCelesteTourMode(isEnabled) {
        if (!this.celesteElement) return;
        
        if (isEnabled) {
            // Update styling to be in tour mode
            this.celesteElement.classList.add('tour-mode');
            // Remove tooltip behavior and pointer cursor
            this.celesteElement.setAttribute('title', '');
            this.celesteElement.style.cursor = 'default';
        } else {
            // Remove tour mode class
            this.celesteElement.classList.remove('tour-mode');
            this.celesteElement.classList.remove('compact');
            // Restore tooltip and pointer cursor
            this.celesteElement.setAttribute('title', 'Start guided tour');
            this.celesteElement.style.cursor = 'pointer';
        }
    }

    /**
     * Apply UI arrangement based on the specified arrangement style
     */
    applyArrangement(arrangement) {
        if (this.contentsElement) this.contentsElement.style.display = 'block';

        // Remove previous arrangement classes from container
        document.body.classList.remove('tour-arrangement-1', 'tour-arrangement-2', 'tour-arrangement-3');
        
        // Add the appropriate arrangement class
        document.body.classList.add(`tour-arrangement-${arrangement}`);
        
        // Toggle specific element classes based on arrangement
        if (arrangement === 1) {
            // Full overlay
            if (this.messageElement) {
                this.messageElement.classList.remove('centered', 'speech-bubble');
            }
            if (this.celesteElement) {
                this.celesteElement.classList.remove('compact');
                this.celesteElement.classList.add('tour-mode');
            }
        } else if (arrangement === 2) {
            // No overlay with centered message
            if (this.messageElement) {
                this.messageElement.classList.add('centered');
                this.messageElement.classList.remove('speech-bubble');
            }
            if (this.celesteElement) {
                this.celesteElement.classList.add('compact', 'tour-mode');
            }
        } else if (arrangement === 3) {
            // No overlay with speech bubble
            if (this.messageElement) {
                this.messageElement.classList.add('speech-bubble');
                this.messageElement.classList.remove('centered');
            }
            if (this.celesteElement) {
                this.celesteElement.classList.add('compact', 'tour-mode');
            }
        }
    }

    /**
     * Show the tour UI
     */
    showTourUI() {
        if (this.tourUI) {
            this.tourUI.style.display = 'block';
        }
    }

    /**
     * Hide the tour UI
     */
    hideTourUI() {
        if (this.tourUI) {
            this.tourUI.style.display = 'none';
        }
    }

    /**
     * Remove all tour DOM elements created during tour
     */
    removeTourElements() {
        // Remove any flash elements
        const flashElements = document.querySelectorAll('.jump-flash, .jump-streaks');
        flashElements.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        // Remove any constellation pulse elements
        const pulseElements = document.querySelectorAll('.constellation-pulse');
        pulseElements.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        // Remove any pointer elements
        const pointerElements = document.querySelectorAll('.home-button-pointer');
        pointerElements.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        // Remove any shrinking circle indicators
        const circleContainer = document.querySelector('.tour-circle-indicators');
        if (circleContainer && circleContainer.parentNode) {
            circleContainer.parentNode.removeChild(circleContainer);
        }
        
        // Reset Celeste's transform if she's been animated
        if (this.celesteElement) {
            this.celesteElement.style.transform = '';
        }
        
        // Remove any highlight classes
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });
        
        // Hide key visuals container
        if (this.keyVisualsContainer) {
            this.keyVisualsContainer.style.display = 'none';
        }
        
        // Clear click animation overlay
        if (this.clickAnimationOverlay) {
            this.clickAnimationOverlay.innerHTML = '';
        }
    }

    /**
     * Restore normal viewer state
     */
    restoreNormalViewerState() {
        // Show all menu elements
        document.querySelectorAll('#menu div').forEach(el => el.style.display = 'block');
        
        // Hide intro skip button
        const skipIntro = document.getElementById('skip_intro');
        if (skipIntro) skipIntro.style.display = 'none';
        
        // Show links and toolbars
        const elementsToShow = [
            document.getElementById('tips_link'),
            document.getElementById('comment_link'),
            document.querySelector('.toolbar'),
            document.querySelector('.sidebar-toggle')
        ];
        
        elementsToShow.forEach(el => {
            if (el) el.style.display = el.tagName === 'DIV' ? 'flex' : 'block';
        });
    }

    /**
     * Disable or enable navigation buttons during animations
     */
    disableNavigationButtons(disabled) {
        if (this.navButtons) {
            this.navButtons.style.display = disabled ? 'none' : '';
        }
    }
} 