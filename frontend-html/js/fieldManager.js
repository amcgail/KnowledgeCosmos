import { getColor, hslToRgb, hslToHex } from './utils.js';
import {STLLoader} from "/libs/three.js/loaders/STLLoader.js";
import * as THREE from "/libs/three.js/build/three.module.js";

export class FieldManager {
    constructor() {
        this.fields = null;
        this.subfield_colors = null;
        this.subfields = null;
        this.subfield_links = [];
        this.pointCloudCache = new Map(); // Cache for loaded point clouds
    }

    loadFields() {
        return new Promise((resolve, reject) => {
            $.getJSON('/data/fields.json', (data) => {
                this.fields = data.top_level;
                this.subfield_colors = data.subfield_colors;
                this.subfields = data.subfields;
                resolve(data);
            }).fail(reject);
        });
    }

    setupFieldAutocomplete() {
        $("#constellation #field_lookup").autocomplete({
            source: this.fields
        });
    }

    setupLegend() {
        const $l = $("#legend");
        $l.html("");
        
        const top_fields = Object.keys(this.subfields).sort();
        
        for (const s of top_fields) {
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
        
        for (const sub of this.subfields[S]) {
            const c = this.subfield_colors[S][sub];
            const rgb = `${c[0]*256}, ${c[1]*256}, ${c[2]*256}`;
            
            $ls.append(
                $(`<div class='swatch' style='background-color:rgb(${rgb})'>`),
                $("<div class='label'>").html(sub),
                $("<br>")
            );
        }

        $ls.append(
            $(`<div class='swatch' style='background-color:rgb(255,255,255)'>`),
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
        $("#constellation #field_add").click(() => {
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
                
                this.permanentHighlight(mesh, material);
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

    getRandomColor() {
        const [h, s, l] = getColor();
        return {
            'hsl': [h, s, l],
            'rgb': hslToRgb(h, s, l),
            'hex': hslToHex(h, s, l)
        }
    }

    permanentHighlight(mesh, material) {
        const X = {op: window.viewer.viewer.edlOpacity};
        new TWEEN.Tween(X)
            .to({op: 0.8}, 500)
            .onUpdate(() => {
                window.viewer.viewer.setEDLOpacity(X.op);
                material.opacity = 0.8;
            })
            .start();
    }
} 