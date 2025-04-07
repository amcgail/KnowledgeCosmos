Getting Started
===============

Quick Start
----------

This guide will help you get up and running with the Knowledge Cosmos visualization.

Prerequisites
~~~~~~~~~~~~

Before you begin, ensure you have:

* Python 3.8 or higher (with `pip` and `venv`)
* Git
* [PotreeConverter](https://github.com/potree/PotreeConverter/releases) binary (download and note its path)
* AWS CLI (Optional: only required for deploying to S3 using the root `deploy.py` script)
* Sufficient RAM (16GB+ recommended, especially for UMAP processing) and Disk Space (100GB+ recommended, depending on MAG/SPECTER data size)
* For Windows: Visual Studio Build Tools (required for some Python package installations)
* For Linux/Mac: `gcc` and standard build essentials
* PostgreSQL Server (Optional: only required if using the topic labeling feature via `backend/scripts/labels.py`)

Installation
~~~~~~~~~~~

1. Clone the repository:

   .. code-block:: bash

      git clone https://github.com/yourusername/3dmap-repo.git
      cd 3dmap-repo

2. Create and activate a virtual environment:

   .. code-block:: bash

      # Windows
      python -m venv venv
      .\venv\Scripts\activate

      # Linux/Mac
      python -m venv venv
      source venv/bin/activate

3. Install dependencies:

   .. code-block:: bash

      pip install -r requirements.txt
      pip install RangeHTTPServer # Needed for the local development server

4. Create configuration file:

   Copy the example environment file and edit it:

   .. code-block:: bash

      cp .env.example .env

   Edit the `.env` file in the project root directory with the correct paths for your system:

   .. code-block:: text

      # Path to the directory where MAG data, SPECTER embeddings,
      # and generated outputs (cache, potrees, static files) will be stored.
      DATA_FOLDER=/path/to/your/data/folder

      # Full path to the PotreeConverter executable you downloaded.
      POTREE_CONVERTER=/path/to/PotreeConverter/PotreeConverter

      # Optional: S3 bucket name for deployment using the root deploy.py script
      # S3_BUCKET_NAME=your-s3-bucket-name

      # Optional: OpenAI API Key for the topic labeling feature
      # OPENAI_API_KEY=your-openai-api-key

   *Note:* The `DATA_FOLDER` will contain subdirectories like `MAG`, `vectors`, `cache`, `potrees`, `static` which are created or expected by the processing scripts. See :doc:`data_sources` for details on obtaining and structuring the input data.

   *Note:* The topic labeling feature (`backend/scripts/labels.py`) also currently expects a PostgreSQL database connection. The connection string is hardcoded in `labels.py`. If you plan to use this feature, ensure a PostgreSQL server is running and accessible, and update the connection string in the script if necessary. This feature appears optional for the core visualization.

5. (Optional) Modify Processing Parameters:

   You can adjust data processing parameters (like minimum paper counts, alpha shape values) by editing `backend/scripts/params.py`.

Data Processing
---------------

1. Ensure Data is Present: Make sure you have downloaded the required MAG and SPECTER data files and placed them in the correct subdirectories within your `DATA_FOLDER` as described in :doc:`data_sources`.

2. Run the Builder Script: Execute the main orchestration script located in the `backend` directory. This script performs all the necessary steps: UMAP projection, point cloud generation, mesh creation, and static data file generation.

   .. code-block:: bash

      python backend/cloud_builder.py

   This process can be time-consuming and computationally intensive, especially the UMAP embedding (`project_vectors.GetUmapEmbedding`) and point cloud generation steps. Intermediate results are cached in `DATA_FOLDER/cache` to speed up subsequent runs.

Viewing the Visualization
-------------------------

Once the processing is complete, you can view the visualization locally:

1. Navigate to the Frontend Directory:

   .. code-block:: bash

      cd frontend-html

2. Start the Local Server: Use a server that supports HTTP Range Requests, required by Potree.

   .. code-block:: bash

      python -m RangeHTTPServer 8000

   *(Note: If `RangeHTTPServer` is not found, ensure you installed it via pip as mentioned in the installation steps).*

3. Open in Browser: Open your web browser and go to `http://localhost:8000`.

Next Steps
----------

* Read the :doc:`frontend` documentation for UI features.
* Check :doc:`processing_pipeline` for detailed processing steps.
* Review :doc:`data_sources` for data requirements.
* See :doc:`api/modules` for API documentation.

Troubleshooting
---------------

* Import Errors: Ensure all dependencies from `requirements.txt` and `RangeHTTPServer` are installed in your active virtual environment. Check for build tool prerequisites (Visual Studio Build Tools on Windows, gcc on Linux/Mac).
* `PotreeConverter` Not Found: Double-check the `POTREE_CONVERTER` path in your `.env` file points to the actual executable. Ensure the binary has execute permissions.
* Data Not Loading: Verify the `DATA_FOLDER` path in `.env` is correct and that the required MAG/SPECTER data exists in the expected subdirectories. Check the browser's developer console for network errors when accessing `http://localhost:8000`. Ensure the `RangeHTTPServer` is running in the `frontend-html` directory.
* Memory Errors: Data processing, especially UMAP, can require significant RAM. Try closing other applications. If errors persist, you might need a machine with more memory or explore reducing the dataset size if feasible (though this requires code modification).
* Database Errors (Labels Feature): If running `labels.py` or encountering related errors, ensure PostgreSQL is running, accessible, and the connection string in `labels.py` is correct.
* AWS S3 Errors (Deployment): If using the root `deploy.py`, ensure AWS CLI is configured correctly with valid credentials and permissions for the specified `S3_BUCKET_NAME`.

Need Help?
---------

- Check our `GitHub Issues <https://github.com/yourusername/3dmap-repo/issues>`_
- Join our community discussions
- Read the full documentation at :doc:`index` 