from .common import *

@cache
def GetIds():
    # now look in the DB to find which IDs to actually include
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