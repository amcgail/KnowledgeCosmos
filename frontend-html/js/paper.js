import * as THREE from "/libs/three.js/build/three.module.js";
import { STLLoader } from "/libs/three.js/loaders/STLLoader.js";
import { getColor, hslToHex } from './utils.js';

// Cache for paper data
const paperCache = {};

function getPaperData(id, callback) {
    if (paperCache[id] || paperCache[id] === null) {
        callback(paperCache[id]);
        return;
    }

    $.ajax({
        "url": `https://api.semanticscholar.org/v1/paper/MAG:${id}`,
        "method": "GET",
        crossDomain: true,
        "success": function(resp) {
            if (resp.error) {
                paperCache[id] = null;
            } else {
                paperCache[id] = resp;
            }
            callback(paperCache[id]);
        }
    });
}

export class PaperManager {
    constructor(viewer) {
        this.viewer = viewer;
    }
    
    highlight(which, callback) {
        const ret = {};
        callback = callback || function() {};

        const c1 = getColor();
        const c2 = hslToHex.apply(null, c1);
        
        ret.color = c2;
        ret.name = which;
        
        const material = new THREE.MeshBasicMaterial({
            color: c2,
            wireframe: true,
            wireframeLinewidth: 10
        });

        const loader = new STLLoader();
        let mesh;
        
        loader.load(
            `/data/field_meshes/${which}.stl`,
            (geometry) => {
                mesh = new THREE.Mesh(geometry, material);
                mesh.scale.set(100, 100, 100);
                material.transparent = true;
                this.viewer.scene.scene.add(mesh);
                
                ret.mesh = mesh;
                
                this.permanentHighlight(mesh);
                callback(ret);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.error('Error loading STL:', error);
                callback(null);
            }
        );
    }

    permanentHighlight(mesh) {
        const X = { op: this.viewer.edlOpacity };
        new TWEEN.Tween(X)
            .to({ op: 0.8 }, 500)
            .onUpdate(() => {
                this.viewer.setEDLOpacity(X.op);
                mesh.material.opacity = 0.8;
            })
            .start();
    }

    showPaperCard(id) {
        $("#potree_render_area").css('left', '400px');
        $(".card").toggle(true);
        $(".card .loading-placeholders").show();
        $(".card>.title, .card>.meta, .card>.tags, .card>.content").hide();

        getPaperData(id, (resp) => {
            let link = '';
            if (resp && resp['doi']) {
                link = `<a target='_blank' href='https://doi.org/${resp["doi"]}'>Link to Publisher</a>`;
            }

            $(".card .loading-placeholders").hide();
            $(".card>.title, .card>.meta, .card>.tags, .card>.content").show();
            
            if (resp) {
                $(".card>.title").html(resp['title'] || 'No title available');
                $(".card>.meta").html(
                    `${resp['year'] || 'No year'} <br/>`
                    + `${resp['venue'] || 'No venue'} <br/>`
                    + `${(resp['authors'] || []).map((x) => x.name).join(', ') || 'No authors'} <br/>`
                    + `${link} <br/>`
                );
                $(".card>.content").html(resp['abstract'] || 'No abstract available');
                $(".card>.tags").html("");

                const fields = [...new Set((resp['s2FieldsOfStudy'] || []).map((x) => x.category))];
                for (const field of fields) {
                    $(".card>.tags").append(
                        $("<span class='tag'>").html(field)
                    );
                }
            } else {
                $(".card>.title").html('Paper not found');
                $(".card>.meta").html('');
                $(".card>.content").html('Could not load paper data');
                $(".card>.tags").html("");
            }
        });
    }

    hidePaperCard() {
        $("#paper_info").toggle(false);
        $(".card").toggle(false);
        $("#potree_render_area").css('left', '0');
    }
} 