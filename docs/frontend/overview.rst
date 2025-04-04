Frontend Overview
===============

The Knowledge Cosmos frontend provides an interactive visualization interface for exploring academic papers in 3D space. This document provides a high-level overview of the frontend system.

Key Components
------------

* **Viewer**: 3D visualization engine based on Potree
* **Controls**: User interaction and camera management
* **Field Manager**: Academic field organization and visualization
* **UI Manager**: User interface coordination
* **Paper Manager**: Paper data and interaction handling

Architecture
----------

.. code-block:: text

    +----------------+     +----------------+     +----------------+
    |     Viewer     |<--->|    Controls    |<--->|   UI Manager   |
    +----------------+     +----------------+     +----------------+
           ^                      ^                      ^
           |                      |                      |
           v                      v                      v
    +----------------+     +----------------+     +----------------+
    | Field Manager  |<--->| Paper Manager  |<--->|  Data Cache   |
    +----------------+     +----------------+     +----------------+

Getting Started
-------------

1. **Basic Navigation**
   - Use WASD/Arrow keys for movement
   - Right mouse button to rotate
   - Mouse wheel to zoom
   - Spacebar for speed boost

2. **Selection Tools**
   - Left click to select papers
   - Drag for rectangle selection
   - Use filters in the sidebar

3. **View Modes**
   - Flight mode for free navigation
   - Orbit mode for centered rotation
   - Slice mode for cross-sections

For detailed information about specific components, see:

* :doc:`components` - Detailed component documentation
* :doc:`best_practices` - Frontend development guidelines
* :doc:`../api/modules` - API reference 