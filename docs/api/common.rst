Core Utilities and Caching
=====================

The ``common`` module provides core functionality and utilities used throughout the project, with a particular focus on an efficient caching system.

Configuration Management
--------------------

The module handles configuration through environment variables and optional parameter files:

* **Environment Variables**
    - ``DATA_FOLDER``: Base directory for data storage
    - ``POTREE_CONVERTER``: Path to Potree converter executable

* **Parameter Loading**
    - Automatic loading from ``.env`` file
    - Optional ``params.py`` configuration
    - Runtime parameter overrides

Caching System
-----------

.. py:class:: CacheWrapper

   A sophisticated caching system that provides disk and memory-based result caching.

   Features:
   
   * Pickle-based file storage
   * MD5 hashing for cache keys
   * Memory caching layer
   * Parameter-based cache invalidation
   * Automatic handling of default values

   .. py:method:: __init__(func, ignore=None)

      Initialize the cache wrapper for a function.

      :param func: Function to be cached
      :param ignore: List of parameter names to ignore in cache key generation

   .. py:method:: hash(kwargs)

      Generate a unique hash for function arguments.

      :param kwargs: Function keyword arguments
      :returns: MD5 hash string

   .. py:method:: load(kwargs)

      Attempt to load cached results.

      :param kwargs: Function keyword arguments
      :returns: Cached result or None

   .. py:method:: save(kwargs, result)

      Save function results to cache.

      :param kwargs: Function keyword arguments
      :param result: Result to cache

Cache Decorator
~~~~~~~~~~~~

.. py:function:: cache(func=None, ignore=None)

   Decorator for adding caching to functions.

   :param func: Function to cache (optional for decorator syntax)
   :param ignore: Parameters to ignore in cache key generation
   :returns: Cached function wrapper

   Example usage:

   .. code-block:: python

      @cache(ignore=['debug'])
      def expensive_function(param1, debug=False):
          # Function implementation
          pass

Directory Structure
----------------

The module sets up the following directory structure::

    DATA_FOLDER/
    ├── cache/           # Cache storage
    │   └── scripts/     # Module-specific caches
    └── static/          # Static file storage

Cache File Format
--------------

Cache files are stored in two parts:

1. **Metadata File** (``.yaml``)
   - Function signature
   - Parameter values
   - Creation timestamp
   - Version information

2. **Result File** (``.pkl``)
   - Pickled function result
   - Compressed when possible
   - Memory-mapped for large data

Implementation Details
-------------------

Memory Management
~~~~~~~~~~~~~~

The caching system includes several memory optimization features:

* **Memory Cache**
    - In-memory result caching
    - Automatic cache invalidation
    - Memory usage monitoring
    - Cache size limits

* **Disk Operations**
    - Streaming pickle loading
    - Compressed storage
    - Memory-mapped files
    - Atomic writes

* **Cache Keys**
    - Parameter-based hashing
    - Configurable parameter ignoring
    - Version-aware keys
    - Collision handling

Performance Features
----------------

Several optimizations are implemented:

* **Load Time**
    - Memory caching
    - Quick hash lookups
    - Parallel loading
    - Lazy evaluation

* **Storage**
    - Compressed pickle files
    - Metadata separation
    - Directory organization
    - Cleanup utilities

* **Memory Usage**
    - Streaming operations
    - Reference counting
    - Garbage collection
    - Cache eviction

Dependencies
----------

Required Python packages:

* ``pathlib``: Path manipulation
* ``pickle``: Data serialization
* ``hashlib``: MD5 hashing
* ``dotenv``: Environment configuration

Example Usage
-----------

Basic usage of the caching system:

.. code-block:: python

   from backend.scripts.common import cache

   @cache
   def expensive_calculation(param1, param2):
       # Expensive computation here
       return result

   @cache(ignore=['debug'])
   def debug_function(param, debug=False):
       # Function with debug parameter
       return result

Error Handling
------------

The module handles several error cases:

* Missing cache files
* Corrupted cache data
* Version mismatches
* Permission issues

Performance Considerations
-----------------------

When using this module, consider:

* Cache file size growth
* Memory cache limits
* Disk space requirements
* Cache invalidation timing 