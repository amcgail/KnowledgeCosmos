"""
Demo implementation of the enhanced CacheWrapper with default parameter dependencies.

This file demonstrates the necessary changes to the CacheWrapper class to support
dependencies specified as default parameters with automatic parameter passing.
"""

import sys
import os
from pathlib import Path
import inspect
import pickle
import time
import hashlib
import json
import logging
from copy import deepcopy

# Add the parent directory to the path so we can import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger()

# Simulated CONFIG_PARAMS for demonstration
CONFIG_PARAMS = {'resolution': 'high', 'sample_size': 1000}

class EnhancedCacheWrapper:
    """
    Enhanced cache wrapper with support for dependencies specified as default parameters.
    
    This is a demonstration of how the CacheWrapper class in common.py could be
    modified to support the automatic handling of dependencies specified as
    default parameters.
    
    Key enhancements:
    1. Detection of CacheWrapper instances in default parameters
    2. Automatic parameter passing to dependencies
    3. Dependency tracking and cache invalidation
    4. Consistent hash representation of dependencies
    """
    
    def __init__(self, func, ignore=None, config_depends_on=None, depends=None):
        """
        Initialize the enhanced cache wrapper.
        
        Args:
            func: The function to be cached
            ignore: List of parameter names to ignore when creating cache keys
            config_depends_on: List of CONFIG_PARAMS keys this function depends on
            depends: List of other EnhancedCacheWrapper instances this function depends on
        """
        if ignore is None:
            ignore = []
        if config_depends_on is None:
            config_depends_on = []
        if depends is None:
            depends = []
            
        self.func = func
        self.ignore = ignore
        self.config_depends_on = config_depends_on
        self.depends = list(depends)  # Make a copy to avoid reference issues
        self.memcache = {}
        self.name = self.func.__name__
        
        # For demo purposes, we'll use a simplified module representation
        self.module = "demo"
        
        # Track the last modified time for dependency checking
        self.last_modified = time.time()
        
        # Discover default parameters and identify dependencies
        signature = inspect.signature(self.func)
        
        # Get all parameters that have defaults
        self.defaults = {}
        self.default_dependencies = {}  # Track which default values are EnhancedCacheWrapper instances
        
        for k, v in signature.parameters.items():
            if v.default is not inspect.Parameter.empty:
                self.defaults[k] = v.default
                if isinstance(v.default, EnhancedCacheWrapper):
                    # This default parameter is another cached function
                    self.default_dependencies[k] = v.default
                    # Add to explicit dependencies list as well
                    if v.default not in self.depends:
                        self.depends.append(v.default)
        
        # Get all parameter names
        self.all_params = {
            k for k, v in signature.parameters.items()
        }
    
    def hash(self, kwargs):
        """
        Generate a hash of function arguments for cache key creation.
        
        Args:
            kwargs: Dictionary of keyword arguments
            
        Returns:
            str: MD5 hash of the arguments
        """
        # Start with defaults
        kwargs = dict(self.defaults, **kwargs)
        
        # Override with config params if they exist
        for k, v in CONFIG_PARAMS.items():
            if k in self.all_params:  # Only override if it's a valid parameter
                kwargs[k] = v
        
        # Create a copy of kwargs that we'll use for hashing
        kwargs_for_hash = {}
        
        for k, v in kwargs.items():
            if k in self.ignore:
                continue
                
            if k in self.default_dependencies:
                # For dependencies, use a consistent representation in the hash
                kwargs_for_hash[k] = f"<dependency:{self.default_dependencies[k].name}>"
            else:
                # For normal values, use their string representation
                kwargs_for_hash[k] = str(v)
        
        # Create a hash of the arguments
        hash_input = json.dumps(kwargs_for_hash, sort_keys=True)
        hash_value = hashlib.md5(hash_input.encode()).hexdigest()
        
        return hash_value
    
    def filename(self, kwargs):
        """
        Generate cache file paths using the hash of arguments.
        
        Args:
            kwargs: Dictionary of keyword arguments
            
        Returns:
            tuple: (Path to metadata file, Path to result file)
        """
        hash_value = self.hash(kwargs)
        
        # For demo purposes, we'll use simple file paths
        return (f"cache/{self.module}_{self.name}_{hash_value}.yaml", 
                f"cache/{self.module}_{self.name}_{hash_value}.pkl")
    
    def call_dependency(self, dep, kwargs):
        """
        Call a dependency with relevant arguments from kwargs.
        
        Args:
            dep: The EnhancedCacheWrapper dependency to call
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
    
    def load(self, kwargs):
        """
        Load cached results if available.
        
        Args:
            kwargs: Dictionary of keyword arguments
            
        Returns:
            The cached result if available, None otherwise
        """
        # Process dependencies before attempting to load
        self._process_dependencies(kwargs)
        
        meta_file, result_file = self.filename(kwargs)
        
        # For demo purposes, we'll simulate the file operations
        # In a real implementation, this would check if the files exist and load them
        
        # Simulate checking if cache exists and if dependencies have changed
        logger.info(f"Simulating load of cache for {self.name} with kwargs: {kwargs}")
        logger.info(f"Cache files would be: {meta_file} and {result_file}")
        
        # In a real implementation, we would check metadata and dependencies here
        # For demo, we'll just return None to indicate the cache needs to be recomputed
        return None
    
    def save(self, kwargs, result, time_taken=None):
        """
        Save results to cache.
        
        Args:
            kwargs: Dictionary of keyword arguments
            result: The result to cache
            time_taken: Time taken to compute the result
        """
        meta_file, result_file = self.filename(kwargs)
        
        # Update last_modified timestamp
        self.last_modified = time.time()
        
        # For demo purposes, we'll just log what would be saved
        logger.info(f"Simulating save of cache for {self.name} with kwargs: {kwargs}")
        logger.info(f"Cache files would be: {meta_file} and {result_file}")
        logger.info(f"Result type: {type(result)}")
        
        # In a real implementation, we would create metadata and save to files here
        # Metadata would include dependencies and their last_modified timestamps
        
    def _process_dependencies(self, kwargs):
        """
        Process any dependencies specified as default parameters.
        
        Args:
            kwargs: Dictionary of keyword arguments to be updated
        """
        # Update any CacheWrapper default parameters with their results
        for param_name, dep in self.default_dependencies.items():
            if param_name in kwargs and isinstance(kwargs[param_name], EnhancedCacheWrapper):
                # If the parameter is still a CacheWrapper (wasn't overridden),
                # call it with relevant arguments
                kwargs[param_name] = self.call_dependency(dep, kwargs)
    
    def make(self, *args, force=False, **kwargs):
        """
        Force computation of the function result and save to cache.
        
        Args:
            *args: Positional arguments (not supported)
            force: If True, recompute even if cache exists
            **kwargs: Keyword arguments
            
        Returns:
            The computed result
        """
        if len(args):
            raise ValueError("This is a cached function. Use only keyword arguments")
        
        # Start with defaults
        kwargs = dict(self.defaults, **kwargs)
        
        # Override with config params if they exist
        for k, v in CONFIG_PARAMS.items():
            if k in self.all_params:  # Only override if it's a valid parameter
                kwargs[k] = v
        
        # Process dependencies before computation
        self._process_dependencies(kwargs)
        
        # Compute the result
        logger.info(f"Computing {self.name} with kwargs: {kwargs}")
        s = time.time()
        result = self.func(**kwargs)
        elapsed = time.time() - s
        logger.info(f"Computed {self.name} in {elapsed:.2f}s")
        
        # Save to cache
        self.save(kwargs, result, time_taken=elapsed)
        
        return result
    
    def __call__(self, *args, **kwargs):
        """
        Call the wrapped function with caching.
        
        Args:
            *args: Positional arguments (not supported)
            **kwargs: Keyword arguments
            
        Returns:
            The cached or computed result
        """
        if len(args):
            raise ValueError("This is a cached function. Use only keyword arguments")
        
        # Start with defaults
        kwargs = dict(self.defaults, **kwargs)
        
        # Override with config params if they exist
        for k, v in CONFIG_PARAMS.items():
            if k in self.all_params:  # Only override if it's a valid parameter
                kwargs[k] = v
        
        # Try to load from cache
        result = self.load(kwargs)
        if result is not None:
            return result
        
        # Compute and save the result
        return self.make(**kwargs)

def enhanced_cache(func=None, ignore=None, config_depends_on=None, depends=None):
    """
    Enhanced cache decorator that creates an EnhancedCacheWrapper instance.
    
    Usage:
        @enhanced_cache
        def my_function(param1, param2):
            return expensive_computation(param1, param2)
            
        @enhanced_cache
        def other_function(x, y, cached_func=my_function):
            # cached_func will be automatically called with relevant parameters
            return some_computation(x, y, cached_func)
    
    Args:
        func: The function to be cached
        ignore: List of parameter names to ignore in cache key
        config_depends_on: List of CONFIG_PARAMS keys this function depends on
        depends: List of other cached functions this function explicitly depends on
        
    Returns:
        EnhancedCacheWrapper: A wrapper instance
    """
    if func is None:
        return lambda f: EnhancedCacheWrapper(f, ignore, config_depends_on, depends)
    
    return EnhancedCacheWrapper(func, ignore, config_depends_on, depends)

# Demo code that shows the enhanced caching in action
def run_demo():
    """Run a demonstration of the enhanced caching system."""
    print("\n" + "="*80)
    print("ENHANCED CACHE DEPENDENCY DEMONSTRATION")
    print("="*80)
    
    # Define some cached functions with dependencies
    @enhanced_cache
    def load_data(file_name="data.csv", sample_size=100):
        """Simulate loading data from a file."""
        print(f"Loading data from {file_name} with sample_size={sample_size}")
        return list(range(sample_size))
    
    @enhanced_cache
    def process_data(data=None, factor=2, input_data=load_data):
        """Simulate processing data."""
        # Use the data parameter if provided, otherwise use input_data
        if data is None:
            data = input_data
        print(f"Processing data of length {len(data)} with factor={factor}")
        return [x * factor for x in data]
    
    @enhanced_cache
    def analyze_results(input_data=load_data, processed_data=process_data, threshold=10):
        """
        Analyze results using other cached functions as dependencies.
        
        Note how dependencies are specified as default parameters.
        """
        print(f"Analyzing results with threshold={threshold}")
        
        # In a real implementation, input_data and processed_data would be
        # automatically called and their results passed here
        
        # For the demo, we'll manually handle the dependencies
        if isinstance(input_data, EnhancedCacheWrapper):
            input_data = input_data()
            
        if isinstance(processed_data, EnhancedCacheWrapper):
            # Pass input_data to process_data
            processed_data = processed_data(data=input_data)
            
        # Perform some analysis
        above_threshold = sum(1 for x in processed_data if x > threshold)
        
        return {
            "above_threshold": above_threshold,
            "total": len(processed_data),
            "percentage": above_threshold / len(processed_data) * 100 if processed_data else 0
        }
    
    # First run - with default parameters
    print("\n1. First run - with default parameters")
    result1 = analyze_results()
    print(f"Result: {result1}")
    
    # Second run - change sample_size which affects the whole chain
    print("\n2. Second run - change sample_size parameter")
    result2 = analyze_results(sample_size=200)
    print(f"Result: {result2}")
    
    # Third run - change factor which only affects process_data and analyze_results
    print("\n3. Third run - change factor parameter")
    result3 = analyze_results(sample_size=200, factor=3)
    print(f"Result: {result3}")
    
    print("\n" + "="*80)
    print("DEMONSTRATION COMPLETE")
    print("="*80)
    
    return result1, result2, result3

if __name__ == "__main__":
    run_demo() 