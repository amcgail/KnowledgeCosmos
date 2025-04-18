from .common import *
import laspy
from random import choice
from tqdm.auto import tqdm
from matplotlib import cm
import numpy as np

__all__ = [
    'ConvertPotree',
    'ConvertPotreeAll',
    'ProduceTopLevelPointCloud',
    'ProduceFieldPointClouds'
]

def ConvertPotree(input_las_path):
    """Convert LAS file to Potree format for web visualization"""
    input_las_path = Path(input_las_path)

    # Create output directory
    if input_las_path.parent.name == 'potrees_independent':
        output_dir = DATA_FOLDER / 'static' / 'pointclouds_independent'
    else:
        output_dir = DATA_FOLDER / 'static' / 'pointclouds'
    
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / input_las_path.stem

    # Potree converter command
    args = (
        str(POTREE_CONVERTER),
        str(input_las_path),
        '-o', 
        str(output_path),
    )

    import subprocess
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Color options for visualization
COLOR_OPTIONS = [
    [0.5123862745098039, 0.0, 0.6026156862745098, 1.0], 
    [0.13593921568627448, 0.0, 0.6496980392156863, 1.0], 
    [0.0, 0.36603921568627423, 0.8667, 1.0], 
    [0.0, 0.5320431372549019, 0.8667, 1.0], 
    [0.0, 0.613078431372549, 0.8274843137254903, 1.0], 
    [0.0, 0.6601607843137255, 0.6863078431372549, 1.0], 
    [0.0, 0.6667, 0.5856137254901961, 1.0], 
    [0.0, 0.6510058823529411, 0.4078176470588235, 1.0], 
    [0.0, 0.7803823529411762, 0.0, 1.0], 
    [0.2875686274509804, 1.0, 0.0, 1.0], 
    [0.7529078431372549, 0.9934607843137255, 0.0, 1.0], 
    [0.8940843137254902, 0.9463784313725491, 0.0, 1.0], 
    [0.9673039215686274, 0.865343137254902, 0.0, 1.0], 
    [1.0, 0.7568627450980392, 0.0, 1.0], 
    [1.0, 0.615686274509804, 0.0, 1.0], 
    [1.0, 0.27058823529411763, 0.0, 1.0], 
    [0.8222333333333334, 0.0, 0.0, 1.0], 
    [0.8, 0.2980392156862745, 0.2980392156862745, 1.0], 
    [0.8, 0.8, 0.8, 1.0]
]

def _convert_color_channel(values):
    """Convert 0-1 values to 8-bit color (0-255)"""
    return np.clip(values * 255, 0, 255).astype(np.uint8)

@cache
def ConvertPotreeAll():
    """Convert all LAS files in potrees directory to Potree format (top-level fields only)"""
    from . import fields
    
    # Get field information
    top_level = fields.GetTopLevel()
    field_names = fields.GetFieldNames()

    # Define input directories
    input_dir_1 = DATA_FOLDER / 'potrees'
    input_dir_2 = DATA_FOLDER / 'potrees_independent'

    # Helper to safely convert a file
    def _convert_safe(filename):
        if Path(filename).exists():
            ConvertPotree(filename)

    # Process each top-level field
    for field_id in tqdm(top_level, desc="Converting Potrees..."):
        if field_id not in field_names:
            continue
        
        field_name = field_names[field_id]
        _convert_safe(input_dir_1 / f"{field_name}.las")
        _convert_safe(input_dir_2 / f"{field_name}.las")
        
    # Convert the full point clouds
    _convert_safe(input_dir_1 / 'full.las')
    _convert_safe(input_dir_1 / 'full_with_intersections.las')

    return "Success"

