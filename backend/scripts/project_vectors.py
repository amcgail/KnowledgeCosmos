from .common import *
import numpy as np
import pickle
from tqdm.auto import tqdm
from pathlib import Path
from .MAG import GetNonEnglishIDs

__all__ = [
    'GetUmapEmbedding',
    'FitUmapToSample',
    'SampleForUmap',
    'GetUmapEmbeddingSingleFile',
    'GetAllFieldEmbeddings',
    'FitUmapToFieldSample',
    'GetFieldUmapEmbedding'
]

# ======= BEGIN HELPERS ========

VECTOR_FOLDER = DATA_FOLDER / 'vectors'

def vec_it(limit=None, start=None, filename=None, paper_ids_filter=None):
    if filename is not None:
        spfiles = [VECTOR_FOLDER / filename]
    else:
        spfiles = sorted(VECTOR_FOLDER.glob('**/paper_specter*.pkl'))

    i,j = 0,0
    for fn in spfiles:
        fin = fn.open('rb')
        unpickler = pickle.Unpickler(fin) 
        while True:
            try:
                pubid, vec = unpickler.load()
                
                if paper_ids_filter is not None and pubid not in paper_ids_filter:
                    continue

                if start is not None and i < start:
                    i += 1
                    continue
                i += 1
                    
                yield pubid, vec
                j += 1
                
                if limit is not None and j>=limit:
                    return
                
            except EOFError:
                break
        fin.close()

def portion_generator(N, paper_ids_filter=None, **kwargs):
    chunk = []
    n_yielded = 0

    for X in vec_it(paper_ids_filter=paper_ids_filter, **kwargs):
        if len(chunk) >= N:
            n_yielded += 1

            yield chunk
            chunk = []
        chunk.append(X)

    if len(chunk) > 0:
        yield chunk


def pct_sample(pct, paper_ids_filter=None, **kwargs):
    from random import random
    total_in_filter = len(paper_ids_filter) if paper_ids_filter is not None else 17e6 # Estimate if no filter
    
    count = 0
    # Calculate the number of items expected to be yielded
    expected_yield = int(total_in_filter * pct)

    # Use tqdm for progress if we have a filter and know the total size
    iterator = vec_it(paper_ids_filter=paper_ids_filter, **kwargs)
    if paper_ids_filter:
         iterator = tqdm(iterator, total=total_in_filter, desc="Sampling field vectors", leave=False)

    for X in iterator:
        # Adjust sampling probability dynamically if filter is used
        # This aims to get roughly `expected_yield` items
        if paper_ids_filter:
             # Simple approach: Keep sampling until we reach the expected count
             # A more statistically sound approach might adjust probability based on remaining items
             if count < expected_yield:
                 yield X
                 count += 1
             elif count >= expected_yield: # Stop sampling once we have enough
                  if isinstance(iterator, tqdm): iterator.close() # Close tqdm explicitly
                  break 
        elif random() < pct: # Original behavior if no filter
            yield X
            
# ======= END HELPERS ========

@cache(ignore=['DEBUG', 'SAMPLE_SIZE'])
def SampleForUmap(SAMPLE_SIZE=100_000, DEBUG=False):
    if DEBUG:
        # convenient, because it doesn't need to loop through everything
        logger.info('Sampling the first %d vectors', SAMPLE_SIZE)
        return list(vec_it(limit=SAMPLE_SIZE))
    
    # more accurate, because it's taking a random sample of the vectors
    logger.info('Randomly sampling %d vectors', SAMPLE_SIZE)
    # Estimate total size for pct_sample
    # This needs adjustment based on actual dataset size if known
    estimated_total_papers = 17e6 
    sample_fraction = SAMPLE_SIZE / estimated_total_papers
    return list(pct_sample(sample_fraction))

