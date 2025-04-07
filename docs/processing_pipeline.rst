Processing Pipeline
=================

This document details the backend data processing pipeline that transforms raw academic data into the 3D visualizations displayed by the Knowledge Cosmos frontend.

Overview
--------

The pipeline involves several key stages, primarily orchestrated by the `backend/cloud_builder.py` script, which calls functions within the `backend/scripts` directory:

1.  **Data Ingestion & Preparation**: Loading and preparing raw data from sources like the Microsoft Academic Graph (MAG) files and pre-computed SPECTER embeddings (``project_vectors.py``, ``MAG.py``, ``fields.py``).
2.  **Dimensionality Reduction**: Projecting high-dimensional SPECTER paper embeddings into a 3D space using UMAP (``project_vectors.py``).
3.  **Field Hierarchy Construction**: Organizing papers into a hierarchy of academic fields based on MAG data (``fields.py``).
4.  **Visualization Asset Generation**: Creating the necessary files for the frontend, including Potree point clouds (``pointclouds.py``) and field boundary meshes (``mesh.py``).
5.  **Frontend Metadata Generation**: Consolidating field hierarchy, colors, mesh paths, and center points into ``static/fields.json`` for the frontend (``backend/scripts/deploy.py``).
6.  **Topic Labeling (Optional)**: Generating descriptive labels for dense regions within the 3D space using GPT and data from a PostgreSQL database (``labels.py``).

Throughout the pipeline, a custom caching mechanism (``backend/scripts/common.py``) utilizing pickle and file hashing is employed to store intermediate results and avoid redundant computations, significantly speeding up reprocessing. Processing parameters can often be tuned via ``backend/scripts/params.py``.

Data Ingestion & Preparation
-----------------------------

Raw data is sourced primarily from the Microsoft Academic Graph (MAG) dataset files and pre-computed SPECTER paper embeddings.

*   **SPECTER Embeddings**: The ``backend/scripts/project_vectors.py`` module contains helper functions (``vec_it``, ``portion_generator``) to efficiently iterate through the potentially large SPECTER embedding files (``*.pkl``), which are expected to be stored in the ``DATA_FOLDER/vectors`` location specified by the environment variable.
*   **MAG Data**: Various scripts process MAG files located in ``DATA_FOLDER/MAG``:
    *   ``backend/scripts/MAG.py``: Processes ``Papers.txt.gz`` to extract publication years (``GetYears``) and potentially paper IDs (``GetIds``, although this seems primarily driven by filtering against available embeddings).
    *   ``backend/scripts/fields.py``: Reads MAG files (``FieldsOfStudy.csv.zip``, ``FieldOfStudyChildren.csv.zip``, ``PaperFieldsOfStudy_*.csv.zip``) to extract field names, hierarchy, and paper-to-field mappings (``GetFieldNames``, ``GetSubFields``, ``PaperToFields``, etc.).

Dimensionality Reduction (UMAP)
---------------------------------

To visualize the high-dimensional SPECTER embeddings (which capture semantic relationships between papers), they are projected into a 3D space using the UMAP algorithm. This process is managed by `backend/scripts/project_vectors.py`:

1.  **Sampling (``SampleForUmap``)**: A representative subset of paper embeddings is sampled to train the UMAP model efficiently.
2.  **UMAP Model Training (``FitUmapToSample``)**: A UMAP ``reducer`` object is trained on the sampled embeddings to learn the mapping from high-dimensional space to 3D.
3.  **Full Projection (``GetUmapEmbedding``)**: The trained UMAP ``reducer`` is then used to transform the embeddings of *all* relevant papers into 3D coordinates. This function processes embeddings in chunks for memory efficiency and leverages the caching system.

The resulting 3D coordinates represent the semantic position of each paper in the visualization space.

Field Hierarchy Construction
---------------------------

The pipeline organizes papers into a hierarchical structure of academic fields using data from MAG. The `backend/scripts/fields.py` script handles this:

1.  **Loading Field Data (``GetFieldNames``, ``GetSubFields``)**: It reads MAG files (``FieldsOfStudy.csv.zip``, ``FieldOfStudyChildren.csv.zip``) to extract field names, levels, paper counts, and parent-child relationships, applying filters based on paper count and hierarchy level (configurable via ``params.py``).
2.  **Mapping Papers to Fields (``PaperToFields``, ``FieldToPapers``, ``FieldNameToPoints``)**: It processes ``PaperFieldsOfStudy_*.csv.zip`` files to link each paper (identified by MAG ID) to its associated field(s). Helper functions provide convenient lookups for paper-to-field and field-to-paper mappings, as well as retrieving the 3D points associated with each field.
3.  **Identifying Top-Level Fields (``GetTopLevel``)**: The script determines the top-level fields in the hierarchy, which are crucial for organizing the visualization.

