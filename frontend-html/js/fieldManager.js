import { getColor, hslToRgb, hslToHex } from './utils.js';
import {STLLoader} from "/libs/three.js/loaders/STLLoader.js";
import * as THREE from "/libs/three.js/build/three.module.js";
import * as threeBvhCsg from "/libs/three-bvh-csg.js";

THREE.Cache.enabled = true;

const MESH_VERSION = "2.0";
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
        this.useIndependentCloud = false; // New flag to track which version to use

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

            this.setActive(true);

            callback(true);
        } else {
            this.$legendItem.data('expanded', false);

            this.setActive(false);

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

        // Create container for name and toggle
        const $container = $("<div class='legend-item-container' style='display: flex; align-items: center;'>");
        
        // Add field name
        const $name = $("<span class='field-name'>").html(this.name);
        $container.append($name);
        // Add toggle icon
        if (this.manager.allowIndependentClouds) {
            const $toggle = $(`<svg class="embedding-toggle" width="16" height="16" viewBox="0 0 24 24" style="margin-left: 8px; cursor: pointer;">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>`);
        
            $toggle.attr('title', 'Switch to Independent Embedding');
            
            // Add click handler for toggle
            $toggle.click((e) => {
                e.stopPropagation(); // Prevent legend item expansion
                
                // Only allow toggling if independent clouds are enabled
                this.useIndependentCloud = !this.useIndependentCloud;
                
                // Update icon appearance
                if (this.useIndependentCloud) {
                    $toggle.find('path').attr('d', 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z');
                    $toggle.attr('title', 'Switch to Global Embedding');
                } else {
                    $toggle.find('path').attr('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z');
                    $toggle.attr('title', 'Switch to Independent Embedding');
                }
                
                // If field is currently active, reload with new embedding
                if (this.isActive) {
                    this.manager.loadFieldPointCloud(this.name, (pc) => {
                        // Update point cloud
                        this.pointCloud = pc;
                        this.pointCloud.visible = true;
                    });
                };
                
            });

            $container.append($toggle);
        }

        $s.append($container);

        this.$legendItem = $s;
        $s.click(() => this.toggleLegendItem(undefined, (state) => {
            if (state) {
                this.manager.applyFilter(this.name);
            } else {
                this.manager.setActiveField(null);
                this.manager.topLevelFilter = null;
                window.main_pc.visible = true;
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
 * Class to manage a constellation (single field or intersection of fields)
 * @class
 */
class Constellation {
    /**
     * Creates a new Constellation instance
     * @param {FieldManager} manager - The field manager instance
     * @param {Object} options - Configuration options
     * @param {string} options.name - The name of the constellation
     * @param {THREE.Mesh} options.mesh - The mesh for this constellation
     * @param {Array} options.color - RGB color array
     * @param {boolean} options.isPinned - Whether this is a pinned constellation
     * @param {Object} options.intersectionData - Data for intersection constellations
     */
    constructor(manager, options) {
        this.manager = manager;
        this.name = options.name;
        this.mesh = options.mesh;
        this.color = options.color;
        this.isPinned = options.isPinned || false;
        this.intersectionData = options.intersectionData || null;
        
        this.$legendItem = null;
        this.createLegendItem();
    }

    /**
     * Creates the legend item for this constellation
     */
    createLegendItem() {
        const $item = $(`<div class='legend_item' data-field-name="${this.name}">`);

        // Intersection elements (button and prompt)
        let $intersectElements = $(); // Empty jQuery set
        if (!this.intersectionData) {
            const $intersectBtn = $(`<svg class="icon intersect-icon intersect-init-button" width="16" height="16" viewBox="0 0 24 24">
                <circle cx="7" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="13" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7,12 a7,7 0 0,1 6,0 a7,7 0 0,0 -6,0" fill="currentColor" fill-opacity="0.4"/>
            </svg>`);
            const $intersectPrompt = $("<span class='intersect-prompt' style='display: none;'>Select field to intersect with</span>"); // Hidden prompt
            $intersectElements = $intersectElements.add($intersectBtn).add($intersectPrompt);
        }

        // Remove button
        const $r_link = $("<div class='link'>X</div>");

        const c_text = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;

        // Color swatch SVG
        const $svg = $(`<svg class="color-swatch-svg" height="25" width="25" style="stroke:${c_text}; stroke-width:2px; fill:${c_text}; cursor: pointer;">
            <polygon points="12.5,3 5,20 20,20" class="triangle" style="stroke: black; stroke-width: 1px;" />
        </svg>`);

        $item.append(
            $svg,
            $(`<span class='lab'>${this.name}</span>`)
        );

        if ($intersectElements.length > 0) {
            $item.append($intersectElements);
        }
        $item.append($r_link); // Append remove link last

        this.$legendItem = $item;
        return $item;
    }

    /**
     * Handles the intersection button click (Updates UI state)
     */
    handleIntersectionClick() {
        // If we're already in intersection mode, ignore
        if (this.manager.intersectionMode) return;

        // Enter intersection mode (manager state)
        this.manager.intersectionMode = {
            firstField: this.name,
            firstMesh: this.mesh,
            firstConstellation: this // Store reference to the first constellation
        };

        // Update UI for this specific item
        this.$legendItem.find('.intersect-init-button').hide();
        this.$legendItem.find('.intersect-prompt').show();
        this.$legendItem.addClass("intersect-origin"); // Mark this as the origin

        // Update global UI state (manager handles this visually)
        this.manager.updateIntersectionVisualState();
    }

    /**
     * Changes the color of this constellation
     */
    changeColor() {
        const newColor = this.manager.getRandomColor();
        const newColorText = `rgb(${newColor.rgb[0]},${newColor.rgb[1]},${newColor.rgb[2]})`;

        // Update SVG color using the class selector
        const $svg = this.$legendItem.find('.color-swatch-svg');
        $svg.attr('style', `stroke:${newColorText}; stroke-width:2px; fill:${newColorText}; cursor: pointer;`);
        $svg.find('polygon').attr('style', 'stroke: black; stroke-width: 1px;');

        // Update mesh color
        this.mesh.material.color.setHex(newColor.hex);
        this.color = newColor.rgb;

        // Only update annotation color if this is the currently selected field
        if (this.name === this.manager.selectedFieldName) {
            this.manager.updateAnnotationColor(this.name, newColorText);
        }
    }

    /**
     * Removes this constellation from the scene and legend
     */
    remove() {
        // Remove from constellations map
        this.manager.constellations.delete(this.name);
        
        // Always remove the mesh from the scene
        window.viewer.viewer.scene.scene.remove(this.mesh);
        
        if (this.isPinned) {
            // If pinned, remove the pin
            this.manager.pinnedConstellations.delete(this.name);
            // Update pin icon if visible
            $(`.annotation-buttons .pin-icon[data-field='${this.name}']`).removeClass('pinned');
        } else if (this.manager.selectedFieldName === this.name) {
             // If it was the currently selected (non-pinned) annotation, clear selection state
            this.manager.updateAnnotationColor(this.name, 'white');
            this.manager.selectedFieldName = null;
            this.manager.currentAnnotationConstellation = null; // Should already be null if not pinned, but belt-and-suspenders
        }
        
        // Remove legend item
        this.$legendItem.remove();
        
        // Check if this was the last constellation and restore brightness if so
        if (this.manager.constellations.size === 0 &&
            !this.manager.selectedFieldName &&
            !this.manager.currentAnnotationConstellation) {
            this.manager.resetSceneBrightness();
        }

        // If removing the first field during intersection mode, cancel it
        if (this.manager.intersectionMode && this.manager.intersectionMode.firstField === this.name) {
             this.manager.resetIntersectionMode();
        }
    }
}

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
        this.constellations = new Map(); // Store Constellation instances
        this.intersectionMode = null; // Store { firstField, firstMesh, firstConstellation }
        this.allowIndependentClouds = false; // Universal flag to control independent cloud switching
    }

    /**
     * Loads field data from JSON file
     * @returns {Promise} Promise that resolves when fields are loaded
     */
    loadFields() {
        return new Promise((resolve, reject) => {
            $.getJSON('/data/fields.json?v=' + MESH_VERSION, (data) => {
                this.fields = data.fields;
                this.top_level = data.top_level;
                this.subfield_colors = data.subfield_colors;
                this.subfields = data.subfields;
                this.field_orders = data.field_orders;
                this.field_centers = data.field_centers;
                
                // Store field classification and intersection data
                this.field_classifications = data.field_classifications || {};
                this.intersection_pairs = data.intersection_pairs || {};
                this.single_field_codes = data.single_field_codes || {};

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
                const matches = Object.keys(this.field_centers).filter(field => 
                    field.toLowerCase().includes(request.term.toLowerCase())
                );
                
                // Return only top 10 matches, sorted by lenth ascending
                matches.sort((a, b) => a.length - b.length);
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
        const fieldInstance = this.fieldInstances.get(S);
        const basePath = (this.allowIndependentClouds && fieldInstance.useIndependentCloud) ? 
            '/data/pointclouds_independent/' : 
            '/data/pointclouds/';

        console.log(basePath);
            
        window.viewer.loadPointCloud(`${basePath}${S}/metadata.json`, (pc) => {
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
     * Creates an intersection mesh from two input meshes
     * @param {THREE.Mesh} mesh1 - First mesh
     * @param {THREE.Mesh} mesh2 - Second mesh
     * @returns {THREE.Mesh} Intersection mesh
     */
    createIntersectionMesh(mesh1, mesh2) {
        try {
            // Validate inputs
            if (!mesh1 || !mesh2) {
                console.error('Invalid meshes provided:', { mesh1, mesh2 });
                throw new Error('Both meshes must be provided');
            }

            if (!mesh1.geometry || !mesh2.geometry) {
                console.error('Meshes must have geometry:', {
                    mesh1Geometry: mesh1.geometry,
                    mesh2Geometry: mesh2.geometry
                });
                throw new Error('Both meshes must have geometry');
            }

            // Add the missing getInterpolation method to THREE.Triangle if it doesn't exist
            if (!THREE.Triangle.getInterpolation) {
                THREE.Triangle.getInterpolation = function(point, p1, p2, p3, v1, v2, v3, target) {
                    // Basic barycentric interpolation
                    // Create temporary vectors
                    const _v0 = new THREE.Vector3();
                    const _v1 = new THREE.Vector3();
                    const _v2 = new THREE.Vector3();

                    // Calculate barycentric coordinates
                    _v0.subVectors(p3, p1);
                    _v1.subVectors(p2, p1);
                    _v2.subVectors(point, p1);

                    const d00 = _v0.dot(_v0);
                    const d01 = _v0.dot(_v1);
                    const d11 = _v1.dot(_v1);
                    const d20 = _v2.dot(_v0);
                    const d21 = _v2.dot(_v1);

                    const denom = d00 * d11 - d01 * d01;

                    // Calculate barycentric coordinates
                    const v = (d11 * d20 - d01 * d21) / denom;
                    const w = (d00 * d21 - d01 * d20) / denom;
                    const u = 1.0 - v - w;

                    // Interpolate values
                    if (target.isVector2) {
                        target.set(
                            u * v1.x + v * v2.x + w * v3.x,
                            u * v1.y + v * v2.y + w * v3.y
                        );
                    } else if (target.isVector3) {
                        target.set(
                            u * v1.x + v * v2.x + w * v3.x,
                            u * v1.y + v * v2.y + w * v3.y,
                            u * v1.z + v * v2.z + w * v3.z
                        );
                    }

                    return target;
                };
            }

            // Ensure all required attributes exist with proper formats
            const prepareGeometry = (mesh) => {
                const geometry = mesh.geometry;
                
                // Make sure the position attribute exists
                if (!geometry.attributes.position) {
                    throw new Error('Geometry must have position attribute');
                }
                
                // Make sure the normal attribute exists
                if (!geometry.attributes.normal) {
                    geometry.computeVertexNormals();
                }
                
                // Make sure the uv attribute exists
                if (!geometry.attributes.uv) {
                    const count = geometry.attributes.position.count;
                    const uvArray = new Float32Array(count * 2);
                    // Create simple UV mapping (just to make the attribute exist)
                    for (let i = 0; i < count; i++) {
                        const x = geometry.attributes.position.getX(i);
                        const y = geometry.attributes.position.getY(i);
                        // Map position.xy to uv coordinates (simple projection)
                        uvArray[i * 2] = (x + 1) / 2;      // Map -1 to 1 range to 0 to 1
                        uvArray[i * 2 + 1] = (y + 1) / 2;  // Map -1 to 1 range to 0 to 1
                    }
                    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
                }
                
                // Ensure geometry is indexed
                if (!geometry.index) {
                    const count = geometry.attributes.position.count;
                    const indices = new Uint32Array(count);
                    for (let i = 0; i < count; i++) {
                        indices[i] = i;
                    }
                    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
                }
                
                return geometry;
            };
            
            // Prepare both geometries
            prepareGeometry(mesh1);
            prepareGeometry(mesh2);
            
            try {
                // Create evaluator
                const evaluator = new threeBvhCsg.Evaluator();
                
                // Create brushes from prepared geometries
                const brush1 = new threeBvhCsg.Brush(mesh1.geometry.clone(), mesh1.material);
                const brush2 = new threeBvhCsg.Brush(mesh2.geometry.clone(), mesh2.material);
                
                // Copy transformation matrices
                brush1.matrix.copy(mesh1.matrix);
                brush2.matrix.copy(mesh2.matrix);
                
                // Update matrix world
                brush1.updateMatrixWorld();
                brush2.updateMatrixWorld();
                
                // Perform intersection
                const result = evaluator.evaluate(brush1, brush2, threeBvhCsg.INTERSECTION);
                
                if (!result) {
                    console.error('Intersection operation returned null');
                    throw new Error('Intersection operation failed');
                }
                
                // Debug intersection geometry
                if (result.geometry) {
                    // Calculate volume information if possible
                    if (result.geometry.attributes.position && result.geometry.index) {
                        const positions = result.geometry.attributes.position.array;
                        let minX = Infinity, maxX = -Infinity;
                        let minY = Infinity, maxY = -Infinity;
                        let minZ = Infinity, maxZ = -Infinity;
                        
                        for (let i = 0; i < positions.length; i += 3) {
                            const x = positions[i];
                            const y = positions[i + 1];
                            const z = positions[i + 2];
                            
                            minX = Math.min(minX, x);
                            maxX = Math.max(maxX, x);
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                            minZ = Math.min(minZ, z);
                            maxZ = Math.max(maxZ, z);
                        }
                        
                    }
                } else {
                    console.log('No geometry in result');
                }
                
                // Create material for the intersection
                const material = new THREE.MeshBasicMaterial({
                    color: 0xFFFFFF, // White base color
                    wireframe: false, // Solid instead of wireframe
                    transparent: true,
                    opacity: 0.4, // More transparent
                    side: THREE.DoubleSide // Render both sides
                });
                
                // Apply material to the result
                result.material = material;
                
                // Make sure the scale is 100
                result.scale.set(100, 100, 100);
                
                return result;
            } catch (error) {
                console.error('Error creating intersection mesh:', error);
                // Return a fallback mesh if intersection fails
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshBasicMaterial({
                    color: 0xFFFFFF,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.4
                });
                return new THREE.Mesh(geometry, material);
            }
        } catch (error) {
            console.error('Error creating intersection mesh:', error);
            // Return a fallback mesh if intersection fails
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                wireframe: true,
                transparent: true,
                opacity: 0.4
            });
            return new THREE.Mesh(geometry, material);
        }
    }

    /**
     * Creates an intersection constellation from two constellations
     * @param {Constellation} constellation1 - First constellation
     * @param {Constellation} constellation2 - Second constellation
     */
    createIntersectionConstellation(constellation1, constellation2) {
        // Check if this intersection already exists
        const intersectionName = `${constellation1.name} ∩ ${constellation2.name}`;
        const reverseName = `${constellation2.name} ∩ ${constellation1.name}`;
        
        if (this.constellations.has(intersectionName) || this.constellations.has(reverseName)) {
            console.log('Intersection already exists:', intersectionName);
            return; // Avoid creating duplicates
        }
        
        console.log(`Creating intersection: ${intersectionName}`); // Debug log

        // Create intersection mesh
        const intersectionMesh = this.createIntersectionMesh(
            constellation1.mesh,
            constellation2.mesh
        );
        
        if (!intersectionMesh) {
            console.error("Intersection mesh creation failed.");
            // Optionally provide user feedback here
            return;
        }
        
        // Add to scene
        window.viewer.viewer.scene.scene.add(intersectionMesh);
        
        // Create intersection constellation
        const intersectionInfo = {
            name: intersectionName,
            mesh: intersectionMesh,
            color: this.getRandomColor().rgb, // Use getRandomColor() for consistency
            intersectionData: {
                field1: constellation1.name,
                field2: constellation2.name,
                originalMeshes: [constellation1.mesh, constellation2.mesh]
            }
        };
        
        const intersectionConstellation = this.createConstellation(intersectionInfo);
        $("#const_legend").append(intersectionConstellation.$legendItem); // Append the new item
    }

    /**
     * Sets up event listeners for the constellation legend using delegation.
     */
    setupConstellationInteractions() {
        const $constLegend = $("#const_legend");

        $constLegend.on('click', (e) => {
            const $target = $(e.target);
            const $legendItem = $target.closest('.legend_item');

            if (!$legendItem.length) return; // Clicked outside a legend item

            const fieldName = $legendItem.data('field-name');
            const constellation = this.getConstellationByName(fieldName);

            if (!constellation) {
                console.warn("Constellation not found for item:", fieldName);
                return;
            }

            // Handle Intersection Initiation
            if ($target.closest('.intersect-init-button').length) {
                constellation.handleIntersectionClick();
            }
            // Handle Intersection Selection
            else if ($legendItem.hasClass('highlight')) { // Check if clicking a highlighted item
                 if (this.intersectionMode && fieldName !== this.intersectionMode.firstField) {
                     const secondConstellation = constellation; // The clicked one is the second
                     const firstConstellation = this.intersectionMode.firstConstellation;

                     if (firstConstellation && secondConstellation) {
                         this.createIntersectionConstellation(firstConstellation, secondConstellation);
                     }
                     this.resetIntersectionMode();
                 } else if (this.intersectionMode && fieldName === this.intersectionMode.firstField) {
                     // Clicking the originating field cancels intersection mode
                     this.resetIntersectionMode();
                 }
            }
            // Handle Remove Click
            else if ($target.closest('.link').length) {
                 constellation.remove();
                 // Note: remove() handles cancelling intersection if needed
            }
            // Handle Color Change Click
            else if ($target.closest('.color-swatch-svg').length) {
                 constellation.changeColor();
            }
        });

         // Add hover effects using delegation if desired (optional)
        $constLegend.on('mouseenter', '.legend_item.highlight', function() {
            $(this).addClass('hover');
        });
        $constLegend.on('mouseleave', '.legend_item.highlight', function() {
            $(this).removeClass('hover');
        });
    }

    /**
      * Updates the visual state of legend items during intersection mode.
      */
    updateIntersectionVisualState() {
        if (!this.intersectionMode) return; // Should not happen, but safety first

        const firstItemName = this.intersectionMode.firstField;
        const $constLegend = $("#const_legend");

        $constLegend.find(".legend_item").each((_, item) => {
             const $item = $(item);
             const itemName = $item.data('field-name');
             const constellation = this.getConstellationByName(itemName);

             // Skip intersection constellations or the origin item for highlighting
             if (constellation && !constellation.intersectionData && itemName !== firstItemName) {
                 $item.addClass("intersectable highlight");
                 $item.find(".intersect-init-button").hide(); // Hide other intersection buttons
             } else {
                 $item.removeClass("intersectable highlight");
                 if (itemName !== firstItemName) { // Ensure origin item's button remains hidden
                    $item.find(".intersect-init-button").show();
                    $item.find(".intersect-prompt").hide();
                 }
             }
         });
    }

    /**
     * Resets the intersection mode state
     */
    resetIntersectionMode() {
        const $constLegend = $("#const_legend");

        // Reset visual state for all items
        $constLegend.find(".legend_item").removeClass("intersectable highlight hover intersect-origin");
        $constLegend.find(".intersect-init-button").show();
        $constLegend.find(".intersect-prompt").hide();

        this.intersectionMode = null; // Clear the state
    }

    /**
     * Sets up constellation add functionality
     */
    setupConstellationAdd() {
        $("#constellations-tab #field_add").click(() => {
            const field = $("#field_lookup").val();
            this.createFieldMesh(field, {
                isPinned: true,
                onLoad: (ret) => {
                    const constellation = this.createConstellation({
                        name: field,
                        mesh: ret.mesh,
                        color: ret.color,
                        isPinned: true
                    });
                    $("#const_legend").append(constellation.$legendItem);
                }
            });
        });
    }

    /**
     * Adjusts the brightness of the overall scene by modifying EDL opacity
     */
    adjustSceneBrightness() {  // Renamed from dimOverallScene
        const X = {op: window.viewer.viewer.edlOpacity};
        new TWEEN.Tween(X)
            .to({op: 0.7}, 500)
            .onUpdate(() => {
                window.viewer.viewer.setEDLOpacity(X.op);
            })
            .start();
    }

    /**
     * Restores the scene brightness by setting EDL opacity back to 1.0
     */
    resetSceneBrightness() {
        const X = {op: window.viewer.viewer.edlOpacity};
        new TWEEN.Tween(X)
            .to({op: 1.0}, 500)
            .onUpdate(() => {
                window.viewer.viewer.setEDLOpacity(X.op);
            })
            .start();
    }

    /**
     * Creates and loads a 3D mesh for a field
     * @param {string} fieldName - The field name to load
     * @param {Object} options - Configuration options
     * @param {Object} options.color - Color object with rgb and hex values
     * @param {boolean} options.isPinned - Whether this is a pinned constellation
     * @param {Function} options.onLoad - Callback when mesh is loaded
     * @param {Function} options.onError - Callback when loading fails
     * @returns {Object} Object containing the mesh and color info
     */
    createFieldMesh(fieldName, options = {}) {
        const {
            color = this.getRandomColor(),
            isPinned = false,
            onLoad = () => {},
            onError = (error) => console.error('Error loading field mesh:', error)
        } = options;

        const material = new THREE.MeshBasicMaterial({
            color: color.hex,
            wireframe: true,
            wireframeLinewidth: isPinned ? 8 : 10,
            transparent: true,
            opacity: isPinned ? 1.0 : 0.8
        });

        const loader = new STLLoader();
        loader.load(
            `/data/field_meshes/${fieldName}.stl?v=${MESH_VERSION}`,
            (geometry) => {
                const mesh = new THREE.Mesh(geometry, material);
                mesh.scale.set(100, 100, 100);
                window.viewer.viewer.scene.scene.add(mesh);
                
                const ret = {
                    mesh: mesh,
                    color: color.rgb,
                    name: fieldName
                };
                
                this.adjustSceneBrightness();
                
                onLoad(ret);
            },
            undefined,
            onError
        );
    }

    /**
     * Visualizes a field by loading and displaying its 3D mesh
     * @param {string} which - The field name to visualize
     * @param {Function} callback - Callback function when visualization is complete
     */
    visualizeFieldMesh(which, callback, color) {
        this.createFieldMesh(which, {
            color: color,
            isPinned: true,
            onLoad: callback
        });
    }

    /**
     * Updates the color of an annotation
     * @param {string} fieldName - The field name
     * @param {string} color - The new color
     */
    updateAnnotationColor(fieldName, color) {
        // Find the annotation for this field and update its color
        // Only update if this is the currently selected field name
        if (fieldName === this.selectedFieldName) {
            window.viewer.viewer.scene.annotations.children.forEach(annotation => {
                if (annotation.title === fieldName) {
                    annotation.domElement.find('.annotation-label').css('color', color);
                }
            });
        }
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
    applyFilter(topField_or_subfield, subfield_or_null, callback) {
        callback = callback || (() => {});

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

            callback();
        });
    }

    /**
     * Handles click events on annotations
     * @param {string} fieldName - The field name
     */
    handleAnnotationClick(fieldName, fieldData) {
        // If clicking the same field again, deselect it
        if (this.selectedFieldName === fieldName) {
            // Find the constellation associated with the annotation click
            const constellationToRemove = this.getConstellationByName(fieldName);
            
            if (constellationToRemove) {
                // Only remove if not pinned
                if (!constellationToRemove.isPinned) {
                    constellationToRemove.remove(); // Use the constellation's remove method
                }
                // Note: The remove method handles resetting brightness if necessary
            }
            
            // Reset annotation color to white and clear selected state
            window.viewer.viewer.scene.annotations.children.forEach(annotation => {
                if (annotation.title === fieldName) {
                    annotation.domElement.removeClass('selected-annotation');
                    annotation.domElement.find('.annotation-label').css('color', 'white');
                }
            });
            
            this.selectedFieldName = null;
            this.currentAnnotationConstellation = null; // Ensure this is cleared
            
            // Remove buttons from all annotations
            $('.annotation-buttons').remove();
            return;
        }

        // Otherwise, we need to move the camera
        let {endTarget, endPosition} = fieldData;
        
        endTarget = new THREE.Vector3().fromArray(endTarget);
        endPosition = new THREE.Vector3().fromArray(endPosition);

        let scene = window.viewer.viewer.scene;
        Potree.Utils.moveTo(scene, endPosition, endTarget);

        // And once that 500ms tween is done, we need to update lookAt
        setTimeout(() => {
            window.viewer.viewer.scene.view.lookAt(endTarget.x, endTarget.y, endTarget.z);
        }, 500);

        // Store the current timestamp
        const clickTime = Date.now();
        this.lastClickTime = clickTime;

        // Reset previous selection's color and remove class
        if (this.selectedFieldName) {
            window.viewer.viewer.scene.annotations.children.forEach(annotation => {
                if (annotation.title === this.selectedFieldName) {
                    annotation.domElement.removeClass('selected-annotation');
                    annotation.domElement.find('.annotation-label').css('color', 'white');
                }
            });
            
            // Remove previous temporary constellation if it exists and is not pinned
            const previousConstellation = this.getConstellationByName(this.selectedFieldName);
            if (previousConstellation && !previousConstellation.isPinned) {
                previousConstellation.remove(); // Use the remove method here too
            }
            // No need to manually handle currentAnnotationConstellation, the remove() call does it
        }

        // Remove buttons from all annotations
        $('.annotation-buttons').remove();

        // Get a random color like constellations do
        const my_color = this.getRandomColor();

        // Update the selected field
        this.selectedFieldName = fieldName;

        // Set z-index to highest for the selected annotation and update its color
        window.viewer.viewer.scene.annotations.children.forEach(annotation => {
            if (annotation.title === fieldName) {
                annotation.domElement.addClass('selected-annotation');
                annotation.domElement.find('.annotation-label').css('color', `rgb(${my_color.rgb[0]},${my_color.rgb[1]},${my_color.rgb[2]})`);
                // Add buttons to this annotation
                this.addAnnotationButtons(annotation, fieldName, my_color);
            }
        });

        // If the field is already pinned, use the existing constellation
        if (this.pinnedConstellations.has(fieldName)) {
            const existingConstellation = this.getConstellationByName(fieldName);
            if (existingConstellation) {
                // Update the color if needed
                if (existingConstellation.color[0] !== my_color.rgb[0] || 
                    existingConstellation.color[1] !== my_color.rgb[1] || 
                    existingConstellation.color[2] !== my_color.rgb[2]) {
                    existingConstellation.color = my_color.rgb;
                    existingConstellation.mesh.material.color.setHex(my_color.hex);
                    const colorText = `rgb(${my_color.rgb[0]},${my_color.rgb[1]},${my_color.rgb[2]})`;
                    const $svg = existingConstellation.$legendItem.find('svg');
                    $svg.attr('style', `stroke:${colorText}; stroke-width:2px; fill:${colorText}; cursor: pointer;`);
                }
                return; // No need to create a new mesh
            }
        }

        // Create the mesh with the consolidated method for non-pinned fields
        this.createFieldMesh(fieldName, {
            color: my_color,
            onLoad: (ret) => {
                // Only proceed if this is still the most recent click
                if (clickTime === this.lastClickTime) {
                    // Check if a constellation for this field already exists (e.g., from pinning)
                    let constellation = this.getConstellationByName(fieldName);
                    
                    if (!constellation) {
                        // Create a new constellation if it doesn't exist
                        constellation = this.createConstellation({
                            name: fieldName,
                            mesh: ret.mesh,
                            color: ret.color
                        });
                        $("#const_legend").append(constellation.$legendItem);
                    } else {
                        // If it exists but the mesh is different (e.g., re-created), update it
                        if (constellation.mesh !== ret.mesh) {
                            window.viewer.viewer.scene.scene.remove(constellation.mesh); // Remove old mesh
                            constellation.mesh = ret.mesh;
                        }
                        // Ensure the legend item is visible if it was somehow hidden
                        if (!constellation.$legendItem.parent().length) {
                             $("#const_legend").append(constellation.$legendItem);
                        }
                    }
                    
                    // Store the mesh associated with the current annotation click
                    this.currentAnnotationConstellation = constellation.mesh; 
                }
            }
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
        
        // Add action buttons container
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
                this.applyFilter(
                    getFieldHierarchy.topField, 
                    getFieldHierarchy.subfield,
                    () => {
                        topField.expandLegendItem();

                        // we need to get rid of this annotation's constellation
                        if (this.currentAnnotationConstellation) {
                            window.viewer.viewer.scene.scene.remove(this.currentAnnotationConstellation);
                            this.currentAnnotationConstellation = null;
                        }

                        // and de-select this field
                        this.selectedFieldName = null;
                        this.updateAnnotationColor(fieldName, 'white');

                        // and remove buttons from all annotations
                        $('.annotation-buttons').remove();
                    }
                );
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
                // Check if we already have a constellation for this field
                const existingConstellation = this.getConstellationByName(fieldName);
                
                if (existingConstellation) {
                    // If we have an existing constellation, just update it to be pinned
                    existingConstellation.isPinned = true;
                    this.pinnedConstellations.set(fieldName, {
                        mesh: existingConstellation.mesh,
                        color: existingConstellation.color
                    });
                    $pinIcon.addClass('pinned');
                } else {
                    // If no existing constellation, create a new one
                    this.createFieldMesh(fieldName, {
                        color: color,
                        isPinned: true,
                        onLoad: (ret) => {        
                            // Create the constellation
                            const constellation = this.createConstellation({
                                name: fieldName,
                                mesh: ret.mesh,
                                color: ret.color,
                                isPinned: true
                            });
                            
                            // Add to pinned constellations
                            this.pinnedConstellations.set(fieldName, ret);
                            $pinIcon.addClass('pinned');
                            
                            // Add to legend if not already there
                            if (!$(`#const_legend .legend_item:has(span:contains('${fieldName}'))`).length) {
                                $("#const_legend").append(constellation.$legendItem);
                            }
                        }
                    });
                }
            } else {
                // Remove pinned constellation
                const constellation = this.getConstellationByName(fieldName);
                if (constellation) {
                    constellation.remove();
                }
                this.pinnedConstellations.delete(fieldName);
                $pinIcon.removeClass('pinned');
            }
        });
        
        $actionButtons.append($pinIcon);
        $label.after($actionButtons);
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
                cameraPosition: {x: null, y: null, z: null}, // didn't know you had to do this...
                cameraTarget: {x: null, y: null, z: null}, // didn't know you had to do this...
                title: fieldName,
                description: null
            });
            
            annotation.addEventListener('click', () => {
                this.handleAnnotationClick(fieldName, {
                    endPosition: fieldData.camera_position,
                    endTarget: fieldData.center
                });
            });

            // Add annotation to the scene
            window.viewer.viewer.scene.annotations.add(annotation);

            // Label the computer science field with an ID, so we can find it during the tour
            setTimeout(() => {
                if (fieldName === "Computer science") {
                    annotation.domElement[0].id = "annotation-computer-science";
                } else if (fieldName === "Machine learning") {
                    annotation.domElement[0].id = "annotation-machine-learning";
                }
            }, 0);
        }

        // Set up the update loop for annotation opacities
        const updateLoop = () => {
            this.updateAnnotationOpacities();
            requestAnimationFrame(updateLoop);
        };
        updateLoop();
    }

    /**
     * Gets a constellation by name
     * @param {string} name - The constellation name
     * @returns {Constellation|null} The constellation or null if not found
     */
    getConstellationByName(name) {
        return this.constellations.get(name);
    }

    /**
     * Creates a new constellation
     * @param {Object} options - Configuration options
     * @returns {Constellation} The created constellation
     */
    createConstellation(options) {
        // Remove any existing constellation with the same name
        const existing = this.constellations.get(options.name);
        if (existing) {
            existing.remove();
        }
        
        const constellation = new Constellation(this, options);
        this.constellations.set(options.name, constellation);
        return constellation;
    }
} 