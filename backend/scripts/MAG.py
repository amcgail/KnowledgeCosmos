from .common import *

__all__ = [
    'GetYears',
    'GetIds',
    'GetNonEnglishIDs'
]

@cache
def GetYears():
    import gzip
    from io import BytesIO

    paperfn = DATA_FOLDER / 'MAG' / 'Papers.txt.gz'

    import gzip
    import io
    from tqdm import tqdm

    years = {}

    # we limit to MAGIDs that are in the DB
    ids = GetIds()

    # Step 1: open outer gzip file, 22.3 GB
    with gzip.open(paperfn, "rb") as outer:
        # Step 2: wrap the outer stream as a file-like buffer for inner gzip
        inner_stream = gzip.open(outer, mode="rt", encoding="utf-8", errors="replace")

        # Step 3: stream lines from inner file, roughly 17M lines
        pbar = tqdm(enumerate(inner_stream), total=int(230e6), desc="Processing papers")
        for i, line in pbar:
            if i % 1000000 == 0:
                pbar.set_description(f"Collected {len(years)/1e6:.1f}M")
                
            year = line.split('\t')[7]
            magid_str = line.split('\t')[0]
            magid = int(magid_str)

            if magid_str not in ids:
                continue

            try:
                year = int(year)
            except:
                print(year)
                raise
                year = None

            if year is not None:
                years[magid] = year

    return years

@cache
def GetIds():
    # In case you are going to use server.py for a backend
    # NOTE: Currently, we use Semantic Scholar to query papers, so this is irrelevant
    import psycopg2
    conn = psycopg2.connect("dbname=MAG user=postgres password=mcgail port=5433")
    cur = conn.cursor()
    cur.execute("""
        SELECT mag_id FROM papers
    """)
    res = cur.fetchall()
    cur.close()

    ids = [str(x[0]) for x in res]
    ids = set(ids)
    return ids

@cache
def GetNonEnglishIDs():
    """Returns a set of MAG IDs for papers with English titles.
    Uses a simple ASCII-based approach to detect English titles."""
    import gzip
    from io import BytesIO
    from tqdm import tqdm

    paperfn = DATA_FOLDER / 'MAG' / 'Papers.txt.gz'
    non_english_ids = set()

    def is_english_title(title):
        if not title:  # Skip empty titles
            return False
        ascii_count = sum(1 for c in title if ord(c) < 128)
        return (ascii_count / len(title)) > 0.9 and len(title) > 10

    # Step 1: open outer gzip file
    with gzip.open(paperfn, "rb") as outer:
        # Step 2: wrap the outer stream as a file-like buffer for inner gzip
        inner_stream = gzip.open(outer, mode="rt", encoding="utf-8", errors="replace")

        # Step 3: stream lines from inner file
        pbar = tqdm(enumerate(inner_stream), total=int(230e6), desc="Processing papers")
        for i, line in pbar:
            if i % 1000000 == 0:
                pbar.set_description(f"Collected {len(non_english_ids)/1e6:.1f}M non-English papers")
            
            parts = line.split('\t')
            if len(parts) < 3:  # Skip malformed lines
                continue

            magid_str = parts[0]
            title = parts[5]  # Title is in the 6th column

            if not is_english_title(title):
                non_english_ids.add(int(magid_str))

    return non_english_ids

if __name__ == '__main__':
    print('before', len(GetNonEnglishIDs()))
    print('after', len(GetNonEnglishIDs(force=True)))
