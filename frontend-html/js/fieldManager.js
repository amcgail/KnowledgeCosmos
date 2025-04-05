import { getColor, hslToRgb, hslToHex } from './utils.js';
import {STLLoader} from "/libs/three.js/loaders/STLLoader.js";
import * as THREE from "/libs/three.js/build/three.module.js";

THREE.Cache.enabled = true;

/**
 * Class to manage a single field and its subfields
 * @class
 */
class Field {
    /**
     * Creates a new Field instance
     * @param {string} name - The name of the field
     * @param {Array} subfields - Array of subfield names
     * @param {Object} colors - Color mapping for subfields
     * @param {Array} orders - Order of subfields
     */
    constructor(manager, name, subfields, colors, orders) {
        this.manager = manager;
        this.name = name;
        this.subfields = subfields;
        this.colors = colors;
        this.orders = orders;
        this.pointCloud = null;
        this.selectedSubfields = new Set();
        this.isActive = false;
        this.swatchElements = [];
        this.labelElements = [];

        this.$legendItem = null;
        this.$expansionElement = null;

        this.createLegendItem();
    }

    /**
     * Sets the point cloud for this field
     * @param {Object} pc - The point cloud object
     */
    setPointCloud(pc) {
        this.pointCloud = pc;
    }

    /**
     * Toggles the selection state of a subfield
     * @param {string} subfield - The subfield to toggle
     * @returns {boolean} True if any subfields are selected
     */
    toggleSubfield(subfield) {
        if (this.selectedSubfields.has(subfield)) {
            this.selectedSubfields.delete(subfield);
        } else {
            this.selectedSubfields.add(subfield);
        }
        this.updateSwatchVisibility();
        return this.selectedSubfields.size > 0;
    }

    /**
     * Clears all selected subfields
     */
    clearSubfields() {
        this.selectedSubfields.clear();
        this.updateSwatchVisibility();
    }

    /**
     * Sets the active state of the field
     * @param {boolean} active - Whether the field should be active
     */
    setActive(active) {
        this.isActive = active;
        if (this.pointCloud) {
            this.pointCloud.visible = active;
        }
    }

    /**
     * Gets the classification scheme for the field
     * @returns {Object} The classification scheme with visibility and color info
     */
    getClassificationScheme() {
        const scheme = {};
        this.orders.forEach((sub, index) => {
            const visible = this.selectedSubfields.size === 0 || this.selectedSubfields.has(sub);
            scheme[index + 1] = {
                visible: visible,
                name: sub,
                color: this.colors[sub]
            };
        });
        return scheme;
    }

    expandLegendItem() {
        this.toggleLegendItem(true);
    }

    toggleLegendItem(state, callback) {
        callback = callback || (() => {});

        // Remove all existing expansions
        $(".legend_expansion").remove();

        if (state === true || (state === undefined && !this.$legendItem.data('expanded'))) {
            const $ls = this.createExpansionElement();
            $ls.insertAfter(this.$legendItem);
            
            $(".legend_item").data('expanded', false);
            this.$legendItem.data('expanded', true);

            callback(true);
        } else {
            this.$legendItem.data('expanded', false);

            callback(false);
        }
    }
    
    /**
     * Creates a legend item for a field
     * @returns {jQuery} The created legend item element
     */
    createLegendItem() {
        const $s = $("<span class='legend_item'>");
        $s.data('expanded', false);
        $s.html(this.name);

        this.$legendItem = $s;
        $s.click(() => this.toggleLegendItem(undefined, (state) => {
            if (state) {
                this.manager.applyFilter(this.name);
            } else {
                // Clear active field
                this.manager.setActiveField(null);
                this.manager.topLevelFilter = null;

                // Show main point cloud and hide all cached ones
                window.main_pc.visible = true;
                for (const [name, pointCloud] of this.manager.pointCloudCache.entries()) {
                    const field = this.manager.fieldInstances.get(name);
                    field.setActive(false);
                    pointCloud.visible = false;
                }
            }
        }));

        return $s;
    }

