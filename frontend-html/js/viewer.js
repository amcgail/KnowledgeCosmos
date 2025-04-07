import * as THREE from "/libs/three.js/build/three.module.js";
import { Controls } from './controls.js';
import { PaperManager } from './paper.js';
import { UIManager } from './ui.js';
import { STLLoader } from "/libs/three.js/loaders/STLLoader.js";

const SCROLL_SPEED = 2;

// Camera position constants
const HOME_POSITION = { x: 1230, y: 1190, z: 1050 };
const HOME_LOOK_AT = { x: 620, y: 520, z: 640 };

export class Viewer {
    constructor() {
        this.viewer = new Potree.Viewer(document.getElementById("potree_render_area"), {
            useDefaultRenderLoop: false,
            logarithmicDepthBuffer: true
        });
        
        // Create separate scene for collision mesh
        this.collisionScene = new THREE.Scene();
        
        this.setupViewer();
        this.setupControls();
        this.setupInitialState();

        // Initialize render loop variables
        this.frameCount = 0;
        this.focalSphere = null;
        this.focalI = null;
        this.lastH = null;
        this.animation = null;

        this.fullMesh = null;

        this.recentDistance = 0;

        // Make skip_intro globally accessible
        window.skip_intro = () => this.skip_intro();

        // Start the render loop
        this.startRenderLoop();
    }

