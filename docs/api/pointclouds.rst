Point Cloud Processing
===================

The ``pointclouds`` module provides functionality for processing and visualizing 3D point cloud data representing academic papers.

Core Functions
------------

.. py:function:: ConvertPotree(input_las_path)

   Convert a LAS file to Potree format for web visualization.

   :param input_las_path: Path to the input LAS file
   :type input_las_path: str or Path
   :raises subprocess.CalledProcessError: If Potree conversion fails

.. py:function:: ConvertPotreeAll()

   Convert all LAS files in the potrees directory to Potree format.
   Only processes files that correspond to top-level fields.

   :returns: "Success" if all conversions complete
   :rtype: str

.. py:function:: ProduceTopLevelPointCloud()

   Generate a point cloud visualization of all papers in the top-level embedding.
   Points are colored based on their position in the embedding space.

   Features:
   
   * Converts 3D embeddings to point cloud format
   * Applies color coding based on spatial position
   * Adds noise for better visual distinction
   * Stores paper metadata in point attributes
   * Optimizes for web visualization

   :returns: Path to the generated LAS file
   :rtype: Path

.. py:function:: ProduceFieldPointClouds(debug=False)

   Generate point cloud visualizations for each top-level field.
   Points are colored based on their subfield membership.

   Features:

   * Separate point cloud for each academic field
   * Color coding based on subfield hierarchy
   * Year-based filtering support
   * Optimized for interactive visualization

   :param debug: If True, limit processing to one field for testing
   :type debug: bool
   :returns: Dictionary mapping field names to point cloud paths
   :rtype: dict

Implementation Details
-------------------

Point Cloud Generation
~~~~~~~~~~~~~~~~~~~~

The point cloud generation process involves several steps:

1. **Embedding Processing**
   
   * Load paper embeddings from UMAP projection
   * Filter to valid paper IDs from MAG data
   * Scale coordinates to visualization space
   * Add paper metadata (ID, year)

2. **Color Assignment**

   * Position-based coloring for main cloud
   * Subfield-based coloring for field clouds
   * Noise addition for visual distinction
   * Alpha channel for transparency

3. **File Format**

   * LAS format for point cloud storage
   * Custom attributes for paper metadata
   * Potree format for web visualization
   * Optimized file structure

4. **Performance Optimization**

   * Efficient memory usage
   * Batch processing
   * Caching of intermediate results
   * Parallel processing support

Visualization Features
~~~~~~~~~~~~~~~~~~~

The generated point clouds support several visualization features:

* **Interactive Exploration**
    - Dynamic loading
    - Level-of-detail rendering
    - Frustum culling
    - Point size adaptation

* **Filtering Support**
    - Year-based filtering
    - Field-based filtering
    - Combined filters
    - Dynamic updates

* **Metadata Integration**
    - Paper ID lookup
    - Year information
    - Field associations
    - Position tracking

* **Performance Features**
    - Octree organization
    - Progressive loading
    - Memory optimization
    - Render optimization

Dependencies
----------

The module requires several external dependencies:

* ``laspy``: LAS file handling
* ``numpy``: Numerical operations
* ``matplotlib``: Color processing
* ``Potree Converter``: Web visualization format

Configuration
-----------

The module uses several configuration parameters from the environment:

* ``DATA_FOLDER``: Base directory for data storage
* ``POTREE_CONVERTER``: Path to Potree converter executable
* Cache configuration from common module

Example Usage
-----------

Basic usage for generating point clouds:

.. code-block:: python

   from backend.scripts import pointclouds

   # Convert all field point clouds to Potree format
   pointclouds.ConvertPotreeAll()

   # Generate main point cloud
   output_file = pointclouds.ProduceTopLevelPointCloud()

   # Generate field-specific point clouds
   field_clouds = pointclouds.ProduceFieldPointClouds()

Error Handling
------------

The module includes error handling for common issues:

* Missing input files
* Conversion failures
* Memory limitations
* Invalid metadata

Performance Considerations
-----------------------

When using this module, consider:

* Memory usage for large point clouds
* Disk space for output files
* Processing time for conversions
* Web loading performance 