    /**
     * Creates the UI expansion element for this field
     * @param {Function} onSwatchClick - Callback function for swatch click
     * @returns {jQuery} The created expansion element
     */
    createExpansionElement(onSwatchClick) {
        const $ls = $("<div class='legend_expansion'>");
        this.$expansionElement = $ls;
        this.swatchElements = [];
        this.labelElements = [];

        // Add clear button
        const $clearButton = $("<div class='clear-selection'>Clear</div>");
        $clearButton.click(() => {
            this.clearSubfields();
            // Get the classification scheme from the Field instance
            const scheme = this.getClassificationScheme();
            window.viewer.viewer.setClassifications(scheme);
        });
        $ls.append($clearButton);

        const subfieldsList = [...this.orders];
        
        // Add any subfields that might not be in orders
        for (const sub of this.subfields) {
            if (!subfieldsList.includes(sub)) {
                subfieldsList.push(sub);
            }
        }

        // Create swatches for each subfield
        for (const sub of subfieldsList) {
            const c = this.colors[sub];
            const rgb = `${c[0]*256}, ${c[1]*256}, ${c[2]*256}`;
            
            const $swatch = $(`<div class='swatch' style='background-color:rgb(${rgb})'>`);
            const $label = $("<div class='label'>").html(sub);
            
            // Add click handler
            $swatch.click(() => {
                this.toggleSubfield(sub);
            
                // Get the classification scheme from the Field instance
                const scheme = this.getClassificationScheme();
                window.viewer.viewer.setClassifications(scheme);
            });
            
            $ls.append($swatch, $label, $("<br>"));
            this.swatchElements.push($swatch);
            this.labelElements.push($label);
        }

        // Add "Other" swatch (not actually linked to any data)
        $ls.append(
            $(`<div class='swatch' style='background-color:rgb(50, 50, 50)'>`),
            $("<div class='label'>").html('Other'),
            $("<br>")
        );
        
        // Initialize visibility
        this.updateSwatchVisibility();
        
        return $ls;
    }

    /**
     * Updates the visibility of swatches based on selected subfields
     */
    updateSwatchVisibility() {
        if (!this.swatchElements.length) return;
        
        // Show/hide clear button based on selection state
        const $clearButton = this.$expansionElement.find('.clear-selection');
        if (this.selectedSubfields.size > 0) {
            $clearButton.addClass('visible');
        } else {
            $clearButton.removeClass('visible');
        }
        
        this.orders.forEach((sub, index) => {
            if (index >= this.swatchElements.length) return;
            
            const $swatch = this.swatchElements[index];
            const isVisible = this.selectedSubfields.size === 0 || this.selectedSubfields.has(sub);
            $swatch.css('opacity', isVisible ? '1' : '0.5');
        });
    }

    /**
     * Gets the expansion element
     * @returns {jQuery} The expansion element
     */
    getExpansionElement() {
        return this.$expansionElement;
    }
}

/**
 * Utility class for color operations
 * @class
 */
class ColorUtils {
    /**
     * Generates a random color in HSL, RGB, and HEX formats
     * @returns {Object} Color object with HSL, RGB, and HEX values
     */
    static getRandomColor() {
        const [h, s, l] = getColor();
        return {
            'hsl': [h, s, l],
            'rgb': hslToRgb(h, s, l),
            'hex': hslToHex(h, s, l)
        };
    }

    /**
     * Converts RGB array to CSS color string
     * @param {Array} rgb - RGB color array [r, g, b]
     * @returns {string} CSS color string
     */
    static rgbToCss(rgb) {
        return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    }

    /**
     * Converts RGB array to THREE.js Color object
     * @param {Array} rgb - RGB color array [r, g, b]
     * @returns {THREE.Color} THREE.js Color object
     */
    static rgbToThreeColor(rgb) {
        return new THREE.Color(rgb[0]/255, rgb[1]/255, rgb[2]/255);
    }
}

const FIELDS_TO_FORGET = [
    'Petrology',
    'Market economy',
    'Arithmetic',
    'Geodesy',
    'Civil engineering',
]

// Add list of central fields that should always be visible
const CENTRAL_FIELDS = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer science',
    'Engineering',
    'Medicine',
    'Psychology',
    'Economics',
    'Sociology'
];

