Topic Labeling
=============

The ``labels`` module provides functionality for automatically generating topic labels for regions in the 3D paper space using GPT-4.

Core Functions
------------

.. py:function:: voxel_inspect(x_start, x_end, y_start, y_end, z_start, z_end)

   Analyze papers in a 3D voxel and generate a topic label using GPT.

   :param x_start: Start of x coordinate range
   :param x_end: End of x coordinate range
   :param y_start: Start of y coordinate range
   :param y_end: End of y coordinate range
   :param z_start: Start of z coordinate range
   :param z_end: End of z coordinate range
   :returns: None (adds topics to global list)

.. py:function:: xyz_iterator()

   Generate coordinates for voxel grid traversal.

   :yields: Tuples of (x, y, z) coordinates

.. py:function:: gpt_query(q)

   Send a query to GPT-4 and get the response.

   :param q: Query string
   :returns: GPT response text
   :rtype: str

Implementation Details
-------------------

Space Partitioning
~~~~~~~~~~~~~~~

The module divides the 3D space into voxels:

* **Grid Creation**
    - Automatic bounding box calculation
    - Configurable voxel resolution
    - Uniform grid spacing
    - Coordinate system alignment

* **Voxel Analysis**
    - Paper count thresholding
    - Random paper sampling
    - Title extraction
    - Topic generation

* **Recursive Subdivision**
    - Diversity-based splitting
    - Adaptive resolution
    - Topic coherence checking
    - Boundary preservation

Topic Generation
~~~~~~~~~~~~~

The topic labeling process involves:

* **Paper Selection**
    - Random sampling within voxels
    - Minimum count thresholds
    - SQL-based filtering
    - Efficient querying

* **GPT Integration**
    - Title-based prompting
    - Specificity requirements
    - Diversity detection
    - Consistent formatting

* **Result Management**
    - Topic storage
    - Coordinate tracking
    - Metadata preservation
    - Export functionality

Database Integration
----------------

The module uses PostgreSQL for paper data:

* **Schema**
    - Paper coordinates (``pos_x``, ``pos_y``, ``pos_z``)
    - Paper metadata (``info_json``)
    - Spatial indices
    - Performance optimizations

* **Query Optimization**
    - Indexed coordinate lookups
    - Random sampling
    - Count aggregation
    - JSON handling

Dependencies
----------

Required packages and services:

* ``psycopg2``: PostgreSQL connection
* ``numpy``: Numerical operations
* ``openai``: GPT API access
* ``tqdm``: Progress tracking

Configuration
-----------

Key configuration parameters:

* ``voxels``: Grid resolution (default: 10)
* Database connection settings
* GPT API configuration
* Sampling parameters

Example Usage
-----------

Basic usage for generating topic labels:

.. code-block:: python

   from backend.scripts import labels

   # Initialize database connection
   # Topics will be generated automatically
   # Results stored in labels.topics list

   # Access generated topics
   for topic in labels.topics:
       print(f"Region: ({topic['x_start']}, {topic['y_start']}, {topic['z_start']}) - "
             f"({topic['x_end']}, {topic['y_end']}, {topic['z_end']})")
       print(f"Topic: {topic['topic']}")

Performance Considerations
-----------------------

When using this module, consider:

* **API Usage**
    - GPT API rate limits
    - Query costs
    - Response time
    - Error handling

* **Database Load**
    - Query optimization
    - Connection pooling
    - Index usage
    - Result caching

* **Memory Usage**
    - Topic storage
    - Paper metadata
    - Coordinate tracking
    - Result accumulation

Security Notes
-----------

Important security considerations:

* API key protection
* Database credentials
* Query sanitization
* Error handling

The module includes sensitive information that should be properly secured:

* Move API keys to environment variables
* Use connection pooling for database
* Implement proper error handling
* Add rate limiting for API calls 