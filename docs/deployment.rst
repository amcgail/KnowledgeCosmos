Deployment to AWS S3
======================

This project includes a script for deploying the static frontend build (`frontend-html` directory) to an AWS S3 bucket configured for public website hosting.

Prerequisites
-------------

*   **AWS Account**: You need an AWS account.
*   **AWS CLI**: Install and configure the AWS Command Line Interface (CLI) with credentials that have permissions to create and manage S3 buckets, set policies, and upload objects.
    *   Configuration typically involves running `aws configure` and providing your Access Key ID, Secret Access Key, default region, and default output format.
*   **S3 Bucket Name**: Decide on a globally unique name for your S3 bucket.

Configuration
-------------

1.  Edit the `.env` file in the project root.
2.  Add or uncomment the `S3_BUCKET_NAME` variable and set it to your chosen bucket name:

    .. code-block:: text

        # ... other variables ...
        S3_BUCKET_NAME=your-unique-bucket-name

Running the Deployment Script
-----------------------------

1.  Ensure the backend processing (`backend/cloud_builder.py`) has been run successfully, generating the necessary assets in `frontend-html` (especially the Potree data linked via `/data/` and the `static/fields.json`).
2.  Ensure your AWS CLI is configured correctly.
3.  Run the deployment script from the project root directory:

    .. code-block:: bash

        python deploy.py

**What the Script Does:**

*   Checks if the specified S3 bucket exists. If not, it creates it (in `us-east-1` by default) and configures it for public static website hosting:
    *   Sets appropriate ownership controls.
    *   Disables public access blocks that would prevent website hosting.
    *   Applies a bucket policy allowing public read access (`s3:GetObject`).
    *   Enables static website hosting, setting `index.html` as the index document.
    *   (If newly created) Uploads a temporary test `index.html` and attempts to open the bucket URL in your browser.
*   Synchronizes the contents of the local `frontend-html/` directory to the root of the S3 bucket using `aws s3 sync`. It sets the Access Control List (ACL) for all uploaded files to `public-read`.
*   Prints the public URL of the S3 bucket website endpoint upon completion (e.g., `http://your-unique-bucket-name.s3-website-us-east-1.amazonaws.com/` or similar, depending on the region).

Notes
-----

*   The script assumes the generated Potree data (`/data/...`) and static assets (`/static/...`) are correctly placed or linked within the `frontend-html` directory structure *before* running `deploy.py`. The deployment script itself only syncs the `frontend-html` folder.
*   Deploying large amounts of data (like Potree point clouds) to S3 can incur costs and take time.
*   Review the bucket policies and IAM permissions carefully to ensure appropriate security. 