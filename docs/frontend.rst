Frontend Documentation
=====================

The frontend of the Knowledge Cosmos provides an interactive visualization interface for exploring academic papers in 3D space. This document covers the architecture, components, and features of the frontend system.

Core Components
-------------

Viewer (viewer.js)
~~~~~~~~~~~~~~~~

The ``Viewer`` class is the main visualization component that handles the 3D rendering and camera management:

* **Initialization**
    - Sets up the Potree viewer with WebGL rendering
    - Configures lighting, camera, and initial view settings
    - Initializes Eye Dome Lighting (EDL) for better depth perception
    - Sets up render loop and frame management

* **Camera Controls**
    - Perspective camera with configurable FOV (default 60°)
    - Orbit controls for rotation and panning
    - Dynamic movement speed based on camera distance
    - Keyboard navigation (WASD/Arrow keys)

* **Visualization Features**
    - Point cloud rendering with configurable point budget (500,000 points)
    - Ambient and directional lighting for proper 3D shading
    - Clipping planes for slice-based exploration
    - Mesh overlay support for field boundaries

* **Performance Optimization**
    - Logarithmic depth buffer for handling large scale differences
    - Adaptive point size based on distance
    - Dynamic speed adjustment for smooth navigation
    - Frame-rate optimized render loop

Controls (controls.js)
~~~~~~~~~~~~~~~~~~~

The ``Controls`` class manages user interaction and camera movement:

* **Navigation**
    - Dynamic speed adjustment based on view distance
    - Boost mode with spacebar for faster movement
    - Smooth camera transitions for predefined views
    - Circular orbit animations

* **Selection Tools**
    - Rectangle selection for region-based exploration
    - Point picking for paper selection
    - Year-based filtering with animation support

* **View Modes**
    - Flight control for free navigation
    - Orbit control for centered rotation
    - Slice control for cross-section views
    - Label toggle for field annotations

* **Camera Animations**
    - Home view reset
    - Circular orbit around points of interest
    - Guided tour animations
    - Smooth transitions between views

Field Management
--------------

The ``FieldManager`` class (fieldManager.js) handles the organization and visualization of academic fields:

* **Field Hierarchy**
    - Top-level field management
    - Subfield organization
    - Color scheme management
    - Field-based filtering

* **Visualization Features**
    - Color-coded field regions
    - Interactive legend with field selection
    - Subfield highlighting
    - Field boundary meshes

* **Point Cloud Management**
    - Field-specific point cloud loading
    - Visibility toggling
    - Color scheme application
    - Cache management for performance

User Interface
------------

The ``UIManager`` class (ui.js) coordinates the user interface components:

* **Interface Elements**
    - Toolbar with tool selection
    - Field selection panel
    - Year filter controls
    - Information displays

* **Interaction Handling**
    - Tool state management
    - Panel visibility control
    - Filter application
    - Event coordination

Paper Management
-------------

The ``PaperManager`` class (paper.js) handles paper data and interaction:

* **Data Management**
    - Paper metadata loading
    - Position mapping
    - Field associations
    - Year information

* **Interaction Features**
    - Paper selection
    - Information display
    - Filtering support
    - Search functionality

Paper Management Details
--------------------

The ``PaperManager`` class provides comprehensive paper data handling and interaction:

* **Paper Data Handling**
    - Semantic Scholar API integration for paper metadata
    - Local caching of paper information
    - History tracking with localStorage persistence
    - Bookmark management for saved papers

* **Paper Selection**
    - Point cloud intersection detection
    - Paper highlighting with focal sphere
    - Smooth animations for selection feedback
    - Multi-paper selection support

* **History Management**
    - Chronological paper visit tracking
    - Position and color state preservation
    - Paper revisitation functionality
    - History cleanup and management

* **Paper Information Display**
    - Dynamic paper cards with metadata
    - Citation and reference information
    - Field association display
    - External link integration

* **Interaction Features**
    - Click-to-select functionality
    - History navigation
    - Bookmark toggling
    - Position memory

User Interface Details
------------------

The ``UIManager`` class provides a comprehensive interface management system:

* **Core UI Components**
    - Menu system with section management
    - Right sidebar with multiple tabs
    - Loading overlays and progress indicators
    - Error message system

* **Navigation Help**
    - Interactive tips system
    - Rotating tip display
    - Context-sensitive help
    - Navigation tutorials

* **Field Interface**
    - Field selection and filtering
    - Constellation management
    - Search functionality
    - Field highlighting

* **State Management**
    - Section visibility control
    - Active state tracking
    - Filter state management
    - UI synchronization

* **User Feedback**
    - Loading indicators
    - Progress tracking
    - Error messaging
    - Status updates

Interaction Patterns
-----------------

The frontend implements several key interaction patterns:

* **Navigation**
    - Direct camera control (WASD/Arrow keys)
    - Point cloud exploration
    - Field-based navigation
    - History-based navigation

* **Selection**
    - Point selection
    - Rectangle selection
    - Field selection
    - Multi-selection support

* **Filtering**
    - Year-based filtering
    - Field-based filtering
    - Constellation filtering
    - Combined filters

* **Information Access**
    - Paper information cards
    - Field information
    - Navigation help
    - System status

Best Practices
------------

The frontend implementation follows several best practices:

* **Performance**
    - Efficient data structures
    - Caching strategies
    - Lazy loading
    - Resource management

* **User Experience**
    - Responsive feedback
    - Progressive disclosure
    - Consistent interaction patterns
    - Clear visual hierarchy

* **Code Organization**
    - Modular architecture
    - Clear separation of concerns
    - Event-driven design
    - Reusable components

* **Maintainability**
    - Clear documentation
    - Consistent coding style
    - Error handling
    - Testing support

Performance Considerations
-----------------------

The frontend is optimized for handling large datasets:

* **Point Cloud Optimization**
    - Dynamic point budgeting
    - Level-of-detail management
    - Frustum culling
    - Octree-based rendering

* **Memory Management**
    - Point cloud caching
    - Texture management
    - Geometry instancing
    - Resource cleanup

* **Render Optimization**
    - Frame rate limiting
    - View-dependent updates
    - Batch processing
    - WebGL best practices 