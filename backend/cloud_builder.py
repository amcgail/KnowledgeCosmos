from scripts import project_vectors, mesh, pointclouds, deploy

if False:
    # producing the UMAP embedding is super important
    project_vectors.GetUmapEmbedding(
        CHUNK_SIZE=100_000,
        DEBUG=False
    )

    mesh.WriteFieldMeshes()

pointclouds.ProduceFieldPointClouds.make(force=True)
pointclouds.ConvertPotreeAll.make(force=True)
pointclouds.ProduceTopLevelPointCloud()

# Generate field data JSON and JS files
deploy.deploy()