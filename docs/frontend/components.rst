Frontend Components
==================

This document details the core components of the frontend system.

Viewer (viewer.js)
----------------

The ``Viewer`` class handles 3D rendering and camera management.

Configuration
~~~~~~~~~~~~

* FOV: 60° (configurable)
* Point Budget: 500,000 points
* Lighting: Ambient and directional
* EDL (Eye-Dome Lighting) enabled

Features
~~~~~~~~

* Point cloud rendering
* Mesh overlay support
* Clipping planes
* Dynamic point size
* Logarithmic depth buffer

Controls (controls.js)
-------------------

The ``Controls`` class manages user interaction and camera movement.

Navigation
~~~~~~~~~

* Dynamic speed adjustment
* Boost mode (spacebar)
* Smooth transitions
* Orbit animations

Selection
~~~~~~~~

* Rectangle selection
* Point picking
* Year-based filtering
* Multi-selection support

Field Manager (fieldManager.js)
---------------------------

The ``FieldManager`` class handles academic field organization.

Features
~~~~~~~~

* Field hierarchy management
* Color scheme control
* Boundary visualization
* Interactive filtering

Paper Manager (paper.js)
--------------------

The ``PaperManager`` class manages paper data and interaction.

Features
~~~~~~~~

* Metadata management
* Position mapping
* Selection handling
* Search functionality
* History tracking

UI Manager (ui.js)
---------------

The ``UIManager`` class coordinates interface components.

Components
~~~~~~~~~

* Toolbar
* Field selection panel
* Year filter controls
* Information displays
* Loading overlays

Event System
~~~~~~~~~~

The frontend uses a custom event system for component communication:

.. code-block:: javascript

    // Subscribe to events
    eventBus.subscribe('paperSelected', (paper) => {
        // Handle paper selection
    });

    // Publish events
    eventBus.publish('paperSelected', paperData); 