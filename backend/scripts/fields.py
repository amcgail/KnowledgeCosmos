from .common import *
from pathlib import Path

__all__ = [
    'GetFieldNames',
    'GetTopLevel',
    'GetSubFields',
    'PointIterator',
    'FieldNameToPoints',
    'PaperToFields',
    'FieldToPapers'
]

@cache
def GetFieldNames(
    minimum_papers=1000,
    maximum_level=2,
    force_include=None
):
    import zipfile
    import io

    res = {}
    skipped=0
    # with (DATA_FOLDER / 'MAG' / 'FieldsOfStudy.txt').open('r', encoding='utf8') as inf:
    # it's a zip
    with zipfile.ZipFile(DATA_FOLDER / 'MAG' / '15.FieldsOfStudy.csv.zip') as zp:
        with io.TextIOWrapper(zp.open('FieldsOfStudy.csv'), encoding='utf8') as inf:
            for l in DictReader(inf):
                if not force_include or l['foaf_name'] not in force_include:
                    if int(l['level']) > maximum_level:
                        skipped+=1;continue
                    if int(l['paperCount']) < minimum_papers:
                        skipped+=1;continue
                    
                res[ l['entity_id'] ] = l['foaf_name']

    print('Number of Fields Skipped:', skipped)
    return res

@cache
def PointIterator(LIMIT=None):
    
    import zipfile
    from .project_vectors import GetUmapEmbedding
    from tqdm.auto import tqdm

    emb = GetUmapEmbedding()
    fnames = GetFieldNames()

    # grab the points which fit in each fieldname
    fns = sorted(list((DATA_FOLDER/'MAG').glob('16.PaperFieldsOfStudy_*.csv.zip')))
    points_per_subfield = defaultdict(list)
    subfield_per_paper = defaultdict(list)

    skipped = 0
    iii = 0

    ps = set(emb.keys())

    # Initialize a single tqdm instance outside the loops
    # We don't know the total lines easily, so omit `total`
    BATCH_SIZE = 1_000_000
    lines_processed_in_batch = 0
    with tqdm(unit='M lines', desc='Initializing...') as pbar:
        for p in sorted(fns): # Iterate through files without tqdm here
            zp = zipfile.ZipFile(str(p))
            # Ensure consistent path separators for display
            relative_p_path = Path(p).relative_to(DATA_FOLDER)
            fname_in_zip = [x.filename for x in zp.filelist if '__MAC' not in x.filename][0]
            
            # Update description for the current file
            pbar.set_description(f"Processing {relative_p_path}/{fname_in_zip}") 

            with zp.open(fname_in_zip) as inf:
                it = iter(inf) 
                try:
                    next(it) # Skip header
                except StopIteration: # Handle empty files
                    continue
                
                for l in it: # Iterate through lines without inner tqdm
                    try:
                        pid, d = l.strip().decode('utf8').split(',')
                    except ValueError:
                        # print(f"Skipping malformed line in {fname_in_zip}: {l.strip().decode('utf8', errors='ignore')}") # Optional: uncomment for debugging
                        continue

                    if pid not in ps:
                        continue
                        
                    if d not in fnames:
                        skipped+=1
                        continue
                    
                    mypos = emb[pid]
                    points_per_subfield[ d ].append( mypos )
                    subfield_per_paper[pid].append( d )
                    
                    # Update the single progress bar in batches
                    lines_processed_in_batch += 1
                    iii += 1

                    if lines_processed_in_batch >= BATCH_SIZE:
                        pbar.update(1) # Update by 1 'M lines'
                        lines_processed_in_batch = 0

                    if LIMIT is not None and iii >= LIMIT:
                        break
                        
            if LIMIT is not None and iii >= LIMIT:
                break

    # Update with any remaining lines processed in the last batch (as a fraction of a million)
    if lines_processed_in_batch > 0:
        pbar.update(lines_processed_in_batch / BATCH_SIZE)

    return points_per_subfield, subfield_per_paper

def FieldNameToPoints(LIMIT=None):
    points_per_subfield, subfield_per_paper = PointIterator(LIMIT=LIMIT)
    return points_per_subfield

def PaperToFields(LIMIT=None):
    points_per_subfield, subfield_per_paper = PointIterator(LIMIT=LIMIT)
    return subfield_per_paper

def FieldToPapers(LIMIT=None):
    subfield_per_paper = PaperToFields(LIMIT)
    
    field_to_papers = defaultdict(list)
    for paper, fields in subfield_per_paper.items():
        for field in fields:
            field_to_papers[field].append(paper)

    return field_to_papers

def GetTopLevel():
    subgs = GetSubFields()
    return [x for x in subgs if not any(x in subgs[y] for y in subgs if y!=x)]

@cache
def GetSubFields(
    MIN_PAPERS=1000
):
    
    points_per_subfield = FieldNameToPoints()
    to_focus = set(filter(lambda x:len(points_per_subfield[x])>=MIN_PAPERS,
        points_per_subfield
    ))

    subgs = defaultdict(list)
    top_level = []
    skipped=0
    
    fn = DATA_FOLDER / 'MAG' / '13.FieldOfStudyChildren.csv.zip'
    with zipfile.ZipFile(fn) as zp:
        with TextIOWrapper(zp.open('FieldOfStudyChildren.csv'), encoding='utf8') as inf:
            for l in DictReader(inf):
                if l['entity_id'] not in to_focus:continue
                subgs[l['hasParent']].append(l['entity_id'])

    print('Number of Top Level Fields:', len(top_level))
    print('Skipped:', skipped)

    return subgs