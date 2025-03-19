Welcome to 3D Map Repository's documentation!
===========================================

This repository contains tools and utilities for processing and visualizing 3D map data, with a focus on academic paper visualization and field mapping.

.. toctree::
   :maxdepth: 2
   :caption: Contents:

   caching
   processing_pipeline
   api/modules
   data_sources

Features
--------

* **Powerful Caching System**: Efficient caching of expensive computations
* **3D Map Data Processing**: Tools for processing and visualizing point cloud data
* **Academic Field Mapping**: Integration with Microsoft Academic Graph (MAG) data
* **Vector Projection**: Tools for projecting and visualizing paper embeddings
* **Potree Integration**: Support for Potree Converter for efficient point cloud visualization
* **Field Hierarchy**: Tools for managing and visualizing academic field hierarchies
* **Topic Labeling**: Automatic topic labeling using GPT
* **Mesh Generation**: 3D mesh generation for field boundaries

Getting Started
--------------

1. Clone the repository
2. Create a `.env` file in the root directory with the following variables:
   ::

      DATA_FOLDER=/path/to/your/data/folder
      POTREE_CONVERTER=/path/to/potree_converter
3. Install dependencies

For detailed setup instructions, see the :doc:`caching` documentation.

Project Structure
---------------

The project is organized into several key components:

* **Backend Scripts**: Core processing and data management tools
  * Common utilities and caching system
  * Point cloud processing and visualization
  * Field management and hierarchy tools
  * Vector projection and embedding tools
  * MAG data integration
  * Mesh generation for field boundaries
  * Topic labeling using GPT

* **Data Sources**: Integration with various data sources
  * Microsoft Academic Graph (MAG)
  * SPECTER paper embeddings
  * Custom point cloud data

Processing Pipeline
-----------------

The system processes academic paper data through several stages:

1. Data Collection and Preparation
2. Vector Processing and Dimensionality Reduction
3. Field Mapping and Hierarchy
4. 3D Visualization Generation

See the :doc:`processing_pipeline` section for detailed information about how these components work together.

API Reference
------------

The complete API reference is available in the :doc:`api/modules` section, including:

* Common utilities and caching system
* Point cloud processing functions
* Field management tools
* Vector projection utilities
* MAG integration functions
* Mesh generation tools
* Topic labeling system

Data Sources
-----------

Information about the data sources used in this project:

* Microsoft Academic Graph (MAG) data
* SPECTER paper embeddings
* Custom point cloud data

See the :doc:`data_sources` section for more details.

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search` 