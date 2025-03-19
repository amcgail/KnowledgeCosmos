from pathlib import Path
from collections import defaultdict
import os
from matplotlib import pyplot as plt
import numpy as np
from random import sample, choice
import pickle
from csv import DictReader
from time import time
from io import TextIOWrapper
import zipfile

from .params import *

DATA_FOLDER = Path(DATA_FOLDER)
DATA_FOLDER.mkdir(exist_ok=True)

# Set up logging
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger()

# Custom cache decorator using Pickle
cache_dir = DATA_FOLDER / 'cache'
os.makedirs(cache_dir, exist_ok=True)

import inspect

class CacheWrapper:
    def __init__(self, func, ignore=None):
        if ignore is None:
            ignore = []

        self.func = func
        self.ignore = ignore

        self.memcache = {}
        
        self.name = self.func.__name__
        
        module = self.func.__module__
        self.module = '.'.join(module.split('.')[1:])
        
        signature = inspect.signature(self.func)
        self.defaults = {
            k: v.default
            for k, v in signature.parameters.items()
            if v.default is not inspect.Parameter.empty
        }

    def hash(self, kwargs):
        import json
        import hashlib
        import inspect

        kwargs = dict(self.defaults, **kwargs)
        kwargs_care = {k: str(v) for k, v in kwargs.items() if self.ignore is None or k not in self.ignore}

        h = hashlib.md5(json.dumps({
            'args': tuple(),
            'kwargs': kwargs_care
        }, sort_keys=True).encode()).hexdigest()

        return h
        
    def filename(self, kwargs):
        import inspect
        from time import time

        source = inspect.getsource(self.func)

        h = self.hash(kwargs)

        (cache_dir / self.module).mkdir(exist_ok=True)
        cache_file = cache_dir / self.module / f"{self.name}_{h}.pkl"
        return cache_file
    
    def load(self, kwargs):
        cache_file = self.filename(kwargs)

        if cache_file in self.memcache:
            return self.memcache[cache_file]
                                 
        if cache_file.exists():
            s = time()
            with open(cache_file, 'rb') as f:
                v = pickle.load(f)
            logger.info(f"Loaded cache for {self.module}.{self.name} in {time()-s:.1f}s")
            self.memcache[cache_file] = v
            return v

        return None
    
    def save(self, kwargs, result):
        cache_file = self.filename(kwargs)
        s = time()
        with open(cache_file, 'wb') as f:
            pickle.dump(result, f)
        logger.info(f"Saved cache for {self.module}.{self.name} in {time()-s:.1f}s")

    def make(self, *args, force=False, **kwargs): 
        if len(args):
            raise ValueError("This is a cached function. Use only keyword arguments")
        
        cache_file = self.filename(kwargs)

        # If cache exists, do nothing
        if cache_file.exists() and not force:
            return

        # Otherwise, compute the result and save it
        true_kwargs = dict(self.defaults, **kwargs)
        logger.info(f"Computing {self.module}.{self.name} with args {args} and kwargs {true_kwargs}")
        s = time()
        result = self.func(*args, **kwargs)
        logger.info(f"Computed {self.module}.{self.name} in {time()-s:.1f}s")
        self.save(kwargs, result)

        return result

    def __call__(self, *args, **kwargs):
        if len(args):
            raise ValueError("This is a cached function. Use only keyword arguments")
        
        result = self.load(kwargs)
        if result is not None:
            return result

        result = self.make(*args, **kwargs)
        return result

def cache(func=None, ignore=None):
    if func is None:
        return lambda f: CacheWrapper(f, ignore)
    
    return CacheWrapper(func, ignore)