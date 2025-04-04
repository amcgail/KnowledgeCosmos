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
    window.fieldManager = new FieldManager();
    
    // Load the point cloud data
    window.viewer.loadPointCloud('/data/pointclouds/full/metadata.json', function(pc){
        // Store references
        window.main_pc = pc;
        window.viewer.startPresentation();

        // Load the full mesh after point cloud is loaded
        window.viewer.loadFullMesh().then(() => {
            console.log('Full mesh loaded successfully');
        }).catch(error => {
            console.error('Error loading full mesh:', error);
        });

        // Load fields and add annotations
        window.fieldManager.loadFields().then(() => {
            window.fieldManager.addFieldAnnotations();
        });

        // Mouse move tracking
        $(document).on('mousemove', (e) => {
            window.viewer.viewer.mouse = e.originalEvent;
        });

        // Mouse click handling
        $('canvas').on('mousedown', (e) => {
            if (e.originalEvent.button === 0) { // left-click only
                window.paperManager.checkAndDisplay();
            }
        });
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
});