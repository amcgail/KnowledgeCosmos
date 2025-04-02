import { getColor, hslToRgb, hslToHex } from './utils.js';
import {STLLoader} from "/libs/three.js/loaders/STLLoader.js";
import * as THREE from "/libs/three.js/build/three.module.js";

THREE.Cache.enabled = true;

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

export class FieldManager {
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
    }

    loadFields() {
        return new Promise((resolve, reject) => {
            $.getJSON('/data/fields.json', (data) => {
                this.fields = data.fields;
                this.top_level = data.top_level;
                this.subfield_colors = data.subfield_colors;
                this.subfields = data.subfields;
                this.field_orders = data.field_orders;
                this.field_centers = data.field_centers; // Store field centers
                resolve(data);
            }).fail(reject);
        });
    }

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

    setupLegend() {
        const $l = $("#legend");
        $l.html("");
        
        const top_fields = Object.keys(this.subfields).sort();
        
        for (const s of top_fields) {
            if (FIELDS_TO_FORGET.includes(s)) continue;

            const $myl = this.createLegendItem(s);
            this.subfield_links.push($myl);
            $l.append($myl);
        }
    }

    createLegendItem(S) {
        const $s = $("<span class='legend_item'>");
        $s.data('expanded', false);
        $s.html(S);

        var _this = this;

        $s.click(() => {
            $(".legend_expansion").remove();

            if (!$s.data('expanded')) {
                function success(S) {
                    const pc = _this.pointCloudCache.get(S);
                    
                    // Hide all other point clouds first
                    window.main_pc.visible = false;
                    for (const pc of _this.pointCloudCache.values()) {
                        if (pc.name !== S) {
                            pc.visible = false;
                        }
                    }

                    pc.visible = true;
                    $('.loading').fadeOut(200);
                }

                // Check if point cloud is already cached
                if (_this.pointCloudCache.has(S)) {
                    success(S);
                } else {
                    // Load and cache the point cloud
                    $('.loading').show();
                    this.loadFieldPointCloud(S, (pc) => {
                        _this.pointCloudCache.set(S, pc);
                        success(S);
                    });
                }

                const $ls = this.createLegendExpansion(S);
                $ls.insertAfter($s);
                $(".legend_item").data('expanded', false);
                $s.data('expanded', true);
            } else {
                // Show main point cloud and hide all cached ones
                window.main_pc.visible = true;
                for (const pc of this.pointCloudCache.values()) {
                    pc.visible = false;
                }
                $s.data('expanded', false);
            }
        });

        return $s;
    }

    createLegendExpansion(S) {
        const $ls = $("<div class='legend_expansion'>");

        const subfields = this.field_orders[S];

        // add the other ones
        for (const sub of this.subfields[S]) {
            if (subfields.includes(sub)) continue;
            subfields.push(sub);
        }
        
        for (const sub of subfields) {
            const c = this.subfield_colors[S][sub];
            const rgb = `${c[0]*256}, ${c[1]*256}, ${c[2]*256}`;
            
            $ls.append(
                $(`<div class='swatch' style='background-color:rgb(${rgb})'>`),
                $("<div class='label'>").html(sub),
                $("<br>")
            );
        }

        $ls.append(
            $(`<div class='swatch' style='background-color:rgb(50, 50, 50)'>`),
            $("<div class='label'>").html('Other'),
            $("<br>")
        );

        return $ls;
    }

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

    setupConstellationAdd() {
        $("#constellations-tab #field_add").click(() => {
            const field = $("#field_lookup").val();
            this.highlightField(field, (ret) => {
                const c = ret.color;
                
                const $item = $("<div class='legend_item'>");
                
                const $r_link = $("<div class='link'>remove</div>").click(() => {
                    window.viewer.viewer.scene.scene.remove(ret.mesh);
                    $item.remove();
                });

                const c_text = `rgb(${c[0]},${c[1]},${c[2]})`;
                
                $item.append(
                    $(`<svg height="25" width="25" style="stroke:${c_text}; stroke-width:2px; fill:${c_text};">
                        <polygon points="12.5,3 5,20 20,20" class="triangle" />
                    </svg>`),
                    $(`<span class='lab'>${ret.name}</span>`),
                    $r_link
                );
                
                $("#const_legend").append($item);
            });
        });
    }

    highlightField(which, callback) {
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
                
                this.dimOverallScene();
                callback(ret);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.log(error);
            }
        );
    }

    handleAnnotationClick(fieldName) {
        // If clicking the same field again, deselect it
        if (this.selectedFieldName === fieldName) {
            if (this.currentAnnotationConstellation) {
                window.viewer.viewer.scene.scene.remove(this.currentAnnotationConstellation);
                this.currentAnnotationConstellation = null;
            }
            this.updateAnnotationColor(fieldName, 'white'); // Reset color
            this.selectedFieldName = null;
            // Remove from constellations legend if exists
            $(`#const_legend .legend_item:has(span:contains('${fieldName}'))`).remove();
            return;
        }

        // Reset previous selection's color if exists
        if (this.selectedFieldName) {
            this.updateAnnotationColor(this.selectedFieldName, 'white');
            // Remove previous field from constellations legend if exists
            $(`#const_legend .legend_item:has(span:contains('${this.selectedFieldName}'))`).remove();
        }

        // Remove previous annotation constellation if it exists
        if (this.currentAnnotationConstellation) {
            window.viewer.viewer.scene.scene.remove(this.currentAnnotationConstellation);
            this.currentAnnotationConstellation = null;
        }

        // Get a random color like constellations do
        const my_color = this.getRandomColor();

        // Update the selected field and its color
        this.selectedFieldName = fieldName;
        this.updateAnnotationColor(fieldName, `rgb(${my_color.rgb[0]},${my_color.rgb[1]},${my_color.rgb[2]})`);

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
                const mesh = new THREE.Mesh(geometry, material);
                mesh.scale.set(100, 100, 100);
                window.viewer.viewer.scene.scene.add(mesh);
                this.currentAnnotationConstellation = mesh;
                this.dimOverallScene();  // Add the scene dimming effect

                // Add to constellations legend
                const $item = $("<div class='legend_item'>");
                const $r_link = $("<div class='link'>remove</div>").click(() => {
                    window.viewer.viewer.scene.scene.remove(mesh);
                    this.updateAnnotationColor(fieldName, 'white');
                    this.selectedFieldName = null;
                    this.currentAnnotationConstellation = null;
                    $item.remove();
                });

                const c_text = `rgb(${my_color.rgb[0]},${my_color.rgb[1]},${my_color.rgb[2]})`;
                
                $item.append(
                    $(`<svg height="25" width="25" style="stroke:${c_text}; stroke-width:2px; fill:${c_text};">
                        <polygon points="12.5,3 5,20 20,20" class="triangle" />
                    </svg>`),
                    $(`<span class='lab'>${fieldName}</span>`),
                    $r_link
                );
                
                $("#const_legend").append($item);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.error('Error loading field mesh:', error);
            }
        );

        window.viewer.renderer.domElement.focus();
    }

    updateAnnotationColor(fieldName, color) {
        // Find the annotation for this field and update its color
        window.viewer.viewer.scene.annotations.children.forEach(annotation => {
            if (annotation.title === fieldName) {
                annotation.domElement.find('.annotation-label').css('color', color);
            }
        });
    }

    getRandomColor() {
        const [h, s, l] = getColor();
        return {
            'hsl': [h, s, l],
            'rgb': hslToRgb(h, s, l),
            'hex': hslToHex(h, s, l)
        }
    }

    dimOverallScene() {  // Renamed from permanentHighlight
        const X = {op: window.viewer.viewer.edlOpacity};
        new TWEEN.Tween(X)
            .to({op: 0.8}, 500)
            .onUpdate(() => {
                window.viewer.viewer.setEDLOpacity(X.op);
            })
            .start();
    }

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
            const distance = dot < 0 ? 100000 : cameraPosition.distanceTo(annotation.position);
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
                    'display': 'none',
                    'pointer-events': 'none'
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
                    'display': 'none',
                    'pointer-events': 'none'
                });
                return;
            }
            
            if (isCentralField) {
                if (distance > centralMaxDistance) {
                    // Hide central fields at extreme distances
                    $element.css({
                        'display': 'none',
                        'pointer-events': 'none'
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
                    'pointer-events': 'auto',
                    'transform': `translate(-50%, -30px) scale(${scale})`
                });
            } else if (annotation.title === this.selectedFieldName) {
                // Selected node is always fully visible (if in front of camera)
                $element.css({
                    'opacity': '1.0',
                    'display': 'block',
                    'pointer-events': 'auto',
                    'transform': `translate(-50%, -30px) scale(${scale})`
                });
            } else if (distance > maxDistance) {
                // Hide non-central fields at regular max distance
                $element.css({
                    'display': 'none',
                    'pointer-events': 'none'
                });
            } else if (index < fullyVisibleCount) {
                // First 5 annotations are fully visible
                $element.css({
                    'opacity': '1.0',
                    'display': 'block',
                    'pointer-events': 'auto',
                    'transform': `translate(-50%, -30px) scale(${scale})`
                });
            } else if (index < totalVisibleCount) {
                // Next 15 annotations fade out linearly
                const fadeProgress = (index - fullyVisibleCount) / partiallyVisibleCount;
                const opacity = 0.8 * (1 - fadeProgress); // Start fading from 0.8 opacity
                $element.css({
                    'opacity': opacity.toFixed(2),
                    'display': 'block',
                    'pointer-events': 'auto',
                    'transform': `translate(-50%, -30px) scale(${scale})`
                });
            } else {
                // Rest are hidden and non-interactive
                $element.css({
                    'display': 'none',
                    'pointer-events': 'none'
                });
            }
        });
    }

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