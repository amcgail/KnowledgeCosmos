Microsoft Academic Graph Integration
==============================

This module provides integration with the Microsoft Academic Graph (MAG) dataset.

Module Interface
--------------

.. py:module:: backend.scripts.MAG

.. py:function:: load_mag_data()

   Load and process the Microsoft Academic Graph data files.

   :returns: Tuple of (field_names, field_hierarchy)
   :rtype: tuple[dict, dict]

.. py:function:: process_mag_fields()

   Process field relationships and build the field hierarchy.

   :returns: Dictionary mapping field IDs to their parent fields
   :rtype: dict

.. py:function:: get_field_hierarchy()

   Get the complete field hierarchy structure.

   :returns: Dictionary representing the field hierarchy
   :rtype: dict

Implementation Details
-------------------

The module handles loading and processing of MAG data files:

* Field metadata from CSV files
* Field hierarchy relationships
* Paper-field associations
* Data validation and cleanup

Data Sources
----------

Required data files:

* ``FieldsOfStudy.txt.gz``: Field information
* ``PaperFieldsOfStudy.nt.bz2``: Paper-field mappings

File formats and schemas are documented in the MAG documentation. 