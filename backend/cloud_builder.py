from scripts import project_vectors, mesh, pointclouds

# producing the UMAP embedding is super important
project_vectors.GetUmapEmbedding.make(
    CHUNK_SIZE=100_000,
    DEBUG=False
)

mesh.WriteFieldMeshes.make()

pointclouds.ProduceFieldPointClouds()
pointclouds.ConvertPotreeAll()
pointclouds.ProduceTopLevelPointCloud.make()