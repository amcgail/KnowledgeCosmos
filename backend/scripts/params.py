"""
Configuration parameters that can be injected into cached functions.
These parameters will override any default values or explicitly provided arguments
when calling cached functions.
"""

force_include = ['Education']  # Fields to always include regardless of size
MIN_PAPERS = 5_000 # minimum number of papers to include a subfield
MIN_POINTS_MESH = 40_000
ALPHA = 3 # alpha value for the mesh

# Add more configuration parameters here as needed
# Format: parameter_name = value 