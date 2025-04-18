"""
Configuration parameters that can be injected into cached functions.
These parameters will override any default values or explicitly provided arguments
when calling cached functions.
"""

force_include = ['Education']  # Fields to always include regardless of size
MIN_PAPERS = 5_000 # minimum number of papers to include a subfield
MIN_POINTS_MESH = 40_000
ALPHA = 3 # alpha value for the mesh

"""
BASIC_UMAP_PARAMS = dict() # I used defaults for the first 2 years of this project

UMAP_PARAMS = dict(
    metric='cosine', # for embedding vectors, cosine is better than euclidean
    n_neighbors=50, # default is 15 (higher gives more weight to global structure)
    min_dist=0.1, # default is 0.1 (lower is more clump-y)
    spread=8,
    n_epochs=400, # default is 200
    angular_rp_forest=True, # only useful for cosine metric
)
"""

CHUNK_SIZE = 100_000 # number of vectors to process at a time

# Add more configuration parameters here as needed
# Format: parameter_name = value 