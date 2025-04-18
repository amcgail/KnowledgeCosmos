from .common import *
from .fields import GetFieldNames, FieldNameToPoints, PaperToFields
from tqdm import tqdm

__all__ = [
    'WriteFieldMeshes',
    'GetFieldCenters',
    'WriteFullMesh'
]

import alphashape
from random import sample
import trimesh
import numpy as np
from trimesh.ray.ray_triangle import ray_triangle_id
import math
from scipy.spatial import cKDTree
from concurrent.futures import ThreadPoolExecutor
from functools import partial
import gc

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

@cache(ignore=['NUM_THREADS', 'overwrite'])
def WriteFieldMeshes(
    MIN_POINTS_MESH = 40_000,
    ALPHA = 3,
    MIN_DENSITY = 50,  # Minimum number of points that must be within radius for a point to be included
    NUM_THREADS = 4,  # Number of threads for parallel processing
    overwrite = True
):
    from . import pointclouds

    fnames = GetFieldNames()
    points_per_subfield = FieldNameToPoints()

    outd = DATA_FOLDER / 'static' / 'field_meshes'
    outd.mkdir(exist_ok=True)

    most_populous = sorted(points_per_subfield, key=lambda x:-len(points_per_subfield[x]))
    above_threshold = [x for x in most_populous if len(points_per_subfield[x]) >= MIN_POINTS_MESH]

    # bring in all the pointcloud fields
    field_colors, field_orders = pointclouds.ProduceFieldPointClouds()
    pointcloud_fields = list(field_colors.keys()) + [y for x in field_colors.values() for y in x.keys()]

    to_mesh = sorted( set(above_threshold) | set(pointcloud_fields) )

    with tqdm(total=len(to_mesh), desc="Generating field meshes") as pbar:
        for fid in to_mesh:
            points = points_per_subfield[fid]

            outfn = outd / f"{fnames[fid]}.stl"
            if not overwrite and outfn.exists():
                continue                

            pbar.set_postfix_str(f"processing {fnames[fid]}")
            
            # Convert points to numpy array
            points_array = np.array(points)
            
            # Calculate point densities with parallel processing
            densities = calculate_point_density(points_array, num_threads=NUM_THREADS)
            
            # Keep only points in dense regions using absolute threshold
            dense_points = points_array[densities >= MIN_DENSITY]
            
            # If we still have too many points, randomly sample
            if len(dense_points) > MIN_POINTS_MESH:
                dense_points = sample(dense_points.tolist(), MIN_POINTS_MESH)

            if len(dense_points) < 100:
                pbar.update(1)
                continue
                
            # Generate mesh from dense points
            hull = alphashape.alphashape(dense_points, ALPHA)

            with open(outfn, 'wb') as outf:
                outf.write(trimesh.exchange.export.export_stl(hull))

            pbar.update(1)

    return to_mesh

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

def adjust_center_if_outside(mesh, center):
    """If center is outside mesh, move it to closest vertex.
    
    Args:
        mesh: trimesh.Trimesh object
        center: (3,) numpy array of center coordinates
        
    Returns:
        (3,) numpy array of adjusted center coordinates
    """
    center = np.array(center)
    if not is_point_inside_mesh(mesh, center):
        # Find closest vertex
        distances = np.linalg.norm(mesh.vertices - center, axis=1)
        closest_vertex_idx = np.argmin(distances)
        return mesh.vertices[closest_vertex_idx]
    return center

def is_point_inside_mesh(mesh, point):
    """Check if a point is inside a mesh using ray casting.
    
    Args:
        mesh: trimesh.Trimesh object
        point: (3,) numpy array of point coordinates
        
    Returns:
        bool: True if point is inside mesh, False otherwise
    """
    # Cast ray in positive x direction
    ray_origins = np.array([point])
    ray_directions = np.array([[1.0, 0.0, 0.0]])
    
    # Get intersections
    locations, index_ray, index_tri = mesh.ray.intersects_location(
        ray_origins=ray_origins,
        ray_directions=ray_directions
    )
    
    # Even number of intersections means outside
    return len(locations) % 2 == 1

