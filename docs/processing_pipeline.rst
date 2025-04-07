Processing Pipeline
=================

This document details the backend data processing pipeline that transforms raw academic data into the 3D visualizations displayed by the Knowledge Cosmos frontend.

Overview
--------

The pipeline involves several key stages, orchestrated by scripts within the `backend/scripts` directory:

1.  **Data Ingestion & Preparation**: Loading and preparing raw data from sources like the Microsoft Academic Graph (MAG) and pre-computed SPECTER embeddings.
2.  **Dimensionality Reduction**: Projecting high-dimensional SPECTER paper embeddings into a 3D space using UMAP.
3.  **Field Hierarchy Construction**: Organizing papers into a hierarchy of academic fields based on MAG data.
4.  **Visualization Asset Generation**: Creating the necessary files for the frontend, including point clouds and field boundary meshes.
5.  **Topic Labeling (Optional)**: Generating descriptive labels for dense regions within the 3D space using GPT.

Throughout the pipeline, a custom caching mechanism (`backend/scripts/common.py`) utilizing pickle and file hashing is employed to store intermediate results and avoid redundant computations, significantly speeding up reprocessing.

Data Ingestion & Preparation
-----------------------------

Raw data is sourced primarily from the Microsoft Academic Graph (MAG) dataset and pre-computed SPECTER embeddings for papers. The `backend/scripts/MAG.py` script interacts with a local database instance containing MAG data (specifically paper IDs and publication years via `GetIds` and `GetYears`), filtering it based on available embeddings. The `backend/scripts/project_vectors.py` module contains helper functions (`vec_it`, `portion_generator`) to efficiently iterate through the potentially large SPECTER embedding files, which are expected to be stored in the location specified by the `DATA_FOLDER` environment variable.

Dimensionality Reduction (UMAP)
---------------------------------

To visualize the high-dimensional SPECTER embeddings (which capture semantic relationships between papers), they are projected into a 3D space using the UMAP algorithm. This process is managed by `backend/scripts/project_vectors.py`:

1.  **Sampling (`SampleForUmap`)**: A representative subset of paper embeddings is sampled to train the UMAP model efficiently.
2.  **UMAP Model Training (`FitUmapToSample`)**: A UMAP `reducer` object is trained on the sampled embeddings to learn the mapping from high-dimensional space to 3D.
3.  **Full Projection (`GetUmapEmbedding`)**: The trained UMAP `reducer` is then used to transform the embeddings of *all* relevant papers into 3D coordinates. This function processes embeddings in chunks for memory efficiency and leverages the caching system.

The resulting 3D coordinates represent the semantic position of each paper in the visualization space.

Field Hierarchy Construction
---------------------------

The pipeline organizes papers into a hierarchical structure of academic fields using data from MAG. The `backend/scripts/fields.py` script handles this:

1.  **Loading Field Data (`GetFieldNames`, `GetSubFields`)**: It reads MAG files (`FieldsOfStudy.txt`, `FieldOfStudyChildren.csv`) to extract field names, levels, paper counts, and parent-child relationships, applying filters based on paper count and hierarchy level.
2.  **Mapping Papers to Fields (`PaperToFields`, `FieldToPapers`, `FieldNameToPoints`)**: It processes `PaperFieldsOfStudy.csv` files to link each paper (identified by MAG ID) to its associated field(s). Helper functions provide convenient lookups for paper-to-field and field-to-paper mappings, as well as retrieving the 3D points associated with each field.
3.  **Identifying Top-Level Fields (`GetTopLevel`)**: The script determines the top-level fields in the hierarchy, which are crucial for organizing the visualization.

Visualization Asset Generation
-----------------------------

Based on the 3D embeddings and field mappings, the pipeline generates assets required by the frontend visualization:

*   **Point Clouds (`backend/scripts/pointclouds.py`)**: Creates point cloud files in LAS format, later converted to the web-friendly Potree format using the external `PotreeConverter` tool (location specified by `POTREE_CONVERTER` environment variable).
    *   `ProduceTopLevelPointCloud`: Generates a single point cloud containing all papers, colored based on their 3D position.
    *   `ProduceFieldPointClouds`: Creates separate point clouds for each major academic field, where points (papers) are colored according to their subfield membership. This enables the frontend's field filtering feature.
    *   Paper metadata (MAG ID, publication year) is embedded within the LAS files for use in frontend interactions.

*   **Field Meshes (`backend/scripts/mesh.py`)**: Generates 3D mesh files (STL format) representing the boundaries of academic fields.
    *   `WriteFieldMeshes`: For each significant field (determined by paper count), it calculates an alpha shape (a generalization of a convex hull) around the 3D points of its associated papers. This function includes density filtering to focus on core areas of a field and uses `trimesh` and `alphashape` libraries.
    *   `GetFieldCenters`: Calculates representative center points and optimal camera positions for each field mesh, used for navigation and labeling in the frontend.

Topic Labeling (Optional)
-------------------------

The `backend/scripts/labels.py` module provides an optional step to automatically generate descriptive topic labels for dense regions within the 3D space. The `TopicLabeler` class works by:

1.  **Voxelizing Space**: Dividing the 3D bounding box of the papers into a grid of voxels.
2.  **Sampling Papers**: Selecting a sample of papers within each sufficiently dense voxel.
3.  **Querying GPT**: Sending the titles of the sampled papers to an OpenAI GPT model (requires API key) and asking for a concise topic label.
4.  **Storing Labels**: Saving the generated labels along with their corresponding voxel coordinates.

This process helps add semantic meaning to different areas of the visualized knowledge space.

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