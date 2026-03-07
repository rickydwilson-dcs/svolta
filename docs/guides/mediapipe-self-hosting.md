# MediaPipe Self-Hosting Setup

## Overview

Svolta self-hosts MediaPipe WASM files and pose detection models to eliminate dependency on external CDNs (jsdelivr, Google Storage). This improves reliability and ensures pose detection works even if external CDNs are unavailable.

## Architecture

### Asset Locations

**Local Assets (Primary):**

- WASM files: `/public/mediapipe/wasm/`
- Pose model: `/public/mediapipe/models/pose_landmarker_lite.task`

**CDN Fallback (Secondary):**

- WASM files: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm`
- Pose model: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`

### Loading Strategy

1. **Check Local Assets First**: Perform HEAD request to verify local WASM files exist
2. **Use Local Assets**: If available, load from `/mediapipe/wasm/` and `/mediapipe/models/`
3. **CDN Fallback**: If local assets unavailable, fall back to jsdelivr and Google Storage CDNs
4. **GPU/CPU Fallback**: Attempt GPU acceleration first, fall back to CPU if GPU fails

## Build Process

### Automatic Asset Copying

Assets are automatically copied during `npm install` via the `postinstall` script:

```json
{
  "scripts": {
    "copy-mediapipe": "node scripts/copy-mediapipe-assets.js",
    "postinstall": "npm run copy-mediapipe"
  }
}
```

### Manual Asset Copying

To manually copy assets:

```bash
npm run copy-mediapipe
```

### What Gets Copied

**From `node_modules/@mediapipe/tasks-vision/wasm/`:**

- `vision_wasm_internal.js` (199 KB)
- `vision_wasm_internal.wasm` (9.1 MB)
- `vision_wasm_nosimd_internal.js` (199 KB)
- `vision_wasm_nosimd_internal.wasm` (9.0 MB)

**Downloaded from Google Storage:**

- `pose_landmarker_lite.task` (5.5 MB)

**Total Size:** ~24 MB

## Development Workflow

### First Time Setup

```bash
npm install  # Automatically runs copy-mediapipe
```

### After Pulling Changes

If the MediaPipe version changes in `package.json`:

```bash
npm install  # Re-downloads new version and copies assets
```

### CI/CD Pipeline

The assets are copied automatically during the build process on Vercel:

1. Vercel runs `npm install`
2. `postinstall` hook executes `copy-mediapipe` script
3. Assets are copied to `public/mediapipe/`
4. Next.js serves assets from `/mediapipe/*` routes

## Git Ignore

The `public/mediapipe/` directory is gitignored because:

- Assets are 24 MB (too large for git)
- Assets are deterministic (always the same for a given MediaPipe version)
- Assets are regenerated on every `npm install`

## Debugging

### Check Asset Availability

Open browser console and look for these messages:

**Using Local Assets:**

```
✓ Using self-hosted MediaPipe assets
✓ Pose detector initialized with GPU acceleration
```

**Using CDN Fallback:**

```
⚠ Local MediaPipe assets not found, using CDN fallback
✓ Pose detector initialized with GPU acceleration
```

### Verify Local Assets

```bash
# Check WASM files
ls -lh public/mediapipe/wasm/

# Check pose model
ls -lh public/mediapipe/models/

# Re-copy if missing
npm run copy-mediapipe
```

### Test Asset Loading

```typescript
import { isUsingLocalAssets } from "@/lib/mediapipe/pose-detector";

// After initialization
console.log("Using local assets:", isUsingLocalAssets());
```

## API Reference

### New Functions

**`isUsingLocalAssets(): boolean`**

- Returns `true` if pose detector loaded from local assets
- Returns `false` if using CDN fallback

**`checkLocalAssets(): Promise<boolean>`** (internal)

- Performs HEAD request to check if local assets exist
- Returns `true` if WASM loader found at `/mediapipe/wasm/vision_wasm_internal.js`

**`getAssetPaths(): Promise<{ wasmPath: string; modelPath: string }>`** (internal)

- Returns local paths if available, otherwise CDN URLs
- Used during pose detector initialization

## Performance

### Initial Load Time

**With Local Assets (Self-Hosted):**

- First visit: ~1-2s (download WASM + model from origin)
- Subsequent visits: <100ms (browser cache)

**With CDN Fallback:**

- First visit: ~2-3s (download from jsdelivr + Google Storage)
- Subsequent visits: <100ms (browser cache)

### Bandwidth Savings

Self-hosting eliminates external CDN requests:

- **Before**: 2 origins (jsdelivr + storage.googleapis.com)
- **After**: 1 origin (www.svolta.app)

## Security

### Asset Integrity

Assets are copied directly from `node_modules/@mediapipe/tasks-vision`:

- npm package verified by npm registry
- Version pinned to `0.10.22` in `package.json`
- No manual editing of WASM files

### CSP Considerations

Self-hosting reduces CSP requirements:

- **Before**: Required `connect-src` for jsdelivr and googleapis
- **After**: Only requires `connect-src 'self'`

## Troubleshooting

### Assets Not Found After Deploy

**Symptom**: Console shows "Local MediaPipe assets not found, using CDN fallback"

**Solution**:

```bash
# Verify assets copied during build
ls -lh public/mediapipe/

# If missing, manually copy
npm run copy-mediapipe

# Rebuild
npm run build
```

### Build Fails in CI/CD

**Symptom**: Build fails with "MediaPipe WASM files not found"

**Solution**:

1. Ensure `postinstall` script runs in CI environment
2. Check that `node_modules/@mediapipe/tasks-vision` installed
3. Verify CI has network access to download pose model

### Large Build Size

**Issue**: Vercel build size increased by ~24 MB

**Expected**: This is normal - self-hosting adds assets to deployment
**Alternative**: Remove `postinstall` hook to use CDN-only (not recommended)

## Maintenance

### Updating MediaPipe Version

1. Update version in `package.json`:

   ```json
   {
     "dependencies": {
       "@mediapipe/tasks-vision": "^0.10.23"
     }
   }
   ```

2. Update version constant in `pose-detector.ts`:

   ```typescript
   const MEDIAPIPE_VERSION = "0.10.23";
   ```

3. Re-install and copy assets:

   ```bash
   npm install  # Automatically runs copy-mediapipe
   ```

4. Test pose detection in development:
   ```bash
   npm run dev
   # Visit /editor and upload a photo
   ```

## References

- MediaPipe Tasks Vision: https://www.npmjs.com/package/@mediapipe/tasks-vision
- Pose Landmarker Guide: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker/web_js
- Script Source: `/scripts/copy-mediapipe-assets.js`
- Pose Detector: `/lib/mediapipe/pose-detector.ts`
