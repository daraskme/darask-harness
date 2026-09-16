---
name: r2-storage
description: Store and retrieve generated stills and video on Cloudflare R2 via darask_r2 so any DSH environment can edit the same objects.
whenToUse: The user wants shared R2 storage, to upload or download generated media, or to edit images/videos from another PC.
---

# r2-storage

Use **Cloudflare R2** through `darask_r2`. This is DSH-direct storage: objects live under `darask/media/` and are reachable from any machine that has the same plugin credentials.

Configure in Settings → Plugins → Cloudflare R2:

- Account id (32 hex)
- Bucket name
- `DARASK_R2_ACCESS_KEY_ID` / `DARASK_R2_SECRET_ACCESS_KEY` (R2 API token)
- Optional public base URL (`r2PublicBase`) for custom domains or r2.dev

Do not put secrets in Git, fixtures, or ordinary logs.

## Auto upload

When R2 is configured, `darask_image_gen` and `darask_imagine_video` save locally **and** PUT the file to R2. The tool result includes `R2: <url> (key darask/media/…)`.

GPT Image 2 originals are local unless you `darask_r2` `put` them.

## Tool

`darask_r2`:

- `status` — whether account, bucket, and keys are set
- `list` — keys under `darask/media/` (max 50)
- `put` — upload a local JPEG/PNG/WebP/GIF/MP4/WebM (`path`)
- `get` — download a key into `addons-output`

Keys must start with `darask/media/`. To edit on another environment: `list` or reuse the key from generation, then `get`, then edit the local file, then `put` again.

## Limits

- Do not claim an object is in R2 unless the tool returned a key or URL.
- Missing credentials: tell the user to fill Settings → Plugins (Cloudflare R2).
- Private Tailscale paths are not R2. Use this skill for the shared bucket, not for localhost files.
