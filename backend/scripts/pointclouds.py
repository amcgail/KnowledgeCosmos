from .common import *

def ConvertPotree(where):
    where = Path(where)

    out_fn = DATA_FOLDER / 'potrees_converted'
    out_fn.mkdir(exist_ok=True)
    out_fn = out_fn / where.stem

    args = (
        str(POTREE_CONVERTER),
        str(where),
        '-o', 
        str(out_fn),
    )

    import subprocess

    subprocess.run(args, check=True)

@cache
def ConvertPotreeAll():
    from . import fields
    top_level = fields.GetTopLevel()
    fnames = fields.GetFieldNames()

    IN_FOLDER = DATA_FOLDER / 'potrees'

    for G in top_level:
        if G not in fnames:
            continue
        
        Gname = fnames[G]
        logger.debug(f"Converting {Gname}...")
        ConvertPotree(IN_FOLDER / f"{Gname}.las")

    return "Success"

@cache
def ProduceTopLevelPointCloud():
    from matplotlib import cm
    import laspy

    from . import project_vectors, MAG

    emb = project_vectors.GetUmapEmbedding()
    ids_to_keep = MAG.GetIds()

    OUT_DIR = DATA_FOLDER / 'potrees'
    OUT_DIR.mkdir(exist_ok=True)
    
    # only the points in MAG and the embedding
    ids = sorted(ids_to_keep & set(emb))

    my_data_xx, my_data_yy, my_data_zz = (
        np.array([emb[x][i]*100 for x in ids])
        for i in range(3)
    )
    idstr = ids
    ids = [int(x) for x in idstr]

    my_data = np.hstack((my_data_xx.reshape((-1, 1)), my_data_yy.reshape((-1, 1)), my_data_zz.reshape((-1, 1))))

    del my_data_xx
    del my_data_yy
    del my_data_zz

    # 1. Create a new header
    header = laspy.LasHeader(point_format=3, version="1.2")
    #header.add_extra_dim(laspy.ExtraBytesParams(name="random", type=np.int32))
    header.offsets = np.min(my_data, axis=0)
    header.scales = np.array([0.001, 0.001, 0.001])

    # 2. Create a Las
    las = laspy.LasData(header)

    las.x = my_data[:, 0]
    las.y = my_data[:, 1]
    las.z = my_data[:, 2]

    las.add_extra_dim(laspy.ExtraBytesParams(
        name="mag_id",
        type=np.uint32,
        description=""
    ))
    las.mag_id = ids
    
    def scale(x):
        return 256 * (x - x.min())/ (x.max()-x.min())
    
    noise = np.random.rand(len(ids)+3)
    def noisify(x, i):
        # the shift is to make sure the noise is different for each channel
        y = scale(scale(x) - 25 + 50*noise[i:i+len(x)])
        
        # make everything brighter
        return 256/2 + y/2

    las.blue = noisify( my_data[:, 0], 0 )
    las.red = noisify( my_data[:, 1], 1 )
    las.green = noisify( my_data[:, 2], 2 )
    
    outf = OUT_DIR / f"full.las"
    las.write(outf)

    ConvertPotree(outf)

    return outf

@cache
def ProduceFieldPointClouds():    
    from matplotlib import cm
    import laspy

    from . import fields, project_vectors, MAG

    fnames = fields.GetFieldNames(force_include=['Education'])
    top_level = fields.GetTopLevel()
    subgs = fields.GetSubFields()

    subfield_per_paper = fields.PaperToFields()
    paper_per_subfield = fields.FieldToPapers()
    
    emb = project_vectors.GetUmapEmbedding()
    ids_to_keep = MAG.GetIds()

    OUT_DIR = DATA_FOLDER / 'potrees'
    OUT_DIR.mkdir(exist_ok=True)

    labels = defaultdict(dict)

    for G in fnames:
        if G not in top_level:
            continue
        
        # all paper for (large) top-level subfield
        g = paper_per_subfield[G]
        Gname = fnames[G]
        print(Gname)
        
        subfields = subgs[G]
        ncol = len(subfields)
        
        colors = []
        colors = np.array(colors)
        
        sss = sorted( subfields, key=lambda x:-len(paper_per_subfield[x]) )
        to_label, no_label = sss[:8], sss[8:]
        to_labels = set(to_label)

        labels[G] = {x: cm.Set1(i) for i,x in enumerate(sss)}

        ids = sorted(set(g).intersection(ids_to_keep))

        my_data_xx, my_data_yy, my_data_zz = (
            np.array([emb[x][i]*100 for x in ids])
            for i in range(3)
        )
        idstr = ids
        ids = [int(x) for x in idstr]

        if not len(ids):
            continue

        my_data = np.hstack((my_data_xx.reshape((-1, 1)), my_data_yy.reshape((-1, 1)), my_data_zz.reshape((-1, 1))))
        del my_data_xx
        del my_data_yy
        del my_data_zz

        # 1. Create a new header
        header = laspy.LasHeader(point_format=3, version="1.2")
        #header.add_extra_dim(laspy.ExtraBytesParams(name="random", type=np.int32))
        header.offsets = np.min(my_data, axis=0)
        header.scales = np.array([0.001, 0.001, 0.001])

        # 2. Create a Las
        las = laspy.LasData(header)

        las.x = my_data[:, 0]
        las.y = my_data[:, 1]
        las.z = my_data[:, 2]

        #mxl = len("3087755868")
        #ct = mxl//2

        las.add_extra_dim(laspy.ExtraBytesParams(
            name="mag_id",
            type=np.uint32,
            description=""
        ))
        las.mag_id = ids
        
        def gc(pid):
            
            sf = subfield_per_paper[pid]
            sf = [x for x in sf if x in to_labels]
            
            if len(sf):
                sfi = choice(sf)
            else:
                return cm.Set1(50)
                
            return labels[G][ sfi ]
        
        cs = np.array([gc(pid) for pid in idstr])
        
        las.blue = cs[:, 0] * 256
        las.red = cs[:, 1] * 256
        las.green = cs[:, 2] * 256
        
        las.write(OUT_DIR / f"{Gname}.las")

    return labels

if __name__ == '__main__':
    ConvertPotree('D:/3dmap/field_potrees/0TOP.las')