/**
 * Main class for managing fields and their interactions
 * @class
 */
export class FieldManager {
    /**
     * Creates a new FieldManager instance
     */
    constructor() {
        this.fields = null;
        this.subfield_colors = null;
        this.subfields = null;
        this.subfield_links = [];
        this.pointCloudCache = new Map(); // Cache for loaded point clouds
        this.field_centers = null; // Store field centers
        this.currentAnnotationConstellation = null;  // Track constellation from annotation clicks only
        this.selectedFieldName = null; // Track currently selected field
        this.labelsVisible = false;
        this.lastClickTime = 0; // Track the timestamp of the last click
        this.pinnedConstellations = new Map(); // Initialize pinned constellations map
        this.activeField = null; // Track current active field instead of using currentFilter
        this.fieldInstances = new Map(); // Store Field instances
    }

    /**
     * Loads field data from JSON file
     * @returns {Promise} Promise that resolves when fields are loaded
     */
    loadFields() {
        return new Promise((resolve, reject) => {
            $.getJSON('/data/fields.json', (data) => {
                this.fields = data.fields;
                this.top_level = data.top_level;
                this.subfield_colors = data.subfield_colors;
                this.subfields = data.subfields;
                this.field_orders = data.field_orders;
                this.field_centers = data.field_centers;

                // Initialize Field instances
                for (const fieldName of Object.keys(this.subfields)) {
                    this.fieldInstances.set(fieldName, new Field(
                        this,
                        fieldName,
                        this.subfields[fieldName],
                        this.subfield_colors[fieldName],
                        this.field_orders[fieldName]
                    ));
                }

                console.log(this.fieldInstances);

                resolve(data);
            }).fail(reject);
        });
    }

    /**
     * Sets up autocomplete functionality for field lookup
     */
    setupFieldAutocomplete() {
        $("#constellations-tab #field_lookup").autocomplete({
            source: (request, response) => {
                // Filter and sort matches
                const matches = this.fields.filter(field => 
                    field.toLowerCase().includes(request.term.toLowerCase())
                );
                
                // Return only top 10 matches
                response(matches.slice(0, 10));
            },
            minLength: 2
        });
    }

    /**
     * Sets up the legend UI for fields
     */
    setupLegend() {
        const $l = $("#legend");
        $l.html("");

        const top_fields = Object.keys(this.subfields).sort();
        
        for (const s of top_fields) {
            if (FIELDS_TO_FORGET.includes(s)) continue;
            const fieldInstance = this.fieldInstances.get(s);
            const $myl = fieldInstance.$legendItem;
            this.subfield_links.push($myl);
            $l.append($myl);
        }
    }

    /**
     * Sets the active field and deactivates other fields
     * @param {Field} field - The field to set as active
     */
    setActiveField(field) {
        // Deactivate previous active field
        if (this.activeField && this.activeField !== field) {
            this.activeField.clearSubfields();
        }
        this.activeField = field;
    }

    /**
     * Loads a point cloud for a field
     * @param {string} S - The field name
     * @param {Function} callback - Callback function when point cloud is loaded
     */
    loadFieldPointCloud(S, callback) {
        window.viewer.loadPointCloud(`/data/pointclouds/${S}/metadata.json`, (pc) => {
            // Configure point cloud material
            const material = pc.material;
            material.size = 0.08;
            material.minimumNodePixelSize = 2;
            material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
            material.shape = Potree.PointShape.CIRCLE;
            material.uniforms.uShadowColor.value = [0.6, 0.6, 0.6];
            
            // Ensure point cloud is initially hidden
            pc.visible = false;
            callback(pc);
        });
    }

