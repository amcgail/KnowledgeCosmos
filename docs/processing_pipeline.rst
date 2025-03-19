Processing Pipeline
=================

This document explains how the different components of the system work together to create the 3D visualization of academic papers.

Overview
--------

The system processes academic paper data through several stages:

1. Data Collection and Preparation
2. Vector Processing and Dimensionality Reduction
3. Field Mapping and Hierarchy
4. 3D Visualization Generation

Data Collection and Preparation
-----------------------------

The system starts with several data sources:

* **MAG Data**: Microsoft Academic Graph data containing paper information and field relationships
* **SPECTER Embeddings**: Pre-computed paper embeddings from the SPECTER model
* **Field Hierarchy**: Information about academic field relationships

The :mod:`backend.scripts.MAG` module handles MAG data integration, while the :mod:`backend.scripts.project_vectors` module manages the SPECTER embeddings.

Vector Processing and Dimensionality Reduction
-------------------------------------------

The high-dimensional SPECTER embeddings are reduced to 3D space for visualization:

1. **Sampling**: A subset of papers is sampled for UMAP training
2. **UMAP Fitting**: The UMAP model is trained on the sample
3. **Full Projection**: All papers are projected to 3D space

This is handled by the :mod:`backend.scripts.project_vectors` module, which provides functions like:

* :func:`SampleForUmap`: Creates a training sample
* :func:`FitUmapToSample`: Trains the UMAP model
* :func:`GetUmapEmbedding`: Projects all papers to 3D space

Field Mapping and Hierarchy
-------------------------

The system organizes papers into academic fields:

1. **Field Loading**: Loads field information from MAG data
2. **Hierarchy Building**: Constructs the field hierarchy
3. **Paper-Field Mapping**: Associates papers with their fields

The :mod:`backend.scripts.fields` module provides functions like:

* :func:`GetFieldNames`: Retrieves field information
* :func:`GetSubFields`: Builds the field hierarchy
* :func:`PaperToFields`: Maps papers to their fields

3D Visualization Generation
-------------------------

The system generates several types of 3D visualizations:

1. **Point Clouds**: Raw paper positions in 3D space
2. **Field Meshes**: Convex hulls around field clusters
3. **Labeled Regions**: Topic-labeled regions of the space

This involves several modules:

* :mod:`backend.scripts.pointclouds`: Generates point cloud visualizations
* :mod:`backend.scripts.mesh`: Creates field boundary meshes
* :mod:`backend.scripts.labels`: Generates topic labels for regions

Point Cloud Generation
~~~~~~~~~~~~~~~~~~~

The :mod:`backend.scripts.pointclouds` module provides functions like:

* :func:`ConvertPotree`: Converts LAS files to Potree format
* :func:`ProduceTopLevelPointCloud`: Creates the main visualization
* :func:`ProduceFieldPointClouds`: Generates field-specific visualizations

Mesh Generation
~~~~~~~~~~~~~

The :mod:`backend.scripts.mesh` module creates 3D meshes:

* :func:`WriteFieldMeshes`: Generates STL meshes for field boundaries
* Uses alpha shapes to create convex hulls around field clusters

Label Generation
~~~~~~~~~~~~~

The :mod:`backend.scripts.labels` module:

* Divides the space into voxels
* Analyzes papers in each voxel
* Uses GPT to generate topic labels
* Recursively subdivides diverse regions

Caching System
------------

Throughout the pipeline, the :mod:`backend.scripts.common` module's caching system is used to:

* Cache expensive computations
* Store intermediate results
* Enable incremental updates
* Improve performance

Example Usage
-----------

Here's a typical workflow:

.. code-block:: python

   from backend.scripts import project_vectors, fields, pointclouds, mesh

   # 1. Generate 3D embeddings
   embeddings = project_vectors.GetUmapEmbedding()

   # 2. Get field information
   field_names = fields.GetFieldNames()
   field_hierarchy = fields.GetSubFields()

   # 3. Generate point clouds
   pointclouds.ProduceTopLevelPointCloud()
   pointclouds.ProduceFieldPointClouds()

   # 4. Generate field meshes
   mesh.WriteFieldMeshes() 