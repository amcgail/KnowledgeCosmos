from .common import *
from . import fields

import json

def expose_field_data():
    # Get the field data using the proper functions
    fnames = fields.GetFieldNames()
    top_level = fields.GetTopLevel()
    subgs = fields.GetSubFields()
    
    # Create the data structure
    field_data = {
        "fields": list(fnames.values()),  # All field names
        "subfield_colors": {},  # We'll need to implement color generation
        "subfields": subgs,
        "top_level": top_level
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