@cache(ignore=['DEBUG', 'SAMPLE_SIZE'])
def FitUmapToSample(
    SAMPLE_SIZE=100_000,
    DEBUG=False,
    UMAP_PARAMS=None
):
    """
    For a sample of 100k, it takes ~10GB of RAM
    """
    import umap

    samp = SampleForUmap(SAMPLE_SIZE=SAMPLE_SIZE, DEBUG=DEBUG)
    
    pids = [x[0] for x in samp]
    vs = [x[1] for x in samp]

    if UMAP_PARAMS is None:
        UMAP_PARAMS = {}

    logger.info('Fitting to the sample...')
    reducer = umap.UMAP(
        n_components=3,
        n_jobs=8, # number of threads to use
        **UMAP_PARAMS
    )
    embedding = reducer.fit_transform(vs)
    logger.info('Finished Embedding. Shape: ' + str(embedding.shape))
    
    return reducer

@cache(ignore=['CHUNK_SIZE', 'DEBUG', 'SAMPLE_SIZE'])
def GetUmapEmbeddingSingleFile(   
    filename_str: str,
    CHUNK_SIZE=10_000,
    SAMPLE_SIZE=100_000,
    DEBUG=False,
    UMAP_PARAMS=None
):
    # Convert string back to Path for internal use
    filename = Path(filename_str) 
    reducer = FitUmapToSample(SAMPLE_SIZE=SAMPLE_SIZE, DEBUG=DEBUG, UMAP_PARAMS=UMAP_PARAMS)

    def ProjectChunk(piece, reducer):
        pids = [x[0] for x in piece]
        vs = [x[1] for x in piece]

        emb = reducer.transform(np.array(vs))
        emb = {pid: e for pid,e in zip(pids,emb)}
        return emb

    if True:
        total_emb_3d = {}
        # Initialize tqdm outside the loop to track items processed
        with tqdm(total=None, desc=f"Projecting {filename.name}", unit="k vec") as pbar:
            for i, piece in enumerate(portion_generator(CHUNK_SIZE, filename=filename)):
                emb = ProjectChunk(piece, reducer)
                total_emb_3d.update(emb)
                # Manually update the progress bar by the number of items in the chunk
                pbar.update(len(piece) // 1_000)

    else:
        # sensible parallelization which nonetheless does NOTHING
        from joblib import Parallel, delayed
        total_emb_3d = {}
        for emb in Parallel(n_jobs=8, backend='threading')(
            delayed(ProjectChunk)(X, reducer)
            for X in enumerate(portion_generator(CHUNK_SIZE, filename=filename))
        ):
            total_emb_3d.update(emb)

    return total_emb_3d

def shrink_towards_center(points, factor):
    """
    Shrinks all points towards the center (centroid) of all points by the given factor.
    
    Args:
        points: Dictionary where keys are paper IDs and values are embedding coordinates
        factor: Scaling factor to control the amount of shrinkage
        
    Returns:
        Dictionary with scaled embedding coordinates
    """
    # Calculate the centroid (mean center) of all points
    all_coords = np.array(list(points.values()))
    centroid = np.mean(all_coords, axis=0)
    
    result = {}
    for pid, coords in points.items():
        # Vector from centroid to point
        vec = np.array(coords) - centroid
        # Scale this vector by factor and add back to centroid
        # This moves points closer to the centroid
        scaled_coords = centroid + vec * factor
        result[pid] = scaled_coords
    return result

@cache(ignore=['CHUNK_SIZE', 'SAMPLE_SIZE', 'DEBUG'])
def GetUmapEmbedding(
    CHUNK_SIZE=10_000,
    SAMPLE_SIZE=100_000,
    DEBUG=False,
    UMAP_PARAMS=None
):
    
    # Filter out non-English papers
    non_english_ids = GetNonEnglishIDs()
    
    # then we project the entire dataset using this projector
    logger.info('projecting all chunks')

    filenames = sorted(VECTOR_FOLDER.glob('**/paper_specter*.pkl'))
    total_emb_3d = {}

    filtered_out = 0

    for fn in filenames:
        pts = GetUmapEmbeddingSingleFile(
            filename_str=str(fn),
            CHUNK_SIZE=CHUNK_SIZE,
            SAMPLE_SIZE=SAMPLE_SIZE,
            DEBUG=DEBUG,
            UMAP_PARAMS=UMAP_PARAMS
        )

        filtered_out += len(set(int(x) for x in pts) & non_english_ids)

        total_emb_3d.update({
            pid: emb for pid, emb in pts.items() if int(pid) not in non_english_ids
        })

    # to maintain consistency, we need to shrink the points towards the center
    if UMAP_PARAMS is not None and 'spread' in UMAP_PARAMS:                
        total_emb_3d = shrink_towards_center(total_emb_3d, 1/UMAP_PARAMS['spread'])
    
    logger.info(f'Filtered embedding contains {len(total_emb_3d)} papers (removed {filtered_out} non-English papers)')
    
    return total_emb_3d

@cache(ignore=['DEBUG', 'SAMPLE_SIZE'])
def SampleForFieldUmap(field_id, field_name, SAMPLE_SIZE=100_000, DEBUG=False):
    """Samples vectors specifically for a given field."""
    from . import fields # Import fields
    field_to_papers = fields.FieldToPapers() # Get the mapping

    # Use numerical field_id for lookup
    if field_id not in field_to_papers:
         # Use name in logging
         logger.warning(f"Field {field_name} ({field_id}) not found in field_to_papers mapping. Cannot sample.")
         return [], False

    field_papers = field_to_papers[field_id]
    field_paper_set = set(field_papers)
    num_field_papers = len(field_paper_set)

    if num_field_papers == 0:
        # Use name in logging
        logger.warning(f"Field {field_name} ({field_id}) has no papers. Cannot sample.")
        return [], False

    # Determine the actual sample size, capped by the number of papers in the field
    actual_sample_size = min(SAMPLE_SIZE, num_field_papers)

    if DEBUG:
        # Use name in logging
        logger.info(f"Sampling the first {actual_sample_size} vectors for field {field_name} ({field_id})")
        # Pass the retrieved field_paper_set to vec_it
        # Return sample and flag (False, as DEBUG sampling is limited)
        return list(vec_it(limit=actual_sample_size, paper_ids_filter=field_paper_set)), False

    # Optimization: If we need all papers, fetch them directly without sampling
    used_all_papers_flag = (actual_sample_size == num_field_papers)
    if used_all_papers_flag:
        logger.info(f"Using all {num_field_papers} vectors for field {field_name} ({field_id}) (<= SAMPLE_SIZE)")
        # Return all vectors and True flag
        return list(vec_it(paper_ids_filter=field_paper_set)), True
    else:
        # Otherwise, perform random sampling
        logger.info(f"Randomly sampling {actual_sample_size} vectors from {num_field_papers} for field {field_name} ({field_id})")
        # Calculate the fraction needed from the field papers
        sample_fraction = actual_sample_size / num_field_papers if num_field_papers > 0 else 0
        # Pass the retrieved field_paper_set to pct_sample
        # Return sample and False flag
        return list(pct_sample(sample_fraction, paper_ids_filter=field_paper_set)), False

@cache(ignore=['DEBUG', 'UMAP_PARAMS', 'SAMPLE_SIZE'])
def FitUmapToFieldSample(
    field_id, 
    field_name, 
    SAMPLE_SIZE=100_000,
    DEBUG=False,
    UMAP_PARAMS=None
):
    """
    Fits a UMAP reducer to a sample of vectors from a specific field.
    """
    import umap

    # field_size = len(field_papers) # This line is removed as field_papers is no longer available and field_size is unused

    # Use the field-specific sampling function, passing both id and name
    # Gets back sample list and a flag indicating if all papers were used
    samp, used_all_papers_flag = SampleForFieldUmap(
        field_id=field_id,
        field_name=field_name, # Pass name
        SAMPLE_SIZE=SAMPLE_SIZE,
        DEBUG=DEBUG
    )

    if not samp:
        # Use name in logging
        logger.warning(f"No samples obtained for field {field_name} ({field_id}). Skipping UMAP fitting.")
        return None, None, False # Return indicating failure

    pids = [x[0] for x in samp]
    vs = np.array([x[1] for x in samp]) # Ensure vs is a NumPy array

    # Handle case where sample is too small
    if vs.shape[0] < 5: # UMAP default n_neighbors is 15, needs at least a few points
         # Use name in logging
         logger.warning(f"Sample size for field {field_name} ({field_id}) ({vs.shape[0]}) is too small for UMAP. Skipping.")
         return None, None, False # Return indicating failure

    # Use name in logging
    logger.info(f'Fitting UMAP to sample for field {field_name} ({field_id}) (sample size: {len(pids)})...')

    # Adjust UMAP parameters if sample size is small
    current_umap_params = (UMAP_PARAMS or {}).copy()
    if 'n_neighbors' not in current_umap_params:
         current_umap_params['n_neighbors'] = 15 # Default UMAP value
    if 'min_dist' not in current_umap_params:
         current_umap_params['min_dist'] = 0.1 # Default UMAP value

    # Dynamically adjust n_neighbors if the sample size is smaller
    n_neighbors = min(current_umap_params['n_neighbors'], vs.shape[0] - 1)
    if n_neighbors < 2:
         # Use name in logging
         logger.warning(f"Cannot fit UMAP for field {field_name} ({field_id}) with n_neighbors < 2 (sample size: {vs.shape[0]}). Skipping.")
         return None, None, False # Return indicating failure
    current_umap_params['n_neighbors'] = n_neighbors


    reducer = umap.UMAP(
        n_components=3,
        n_jobs=8,
        **current_umap_params
    )
    
    try:
        if used_all_papers_flag:
            # Fit and transform directly since we have all papers
            logger.info(f'Using fit_transform for {field_name} ({field_id}) as all papers are in the sample.')
            embedding_coords = reducer.fit_transform(vs)
            embedding_dict = {pid: emb for pid, emb in zip(pids, embedding_coords)}
            logger.info(f'Finished fitting UMAP for field {field_name} ({field_id}).')
            # Return reducer, the pre-computed embedding, and the flag
            return reducer, embedding_dict, True
        else:
            # Only fit the reducer on the sample
            logger.info(f'Using fit for {field_name} ({field_id}) as only a sample was used.')
            reducer.fit(vs) # Just fit, don't need transform here
            logger.info(f'Finished fitting UMAP for field {field_name} ({field_id}).')
            # Return the reducer, None for embedding, and the flag
            return reducer, None, False
    except Exception as e:
        # Use name in logging
        logger.error(f"Error fitting UMAP for field {field_name} ({field_id}): {e}")
        return None, None, False # Return indicating failure

@cache(ignore=['CHUNK_SIZE', 'SAMPLE_SIZE', 'DEBUG'])
def GetFieldUmapEmbedding(
    field_id,
    field_name,
    CHUNK_SIZE=50_000,
    SAMPLE_SIZE=100_000,
    DEBUG=False,
    UMAP_PARAMS=None
):
    """Generates the UMAP embedding for all papers in a field using a pre-trained reducer."""
    # Get the reducer for this field instead of receiving it as a parameter
    # Pass both ID and name down
    # Receives reducer, potentially pre-computed embedding dict, and flag
    reducer, embedding_dict, used_all_papers_flag = FitUmapToFieldSample(
        field_id=field_id,
        field_name=field_name,
        SAMPLE_SIZE=SAMPLE_SIZE,
        DEBUG=DEBUG,
        UMAP_PARAMS=UMAP_PARAMS
    )

    # Check if fitting failed
    if reducer is None and embedding_dict is None:
        # Use name in logging
        logger.warning(f"Reducer fitting failed for field {field_name} ({field_id}). Cannot generate embedding.")
        return {}

    # If all papers were used for fitting, the embedding is already computed
    if used_all_papers_flag:
        logger.info(f"Using pre-computed embedding for field {field_name} ({field_id}) as all papers were used in fit_transform.")
        total_emb_3d = embedding_dict
    else:
        # Otherwise, we need to project all field papers using the fitted reducer
        logger.info(f"Projecting field {field_name} ({field_id}) using reducer fitted on sample.")
        
        # Retrieve field papers internally using numerical ID
        from . import fields
        field_to_papers = fields.FieldToPapers()
        # Use numerical field_id for lookup
        field_papers = field_to_papers.get(field_id, set())
        if not field_papers:
            # Use name in logging
            logger.warning(f"No papers found for field {field_name} ({field_id}) to project. Skipping.")
            return {}

        field_paper_set = set(field_papers)
        # Use name in logging
        logger.info(f"Projecting all {len(field_paper_set)} vectors for field {field_name} ({field_id})...")

        # Helper to project a chunk using the field's reducer
        def ProjectChunk(piece, reducer):
            pids = [x[0] for x in piece]
            vs = [x[1] for x in piece]

            if not vs:

                return {}
                
            emb = reducer.transform(np.array(vs))
            emb_dict = {pid: e for pid, e in zip(pids, emb)}
            return emb_dict

        total_emb_3d = {}
        # Use the modified portion_generator with the field paper filter
        # Estimate total items for tqdm
        total_items = len(field_paper_set)
        # Use name in tqdm description
        with tqdm(total=total_items, desc=f"Projecting field {field_name}", unit="vec", leave=False) as pbar:
            # Use portion_generator with paper_ids_filter
            for piece in portion_generator(CHUNK_SIZE, paper_ids_filter=field_paper_set):
                if not piece: continue # Skip empty pieces
                
                emb = ProjectChunk(piece, reducer)
                total_emb_3d.update(emb)
                pbar.update(len(piece))

    # Use name in logging
    logger.info(f"Finished projecting field {field_name} ({field_id}). Embedding size: {len(total_emb_3d)}")
    return total_emb_3d

@cache(ignore=['CHUNK_SIZE', 'SAMPLE_SIZE', 'DEBUG'])
def GetAllFieldEmbeddings(
    CHUNK_SIZE=50_000,
    SAMPLE_SIZE=100_000,
    DEBUG=False,
    UMAP_PARAMS=None
):
    """
    Fits UMAP reducers and generates embeddings for each top-level field independently.
    When fields are smaller than SAMPLE_SIZE, we fit a UMAP reducer directly on the field.
    """
    from . import fields # Local import

    # Get field information
    field_names = fields.GetFieldNames()
    top_level_ids = fields.GetTopLevel()
    field_to_papers = fields.FieldToPapers()
    
    # Get non-English paper IDs to filter them out
    non_english_ids = GetNonEnglishIDs()
    logger.info(f'Will filter out {len(non_english_ids)} non-English papers from field embeddings')

    all_field_embeddings = {}

    # Generate embeddings for each field
    logger.info("Generating embeddings for each top-level field...")
    for field_id in tqdm(top_level_ids, desc="Processing Fields"):
        if field_id not in field_to_papers:
            logger.warning(f"No paper mapping found for top-level field ID {field_id}. Skipping.")
            continue
        
        field_papers = field_to_papers[field_id]
        field_name = field_names.get(field_id, f"ID_{field_id}") # Get name or use ID

        if field_name in FIELDS_TO_FORGET:
            continue
        
        embedding = GetFieldUmapEmbedding(
            field_id=field_id,
            field_name=field_name,
            CHUNK_SIZE=CHUNK_SIZE,
            SAMPLE_SIZE=SAMPLE_SIZE,
            DEBUG=DEBUG,
            UMAP_PARAMS=UMAP_PARAMS
        )
        if embedding:
            if UMAP_PARAMS is not None and 'spread' in UMAP_PARAMS:
                embedding = shrink_towards_center(embedding, 1/UMAP_PARAMS['spread'])
            
            # Filter out non-English papers
            filtered_embedding = {pid: emb for pid, emb in embedding.items() if int(pid) not in non_english_ids}
            logger.info(f'Filtered embedding for field {field_name} contains {len(filtered_embedding)} papers (removed {len(embedding) - len(filtered_embedding)} non-English papers)')
            
            all_field_embeddings[field_id] = filtered_embedding

        if DEBUG:
            break

    logger.info(f"Finished generating independent embeddings for {len(all_field_embeddings)} fields.")
    return all_field_embeddings

if __name__ == "__main__":
    GetUmapEmbedding(force=True)