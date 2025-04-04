Academic Field Management
=====================

The ``fields`` module provides functionality for managing academic field hierarchies and their relationships with papers.

Module Interface
--------------

.. py:module:: backend.scripts.fields

.. py:function:: GetFieldNames(minimum_papers=1000, maximum_level=2, force_include=None)

   Retrieve academic field names from the Microsoft Academic Graph (MAG) data.

   :param minimum_papers: Minimum number of papers required for a field to be included
   :param maximum_level: Maximum hierarchy level to include (1=top level, 2=subfields, etc.)
   :param force_include: List of field names to include regardless of other criteria
   :returns: Dictionary mapping field IDs to field names
   :rtype: dict

.. py:function:: GetTopLevel()

   Get the list of top-level academic fields.

   :returns: List of field IDs that have no parents
   :rtype: list

.. py:function:: GetSubFields(MIN_PAPERS=1000)

   Get the hierarchical relationships between fields.

   :param MIN_PAPERS: Minimum number of papers required for a field to be included
   :returns: Dictionary mapping parent field IDs to lists of child field IDs
   :rtype: dict

.. py:function:: PointIterator(LIMIT=None)

   Core function that iterates through paper-field associations and maps them to 3D coordinates.

   :param LIMIT: Optional limit on number of papers to process (for testing)
   :returns: Tuple of (points_per_subfield, subfield_per_paper) mappings
   :rtype: tuple

.. py:function:: FieldNameToPoints(LIMIT=None)

   Get the 3D points associated with each field.

   :param LIMIT: Optional limit on number of papers to process
   :returns: Dictionary mapping field IDs to lists of 3D coordinates
   :rtype: dict

.. py:function:: PaperToFields(LIMIT=None)

   Get the fields associated with each paper.

   :param LIMIT: Optional limit on number of papers to process
   :returns: Dictionary mapping paper IDs to lists of field IDs
   :rtype: dict

.. py:function:: FieldToPapers(LIMIT=None)

   Get the papers associated with each field.

   :param LIMIT: Optional limit on number of papers to process
   :returns: Dictionary mapping field IDs to lists of paper IDs
   :rtype: dict

Implementation Details
-------------------

Data Sources
~~~~~~~~~~

The module works with several MAG data files:

* ``15.FieldsOfStudy.csv.zip``: Field metadata
* ``16.PaperFieldsOfStudy_*.csv.zip``: Paper-field associations
* ``13.FieldOfStudyChildren.csv.zip``: Field hierarchy

Field Hierarchy
~~~~~~~~~~~~

The field hierarchy is organized as follows:

* Level 1: Top-level fields (e.g., Physics, Mathematics)
* Level 2: Major subfields
* Level 3+: Specialized subfields (filtered out by default)

Field Selection
~~~~~~~~~~~~

Fields are filtered based on several criteria:

* Minimum paper count
* Maximum hierarchy level
* Force-included fields
* Parent-child relationships

Performance Features
----------------

The module includes several performance optimizations:

* **Caching**
    - Field name lookups
    - Subfield relationships
    - Point iteration results

* **Memory Management**
    - Streaming file reading
    - Dictionary-based lookups
    - Set-based filtering

* **Processing Efficiency**
    - ZIP file streaming
    - Batch processing
    - Early filtering

Dependencies
----------

Required Python packages:

* ``zipfile``: ZIP file handling
* ``io``: Text stream wrapping
* ``csv``: CSV file parsing
* ``collections``: defaultdict usage

Configuration
-----------

The module uses several configuration parameters:

* ``DATA_FOLDER``: Base directory for MAG data
* ``minimum_papers``: Threshold for field inclusion
* ``maximum_level``: Field hierarchy depth limit
* Cache configuration from common module

Example Usage
-----------

Basic usage for working with academic fields:

.. code-block:: python

   from backend.scripts import fields

   # Get field names
   field_names = fields.GetFieldNames(
       minimum_papers=1000,
       maximum_level=2
   )

   # Get field hierarchy
   subfields = fields.GetSubFields()

   # Get paper-field mappings
   paper_fields = fields.PaperToFields()
   field_papers = fields.FieldToPapers()

Error Handling
------------

The module handles several error cases:

* Missing data files
* Malformed CSV data
* Invalid field references
* Memory constraints

Performance Considerations
-----------------------

When using this module, consider:

* Memory usage for large datasets
* Processing time for field mappings
* Cache storage requirements
* Data file access patterns 