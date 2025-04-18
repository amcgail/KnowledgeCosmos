# Cache System Enhancement

This directory contains tests and demos for the cache system in `backend/scripts/common.py`, along with a proposed enhancement for automatic dependency handling.

## Background

The current caching system allows functions to be cached based on their arguments, with support for:
- Simple argument-based caching using pickle files
- Memory caching to avoid disk reads
- Configuration parameter dependencies
- Parameter filtering (ignoring specific parameters)

## Proposed Enhancement: Default Parameter Dependencies

The enhancement allows specifying dependencies as default parameters in function signatures, with the following advantages:

1. **Cleaner Syntax**: Dependencies are declared in function signatures
2. **Automatic Parameter Passing**: Matching parameters are passed through to dependencies
3. **Transparent Caching**: Dependencies are auto-detected and managed
4. **Dependency Chain Invalidation**: When a dependency changes, dependent caches are invalidated
5. **Natural Code Flow**: Dependencies are used naturally in function bodies

### Example Usage

```python
# Current approach
@cache(depends=[process_data])
def analyze_data(param1, param2):
    # Manually call the dependency
    data = process_data()
    return analyze(data, param1, param2)

# Enhanced approach
@cache
def analyze_data(param1, param2, data=process_data):
    # 'data' is automatically the result of process_data
    return analyze(data, param1, param2)
```

When parameters are shared between parent and dependency functions, they are automatically passed through:

```python
@cache
def load_point_cloud(file_name="sample.xyz", sample_size=1000):
    # ...

@cache
def analyze_point_cloud(file_name="sample.xyz", 
                       sample_size=1000,
                       points=load_point_cloud):
    # Calling analyze_point_cloud(sample_size=500) will automatically call
    # load_point_cloud(sample_size=500) and use its result as 'points'
    # ...
```

## Files in this Directory

- `test_cache.py`: Unit tests for the current caching system
- `demo_dependency_implementation.py`: Demonstration of the enhanced caching system
- `run_all.py`: Script to run all tests and demos
- `README.md`: This documentation file

## How to Run

Execute the run script from the repository root:

```bash
python backend/tests/run_all.py
```

## Implementation Details

The key changes to the `CacheWrapper` class to support default parameter dependencies include:

1. **Dependency Detection**:
   - In `__init__`, scan default parameters for CacheWrapper instances
   - Track these in a `default_dependencies` dictionary

2. **Parameter Passing**:
   - Implement `call_dependency` method to filter and pass relevant arguments
   - Use dependency function signatures to determine which parameters to pass

3. **Dependency Processing**:
   - Add `_process_dependencies` method to handle CacheWrapper default parameters
   - Call this method before loading from cache or computing results

4. **Hash Consistency**:
   - Update `hash` and `filename` methods to handle dependencies consistently in cache keys
   - Represent dependencies as `<dependency:name>` in hash calculations

5. **Cache Invalidation**:
   - Track `last_modified` timestamp for each CacheWrapper instance
   - Store dependency timestamps in metadata when saving cache
   - Check timestamps when loading to invalidate cache if dependencies have changed

## Performance Considerations

The enhanced implementation maintains the performance benefits of the original caching system while adding more convenient dependency management:

- Memory caching is preserved
- Dependency checking is efficient
- Parameter passing adds minimal overhead
- Disk I/O patterns remain optimal

## Next Steps

To implement this enhancement in the main codebase:

1. Update `common.py` with the changes demonstrated in `demo_dependency_implementation.py`
2. Add comprehensive tests to validate the implementation
3. Update documentation to explain the new functionality
4. Gradually migrate existing code to use the new dependency approach 