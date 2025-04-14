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
                            delay: 4000
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
                            delay: 4000
                        }
                    },
                    {
                        title: "Rapid leaping",
                        message: "Wanting to leap across light-years of insight, Celeste double-clicks her mouse — instantly blasting deeper into the map.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "doubleClickEvent",
                            delay: 4000
                        }
                    },
                    {
                        title: "Rotating the view",
                        message: "Curious about what lies beyond the horizon? She clicks and drags her mouse, rotating the entire cosmos around her, revealing intersections previously hidden in plain sight.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "rotateEvent",
                            delay: 4000
                        }
                    },
                    {
                        title: "Returning home",
                        message: "When Celeste needs to return to the start of her journey, she can always select the Home button to reset her view of the cosmos.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#home-button",
                            delay: 4000
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
                            delay: 4000
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
                            delay: 4000
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
                            delay: 4000
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
                            delay: 4000
                        }
                    },
                    {
                        title: "Clearing Selections",
                        message: "Clearing her subtopic selections allows her to return to viewing all the Computer Science papers at one time.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: ".clear-selection.visible",
                            delay: 4000
                        }
                    },
                    {
                        title: "Adding New Constellations",
                        message: "Now, it's time to bring in her second love—Biology! 🧬 Celeste travels to the Constellation tab to add a biology constellation over the computer science filter.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: ".tab-btn[data-tab='constellations']",
                            delay: 4000
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
                            delay: 4000
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
                            delay: 4000
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
                            delay: 4000
                        }
                    },
                    {
                        title: "Exploring Research Timeline",
                        message: "Celeste notices there's a Year Filter, so she pulls it to explore research from the 1900s through today.",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#year-filter-toggle",
                            delay: 4000
                        }
                    },
                    {
                        title: "Watching Research Evolution",
                        message: "She hits Play Timelapse, watching as new papers appear over time like stars being born in a galaxy—mesmerizing!",
                        arrangement: 3,  // Speech bubble
                        action: {
                            type: "clickEvent",
                            element: "#year-play",
                            delay: 4000
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
                                    sequenceDelay: 3000  // Wait 3s before next action (increased from 2s)
                                },
                                // Check if animation is paused before modifying the range
                                {
                                    type: "jsFunction",
                                    functionName: "function() { const isPaused = !$('#year-play').hasClass('playing'); if (!isPaused) { $('#year-play').click(); console.log('Forcing pause before changing year range'); } }",
                                    delay: 500,          // Wait 500ms before executing function
                                    sequenceDelay: 2000   // Wait 2s before next action (increased from 1s)
                                },
                                // Directly use a custom function to update the slider values
                                {
                                    type: "jsFunction",
                                    functionName: "function() { $('#year-range-slider').slider('values', [2003, 2023]); window.controls.yearFilter.updateYearRange(2003, 2023); }",
                                    delay: 1000,          // Wait 1s before executing function (increased from 500ms)
                                    sequenceDelay: 1000   // Wait 1s before next action
                                },
                                // Pause to let the animation settle
                                {
                                    type: "jsFunction",
                                    functionName: "function() { console.log('Year filter updated to 2003-2023'); }",
                                    delay: 200,
                                    sequenceDelay: 1000
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
                        message: "Hover over a paper to see its title, and click to view more details!",
                        arrangement: 2,  // Centered message
                        action: null
                    },
                    {
                        title: "Paper Details",
                        message: "The paper sidebar shows the abstract, authors, and publication information. You can bookmark papers for later!",
                        arrangement: 2,  // Centered message
                        action: null
                    },
                    {
                        title: "Your Tour is Complete!",
                        message: "You're now ready to explore The Knowledge Cosmos on your own. Happy researching!",
                        arrangement: 1,  // Full overlay
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