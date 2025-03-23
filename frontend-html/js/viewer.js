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
        this.setupManagers();
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
        const light = new THREE.AmbientLight(0x404040, 0.8);
        this.viewer.scene.scene.add(light);

        // Set initial camera position
        this.viewer.scene.view.position.set(1623, 1950, 1492);
        this.viewer.scene.view.lookAt(730, 691, 725);

        // load the UI controls
        this.viewer.loadGUI().then(() => {
            this.viewer.setLanguage('en');
        });
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
        
        // Set initial state - flight controls are default
        this.viewer.setControls(this.viewer.fpControls);
        flightControl.classList.add('selected');
        orbitControl.classList.remove('selected');
        
        // Setup control switching event listeners
        flightControl.addEventListener('click', () => {
            this.viewer.setControls(this.viewer.fpControls);
            flightControl.classList.add('selected');
            orbitControl.classList.remove('selected');
            
            // focus on the viewer canvas element, so keyboard controls work
            this.viewer.renderer.domElement.focus();
        });
        
        orbitControl.addEventListener('click', () => {
            this.viewer.setControls(this.viewer.orbitControls);
            orbitControl.classList.add('selected');
            flightControl.classList.remove('selected');
            
            // focus on the viewer canvas element, so keyboard controls work
            this.viewer.renderer.domElement.focus();
        });
    }

    setupManagers() {
        this.controls = new Controls(this.viewer);
        this.paperManager = new PaperManager(this.viewer);
        this.uiManager = new UIManager();
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
        
        // Show skip intro button
        document.getElementById('skip_intro').style.display = 'block';
        
        // Start the presentation sequence
        this.startPresentationSequence();

        // Start camera movement
        this.startCameraMovement();
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

        let currentIndex = 0;
        const displayNext = () => {
            if (!sequence.length || this.intro_cancelled) {
                this.doneWithIntro();
                return;
            }

            const [text, duration] = sequence.shift();
            const infoElement = document.getElementById('prettier_game_info');

            if (text === 'END') {
                infoElement.innerHTML = "THE KNOWLEDGE COSMOS";
                infoElement.style.cssText = `
                    font-size: 80pt;
                    font-family: cyber;
                    max-width: 100%;
                    width: 100%;
                `;
            } else {
                infoElement.innerHTML = text;
                infoElement.style.cssText = '';
            }

            setTimeout(displayNext, duration * 1000);
        };

        displayNext();
    }

    startCameraMovement() {
        const loc = {
            x: this.viewer.scene.view.position.x,
            y: this.viewer.scene.view.position.y,
            z: this.viewer.scene.view.position.z
        };

        // Optimize camera movement with better easing
        this.Tstart = new TWEEN.Tween(loc)
            .to({ x: 1623, y: 1950, z: 1492 }, 60000)
            .easing(TWEEN.Easing.Quadratic.Out) // Changed to Quadratic for smoother movement
            .onUpdate(() => {
                this.viewer.scene.view.position.set(loc.x, loc.y, loc.z);
                this.viewer.scene.view.lookAt(730, 691, 725);
            })
            .onComplete(() => {
                this.circle(19000);
                this.viewer.setPointBudget(2_000_000);
            })
            .start();
    }

    doneWithIntro() {
        document.getElementById('prettier_game_info').innerHTML = '';
        document.querySelectorAll('#menu div').forEach(el => el.style.display = 'block');
        document.getElementById('skip_intro').style.display = 'none';
        document.getElementById('tips_link').style.display = 'block';
        document.getElementById('comment_link').style.display = 'block';
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
        const coords = `Coordinates: ${Math.round(camera.position.x)}, ${Math.round(camera.position.y)}, ${Math.round(camera.position.z)}`;
        const speed = `Speed: ${Math.round(this.viewer.getMoveSpeed())}`;
        
        const h = `
            Welcome to the game. I'm thinking now about some tour around this beautiful beast.<br>
            <div class='smaller'>
            ${coords}<br/>
            ${speed}
            </div>
        `;

        if (h !== this.lastH) {
            const info = document.getElementById('game_info');
            if (info) {
                const ephemeral = info.querySelector('.ephemeral');
                if (ephemeral) {
                    ephemeral.innerHTML = h;
                }
            }
            this.lastH = h;
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
            .to({ x: 1623, y: 1950, z: 1492 }, 1000)
            .onUpdate(() => {
                this.viewer.scene.view.position.set(loc.x, loc.y, loc.z);
                this.viewer.scene.view.lookAt(730, 691, 725);
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
            .to({x: 1623, y: 1950, z: 1492}, 1000)
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

    field_mode() {
        $(".right_boy").toggle(false);
        $("#legend").toggle(true);
    }

    constellation() {
        $(".right_boy").toggle(false);
        $("#constellation").toggle(true);
    }
} 