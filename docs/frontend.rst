Frontend Documentation
=====================

This document covers the architecture, key components, and features of the Knowledge Cosmos frontend system, served from the `frontend-html` directory.

Core Components
-------------

The frontend is built using vanilla JavaScript (ES6 Modules), leveraging libraries like Three.js, Potree, jQuery, and js-yaml. It comprises several key modules found in `frontend-html/js/`:

*   `main.js`: Entry point that initializes all other modules and starts the application.
*   `viewer.js` (`Viewer` class): Core rendering engine using Potree and Three.js. Manages the Potree viewer instance, WebGL context, lighting, camera, render loop, and loading of the main point cloud (`/data/pointclouds/full/metadata.json`) and potentially field-specific clouds. Implements Eye Dome Lighting (EDL) and performance optimizations.
*   `controls.js` (`Controls` class): Handles user input for scene navigation (orbit controls, WASD/Arrow keys for movement, R/F for up/down) and interaction (point picking, rectangle selection - although rectangle selection might be handled elsewhere).
*   `fieldManager.js` (`FieldManager` class): Manages the display and interaction with academic fields. Loads field hierarchy, color schemes, and mesh information from `static/fields.json`. Handles the dynamic loading/unloading of field-specific Potree point clouds (`/data/pointclouds/{field_name}/metadata.json`) and STL meshes (`/data/static/meshes/{field_name}.stl`) based on user selections in the UI. Manages the field legend and filtering.
*   `paper.js` (`PaperManager` class): Handles data and interactions related to individual papers. Fetches detailed paper metadata (title, authors, abstract, etc.) from the `Semantic Scholar API <https://api.semanticscholar.org/api-docs/>`_ using the MAG ID obtained from point selection. Displays this information in a dedicated sidebar panel. Manages viewing history and bookmarks using `localStorage`.
*   `ui.js` (`UIManager` class): Orchestrates the overall user interface using jQuery. Manages menus, sidebars (for fields, constellations, history, paper details), information panels, loading indicators, help tips, and search functionality within panels. Coordinates interactions between UI elements and visualization components.
*   `utils.js`: Contains helper functions (e.g., color manipulation).

Data Flow
---------

1.  **Initialization (`main.js`)**: Sets up the `Viewer`, `Controls`, `PaperManager`, `UIManager`, and `FieldManager`.
2.  **Main Point Cloud Load (`viewer.js`)**: Loads the base Potree point cloud (`/data/pointclouds/full/metadata.json`) containing all papers.
3.  **Field Metadata Load (`fieldManager.js`)**: Fetches `static/fields.json` (generated by the backend `backend/scripts/deploy.py` script) which contains the field hierarchy, color maps, mesh availability, and center points.
4.  **UI Population (`ui.js`, `fieldManager.js`)**: The UI elements (field list, constellation list) are populated based on the data from `fields.json`.
5.  **User Interaction (Fields/Constellations)**:
    *   When a user selects a field to view its point cloud, `FieldManager` tells `Viewer` to load the corresponding Potree dataset (e.g., `/data/pointclouds/Computer Science/metadata.json`).
    *   When a user toggles a constellation (field mesh), `FieldManager` loads the corresponding STL file (e.g., `/data/static/meshes/Computer Science.stl`) using Three.js's `STLLoader` and adds it to the scene.
6.  **User Interaction (Point Selection)**:
    *   User clicks on a point in the Potree visualization.
    *   `Controls` (or potentially `PaperManager` via event listeners set up in `main.js`) detects the click and Potree identifies the selected point(s).
    *   `PaperManager` extracts the MAG ID from the selected point's attributes.
    *   `PaperManager` calls the Semantic Scholar API via AJAX (`getPaperData` function) to fetch details for that MAG ID.
    *   `PaperManager` updates the paper details panel in the UI.
    *   `PaperManager` adds the paper to the viewing history.

Key Features
------------

*   **Interactive 3D Visualization**: Smooth exploration of millions of points representing academic papers using Potree.
*   **Field Filtering**: Dynamically load and view point clouds for specific high-level academic fields, colored by subfield.
*   **Constellation Visualization**: Overlay 3D wireframe meshes (STLs generated via alpha shapes) representing field boundaries.
*   **Paper Details**: Select individual points (papers) to view detailed metadata (title, abstract, authors, venue, year, DOI link) fetched live from Semantic Scholar.
*   **History & Bookmarks**: Track recently viewed papers and save favorites using browser `localStorage`.
*   **Intuitive Controls**: Orbiting camera, WASD/Arrow key movement, and mouse interactions for navigation and selection.
*   **Performance**: Leverages Potree's level-of-detail rendering, caching (Semantic Scholar results, potentially others), and optimized data structures.

Running Locally
---------------

To view the frontend locally after running the backend processing (`backend/cloud_builder.py`):

1.  Navigate to the `frontend-html` directory.
2.  Start a local web server that supports HTTP Range Requests (required by Potree). Ensure `RangeHTTPServer` is installed (`pip install RangeHTTPServer`).

    ```bash
    python -m RangeHTTPServer 8000
    ```

3.  Open `http://localhost:8000` in your browser.

Development Best Practices
--------------------------

(Content from `frontend/best_practices.rst` should be included here or linked if the file exists). General practices likely include:

*   Code modularity (as seen with the different JS classes).
*   Clear separation of concerns (rendering vs. controls vs. data management vs. UI).
*   Use of ES6 modules for better organization.
*   Efficient event handling.
*   Considering performance bottlenecks with large datasets and DOM manipulation.
*   Appropriate use of caching. 