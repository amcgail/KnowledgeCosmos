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

} 