    /**
     * Sets up constellation add functionality
     */
    setupConstellationAdd() {
        $("#constellations-tab #field_add").click(() => {
            const field = $("#field_lookup").val();
            this.visualizeFieldMesh(field, (ret) => {
                const c = ret.color;
                
                const $item = $("<div class='legend_item'>");
                
                const $r_link = $("<div class='link'>remove</div>").click(() => {
                    window.viewer.viewer.scene.scene.remove(ret.mesh);
                    $item.remove();
                });

                const c_text = `rgb(${c[0]},${c[1]},${c[2]})`;
                
                const $svg = $(`<svg height="25" width="25" style="stroke:${c_text}; stroke-width:2px; fill:${c_text}; cursor: pointer;">
                    <polygon points="12.5,3 5,20 20,20" class="triangle" style="stroke: black; stroke-width: 1px;" />
                </svg>`);

                // Add click handler to change color
                $svg.click(() => {
                    const newColor = this.getRandomColor();
                    const newColorText = `rgb(${newColor.rgb[0]},${newColor.rgb[1]},${newColor.rgb[2]})`;
                    $svg.attr('style', `stroke:${newColorText}; stroke-width:2px; fill:${newColorText}; cursor: pointer;`);
                    ret.mesh.material.color.setHex(newColor.hex);
                    this.updateAnnotationColor(ret.name, newColorText);
                });
                
                $item.append(
                    $svg,
                    $(`<span class='lab'>${ret.name}</span>`),
                    $r_link
                );
                
                $("#const_legend").append($item);
            });
        });
    }

    /**
     * Adjusts the brightness of the overall scene by modifying EDL opacity
     */
    adjustSceneBrightness() {  // Renamed from dimOverallScene
        const X = {op: window.viewer.viewer.edlOpacity};
        new TWEEN.Tween(X)
            .to({op: 0.8}, 500)
            .onUpdate(() => {
                window.viewer.viewer.setEDLOpacity(X.op);
            })
            .start();
    }

    /**
     * Visualizes a field by loading and displaying its 3D mesh
     * @param {string} which - The field name to visualize
     * @param {Function} callback - Callback function when visualization is complete
     */
    visualizeFieldMesh(which, callback) {
        const my_color = this.getRandomColor();

        const material = new THREE.MeshBasicMaterial({
            color: my_color.hex,
            wireframe: true,
            wireframeLinewidth: 10
        });

        const loader = new STLLoader();
        loader.load(
            `/data/field_meshes/${which}.stl`,
            (geometry) => {
                const mesh = new THREE.Mesh(geometry, material);
                mesh.scale.set(100, 100, 100);
                material.transparent = true;
                window.viewer.viewer.scene.scene.add(mesh);
                
                const ret = {
                    mesh: mesh,
                    color: my_color.rgb,
                    name: which
                };
                
                this.adjustSceneBrightness();
                callback(ret);
            },
            (xhr) => {
            },
            (error) => {
            }
        );
    }

    /**
     * Updates the color of an annotation
     * @param {string} fieldName - The field name
     * @param {string} color - The new color
     */
    updateAnnotationColor(fieldName, color) {
        // Find the annotation for this field and update its color
        window.viewer.viewer.scene.annotations.children.forEach(annotation => {
            if (annotation.title === fieldName) {
                annotation.domElement.find('.annotation-label').css('color', color);
            }
        });
    }

    /**
     * Gets information about a field's parent field and hierarchy
     * @param {string} fieldName - The field name
     * @returns {Object | null} Object containing topField and subfield info, or null if not found
     */
    getFieldParentInfo(fieldName) {
        // First check if it's a top field
        if (Object.keys(this.subfields).includes(fieldName)) {
            return { topField: fieldName, subfield: null };
        }

        // Find the parent field for this subfield
        for (const [top, subs] of Object.entries(this.subfields)) {
            if (subs.includes(fieldName)) {
                return { topField: top, subfield: fieldName };
            }
        }

        // If we can't find one, return null
        return { topField: null, subfield: null };
    }

    /**
     * Ensures a point cloud is loaded for a field
     * @param {string} fieldName - The field name
     * @param {Function} callback - Callback function when point cloud is loaded
     */
    ensurePointCloudLoaded(fieldName, callback) {
        if (this.pointCloudCache.has(fieldName)) {
            callback();
            return;
        }

        $('.loading').show();
        this.loadFieldPointCloud(fieldName, (pc) => {
            this.pointCloudCache.set(fieldName, pc);
            $('.loading').fadeOut(200);
            callback();
        });
    }

