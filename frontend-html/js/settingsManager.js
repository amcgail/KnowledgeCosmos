export class SettingsManager {
    constructor() {
        this.settings = {
            visualization: {
                brainSlicerEnabled: {
                    name: "Brain Slicer",
                    description: "Enable brain slicer visualization tool",
                    type: "checkbox",
                    default: false,
                    onChange: (value) => {
                        // Toggle brain slicer
                        window.viewer.toggleBrainSlicer(value);
                    }
                },
                pointBudget: {
                    name: "Point Budget",
                    description: "Maximum number of points to render (affects performance)",
                    type: "number",
                    default: 2000000,
                    min: 100000,
                    max: 5000000,
                    step: 100000,
                    onChange: (value) => {
                        window.viewer.viewer.setPointBudget(value);
                    }
                },
                backgroundColor: {
                    name: "Background Color",
                    description: "Set the background color of the 3D view",
                    type: "select",
                    default: 'black',
                    options: ['black', 'white', 'gray', 'skybox'],
                    onChange: (value) => {
                        window.viewer.viewer.setBackground(value);
                    }
                },
                edlEnabled: {
                    name: "Eye-Dome Lighting",
                    description: "Enable eye-dome lighting for better depth perception",
                    type: "checkbox",
                    default: true,
                    onChange: (value) => {
                        window.viewer.viewer.setEDLEnabled(value);
                    }
                },
                edlRadius: {
                    name: "EDL Radius",
                    description: "Eye-dome lighting radius",
                    type: "range",
                    default: 1.1,
                    min: 0.5,
                    max: 2.0,
                    step: 0.1,
                    onChange: (value) => {
                        window.viewer.viewer.setEDLRadius(value);
                    }
                },
                edlStrength: {
                    name: "EDL Strength",
                    description: "Eye-dome lighting strength",
                    type: "range",
                    default: 0.1,
                    min: 0.0,
                    max: 0.5,
                    step: 0.01,
                    onChange: (value) => {
                        window.viewer.viewer.setEDLStrength(value);
                    }
                },
                cameraFOV: {
                    name: "Camera Field of View",
                    description: "Camera field of view in degrees",
                    type: "range",
                    default: 60,
                    min: 30,
                    max: 90,
                    step: 1,
                    onChange: (value) => {
                        window.viewer.viewer.setFOV(value);
                    }
                }
            },
            navigation: {
                movementSpeed: {
                    name: "Movement Speed",
                    description: "Base movement speed",
                    type: "range",
                    default: 0.1,
                    min: 0.01,
                    max: 1.0,
                    step: 0.01,
                },
                maxSpeed: {
                    name: "Maximum Speed",
                    description: "Maximum movement speed",
                    type: "range",
                    default: 20.0,
                    min: 5.0,
                    max: 50.0,
                    step: 0.5,
                },
                cameraSensitivity: {
                    name: "Camera Sensitivity",
                    description: "Mouse/touch camera control sensitivity",
                    type: "range",
                    default: 1.0,
                    min: 0.1,
                    max: 3.0,
                    step: 0.1,
                },
                skipIntro: {
                    name: "Skip Introduction",
                    description: "Skip the introductory tour on startup",
                    type: "checkbox",
                    default: false,
                }
            },
            ui: {
                celesteVisible: {
                    name: "Show Celeste",
                    description: "Show the Celeste interface",
                    type: "checkbox",
                    default: true,
                },
                annotationTextSize: {
                    name: "Annotation Text Size",
                    description: "Size of annotation text",
                    type: "range",
                    default: 14,
                    min: 8,
                    max: 24,
                    step: 1,
                },
                annotationVisibilityMode: {
                    name: "Annotation Visibility",
                    description: "How annotations are displayed",
                    type: "select",
                    default: 'filtered',
                    options: ['auto-hide', 'filtered', 'all'],
                }
            }
        };

        this.loadSettings();
        this.initializeUI();
    }

    loadSettings() {
        // Load settings from localStorage
        Object.keys(this.settings).forEach(category => {
            Object.keys(this.settings[category]).forEach(setting => {
                const storedValue = localStorage.getItem(`setting_${category}_${setting}`);
                if (storedValue !== null) {
                    this.settings[category][setting].value = JSON.parse(storedValue);
                } else {
                    this.settings[category][setting].value = this.settings[category][setting].default;
                }
            });
        });
    }

    saveSetting(category, setting, value) {
        this.settings[category][setting].value = value;
        localStorage.setItem(`setting_${category}_${setting}`, JSON.stringify(value));
        
        // Call the onChange callback if it exists
        if (this.settings[category][setting].onChange) {
            this.settings[category][setting].onChange(value);
        }
    }

    getSetting(category, setting) {
        return this.settings[category][setting].value;
    }

    initializeUI() {
        // Initial render
        this.renderSettings();

        // Listen for tab changes
        document.querySelectorAll('.tab-btn[data-tab="settings"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.renderSettings();
            });
        });
    }

    renderSettings() {
        const settingsTab = document.getElementById('settings-tab');
        if (!settingsTab) {
            console.warn('Settings tab element not found');
            return;
        }

        settingsTab.innerHTML = '';

        Object.keys(this.settings).forEach(category => {
            const section = document.createElement('div');
            section.className = 'settings-section';
            
            const heading = document.createElement('h3');
            heading.textContent = category.charAt(0).toUpperCase() + category.slice(1) + ' Settings';
            section.appendChild(heading);

            Object.keys(this.settings[category]).forEach(setting => {
                const settingData = this.settings[category][setting];
                const item = document.createElement('div');
                item.className = 'setting-item';
                if (settingData.type === 'checkbox') {
                    item.classList.add('checkbox');
                }

                // Create header with label and reset button
                const header = document.createElement('div');
                header.className = 'setting-item-header';
                
                const labelText = document.createElement('div');
                labelText.className = 'setting-item-label';
                labelText.textContent = settingData.name;
                header.appendChild(labelText);

                // Add description
                const description = document.createElement('p');
                description.className = 'setting-description';
                description.textContent = settingData.description;
                
                // Create controls container
                const controls = document.createElement('div');
                controls.className = 'setting-controls';

                let input;
                if (settingData.type === 'checkbox') {
                    const label = document.createElement('label');
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.checked = settingData.value;
                    
                    const checkDisplay = document.createElement('span');
                    checkDisplay.className = 'checkbox-display';
                    
                    label.appendChild(input);
                    label.appendChild(checkDisplay);
                    controls.appendChild(label);
                } else if (settingData.type === 'range' || settingData.type === 'number') {
                    const rangeContainer = document.createElement('div');
                    rangeContainer.className = 'range-container';
                    
                    input = document.createElement('input');
                    input.type = 'range';
                    input.min = settingData.min;
                    input.max = settingData.max;
                    input.step = settingData.step;
                    input.value = settingData.value;
                    
                    const numberDisplay = document.createElement('span');
                    numberDisplay.textContent = settingData.value;
                    numberDisplay.className = 'range-value';
                    
                    rangeContainer.appendChild(input);
                    rangeContainer.appendChild(numberDisplay);
                    controls.appendChild(rangeContainer);
                } else if (settingData.type === 'select') {
                    const multiSelect = document.createElement('div');
                    multiSelect.className = 'multi-select-container';
                    
                    settingData.options.forEach(option => {
                        const optionEl = document.createElement('div');
                        optionEl.className = 'multi-select-option';
                        if (option === settingData.value) {
                            optionEl.classList.add('selected');
                        }
                        optionEl.textContent = option;
                        optionEl.addEventListener('click', () => {
                            multiSelect.querySelectorAll('.multi-select-option').forEach(el => {
                                el.classList.remove('selected');
                            });
                            optionEl.classList.add('selected');
                            this.saveSetting(category, setting, option);
                            this.updateResetButton(category, setting, resetBtn);
                        });
                        multiSelect.appendChild(optionEl);
                    });
                    
                    controls.appendChild(multiSelect);
                }

                // Create reset button
                const resetBtn = document.createElement('button');
                resetBtn.className = 'reset-button';
                resetBtn.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 2.97-2.17 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93 0-4.42-3.58-8-8-8zm-6 8c0-1.65.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.08 3.05 7.44 7 7.93v-2.02c-2.83-.48-5-2.94-5-5.91z"/></svg>';
                resetBtn.title = 'Reset to default';
                resetBtn.style.display = 'none'; // Hide initially
                
                resetBtn.addEventListener('click', () => {
                    this.saveSetting(category, setting, settingData.default);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = settingData.default;
                        } else {
                            input.value = settingData.default;
                            const numberDisplay = input.parentElement.querySelector('.range-value');
                            if (numberDisplay) {
                                numberDisplay.textContent = settingData.default;
                            }
                        }
                    } else if (settingData.type === 'select') {
                        controls.querySelectorAll('.multi-select-option').forEach(el => {
                            el.classList.toggle('selected', el.textContent === settingData.default);
                        });
                    }
                    this.updateResetButton(category, setting, resetBtn);
                });
                
                controls.appendChild(resetBtn);

                if (input) {
                    input.id = `${category}-${setting}`;
                    input.addEventListener('change', (e) => {
                        const value = e.target.type === 'checkbox' ? e.target.checked : 
                                    e.target.type === 'range' ? parseFloat(e.target.value) :
                                    e.target.value;
                        this.saveSetting(category, setting, value);
                        this.updateResetButton(category, setting, resetBtn);
                    });

                    if (input.type === 'range') {
                        input.addEventListener('input', (e) => {
                            const value = parseFloat(e.target.value);
                            const numberDisplay = e.target.parentElement.querySelector('.range-value');
                            if (numberDisplay) {
                                numberDisplay.textContent = value;
                            }
                        });
                    }
                }

                item.appendChild(header);
                item.appendChild(description);
                item.appendChild(controls);
                section.appendChild(item);
            });

            settingsTab.appendChild(section);
        });

        // Add Reset All button
        const resetAllBtn = document.createElement('button');
        resetAllBtn.className = 'reset-all-button';
        resetAllBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path fill="currentColor" d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 2.97-2.17 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93 0-4.42-3.58-8-8-8zm-6 8c0-1.65.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.08 3.05 7.44 7 7.93v-2.02c-2.83-.48-5-2.94-5-5.91z"/></svg>Reset All to Defaults';
        resetAllBtn.addEventListener('click', () => {
            Object.keys(this.settings).forEach(category => {
                Object.keys(this.settings[category]).forEach(setting => {
                    const defaultValue = this.settings[category][setting].default;
                    this.saveSetting(category, setting, defaultValue);
                });
            });
            this.renderSettings(); // Refresh the entire UI
        });
        settingsTab.appendChild(resetAllBtn);
    }

    updateResetButton(category, setting, resetBtn) {
        const currentValue = this.settings[category][setting].value;
        const defaultValue = this.settings[category][setting].default;
        resetBtn.style.display = currentValue === defaultValue ? 'none' : 'flex';
    }
} 