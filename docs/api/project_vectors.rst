Vector Projection
===============

The ``project_vectors`` module handles the dimensionality reduction of paper embeddings from high-dimensional SPECTER vectors to 3D space using UMAP.

Core Functions
------------

.. py:function:: GetUmapEmbedding(CHUNK_SIZE=10000, SAMPLE_SIZE=100000, DEBUG=False)

   Project all paper vectors to 3D space using UMAP.

   :param CHUNK_SIZE: Number of vectors to process in each batch
   :param SAMPLE_SIZE: Number of vectors to use for UMAP fitting
   :param DEBUG: If True, use simplified sampling for testing
   :returns: Dictionary mapping paper IDs to 3D coordinates
   :rtype: dict
   :cached: True

.. py:function:: FitUmapToSample(SAMPLE_SIZE=1000000, DEBUG=False)

   Create and fit a UMAP reducer using a sample of paper vectors.

   :param SAMPLE_SIZE: Number of vectors to use for fitting
   :param DEBUG: If True, use simplified sampling
   :returns: Fitted UMAP reducer
   :rtype: umap.UMAP
   :cached: True
   :note: Requires ~10GB RAM for 100k sample

Helper Functions
-------------

.. py:function:: vec_it(limit=None, start=None, filename=None)

   Iterator for reading SPECTER vectors from pickle files.

   :param limit: Maximum number of vectors to yield
   :param start: Number of vectors to skip at start
   :param filename: Specific vector file to read (or all if None)
   :yields: Tuples of (paper_id, vector)

.. py:function:: portion_generator(N, **kwargs)

   Generate chunks of vectors for batch processing.

   :param N: Chunk size
   :param kwargs: Additional arguments for vec_it
   :yields: Lists of (paper_id, vector) tuples

.. py:function:: pct_sample(pct, **kwargs)

   Sample a percentage of vectors randomly.

   :param pct: Percentage of vectors to sample (0-1)
   :param kwargs: Additional arguments for vec_it
   :yields: Sampled (paper_id, vector) tuples

Implementation Details
-------------------

Vector Processing Pipeline
~~~~~~~~~~~~~~~~~~~~~

The module implements a multi-stage pipeline:

1. **Vector Loading**
   
   * Read SPECTER vectors from pickle files
   * Stream processing for memory efficiency
   * Optional sampling and filtering
   * Batch processing support

2. **UMAP Fitting**

   * Random sampling of training vectors
   * UMAP model configuration
   * 3D projection setup
   * Model persistence

3. **Full Projection**

   * Batch processing of all vectors
   * Parallel processing support
   * Progress tracking
   * Result caching

4. **Result Management**

   * Dictionary-based storage
   * Efficient lookups
   * Memory optimization
   * Cache management

Memory Management
~~~~~~~~~~~~~~

The module includes several memory optimization strategies:

* **Streaming Processing**
    - Iterative vector loading
    - Chunk-based processing
    - Memory-efficient sampling
    - Garbage collection

* **Batch Processing**
    - Configurable chunk sizes
    - Partial result storage
    - Memory monitoring
    - Resource cleanup

* **Caching System**
    - Selective caching
    - Cache invalidation
    - Memory-aware storage
    - Disk offloading

Dependencies
----------

Required Python packages:

* ``umap-learn``: UMAP implementation
* ``numpy``: Numerical operations
* ``pickle``: Vector file handling
* ``joblib``: Parallel processing

Configuration
-----------

Key configuration parameters:

* ``VECTOR_FOLDER``: Location of SPECTER vectors
* ``CHUNK_SIZE``: Batch processing size
* ``SAMPLE_SIZE``: UMAP training sample size
* Cache configuration from common module

Example Usage
-----------

Basic usage for vector projection:

.. code-block:: python

   from backend.scripts import project_vectors

   # Get 3D embeddings for all papers
   embeddings = project_vectors.GetUmapEmbedding(
       CHUNK_SIZE=10000,
       SAMPLE_SIZE=100000
   )

   # Access a paper's 3D coordinates
   paper_coords = embeddings[paper_id]  # Returns [x, y, z]

Performance Considerations
-----------------------

When using this module, consider:

* Memory Usage
    - UMAP fitting memory requirements
    - Vector loading memory impact
    - Cache storage needs
    - Batch size tuning

* Processing Time
    - UMAP fitting duration
    - Full projection time
    - Batch processing overhead
    - Cache access speed

* Resource Management
    - CPU utilization
    - Memory monitoring
    - Disk I/O impact
    - Cache size control

Error Handling
------------

The module handles several error cases:

* Missing vector files
* Corrupted pickle data
* Memory exhaustion
* Invalid vector formats 