    /**
     * Applies a filter to a specific top-level or subfield
     * @param {string} fieldName - The top-level or subfield name
     */
    applyFilter(topField_or_subfield, subfield_or_null) {
        // First, understand the field hierarchy
        let topField;
        let subfield;

        if (!subfield_or_null) {
            const getFieldHierarchy = this.getFieldParentInfo(topField_or_subfield);
            topField = getFieldHierarchy.topField;
            subfield = getFieldHierarchy.subfield;
        } else if (this.fields.includes(topField_or_subfield)) {
            topField = topField_or_subfield;
            subfield = subfield_or_null;
        } else {
            console.warn(`Field ${topField_or_subfield} not found`);
            return;
        }
        
        // If necessary, load the point cloud for this field
        this.ensurePointCloudLoaded(topField, () => {
            // Show only the selected field's point cloud
            window.main_pc.visible = false;
            for (const [name, pc] of this.pointCloudCache.entries()) {
                pc.visible = name === topField;
            };
            
            this.topLevelFilter = topField;
    
            // Get the Field instance for this top field
            const fieldInstance = this.fieldInstances.get(topField);
            
            // Sync Field's selected subfields with current filter
            fieldInstance.clearSubfields();

            // If we're filtering for a specific subfield, toggle it
            if (subfield) {
                fieldInstance.clearSubfields();
                fieldInstance.toggleSubfield(subfield);
            }
            
            // Get the classification scheme from the Field instance
            const scheme = fieldInstance.getClassificationScheme();
            
            window.viewer.viewer.setClassifications(scheme);
        });
    }

    /**
     * Adds action buttons to an annotation
     * @param {Object} annotation - The annotation object
     * @param {string} fieldName - The field name
     * @param {Object} color - The color object
     */
    addAnnotationButtons(annotation, fieldName, color) {
        const $label = annotation.domElement.find('.annotation-label');
        
        // Create action buttons container
        const $actionButtons = $("<div class='annotation-buttons'>");

        // Understand whether this is in the field hierarchy
        const getFieldHierarchy = this.getFieldParentInfo(fieldName);
        
        if (getFieldHierarchy.topField) {
            const topField = this.fieldInstances.get(getFieldHierarchy.topField);
            // Add Filter icon
            const $filterIcon = $(`<svg class="icon filter-icon" width="16" height="16" viewBox="0 0 24 24">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>`);
            $filterIcon.click(() => {
                this.applyFilter(getFieldHierarchy.topField, getFieldHierarchy.subfield);
                topField.expandLegendItem();
            });

            $actionButtons.append($filterIcon);
        }
        
        // Add Pin icon
        const $pinIcon = $(`<svg class="icon pin-icon" width="16" height="16" viewBox="0 0 24 24" data-field="${fieldName}">
            <path d="M12 2l2.4 5.4L20 8.5l-4.4 3.9 1.4 5.6L12 15.6l-5 2.4 1.4-5.6L4 8.5l5.6-1.1z"/>
        </svg>`);
        
        // Check if this field is already pinned
        if (this.pinnedConstellations.has(fieldName)) {
            $pinIcon.addClass('pinned');
        }
        
        $pinIcon.click(() => {
            if (!this.pinnedConstellations.has(fieldName)) {
                // Create a new mesh for the pinned constellation with the same color
                const pinnedMaterial = new THREE.MeshBasicMaterial({
                    color: color.hex,
                    wireframe: true,
                    wireframeLinewidth: 10,
                    transparent: true,
                    opacity: 0.8
                });
                
                const loader = new STLLoader();
                loader.load(
                    `/data/field_meshes/${fieldName}.stl`,
                    (geometry) => {
                        const pinnedMesh = new THREE.Mesh(geometry, pinnedMaterial);
                        pinnedMesh.scale.set(100, 100, 100);
                        window.viewer.viewer.scene.scene.add(pinnedMesh);
                        
                        this.pinnedConstellations.set(fieldName, {
                            mesh: pinnedMesh,
                            color: color.rgb,
                            name: fieldName
                        });
                        
                        $pinIcon.addClass('pinned');
                    }
                );
            } else {
                // Remove pinned constellation
                const pinned = this.pinnedConstellations.get(fieldName);
                window.viewer.viewer.scene.scene.remove(pinned.mesh);
                this.pinnedConstellations.delete(fieldName);
                $pinIcon.removeClass('pinned');
            }
        });
        
        $actionButtons.append($pinIcon);
        $label.after($actionButtons);
    }

