import { Viewer } from './viewer.js';
import { Controls } from './controls.js';
import { PaperManager } from './paper.js';
import { UIManager } from './ui.js';
import { FieldManager } from './fieldManager.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the viewer instance and make it globally accessible
    window.viewer = new Viewer();

    window.controls = new Controls(window.viewer.viewer);
    window.paperManager = new PaperManager(window.viewer.viewer);
    window.uiManager = new UIManager();
    
    // Load the point cloud data
    window.viewer.loadPointCloud('/data/pointclouds/full/metadata.json', function(pc){
        // Store references
        window.main_pc = pc;
        
        // Check if we should skip intro
        if (window.viewer.settingsManager.getSetting('navigation', 'skipIntro')) {
            window.viewer.skip_intro();
        } else {
            window.viewer.startPresentation();
        }

        // Load the full mesh after point cloud is loaded
        window.viewer.loadFullMesh().then(() => {
            console.log('Full mesh loaded successfully');
        }).catch(error => {
            console.error('Error loading full mesh:', error);
        });

        // Mouse move tracking
        $(document).on('mousemove', (e) => {
            window.viewer.viewer.mouse = e.originalEvent;
        });

        // Mouse click handling with drag detection
        let mouseDownPos = null;
        $('canvas').on('mousedown', (e) => {
            if (e.originalEvent.button === 0) { // left-click only
                mouseDownPos = { x: e.clientX, y: e.clientY };
            }
        });

        // Disable default double-click zoom
        const orbitControls = window.viewer.viewer.orbitControls;
        orbitControls.removeEventListeners('dblclick');

        // Add double-click handler to adjust lookAt before zoom
        function dblclick(e) {
            // First 'lookAt' a spot right in front of the camera
            window.viewer.lookDownNose();

            // Then do the default behavior
            orbitControls.zoomToLocation(e.mouse);
        }
        window.viewer.viewer.orbitControls.addEventListener('dblclick', dblclick);

        $('canvas').on('mouseup', (e) => {
            if (e.originalEvent.button === 0 && mouseDownPos) { // left-click only
                const dx = e.clientX - mouseDownPos.x;
                const dy = e.clientY - mouseDownPos.y;
                const dragDistance = Math.sqrt(dx * dx + dy * dy);
                
                // Only trigger if drag distance is very small (less than 5 pixels)
                if (dragDistance < 5) {
                    window.paperManager.checkAndDisplay();
                }
                mouseDownPos = null;
            }
        });

        // Apply settings on startup
        window.viewer.applySettings();
    });

    // Start the render loop
    window.viewer.startRenderLoop();
    
    // Set initial camera position and look-at point
    window.viewer.viewer.scene.view.position.set(28910, 74489, -6947);
    window.viewer.viewer.scene.view.lookAt(573.5842551496426, 450.36947654709786, 418.62651746203494);
    
    // Hide UI elements initially
    $('#tips_link').hide();
    $('#comment_link').hide();
    $('#menu .title').hide();
    $('#menu .item').hide();

    // Initialize the tour helper
    initTourHelper();
});

// Initialize the tour helper
function initTourHelper() {
    const celesteHelper = document.querySelector('.celeste-helper');
    if (celesteHelper) {
        // Keep Celeste hidden by default on page load
        celesteHelper.style.display = 'none';
        
        // Add event listeners for tooltip
        celesteHelper.addEventListener('mouseenter', () => {
            const tooltip = celesteHelper.querySelector('.celeste-tooltip');
            if (tooltip) tooltip.classList.add('visible');
        });
        
        celesteHelper.addEventListener('mouseleave', () => {
            const tooltip = celesteHelper.querySelector('.celeste-tooltip');
            if (tooltip) tooltip.classList.remove('visible');
        });
        
        // Load SVG if not already loaded
        if (!celesteHelper.querySelector('svg')) {
            fetch('/static/celeste.svg')
                .then(response => response.text())
                .then(svgContent => {
                    // Keep the tooltip
                    const tooltip = celesteHelper.querySelector('.celeste-tooltip');
                    celesteHelper.innerHTML = svgContent;
                    if (tooltip) celesteHelper.appendChild(tooltip);
                })
                .catch(error => console.error('Failed to load Celeste SVG:', error));
        }
    }
}