@cache
def ProduceTopLevelPointCloud():
    """Generate point cloud of all papers in top-level embedding, colored by position"""
    from . import project_vectors, MAG

    # Get embedding and valid paper IDs
    embedding = project_vectors.GetUmapEmbedding()
    paper_years = MAG.GetYears()

    # Setup output directory
    output_dir = DATA_FOLDER / 'potrees'
    output_dir.mkdir(exist_ok=True)
    
    # Filter papers in both MAG and embedding
    paper_ids = set(embedding)

    # Extract 3D coordinates
    x_coords, y_coords, z_coords = (
        np.array([embedding[paper_id][i]*100 for paper_id in paper_ids])
        for i in range(3)
    )
    
    # Convert to integers
    paper_ids_int = [int(x) for x in paper_ids]

    # Combine coordinates
    point_coordinates = np.hstack((
        x_coords.reshape((-1, 1)), 
        y_coords.reshape((-1, 1)), 
        z_coords.reshape((-1, 1))
    ))

    del x_coords, y_coords, z_coords

    # Create LAS header
    header = laspy.LasHeader(point_format=3, version="1.2")
    header.offsets = np.min(point_coordinates, axis=0)
    header.scales = np.array([0.001, 0.001, 0.001])

    las = laspy.LasData(header)

    # Set coordinates
    las.x = point_coordinates[:, 0]
    las.y = point_coordinates[:, 1]
    las.z = point_coordinates[:, 2]

    # Add paper ID dimension
    las.add_extra_dim(laspy.ExtraBytesParams(
        name="mag_id",
        type=np.uint32,
        description="MAG paper ID"
    ))
    las.mag_id = paper_ids_int
    
    # Store year for filtering
    las.point_source_id = [paper_years.get(pid, 0) for pid in paper_ids_int]
    
    # Color points by their position for better visualization
    def normalize_to_255(x):
        """Normalize to 0-255 range"""
        return 255 * (x - x.min())/ (x.max()-x.min())
    
    # Add noise for visual distinction
    noise = np.random.rand(len(paper_ids_int)+3)
    
    def add_noise_to_channel(x, channel_index):
        """Add noise to color channel for better visualization"""
        noisy_values = normalize_to_255(normalize_to_255(x) - 25 + 50*noise[channel_index:channel_index+len(x)])
        return 255/2 + noisy_values/2

    # Set RGB colors with noise for visual clarity
    las.blue = add_noise_to_channel(point_coordinates[:, 0], 0)
    las.red = add_noise_to_channel(point_coordinates[:, 1], 1)
    las.green = add_noise_to_channel(point_coordinates[:, 2], 2)
    
    # Save and convert
    output_file = output_dir / f"full.las"
    las.write(output_file)
    ConvertPotree(output_file)

    return output_file

DEFAULT_COLOR = (0.2, 0.2, 0.2, 0.5)

