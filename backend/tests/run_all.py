"""
Run all cache tests and demonstrations.

This script runs:
1. The unit tests for the current CacheWrapper implementation
2. The demonstration of the enhanced CacheWrapper with default parameter dependencies
"""

import sys
import os
from pathlib import Path
import unittest
import importlib.util

def import_module_from_path(module_name, file_path):
    """Import a module from a file path."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def run_all():
    """Run all tests and demos."""
    # Get the directory of this script
    tests_dir = Path(__file__).parent
    
    print("\n" + "="*80)
    print("RUNNING TESTS FOR CURRENT IMPLEMENTATION")
    print("="*80)
    
    # Import and run the tests for the current implementation
    test_module = import_module_from_path("test_cache", tests_dir / "test_cache.py")
    
    # Create and run a test suite
    test_suite = unittest.TestLoader().loadTestsFromModule(test_module)
    result = unittest.TextTestRunner(verbosity=2).run(test_suite)
    
    print("\n" + "="*80)
    print("RUNNING DEMONSTRATION OF ENHANCED IMPLEMENTATION")
    print("="*80)
    
    # Import and run the enhanced implementation demo
    demo_module = import_module_from_path("demo_dependency_implementation", 
                                          tests_dir / "demo_dependency_implementation.py")
    demo_module.run_demo()
    
    # Return an appropriate exit code
    return 0 if result.wasSuccessful() else 1

if __name__ == "__main__":
    sys.exit(run_all()) 