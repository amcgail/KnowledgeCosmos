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

FIELDS_TO_FORGET = [
    'Petrology',
    'Market economy',
    'Arithmetic',
    'Geodesy',
    'Civil engineering',
]

class CacheWrapper:
    """
    A wrapper class that provides caching functionality for functions using pickle-based file storage.
    
    This class implements a caching mechanism that:
    1. Stores function results in pickle files
    2. Uses MD5 hashing of function arguments to create unique cache keys
    3. Supports dependencies specified as default parameters
    4. Automatically passes relevant arguments to dependencies
    5. Handles dependency tracking and cache invalidation
    6. Allows ignoring specific parameters from the cache key
    
    Attributes:
        func: The function to be cached
        name: Name of the wrapped function
        depends: List of other CacheWrapper instances this function depends on
        default_dependencies: List of tuples (param_name, CacheWrapper) found in default parameters
        ignore: List of parameter names to ignore when creating cache keys
    """
    
    def __init__(self, func, name=None, depends=None, ignore=None):
        """
        Initialize the CacheWrapper.
        
        Args:
            func: The function to be cached
            name: Name of the wrapped function
            depends: List of other CacheWrapper instances this function depends on
            ignore: List of parameter names to ignore when creating cache keys
        """
        self.func = func
        self.depends = [] if depends is None else depends
        self.name = name or func.__name__
        self.default_dependencies = []
        self.last_modified = time()
        self.ignore = [] if ignore is None else ignore
        
        # Find dependencies in default parameters
        if hasattr(func, "__signature__"):
            sig = func.__signature__
        else:
            sig = inspect.signature(func)
            
        for param_name, param in sig.parameters.items():
            if param.default is not param.empty and isinstance(param.default, CacheWrapper):
                self.default_dependencies.append((param_name, param.default))
                # Add to explicit dependencies list as well
                if param.default not in self.depends:
                    self.depends.append(param.default)
        
        # Get all parameter names (both keyword-only and positional-or-keyword)
        self.all_params = {
            k for k, v in sig.parameters.items()
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

        # Create a copy of kwargs that we'll use for hashing
        kwargs_care = {}
        
        for k, v in kwargs.items():
            # Skip parameters that should be ignored
            if k in self.ignore:
                continue
                
            if k in self.default_dependencies:
                # For dependencies, use a consistent representation in the hash
                dep_index = next(i for i, (name, _) in enumerate(self.default_dependencies) if name == k)
                kwargs_care[k] = f"<dependency:{self.default_dependencies[dep_index][1].name}>"
            else:
                # For normal values, use their string representation
                kwargs_care[k] = str(v)

        h = hashlib.md5(json.dumps({
            'args': tuple(),
            'kwargs': kwargs_care
        }, sort_keys=True).encode()).hexdigest()

        return h
        
    def filename(self, **kwargs):
        """
        Generate the cache file paths using a hash of the arguments.
        
        Args:
            **kwargs: Keyword arguments
            
        Returns:
            tuple: (Path to pickle file, Path to yaml metadata file)
        """
        # Create a hash of the arguments
        hash_value = self.hash(kwargs)
        
        (cache_dir / self.name).mkdir(exist_ok=True)
        base_path = cache_dir / self.name / f"{self.name}_{hash_value}"
        return base_path.with_suffix('.pkl'), base_path.with_suffix('.yaml')
    
    def call_dependency(self, dep, kwargs):
        """
        Call a dependency with relevant arguments from kwargs.
        
        Args:
            dep: The CacheWrapper dependency to call
            kwargs: Dictionary of keyword arguments from the current function
            
        Returns:
            The result of calling the dependency
        """
        # Get the signature of the dependency function
        dep_signature = inspect.signature(dep.func)
        dep_params = dep_signature.parameters
        
        # Filter the kwargs to only include parameters that exist in the dependency
        dep_kwargs = {}
        for param_name in dep_params:
            if param_name in kwargs:
                dep_kwargs[param_name] = kwargs[param_name]
                
        # Call the dependency with the filtered kwargs
        logger.info(f"Calling dependency {dep.name} for {self.name} with args: {dep_kwargs}")
        return dep(**dep_kwargs)
    
    def check_dependencies(self, metadata):
        """
        Check if any dependencies have been modified since this cache was created.
        
        Args:
            metadata: Dictionary containing cache metadata
            
        Returns:
            bool: True if dependencies are up-to-date, False if they need to be recomputed
        """
        # Check if any dependent functions need to be recomputed
        if self.depends:
            for dep in self.depends:
                # Check if the dependency is tracked in metadata
                if 'dependencies' not in metadata or dep.name not in metadata['dependencies']:
                    logger.info(f"Cache for {self.name} invalidated: missing dependency info for {dep.name}")
                    return False
                
                # Check if the dependency has been modified since this cache was created
                dep_last_modified = metadata['dependencies'][dep.name]
                if dep.last_modified > dep_last_modified:
                    logger.info(f"Cache for {self.name} invalidated: dependency {dep.name} modified")
                    return False
                
        return True
    
    def _process_dependencies(self, kwargs):
        """
        Process any dependencies specified as default parameters.
        
        Args:
            kwargs: Dictionary of keyword arguments to be updated
            
        Returns:
            dict: Updated kwargs with dependencies resolved
        """
        # Update any CacheWrapper default parameters with their results
        for param_name, dep in self.default_dependencies:
            if param_name in kwargs and isinstance(kwargs[param_name], CacheWrapper):
                # If the parameter is still a CacheWrapper (wasn't overridden),
                # call it with relevant arguments
                kwargs[param_name] = self.call_dependency(dep, kwargs)
        return kwargs
    
    def load(self, **kwargs):
        """
        Load the result from the cache if it exists.
        
        Args:
            **kwargs: Keyword arguments
            
        Returns:
            The cached result if available, None otherwise
        """
        # If force is True, bypass the cache
        if kwargs.get('force', False):
            return None
                
        # Process dependencies before loading
        processed_kwargs = self._process_dependencies(kwargs.copy())
        
        pickle_file, yaml_file = self.filename(**processed_kwargs)
        if os.path.exists(pickle_file):
            try:
                with open(pickle_file, 'rb') as f:
                    data = pickle.load(f)
                    
                # Create YAML metadata file if it doesn't exist but pickle does
                if not os.path.exists(yaml_file) and isinstance(data, dict) and 'metadata' in data:
                    import yaml
                    with open(yaml_file, 'w') as f:
                        yaml.dump(data['metadata'], f, default_flow_style=False)
                    
                if isinstance(data, dict) and 'result' in data and 'metadata' in data:
                    # Check dependencies to see if cache is still valid
                    if not self.check_dependencies(data['metadata']):
                        return None
                    return data['result']
                return data
            except (pickle.PickleError, EOFError):
                return None
        return None
    
    def save(self, kwargs, result, time_taken=None):
        """
        Save results to cache file.
        
        Args:
            kwargs: Dictionary of keyword arguments
            result: The result to cache
            time_taken: Time taken to compute the result
        """
        pickle_file, yaml_file = self.filename(**kwargs)
        s = time()
        
        # Update last_modified timestamp
        self.last_modified = time()
        
        # Create metadata
        metadata = {
            'args': kwargs,
            'timestamp': time(),
            'function': self.name,
            'time_taken': time_taken
        }
        
        # Include dependency information in metadata
        if self.depends:
            metadata['dependencies'] = {
                dep.name: dep.last_modified
                for dep in self.depends
            }
        
        # Save both result and metadata
        data = {
            'result': result,
            'metadata': metadata
        }
        
        # Save result data to pickle
        with open(pickle_file, 'wb') as f:
            pickle.dump(data, f)
        
        # Save metadata to YAML for easier inspection
        import yaml
        with open(yaml_file, 'w') as f:
            yaml.dump(metadata, f, default_flow_style=False)
            
        logger.info(f"Saved cache for {self.name} in {time()-s:.1f}s")

    def make(self, **kwargs):
        """
        Force computation of the function result and save to cache.
        
        Args:
            **kwargs: Keyword arguments including:
                force: If True, recompute even if cache exists
            
        Returns:
            The computed result
        """
        # Process dependencies before computation
        processed_kwargs = self._process_dependencies(kwargs.copy())
        
        # Remove the force parameter if it exists
        if 'force' in processed_kwargs:
            processed_kwargs.pop('force')
        
        # Compute the result
        logger.info(f"Computing {self.name} with kwargs {processed_kwargs}")
        s = time()
        result = self.func(**processed_kwargs)
        elapsed = time() - s
        logger.info(f"Computed {self.name} in {elapsed:.1f}s")
        
        # Save to cache
        self.save(processed_kwargs, result, time_taken=elapsed)

        return result

    def __call__(self, *args, **kwargs):
        """
        Call the wrapped function with caching.
        
        Args:
            *args: Positional arguments (not supported)
            **kwargs: Keyword arguments including:
                force: If True, bypass the cache and recompute the result
            
        Returns:
            The cached or computed result
            
        Raises:
            ValueError: If positional arguments are provided
        """
        if len(args):
            raise ValueError("This is a cached function. Use only keyword arguments")
            
        result = self.load(**kwargs)
        if result is not None:
            return result
        
        # Remove the force flag if it's set
        force = kwargs.pop('force', False) if 'force' in kwargs else False

        result = self.make(**kwargs)
        return result

def cache(func=None, depends=None, ignore=None):
    """
    Decorator function that creates a CacheWrapper instance.
    
    Usage:
        @cache
        def my_function(param1, param2):
            return expensive_computation(param1, param2)
            
        # With explicit dependencies:
        @cache(depends=[other_cached_function])
        def my_function(param1, param2):
            return computation_that_depends_on_other(param1, param2)
            
        # With default parameter dependencies:
        @cache
        def other_function(param1, cached_func=my_function):
            # cached_func will be automatically called with matching parameters
            return some_computation(param1, cached_func)
            
        # With ignored parameters:
        @cache(ignore=['verbose'])
        def my_function(param1, param2, verbose=False):
            return expensive_computation(param1, param2)
            
        # Force recomputation (bypass cache):
        result = my_function(param1, param2, force=True)
    
    Args:
        func: The function to be cached (when used as decorator)
        depends: List of other cached functions this function depends on
        ignore: List of parameter names to ignore in cache key
        
    Returns:
        CacheWrapper: A wrapper instance when used as decorator
        function: A decorator function when called with arguments
    """
    if func is None:
        return lambda f: CacheWrapper(f, f.__name__, depends, ignore)
    
    return CacheWrapper(func, func.__name__, depends, ignore)