Visualization Asset Generation
-----------------------------

Based on the 3D embeddings and field mappings, the pipeline generates assets required by the frontend visualization:

*   **Point Clouds (``backend/scripts/pointclouds.py``)**: Creates point cloud files in LAS format, placed in ``DATA_FOLDER/potrees``. These are later converted to the web-friendly Potree format (using the external ``PotreeConverter`` tool specified by the ``POTREE_CONVERTER`` environment variable) via the ``ConvertPotreeAll`` function (often called by ``cloud_builder.py``).
    *   ``ProduceTopLevelPointCloud``: Generates a single point cloud containing all papers, colored based on their 3D position.
    *   ``ProduceFieldPointClouds``: Creates separate point clouds for each major academic field, where points (papers) are colored according to their subfield membership. This enables the frontend's field filtering feature.
    *   Paper metadata (MAG ID, publication year) is embedded within the LAS files for use in frontend interactions.

*   **Field Meshes (``backend/scripts/mesh.py``)**: Generates 3D mesh files (STL format) representing the boundaries of academic fields, saved to ``DATA_FOLDER/static/meshes``.
    *   ``WriteFieldMeshes``: For each significant field (determined by paper count, configurable via ``params.py``), it calculates an alpha shape (a generalization of a convex hull) around the 3D points of its associated papers. This function includes density filtering to focus on core areas of a field and uses ``trimesh`` and ``alphashape`` libraries.
    *   ``GetFieldCenters``: Calculates representative center points and optimal camera positions for each field mesh, used for navigation and labeling in the frontend.

Frontend Metadata Generation (`backend/scripts/deploy.py`)
-----------------------------------------------------------

After generating meshes and point clouds, the `backend/scripts/deploy.py` script (typically called by `cloud_builder.py`) gathers essential metadata for the frontend:

1.  It calls functions like ``fields.GetFieldNames``, ``fields.GetTopLevel``, ``fields.GetSubFields``, ``pointclouds.ProduceFieldPointClouds`` (to get color/order info), and ``mesh.GetFieldCenters``.
2.  It structures this data (field hierarchy, color mappings per field, available mesh files, top-level fields, display order, center points) into a single JSON object.
3.  This JSON object is saved to ``DATA_FOLDER/static/fields.json``. The frontend (``fieldManager.js``) loads this file to populate the field selection UI and manage the display of field-specific point clouds and meshes.

Topic Labeling (Optional - `labels.py`)
--------------------------------------

The `backend/scripts/labels.py` module provides an optional step to automatically generate descriptive topic labels for dense regions within the 3D space. This feature has specific dependencies:

*   **PostgreSQL Database**: It requires a PostgreSQL database populated with paper data, including 3D positions (``pos_x``, ``pos_y``, ``pos_z``) and metadata (``info_json``). The connection string is currently hardcoded within the ``TopicLabeler`` class.
*   **OpenAI API Key**: It uses the OpenAI API (specifically ``gpt-4-mini``) to generate labels based on paper titles fetched from the database. An API key must be provided when initializing the ``TopicLabeler``.

The `TopicLabeler` class works by:

1.  **Connecting to DB**: Establishes a connection using `psycopg2`.
2.  **Voxelizing Space**: Dividing the 3D bounding box of the papers (obtained from the DB) into a grid of voxels.
3.  **Sampling Papers**: Selecting a sample of papers (fetching titles from ``info_json`` in the DB) within each sufficiently dense voxel.
4.  **Querying GPT**: Sending the titles to the OpenAI GPT model and asking for a concise topic label.
5.  **Storing Labels**: Accumulating the generated labels along with their corresponding voxel coordinates.

This process helps add semantic meaning to different areas of the visualized knowledge space but is not essential for the core visualization functionality.

Running the Pipeline
--------------------

The entire backend processing pipeline is typically run using the main orchestration script:

.. code-block:: bash

   # Ensure your .env file is configured correctly
   # Make sure you are in the project root directory
   python backend/cloud_builder.py

This script will execute the necessary steps, utilizing the cache for efficiency. Monitor the console output for progress and potential errors. 