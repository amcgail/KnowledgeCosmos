from .common import *

def ConvertPotree(input_las_path):
    """
    Convert a LAS file to Potree format for web visualization.
    
    Args:
        input_las_path: Path to the input LAS file
    """
    input_las_path = Path(input_las_path)

    # Create output directory for pointclouds
    output_dir = DATA_FOLDER / 'static' / 'pointclouds'
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / input_las_path.stem

    # Prepare command arguments for Potree converter
    args = (
        str(POTREE_CONVERTER),
        str(input_las_path),
        '-o', 
        str(output_path),
    )

    import subprocess
    subprocess.run(args, check=True)

@cache
def ConvertPotreeAll():
    """
    Convert all LAS files in the potrees directory to Potree format.
    Only processes files that correspond to top-level fields.
    """
    from . import fields
    top_level = fields.GetTopLevel()
    field_names = fields.GetFieldNames()

    input_dir = DATA_FOLDER / 'potrees'

    for field_id in top_level:
        if field_id not in field_names:
            continue
        
        field_name = field_names[field_id]
        logger.debug(f"Converting {field_name}...")
        ConvertPotree(input_dir / f"{field_name}.las")

    return "Success"

@cache
def ProduceTopLevelPointCloud():
    """
    Generate a point cloud visualization of all papers in the top-level embedding.
    Points are colored based on their position in the embedding space.
    """
    from matplotlib import cm
    import laspy

    from . import project_vectors, MAG

    # Get embedding and valid paper IDs
    embedding = project_vectors.GetUmapEmbedding()
    valid_paper_ids = MAG.GetIds()

    # Setup output directory
    output_dir = DATA_FOLDER / 'potrees'
    output_dir.mkdir(exist_ok=True)
    
    # Filter papers to only include those in both MAG and embedding
    paper_ids = sorted(valid_paper_ids & set(embedding))

    # Extract 3D coordinates from embedding
    x_coords, y_coords, z_coords = (
        np.array([embedding[paper_id][i]*100 for paper_id in paper_ids])
        for i in range(3)
    )
    
    # Convert paper IDs to integers
    paper_ids_int = [int(x) for x in paper_ids]

    # Combine coordinates into a single array
    point_coordinates = np.hstack((
        x_coords.reshape((-1, 1)), 
        y_coords.reshape((-1, 1)), 
        z_coords.reshape((-1, 1))
    ))

    del x_coords, y_coords, z_coords

    # Create LAS file header
    header = laspy.LasHeader(point_format=3, version="1.2")
    header.offsets = np.min(point_coordinates, axis=0)
    header.scales = np.array([0.001, 0.001, 0.001])

    # Initialize LAS data structure
    las = laspy.LasData(header)

    # Set point coordinates
    las.x = point_coordinates[:, 0]
    las.y = point_coordinates[:, 1]
    las.z = point_coordinates[:, 2]

    # Add paper ID as extra dimension
    las.add_extra_dim(laspy.ExtraBytesParams(
        name="mag_id",
        type=np.uint32,
        description="MAG paper ID"
    ))
    las.mag_id = paper_ids_int
    
    def normalize_to_255(x):
        """Normalize values to 0-255 range"""
        return 255 * (x - x.min())/ (x.max()-x.min())
    
    # Generate random noise for color variation
    noise = np.random.rand(len(paper_ids_int)+3)
    def add_noise_to_channel(x, channel_index):
        """Add controlled noise to color channel for better visualization"""
        # Shift noise to ensure different patterns for each channel
        noisy_values = normalize_to_255(normalize_to_255(x) - 25 + 50*noise[channel_index:channel_index+len(x)])
        # Increase overall brightness
        return 255/2 + noisy_values/2

    # Set RGB colors with noise for better visualization
    las.blue = add_noise_to_channel(point_coordinates[:, 0], 0)
    las.red = add_noise_to_channel(point_coordinates[:, 1], 1)
    las.green = add_noise_to_channel(point_coordinates[:, 2], 2)
    
    # Save and convert the LAS file
    output_file = output_dir / f"full.las"
    las.write(output_file)
    ConvertPotree(output_file)

    return output_file

