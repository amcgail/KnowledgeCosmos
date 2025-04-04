3D Mesh Generation
================

The ``mesh`` module provides functionality for generating and managing 3D meshes that represent academic field boundaries.

Core Functions
------------

.. py:function:: WriteFieldMeshes(MIN_POINTS_MESH=40000, ALPHA=3, MIN_DENSITY=50, NUM_THREADS=4)

   Generate 3D mesh representations for academic fields using alpha shapes.

   :param MIN_POINTS_MESH: Minimum number of points required to generate a mesh
   :param ALPHA: Alpha value for alpha shape generation (controls mesh tightness)
   :param MIN_DENSITY: Minimum point density threshold for inclusion
   :param NUM_THREADS: Number of threads for parallel processing
   :returns: List of field names for which meshes were generated
   :rtype: list

.. py:function:: GetFieldCenters()

   Calculate centers and optimal camera positions for field meshes.

   :returns: Dictionary mapping field names to their centers and camera positions
   :rtype: dict

.. py:function:: calculate_camera_position(mesh, center, global_center, fov_degrees=60, scale=100)

   Calculate optimal camera position for viewing a mesh.

   :param mesh: The mesh being viewed
   :param center: Center of the specific mesh
   :param global_center: Center point of all meshes combined
   :param fov_degrees: Field of view in degrees
   :param scale: Scale factor for distance
   :returns: Optimal camera position as [x, y, z]
   :rtype: list

Density Calculation Functions
--------------------------

.. py:function:: calculate_point_density(points, radius=0.1, num_threads=4)

   Calculate local point density using parallel processing.

   :param points: Nx3 array of point coordinates
   :param radius: Search radius for density calculation
   :param num_threads: Number of threads for parallel processing
   :returns: Array of density values for each point
   :rtype: numpy.ndarray

.. py:function:: calculate_grid_density(points, grid_size=32)

   Calculate point density using a grid-based approach.

   :param points: Nx3 array of point coordinates
   :param grid_size: Number of grid cells per dimension
   :returns: Array of density values for each point
   :rtype: numpy.ndarray

Implementation Details
-------------------

Mesh Generation Process
~~~~~~~~~~~~~~~~~~~~

The mesh generation process involves several steps:

1. **Point Cloud Processing**
   
   * Filter points based on minimum count threshold
   * Calculate point density using hybrid approach
   * Remove sparse regions
   * Sample points if count exceeds maximum

2. **Alpha Shape Generation**

   * Apply alpha shape algorithm to point cloud
   * Control mesh tightness with alpha parameter
   * Generate triangulated surface
   * Export as STL format

3. **Camera Position Calculation**

   * Calculate mesh centers and bounds
   * Determine optimal viewing distances
   * Account for field of view
   * Ensure inward-facing views

4. **Performance Optimization**

   * Parallel density calculation
   * Efficient point sampling
   * Memory management
   * Result caching

Density Calculation
~~~~~~~~~~~~~~~~

The module uses a hybrid approach for density calculation:

* **Grid-based Method**
    - Fast initial density estimation
    - Uniform grid partitioning
    - Cell-based counting
    - Memory efficient

* **Local Method**
    - KD-tree based neighbor search
    - Radius-based density calculation
    - Parallel processing
    - More accurate but slower

* **Combined Approach**
    - Weighted combination of both methods
    - Balances accuracy and speed
    - Adaptive to point distribution
    - Robust to outliers

Dependencies
----------

The module requires several external libraries:

* ``alphashape``: Alpha shape generation
* ``trimesh``: Mesh processing
* ``numpy``: Numerical operations
* ``scipy``: Spatial data structures
* ``concurrent.futures``: Parallel processing

Configuration
-----------

Key configuration parameters:

* ``MIN_POINTS_MESH``: Minimum points for mesh generation
* ``ALPHA``: Controls mesh tightness
* ``MIN_DENSITY``: Density threshold
* ``NUM_THREADS``: Parallel processing threads

Example Usage
-----------

Basic usage for generating field meshes:

.. code-block:: python

   from backend.scripts import mesh

   # Generate meshes for all fields
   field_names = mesh.WriteFieldMeshes(
       MIN_POINTS_MESH=40000,
       ALPHA=3,
       MIN_DENSITY=50
   )

   # Get field centers and camera positions
   field_centers = mesh.GetFieldCenters()

Performance Considerations
-----------------------

When using this module, consider:

* Memory usage for large point clouds
* Processing time for density calculation
* Mesh complexity vs. visualization performance
* Parallel processing resource usage 