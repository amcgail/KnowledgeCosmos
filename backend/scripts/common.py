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

from pathlib import Path
from dotenv import load_dotenv
import os

# Import configuration parameters
try:
    from . import params
    CONFIG_PARAMS = {k: v for k, v in vars(params).items() 
                    if not k.startswith('_') and not callable(v)}
except ImportError:
    CONFIG_PARAMS = {}

env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

DATA_FOLDER = os.getenv('DATA_FOLDER')
POTREE_CONVERTER = os.getenv('POTREE_CONVERTER')

DATA_FOLDER = Path(DATA_FOLDER)
DATA_FOLDER.mkdir(exist_ok=True)
(DATA_FOLDER / 'static').mkdir(exist_ok=True)

print("DATA_FOLDER = ", DATA_FOLDER)

# Set up logging
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger()

# Custom cache decorator using Pickle
cache_dir = DATA_FOLDER / 'cache'
os.makedirs(cache_dir, exist_ok=True)

import inspect

class CacheWrapper:
    """
    A wrapper class that provides caching functionality for functions using pickle-based file storage.
    
    This class implements a caching mechanism that:
    1. Stores function results in pickle files
    2. Uses MD5 hashing of function arguments to create unique cache keys
    3. Supports memory caching to avoid repeated disk reads
    4. Allows ignoring specific parameters from the cache key
    5. Handles default parameter values automatically
    
    The cache files are stored in a directory structure based on the module name and function name.
    Each cache file is named using the pattern: {module}/{function_name}_{hash}.pkl
    
    Attributes:
        func: The function to be cached
        ignore: List of parameter names to ignore when creating cache keys
        memcache: Dictionary for in-memory caching
        name: Name of the wrapped function
        module: Module name of the wrapped function
        defaults: Dictionary of default parameter values
    """
    
    def __init__(self, func, ignore=None):
        """
        Initialize the CacheWrapper.
        
        Args:
            func: The function to be cached
            ignore: List of parameter names to ignore when creating cache keys
        """
        if ignore is None:
            ignore = []

        self.func = func
        self.ignore = ignore
        self.memcache = {}
        self.name = self.func.__name__
        
        module = self.func.__module__
        self.module = '.'.join(module.split('.')[1:])
        
        signature = inspect.signature(self.func)
        # Get all parameters that have defaults
        self.defaults = {
            k: v.default
            for k, v in signature.parameters.items()
            if v.default is not inspect.Parameter.empty
        }
        # Get all parameter names that are keyword-only
        self.kwargs_only = {
            k for k, v in signature.parameters.items()
            if v.kind in (inspect.Parameter.KEYWORD_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
        }

    def hash(self, kwargs):
        """
        Generate an MD5 hash of the function arguments for cache key creation.
        
        Args:
            kwargs: Dictionary of keyword arguments
            
        Returns:
            str: MD5 hash of the arguments
        """
        import json
        import hashlib
        import inspect

        # Start with defaults
        kwargs = dict(self.defaults, **kwargs)
        # Override with config params if they exist
        for k, v in CONFIG_PARAMS.items():
            if k in self.kwargs_only:  # Only override if it's a valid keyword arg
                kwargs[k] = v

        kwargs_care = {k: str(v) for k, v in kwargs.items() if self.ignore is None or k not in self.ignore}

        h = hashlib.md5(json.dumps({
            'args': tuple(),
            'kwargs': kwargs_care
        }, sort_keys=True).encode()).hexdigest()

        return h
        
    def filename(self, kwargs):
        """
        Generate the cache file path for the given arguments.
        
        Args:
            kwargs: Dictionary of keyword arguments
            
        Returns:
            Path: Path to the cache file
        """
        import inspect
        from time import time

        source = inspect.getsource(self.func)

        h = self.hash(kwargs)

        (cache_dir / self.module).mkdir(exist_ok=True)
        cache_file = cache_dir / self.module / f"{self.name}_{h}.pkl"
        return cache_file
    
    def load(self, kwargs):
        """
        Load cached results from disk or memory if available.
        
        Args:
            kwargs: Dictionary of keyword arguments
            
        Returns:
            The cached result if available, None otherwise
        """
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
        """
        Save results to the cache file.
        
        Args:
            kwargs: Dictionary of keyword arguments
            result: The result to cache
        """
        cache_file = self.filename(kwargs)
        s = time()
        with open(cache_file, 'wb') as f:
            pickle.dump(result, f)
        logger.info(f"Saved cache for {self.module}.{self.name} in {time()-s:.1f}s")

    def make(self, *args, force=False, **kwargs):
        """
        Force computation of the function result and save to cache.
        
        Args:
            *args: Positional arguments (not supported)
            force: If True, recompute even if cache exists
            **kwargs: Keyword arguments
            
        Returns:
            The computed result
            
        Raises:
            ValueError: If positional arguments are provided
        """
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
        """
        Call the wrapped function with caching.
        
        Args:
            *args: Positional arguments (not supported)
            **kwargs: Keyword arguments
            
        Returns:
            The cached or computed result
            
        Raises:
            ValueError: If positional arguments are provided
        """
        if len(args):
            raise ValueError("This is a cached function. Use only keyword arguments")
        
        # Start with defaults
        kwargs = dict(self.defaults, **kwargs)
        # Override with config params if they exist
        for k, v in CONFIG_PARAMS.items():
            if k in self.kwargs_only:  # Only override if it's a valid keyword arg
                kwargs[k] = v
        
        result = self.load(kwargs)
        if result is not None:
            return result

        result = self.make(*args, **kwargs)
        return result

def cache(func=None, ignore=None):
    """
    Decorator function that creates a CacheWrapper instance.
    
    Usage:
        @cache
        def my_function(param1, param2):
            return expensive_computation(param1, param2)
            
        # Or with ignored parameters:
        @cache(ignore=['verbose'])
        def my_function(param1, param2, verbose=False):
            return expensive_computation(param1, param2)
    
    Args:
        func: The function to be cached (when used as decorator)
        ignore: List of parameter names to ignore in cache key
        
    Returns:
        CacheWrapper: A wrapper instance when used as decorator
        function: A decorator function when called with arguments
    """
    if func is None:
        return lambda f: CacheWrapper(f, ignore)
    
    return CacheWrapper(func, ignore)