def _prepare_subfield_coloring(
    field_id,
    field_subfields_all,
    valid_paper_ids_in_field,
    paper_to_fields_map,
    field_to_papers_map,
    use_similarity_ordering=False
):
    """
    Process subfields for coloring and classification
    
    Args:
        field_id: Current top-level field ID
        field_subfields_all: All subfield IDs for this field
        valid_paper_ids_in_field: Paper IDs to include
        paper_to_fields_map: Map {paper_id: set(subfield_ids)}
        field_to_papers_map: Map {field_id: set(paper_ids)}
        use_similarity_ordering: If True, order by similarity, else by size
        
    Returns: Dict of coloring data or None if no valid subfields
    """
    # Map papers to subfields
    valid_subfield_papers = {sf: set() for sf in field_subfields_all}
    valid_paper_to_subfields = {pid: set() for pid in valid_paper_ids_in_field}
    
    # Build paper-subfield relationships
    for pid in valid_paper_ids_in_field:
        pid_str = str(pid) 
        if pid_str in paper_to_fields_map:
            for sf in paper_to_fields_map[pid_str]:
                if sf in valid_subfield_papers:
                    valid_subfield_papers[sf].add(pid_str)
                    valid_paper_to_subfields[pid_str].add(sf)

    # Filter subfields with papers
    current_field_subfields = [sf for sf, pids in valid_subfield_papers.items() if pids]
    if not current_field_subfields:
        logger.warning(f"No subfields with valid papers for field {field_id}. Skipping.")
        return None

    # Sort by size and select top N
    N_to_choose = len(COLOR_OPTIONS)
    sorted_subfields_by_size = sorted(current_field_subfields, key=lambda sf: -len(valid_subfield_papers[sf]))
    
    # Determine ordering of subfields
    if use_similarity_ordering and len(sorted_subfields_by_size) > 1:
        # Use size for initial selection
        temp_labeled_subfields = sorted_subfields_by_size[:N_to_choose]
        temp_labeled_subfield_set = set(temp_labeled_subfields)
        
        # Calculate similarity matrix
        similarity_matrix = np.zeros((len(temp_labeled_subfields), len(temp_labeled_subfields)))
        for pid in valid_paper_ids_in_field:
            pid_str = str(pid)
            paper_subs = valid_paper_to_subfields.get(pid_str, set())
            subs_in_set = [sf for sf in paper_subs if sf in temp_labeled_subfield_set]
            if len(subs_in_set) < 2: continue
            
            for i, subfield1 in enumerate(temp_labeled_subfields):
                if subfield1 not in subs_in_set: continue
                for j, subfield2 in enumerate(temp_labeled_subfields):
                    if subfield2 not in subs_in_set: continue
                    similarity_matrix[i, j] += 1
                    if i != j: similarity_matrix[j, i] += 1
        
        # Normalize similarity
        row_sums = similarity_matrix.sum(axis=1, keepdims=True)
        similarity_matrix = np.divide(similarity_matrix, row_sums, out=np.zeros_like(similarity_matrix), where=row_sums!=0)
        
        # Order by similarity
        ordered_subfields = []
        if temp_labeled_subfields:
            ordered_subfields = [temp_labeled_subfields[0]]
            processed = {temp_labeled_subfields[0]}
            
            while len(ordered_subfields) < len(temp_labeled_subfields):
                last_subfield_id = ordered_subfields[-1]
                last_subfield_idx = temp_labeled_subfields.index(last_subfield_id)
                similar_subfield_indices = np.argsort(similarity_matrix[last_subfield_idx])[::-1]
                
                # Find next most similar subfield not yet processed
                for idx in similar_subfield_indices:
                    next_subfield = temp_labeled_subfields[idx]
                    if next_subfield not in processed:
                        ordered_subfields.append(next_subfield)
                        processed.add(next_subfield)
                        break
                
                # If we couldn't find next similar field, add remaining ones
                if len(ordered_subfields) == len(processed):
                    remaining = [sf for sf in temp_labeled_subfields if sf not in processed]
                    ordered_subfields.extend(remaining)
                    break
        
        unlabeled_subfields = sorted_subfields_by_size[N_to_choose:]
    else:
        # Size-based ordering
        ordered_subfields = sorted_subfields_by_size[:N_to_choose]
        unlabeled_subfields = sorted_subfields_by_size[N_to_choose:]

    labeled_subfield_set = set(ordered_subfields)
    
    # Assign colors - space colors evenly across the palette
    field_colors_for_field = {}
    for i, subfield in enumerate(ordered_subfields):
        color_idx = int(i * len(COLOR_OPTIONS) / len(ordered_subfields)) if ordered_subfields else 0
        field_colors_for_field[subfield] = COLOR_OPTIONS[color_idx]
    
    # Default color for unlabeled
    for subfield in unlabeled_subfields:
        field_colors_for_field[subfield] = DEFAULT_COLOR

    # Assign classifications
    subfield_classifications = {subfield: i + 1 for i, subfield in enumerate(ordered_subfields)}
    other_classification_code = len(ordered_subfields) + 1
    for subfield in unlabeled_subfields:
        subfield_classifications[subfield] = other_classification_code

    return {
        'valid_subfield_papers': valid_subfield_papers,
        'valid_paper_to_subfields': valid_paper_to_subfields,
        'labeled_subfield_set': labeled_subfield_set,
        'ordered_subfields': ordered_subfields,
        'unlabeled_subfields': unlabeled_subfields,
        'field_colors_for_field': field_colors_for_field,
        'subfield_classifications': subfield_classifications,
        'other_classification_code': other_classification_code
    }

