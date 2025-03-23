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
        this.focalSphere = null;
        this.focalId = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        $(document).on('mousemove', (e) => {
            this.viewer.mouse = e.originalEvent;
        });
        
        $('canvas').on('mousedown', (e) => {
            if (e.originalEvent.button === 0) { // left-click only
                this.checkAndDisplay();
            }
        });
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

    killSphere() {
        if (this.focalSphere) {
            this.viewer.scene.scene.remove(this.focalSphere);
        }
        this.focalSphere = null;
        this.focalId = null;
    }

    checkAndDisplay() {
        if (!this.viewer.mouse) return;

        const e = this.viewer.mouse;
        let m = this.viewer.mouse;

        if ($(".card").is(":visible")) {
            m = new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window,
                screenX: e.screenX - 400,
                screenY: e.screenY,
                clientX: e.clientX - 400,
                clientY: e.clientY,
                pageX: e.pageX - 400,
                pageY: e.pageY,
                button: e.button,
                buttons: e.buttons,
                relatedTarget: e.relatedTarget,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                metaKey: e.metaKey,
            });
        }

        const I = Potree.Utils.getMousePointCloudIntersection(
            m,
            this.viewer.scene.getActiveCamera(),
            this.viewer,
            this.viewer.scene.pointclouds
        );

        if (I !== null) {
            const myi = I.point['mag_id'][0];
            if (this.focalId !== myi) {
                if (I.distance < 50) {
                    this.moveToPoint(I);
                    this.killSphere();
                    this.createFocalSphere(I);
                    this.showPaperCard(myi);
                } else {
                    this.killSphere();
                    this.hidePaperCard();
                }
            }
        } else {
            this.killSphere();
            this.hidePaperCard();
        }
    }

    moveToPoint(I) {
        const camera = this.viewer.scene.getActiveCamera();
        const currentDeltVector = camera.position.clone().sub(I.location);
        const direction = currentDeltVector.normalize();
        const delt = 8;
        
        const targetPosition = I.location.clone().add(direction.multiplyScalar(delt));
        const targetLookAt = I.location.clone();
        
        const startPosition = camera.position.clone();
        const startQuaternion = camera.quaternion.clone();

        const m = new THREE.Matrix4();
        const upsave = camera.up.clone();
        m.lookAt(targetPosition, targetLookAt, camera.up);

        const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(m);

        const duration = 2000;
        const tweenObj = { t: 0 };

        new TWEEN.Tween(tweenObj)
            .to({ t: 1 }, duration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                camera.position.lerpVectors(startPosition, targetPosition, tweenObj.t);
                THREE.Quaternion.slerp(startQuaternion, targetQuaternion, camera.quaternion, tweenObj.t);
                this.viewer.scene.view.position.set(camera.position.x, camera.position.y, camera.position.z);
            })
            .onComplete(() => {
                this.viewer.scene.view.position.set(camera.position.x, camera.position.y, camera.position.z);
                this.viewer.scene.view.lookAt(targetLookAt);
            })
            .start();
    }

    createFocalSphere(I) {
        const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
        const material = new THREE.MeshNormalMaterial();
        this.focalSphere = new THREE.Mesh(sphereGeometry, material);
        this.focalSphere.position.set(I.location.x, I.location.y, I.location.z);
        this.focalSphere.scale.set(0.15, 0.15, 0.15);
        this.focalSphere.frustumCulled = false;
        this.viewer.scene.scene.add(this.focalSphere);
        this.focalId = I.point['mag_id'][0];

        // Add animation to the sphere
        const animate = () => {
            if (this.focalSphere) {
                const time = performance.now() * 0.003;
                const k = 3;
                const vertices = this.focalSphere.geometry.vertices;
                
                for (let i = 0; i < vertices.length; i++) {
                    const p = vertices[i];
                    p.normalize().multiplyScalar(1 + 0.3 * noise.perlin3(p.x * k + time, p.y * k + time, p.z * k));
                }
                
                this.focalSphere.geometry.verticesNeedUpdate = true;
                this.focalSphere.geometry.computeVertexNormals();
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
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