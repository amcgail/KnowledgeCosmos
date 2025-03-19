# Remove existing symlink, if it exists
if (Test-Path "frontend-html/data") {
    Remove-Item "frontend-html/data"
}

# Create symlink using cmd (works without admin rights)
cmd /c mklink /D "frontend-html\data" "..\data\static"

# Change to frontend-html directory
Set-Location frontend-html

# Start Python HTTP server
python -m RangeHTTPServer
