import * as THREE from "/libs/three.js/build/three.module.js";
import { getScreenPosition } from './utils.js';

export class Controls {
    constructor(viewer) {
        this.viewer = viewer;
        this.camera = viewer.scene.getActiveCamera();
        this.animation = null;
        this.multiplier = 1;
        this.setupEventListeners();
        this.setupRectangleSelection();
    }

    setupEventListeners() {
        // Speed boost with spacebar
        $(document).on('keypress', (e) => {
            if (e.originalEvent.charCode === 32) { // spacebar
                this.multiplier *= 3;
                setTimeout(() => {
                    this.multiplier /= 3;
                }, 1000);
            }
        });

        // Dynamic speed adjustment
        setInterval(() => this.updateSpeed(), 100);

        // Mouse move tracking
        $(document).on('mousemove', (e) => {
            this.viewer.mouse = e.originalEvent;
        });

        // Mouse click handling
        $('canvas').on('mousedown', (e) => {
            if (e.originalEvent.button === 0) { // left-click only
                this.checkAndDisplay();
            }
        });
    }

    updateSpeed() {
        if (!window.main_pc) return;
        
        const distance = window.main_pc.boundingSphere.center.distanceTo(this.camera.position);
        const adjustedDistance = Math.max(0, distance - window.main_pc.boundingSphere.radius / 2);
        const speed = Math.min(30000, (3 + adjustedDistance / 2) * this.multiplier);
        
        this.viewer.setMoveSpeed(speed);
    }

    // Camera movement functions
    home() {
        const Y = {
            x: this.viewer.scene.view.position.x,
            y: this.viewer.scene.view.position.y,
            z: this.viewer.scene.view.position.z,
            lx: 730, ly: 691, lz: 725
        };

        const viewUpdate = () => {
            this.viewer.scene.view.position.set(Y.x, Y.y, Y.z);
            this.viewer.scene.view.lookAt(Y.lx, Y.ly, Y.lz);
        };

        this.animation = new TWEEN.Tween(Y)
            .to({ x: 1623, y: 1950, z: 1492 }, 1000)
            .onUpdate(viewUpdate)
            .start();
    }

    circle(delay = 5000) {
        const a = new THREE.Vector3(
            this.viewer.scene.view.position.x,
            this.viewer.scene.view.position.y,
            this.viewer.scene.view.position.z
        );

        const b = new THREE.Vector3(730, 691, 725);
        const d = new THREE.Vector3();
        this.camera.getWorldDirection(d);

        const c = b.clone().sub(a).projectOnVector(d);
        const e = a.clone().add(c);

        const X = { angle: 0, lk0: e.x, lk1: e.y, lk2: e.z };

        this.animation = new TWEEN.Tween(X)
            .to({
                angle: 2 * Math.PI,
                lk0: b.x, lk1: b.y, lk2: b.z
            }, delay)
            .onUpdate(() => {
                const curlit = a.clone().sub(b);
                curlit.applyAxisAngle(this.camera.up, X.angle);
                const result = b.clone().add(curlit);
                
                this.viewer.scene.view.position.set(result.x, result.y, result.z);
                this.viewer.scene.view.lookAt(730, 691, 725);
            })
            .start();
    }

    tour() {
        const a = new THREE.Vector3(
            this.viewer.scene.view.position.x,
            this.viewer.scene.view.position.y,
            this.viewer.scene.view.position.z
        );

        const b = new THREE.Vector3(400, 400, 200);
        const d = new THREE.Vector3();
        this.camera.getWorldDirection(d);

        const c = b.clone().sub(a).projectOnVector(d);
        const e = a.clone().add(c);

        const Y = {
            x: this.viewer.scene.view.position.x,
            y: this.viewer.scene.view.position.y,
            z: this.viewer.scene.view.position.z,
            lk0: e.x, lk1: e.y, lk2: e.z
        };

        const target = {
            x: 584, y: 866, z: 358,
            lk0: 400, lk1: 400, lk2: 200
        };

        const viewUpdate = () => {
            this.viewer.scene.view.position.set(Y.x, Y.y, Y.z);
            this.viewer.scene.view.lookAt(Y.lk0, Y.lk1, Y.lk2);
        };

        this.animation = new TWEEN.Tween(Y)
            .onUpdate(viewUpdate)
            .to(target, 1000)
            .start();
    }

    stop() {
        if (this.animation) {
            this.animation.stop();
            this.animation = null;
        }
    }