def calculate_true_center(mesh, num_samples=25):
    """Calculate center of mass by sampling points throughout the mesh volume.
    Turns out this is essentially the same as using the center_mass attribute,
        and much slower.
    
    Args:
        mesh: trimesh.Trimesh object
        num_samples: Number of samples along each axis
        
    Returns:
        (3,) numpy array of center coordinates
    """
    # Get mesh bounds
    bounds = mesh.bounds
    if mesh.bounds is None:
        return None
    
    min_bound = bounds[0]
    max_bound = bounds[1]
    
    # Create evenly spaced points along each axis
    x = np.linspace(min_bound[0], max_bound[0], num_samples)
    y = np.linspace(min_bound[1], max_bound[1], num_samples)
    z = np.linspace(min_bound[2], max_bound[2], num_samples)
    
    # Create a 2D grid for y-z plane
    yy, zz = np.meshgrid(y, z)
    yz_points = np.column_stack((yy.flatten(), zz.flatten()))
    
    interior_points = []
    
    # For each y-z point, cast a ray along the x-axis and find all intersections
    for yz in tqdm(yz_points, desc="Sampling interior points", leave=False):
        # Start from minimum x bound
        start_point = np.array([min_bound[0] - 0.1, yz[0], yz[1]])
        
        # Cast ray in positive x direction
        ray_origins = np.array([start_point])
        ray_directions = np.array([[1.0, 0.0, 0.0]])
        
        # Get all intersections
        locations, index_ray, index_tri = mesh.ray.intersects_location(
            ray_origins=ray_origins,
            ray_directions=ray_directions
        )
        
        # Sort intersections by x coordinate
        if len(locations) > 0:
            sorted_indices = np.argsort(locations[:, 0])
            locations = locations[sorted_indices]
            
            # Start outside the mesh
            inside = False
            
            # For each intersection, flip inside/outside state
            for i in range(len(locations)):
                inside = not inside
                
                # If we're inside after this intersection, add sample points
                # between this intersection and the next one (or max_bound)
                if inside:
                    start_x = locations[i][0]
                    end_x = locations[i+1][0] if i+1 < len(locations) else max_bound[0]
                    
                    # Sample points along this inside segment
                    sample_xs = np.linspace(start_x, end_x, num=5)[1:-1]  # exclude boundaries
                    for sample_x in sample_xs:
                        interior_points.append([sample_x, yz[0], yz[1]])
    
    if not interior_points:
        # Fallback to center of mass if no interior points found
        return mesh.center_mass
        
    # Calculate center as mean of interior points
    return np.mean(interior_points, axis=0)

@cache
def GetFieldCenters():
    """Returns a dictionary mapping field names to their centers and camera positions.
    Centers are calculated by sampling interior points of each mesh.
    If a center is outside its mesh, it's moved to the closest vertex.
    Camera positions are calculated to always look inward toward the global center.
    Global center is calculated as average of all vertices for efficiency."""
    
    mesh_dir = DATA_FOLDER / 'static' / 'field_meshes'
    field_data = {}
    
    SCALE = 100  # Match the scale used in the frontend
    
    # First pass: load meshes and calculate global center from vertices
    meshes = {}
    all_vertices = []
    
    # Create progress bar for loading meshes
    stl_files = list(mesh_dir.glob('*.stl'))
    with tqdm(total=len(stl_files), desc="Loading meshes") as pbar:
        for stl_file in stl_files:
            mesh = trimesh.load(stl_file)
            field_name = stl_file.stem
            meshes[field_name] = mesh
            if not hasattr(mesh, 'vertices'):
                pbar.update(1)
                continue

            all_vertices.extend(mesh.vertices)
            pbar.set_postfix_str(f"loading {field_name}")
            pbar.update(1)
    
    # Calculate global center as mean of all vertices
    global_center = np.mean(all_vertices, axis=0) * SCALE
    global_center = global_center.tolist()
    
    # Calculate centers for each mesh
    with tqdm(total=len(meshes), desc="Calculating Field Centers") as pbar:
        for field_name, mesh in meshes.items():
            pbar.set_postfix_str(field_name)
            
            # Get the true center and adjust if somehow outside
            center = mesh.center_mass
            if center is None:
                pbar.update(1)
                continue
            
            try:
                center = adjust_center_if_outside(mesh, center)
            except Exception as e:
                print(f"Error adjusting center for {field_name}: {e}")
                continue

            center = (center * SCALE).tolist()
            
            # Calculate camera position
            camera_pos = calculate_camera_position(mesh, center, global_center)
            
            field_data[field_name] = {
                'center': center,
                'camera_position': camera_pos
            }
            
            pbar.update(1)
    
    return field_data

@cache
def WriteFullMesh(
    ALPHA = 3,
    SAMPLE_PERCENT = 5  # Percentage of points to sample (1 = 1%)
):
    """Generate a mesh for the entire point cloud.
    
    Args:
        ALPHA: Alpha value for alphashape algorithm (higher = looser fit)
        SAMPLE_PERCENT: Percentage of points to randomly sample (1 = 1%)
    """
    from . import project_vectors
    import shapely
    
    # Get embedding and valid paper IDs
    embedding = project_vectors.GetUmapEmbedding()
    paper_ids = sorted(embedding)

    print('Total points:', len(paper_ids))
    
    # Sample paper IDs first
    n_sample = int(len(paper_ids) * SAMPLE_PERCENT / 100)
    sampled_ids = sample(paper_ids, n_sample)
    print(f'Sampling {n_sample} points ({SAMPLE_PERCENT}%)')
    
    # Only create points array for sampled IDs
    points = [embedding[pid] for pid in sampled_ids]

    # Remove variables that are no longer needed
    del embedding, paper_ids, sampled_ids
    gc.collect()
    
    # Generate mesh from points
    hull = alphashape.alphashape(points, ALPHA)
    
    print('Hull type:', type(hull))
    
    outd = DATA_FOLDER / 'static' / 'field_meshes'
    outd.mkdir(exist_ok=True)
    
    with open(outd / "full.stl", 'wb') as outf:
        outf.write(trimesh.exchange.export.export_stl(hull))
    
    return "full"

if __name__ == '__main__':
    #WriteFieldMeshes.make(force=True, overwrite=False)
    #GetFieldCenters.make(force=True)
    WriteFullMesh.make(force=True)