    setupViewer() {
        this.viewer.setFOV(60);
        this.viewer.setPointBudget(500_000);
        this.viewer.setMinNodeSize(2);
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
        
        // Always use orbit controls
        this.viewer.setControls(this.viewer.orbitControls);
        
        // Configure orbit controls
        this.viewer.orbitControls.enableDamping = true;
        this.viewer.orbitControls.dampingFactor = 0.05;
        this.viewer.orbitControls.rotateSpeed = 1.0;
        
        // Track key states for continuous movement
        const keyStates = {
            arrowup: false,
            arrowdown: false,
            arrowleft: false,
            arrowright: false,
            w: false,
            s: false,
            a: false,
            d: false
        };
        
        // Get the render area element
        const renderArea = document.getElementById("potree_render_area");
        
        // Handle key down
        renderArea.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (key in keyStates) {
                keyStates[key] = true;
            }
        });
        
        // Handle key up
        renderArea.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            if (key in keyStates) {
                keyStates[key] = false;
            }
        });

        // Make the render area focusable
        renderArea.setAttribute('tabindex', '0');
        
        // Base movement speed and speed parameters
        const baseSpeed = 0.1;
        const maxSpeed = 20.0;
        const speedExponent = 2;
        
        let rotating = false;
        
        // Continuous movement update
        const moveUpdate = () => {
            const view = this.viewer.scene.view;
            const moveVector = new THREE.Vector3();
            
            // Get camera's local axes
            const camera = this.viewer.scene.getActiveCamera();
            const forward = new THREE.Vector3(0, 0, -1);
            const right = new THREE.Vector3(1, 0, 0);
            
            // Apply camera's rotation to the axes
            forward.applyQuaternion(camera.quaternion);
            right.applyQuaternion(camera.quaternion);
            
            // Calculate speed with quadratic increase
            const speedMultiplier = this.recentDistance === 0 
                ? baseSpeed 
                : Math.min(maxSpeed, baseSpeed * (1 + Math.pow(this.recentDistance / 10, 2)));

            // Handle both arrow keys and WASD
            if (keyStates['arrowup'] || keyStates['w']) moveVector.add(forward.multiplyScalar(speedMultiplier));
            if (keyStates['arrowdown'] || keyStates['s']) moveVector.add(forward.multiplyScalar(-speedMultiplier));
            if (keyStates['arrowleft'] || keyStates['a']) moveVector.add(right.multiplyScalar(-speedMultiplier));
            if (keyStates['arrowright'] || keyStates['d']) moveVector.add(right.multiplyScalar(speedMultiplier));
            
            if (moveVector.length() > 0) {
                // Move the view position
                view.position.set(
                    view.position.x + moveVector.x, 
                    view.position.y + moveVector.y, 
                    view.position.z + moveVector.z
                );
            }

            // Wait for the next tick to update lookAt
            setTimeout(() => {
                // Only adjust lookAt when movement keys are pressed
                if (!(keyStates['arrowup'] || keyStates['arrowdown'] || 
                    keyStates['arrowleft'] || keyStates['arrowright'] ||
                    keyStates['w'] || keyStates['s'] || 
                    keyStates['a'] || keyStates['d'])) return;

                // If we are inside the mesh, set lookAt to the camera position
                if (this.recentDistance < 100) {    
                    this.lookDownNose();
                } else {
                    // When outside the mesh, calculate the point where camera's line of sight is closest to mesh center
                    const camera = this.viewer.scene.getActiveCamera();
                    const cameraPosition = camera.position.clone();
                    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    
                    // Get mesh center (assuming HOME_LOOK_AT is the center of the mesh)
                    const meshCenter = new THREE.Vector3(HOME_LOOK_AT.x, HOME_LOOK_AT.y, HOME_LOOK_AT.z);
                    
                    // Calculate vector from camera to mesh center
                    const toCenter = meshCenter.clone().sub(cameraPosition);
                    
                    // Project toCenter onto forward to find closest point on line of sight to mesh center
                    const dotProduct = toCenter.dot(forward);
                    const closestPoint = cameraPosition.clone().add(forward.clone().multiplyScalar(dotProduct));
                    
                    // Store current yaw
                    const currentYaw = this.viewer.scene.view.yaw;
                    
                    // Look at the target. If it's in the opposite direction, do it slowly
                    if(toCenter.dot(forward) < 0) {
                        if (!rotating) {
                            console.log("Rotating");
                            rotating = true;
                                
                            setTimeout(() => {
                                rotating = false;
                            }, 1000);
                            
                            // Create animation for smooth rotation
                            const startQuaternion = camera.quaternion.clone();
                            
                            // Calculate target quaternion (looking at mesh center)
                            const targetQuaternion = new THREE.Quaternion();
                            
                            // Create a temporary camera to get the quaternion for looking at the target
                            const tempCamera = camera.clone();
                            tempCamera.position.copy(cameraPosition);
                            tempCamera.lookAt(meshCenter);
                            targetQuaternion.copy(tempCamera.quaternion);
                            
                            // Setup the animation
                            const rotationObj = { t: 0 };
                            new TWEEN.Tween(rotationObj)
                                .to({ t: 1 }, 1000) // 1 second duration
                                .easing(TWEEN.Easing.Quadratic.InOut)
                                .onUpdate(() => {
                                    // Interpolate between start and target quaternions
                                    THREE.Quaternion.slerp(
                                        startQuaternion,
                                        targetQuaternion,
                                        camera.quaternion,
                                        rotationObj.t
                                    );
                                })
                                .onComplete(() => {  
                                    // Update the view
                                    this.viewer.scene.view.lookAt(
                                        meshCenter.x,
                                        meshCenter.y,
                                        meshCenter.z
                                    );
                                })
                                .start();
                        }
                    } else {
                        if (!rotating) {
                            this.viewer.scene.view.lookAt(closestPoint);
                        }
                    }
                    
                    // Restore the original yaw
                    this.viewer.scene.view.yaw = currentYaw;
                }
            }, 0);
            
            requestAnimationFrame(moveUpdate);
        };
        
        // Start the movement update loop
        moveUpdate();
        
        // Setup slice control
        const sliceControl = document.getElementById('slice-control');
        const slicePanel = document.getElementById('slice-panel');
        
        // Setup minimize/maximize button for slice panel
        const sliceToggle = slicePanel.querySelector('.slice-toggle');
        sliceToggle.addEventListener('click', () => {
            slicePanel.classList.toggle('minimized');
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
                    // Safely check if message container exists before showing it (for intro)
                    const messageContainer = document.querySelector('.message-container');
                    if (messageContainer) {
                        messageContainer.classList.add('visible');
                    }
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
        
        // Add bounce animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0);
                }
                40% {
                    transform: translateY(-20px);
                }
                60% {
                    transform: translateY(-10px);
                }
            }
        `;
        document.head.appendChild(style);
        
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
        
        // Show progress bar when scrolling starts
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.classList.add('visible');
        }
        
        if (event.deltaY > 0) {
            this.scrollProgress = Math.min(this.maxScroll, this.scrollProgress + SCROLL_SPEED);
        } else {
            this.scrollProgress = Math.max(0, this.scrollProgress - SCROLL_SPEED);
        }
        
        this.displayCurrentMessage();
        this.updateCameraPosition();
    }

    updateCameraPosition() {
        const progress = this.scrollProgress / this.maxScroll;
        
        if (this.scrollProgress <= this.zoomSteps) {
            // Zoom phase with logarithmic scaling
            const linearProgress = this.scrollProgress / this.zoomSteps;
            const zoomProgress = 1 - (1-linearProgress)**3;
            
            // Calculate camera position with linear interpolation
            const startPos = { x: 28910, y: 74489, z: -6947 };
            const endPos = HOME_POSITION;
            
            // Linear interpolation with logarithmic progress
            const currentPos = {
                x: startPos.x + (endPos.x - startPos.x) * zoomProgress,
                y: startPos.y + (endPos.y - startPos.y) * zoomProgress,
                z: startPos.z + (endPos.z - startPos.z) * zoomProgress
            };

            // Calculate look-at point with smoother transition
            const startLookAt = { x: 573.58, y: 450.37, z: 418.63 };
            const endLookAt = HOME_LOOK_AT;
            
            // Use smooth easing for look-at point
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
            
            const a = new THREE.Vector3(HOME_POSITION.x, HOME_POSITION.y, HOME_POSITION.z);
            const b = new THREE.Vector3(HOME_LOOK_AT.x, HOME_LOOK_AT.y, HOME_LOOK_AT.z);
            
            const curlit = a.clone().sub(b);
            curlit.applyAxisAngle(this.viewer.scene.getActiveCamera().up, angle);
            
            const result = b.clone().add(curlit);
            
            this.viewer.scene.view.position.set(result.x, result.y, result.z);
            this.viewer.scene.view.lookAt(HOME_LOOK_AT.x, HOME_LOOK_AT.y, HOME_LOOK_AT.z);
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
            ['We invite you to explore', 9],
            ['END', 14]
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
        const messageText = infoElement.querySelector('.message-text');
        const progressBar = infoElement.querySelector('.progress-bar');
        const scrollIndicator = infoElement.querySelector('.scroll-indicator');
        
        // Find the current message based on scroll position
        const currentMessage = this.messagePositions.find(msg => 
            this.scrollProgress >= msg.startScroll && this.scrollProgress <= msg.endScroll
        );

        if (currentMessage) {
            if (currentMessage.text === 'END') {
                // Update message text instead of replacing innerHTML
                messageText.textContent = "THE KNOWLEDGE COSMOS";
                messageText.style.fontSize = '60pt';
                messageText.style.fontFamily = 'cyber';
                messageText.style.maxWidth = '100%';
                messageText.style.width = '100%';
                
                // Keep progress bar visible and update its progress
                if (progressBar) {
                    progressBar.style.display = 'block';
                    const circleProgress = (this.scrollProgress - this.zoomSteps) / this.circleSteps;
                    progressBar.style.width = `${circleProgress * 100}%`;
                    
                    // Add begin button when circle is complete
                    if (circleProgress >= 1) {
                        // Remove existing begin button if any
                        const existingButton = infoElement.querySelector('.begin-button');
                        if (!existingButton) {
                            const beginButton = document.createElement('button');
                            beginButton.textContent = 'Click here to begin';
                            beginButton.className = 'begin-button';
                            beginButton.onclick = () => this.doneWithIntro();
                            infoElement.appendChild(beginButton);
                        }

                        $('.progress-container').toggleClass('visible', false);
                    } else {
                        // Remove begin button if it exists
                        const beginButton = infoElement.querySelector('.begin-button');
                        if (beginButton) {
                            beginButton.remove();
                        }

                        $('.progress-container').toggleClass('visible', true);
                    }
                }
                
                // Hide only the scroll indicator
                if (scrollIndicator) scrollIndicator.style.display = 'none';
            } else {
                // Update message text
                messageText.textContent = currentMessage.text;
                
                // Reset message text styles
                messageText.style.cssText = '';
                
                // Show progress bar
                if (progressBar) progressBar.style.display = 'block';
                
                // Calculate and update progress
                const messageProgress = (this.scrollProgress - currentMessage.startScroll) / 
                    (currentMessage.endScroll - currentMessage.startScroll);
                progressBar.style.width = `${messageProgress * 100}%`;
                
                // Show/hide scroll indicator based on scroll position
                scrollIndicator.style.display = this.scrollProgress === 0 ? 'flex' : 'none';
            }
        }
    }

    doneWithIntro() {
        this.viewer.setPointBudget(2_000_000);

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
            .to({ x: HOME_POSITION.x, y: HOME_POSITION.y, z: HOME_POSITION.z }, 1000)
            .onUpdate(() => {
                this.viewer.scene.view.position.set(loc.x, loc.y, loc.z);
                this.viewer.scene.view.lookAt(HOME_LOOK_AT.x, HOME_LOOK_AT.y, HOME_LOOK_AT.z);
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
            lx: HOME_LOOK_AT.x, ly: HOME_LOOK_AT.y, lz: HOME_LOOK_AT.z
        };

        let _this = this;

        const view_update = () => {
            _this.viewer.scene.view.position.set(Y.x, Y.y, Y.z);
            _this.viewer.scene.view.lookAt(Y.lx, Y.ly, Y.lz);
        };
        
        new TWEEN.Tween(Y)
            .onUpdate(view_update)
            .to({x: HOME_POSITION.x, y: HOME_POSITION.y, z: HOME_POSITION.z}, 1000)
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

    loadFullMesh() {
        return new Promise((resolve, reject) => {
            const loader = new STLLoader();
            loader.load('/data/field_meshes/full.stl', (geometry) => {
                const material = new THREE.MeshBasicMaterial({
                    visible: false,
                    side: THREE.DoubleSide
                });

                this.fullMesh = new THREE.Mesh(geometry, material);
                this.fullMesh.scale.set(100, 100, 100);
                
                // Update the world matrix of the mesh
                this.fullMesh.updateMatrix();
                this.fullMesh.updateMatrixWorld(true);

                // Start periodic distance checking
                setInterval(() => {
                    this.recentDistance = this.getDistanceToMesh();

                }, 200);

                resolve();
            }, undefined, reject);
        });
    }

    getDistanceToMesh() {
        if (!this.fullMesh) return 0;

        // Get camera position
        const camera = this.viewer.scene.getActiveCamera();
        const cameraPosition = camera.position.clone();

        // Test if camera is inside mesh by casting rays in multiple directions
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];

        // Update the world matrix before raycasting
        this.fullMesh.updateMatrixWorld(true);

        for (const direction of directions) {
            const ray = new THREE.Raycaster(cameraPosition, direction.normalize());
            const intersects = ray.intersectObject(this.fullMesh, false);

            // if we have an odd number of intersections in ANY direction, we're inside
            if (intersects.length % 2 === 1) {
                return 0;
            }
        }

        // Find closest point on mesh to camera
        const vertices = this.fullMesh.geometry.attributes.position.array;
        let minDistance = Infinity;

        // Get world matrix for vertex transformation
        const matrix = this.fullMesh.matrixWorld;

        for (let i = 0; i < vertices.length; i += 3) {
            const vertex = new THREE.Vector3(
                vertices[i],
                vertices[i + 1],
                vertices[i + 2]
            ).applyMatrix4(matrix);
            
            const distance = cameraPosition.distanceTo(vertex);
            minDistance = Math.min(minDistance, distance);
        }

        return minDistance;
    }

    lookDownNose() {
        // Get camera's forward direction
        const camera = this.viewer.scene.getActiveCamera();
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        
        // Set lookAt to a point slightly in front of the camera
        const view = this.viewer.scene.view;
        const lookAtPoint = view.position.clone().add(forward.multiplyScalar(0.1));
        this.viewer.scene.view.lookAt(
            lookAtPoint.x,
            lookAtPoint.y,
            lookAtPoint.z
        );
    }

} 