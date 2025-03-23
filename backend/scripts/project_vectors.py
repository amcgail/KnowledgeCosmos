from .common import *

# ======= BEGIN HELPERS ========

VECTOR_FOLDER = DATA_FOLDER / 'vectors'

def vec_it(limit=None, start=None, filename=None):
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

def portion_generator(N, **kwargs):
    chunk = []
    n_yielded = 0

    for X in vec_it(**kwargs):
        if len(chunk) >= N:
            n_yielded += 1

            yield chunk
            chunk = []
        chunk.append(X)

# ======= END HELPERS ========


# we begin by creating a `reducer` UMAP projector, 
# based on a subset of the dataset

def pct_sample(pct, **kwargs):
    from random import random
    for X in vec_it(**kwargs):
        if random() < pct:
            yield X

@cache(ignore=['DEBUG'])
def SampleForUmap(SAMPLE_SIZE=1_000_000, DEBUG=False):
    logger.info('sampling...')

    if DEBUG:
        # convenient, because it doesn't need to loop through everything
        return list(vec_it(limit=SAMPLE_SIZE))
    
    # more accurate, because it's taking a random sample of the vectors
    return list(pct_sample(SAMPLE_SIZE / 17e6))

@cache(ignore=['DEBUG'])
def FitUmapToSample(
    SAMPLE_SIZE=1_000_000,
    DEBUG=False
):
    """
    For a sample of 100k, it takes ~10GB of RAM
    """
    import umap

    samp = SampleForUmap(SAMPLE_SIZE=SAMPLE_SIZE, DEBUG=DEBUG)
    
    pids = [x[0] for x in samp]
    vs = [x[1] for x in samp]

    logger.info('Fitting to the sample...')
    reducer = umap.UMAP(n_components=3)
    embedding = reducer.fit_transform(vs)
    logger.info('Finished Embedding. Shape: ' + str(embedding.shape))
    
    return reducer

@cache(ignore=['CHUNK_SIZE', 'DEBUG'])
def GetUmapEmbeddingSingleFile(   
    filename,
    CHUNK_SIZE=10_000,
    SAMPLE_SIZE=100_000,
    DEBUG=False
):
    reducer = FitUmapToSample(SAMPLE_SIZE=SAMPLE_SIZE, DEBUG=DEBUG)

    def ProjectChunk(X, reducer):
        i,piece = X
        print(f'doing chunk {i}... {len(piece):,} items, {CHUNK_SIZE*i/1000_000:0.1f}M total')

        pids = [x[0] for x in piece]
        vs = [x[1] for x in piece]

        emb = reducer.transform(np.array(vs))
        emb = {pid: e for pid,e in zip(pids,emb)}
        return emb

    if True:
        total_emb_3d = {}
        for part in enumerate(portion_generator(CHUNK_SIZE, filename=filename)):
            emb = ProjectChunk(part, reducer)
            total_emb_3d.update(emb)

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

@cache(ignore=['CHUNK_SIZE'])
def GetUmapEmbedding(
    CHUNK_SIZE=10_000,
    SAMPLE_SIZE=100_000,
    DEBUG=False
):
    
    # then we project the entire dataset using this projector
    logger.info('projecting all chunks')

    filenames = sorted(VECTOR_FOLDER.glob('**/paper_specter*.pkl'))
    total_emb_3d = {}

    for fn in filenames:
        total_emb_3d.update(
            GetUmapEmbeddingSingleFile(
                filename=fn,
                CHUNK_SIZE=CHUNK_SIZE,
                SAMPLE_SIZE=SAMPLE_SIZE,
                DEBUG=DEBUG
            )
        )

    return total_emb_3d

    """
    total_emb_3d = {}
    for X in enumerate(portion_generator(CHUNK_SIZE)):
        emb = ProjectChunk(X)
        total_emb_3d.update(emb)
    """

    """
    # parallelization breaks EVERYTHING, agh
    # it doesn't die if we keep n_jobs=1, but it's not faster
    total_emb_3d = {}
    for emb in Parallel(n_jobs=1, backend='threading')(
        delayed(ProjectChunk)(X, reducer)
        for X in enumerate(portion_generator(CHUNK_SIZE))
    ):
        total_emb_3d.update(emb)

    return total_emb_3d
    """