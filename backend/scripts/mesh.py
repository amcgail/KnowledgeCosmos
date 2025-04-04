from .common import *
from .fields import GetFieldNames, FieldNameToPoints, PaperToFields

import alphashape
from random import sample
import trimesh
import numpy as np
from trimesh.ray.ray_triangle import ray_triangle_id
import math
from scipy.spatial import cKDTree
from concurrent.futures import ThreadPoolExecutor
from functools import partial

def calculate_grid_density(points, grid_size=32):
    """Calculate point density using a grid-based approach.
    
    Args:
        points: Nx3 array of point coordinates
        grid_size: Number of grid cells per dimension
        
    Returns:
        densities: Array of density values for each point
    """
    # Get bounds
    min_coords = np.min(points, axis=0)
    max_coords = np.max(points, axis=0)
    
    # Create grid
    grid = np.zeros((grid_size, grid_size, grid_size))
    
    # Calculate cell size
    cell_size = (max_coords - min_coords) / grid_size
    
    # Assign points to grid cells
    indices = np.floor((points - min_coords) / cell_size).astype(int)
    indices = np.clip(indices, 0, grid_size-1)
    
    # Count points in each cell
    for idx in indices:
        grid[idx[0], idx[1], idx[2]] += 1
    
    # Get density for each point based on its grid cell
    densities = np.array([grid[idx[0], idx[1], idx[2]] for idx in indices])
    
    return densities

def calculate_local_density(points_chunk, radius, tree):
    """Calculate density for a chunk of points using KD-tree.
    
    Args:
        points_chunk: Subset of points to process
        radius: Search radius
        tree: Pre-built KD-tree of all points
        
    Returns:
        densities: Array of density values for the chunk
    """
    return tree.query_ball_point(points_chunk, radius, return_length=True)

def calculate_point_density(points, radius=0.1, num_threads=4):
    """Calculate local point density for each point using parallel processing.
    
    Args:
        points: Nx3 array of point coordinates
        radius: Search radius for density calculation
        num_threads: Number of threads for parallel processing
        
    Returns:
        densities: Array of density values for each point
    """
    # First pass: use grid-based approach for initial density estimation
    grid_densities = calculate_grid_density(points)
    
    # Build KD-tree for accurate local density calculation
    tree = cKDTree(points)
    
    # Split points into chunks for parallel processing
    chunk_size = len(points) // num_threads
    chunks = [points[i:i + chunk_size] for i in range(0, len(points), chunk_size)]
    
    # Calculate accurate densities in parallel
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        calc_func = partial(calculate_local_density, radius=radius, tree=tree)
        chunk_densities = list(executor.map(calc_func, chunks))
    
    # Combine results
    densities = np.concatenate(chunk_densities)
    
    # Combine grid and local densities (weighted average)
    combined_densities = 0.7 * densities + 0.3 * grid_densities
    
    return combined_densities

@cache(ignore=['NUM_THREADS'])
def WriteFieldMeshes(
    MIN_POINTS_MESH = 40_000,
    ALPHA = 3,
    MIN_DENSITY = 50,  # Minimum number of points that must be within radius for a point to be included
    NUM_THREADS = 4  # Number of threads for parallel processing
):
    fnames = GetFieldNames()
    points_per_subfield = FieldNameToPoints()

    outd = DATA_FOLDER / 'static' / 'field_meshes'
    outd.mkdir(exist_ok=True)

    fields = []
    for fid in sorted(points_per_subfield, key=lambda x:-len(points_per_subfield[x])):
        points = points_per_subfield[fid]
        if len(points) < MIN_POINTS_MESH:
            continue
            
        print('processing', fnames[fid], len(points_per_subfield[fid]), 'papers')
        
        # Convert points to numpy array
        points_array = np.array(points)
        
        # Calculate point densities with parallel processing
        densities = calculate_point_density(points_array, num_threads=NUM_THREADS)
        
        # Keep only points in dense regions using absolute threshold
        dense_points = points_array[densities >= MIN_DENSITY]
        
        # If we still have too many points, randomly sample
        if len(dense_points) > MIN_POINTS_MESH:
            dense_points = sample(dense_points.tolist(), MIN_POINTS_MESH)
            
        # Generate mesh from dense points
        hull = alphashape.alphashape(dense_points, ALPHA)

        with open(outd / f"{fnames[fid]}.stl", 'wb') as outf:
            outf.write(trimesh.exchange.export.export_stl(hull))
            
        fields.append(fnames[fid])

    return fields

def calculate_camera_position(mesh, center, global_center, fov_degrees=60, scale=100):
    """Calculate optimal camera position to view the entire mesh, always looking toward global center.
    
    Args:
        mesh: The mesh being viewed
        center: The center of this specific mesh
        global_center: The center point of all meshes combined
        fov_degrees: Field of view in degrees
        scale: Scale factor for distance
    """
    # Get bounding sphere
    bounds = mesh.bounds
    radius = np.linalg.norm(bounds[1] - bounds[0]) / 2
    
    # Calculate required distance using FOV
    fov_radians = math.radians(fov_degrees)
    distance = (radius * scale) / math.tan(fov_radians / 2)
    
    # Reduce distance to bring camera closer (hacky fix for potree visualization)
    distance = distance / 2
    
    # Calculate direction from global center to mesh center
    direction = np.array(center) - np.array(global_center)
    if np.all(direction == 0):  # If mesh is at global center, use a default direction
        direction = np.array([1.0, 1.0, 1.0])
    direction = direction / np.linalg.norm(direction)  # normalize
    
    # Calculate camera position by moving distance units away from center in the direction away from global center
    camera_pos = np.array(center) + direction * distance
    
    return camera_pos.tolist()

@cache
def GetFieldCenters():
    """Returns a dictionary mapping field names to their centers and camera positions.
    Centers are calculated as the center of mass of each mesh's volume.
    Camera positions are calculated to always look inward toward the global center."""
    
    mesh_dir = DATA_FOLDER / 'static' / 'field_meshes'
    field_data = {}
    
    SCALE = 100  # Match the scale used in the frontend
    
    # First pass: calculate the global center across all meshes
    all_vertices = []
    meshes = {}
    for stl_file in mesh_dir.glob('*.stl'):
        mesh = trimesh.load(stl_file)
        all_vertices.extend(mesh.vertices)
        meshes[stl_file.stem] = mesh
    
    # Calculate global center
    all_vertices = np.array(all_vertices)
    global_center = np.mean(all_vertices, axis=0) * SCALE
    global_center = global_center.tolist()
    
    # Calculate centers for each mesh
    for field_name, mesh in meshes.items():
        # Get the center of mass of the mesh
        center = mesh.center_mass * SCALE
        center = center.tolist()
        
        # Calculate camera position
        camera_pos = calculate_camera_position(mesh, center, global_center)
        
        field_data[field_name] = {
            'center': center,
            'camera_position': camera_pos,
            'global_center': global_center
        }
    
    return field_data

if __name__ == '__main__':
    #WriteFieldMeshes.make(force=True)
    GetFieldCenters.make(force=True)
