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

Caching System Overview
-------------------

The project includes a powerful caching system implemented through the ``CacheWrapper`` class and ``@cache`` decorator. This system provides persistent caching of function results using pickle-based file storage, with support for memory caching to improve performance.

Features
~~~~~~~~

* **Persistent Storage**: Results are cached to disk using pickle files
* **Memory Caching**: In-memory caching to avoid repeated disk reads
* **Flexible Cache Keys**: MD5 hashing of function arguments
* **Parameter Control**: Ability to ignore specific parameters from cache keys
* **Default Value Handling**: Automatic handling of default parameter values
* **Module-based Organization**: Cache files are organized by module and function name

Usage Examples
~~~~~~~~~~~

Basic Usage:

.. code-block:: python

   from backend.scripts.common import cache

   @cache
   def expensive_computation(param1, param2):
       # Your expensive computation here
       return result

Ignoring Parameters:

.. code-block:: python

   @cache(ignore=['verbose'])
   def process_data(data, verbose=False):
       # The verbose parameter won't affect the cache key
       return result

Complete Example:

.. code-block:: python

   @cache(ignore=['debug'])
   def process_point_cloud(file_path, resolution=0.1, debug=False):
       """
       Process a point cloud file with caching.
       
       Args:
           file_path: Path to the point cloud file
           resolution: Processing resolution (affects cache key)
           debug: Debug flag (ignored in cache key)
       """
       # Your processing code here
       return processed_data

   # Normal usage
   result1 = process_point_cloud("data.pcd", resolution=0.1)

   # Force recalculation
   result2 = process_point_cloud.make(
       force=True,
       file_path="data.pcd",
       resolution=0.1
   )

API Reference
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

Implementation Details
-------------------

Cache File Structure
~~~~~~~~~~~~~~~~~~

Cache files are stored in the following structure::

    DATA_FOLDER/
    ├── cache/           # Cache storage
    │   └── scripts/     # Module-specific caches
    └── static/          # Static file storage

Each cache entry consists of:

1. **Metadata File** (``.yaml``)
   - Function signature
   - Parameter values
   - Creation timestamp
   - Version information

2. **Result File** (``.pkl``)
   - Pickled function result
   - Compressed when possible
   - Memory-mapped for large data

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

Performance Considerations
-----------------------

When using this module, consider:

* Cache file size growth
* Memory cache limits
* Disk space requirements
* Cache invalidation timing

Dependencies
----------

Required Python packages:

* ``pathlib``: Path manipulation
* ``pickle``: Data serialization
* ``hashlib``: MD5 hashing
* ``dotenv``: Environment configuration

Best Practices
-------------

1. **Use Keyword Arguments**: The caching system only supports keyword arguments
2. **Ignore Volatile Parameters**: Use the ``ignore`` parameter to exclude parameters that shouldn't affect caching
3. **Memory Management**: The system includes memory caching, but be mindful of memory usage with large results
4. **Cache Invalidation**: Use the ``force=True`` parameter when you need fresh results

Environment Setup
---------------

Make sure your ``.env`` file includes:

::

   DATA_FOLDER=/path/to/your/data/folder

This folder will be used to store all cache files. 