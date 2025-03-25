from .common import *
from .fields import GetFieldNames, FieldNameToPoints

import alphashape
from random import sample
import trimesh
import numpy as np
from trimesh.ray.ray_triangle import ray_triangle_id
import math

@cache
def WriteFieldMeshes(
    MIN_POINTS_MESH = 40_000,
    ALPHA = 3
):

    fnames = GetFieldNames()
    points_per_subfield = FieldNameToPoints()

    outd = DATA_FOLDER / 'static' / 'field_meshes'
    outd.mkdir(exist_ok=True)

    fields = []
    for fid in sorted(points_per_subfield, key=lambda x:-len(points_per_subfield[x])):

        points = points_per_subfield[fid]
        if len(points) > MIN_POINTS_MESH:
            points = sample(points, MIN_POINTS_MESH)
        if len(points) < MIN_POINTS_MESH:
            continue
        
        print('processing', fnames[fid], len(points_per_subfield[fid]), 'papers')
            
        #alpha = 0.95 * alphashape.optimizealpha(points)
        hull = alphashape.alphashape(points, ALPHA)

        with open(outd / f"{fnames[fid]}.stl", 'wb') as outf:
            outf.write( trimesh.exchange.export.export_stl(hull) )
            
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
    Centers are calculated as the mean of vertices for compact meshes.
    Points are scaled up by 100x to match the frontend mesh scaling.
    Fields can be filtered either by:
    - Volume: fields must not exceed 1/8 of total volume
    - Extent: fields must not exceed 3/4 of total extent in any dimension
    Camera positions are calculated to always look inward toward the global center."""
    
    mesh_dir = DATA_FOLDER / 'static' / 'field_meshes'
    field_data = {}
    
    SCALE = 100  # Match the scale used in the frontend
    
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
            
        if is_valid:
            # Calculate center and camera position for acceptable fields
            center = np.mean(mesh.vertices, axis=0) * SCALE
            center_list = center.tolist()
            camera_pos = calculate_camera_position(mesh, center_list, global_center)
            
            field_data[field_name] = {
                'center': center_list,
                'camera_position': camera_pos,
                'global_center': global_center  # Include global center for reference
            }

    print('Number of fields retained for labels:', len(field_data))
    
    return field_data