DEFAULT_COLOR = (0.2, 0.2, 0.2, 0.5)

@cache
def ProduceFieldPointClouds(debug=False):
    """
    Generate point cloud visualizations for each top-level field.
    Points are colored based on their subfield membership.
    """
    def convert_color_channel(values):
        """Convert normalized color values (0-1) to 8-bit color range (0-255)"""
        return np.clip(values * 255, 0, 255).astype(np.uint8)

    from matplotlib import cm
    import laspy

    from . import fields, project_vectors, MAG

    # Get field information
    field_names = fields.GetFieldNames(force_include=['Education'])
    top_level = fields.GetTopLevel()
    subfields = fields.GetSubFields()

    # Get paper-field mappings
    paper_to_fields = fields.PaperToFields()
    field_to_papers = fields.FieldToPapers()
    
    # Get embedding and valid paper IDs
    embedding = project_vectors.GetUmapEmbedding()
    valid_paper_ids = MAG.GetIds()

    # Setup output directory
    output_dir = DATA_FOLDER / 'potrees'
    output_dir.mkdir(exist_ok=True)

    # Store color mappings for each field
    field_colors = {}
    field_orders = {}

    color_options = [[0.5123862745098039, 0.0, 0.6026156862745098, 1.0], [0.13593921568627448, 0.0, 0.6496980392156863, 1.0], [0.0, 0.36603921568627423, 0.8667, 1.0], [0.0, 0.5320431372549019, 0.8667, 1.0], [0.0, 0.613078431372549, 0.8274843137254903, 1.0], [0.0, 0.6601607843137255, 0.6863078431372549, 1.0], [0.0, 0.6667, 0.5856137254901961, 1.0], [0.0, 0.6510058823529411, 0.4078176470588235, 1.0], [0.0, 0.7803823529411762, 0.0, 1.0], [0.2875686274509804, 1.0, 0.0, 1.0], [0.7529078431372549, 0.9934607843137255, 0.0, 1.0], [0.8940843137254902, 0.9463784313725491, 0.0, 1.0], [0.9673039215686274, 0.865343137254902, 0.0, 1.0], [1.0, 0.7568627450980392, 0.0, 1.0], [1.0, 0.615686274509804, 0.0, 1.0], [1.0, 0.27058823529411763, 0.0, 1.0], [0.8222333333333334, 0.0, 0.0, 1.0], [0.8, 0.2980392156862745, 0.2980392156862745, 1.0], [0.8, 0.8, 0.8, 1.0]]

    if debug:
        limit = 1
    else:
        limit = None

    computed_fields = 0

    for field_id in field_names.keys():
        if field_id not in top_level:
            continue

        if limit and computed_fields > limit:
            break
        
        # Get all papers for this top-level field
        field_papers = field_to_papers[field_id]
        field_name = field_names[field_id]
        print(field_name)
        
        # Get subfields and their papers
        field_subfields = subfields[field_id]
        num_subfields = len(field_subfields)
        
        # Sort subfields by paper count and select top 20 for labeling
        N_to_choose = len(color_options)
        sorted_subfields = sorted(field_subfields, key=lambda x:-len(field_to_papers[x]))
        labeled_subfields, unlabeled_subfields = sorted_subfields[:N_to_choose], sorted_subfields[N_to_choose:]
        labeled_subfield_set = set(labeled_subfields)

        # Calculate similarity between subfields based on paper overlap
        similarity_matrix = np.zeros((len(labeled_subfields), len(labeled_subfields)))
        for paper in field_papers:
            for subfield1 in paper_to_fields[paper]:
                if subfield1 not in labeled_subfield_set: continue
                for subfield2 in paper_to_fields[paper]:
                    if subfield2 not in labeled_subfield_set: continue

                    i = labeled_subfields.index(subfield1)
                    j = labeled_subfields.index(subfield2)
                    similarity_matrix[i,j] += 1
        
        # Normalize similarity matrix
        similarity_matrix = similarity_matrix / similarity_matrix.sum(axis=1, keepdims=True)
        
        # Order subfields by similarity for color assignment
        ordered_subfields = [sorted_subfields[0]]
        while len(ordered_subfields) < len(labeled_subfields):
            last_subfield = ordered_subfields[-1]
            similar_subfields = np.argsort(similarity_matrix[labeled_subfields.index(last_subfield)])[::-1]
            for j in similar_subfields:
                if labeled_subfields[j] not in ordered_subfields:
                    ordered_subfields.append(labeled_subfields[j])
                    break

        # idea 1: tab20
        # idea 2: the middle of twilight is beautiful cm.twilight_shifted(.2 + 0.7 * i/20)
        # idea 3: hand chosen colors

        # Assign colors to subfields
        field_colors[field_id] = {
            subfield: color_options[
                # distribute colors evenly
                int(i * len(color_options)/len(ordered_subfields))
            ] if i < len(ordered_subfields) else DEFAULT_COLOR
            for i, subfield in enumerate(ordered_subfields + unlabeled_subfields)
        }

        field_orders[field_id] = ordered_subfields

        # Create a mapping of subfields to classification codes
        # Start from 1 since 0 is often reserved for unclassified points
        subfield_classifications = {
            subfield: i + 1 
            for i, subfield in enumerate(ordered_subfields)
        }

        subfield_classifications['Other'] = len(ordered_subfields) + 1

        # Get valid papers for this field
        valid_field_papers = sorted(set(field_papers).intersection(valid_paper_ids))

        # Extract 3D coordinates for valid papers
        x_coords, y_coords, z_coords = (
            np.array([embedding[paper_id][i]*100 for paper_id in valid_field_papers])
            for i in range(3)
        )
        paper_ids_str = valid_field_papers
        paper_ids_int = [int(x) for x in paper_ids_str]

        if not len(paper_ids_int):
            continue

        # Combine coordinates
        point_coordinates = np.hstack((
            x_coords.reshape((-1, 1)), 
            y_coords.reshape((-1, 1)), 
            z_coords.reshape((-1, 1))
        ))
        del x_coords, y_coords, z_coords

        # Create LAS file
        header = laspy.LasHeader(point_format=3, version="1.2")
        header.offsets = np.min(point_coordinates, axis=0)
        header.scales = np.array([0.001, 0.001, 0.001])

        las = laspy.LasData(header)

        # Set point coordinates
        las.x = point_coordinates[:, 0]
        las.y = point_coordinates[:, 1]
        las.z = point_coordinates[:, 2]

        # Add paper ID as extra dimension
        las.add_extra_dim(laspy.ExtraBytesParams(
            name="mag_id",
            type=np.uint32,
            description="MAG paper ID"
        ))
        las.mag_id = paper_ids_int
        
        def get_paper_color_and_classification(paper_id):
            """Get color and classification for a paper based on its subfield membership"""
            paper_subfields = paper_to_fields[paper_id]
            paper_subfields = [x for x in paper_subfields if x in labeled_subfield_set]
            
            if len(paper_subfields):
                selected_subfield = choice(paper_subfields)
                color = field_colors[field_id][selected_subfield]
                classification = subfield_classifications[selected_subfield]
            else:
                color = DEFAULT_COLOR
                classification = 0  # Unclassified
                
            return color, classification
        
        # Assign colors and classifications to points
        colors_and_classes = [get_paper_color_and_classification(paper_id) for paper_id in paper_ids_str]
        colors = np.array([x[0] for x in colors_and_classes])
        classifications = np.array([x[1] for x in colors_and_classes])
        
        # Set RGB colors
        las.red = convert_color_channel(colors[:, 0])
        las.green = convert_color_channel(colors[:, 1]) 
        las.blue = convert_color_channel(colors[:, 2])
        
        # Set classifications
        las.classification = classifications
        
        # Save LAS file
        las.write(output_dir / f"{field_name}.las")
        
        computed_fields += 1

    return field_colors, field_orders

if __name__ == '__main__':
    #ProduceFieldPointClouds.make(debug=True, force=True)
    ConvertPotree(DATA_FOLDER / 'potrees' / 'History.las')