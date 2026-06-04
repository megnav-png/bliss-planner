# Bliss Planner Object Storage: Cloudflare R2

Chosen provider: Cloudflare R2.

Why this is the first paid-release storage target:
- S3-compatible object storage.
- Good fit for private contract, permit, invoice, and approval files.
- Can be fronted by a Cloudflare Worker so Bliss Planner never exposes bucket credentials to the browser.
- The current app already supports a generic upload endpoint through `BLISS_OBJECT_STORAGE_UPLOAD_ENDPOINT`.

## Worker

Use `phase7/cloudflare-r2-upload-worker.mjs` as the Cloudflare Worker.

Required Worker binding:

```text
Binding name: BLISS_FILES
Type: R2 bucket
Bucket: bliss-planner-files
```

Required Worker secret:

```text
BLISS_OBJECT_STORAGE_TOKEN=<same long random token set in Render>
```

Optional Worker variables:

```text
BLISS_OBJECT_STORAGE_PUBLIC_BASE_URL=<private/proxy download base URL, optional>
BLISS_OBJECT_STORAGE_MAX_BYTES=26214400
```

## Render Environment Variables

Set these on the Bliss Planner Render service:

```text
BLISS_OBJECT_STORAGE_UPLOAD_ENDPOINT=https://<your-worker>.<your-subdomain>.workers.dev
BLISS_OBJECT_STORAGE_TOKEN=<same token as Worker secret>
BLISS_OBJECT_STORAGE_BUCKET=bliss-planner-files
BLISS_OBJECT_STORAGE_REGION=auto
```

Keep `BLISS_FILE_STORE_DIR=/var/data/bliss-relay/files` as a fallback until R2 upload health is verified.

## Token Command

Generate the shared Worker/Render token locally:

```bash
openssl rand -base64 48 | tr -d '\n'
```

## Verification

After setting the Render env vars and redeploying, check:

```bash
BLISS_APP_URL=https://bliss-planner.onrender.com npm run qa:production:api
```

Then upload a small contract/permit/invoice through the dashboard. `/api/monitoring/health` should show:

```json
{
  "fileStorage": {
    "provider": "external-object",
    "externalUploadConfigured": true
  }
}
```
