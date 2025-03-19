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

# step 1: make, or empty, the dist folder
dist_path = 'dist'
if os.path.exists(dist_path):
    shutil.rmtree(dist_path)
os.makedirs(dist_path)

# step 2: copy the contents of the frontend-html folder into dist
frontend_path = 'frontend-html'
if not os.path.exists(frontend_path):
    print(f"Error: {frontend_path} directory not found")
    sys.exit(1)

for item in os.listdir(frontend_path):
    source = os.path.join(frontend_path, item)
    dest = os.path.join(dist_path, item)
    if os.path.isdir(source):
        shutil.copytree(source, dest)
    else:
        shutil.copy2(source, dest)

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

# Upload the test file
returncode, stdout, stderr = run_command(f'aws s3 cp test_index.html s3://{bucket_name}/index.html')
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
if False:
    print(f"Syncing {dist_path} to s3://{bucket_name}...")
    returncode, stdout, stderr = run_command(f'aws s3 sync {dist_path} s3://{bucket_name}')
    if returncode != 0:
        print(f"Error syncing to S3: {stderr}")
        sys.exit(1)

    # step 5: print the url of the bucket
    print(f'https://{bucket_name}.s3.amazonaws.com/')
