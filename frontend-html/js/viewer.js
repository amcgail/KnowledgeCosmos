import * as THREE from "/libs/three.js/build/three.module.js";
import { Controls } from './controls.js';
import { PaperManager } from './paper.js';
import { UIManager } from './ui.js';
import { STLLoader } from "/libs/three.js/loaders/STLLoader.js";

export class Viewer {
    constructor() {
        this.viewer = new Potree.Viewer(document.getElementById("potree_render_area"), {
            useDefaultRenderLoop: false,
            logarithmicDepthBuffer: true
        });
        
        this.setupViewer();
        this.setupControls();
        this.setupInitialState();

        // Initialize render loop variables
        this.frameCount = 0;
        this.focalSphere = null;
        this.focalI = null;
        this.lastH = null;
        this.animation = null;

        // Make skip_intro globally accessible
        window.skip_intro = () => this.skip_intro();

        // Start the render loop
        this.startRenderLoop();
    }

    setupViewer() {
        this.viewer.setFOV(60);
        this.viewer.setPointBudget(500_000);
        this.viewer.setMinNodeSize(2);
        this.viewer.setMoveSpeed(2.5);
        this.viewer.setBackground('black');

        // Eye Dome Lighting
        this.viewer.setEDLEnabled(true);
        this.viewer.setEDLRadius(1.1);
        this.viewer.setEDLStrength(0.1);
        
        this.viewer.setControls(this.viewer.fpControls);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        this.viewer.scene.scene.add(ambientLight);

        // Add directional lights for proper shading
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(1000, 1000, 1000);
        this.viewer.scene.scene.add(mainLight);

        // Add a secondary light from the opposite direction for fill
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-1000, -1000, -1000);
        this.viewer.scene.scene.add(fillLight);

        // Set initial camera position
        this.viewer.scene.view.position.set(1623, 1950, 1492);
        this.viewer.scene.view.lookAt(730, 691, 725);

        // Set clip task
        this.viewer.setClipTask(Potree.ClipTask.SHOW_INSIDE);

