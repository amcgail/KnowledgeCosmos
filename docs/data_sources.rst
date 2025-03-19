Data Sources
===========

This project integrates with several data sources to create the 3D visualization of academic papers and fields.

Microsoft Academic Graph (MAG)
----------------------------

The Microsoft Academic Graph (MAG) data is used to provide information about academic papers and their fields of study.

Data Files
~~~~~~~~~

The following MAG data files are used:

* ``FieldsOfStudy.csv.zip``: Contains information about academic fields
* ``PaperFieldsOfStudy_*.csv.zip``: Contains paper-to-field mappings
* ``FieldOfStudyChildren.csv.zip``: Contains field hierarchy information

Data Access
~~~~~~~~~

The MAG data can be accessed from:
* Fields of Study: https://zenodo.org/records/2628216
* Paper-Field mappings: https://zenodo.org/records/4617285

SPECTER Paper Embeddings
----------------------

SPECTER embeddings are used to create the 3D visualization of papers.

Data Files
~~~~~~~~~

The SPECTER vectors used in this project can be downloaded from:
https://zenodo.org/records/4917086

The files are named ``paper_specter_{i}.pkl`` and take up approximately 54GB in total.

Model Information
~~~~~~~~~~~~~~~

* The SPECTER model is open source and available at: https://github.com/allenai/specter
* A newer version (SPECTER2) was released in November 2023
* The model can be used to generate embeddings for new papers

Point Cloud Data
--------------

The project generates and processes point cloud data for visualization.

Data Structure
~~~~~~~~~~~

Point cloud data is stored in the following structure:
::

   {DATA_FOLDER}/potrees/
   ├── full.las           # Complete point cloud of all papers
   └── {field_name}.las   # Field-specific point clouds

File Format
~~~~~~~~~

* Input: LAS format point clouds
* Output: Potree format for efficient web visualization

Processing Pipeline
~~~~~~~~~~~~~~~~

1. Generate point cloud from paper embeddings
2. Add color information based on field assignments
3. Convert to Potree format for web visualization

Environment Setup
--------------

Make sure your ``.env`` file includes the necessary paths:

::

   DATA_FOLDER=/path/to/your/data/folder
   POTREE_CONVERTER=/path/to/potree_converter

The ``DATA_FOLDER`` should contain:
* ``MAG/``: Directory for MAG data files
* ``potrees/``: Directory for point cloud data
* ``cache/``: Directory for cached computations 