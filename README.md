# 3D Map Repository

This repository contains tools and utilities for processing and visualizing 3D map data.

## Documentation

The project documentation is organized as follows:

- [Caching System](docs/caching.md) - Documentation for the caching system used throughout the project
- (Add more documentation links here as they are created)

## Project Structure

```
.
├── backend/
│   └── scripts/
│       ├── common.py      # Common utilities including caching system
│       └── ...
├── docs/                  # Documentation files
└── ...
```

## Setup

1. Clone the repository
2. Create a `.env` file in the root directory with the following variables:
   ```
   DATA_FOLDER=/path/to/your/data/folder
   POTREE_CONVERTER=/path/to/potree_converter
   ```
3. Install dependencies (requirements.txt to be added)

## Contributing

When adding new features or modifying existing ones, please:
1. Update the relevant documentation
2. Add docstrings to new functions and classes
3. Follow the existing code style

## License

[Add your license information here]

# re-building

To re-build, first install the binary for [Potree Converter](https://github.com/potree/PotreeConverter/releases).
Copy `.env.example` to `.env` and fill out the environment variables you wish to use.

Then run the `cloud_builder.py` script.

# frontend

To test and view the frontend server, just serve the `frontend` folder via http.
You need an http server which supports range requests, e.g. `python -m RangeHTTPServer`

# pre-computed vectors

The SPECTER vectors used in this project can be downloaded (thanks David Acuna et al.) [here](https://zenodo.org/records/4917086), by downloading the `paper_specter_{i}.pkl` files. [Here](https://arxiv.org/pdf/2004.07180) is how the model was trained.

This download can [hypothetically](https://developers.zenodo.org/) be accomplished using the API, or via [this](https://github.com/dvolgyes/zenodo_get) Python package, but I prefer using a tool like JDownloader, and managing the download process myself. In total, the vectors take up roughly 54GB on disk and includes 17M papers.

The model for generating these vectors is [open source](https://github.com/allenai/specter) [public and available](https://huggingface.co/allenai/specter), so these could be easily generated again, or on any new paper. The model has [apparently](https://allenai.org/blog/specter2-adapting-scientific-document-embeddings-to-multiple-fields-and-task-formats-c95686c06567) been extended as recently as November 2023.

# microsoft academic graph (MAG) data

The CSV files (for `FieldsOfStudy.txt.gz` 18.4MB and `Papers.txt.gz` 22.8GB) can be accessed [here](https://zenodo.org/records/2628216), and were last updated in 2019, including 238M papers. 

Of course, having more up-to-date data would be nice, but the vectors were computed in September 2020, so these would need to be recomputed.

[Here](https://zenodo.org/records/4617285) is the 2021 dump of the RDF of MAG (for `16.PaperFieldsOfStudy.nt.bz2` 7.3 GB)

# Semantic Scholar data

There is an [open API](https://api.semanticscholar.org/api-docs/graph#tag/Paper-Data/operation/post_graph_get_papers), allowing us to retrieve more detailed information for each paper. 

The same API [can be used](https://github.com/allenai/paper-embedding-public-apis) to *compute* SPECTER vectors, allowing for the embedding of new papers.