    /**
     * Handles click events on annotations
     * @param {string} fieldName - The field name
     */
    handleAnnotationClick(fieldName) {
        // If clicking the same field again, deselect it
        if (this.selectedFieldName === fieldName) {
            if (this.currentAnnotationConstellation) {
                window.viewer.viewer.scene.scene.remove(this.currentAnnotationConstellation);
                this.currentAnnotationConstellation = null;
                // Remove from legend if not pinned
                if (!this.pinnedConstellations.has(fieldName)) {
                    $(`#const_legend .legend_item:has(span:contains('${fieldName}'))`).remove();
                }
            }
            this.updateAnnotationColor(fieldName, 'white'); // Reset color
            this.selectedFieldName = null;
            // Remove buttons from all annotations
            $('.annotation-buttons').remove();
            return;
        }

        // Store the current timestamp
        const clickTime = Date.now();
        this.lastClickTime = clickTime;

        // Reset previous selection's color if exists
        if (this.selectedFieldName) {
            this.updateAnnotationColor(this.selectedFieldName, 'white');
            // Remove previous field from legend if not pinned
            if (!this.pinnedConstellations.has(this.selectedFieldName)) {
                $(`#const_legend .legend_item:has(span:contains('${this.selectedFieldName}'))`).remove();
            }
        }

        // Remove previous annotation constellation if it exists
        if (this.currentAnnotationConstellation) {
            window.viewer.viewer.scene.scene.remove(this.currentAnnotationConstellation);
            this.currentAnnotationConstellation = null;
        }

        // Remove buttons from all annotations
        $('.annotation-buttons').remove();

        // Get a random color like constellations do
        const my_color = this.getRandomColor();

        // Update the selected field and its color
        this.selectedFieldName = fieldName;
        this.updateAnnotationColor(fieldName, `rgb(${my_color.rgb[0]},${my_color.rgb[1]},${my_color.rgb[2]})`);

        // Set z-index to highest for the selected annotation
        window.viewer.viewer.scene.annotations.children.forEach(annotation => {
            if (annotation.title === fieldName) {
                annotation.domElement.addClass('selected-annotation');
                // Add buttons to this annotation
                this.addAnnotationButtons(annotation, fieldName, my_color);
            } else {
                annotation.domElement.removeClass('selected-annotation');
            }
        });

        // IMPORTANT: We no longer automatically apply filtering when clicking an annotation
        // Instead, we just show the constellation and update the UI

        const material = new THREE.MeshBasicMaterial({
            color: my_color.hex,
            wireframe: true,
            wireframeLinewidth: 10,
            transparent: true,
            opacity: 0.8
        });

        const loader = new STLLoader();
        loader.load(
            `/data/field_meshes/${fieldName}.stl`,
            (geometry) => {
                // Only proceed if this is still the most recent click
                if (clickTime === this.lastClickTime) {
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.scale.set(100, 100, 100);
                    window.viewer.viewer.scene.scene.add(mesh);
                    this.currentAnnotationConstellation = mesh;
                    this.adjustSceneBrightness();  // Add the scene dimming effect

                    // Add to constellations legend if not already there
                    if (!$(`#const_legend .legend_item:has(span:contains('${fieldName}'))`).length) {
                        const $item = $("<div class='legend_item'>");
                        const $r_link = $("<div class='link'>remove</div>").click(() => {
                            if (this.pinnedConstellations.has(fieldName)) {
                                // If pinned, just remove the pin
                                const pinned = this.pinnedConstellations.get(fieldName);
                                window.viewer.viewer.scene.scene.remove(pinned.mesh);
                                this.pinnedConstellations.delete(fieldName);
                                // Update pin icon if visible
                                $(`.annotation-buttons .pin-icon[data-field='${fieldName}']`).removeClass('pinned');
                            } else {
                                // If not pinned, remove everything
                                window.viewer.viewer.scene.scene.remove(mesh);
                                this.updateAnnotationColor(fieldName, 'white');
                                this.selectedFieldName = null;
                                this.currentAnnotationConstellation = null;
                            }
                            $item.remove();
                        });

                        const c_text = `rgb(${my_color.rgb[0]},${my_color.rgb[1]},${my_color.rgb[2]})`;
                        
                        const $svg = $(`<svg height="25" width="25" style="stroke:${c_text}; stroke-width:2px; fill:${c_text}; cursor: pointer;">
                            <polygon points="12.5,3 5,20 20,20" class="triangle" style="stroke: black; stroke-width: 1px;" />
                        </svg>`);

                        // Add click handler to change color
                        $svg.click(() => {
                            const newColor = this.getRandomColor();
                            const newColorText = `rgb(${newColor.rgb[0]},${newColor.rgb[1]},${newColor.rgb[2]})`;
                            $svg.attr('style', `stroke:${newColorText}; stroke-width:2px; fill:${newColorText}; cursor: pointer;`);
                            mesh.material.color.setHex(newColor.hex);
                            this.updateAnnotationColor(fieldName, newColorText);
                            // Update pinned constellation color if exists
                            if (this.pinnedConstellations.has(fieldName)) {
                                const pinned = this.pinnedConstellations.get(fieldName);
                                pinned.mesh.material.color.setHex(newColor.hex);
                            }
                        });
                        
                        $item.append(
                            $svg,
                            $(`<span class='lab'>${fieldName}</span>`),
                            $r_link
                        );
                        
                        $("#const_legend").append($item);
                    }
                }
            },
            (xhr) => {
            },
            (error) => {
                console.error('Error loading field mesh:', error);
            }
        );
    }

