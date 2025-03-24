from .common import *
from . import fields, pointclouds, mesh

import json

def expose_field_data():
    # Get the field data using the proper functions
    fnames = fields.GetFieldNames()
    top_level = fields.GetTopLevel()
    subgs = fields.GetSubFields()
    colors, orders = pointclouds.ProduceFieldPointClouds()

    i2n = fields.GetFieldNames()
    nm = lambda x: i2n[x]
    ok = lambda x: x in i2n

    subgs = {nm(i): [nm(j) for j in v if ok(j)] for i, v in subgs.items() if i in top_level and ok(i)}
    subfield_colors = {nm(i): {nm(j): c for j, c in v.items() if ok(j)} for i, v in colors.items() if ok(i)}
    top_level = sorted([nm(x) for x in top_level if ok(x)])
    field_orders = {nm(i): [nm(j) for j in v if ok(j)] for i, v in orders.items() if ok(i)}

    # Create the data structure
    field_data = {
        "fields": mesh.WriteFieldMeshes(), # just the fields for which we have a mesh
        "subfield_colors": subfield_colors,  # We'll need to implement color generation
        "subfields": subgs,
        "top_level": top_level,
        "field_colors": colors,
        "field_orders": field_orders
    }

    # Create static directory if it doesn't exist
    static_dir = Path(DATA_FOLDER) / 'static'
    static_dir.mkdir(exist_ok=True)

    # Write JSON file
    json_path = static_dir / 'fields.json'
    with open(json_path, "w") as f:
        json.dump(field_data, f, indent=2)

def deploy():
    expose_field_data()

if __name__ == "__main__":
    deploy()

    # now chdir into ../../.. and run deploy.py
    print('Running the deploy script to push to github')
    os.chdir('../../..')
    os.system('python deploy.py')