        // load the UI controls
        if (false) {
            this.viewer.loadGUI().then(() => {
                this.viewer.setLanguage('en');
            });
        }
    }

    setupControls() {
        // Set initial camera mode
        this.viewer.setCameraMode(Potree.CameraMode.PERSPECTIVE);
        
        // General control settings
        this.viewer.fpControls.lockElevation = false;
        this.viewer.fpControls.rotationSpeed = 25;
        this.viewer.fpControls.maxPolarAngle = Math.PI / 2;
        
        this.viewer.orbitControls.enableDamping = true;
        this.viewer.orbitControls.dampingFactor = 0.05;
        
        // Setup control switching
        const flightControl = document.getElementById('flight-control');
        const orbitControl = document.getElementById('orbit-control');
        const sliceControl = document.getElementById('slice-control');
        const slicePanel = document.getElementById('slice-panel');
        
        // Setup minimize/maximize button for slice panel
        const sliceToggle = slicePanel.querySelector('.slice-toggle');
        sliceToggle.addEventListener('click', () => {
            slicePanel.classList.toggle('minimized');
        });
        
        // Set initial state - flight controls are default
        this.viewer.setControls(this.viewer.fpControls);
        flightControl.classList.add('selected');
        
        // Setup control switching event listeners
        flightControl.addEventListener('click', () => {
            this.viewer.setControls(this.viewer.fpControls);
        });
        
        orbitControl.addEventListener('click', () => {
            this.viewer.setControls(this.viewer.orbitControls);
        });

        // Setup slice control
        sliceControl.addEventListener('click', () => {
            // If already selected, do nothing
            if (sliceControl.classList.contains('selected')) {
                return;
            }
            
            slicePanel.style.display = 'block';
            this.setupSliceControls();

            // "click" on the axial button
            const axialBtn = document.querySelector('.orientation-btn[data-orientation="axial"]');
            axialBtn.click();

            this.viewer.renderer.domElement.focus();
        });
    }

    setupSliceControls() {
        // Initialize position and thickness values if they don't exist
        if (!this.slicePositions) {
            this.slicePositions = {
                axial: 50,
                sagittal: 50,
                coronal: 50
            };
            this.sliceThicknesses = {
                axial: 10,
                sagittal: 10,
                coronal: 10
            };
        }

        // Setup orientation buttons
        const orientationButtons = document.querySelectorAll('.orientation-btn');
        orientationButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                orientationButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const orientation = btn.dataset.orientation;
                
                if (orientation === 'off') {
                    if (this.sliceVolume) {
                        this.viewer.scene.removeVolume(this.sliceVolume);
                        this.sliceVolume = null;
                    }
                    return;
                }
                
                // Create slice volume if it doesn't exist
                if (!this.sliceVolume) {
                    this.sliceVolume = new Potree.BoxVolume();
                    this.sliceVolume.name = "Slice";
                    this.sliceVolume.scale.set(5000, 5000, 5000);
                    this.sliceVolume.position.set(0, 0, 0);
                    this.sliceVolume.clip = true;
                    this.sliceVolume.visible = false;
                    console.log(this.sliceVolume);
                    this.viewer.scene.addVolume(this.sliceVolume);
                }
                
                // Update sliders to match stored values
                document.getElementById('slice-position').value = this.slicePositions[orientation];
                document.getElementById('slice-thickness').value = this.sliceThicknesses[orientation];
                document.querySelector('.position-value').textContent = `${this.slicePositions[orientation]}%`;
                document.querySelector('.thickness-value').textContent = `${this.sliceThicknesses[orientation]}%`;
                
                this.updateSliceOrientation(orientation);
            });
        });

        // Setup position slider
        const positionSlider = document.getElementById('slice-position');
        const positionValue = document.querySelector('.position-value');
        positionSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            positionValue.textContent = `${value}%`;
            const activeOrientation = document.querySelector('.orientation-btn.active').dataset.orientation;
            this.slicePositions[activeOrientation] = value;
            this.updateSlicePosition(value);
        });

        // Setup thickness slider
        const thicknessSlider = document.getElementById('slice-thickness');
        const thicknessValue = document.querySelector('.thickness-value');
        thicknessSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            thicknessValue.textContent = `${value}%`;
            const activeOrientation = document.querySelector('.orientation-btn.active').dataset.orientation;
            this.sliceThicknesses[activeOrientation] = value;
            this.updateSliceThickness(value);
        });
    }

    updateSliceOrientation(orientation) {
        if (!this.sliceVolume) return;

        // Reset box volume to include all points
        this.sliceVolume.scale.set(5000, 5000, 5000);
        this.sliceVolume.position.set(0, 0, 0);

        // Apply current thickness
        this.updateSliceThickness(this.sliceThicknesses[orientation]);

        // Apply current position
        this.updateSlicePosition(this.slicePositions[orientation]);
    }

    updateSlicePosition(value) {
        if (!this.sliceVolume) return;

        const ranges = {
            'coronal': [90, 1000],
            'sagittal': [120, 1500],
            'axial': [280, 1100]
        }

        const activeOrientation = document.querySelector('.orientation-btn.active').dataset.orientation;
        let position
        if(ranges[activeOrientation]) {
            const [min, max] = ranges[activeOrientation];
            position = (value / 100) * (max-min) + min;
        } else {
            position = (value / 100) * 1000 - 500;
        }

        console.log(position);

        switch (activeOrientation) {
            case 'axial':
                this.sliceVolume.position.z = position;
                break;
            case 'sagittal':
                this.sliceVolume.position.x = position;
                break;
            case 'coronal':
                this.sliceVolume.position.y = position;
                break;
        }
    }

    updateSliceThickness(value) {
        if (!this.sliceVolume) return;

        const maxThickness = 100;
        const thickness = (value / 100) * maxThickness;

        const activeOrientation = document.querySelector('.orientation-btn.active').dataset.orientation;
        switch (activeOrientation) {
            case 'axial':
                this.sliceVolume.scale.set(5000, 5000, thickness);
                break;
            case 'sagittal':
                this.sliceVolume.scale.set(thickness, 5000, 5000);
                break;
            case 'coronal':
                this.sliceVolume.scale.set(5000, thickness, 5000);
                break;
        }
    }

    setupInitialState() {
        // Hide menu items initially
        $("#menu div").toggle(false);
        $("#skip_intro").toggle(true);
        $("#tips_link").toggle(false);
        $("#comment_link").toggle(false);
    }

    loadPointCloud(url, callback) {
        Potree.loadPointCloud(url, "pointcloud", (e) => {
            const pointcloud = e.pointcloud;
            const material = pointcloud.material;
            
            // Add pointcloud to scene
            this.viewer.scene.addPointCloud(pointcloud);
            
            // Configure material settings for better performance
            material.size = 0.08;
            material.minimumNodePixelSize = 2;
            material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
            material.shape = Potree.PointShape.CIRCLE;
            material.uniforms.uShadowColor.value = [0.6, 0.6, 0.6];
            
            // Optimize point cloud loading check
            let loadCheckCount = 0;
            const maxLoadChecks = 100; // Maximum number of checks (50 seconds)
            const checkLoaded = setInterval(() => {
                let pcs = this.viewer.scene.pointclouds;
                if (pcs[pcs.length - 1].visibleNodes.length > 0 || loadCheckCount >= maxLoadChecks) {
                    clearInterval(checkLoaded);
                    callback(pointcloud);
                } else {
                    loadCheckCount++;
                }
            }, 500);
        });
    }

    startPresentation() {
        // Initialize presentation state
        this.intro_cancelled = false;
        this.scrollProgress = 0;
        this.zoomSteps = 600; // 60 seconds worth of steps
        this.circleSteps = 190; // 19 seconds worth of steps
        this.maxScroll = this.zoomSteps + this.circleSteps;
        
        // Show skip intro button
        document.getElementById('skip_intro').style.display = 'block';
        
        // Start the presentation sequence
        this.startPresentationSequence();
        
        // Add scroll event listener
        this.handleScrollBound = this.handleScroll.bind(this);
        window.addEventListener('wheel', this.handleScrollBound, { passive: false });

        // Start camera movement
        this.updateCameraPosition();
    }

    handleScroll(event) {
        event.preventDefault();
        
        if (event.deltaY > 0) {
            this.scrollProgress = Math.min(this.maxScroll, this.scrollProgress + 1);
        } else {
            this.scrollProgress = Math.max(0, this.scrollProgress - 1);
        }
        
        this.displayCurrentMessage();
        this.updateCameraPosition();
    }

    updateCameraPosition() {
        const progress = this.scrollProgress / this.maxScroll;
        
        if (this.scrollProgress <= this.zoomSteps) {
            // Zoom phase
            const zoomProgress = this.scrollProgress / this.zoomSteps;
            
            // Calculate camera position
            const startPos = { x: 1623, y: 1950, z: 1492 };
            const endPos = { x: 1209, y: 1367, z: 1137 };
            
            const currentPos = {
                x: startPos.x + (endPos.x - startPos.x) * zoomProgress,
                y: startPos.y + (endPos.y - startPos.y) * zoomProgress,
                z: startPos.z + (endPos.z - startPos.z) * zoomProgress
            };

            // Calculate look-at point
            const startLookAt = { x: 730, y: 691, z: 725 };
            const endLookAt = { x: 622, y: 546, z: 652 };
            
            const currentLookAt = {
                x: startLookAt.x + (endLookAt.x - startLookAt.x) * zoomProgress,
                y: startLookAt.y + (endLookAt.y - startLookAt.y) * zoomProgress,
                z: startLookAt.z + (endLookAt.z - startLookAt.z) * zoomProgress
            };

            // Update camera position and look-at point
            this.viewer.scene.view.position.set(currentPos.x, currentPos.y, currentPos.z);
            this.viewer.scene.view.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);
        } else {
            // Circle phase
            const circleProgress = (this.scrollProgress - this.zoomSteps) / this.circleSteps;
            const angle = circleProgress * 2 * Math.PI;
            
            // Get the final zoom position as starting point
            const a = new THREE.Vector3(1209, 1367, 1137);
            
            // Get the center point
            const b = new THREE.Vector3(730, 691, 725);
            
            // Calculate the vector from center to camera
            const curlit = a.clone().sub(b);
            
            // Rotate this vector around the camera's up axis
            curlit.applyAxisAngle(this.viewer.scene.getActiveCamera().up, angle);
            
            // Calculate the final position
            const result = b.clone().add(curlit);
            
            // Update camera position and look-at point
            this.viewer.scene.view.position.set(result.x, result.y, result.z);
            this.viewer.scene.view.lookAt(622, 546, 652);
        }

        // If we've reached the end, increase point budget and end presentation
        if (this.scrollProgress >= this.maxScroll) {
            this.viewer.setPointBudget(2_000_000);
            this.doneWithIntro();
        }
    }

    startPresentationSequence() {
        const sequence = [
            ['Changing our frame of reference invites us to explore what we know from new perspectives and angles.', 7],
            ['From the first space flight in the 1960s to observing an atom, shifting perspective allowed researchers to see what they know and what is still left to understand.', 10],
            ['Inspired by this, The Knowledge Cosmos collects 17 million research papers across disciplines and maps them into a 3D space.', 8],
            ['Our hope is that the vastness of how much knowledge is out there and how it intersects disciplines will inspire you to see where we have left to explore', 9],
            ['as well as incite curiosity for disciplines you seek to learn about and find your own intersections.', 6],
            ["When we have an understanding of what we don't know, the possibilities of discovery then become limitless.", 9],
            ['We invite you to explore', 3],
            ['END', 8]
        ];

        // Calculate total duration of messages (excluding END)
        const totalDuration = sequence.slice(0, -1).reduce((sum, [_, duration]) => sum + duration, 0);
        
        // Calculate scroll steps per second for the zoom phase
        const stepsPerSecond = this.zoomSteps / totalDuration;
        
        // Calculate scroll positions for each message
        this.messagePositions = sequence.map(([text, duration], index) => {
            if (text === 'END') {
                return {
                    text,
                    startScroll: this.zoomSteps,
                    endScroll: this.maxScroll
                };
            }
            
            const startScroll = index === 0 ? 0 : 
                sequence.slice(0, index).reduce((sum, [_, d]) => sum + (d * stepsPerSecond), 0);
            
            return {
                text,
                startScroll,
                endScroll: startScroll + (duration * stepsPerSecond)
            };
        });

        // Display initial message
        this.displayCurrentMessage();
    }

    displayCurrentMessage() {
        const infoElement = document.getElementById('prettier_game_info');
        
        // Find the current message based on scroll position
        const currentMessage = this.messagePositions.find(msg => 
            this.scrollProgress >= msg.startScroll && this.scrollProgress <= msg.endScroll
        );

        if (currentMessage) {
            if (currentMessage.text === 'END') {
                infoElement.innerHTML = "THE KNOWLEDGE COSMOS";
                infoElement.style.cssText = `
                    font-size: 80pt;
                    font-family: cyber;
                    max-width: 100%;
                    width: 100%;
                `;
            } else {
                infoElement.innerHTML = currentMessage.text;
                infoElement.style.cssText = '';
            }
        }
    }

    doneWithIntro() {
        // Remove scroll event listener
        window.removeEventListener('wheel', this.handleScrollBound);
        
        document.getElementById('prettier_game_info').innerHTML = '';
        document.querySelectorAll('#menu div').forEach(el => el.style.display = 'block');
        document.getElementById('skip_intro').style.display = 'none';
        document.getElementById('tips_link').style.display = 'block';
        document.getElementById('comment_link').style.display = 'block';
        document.getElementsByClassName('toolbar')[0].style.display = 'flex';
        document.getElementsByClassName('sidebar-toggle')[0].style.display = 'flex';
    }

    startRenderLoop() {
        // Add FPS tracking variables
        let lastTime = performance.now();
        let frames = 0;
        let fps = 0;
        let lastUIUpdate = 0;
        const UI_UPDATE_INTERVAL = 100; // Update UI every 100ms instead of every 10 frames
        const TARGET_FPS = 60;
        const FRAME_TIME = 1000 / TARGET_FPS;

        const render = (timestamp) => {
            // Frame rate limiting
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            if (deltaTime < FRAME_TIME) {
                requestAnimationFrame(render);
                return;
            }
            
            lastTime = currentTime;
            
            // Update viewer
            this.viewer.update(
                this.viewer.clock.getDelta(),
                timestamp
            );
            
            // Update UI based on time instead of frame count
            if (currentTime - lastUIUpdate >= UI_UPDATE_INTERVAL) {
                this.updateUI();
                lastUIUpdate = currentTime;
            }
            
            // Render scene
            this.viewer.renderer.render(
                this.viewer.scene.scene, 
                this.viewer.scene.getActiveCamera()
            );
            
            this.viewer.render();
            
            // FPS calculation and monitoring
            frames++;
            if (currentTime - lastTime >= 1000) {
                fps = Math.round((frames * 1000) / (currentTime - lastTime));
                console.log(`FPS: ${fps}`);
                frames = 0;
                lastTime = currentTime;
            }
            
            this.frameCount++;
            
            // Request next frame
            requestAnimationFrame(render);
        };
        render();
    }

    updateUI() {
        // Update coordinates display
        const camera = this.viewer.scene.getActiveCamera();
        const posX = document.getElementById('pos_x');
        const posY = document.getElementById('pos_y');
        const posZ = document.getElementById('pos_z');
        
        if (posX && posY && posZ) {
            posX.textContent = Math.round(camera.position.x);
            posY.textContent = Math.round(camera.position.y);
            posZ.textContent = Math.round(camera.position.z);
        }
    }

    skip_intro() {
        this.intro_cancelled = true;
        
        // Stop any ongoing animations
        if (this.Tstart) {
            this.Tstart.stop();
        }
        
        // Move camera to final position
        const loc = {
            x: this.viewer.scene.view.position.x,
            y: this.viewer.scene.view.position.y,
            z: this.viewer.scene.view.position.z
        };
        
        new TWEEN.Tween(loc)
            .to({ x: 1209, y: 1367, z: 1137 }, 1000)
            .onUpdate(() => {
                this.viewer.scene.view.position.set(loc.x, loc.y, loc.z);
                this.viewer.scene.view.lookAt(622, 546, 652);
            })
            .start();
        
        this.doneWithIntro();
        this.viewer.setPointBudget(2_000_000);
    }

    // Navigation methods
    home() {
        const Y = {
            x: this.viewer.scene.view.position.x,
            y: this.viewer.scene.view.position.y,
            z: this.viewer.scene.view.position.z,
            lx: 730, ly: 691, lz: 725
        };

        let _this = this;

        const view_update = () => {
            _this.viewer.scene.view.position.set(Y.x, Y.y, Y.z);
            _this.viewer.scene.view.lookAt(Y.lx, Y.ly, Y.lz);
        };
        
        new TWEEN.Tween(Y)
            .onUpdate(view_update)
            .to({x: 1209, y: 1367, z: 1137}, 1000)
            .start();
    }

    circle(delay = 19000) {
        const a = new THREE.Vector3(
            this.viewer.scene.view.position.x,
            this.viewer.scene.view.position.y,
            this.viewer.scene.view.position.z
        );

        const b = new THREE.Vector3(730, 691, 725);
        const d = new THREE.Vector3();
        this.viewer.scene.getActiveCamera().getWorldDirection(d);

        const c = b.clone().sub(a).projectOnVector(d);
        const e = a.clone().add(c);
        
        const X = {angle: 0, lk0: e.x, lk1: e.y, lk2: e.z};

        // Optimize circle animation
        new TWEEN.Tween(X)
            .to({
                angle: 2 * Math.PI,
                lk0: b.x, lk1: b.y, lk2: b.z
            }, delay)
            .easing(TWEEN.Easing.Linear.None) // Use linear easing for smooth circular motion
            .onUpdate(() => {
                const curlit = a.clone().sub(b);
                curlit.applyAxisAngle(this.viewer.scene.getActiveCamera().up, X.angle);
                const result = b.clone().add(curlit);
                
                this.viewer.scene.view.position.set(result.x, result.y, result.z);
                this.viewer.scene.view.lookAt(622, 546, 652);
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
        this.viewer.scene.getActiveCamera().getWorldDirection(d);

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

        const view_update = () => {
            this.viewer.scene.view.position.set(Y.x, Y.y, Y.z);
            this.viewer.scene.view.lookAt(Y.lk0, Y.lk1, Y.lk2);
        };

        new TWEEN.Tween(Y)
            .onUpdate(view_update)
            .to(target, 1000)
            .start();
    }

    stop() {
        if (this.animation) {
            this.animation.stop();
            this.animation = null;
        }
    }

    brain() {
        let volume = new Potree.ClipVolume(this.viewer.scene.getActiveCamera());
        let m0 = new THREE.Mesh();
        let m1 = new THREE.Mesh();
        let m2 = new THREE.Mesh();
        let m3 = new THREE.Mesh();
        m0.position.set(-1, -1, 0);
        m1.position.set(1, -1, 0);
        m2.position.set(1, 1, 0);
        m3.position.set(-1, 1, 0);
        volume.markers.push(m0, m1, m2, m3);
        volume.initialized = true;
        
        this.viewer.scene.addPolygonClipVolume(volume);
    }

} 