    // Rectangle selection functionality
    setupRectangleSelection() {
        const toolbarItems = document.querySelectorAll('.toolbar-item[data-selectable="true"]');
        let isRectSelectActive = false;
        let isDrawing = false;
        let startX, startY;
        const rect = document.createElement('div');
        rect.style.position = 'absolute';
        rect.style.border = '2px solid #00ff00';
        rect.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
        rect.style.display = 'none';
        rect.style.pointerEvents = 'none';
        rect.style.zIndex = '1000';
        document.body.appendChild(rect);

        toolbarItems.forEach(item => {
            item.addEventListener('click', () => {
                toolbarItems.forEach(i => i.classList.remove('selected'));
                item.classList.toggle('selected');
                
                if (item.id === 'rect-select') {
                    isRectSelectActive = item.classList.contains('selected');
                    if (!isRectSelectActive) {
                        rect.style.display = 'none';
                        this.viewer.fpControls.enabled = true;
                        this.viewer.orbitControls.enabled = true;
                    } else {
                        this.viewer.fpControls.enabled = false;
                        this.viewer.orbitControls.enabled = false;
                    }
                }
            });
        });

        // Mouse event handlers
        const mouseDownHandler = (e) => {
            if (!isRectSelectActive) return;
            
            isDrawing = true;
            startX = e.clientX;
            startY = e.clientY;
            
            rect.style.display = 'block';
            rect.style.left = startX + 'px';
            rect.style.top = startY + 'px';
            rect.style.width = '0';
            rect.style.height = '0';
        };

        const mouseMoveHandler = (e) => {
            if (!isDrawing) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            
            rect.style.width = width + 'px';
            rect.style.height = height + 'px';
            rect.style.left = left + 'px';
            rect.style.top = top + 'px';
        };

        const mouseUpHandler = (e) => {
            if (!isDrawing) return;
            
            isDrawing = false;
            const width = Math.abs(e.clientX - startX);
            const height = Math.abs(e.clientY - startY);
            
            if (width > 10 && height > 10) {
                const centerX = Math.min(startX, e.clientX) + width/2;
                const centerY = Math.min(startY, e.clientY) + height/2;
                
                this.zoomToSelection(centerX, centerY, width, height);
            }
            
            rect.style.display = 'none';
        };

        document.addEventListener('mousedown', mouseDownHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    zoomToSelection(centerX, centerY, width, height) {
        const canvas = this.viewer.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        const ndcX = ((centerX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((centerY - rect.top) / rect.height) * 2 + 1;
        
        const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
        vector.unproject(this.camera);
        
        const direction = vector.sub(this.camera.position).normalize();
        
        const fov = this.camera.fov * (Math.PI / 180);
        const aspectRatio = rect.width / rect.height;
        
        const frustumHeight = 2 * Math.tan(fov / 2);
        const frustumWidth = frustumHeight * aspectRatio;
        
        const targetHeightRatio = 0.4;
        const distance = (Math.max(width, height) / rect.height) / (frustumHeight * targetHeightRatio);
        
        const targetPosition = this.camera.position.clone().add(direction.multiplyScalar(distance));
        
        const lookAtPoint = new THREE.Vector3(ndcX, ndcY, 0);
        lookAtPoint.unproject(this.camera);
        
        const Y = {
            x: this.viewer.scene.view.position.x,
            y: this.viewer.scene.view.position.y,
            z: this.viewer.scene.view.position.z,
            lx: lookAtPoint.x,
            ly: lookAtPoint.y,
            lz: lookAtPoint.z
        };
        
        const target = {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            lx: lookAtPoint.x,
            ly: lookAtPoint.y,
            lz: lookAtPoint.z
        };
        
        new TWEEN.Tween(Y)
            .to(target, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.camera.position.set(Y.x, Y.y, Y.z);
                this.viewer.scene.view.position.set(Y.x, Y.y, Y.z);
                this.viewer.scene.view.lookAt(Y.lx, Y.ly, Y.lz);
            })
            .onComplete(() => {
                this.viewer.fpControls.enabled = true;
                this.viewer.orbitControls.enabled = true;
            })
            .start();
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
                } else {
                    this.resetSelection();
                }
            }
        } else {
            this.resetSelection();
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
                this.viewer.scene.view.position.set(
                    this.camera.position.x,
                    this.camera.position.y,
                    this.camera.position.z
                );
                this.viewer.scene.view.lookAt(targetLookAt);
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
        const material = new THREE.MeshNormalMaterial();
        this.viewer.focal_sphere = new THREE.Mesh(sphere_geometry, material);
        this.viewer.focal_sphere.position.set(I.location.x, I.location.y, I.location.z);
        this.viewer.focal_sphere.scale.set(0.15, 0.15, 0.15);
        this.viewer.focal_sphere.frustumCulled = false;
        this.viewer.scene.scene.add(this.viewer.focal_sphere);
        this.viewer.focal_i = I.point['mag_id'][0];
    }

    resetSelection() {
        this.resetFocalSphere();
        $("#paper_info").toggle(false);
        $(".card").toggle(false);
        $("#potree_render_area").css('left', '0');
    }
} 