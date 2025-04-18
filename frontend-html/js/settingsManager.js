export class SettingsManager {
    constructor() {
        this.settings = {
            visualization: {
                brainSlicerEnabled: {
                    name: "Enable Slicer Tool",
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
                    type: "select",
                    default: 'black',
                    options: ['black', 'white', 'skybox'],
                    onChange: (value) => {
                        window.viewer.viewer.setBackground(value);
                    }
                },
                edlEnabled: {
                    name: "Eye-Dome Lighting",
                    description: "Puts a small shadow around every paper's point",
                    type: "checkbox",
                    default: true,
                    onChange: (value) => {
                        window.viewer.viewer.setEDLEnabled(value);
                    }
                },
                edlRadius: {
                    name: "Eye-dome lighting radius",
                    type: "range",
                    default: 1.1,
                    min: 0.5,
                    max: 2.0,
                    step: 0.1,
                    dependsOn: {
                        'edlEnabled': true
                    },
                    onChange: (value) => {
                        window.viewer.viewer.setEDLRadius(value);
                    }
                },
                edlStrength: {
                    name: "Eye-dome lighting strength",
                    type: "range",
                    default: 0.1,
                    min: 0.0,
                    max: 0.5,
                    step: 0.01,
                    dependsOn: {
                        'edlEnabled': true
                    },
                    onChange: (value) => {
                        window.viewer.viewer.setEDLStrength(value);
                    }
                },
                cameraFOV: {
                    name: "Camera Field of View",
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
                    name: "Minimum Movement Speed",
                    type: "range",
                    default: 0.1,
                    min: 0.01,
                    max: 1.0,
                    step: 0.01,
                    onChange: (value) => {
                        if (window.viewer && window.viewer.setupControls) {
                            // Update the baseSpeed constant in setupControls
                            window.viewer.baseSpeed = value;
                        }
                    }
                },
                maxSpeed: {
                    name: "Maximum Movement Speed",
                    type: "range",
                    default: 20.0,
                    min: 5.0,
                    max: 50.0,
                    step: 0.5,
                    onChange: (value) => {
                        if (window.viewer && window.viewer.setupControls) {
                            // Update the maxSpeed constant in setupControls
                            window.viewer.maxSpeed = value;
                        }
                    }
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
                    name: "Skip Introduction on Startup",
                    type: "checkbox",
                    default: false,
                }
            },
            ui: {
                celesteVisible: {
                    name: "Show Celeste",
                    type: "checkbox",
                    default: true,
                    onChange: (value) => {
                        const celesteHelper = document.querySelector('.celeste-helper');
                        if (celesteHelper) {
                            // Only show Celeste if we're not in a tour and the setting is true
                            const isInTour = celesteHelper.classList.contains('tour-mode');
                            celesteHelper.style.display = (value && !isInTour) ? 'block' : 'none';
                        }
                    }
                },
                annotationTextSize: {
                    name: "Annotation Text Size",
                    description: "Size of annotation text",
                    type: "range",
                    default: 14,
                    min: 8,
                    max: 24,
                    step: 1,
                    onChange: (value) => {
                        // Update font size for all annotation labels
                        document.querySelectorAll('.annotation-label').forEach(label => {
                            label.style.fontSize = `${value}px`;
                        });
                    }
                },
                annotationVisibilityMode: {
                    name: "Annotation Visibility",
                    description: "How annotations are displayed when you have a filter applied",
                    type: "select",
                    default: 'auto-hide',
                    options: ['auto-hide', 'filtered', 'all'],
                },
                annotationTotalVisibleCount: {
                    name: "Total Visible Annotations",
                    description: "How many annotations are visible at once",
                    type: "range",
                    default: 20,
                    min: 10,
                    max: 100,
                    step: 5,
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

        // Re-render settings if this setting has dependents
        const hasDependent = Object.values(this.settings[category]).some(s => 
            s.dependsOn && Object.entries(s.dependsOn).some(([id, val]) => 
                id === setting && val !== undefined
            )
        );
        if (hasDependent) {
            this.renderSettings();
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

            Object.keys(this.settings[category]).forEach(settingId => {
                const settingData = {
                    ...this.settings[category][settingId],
                    category,
                    id: settingId
                };
                const settingItem = this._createSettingHTML(settingData);
                if (settingItem) {
                    section.appendChild(settingItem);
                }
            });

            // Only append section if it has visible settings
            if (section.children.length > 1) { // > 1 because we always have the heading
                settingsTab.appendChild(section);
            }
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

    _createSettingHTML(setting) {
        // Check if this setting should be visible based on its dependencies
        if (setting.dependsOn) {
            for (const [dependencyId, requiredValue] of Object.entries(setting.dependsOn)) {
                const dependencyValue = this.settings[setting.category][dependencyId].value;
                if (dependencyValue !== requiredValue) {
                    // Don't render if dependencies aren't met
                    return null;
                }
            }
        }

        const settingItem = document.createElement('div');
        settingItem.classList.add('setting-item');
        settingItem.classList.add(setting.type);

        const header = document.createElement('div');
        header.classList.add('setting-item-header');

        const labelContainer = document.createElement('div');
        labelContainer.classList.add('setting-label-container');

        const label = document.createElement('label');
        label.classList.add('setting-item-label');
        label.textContent = setting.name;
        labelContainer.appendChild(label);

        if (setting.description) {
            const description = document.createElement('span');
            description.classList.add('setting-description');
            description.textContent = setting.description;
            
            // All descriptions go to the label
            label.appendChild(description);
            
            if (setting.type === 'range' || setting.type === 'select') {
                settingItem.classList.add('with-description');
            }
        }

        header.appendChild(labelContainer);

        const controls = document.createElement('div');
        controls.classList.add('setting-controls');

        let input;
        
        // Create reset button up here so it's available for all cases
        const resetButton = document.createElement('button');
        resetButton.classList.add('reset-button');
        resetButton.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,6V9L16,5L12,1V4C7.58,4 4,7.58 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13.01 6,12C6,8.69 8.69,6 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,10.99 18,12C18,15.31 15.31,18 12,18V15L8,19L12,23V20C16.42,20 20,16.42 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/></svg>';
        resetButton.title = 'Reset to default';
        resetButton.style.display = JSON.stringify(setting.value) === JSON.stringify(setting.default) ? 'none' : 'flex';

        resetButton.addEventListener('click', () => {
            this.saveSetting(setting.category, setting.id, setting.default);
            
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = setting.default;
                } else if (input.type === 'range') {
                    input.value = setting.default;
                    const numberDisplay = input.parentElement.querySelector('.range-value');
                    if (numberDisplay) {
                        numberDisplay.textContent = setting.default;
                    }
                }
            } else if (setting.type === 'select') {
                controls.querySelectorAll('.select-option').forEach(el => {
                    el.classList.toggle('selected', el.textContent === setting.default);
                });
            } else if (setting.type === 'multi-select') {
                controls.querySelectorAll('.select-option').forEach(el => {
                    el.classList.toggle('selected', setting.default.includes(el.textContent));
                });
            }
            
            this.updateResetButton(setting.category, setting.id, resetButton);
        });
        
        switch (setting.type) {
            case 'checkbox':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `${setting.category}-${setting.id}`;
                input.checked = setting.value;
                input.setAttribute('data-category', setting.category);
                input.setAttribute('data-id', setting.id);

                const checkboxDisplay = document.createElement('span');
                checkboxDisplay.classList.add('checkbox-display');

                // Create a wrapper for the checkbox elements
                const checkboxWrapper = document.createElement('div');
                checkboxWrapper.classList.add('checkbox-wrapper');
                checkboxWrapper.appendChild(input);
                checkboxWrapper.appendChild(checkboxDisplay);

                // Add click handlers to both the wrapper and label
                const handleClick = () => {
                    input.checked = !input.checked;
                    this.saveSetting(setting.category, setting.id, input.checked);
                    this.updateResetButton(setting.category, setting.id, resetButton);
                };
                
                checkboxWrapper.addEventListener('click', handleClick);
                label.addEventListener('click', handleClick);

                // For checkboxes, we create a special left container
                const checkboxLeftContainer = document.createElement('div');
                checkboxLeftContainer.classList.add('checkbox-left-container');
                checkboxLeftContainer.appendChild(checkboxWrapper);
                
                // Move reset button under checkbox
                resetButton.classList.add('checkbox-reset');
                checkboxLeftContainer.appendChild(resetButton);

                // Clear existing header content and rebuild
                while (header.firstChild) {
                    header.removeChild(header.firstChild);
                }
                header.appendChild(checkboxLeftContainer);
                header.appendChild(label);

                // Remove the old change listener since we're using click now
                break;

            case 'range':
                const rangeContainer = document.createElement('div');
                rangeContainer.classList.add('range-container');

                input = document.createElement('input');
                input.type = 'range';
                input.id = `${setting.category}-${setting.id}`;
                input.min = setting.min;
                input.max = setting.max;
                input.step = setting.step || 1;
                input.value = setting.value;

                const value = document.createElement('span');
                value.classList.add('range-value');
                value.textContent = setting.value;

                input.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    value.textContent = val;
                });

                input.addEventListener('change', (e) => {
                    const val = parseFloat(e.target.value);
                    this.saveSetting(setting.category, setting.id, val);
                    this.updateResetButton(setting.category, setting.id, resetButton);
                });

                rangeContainer.appendChild(input);
                rangeContainer.appendChild(value);
                controls.appendChild(rangeContainer);
                break;

            case 'select':
                const selectContainer = document.createElement('div');
                selectContainer.classList.add('select-container');

                setting.options.forEach(option => {
                    const optionElement = document.createElement('button');
                    optionElement.classList.add('select-option');
                    if (setting.value === option) {
                        optionElement.classList.add('selected');
                    }
                    optionElement.textContent = option;
                    
                    optionElement.addEventListener('click', () => {
                        // Remove selected class from all options
                        selectContainer.querySelectorAll('.select-option').forEach(el => {
                            el.classList.remove('selected');
                        });
                        // Add selected class to clicked option
                        optionElement.classList.add('selected');
                        this.saveSetting(setting.category, setting.id, option);
                        this.updateResetButton(setting.category, setting.id, resetButton);
                    });
                    
                    selectContainer.appendChild(optionElement);
                });

                controls.appendChild(selectContainer);
                break;

            case 'multi-select':
                const multiSelectContainer = document.createElement('div');
                multiSelectContainer.classList.add('multi-select-container');

                setting.options.forEach(option => {
                    const optionElement = document.createElement('button');
                    optionElement.classList.add('select-option');
                    if (setting.value.includes(option)) {
                        optionElement.classList.add('selected');
                    }
                    optionElement.textContent = option;
                    
                    optionElement.addEventListener('click', () => {
                        optionElement.classList.toggle('selected');
                        const selectedOptions = Array.from(multiSelectContainer.querySelectorAll('.selected'))
                            .map(el => el.textContent);
                        this.saveSetting(setting.category, setting.id, selectedOptions);
                        this.updateResetButton(setting.category, setting.id, resetButton);
                    });
                    
                    multiSelectContainer.appendChild(optionElement);
                });

                controls.appendChild(multiSelectContainer);
                break;
        }

        if (setting.type !== 'checkbox') {
            header.appendChild(resetButton);
            settingItem.appendChild(header);
            settingItem.appendChild(controls);
        } else {
            settingItem.appendChild(header);
        }

        return settingItem;
    }

    updateResetButton(category, settingId, resetButton) {
        const setting = this.settings[category][settingId];
        const currentValue = setting.value;
        const defaultValue = setting.default;
        resetButton.style.display = JSON.stringify(currentValue) === JSON.stringify(defaultValue) ? 'none' : 'flex';
    }
} 