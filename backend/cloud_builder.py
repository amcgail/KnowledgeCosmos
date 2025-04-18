from scripts import project_vectors, mesh, pointclouds, deploy, fields

project_vectors.GetUmapEmbedding(force=True)
#fields.PointIterator()

pointclouds.ProduceFieldPointClouds(force=True)
pointclouds.ProduceTopLevelPointCloud(force=True)
pointclouds.ConvertPotreeAll(force=True)

# this relies on the UMAP embedding AND the field point clouds
mesh.WriteFieldMeshes()
mesh.WriteFullMesh()

# Generate field data JSON and JS files
deploy.deploy()