@cache
def GenerateFieldIntersectionMapping():
    """
    Generate mapping of field intersections to classification codes
    
    Returns:
        dict: Maps field names to lists of classification codes (for both single field and intersections)
    """
    from . import fields
    
    field_names = fields.GetFieldNames()
    top_level = fields.GetTopLevel()
    
    # Filter to only include top-level fields
    top_fields = [field_names[fid] for fid in top_level if fid in field_names]
    
    # Start with single-field classifications (these will be 1-indexed)
    field_to_classifications = {field: [field_idx + 1] for field_idx, field in enumerate(top_fields)}
    
    # Generate intersection classifications (these will be after all single fields)
    intersection_base = len(top_fields) + 1
    
    # Create a mapping for all possible intersections
    for i, field1 in enumerate(top_fields):
        for j, field2 in enumerate(top_fields):
            if i >= j:
                continue  # Skip self-intersections and duplicates
                
            # Create a unique code for this intersection
            intersection_code = intersection_base + ((i * len(top_fields)) + j)
            
            # Add this code to both fields' classification lists
            field_to_classifications[field1].append(intersection_code)
            field_to_classifications[field2].append(intersection_code)
    
    # Add mapping for actual intersection pair to code
    intersection_pairs = {}
    intersection_base = len(top_fields) + 1
    for i, field1 in enumerate(top_fields):
        for j, field2 in enumerate(top_fields):
            if i >= j:
                continue
                
            intersection_code = intersection_base + ((i * len(top_fields)) + j)
            pair_name = f"{field1} ∩ {field2}"
            intersection_pairs[pair_name] = intersection_code
    
    return {
        "field_to_classifications": field_to_classifications,
        "intersection_pairs": intersection_pairs,
        "single_field_codes": {field: field_idx + 1 for field_idx, field in enumerate(top_fields)}
    }

def _create_field_las(
    output_path,
    field_name,
    valid_paper_ids_in_field,
    embedding_map,
    paper_years_map,
    paper_coloring_data
):
    """Create and save LAS file for a field"""
    
    paper_ids_str = valid_paper_ids_in_field
    paper_ids_int = [int(pid) for pid in paper_ids_str]

    if not paper_ids_int:
        logger.warning(f"No integer paper IDs for field {field_name}. Skipping.")
        return False

    # Extract coordinates
    try:
        point_coordinates = np.array([embedding_map[pid]*100 for pid in paper_ids_str])
    except KeyError as e:
        logger.error(f"KeyError accessing embedding for ID {e} in field {field_name}. Skipping.")
        return False
         
    if point_coordinates.size == 0:
        logger.warning(f"Empty coordinates for field {field_name}. Skipping.")
        return False

    # Create LAS header and data
    header = laspy.LasHeader(point_format=3, version="1.2")
    header.offsets = np.min(point_coordinates, axis=0)
    header.scales = np.maximum(np.array([0.001, 0.001, 0.001]), 1e-9)
    las = laspy.LasData(header)
    
    # Set coordinates
    las.x = point_coordinates[:, 0]
    las.y = point_coordinates[:, 1]
    las.z = point_coordinates[:, 2]

    # Add MAG ID
    las.add_extra_dim(laspy.ExtraBytesParams(name="mag_id", type=np.uint32, description="MAG paper ID"))
    las.mag_id = paper_ids_int

    # Add year
    las.point_source_id = [paper_years_map.get(pid_int, 0) for pid_int in paper_ids_int]

    # Get coloring data
    labeled_subfield_set = paper_coloring_data['labeled_subfield_set']
    unlabeled_subfields = paper_coloring_data['unlabeled_subfields']
    field_colors = paper_coloring_data['field_colors_for_field']
    subfield_classifications = paper_coloring_data['subfield_classifications']
    valid_paper_to_subfields = paper_coloring_data['valid_paper_to_subfields']
    ordered_subfields = paper_coloring_data['ordered_subfields']
    other_classification_code = paper_coloring_data['other_classification_code']

    # Prepare colors and classifications
    colors_list = []
    classifications_list = []

    for paper_id_str in paper_ids_str:
        # Get subfields for this paper
        paper_subfields = valid_paper_to_subfields.get(paper_id_str, set())
        paper_labeled_subfields = {sf for sf in paper_subfields if sf in labeled_subfield_set}
        
        # Default values
        color = DEFAULT_COLOR
        classification = 0

        if paper_labeled_subfields:
            # Choose earliest subfield in order
            chosen_sf = min(paper_labeled_subfields, 
                           key=lambda sf: ordered_subfields.index(sf) if sf in ordered_subfields else float('inf'))
            color = field_colors[chosen_sf]
            classification = subfield_classifications[chosen_sf]
        elif paper_subfields & set(unlabeled_subfields):  # More efficient intersection
            classification = other_classification_code
        
        colors_list.append(color)
        classifications_list.append(classification)

    colors = np.array(colors_list)
    classifications = np.array(classifications_list)

    # Set RGB colors
    if colors.ndim == 2 and colors.shape[1] >= 3:
        las.red = _convert_color_channel(colors[:, 0])
        las.green = _convert_color_channel(colors[:, 1])
        las.blue = _convert_color_channel(colors[:, 2])
    else:
        logger.warning(f"Unexpected color shape {colors.shape} for {field_name}. Using defaults.")
        default_rgb = _convert_color_channel(np.array(DEFAULT_COLOR[:3]))
        las.red = np.full(len(paper_ids_int), default_rgb[0], dtype=np.uint8)
        las.green = np.full(len(paper_ids_int), default_rgb[1], dtype=np.uint8)
        las.blue = np.full(len(paper_ids_int), default_rgb[2], dtype=np.uint8)

    # Add custom field to indicate field membership for intersection filtering
    # This will be the field's index in the top-level fields list (1-indexed)
    from . import fields
    top_level = fields.GetTopLevel()
    field_names = fields.GetFieldNames()
    top_fields = [field_names[fid] for fid in top_level if fid in field_names]
    
    try:
        field_index = top_fields.index(field_name) + 1  # 1-indexed
    except ValueError:
        field_index = 0  # Not a top-level field
    
    # We use user_data to store the field's classification code
    las.user_data = np.full(len(paper_ids_int), field_index, dtype=np.uint8)

    # Set classifications
    las.classification = classifications

    # Save file
    try:
        las.write(output_path)
        logger.debug(f"Saved LAS file: {output_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to write LAS file {output_path}: {e}")
        return False