    /**
     * Generates a random color
     * @returns {Object} Color object with HSL, RGB, and HEX values
     */
    getRandomColor() {
        return ColorUtils.getRandomColor();
    }

    /**
     * Updates the opacities of annotations based on camera position
     */
    updateAnnotationOpacities() {
        if (!this.field_centers || !window.viewer) return;
        
        const camera = window.viewer.viewer.scene.getActiveCamera();
        const cameraPosition = camera.position;
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        
        // Calculate distances for all annotations
        const annotationsWithDistances = [];
        window.viewer.viewer.scene.annotations.children.forEach(annotation => {
            // Calculate vector from camera to annotation
            const toAnnotation = new THREE.Vector3();
            toAnnotation.subVectors(annotation.position, cameraPosition);
            
            // Project the toAnnotation vector onto the camera direction
            // Negative dot product means the annotation is behind the camera
            const dot = toAnnotation.dot(cameraDirection);
            
            // Use a large distance for points behind the camera
            let distance = dot < 0 ? 100000 : cameraPosition.distanceTo(annotation.position);
            
            // If there's a filtered field, only show its subfields
            if (this.topLevelFilter) {
                // If this is a subfield of the filtered field, keep its distance
                if (this.subfields[this.topLevelFilter]?.includes(annotation.title)) {
                    // Keep the original distance
                } else {
                    // Push everything else far away
                    distance = Infinity;
                }
            }
            
            annotationsWithDistances.push({ annotation, distance });
        });
        
        // Sort by distance
        annotationsWithDistances.sort((a, b) => a.distance - b.distance);
        
        // Define visibility thresholds
        const fullyVisibleCount = 5;
        const partiallyVisibleCount = 15;
        const totalVisibleCount = 20; // 5 fully visible + 15 partially visible
        const maxDistance = 1000; // Maximum distance threshold for regular labels
        const centralMaxDistance = 2000; // Maximum distance threshold for central fields
        
        // Define scaling thresholds
        const minScale = 1.0; // Default size
        const maxScale = 3.0; // Maximum size multiplier
        const scaleStartDistance = 200; // Start scaling up when closer than this
        const scaleEndDistance = 50; // Reach maximum scale at this distance
        
        // Define central field opacity thresholds
        const centralMinOpacity = 0.4; // Minimum opacity for central fields
        const centralMaxOpacity = 0.9; // Maximum opacity for central fields
        const centralFadeStartDistance = 1500; // Start fading central fields at this distance
        const centralFadeEndDistance = 2000; // Complete fade at this distance
        
        annotationsWithDistances.forEach((item, index) => {
            const { annotation, distance } = item;
            const $element = annotation.domElement;
            const isCentralField = CENTRAL_FIELDS.includes(annotation.title);
            
            if (!this.labelsVisible) {
                $element.css({
                    'display': 'none'
                });
                return;
            }
            
            // Calculate scale based on distance
            let scale = minScale;
            if (distance < scaleStartDistance) {
                if (distance != 100000) {
                    // Linear interpolation between min and max scale
                    const scaleProgress = Math.max(0, (distance - scaleEndDistance) / (scaleStartDistance - scaleEndDistance));
                    scale = maxScale - (maxScale - minScale) * scaleProgress;
                    scale = Math.min(maxScale, Math.max(minScale, scale)); // Clamp between min and max
                } else {
                    scale = 0;
                }
            }
            
            // Handle visibility based on distance and field type
            if (distance === 100000) {
                // Hide all fields (including central) if behind camera
                $element.css({
                    'display': 'none'
                });
                return;
            }
            
            if (isCentralField) {
                if (distance > centralMaxDistance) {
                    // Hide central fields at extreme distances
                    $element.css({
                        'display': 'none'
                    });
                    return;
                }
                
                // Calculate opacity for central fields based on distance
                let opacity = centralMaxOpacity;
                if (distance > centralFadeStartDistance) {
                    const fadeProgress = (distance - centralFadeStartDistance) / (centralFadeEndDistance - centralFadeStartDistance);
                    opacity = centralMaxOpacity - (centralMaxOpacity - centralMinOpacity) * fadeProgress;
                    opacity = Math.max(centralMinOpacity, Math.min(centralMaxOpacity, opacity));
                }
                
                $element.css({
                    'opacity': opacity.toFixed(2),
                    'display': 'block',
                    'transform': `translate(-50%, -30px) scale(${scale})`
                });
            } else if (annotation.title === this.selectedFieldName) {
                // Selected node is always fully visible (if in front of camera)
                $element.css({
                    'opacity': '1.0',
                    'display': 'block',
                    'transform': `translate(-50%, -30px) scale(${scale})`,
                    'z-index': '9999'
                });
            } else if (distance > maxDistance) {
                // Hide non-central fields at regular max distance
                $element.css({
                    'display': 'none',
                });
            } else if (index < fullyVisibleCount) {
                // First 5 annotations are fully visible
                $element.css({
                    'opacity': '1.0',
                    'display': 'block',
                    'transform': `translate(-50%, -30px) scale(${scale})`
                });
            } else if (index < totalVisibleCount) {
                // Next 15 annotations fade out linearly
                const fadeProgress = (index - fullyVisibleCount) / partiallyVisibleCount;
                const opacity = 0.8 * (1 - fadeProgress); // Start fading from 0.8 opacity
                $element.css({
                    'opacity': opacity.toFixed(2),
                    'display': 'block',
                    'transform': `translate(-50%, -30px) scale(${scale})`
                });
            } else {
                // Rest are hidden and non-interactive
                $element.css({
                    'display': 'none',
                });
            }
        });
    }

    /**
     * Adds field annotations to the scene
     */
    addFieldAnnotations() {
        if (!this.field_centers) return;

        // Add annotations for each field
        for (const [fieldName, fieldData] of Object.entries(this.field_centers)) {
            // Create annotation using the calculated camera position
            const annotation = new Potree.Annotation({
                position: fieldData.center,
                cameraPosition: fieldData.camera_position,
                cameraTarget: fieldData.center,
                title: fieldName,
                description: null
            });
            
            annotation.addEventListener('click', () => {
                this.handleAnnotationClick(fieldName);
            });

            // Add annotation to the scene
            window.viewer.viewer.scene.annotations.add(annotation);
        }

        // Set up the update loop for annotation opacities
        const updateLoop = () => {
            this.updateAnnotationOpacities();
            requestAnimationFrame(updateLoop);
        };
        updateLoop();
    }
} 