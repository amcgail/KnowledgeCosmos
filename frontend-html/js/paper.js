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
        this.camera = viewer.scene.getActiveCamera();
        
        // Create a camera light
        this.cameraLight = new THREE.PointLight(0xffffff, 0.2, 100);
        this.cameraLight.position.set(0, 0, 0);
        this.viewer.scene.scene.add(this.cameraLight);
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
            this.camera,
            this.viewer,
            this.viewer.scene.pointclouds
        );

        if (I !== null) {
            const myi = I.point['mag_id'][0];
            if (this.viewer.focal_i !== myi) {
                if (I.distance < 50) {
                    this.handlePointSelection(I);
                    window.paperManager.showPaperCard(myi);
                } else {
                    this.resetSelection();
                    window.paperManager.hidePaperCard();
                }
            }
        } else {
            this.resetSelection();
            window.paperManager.hidePaperCard();
        }
    }

    handlePointSelection(I) {
        const currentDeltVector = this.camera.position.clone().sub(I.location);
        const direction = currentDeltVector.normalize();
        const delt = 8;
        
        const targetPosition = I.location.clone().add(direction.multiplyScalar(delt));
        const targetLookAt = I.location.clone();
        
        const startPosition = this.camera.position.clone();
        const startQuaternion = this.camera.quaternion.clone();

        const m = new THREE.Matrix4();
        const upsave = this.camera.up.clone();
        m.lookAt(targetPosition, targetLookAt, this.camera.up);

        const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(m);

        const duration = 2000;
        const tweenObj = { t: 0 };

        new TWEEN.Tween(tweenObj)
            .to({ t: 1 }, duration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.camera.position.lerpVectors(startPosition, targetPosition, tweenObj.t);
                THREE.Quaternion.slerp(startQuaternion, targetQuaternion, this.camera.quaternion, tweenObj.t);
                this.viewer.scene.view.position.set(
                    this.camera.position.x,
                    this.camera.position.y,
                    this.camera.position.z
                );
            })
            .onComplete(() => {
                this.viewer.scene.view.lookAt(targetLookAt);
                this.camera.quaternion.copy(targetQuaternion);
            })
            .start();

        this.resetFocalSphere();
        this.createFocalSphere(I);
    }

    resetFocalSphere() {
        if (this.viewer.focal_sphere) {
            this.viewer.scene.scene.remove(this.viewer.focal_sphere);
        }
        this.viewer.focal_sphere = null;
        this.viewer.focal_i = null;
    }

    createFocalSphere(I) {
        const sphere_geometry = new THREE.SphereGeometry(1, 128, 128);
        // Get the point's color from the rgba attribute and make it brighter
        const color = new THREE.Color();
        
        color.setRGB(
            I.point['rgba'][0] / 255,
            I.point['rgba'][1] / 255,
            I.point['rgba'][2] / 255
        );
        // Make the color more vibrant
        color.multiplyScalar(1.2);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            transparent: false,
            opacity: 1.0,
            shininess: 5
        });
        this.viewer.focal_sphere = new THREE.Mesh(sphere_geometry, material);
        this.viewer.focal_sphere.position.set(I.location.x, I.location.y, I.location.z);
        this.viewer.focal_sphere.scale.set(0, 0, 0); // Start at scale 0
        this.viewer.focal_sphere.frustumCulled = false;
        this.viewer.scene.scene.add(this.viewer.focal_sphere);
        this.viewer.focal_i = I.point['mag_id'][0];

        // Add growth animation
        const startTime = performance.now();
        const growAnimation = () => {
            const elapsed = performance.now() - startTime;
            const duration = 1000; // 1 second
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const scale = 0.5 * easeOutCubic;
            
            this.viewer.focal_sphere.scale.set(scale, scale, scale);
            
            if (progress < 1) {
                requestAnimationFrame(growAnimation);
            }
        };
        
        growAnimation();

        // Add wobble animation
        const animate = () => {
            if (this.viewer.focal_sphere) {
                const time = performance.now() * 0.0005; // a very slow wobble :)
                const k = 3;
                const vertices = this.viewer.focal_sphere.geometry.vertices;
                
                for (let i = 0; i < vertices.length; i++) {
                    const p = vertices[i];
                    p.normalize().multiplyScalar(1 + 0.3 * noise.perlin3(p.x * k + time, p.y * k + time, p.z * k));
                }
                
                this.viewer.focal_sphere.geometry.verticesNeedUpdate = true;
                this.viewer.focal_sphere.geometry.computeVertexNormals();

                // Update camera light position
                this.cameraLight.position.copy(this.camera.position);
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    resetSelection() {
        this.resetFocalSphere();
        $("#paper_info").toggle(false);
        $(".card").toggle(false);
        $("#potree_render_area").css('left', '0');
    }
} 