/**
 * Tour content data
 * Contains all phases and steps for the guided tour
 */
export class TourContent {
    constructor() {
        // Initialize tour content
        this.tourPhases = [
            {
                title: "Phase 1: General Exploration",
                steps: [
                    {
                        title: "Welcome to The Knowledge Cosmos",
                        message: "Hi, I'm Celeste! I'll guide you through navigating this 3D visualization of research papers.",
                        action: null,
                        arrangement: 1  // Full overlay
                    },
                    {
                        title: "Moving around",
                        message: "To glide over the cosmos from left and right, she gently taps the left and right arrow keys — drifting past swirling constellations of knowledge.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "keyboardEvent",
                            keys: ["arrowleft", "arrowright", "arrowup", "arrowdown"],
                            showKeyVisuals: true,
                            delay: 2500
                        }
                    },
                    {
                        title: "Zooming in and out",
                        message: "To zoom in and out, she presses the up and down arrow keys or scrolls with her mouse — each movement pulling her into the cosmos or lifting her out for a galactic view.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "keyboardEvent",
                            keys: ["arrowleft", "arrowright", "arrowup", "arrowdown"],
                            showKeyVisuals: true,
                            delay: 2500
                        }
                    },
                    {
                        title: "Rapid leaping",
                        message: "Wanting to leap across light-years of insight, Celeste double-clicks her mouse — instantly blasting deeper into the map.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "doubleClickEvent",
                            delay: 2500
                        }
                    },
                    {
                        title: "Rotating the view",
                        message: "Curious about what lies beyond the horizon? She clicks and drags her mouse, rotating the entire cosmos around her, revealing intersections previously hidden in plain sight.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "rotateEvent",
                            delay: 2500
                        }
                    },
                    {
                        title: "Returning home",
                        message: "When Celeste needs to return to the start of her journey, she can always select the Home button to reset her view of the cosmos.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#home-button",
                            delay: 2500
                        }
                    }
                ]
            },
            {
                title: "Phase 2: Narrowing the Search",
                steps: [
                    {
                        title: "Turning on Labels",
                        message: "To guide her exploration, Celeste turns on the labels to see the wide range of topics floating around.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#label-toggle",
                            delay: 2500
                        }
                    },
                    {
                        title: "Exploring Topics",
                        message: "Tap on any visible topic label to see its constellation. When available, the Computer Science label is ideal for demonstration.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#annotation-computer-science",
                            focusFirst: true,
                            delay: 2500
                        }
                    },
                    {
                        title: "Applying Filters",
                        message: "To explore the papers in this highlighted region, click the filter icon that appears next to selected labels.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#annotation-computer-science .filter-icon",
                            focusFirst: true,
                            delay: 3000
                        }
                    },
                    {
                        title: "Exploring Papers",
                        message: "A colorful galaxy of papers! Celeste opens the side panel to reveal a list of glowing paper subtopics.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: ".sidebar-toggle",
                            delay: 2500
                        }
                    },
                    {
                        title: "Filtering by Subtopics",
                        message: "Celeste can select specific subtopics to explore to narrow her search.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: [
                                ":nth-child(2 of .swatch)",
                                ":nth-child(5 of .swatch)",
                                ":nth-child(9 of .swatch)",
                            ],
                            delay: 2500
                        }
                    },
                    {
                        title: "Clearing Selections",
                        message: "Clearing her subtopic selections allows her to return to viewing all the Computer Science papers at one time.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: ".clear-selection.visible",
                            delay: 2500
                        }
                    },
                    {
                        title: "Adding New Constellations",
                        message: "Now, it's time to bring in her second love—Biology! 🧬 Celeste travels to the Constellation tab to add a biology constellation over the computer science filter.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: ".tab-btn[data-tab='constellations']",
                            delay: 2500
                        }
                    },
                    {
                        title: "Adding Biology Constellation",
                        message: "She begins spotting areas where the two fields overlap—aha! A potential intersection of computer science and Biology!",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "inputField",
                            inputField: "#field_lookup",
                            inputText: "Biology",
                            submitButton: "#field_add",
                            delay: 2500
                        }
                    },
                    {
                        title: "Customizing Constellation Colors",
                        message: "For a pop of cosmic flair, she changes her constellation's color to a bold, brilliant orange, by clicking on the colored triangle.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: ".color-swatch-svg .triangle",
                            focusFirst: true,
                            delay: 2500
                        }
                    },
                    {
                        title: "Exploring Machine Learning",
                        message: "When taking a closer look at the relationships in the stars of papers, she clicks on the star on machine learning label to conjures an entire constellation from it—instant galaxy!",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#annotation-machine-learning",
                            focusFirst: true,
                            delay: 2500
                        }
                    },
                    {
                        title: "Removing Constellations",
                        message: "Celeste clears the starry skies by removing constellations in the side panel.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#const_legend .legend_item .link",
                            clickAll: true,
                            delay: 2500
                        }
                    },
                    {
                        title: "Exploring Research Timeline",
                        message: "Celeste notices there's a Year Filter, so she pulls it to explore research from the 1900s through today.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#year-filter-toggle",
                            delay: 2500
                        }
                    },
                    {
                        title: "Watching Research Evolution",
                        message: "She hits Play Timelapse, watching as new papers appear over time like stars being born in a galaxy—mesmerizing!",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#year-play",
                            delay: 2500
                        }
                    },
                    {
                        title: "Focusing on Recent Research",
                        message: "For her search, she pauses the time machine and sets it to just the last 20 years—new discoveries only, please!",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "sequence",
                            actions: [
                                // First pause the animation by clicking play button
                                {
                                    type: "clickEvent",
                                    element: "#year-play",
                                    delay: 1000,        // Wait 1s before starting the click
                                    sequenceDelay: 500
                                },
                                // Check if animation is paused before modifying the range
                                {
                                    type: "jsFunction",
                                    functionToExecute: function() { 
                                        const isPaused = !$('#year-play').hasClass('playing'); 
                                        if (!isPaused) { 
                                            $('#year-play').click(); 
                                            console.log('Forcing pause before changing year range'); 
                                        } 
                                    },
                                    delay: 500,          // Wait 500ms before executing function
                                    sequenceDelay: 500   // Wait 500ms before next action
                                },
                                // First set the lower end of the range (2003)
                                {
                                    type: "jsFunction",
                                    functionToExecute: function() { 
                                        const currentValues = $('#year-range-slider').slider('values');
                                        const startMax = currentValues[1];
                                        const targetMax = 2023;
                                        const duration = 1000; // 1 second animation
                                        const startTime = Date.now();
                                        
                                        function animateMax() {
                                            const elapsed = Date.now() - startTime;
                                            const progress = Math.min(elapsed / duration, 1);
                                            // Smooth easing function
                                            const easeProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
                                            
                                            const currentMax = startMax + (targetMax - startMax) * easeProgress;
                                            $('#year-range-slider').slider('values', [currentValues[0], Math.round(currentMax)]);
                                            window.controls.yearFilter.updateYearRange(currentValues[0], Math.round(currentMax));
                                            
                                            if (progress < 1) {
                                                requestAnimationFrame(animateMax);
                                            }
                                        }
                                        
                                        animateMax();
                                    },
                                    delay: 500,
                                    sequenceDelay: 1000  // Animation takes 1s
                                },
                                // Wait 500ms between animations
                                {
                                    type: "jsFunction",
                                    functionToExecute: function() {
                                        // Just a pause between animations
                                    },
                                    delay: 0,
                                    sequenceDelay: 500
                                },
                                // Then set the upper end of the range (2023)
                                {
                                    type: "jsFunction",
                                    functionToExecute: function() { 
                                        const currentValues = $('#year-range-slider').slider('values');
                                        const startMin = currentValues[0];
                                        const targetMin = 2000;
                                        const duration = 1000; // 1 second animation
                                        const startTime = Date.now();
                                        
                                        function animateMin() {
                                            const elapsed = Date.now() - startTime;
                                            const progress = Math.min(elapsed / duration, 1);
                                            // Smooth easing function
                                            const easeProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
                                            
                                            const currentMin = startMin + (targetMin - startMin) * easeProgress;
                                            $('#year-range-slider').slider('values', [Math.round(currentMin), currentValues[1]]);
                                            window.controls.yearFilter.updateYearRange(Math.round(currentMin), currentValues[1]);
                                            
                                            if (progress < 1) {
                                                requestAnimationFrame(animateMin);
                                            }
                                        }
                                        
                                        animateMin();
                                    },
                                    delay: 0,
                                    sequenceDelay: 1000  // Animation takes 1s
                                }
                            ]
                        }
                    },
                    {
                        title: "Maximizing the View",
                        message: "Celeste hides the labels and tucks away the side panel to get a full, glorious view of the knowledge cosmos.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: [
                                ".sidebar-toggle",
                                "#label-toggle"
                            ],
                            delay: 2000
                        }
                    },
                    {
                        title: "Free Exploration",
                        message: "Ready to dive into the map, Celeste opts for free form exploration. Feel free to explore on your own!",
                        arrangement: 2,  // Centered message
                        action: null,
                        delay: 0
                    }
                ]
            },
            {
                title: "Phase 3: Interacting with Papers",
                steps: [
                    {
                        title: "Selecting Papers",
                        message: "She zips through and clicks on a glowing dot—each one is a research paper waiting to be discovered!",
                        arrangement: 2,  // Centered message
                        action: {
                            type: "findPaper",
                            gridSize: 5,        // 5x5 grid = 121 test points
                            gridSpacing: 80,    // 80px between test points
                            delay: 1000         // Wait 1s before starting search
                        }
                    },
                    {
                        title: "Another Discovery",
                        message: "Another paper catches her eye!",
                        arrangement: 2,  // Centered message
                        action: {
                            type: "findPaper",
                            gridSize: 5,
                            gridSpacing: 80,
                            delay: 1000
                        }
                    },
                    {
                        title: "Saving for Later",
                        message: "This one she saves for later!",
                        arrangement: 2,  // Centered message
                        action: {
                            type: "clickEvent",
                            element: ".bookmark-btn",
                            delay: 1000
                        }
                    },
                    {
                        title: "Finding Past Papers",
                        message: "Oops! She forgot to save a previous paper from her freeform exploration. Thankfully, she uses the History tab to find it again.️ Crisis averted!",
                        arrangement: 2,  // Centered message
                        action: {
                            type: "clickEvent",
                            element: [
                                ".sidebar-toggle", // bring the right panel back if needed
                                ".tab-btn[data-tab='history']",
                                "#history_list .history_item:nth-child(2)" // select the second item in the history list
                            ],
                            delay: 1000
                        }
                    },
                    {
                        title: "Going Home",
                        message: "Let's clean up and go home",
                        arrangement: 2,  // Centered message
                        action: {
                            type: "clickEvent",
                            element: [
                                ".sidebar-toggle", // hide the right panel
                                ".paper-sidebar-toggle", // hide the paper sidebar
                                "#year-filter-toggle", // turn off the year filter
                                "#home-button", // go home
                            ],
                            delay: 1000
                        }
                    },
                    {
                        title: "Your Journey Awaits",
                        message: (
                            "Inspired by her journey, Celeste is ready to dive even deeper. And now, so are you! " +
                            "The cosmos is vast, and there are so many discoveries waiting for you. " +
                            "Start exploring and see what connections you can uncover!\n\n" +
                            "And don't worry—if you want to revisit Celeste's journey, just click here to return to the tutorial."
                        ),
                        arrangement: 1,  // Center overlay
                        action: null
                    }
                ]
            }
        ];
    }

    /**
     * Get all tour phases
     */
    getPhases() {
        return this.tourPhases;
    }

    /**
     * Get total step count across all phases
     */
    getTotalSteps() {
        return this.tourPhases.reduce((count, phase) => count + phase.steps.length, 0);
    }

    /**
     * Get phase and step based on absolute step index
     */
    getPhaseAndStep(absoluteStepIndex) {
        let stepCount = 0;
        
        for (let i = 0; i < this.tourPhases.length; i++) {
            const phase = this.tourPhases[i];
            
            if (absoluteStepIndex < stepCount + phase.steps.length) {
                return {
                    phase: phase,
                    phaseIndex: i,
                    step: phase.steps[absoluteStepIndex - stepCount],
                    stepIndex: absoluteStepIndex - stepCount
                };
            }
            
            stepCount += phase.steps.length;
        }
        
        return null;
    }
} 