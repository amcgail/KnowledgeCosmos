# 3D Map Repository

[![Documentation Status](https://img.shields.io/website?label=docs&url=https://amcgail.github.io/KnowledgeCosmos/)](https://amcgail.github.io/KnowledgeCosmos/)
[![Demo](https://img.shields.io/website?label=demo&url=https://knowledge-cosmos-3d-map.s3.amazonaws.com/index.html)](https://knowledge-cosmos-3d-map.s3.amazonaws.com/index.html)
[![Python Version](https://img.shields.io/badge/python-3.7%2B-blue)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Welcome to the 3D Map Repository, a powerful tool for processing and visualizing academic papers in 3D space. You can explore the live demo at [Knowledge Cosmos](https://knowledge-cosmos-3d-map.s3.amazonaws.com/index.html) and read the full documentation at [amcgail.github.io/KnowledgeCosmos](https://amcgail.github.io/KnowledgeCosmos/).

## Getting Started

To get started with your own instance, first clone this repository. You'll need to create a `.env` file in the root directory with two key variables:
```
DATA_FOLDER=/path/to/your/data/folder
POTREE_CONVERTER=/path/to/potree_converter
```

The project is organized with a backend containing processing scripts (like `common.py` for utilities and caching) and comprehensive documentation in the `docs` directory.

## Building the Visualization

To build the visualization, you'll first need the [Potree Converter](https://github.com/potree/PotreeConverter/releases) binary. After installing it, copy `.env.example` to `.env` and configure your environment variables. Then simply run the `cloud_builder.py` script.

## Viewing the Results

To view the visualization, serve the `frontend` folder via HTTP. Make sure to use a server that supports range requests - for example, you can use `python -m RangeHTTPServer`. 

## Data Sources

The visualization relies on several key data sources:

The SPECTER vectors can be downloaded from [Zenodo](https://zenodo.org/records/4917086) - look for the `paper_specter_{i}.pkl` files. These vectors were generated using [this model](https://arxiv.org/pdf/2004.07180). While you can use the [Zenodo API](https://developers.zenodo.org/) or [zenodo_get](https://github.com/dvolgyes/zenodo_get), I recommend using JDownloader for managing the ~54GB download of 17M papers.

The vectors were generated using the [SPECTER model](https://github.com/allenai/specter), which is [publicly available](https://huggingface.co/allenai/specter). The model was recently extended in November 2023 with [SPECTER2](https://allenai.org/blog/specter2-adapting-scientific-document-embeddings-to-multiple-fields-and-task-formats-c95686c06567).

For the Microsoft Academic Graph (MAG) data, you'll need:
- `FieldsOfStudy.txt.gz` (18.4MB) and `Papers.txt.gz` (22.8GB) from [this 2019 dataset](https://zenodo.org/records/2628216) covering 238M papers
- `16.PaperFieldsOfStudy.nt.bz2` (7.3GB) from [the 2021 RDF dump](https://zenodo.org/records/4617285)

While more recent data would be nice, the vectors were computed in September 2020, so they align well with this dataset.

For real-time paper information, we use the [Semantic Scholar API](https://api.semanticscholar.org/api-docs/graph#tag/Paper-Data/operation/post_graph_get_papers). This API can also be used to [compute new SPECTER vectors](https://github.com/allenai/paper-embedding-public-apis) for embedding new papers.

## Contributing

We welcome contributions! When adding features or making modifications, please update the relevant documentation and add docstrings to new functions and classes. Follow the existing code style to maintain consistency.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

### Why Apache 2.0?

- Compatible with SPECTER and other academic tools
- Provides patent protection
- Allows commercial use while maintaining attribution
- Promotes open science and collaboration
- Clear terms for modifications and distributions

### Third-Party Data and APIs

This project uses several third-party data sources and APIs:

- SPECTER model and vectors (Apache 2.0)
- Microsoft Academic Graph data (ODC-BY)
- Semantic Scholar API (Free for academic use)

Please refer to each data source's terms of use for specific licensing requirements.