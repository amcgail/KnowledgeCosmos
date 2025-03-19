from .common import *
from .fields import GetFieldNames, FieldNameToPoints

import alphashape
from random import sample
import trimesh

@cache
def WriteFieldMeshes(
    MIN_POINTS = 10_000,
    ALPHA = 3
):

    fnames = GetFieldNames()
    points_per_subfield = FieldNameToPoints()

    outd = DATA_FOLDER / 'field_meshes'
    outd.mkdir(exist_ok=True)

    for fid in sorted(points_per_subfield, key=lambda x:-len(points_per_subfield[x])):

        points = points_per_subfield[fid]
        if len(points) > MIN_POINTS:
            points = sample(points, MIN_POINTS)
        if len(points) < MIN_POINTS:
            continue
        
        print('processing', fnames[fid], len(points_per_subfield[fid]), 'papers')
            
        #alpha = 0.95 * alphashape.optimizealpha(points)
        hull = alphashape.alphashape(points, ALPHA)

        with open(outd / f"{fnames[fid]}.stl", 'wb') as outf:
            outf.write( trimesh.exchange.export.export_stl(hull) )

    return "Success"