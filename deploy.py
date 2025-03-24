"""
Before running this file, make sure you have installed and configured the AWS CLI with your credentials.
"""

import os
import shutil
import subprocess
import sys
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()
bucket_name = os.getenv('S3_BUCKET_NAME')

if not bucket_name:
    print("Error: S3_BUCKET_NAME not found in environment variables")
    sys.exit(1)

def run_command(command):
    """Run a shell command and return its output and return code"""
    try:
        # Use subprocess.run for better cross-platform compatibility
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True
        )
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        print(f"Error running command '{command}': {str(e)}")
        return 1, "", str(e)

# step 3: check if bucket exists and create if it doesn't
# Use a cross-platform way to redirect output
if sys.platform == 'win32':
    redirect = '>nul 2>&1'
else:
    redirect = '>/dev/null 2>&1'

returncode, stdout, stderr = run_command(f'aws s3 ls s3://{bucket_name} {redirect}')
if returncode != 0:
    print(f"Bucket {bucket_name} does not exist. Creating...")
    # Create bucket with default region (us-east-1)
    returncode, stdout, stderr = run_command(f'aws s3api create-bucket --bucket {bucket_name} --region us-east-1')
    if returncode != 0:
        print(f"Error creating bucket: {stderr}")
        sys.exit(1)
    print("Bucket created successfully")

# step 3.5, making sure the bucket's settings are correct
print("Configuring bucket for public web access...")

# First, set bucket ownership controls to ObjectWriter
ownership_controls = {
    "Rules": [
        {
            "ObjectOwnership": "ObjectWriter"
        }
    ]
}
ownership_file = "ownership_controls.json"
with open(ownership_file, "w") as f:
    json.dump(ownership_controls, f)

returncode, stdout, stderr = run_command(f'aws s3api put-bucket-ownership-controls --bucket {bucket_name} --ownership-controls file://{ownership_file}')
if returncode != 0:
    print(f"Error setting ownership controls: {stderr}")
    sys.exit(1)
os.remove(ownership_file)

# Enable public access block settings
block_public_access = {
    "BlockPublicAcls": False,
    "IgnorePublicAcls": False,
    "BlockPublicPolicy": False,
    "RestrictPublicBuckets": False
}
# Save configuration to temporary file
block_access_file = "block_access.json"
with open(block_access_file, "w") as f:
    json.dump(block_public_access, f)

# Apply the configuration
returncode, stdout, stderr = run_command(f'aws s3api put-public-access-block --bucket {bucket_name} --public-access-block-configuration file://{block_access_file}')
if returncode != 0:
    print(f"Error setting public access block: {stderr}")
    sys.exit(1)

# Clean up temporary file
os.remove(block_access_file)

# Create bucket policy for public read access
bucket_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": f"arn:aws:s3:::{bucket_name}/*"
        },
        {
            "Sid": "PublicReadListBucket",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:ListBucket",
            "Resource": f"arn:aws:s3:::{bucket_name}"
        }
    ]
}
# Save policy to temporary file
policy_file = "bucket_policy.json"
with open(policy_file, "w") as f:
    json.dump(bucket_policy, f)

# Apply the bucket policy
returncode, stdout, stderr = run_command(f'aws s3api put-bucket-policy --bucket {bucket_name} --policy file://{policy_file}')
if returncode != 0:
    print(f"Error setting bucket policy: {stderr}")
    sys.exit(1)

# Enable static website hosting
website_config = {
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
}
# Save configuration to temporary file
website_file = "website_config.json"
with open(website_file, "w") as f:
    json.dump(website_config, f)

returncode, stdout, stderr = run_command(f'aws s3api put-bucket-website --bucket {bucket_name} --website-configuration file://{website_file}')
if returncode != 0:
    print(f"Error setting website configuration: {stderr}")
    sys.exit(1)

# Clean up temporary file
os.remove(policy_file)
os.remove(website_file)

print("Bucket configured for public web access")

# copy a small test index.html file, and navigate to the public URL
# Create a test index.html file
test_html = """
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body><h1>Test successful!</h1></body>
</html>
"""
with open("test_index.html", "w") as f:
    f.write(test_html)

# Upload the test file with public-read ACL
returncode, stdout, stderr = run_command(f'aws s3 cp test_index.html s3://{bucket_name}/index.html --acl public-read')
if returncode != 0:
    print(f"Error uploading test file: {stderr}")
    sys.exit(1)

# Clean up test file
os.remove("test_index.html")

# Open the bucket URL in default browser
bucket_url = f'https://{bucket_name}.s3.amazonaws.com/'
print(f"\nOpening test page at: {bucket_url}")

if sys.platform == "darwin":  # Mac
    run_command('open ' + bucket_url)
elif sys.platform == "win32":  # Windows
    run_command('start ' + bucket_url)
else:  # Linux
    run_command('xdg-open ' + bucket_url)

# step 4: sync the dist folder to the bucket
dist_path = 'frontend-html'
print(f"Syncing {dist_path} to s3://{bucket_name}...")
print("Starting sync...")
returncode, stdout, stderr = run_command(f'aws s3 sync {dist_path} s3://{bucket_name} --acl public-read --no-progress')
if stdout:
    for line in stdout.splitlines():
        if line.strip():
            print(f"Uploading: {line}")
print("Sync complete.")
if returncode != 0:
    print(f"Error syncing to S3: {stderr}")
    sys.exit(1)

# step 5: print the url of the bucket
print(f'https://{bucket_name}.s3.amazonaws.com/')
