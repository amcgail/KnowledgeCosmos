import { Viewer } from './viewer.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the viewer instance and make it globally accessible
    window.viewer = new Viewer();

    console.log('Test1')
    
    // Load the point cloud data
    window.viewer.loadPointCloud('/data/pointclouds/full/metadata.json', function(pc){
        // Store references
        window.main_pc = pc;
        window.viewer.startPresentation();
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