@cache(ignore=['debug'])
def ProduceFieldPointClouds(debug=False):
    """
    Generate field point clouds using GLOBAL embedding
    Colors based on subfield membership using SIMILARITY ordering
    """
    from . import fields, project_vectors, MAG

    # Get field data
    field_names = fields.GetFieldNames(force_include=['Education'])
    top_level_ids = fields.GetTopLevel()
    subfields_map = fields.GetSubFields()
    paper_to_fields = fields.PaperToFields()
    field_to_papers = fields.FieldToPapers()

    # Get global embedding
    logger.info("Getting global UMAP embedding...")
    global_embedding = project_vectors.GetUmapEmbedding()
    logger.info(f"Retrieved global embedding for {len(global_embedding)} papers.")
    
    paper_years = MAG.GetYears()

    # Setup output directory
    output_dir = DATA_FOLDER / 'potrees'
    output_dir.mkdir(exist_ok=True)

    final_field_colors = {}
    final_field_orders = {}
    limit = 1 if debug else None
    computed_fields = 0

    # Get fields to process
    process_ids = set(top_level_ids) & set(field_names.keys()) & set(field_to_papers.keys()) & set(subfields_map.keys())

    for field_id in tqdm(process_ids, desc="Generating field point clouds (global embedding)"):
        field_name = field_names[field_id]
        field_papers_all = field_to_papers[field_id]
        field_subfields_all = subfields_map[field_id]

        # Filter valid papers
        global_embedding_keys_str = set(map(str, global_embedding.keys()))
        valid_paper_ids_in_field = sorted(
            set(map(str, field_papers_all)) & global_embedding_keys_str
        )

        if not valid_paper_ids_in_field:
            logger.warning(f"No valid papers with global embeddings for field {field_name}. Skipping.")
            continue

        # Process subfields
        paper_coloring_data = _prepare_subfield_coloring(
            field_id=field_id,
            field_subfields_all=field_subfields_all,
            valid_paper_ids_in_field=valid_paper_ids_in_field,
            paper_to_fields_map=paper_to_fields,
            field_to_papers_map=field_to_papers,
            use_similarity_ordering=True
        )

        if paper_coloring_data is None:
            continue

        # Store results
        final_field_colors[field_id] = paper_coloring_data['field_colors_for_field']
        final_field_orders[field_id] = paper_coloring_data['ordered_subfields']

        # Create LAS file
        output_las_path = output_dir / f"{field_name}.las"
        success = _create_field_las(
            output_path=output_las_path,
            field_name=field_name,
            valid_paper_ids_in_field=valid_paper_ids_in_field,
            embedding_map=global_embedding,
            paper_years_map=paper_years,
            paper_coloring_data=paper_coloring_data
        )

        if success:
            computed_fields += 1

        if limit and computed_fields >= limit:
            logger.info(f"Reached debug limit of {limit} fields.")
            break
            
    logger.info(f"Generated {computed_fields} field point clouds using global embedding.")
    return final_field_colors, final_field_orders

