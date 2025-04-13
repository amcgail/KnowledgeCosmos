from .common import *
from . import fields, pointclouds, mesh

import json
import os
import sys

def expose_field_data():
    # Get the field data using the proper functions
    fnames = fields.GetFieldNames()
    top_level = fields.GetTopLevel()
    subgs = fields.GetSubFields()
    colors, orders = pointclouds.ProduceFieldPointClouds()
    field_centers = mesh.GetFieldCenters()

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
        "field_orders": field_orders,
        "field_centers": field_centers  # Add the field centers to the output
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

    # --- Added Symlink Creation ---
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent.parent
    src_path = project_root / "data" / "static"
    dst_path = project_root / "frontend-html" / "static"

    logger.info(f"Attempting to create symlink: '{dst_path}' -> '{src_path}'")

    # Ensure the source directory exists
    if not src_path.exists():
        logger.error(f"Source path for symlink does not exist: '{src_path}'")
        return # Exit deploy function if source doesn't exist

    # Check if the link destination path already exists
    if dst_path.exists() or dst_path.is_symlink():
        if dst_path.is_symlink() and dst_path.resolve() == src_path.resolve():
             logger.info(f"Symlink '{dst_path}' already exists and points correctly.")
        else:
             logger.warning(f"Path '{dst_path}' already exists and is not the desired symlink. Please remove it manually if you want the link created.")
             # Optionally, could remove it:
             # try:
             #     if dst_path.is_dir() and not dst_path.is_symlink():
             #         os.rmdir(dst_path) # Use os.rmdir for empty dirs
             #     else:
             #         os.remove(dst_path) # Use os.remove for files or links
             #     logger.info(f"Removed existing file/directory at '{dst_path}'.")
             # except OSError as e:
             #     logger.error(f"Could not remove existing file/directory at '{dst_path}': {e}")
             #     return # Stop if we can't remove the obstacle
    else:
        try:
            # Create the symlink
            target_is_directory = sys.platform == "win32" # Required on Windows for directory links
            os.symlink(src_path, dst_path, target_is_directory=target_is_directory)
            logger.info(f"Successfully created symlink: '{dst_path}' -> '{src_path}'")
        except OSError as e:
            logger.error(f"Error creating symlink: {e}")
            if sys.platform == "win32":
                logger.warning("On Windows, creating symlinks might require administrator privileges or Developer Mode enabled.")
        except Exception as e: # Catch any other unexpected errors
             logger.error(f"An unexpected error occurred during symlink creation: {e}")
    # --- End Symlink Creation ---

if __name__ == "__main__":
    deploy()