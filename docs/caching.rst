Caching System
=============

Overview
--------

The project includes a powerful caching system implemented through the ``CacheWrapper`` class and ``@cache`` decorator. This system provides persistent caching of function results using pickle-based file storage, with support for memory caching to improve performance.

Features
--------

* **Persistent Storage**: Results are cached to disk using pickle files
* **Memory Caching**: In-memory caching to avoid repeated disk reads
* **Flexible Cache Keys**: MD5 hashing of function arguments
* **Parameter Control**: Ability to ignore specific parameters from cache keys
* **Default Value Handling**: Automatic handling of default parameter values
* **Module-based Organization**: Cache files are organized by module and function name

Usage
-----

Basic Usage
~~~~~~~~~~

.. code-block:: python

   from backend.scripts.common import cache

   @cache
   def expensive_computation(param1, param2):
       # Your expensive computation here
       return result

Ignoring Parameters
~~~~~~~~~~~~~~~~~

Sometimes you want to ignore certain parameters when creating cache keys:

.. code-block:: python

   @cache(ignore=['verbose'])
   def process_data(data, verbose=False):
       # The verbose parameter won't affect the cache key
       return result

Force Recalculation
~~~~~~~~~~~~~~~~~

You can force recalculation of results even if a cache exists:

.. code-block:: python

   # Force recalculation
   result = cached_function.make(force=True, param1=value1, param2=value2)

Cache File Structure
------------------

Cache files are stored in the following structure:

::

   {DATA_FOLDER}/cache/{module}/{function_name}_{hash}.pkl

Where:
* ``{DATA_FOLDER}`` is configured in your ``.env`` file
* ``{module}`` is the module name of the cached function
* ``{function_name}`` is the name of the cached function
* ``{hash}`` is an MD5 hash of the function arguments

Best Practices
-------------

1. **Use Keyword Arguments**: The caching system only supports keyword arguments
2. **Ignore Volatile Parameters**: Use the ``ignore`` parameter to exclude parameters that shouldn't affect caching
3. **Memory Management**: The system includes memory caching, but be mindful of memory usage with large results
4. **Cache Invalidation**: Use the ``force=True`` parameter when you need fresh results

Example
-------

Here's a complete example showing various features:

.. code-block:: python

   from backend.scripts.common import cache

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

   # Same parameters - uses cache
   result2 = process_point_cloud("data.pcd", resolution=0.1)

   # Different resolution - new cache entry
   result3 = process_point_cloud("data.pcd", resolution=0.2)

   # Force recalculation
   result4 = process_point_cloud.make(
       force=True,
       file_path="data.pcd",
       resolution=0.1
   )

Technical Details
---------------

The caching system uses:
* Pickle for serialization
* MD5 hashing for cache keys
* A two-level caching system (memory + disk)
* Automatic handling of default parameter values
* Module-based organization for cache files

Environment Setup
---------------

Make sure your ``.env`` file includes:

::

   DATA_FOLDER=/path/to/your/data/folder

This folder will be used to store all cache files. 