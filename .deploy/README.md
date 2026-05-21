# Frontend deploy config

Edit `envs.json` before running **Deploy Matrimonial Frontend to S3**.

## `envs.json` fields

| Field | Example |
|-------|---------|
| `common.aws_region` | `ap-south-1` |
| `production.s3_bucket_name` | `my-matrimonial-web-bucket` |
| `production.cloudfront_distribution_id` | `E1234567890ABC` |
| `production.api_url` | `https://api.yourdomain.com` |

`api_url` is baked into the build as `VITE_API_URL` (no `/api` suffix in JSON).

## GitHub secrets

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | S3 upload + CloudFront invalidation |
| `AWS_SECRET_ACCESS_KEY` | |

## CloudFront origin

Point the distribution to the S3 bucket with default root or behavior path **`/latest/index.html`** (same pattern as Atoms frontend).

## Run deploy

**Actions → Deploy Matrimonial Frontend to S3 → Run workflow**