@cache
def ProduceFieldPointCloudsIndependently(debug=False):
    """
    Generate field point clouds using separate UMAP embeddings for each field
    Colors based on subfield membership using size ordering
    """
    from . import fields, project_vectors, MAG

    # Get field data
    field_names = fields.GetFieldNames()
    top_level_ids = fields.GetTopLevel()
    subfields_map = fields.GetSubFields()
    paper_to_fields = fields.PaperToFields()
    field_to_papers = fields.FieldToPapers()
    paper_years = MAG.GetYears()

    # Setup output directory
    output_dir = DATA_FOLDER / 'potrees_independent'
    output_dir.mkdir(exist_ok=True)

    # Get field embeddings
    logger.info("Getting independent field embeddings...")
    all_field_embeddings = project_vectors.GetAllFieldEmbeddings(
        DEBUG=debug
    )
    logger.info(f"Retrieved embeddings for {len(all_field_embeddings)} fields.")

    final_field_colors = {}
    final_field_orders = {}
    limit = 1 if debug else None
    computed_fields = 0

    # Process fields
    for field_id in tqdm(all_field_embeddings.keys(), desc="Generating independent field point clouds"):
        if field_id not in field_names or field_id not in field_to_papers or field_id not in subfields_map:
            continue
        
        field_name = field_names[field_id]
        embedding = all_field_embeddings[field_id]
        field_subfields_all = subfields_map[field_id]

        # Filter valid papers
        valid_paper_ids_in_field = sorted(set(embedding.keys()))
        
        if not valid_paper_ids_in_field:
             logger.warning(f"No valid papers with embeddings for field {field_name}. Skipping.")
             continue

        # Process subfields
        paper_coloring_data = _prepare_subfield_coloring(
            field_id=field_id,
            field_subfields_all=field_subfields_all,
            valid_paper_ids_in_field=valid_paper_ids_in_field,
            paper_to_fields_map=paper_to_fields,
            field_to_papers_map=field_to_papers,
            use_similarity_ordering=False
        )

        if paper_coloring_data is None:
            continue

        # Store results
        final_field_colors[field_id] = paper_coloring_data['field_colors_for_field']
        final_field_orders[field_id] = paper_coloring_data['ordered_subfields']

        # Create LAS file
        output_las_path = output_dir / f"{field_name}.las"
        success = _create_field_las(
            output_path=output_las_path,
            field_name=field_name,
            valid_paper_ids_in_field=valid_paper_ids_in_field,
            embedding_map=embedding,
            paper_years_map=paper_years,
            paper_coloring_data=paper_coloring_data
        )

        if success:
            computed_fields += 1
        
        if limit and computed_fields >= limit:
             logger.info(f"Reached debug limit of {limit} fields.")
             break

    logger.info(f"Generated {computed_fields} independent field point clouds.")
    return final_field_colors, final_field_orders

