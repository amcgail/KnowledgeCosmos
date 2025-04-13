from scripts import project_vectors, mesh, pointclouds, deploy, fields

project_vectors.GetUmapEmbedding.make(force=True)

fields.PointIterator.make(force=True)

pointclouds.ProduceFieldPointClouds.make(force=True)
pointclouds.ProduceTopLevelPointCloud.make(force=True)
pointclouds.ConvertPotreeAll.make(force=True)

# this relies on the UMAP embedding AND the field point clouds
mesh.WriteFieldMeshes.make(force=True)
mesh.WriteFullMesh.make(force=True)

# Generate field data JSON and JS files
deploy.deploy()