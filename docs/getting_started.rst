Getting Started
===============

Quick Start
----------

This guide will help you get up and running with the Knowledge Cosmos quickly.

Prerequisites
~~~~~~~~~~~~

Before you begin, ensure you have:

* Python 3.8 or higher
* Git
* At least 8GB RAM
* 20GB free disk space
* For Windows: Visual Studio Build Tools
* For Linux/Mac: gcc and required build essentials

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

4. Create configuration file:

   Create a ``.env`` file in the root directory with:

   .. code-block:: bash

      DATA_FOLDER=/path/to/your/data/folder
      POTREE_CONVERTER=/path/to/potree_converter

Basic Usage
----------

1. **Process Your First Dataset**

   .. code-block:: python

      from backend.scripts import process_dataset
      
      # Process a sample dataset
      process_dataset("path/to/your/data")

2. **View the Results**

   Start the visualization server:

   .. code-block:: bash

      python run_server.py

   Then open http://localhost:8000 in your browser.

Common Issues
------------

1. **Missing Dependencies**
   
   If you see "ImportError", ensure all dependencies are installed:
   
   .. code-block:: bash

      pip install -r requirements.txt

2. **Data Folder Permissions**
   
   Ensure your DATA_FOLDER path has write permissions.

3. **Memory Issues**
   
   If you encounter memory errors, try:
   - Reducing the point cloud size
   - Increasing your system's swap space
   - Using the batch processing option

Next Steps
---------

- Read the :doc:`frontend` documentation for UI features
- Check :doc:`processing_pipeline` for detailed processing steps
- See :doc:`api/modules` for API documentation

Need Help?
---------

- Check our `GitHub Issues <https://github.com/yourusername/3dmap-repo/issues>`_
- Join our community discussions
- Read the full documentation at :doc:`index` 