@cache
def ProduceTopLevelPointCloudWithIntersections():
    """
    Generate point cloud of all papers with classifications for both single fields and field intersections
    
    This enhances the standard top-level point cloud with additional classification information
    to support filtering by field intersections.
    """
    from . import project_vectors, MAG, fields

    # Get embedding and valid paper IDs
    embedding = project_vectors.GetUmapEmbedding()
    paper_years = MAG.GetYears()
    
    # Get field membership data
    field_names = fields.GetFieldNames()
    top_level = fields.GetTopLevel()
    paper_to_fields = fields.PaperToFields()
    
    # Get top-level field list
    top_fields = [field_names[fid] for fid in top_level if fid in field_names]
    
    # Setup output directory
    output_dir = DATA_FOLDER / 'potrees'
    output_dir.mkdir(exist_ok=True)
    
    # Filter papers in both MAG and embedding
    paper_ids = set(embedding)
    
    # Extract 3D coordinates
    x_coords, y_coords, z_coords = (
        np.array([embedding[paper_id][i]*100 for paper_id in paper_ids])
        for i in range(3)
    )
    
    # Convert to integers
    paper_ids_int = [int(x) for x in paper_ids]
    paper_ids_str = [str(x) for x in paper_ids_int]
    
    # Combine coordinates
    point_coordinates = np.hstack((
        x_coords.reshape((-1, 1)), 
        y_coords.reshape((-1, 1)), 
        z_coords.reshape((-1, 1))
    ))
    
    del x_coords, y_coords, z_coords
    
    # Create LAS header
    header = laspy.LasHeader(point_format=3, version="1.2")
    header.offsets = np.min(point_coordinates, axis=0)
    header.scales = np.array([0.001, 0.001, 0.001])
    
    las = laspy.LasData(header)
    
    # Set coordinates
    las.x = point_coordinates[:, 0]
    las.y = point_coordinates[:, 1]
    las.z = point_coordinates[:, 2]
    
    # Add paper ID dimension
    las.add_extra_dim(laspy.ExtraBytesParams(
        name="mag_id",
        type=np.uint32,
        description="MAG paper ID"
    ))
    las.mag_id = paper_ids_int
    
    # Store year for filtering
    las.point_source_id = [paper_years.get(pid, 0) for pid in paper_ids_int]
    
    # Calculate field memberships and intersections
    # Prepare mapping for field indices
    field_to_idx = {field: idx for idx, field in enumerate(top_fields)}
    
    # Create arrays to store field memberships for each paper
    field_memberships = np.zeros((len(paper_ids_str), len(top_fields)), dtype=bool)
    
    # Fill in the memberships
    for i, paper_id in enumerate(paper_ids_str):
        if paper_id not in paper_to_fields: 
            continue
        
        paper_fields = paper_to_fields[paper_id]
        for field_id in paper_fields:
            if field_id not in field_names: 
                continue
                
            field_name = field_names[field_id]
            if field_name not in field_to_idx: 
                continue
                
            field_memberships[i, field_to_idx[field_name]] = True
    
    # Generate classification codes for papers
    classifications = np.zeros(len(paper_ids_str), dtype=np.uint8)
    
    # Generate intersection mappings
    intersection_data = GenerateFieldIntersectionMapping()
    single_field_codes = intersection_data["single_field_codes"]
    intersection_pairs = intersection_data["intersection_pairs"]
    
    # Mapping from field index to field name
    idx_to_field = {idx: field for field, idx in field_to_idx.items()}
    
    # Calculate final classifications
    for i, memberships in enumerate(field_memberships):
        if not np.any(memberships):
            # No field membership
            classifications[i] = 0
            continue
            
        field_indices = np.where(memberships)[0]
        
        if len(field_indices) == 1:
            # Single field membership - use code from mapping
            field_name = idx_to_field[field_indices[0]]
            classifications[i] = single_field_codes.get(field_name, 0)
        else:
            # Sort indices for deterministic ordering
            field_indices = sorted(field_indices)
            # Get the names of the first two fields
            field1 = idx_to_field[field_indices[0]]
            field2 = idx_to_field[field_indices[1]]
            
            # Get the intersection code using intersection_pairs
            intersection_name = f"{field1} ∩ {field2}"
            if intersection_name in intersection_pairs:
                classifications[i] = intersection_pairs[intersection_name]
            else:
                # Fallback - use first field's code
                classifications[i] = single_field_codes.get(field1, 0)
    
    # Store classification for filtering
    las.classification = classifications
    
    # Color points by their position for better visualization
    def normalize_to_255(x):
        """Normalize to 0-255 range"""
        return 255 * (x - x.min())/ (x.max()-x.min())
    
    # Add noise for visual distinction
    noise = np.random.rand(len(paper_ids_int)+3)
    
    def add_noise_to_channel(x, channel_index):
        """Add noise to color channel for better visualization"""
        noisy_values = normalize_to_255(normalize_to_255(x) - 25 + 50*noise[channel_index:channel_index+len(x)])
        return 255/2 + noisy_values/2
    
    # Set RGB colors with noise for visual clarity
    las.blue = add_noise_to_channel(point_coordinates[:, 0], 0)
    las.red = add_noise_to_channel(point_coordinates[:, 1], 1)
    las.green = add_noise_to_channel(point_coordinates[:, 2], 2)
    
    # Save and convert
    output_file = output_dir / f"full_with_intersections.las"
    las.write(output_file)
    ConvertPotree(output_file)
    
    return output_file

if __name__ == '__main__':
    #ProduceFieldPointClouds.make(force=True)
    #ConvertPotreeAll.make(force=True)
    #ProduceFieldPointCloudsIndependently()
    #ProduceTopLevelPointCloud.make(force=True)
    ProduceTopLevelPointCloudWithIntersections.make(force=True)
    ConvertPotreeAll.make(force=True)
    #ConvertPotree(DATA_FOLDER / 'potrees' / 'full.las')