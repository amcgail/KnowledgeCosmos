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

        // Initialize paper history and bookmarks
        this.paperHistory = [];
        this.loadHistory();
        this.setupTabNavigation();
        this.setupSidebarToggle();
        this.setupPaperSidebarToggle();
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');

                // Update saved papers list when switching to saved tab
                if (tabId === 'saved') {
                    this.updateSavedUI();
                }
            });
        });
    }

    setupSidebarToggle() {
        // Update menu items to toggle the right sidebar
        $('#field_mode').on('click', () => this.toggleRightSidebar('filters'));
        $('#constellations').on('click', () => this.toggleRightSidebar('constellations'));
        $('#history_mode').on('click', () => this.toggleRightSidebar('history'));

        // Setup collapse/expand toggle button
        $('.sidebar-toggle').on('click', () => {
            const sidebar = $('.right-sidebar');
            const isCollapsed = sidebar.hasClass('collapsed');
            
            if (isCollapsed) {
                sidebar.removeClass('collapsed');
                $('#potree_render_area').css('right', '400px');
                $('.sidebar-toggle').css('right', '400px');
                $('.fa-chevron-left').show();
                $('.fa-chevron-right').hide();
            } else {
                sidebar.addClass('collapsed');
                $('#potree_render_area').css('right', '0');
                $('.sidebar-toggle').css('right', '0');
                $('.fa-chevron-right').show();
                $('.fa-chevron-left').hide();
            }
        });
    }

    toggleRightSidebar(tab = null) {
        const sidebar = $('.right-sidebar');
        const isVisible = sidebar.is(':visible');
        
        if (!isVisible) {
            sidebar.show().removeClass('collapsed');
            $('#potree_render_area').css('right', '400px');
            if (tab) {
                $(`.tab-btn[data-tab="${tab}"]`).click();
            }
        } else {
            sidebar.hide();
            $('#potree_render_area').css('right', '0');
        }
    }

    loadHistory() {
        const savedHistory = localStorage.getItem('paperHistory');
        if (savedHistory) {
            this.paperHistory = JSON.parse(savedHistory);
            this.updateHistoryUI();
        }
    }

    saveHistory() {
        localStorage.setItem('paperHistory', JSON.stringify(this.paperHistory));
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        const historyList = $('#history_list');
        historyList.empty();

        // Add clear all button if there are items
        if (this.paperHistory.length > 0) {
            const clearButton = $('<div class="clear-history-btn">Clear All History</div>');
            clearButton.on('click', () => {
                this.paperHistory = [];
                this.saveHistory();
            });
            historyList.append(clearButton);
        }

        this.paperHistory.slice().reverse().forEach(entry => {
            const item = $('<div class="history-item"></div>');
            item.html(`
                <div class="history-content">
                    <div class="history-title">${entry.title || 'Untitled Paper'}</div>
                    <div class="history-meta">MAG ID: ${entry.magId}</div>
                </div>
                <div class="history-actions">
                    <span class="delete-btn">🗑️</span>
                </div>
            `);
            
            // Handle paper selection
            item.find('.history-content').on('click', () => this.revisitPaper(entry));
            
            // Handle delete
            item.find('.delete-btn').on('click', (e) => {
                e.stopPropagation();
                this.paperHistory = this.paperHistory.filter(p => p.magId !== entry.magId);
                this.saveHistory();
            });
            
            historyList.append(item);
        });
    }

    addToHistory(magId, title, position, rgba) {
        const entry = {
            magId,
            title,
            position: {x: position.x, y: position.y, z: position.z},
            rgba: rgba || [255, 255, 255, 255], // Store RGBA data
            timestamp: Date.now()
        };

        // Remove duplicate if exists
        this.paperHistory = this.paperHistory.filter(p => p.magId !== magId);
        
        // Add to history
        this.paperHistory.push(entry);
        
        // Keep only last 50 papers
        if (this.paperHistory.length > 50) {
            this.paperHistory.shift();
        }

        this.saveHistory();
    }

    revisitPaper(historyEntry) {
        const position = new THREE.Vector3(
            historyEntry.position.x,
            historyEntry.position.y,
            historyEntry.position.z
        );

        // Create a temporary intersection object with RGBA data
        const I = {
            point: { 
                mag_id: [historyEntry.magId],
                rgba: historyEntry.rgba || [255, 255, 255, 255] // Default to white if no RGBA stored
            },
            location: position
        };

        this.handlePointSelection(I);
        this.showPaperCard(historyEntry.magId);
    }

    showPaperCard(id) {
        this.paperSidebarToggle(true);

        $(".paper-details .loading-placeholders").show();
        $(".paper-details>.paper-title, .paper-details>.paper-meta, .paper-details>.paper-tags, .paper-details>.paper-content").hide();

        getPaperData(id, (resp) => {
            let link = '';
            if (resp && resp['doi']) {
                link = `<a target='_blank' href='https://doi.org/${resp["doi"]}'>Link to Publisher</a>`;
            }

            $(".paper-details .loading-placeholders").hide();
            $(".paper-details>.paper-title, .paper-details>.paper-meta, .paper-details>.paper-tags, .paper-details>.paper-content").show();
            
            if (resp) {
                const title = resp['title'] || 'No title available';
                $(".paper-details>.paper-title").html(title);
                $(".paper-details .meta-content").html(
                    `${resp['year'] || 'No year'} <br/>`
                    + `${resp['venue'] || 'No venue'} <br/>`
                    + `${(resp['authors'] || []).map((x) => x.name).join(', ') || 'No authors'} <br/>`
                    + `${link} <br/>`
                );
                $(".paper-details>.paper-content").html(resp['abstract'] || 'No abstract available');
                $(".paper-details>.paper-tags").html("");

                const fields = [...new Set((resp['s2FieldsOfStudy'] || []).map((x) => x.category))];
                for (const field of fields) {
                    $(".paper-details>.paper-tags").append(
                        $("<span class='paper-tag'>").html(field)
                    );
                }

                // Setup bookmark button
                const bookmarkBtn = $(".paper-details .bookmark-btn");
                const isBookmarked = this.isPaperBookmarked(id);
                bookmarkBtn.toggleClass('active', isBookmarked);
                
                bookmarkBtn.off('click').on('click', () => {
                    this.toggleBookmark(id, title);
                    bookmarkBtn.toggleClass('active');
                });

                // Add to history when paper is loaded
                if (this.viewer.focal_sphere) {
                    this.addToHistory(id, title, this.viewer.focal_sphere.position, resp['rgba']);
                }
            } else {
                $(".paper-details>.paper-title").html('Paper not found');
                $(".paper-details .meta-content").html('');
                $(".paper-details>.paper-content").html('Could not load paper data');
                $(".paper-details>.paper-tags").html("");
            }
        });
    }

    hidePaperCard(keepChevron = false) {
        this.paperSidebarToggle(false);
        if (!keepChevron) {
            $(".paper-sidebar-toggle").toggle(false);
        }
    }

    checkAndDisplay() {
        if (!this.viewer.mouse) return;

        const e = this.viewer.mouse;
        let m = this.viewer.mouse;

        if ($(".paper-details").is(":visible")) {
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
                }
            }
        } else {
            this.resetSelection();
        }
    }

    handlePointSelection(I) {
        const currentDeltVector = this.camera.position.clone().sub(I.location);
        const direction = currentDeltVector.normalize();
        const delt = 15;
        
        const targetPosition = I.location.clone().add(direction.multiplyScalar(delt));
        const targetLookAt = I.location.clone();
        
        const startPosition = this.camera.position.clone();
        const startLookAt = new THREE.Vector3();
        this.camera.getWorldDirection(startLookAt).multiplyScalar(10).add(this.camera.position);

        const duration = 2000;
        const tweenObj = { t: 0 };

        new TWEEN.Tween(tweenObj)
            .to({ t: 1 }, duration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                // Interpolate position
                this.camera.position.lerpVectors(startPosition, targetPosition, tweenObj.t);
                
                // Interpolate lookAt target
                const currentLookAt = new THREE.Vector3();
                currentLookAt.lerpVectors(startLookAt, targetLookAt, tweenObj.t);
                
                // Update viewer scene view
                this.viewer.scene.view.position.copy(this.camera.position);
                this.viewer.scene.view.lookAt(currentLookAt);
            })
            .onComplete(() => {
                // Set final position and orientation
                this.camera.position.copy(targetPosition);
                this.viewer.scene.view.position.copy(targetPosition);
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
                
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    resetSelection() {
        this.resetFocalSphere();
        this.hidePaperCard(false); // Hide chevron when unfocusing
    }

    // Bookmark functionality
    isPaperBookmarked(magId) {
        const bookmarks = JSON.parse(localStorage.getItem('paperBookmarks') || '[]');
        return bookmarks.some(bookmark => bookmark.magId === magId);
    }

    toggleBookmark(magId, title) {
        const bookmarks = JSON.parse(localStorage.getItem('paperBookmarks') || '[]');
        const index = bookmarks.findIndex(bookmark => bookmark.magId === magId);
        
        if (index === -1) {
            bookmarks.push({ magId, title, timestamp: Date.now() });
        } else {
            bookmarks.splice(index, 1);
        }
        
        localStorage.setItem('paperBookmarks', JSON.stringify(bookmarks));
        this.updateSavedUI();
    }

    updateSavedUI() {
        const savedList = $('#saved_list');
        savedList.empty();

        const bookmarks = JSON.parse(localStorage.getItem('paperBookmarks') || '[]');
        
        if (bookmarks.length === 0) {
            savedList.html('<div class="empty-state">No saved papers yet</div>');
            return;
        }

        bookmarks.slice().reverse().forEach(bookmark => {
            const item = $('<div class="saved-item"></div>');
            item.html(`
                <div class="saved-content">
                    <div class="saved-title">${bookmark.title || 'Untitled Paper'}</div>
                    <div class="saved-meta">MAG ID: ${bookmark.magId}</div>
                </div>
                <div class="saved-actions">
                    <span class="delete-btn">🗑️</span>
                </div>
            `);
            
            // Handle paper selection
            item.find('.saved-content').on('click', () => {
                const position = new THREE.Vector3(0, 0, 0); // Default position
                const I = {
                    point: { 
                        mag_id: [bookmark.magId],
                        rgba: [255, 255, 255, 255]
                    },
                    location: position
                };
                this.handlePointSelection(I);
                this.showPaperCard(bookmark.magId);
            });
            
            // Handle delete
            item.find('.delete-btn').on('click', (e) => {
                e.stopPropagation();
                this.toggleBookmark(bookmark.magId, bookmark.title);
                this.updateSavedUI();
            });
            
            savedList.append(item);
        });
    }

    paperSidebarToggle(visible) {
        const isCollapsed = !$(".paper-details").is(":visible");
        const nextState = visible !== undefined ? visible : isCollapsed;

        $(".paper-details").toggle(nextState);
        $("#potree_render_area").css('left', nextState ? '400px' : '0');

        if (nextState) $(".paper-sidebar-toggle").toggle(true); // make sure the toggle is visible if we're toggling on

        $(".paper-sidebar-toggle").css('left', nextState ? '440px' : '0');
        $(".paper-sidebar-toggle i").css('transform', nextState ? 'rotate(0deg)' : 'rotate(180deg)');
    }

    setupPaperSidebarToggle() {
        $('.paper-sidebar-toggle').on('click', () => this.paperSidebarToggle());
    }
} 