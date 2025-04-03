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
def GetFieldCenters(use_volume_filter=True):
    """Returns a dictionary mapping field names to their centers and camera positions.
    Centers are calculated as a weighted average of points, where points with higher
    uniqueness (less overlap with other fields) have more weight in the average.
    Points are scaled up by 100x to match the frontend mesh scaling.
    Fields can be filtered either by:
    - Volume: fields must not exceed 1/8 of total volume
    - Extent: fields must not exceed 3/4 of total extent in any dimension
    Camera positions are calculated to always look inward toward the global center."""
    
    mesh_dir = DATA_FOLDER / 'static' / 'field_meshes'
    field_data = {}
    
    SCALE = 100  # Match the scale used in the frontend
    GRID_SIZE = 32  # Number of grid cells per dimension
    NUM_THREADS = 4  # Number of threads for parallel processing
    
    # Get all points and field mappings
    points_per_field = FieldNameToPoints()
    paper_to_fields = PaperToFields()
    
    # First pass: calculate the total extent, volume, and global center across all meshes
    all_vertices = []
    meshes = {}
    total_volume = 0
    for stl_file in mesh_dir.glob('*.stl'):
        mesh = trimesh.load(stl_file)
        all_vertices.extend(mesh.vertices)
        meshes[stl_file.stem] = mesh
        total_volume += abs(mesh.volume)  # abs in case of inverted normals
    
    # Convert to numpy array for efficient computation
    all_vertices = np.array(all_vertices)
    total_min = np.min(all_vertices, axis=0)
    total_max = np.max(all_vertices, axis=0)
    total_extent = total_max - total_min
    max_allowed_extent = 3 * total_extent / 4
    max_allowed_volume = total_volume / 8  # No more than 1/8 of total volume
    
    # Calculate global center
    global_center = np.mean(all_vertices, axis=0) * SCALE
    global_center = global_center.tolist()
    
    print(f'Total volume: {total_volume:.2f}, Max allowed: {max_allowed_volume:.2f}')
    print(f'Global center: {global_center}')
    
    # Build grid-based spatial index for all fields
    field_grids = {}
    for field_name, points in points_per_field.items():
        if field_name in meshes:  # Only process fields that have meshes
            points_array = np.array(points) * SCALE
            field_grids[field_name] = {
                'points': points_array,
                'grid': np.zeros((GRID_SIZE, GRID_SIZE, GRID_SIZE)),
                'cell_size': (total_max - total_min) / GRID_SIZE,
                'min_coords': total_min
            }
            
            # Assign points to grid cells
            indices = np.floor((points_array - total_min) / field_grids[field_name]['cell_size']).astype(int)
            indices = np.clip(indices, 0, GRID_SIZE-1)
            
            # Count points in each cell
            for idx in indices:
                field_grids[field_name]['grid'][idx[0], idx[1], idx[2]] += 1
    
    def calculate_point_uniqueness(point, field_name, field_grids):
        """Calculate uniqueness score for a single point."""
        # Get grid cell for this point
        idx = np.floor((point - total_min) / field_grids[field_name]['cell_size']).astype(int)
        idx = np.clip(idx, 0, GRID_SIZE-1)
        
        # Count nearby fields by checking adjacent grid cells
        nearby_fields = set()
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                for dz in [-1, 0, 1]:
                    check_idx = idx + np.array([dx, dy, dz])
                    check_idx = np.clip(check_idx, 0, GRID_SIZE-1)
                    
                    # Check if any other field has points in this cell
                    for other_field, other_grid in field_grids.items():
                        if other_field != field_name and other_grid['grid'][check_idx[0], check_idx[1], check_idx[2]] > 0:
                            nearby_fields.add(other_field)
        
        return 1.0 / (len(nearby_fields) + 1)
    
    def process_point_chunk(chunk, field_name, field_grids):
        """Process a chunk of points in parallel."""
        return np.array([calculate_point_uniqueness(point, field_name, field_grids) for point in chunk])
    
    # Second pass: calculate centers and camera positions for fields within size limit
    for field_name, mesh in meshes.items():
        field_min = np.min(mesh.vertices, axis=0)
        field_max = np.max(mesh.vertices, axis=0)
        field_extent = field_max - field_min
        field_volume = abs(mesh.volume)  # abs in case of inverted normals
        
        print(f'{field_name}: volume={field_volume:.2f}, extent={field_extent}')
        
        # Check if field is within bounds based on selected method
        if use_volume_filter:
            is_valid = field_volume <= max_allowed_volume
        else:
            is_valid = np.any(field_extent <= max_allowed_extent)
            
        if is_valid and field_name in field_grids:
            field_points = field_grids[field_name]['points']
            
            # Split points into chunks for parallel processing
            chunk_size = len(field_points) // NUM_THREADS
            chunks = [field_points[i:i + chunk_size] for i in range(0, len(field_points), chunk_size)]
            
            # Calculate uniqueness scores in parallel
            with ThreadPoolExecutor(max_workers=NUM_THREADS) as executor:
                calc_func = partial(process_point_chunk, field_name=field_name, field_grids=field_grids)
                chunk_scores = list(executor.map(calc_func, chunks))
            
            # Combine results
            uniqueness_scores = np.concatenate(chunk_scores)
            
            # Normalize uniqueness scores to sum to 1 for weighted average
            weights = uniqueness_scores / np.sum(uniqueness_scores)
            
            # Calculate weighted average center
            center = np.average(field_points, axis=0, weights=weights).tolist()
            
            # Calculate camera position
            camera_pos = calculate_camera_position(mesh, center, global_center)
            
            field_data[field_name] = {
                'center': center,
                'camera_position': camera_pos,
                'global_center': global_center  # Include global center for reference
            }

    print('Number of fields retained for labels:', len(field_data))
    
    return field_data

if __name__ == '__main__':
    WriteFieldMeshes.make(force=True)
    GetFieldCenters.make(force=True)
