# Check if we're on Windows or Unix-like
if ($IsWindows) {
    # Windows needs admin rights for symlinks, so check if directory exists first
    if (-not (Test-Path "frontend-html/data")) {
        # Create symlink using cmd (works without admin rights)
        cmd /c mklink /D "frontend-html\data" "..\data"
    }
} else {
    # Unix-like systems (Mac/Linux)
    if (-not (Test-Path "frontend-html/data")) {
        New-Item -ItemType SymbolicLink -Path "frontend-html/data" -Target "data"
    }
}

# Change to frontend-html directory
Set-Location frontend-html

# Start Python HTTP server
python -m http.server
