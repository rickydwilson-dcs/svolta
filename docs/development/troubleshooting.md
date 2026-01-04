# Svolta - Troubleshooting Guide

**Version:** 1.1.0
**Last Updated:** 2026-01-04
**Scope:** Common issues, solutions, and debugging strategies

## Table of Contents

- [Build & Development Issues](#build--development-issues)
- [Pose Detection Issues](#pose-detection-issues)
- [Export Quality Issues](#export-quality-issues)
- [Visual Testing Issues](#visual-testing-issues)
- [Stripe & Payments](#stripe--payments)
- [Authentication & Sessions](#authentication--sessions)
- [Canvas Rendering Issues](#canvas-rendering-issues)
- [Performance Issues](#performance-issues)
- [Debugging Strategies](#debugging-strategies)

---

## Build & Development Issues

### Issue: Build Fails with TypeScript Errors

**Symptom:**

```
Type error: Cannot find module '@/types/editor' or its corresponding type declarations.
```

**Cause:** Missing or misconfigured TypeScript paths

**Solution:**

1. Verify `tsconfig.json` paths are correct:

   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

2. Clear TypeScript cache and rebuild:

   ```bash
   rm -rf .next node_modules/.cache
   pnpm install
   pnpm type-check
   ```

3. Restart TypeScript server in VSCode:
   - `Cmd+Shift+P` → "TypeScript: Restart TS Server"

---

### Issue: Next.js Build Fails with Module Resolution Error

**Symptom:**

```
Module not found: Can't resolve 'fabric'
```

**Cause:** Client-only package imported in server component

**Solution:**

1. Add `'use client'` directive to component:

   ```typescript
   "use client";

   import { fabric } from "fabric";
   // ...
   ```

2. Or dynamic import with `ssr: false`:
   ```typescript
   const FabricCanvas = dynamic(() => import("@/components/FabricCanvas"), {
     ssr: false,
   });
   ```

---

### Issue: Tailwind Classes Not Working

**Symptom:** Styles not applying, or only some classes work

**Cause:** Tailwind CSS 4 configuration issue

**Solution:**

1. Verify `tailwind.config.ts` content paths:

   ```typescript
   export default {
     content: [
       "./app/**/*.{js,ts,jsx,tsx,mdx}",
       "./components/**/*.{js,ts,jsx,tsx,mdx}",
     ],
     // ...
   };
   ```

2. Rebuild Tailwind:

   ```bash
   rm -rf .next
   pnpm dev
   ```

3. Check for class name typos (Tailwind CSS IntelliSense extension helps)

---

### Issue: Hot Reload Not Working

**Symptom:** Changes not reflecting in browser

**Causes & Solutions:**

1. **Syntax error in code**
   - Check terminal for error messages
   - Check browser console for errors

2. **Cache issue**

   ```bash
   rm -rf .next
   pnpm dev
   ```

3. **File not in watch path**
   - Ensure file is under `app/` or `components/`
   - Restart dev server

4. **Browser cache**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

### Issue: Husky Pre-commit Hook Fails

**Symptom:**

```
husky - pre-commit hook exited with code 1 (error)
```

**Cause:** ESLint or Prettier errors in staged files

**Solution:**

1. Run linter manually:

   ```bash
   pnpm lint:fix
   ```

2. Check specific errors:

   ```bash
   pnpm lint
   ```

3. Skip hook temporarily (not recommended):

   ```bash
   git commit --no-verify -m "message"
   ```

4. Fix specific file:
   ```bash
   npx eslint --fix path/to/file.ts
   ```

---

## Pose Detection Issues

### Issue: MediaPipe Not Loading

**Symptom:**

```
Failed to initialize pose detector
```

**Causes & Solutions:**

1. **Internet connection issue**
   - MediaPipe loads files from CDN
   - Check network connectivity
   - Try different network (disable VPN)

2. **CORS error**
   - Check browser console for CORS errors
   - Clear browser cache
   - Try different browser (Chrome/Edge recommended)

3. **Browser compatibility**
   - Requires WebAssembly support
   - Update browser to latest version
   - Test in Chrome (best support)

4. **CDN issue**
   - Check [jsDelivr status](https://status.jsdelivr.com/)
   - Wait and retry if CDN is down

---

### Issue: "No Pose Detected" Error

**Symptom:** Upload succeeds but landmark detection fails

**Common Causes:**

| Cause                        | Solution                                   |
| ---------------------------- | ------------------------------------------ |
| Person too small in frame    | Crop image closer to person                |
| Low image quality/resolution | Use higher quality photo                   |
| Person not fully visible     | Ensure full body or at least torso visible |
| Extreme pose/angle           | Use front-facing or side-facing photo      |
| Heavy shadows/backlighting   | Use well-lit photo                         |

**Debugging:**

1. Test with known-good photo:
   - Front-facing, full body
   - Good lighting
   - Person centered
   - High resolution (1000x1000+ pixels)

2. Check browser console for specific error:

   ```javascript
   // Look for:
   PoseDetectionError: No pose detected
   // or
   PoseDetectionError: Confidence too low
   ```

3. Lower confidence threshold (temporary debug):
   ```typescript
   // In pose-detector.ts
   const MIN_CONFIDENCE = 0.3; // Lower from default 0.5
   ```

---

### Issue: "Multiple Poses Detected" Error

**Symptom:** Detection fails with multiple people message

**Causes & Solutions:**

1. **Multiple people in photo**
   - Crop image to single person
   - Use photo with one person only

2. **Background clutter triggering false positives**
   - Use plain background
   - Crop tighter around subject

3. **Reflection/mirror in photo**
   - Avoid mirrors or reflective surfaces
   - Crop out reflections

---

### Issue: Landmarks in Wrong Position

**Symptom:** Pose detection succeeds but landmarks appear offset

**Causes & Solutions:**

1. **Image scaling issue**
   - Verify `MAX_IMAGE_DIMENSION` in `lib/canvas/image-utils.ts`
   - Check aspect ratio preserved during scaling

2. **Coordinate normalization issue**
   - Landmarks should be normalized to 0-1 range
   - Check `pose-detector.ts` normalization logic:
     ```typescript
     // Correct normalization
     x: landmark.x,  // Already 0-1 from MediaPipe
     y: landmark.y,  // Already 0-1 from MediaPipe
     ```

3. **Canvas transform issue**
   - Check Fabric.js canvas scaling
   - Verify viewport transforms

**Debugging:**

```typescript
// Add console.log in pose-detector.ts
console.log(
  "Detected landmarks:",
  landmarks.map((l) => ({
    x: l.x,
    y: l.y,
    z: l.z,
  })),
);

// Verify x/y are between 0 and 1
```

---

## Export Quality Issues

### Issue: Exported Image Looks Pixelated

**Symptom:** Low quality output despite "High" quality setting

**Causes & Solutions:**

1. **Source images too small**
   - Check original image dimensions
   - Upload higher resolution photos (2000x2000+ recommended)

2. **Quality setting incorrect**

   ```typescript
   // Verify quality settings in export.ts
   const QUALITY_PRESETS = {
     high: { width: 2400, height: 1600, scale: 2 },
     medium: { width: 1800, height: 1200, scale: 1.5 },
     low: { width: 1200, height: 800, scale: 1 },
   };
   ```

3. **Canvas scaling issue**

   ```typescript
   // Check multiplier in exportCanvas()
   const multiplier = window.devicePixelRatio || 1;
   ```

4. **JPEG compression too high**
   ```typescript
   // Increase JPEG quality (0-1)
   canvas.toDataURL("image/jpeg", 0.95); // Use 0.95 instead of 0.8
   ```

---

### Issue: Alignment Off in Exported Image

**Symptom:** Photos aligned in editor but misaligned in export

**Cause:** Alignment calculation not applied correctly at export time

**Solution:**

1. Verify alignment calculation in `export.ts`:

   ```typescript
   const alignmentResult = calculateAlignment(
     beforePhoto.landmarks!,
     afterPhoto.landmarks!,
     anchor,
   );
   ```

2. Check Fabric.js transform application:

   ```typescript
   afterPhotoObj.set({
     scaleX: alignmentResult.scale,
     scaleY: alignmentResult.scale,
     left: alignmentResult.offsetX,
     top: alignmentResult.offsetY,
   });
   ```

3. Ensure canvas rendered before export:
   ```typescript
   canvas.renderAll();
   await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for render
   ```

---

### Issue: Watermark Not Appearing

**Symptom:** Free tier watermark missing from export

**Causes & Solutions:**

1. **Watermark rendering skipped**

   ```typescript
   // Check in export.ts
   if (options.includeWatermark) {
     renderWatermark(canvas, watermarkOptions);
   }
   ```

2. **Watermark outside canvas bounds**
   - Check positioning logic
   - Verify canvas dimensions

3. **Watermark rendering after export**
   ```typescript
   // Correct order
   renderWatermark(canvas);
   canvas.renderAll();
   const blob = await canvasToBlob(canvas); // After watermark rendered
   ```

**Debugging:**

```typescript
// Add logging in renderWatermark()
console.log("Rendering watermark at:", { x, y, width, height });
```

---

### Issue: Export Fails Silently

**Symptom:** Export button does nothing, no error shown

**Debugging Steps:**

1. Check browser console for errors
2. Verify photos loaded:

   ```typescript
   console.log("Before photo:", beforePhoto?.dataUrl?.length);
   console.log("After photo:", afterPhoto?.dataUrl?.length);
   ```

3. Check export hook error state:

   ```typescript
   const { error } = useCanvasExport();
   console.log("Export error:", error);
   ```

4. Add try-catch in export function:
   ```typescript
   try {
     await exportCanvas(...);
   } catch (error) {
     console.error('Export failed:', error);
     // Show error to user
   }
   ```

---

## Visual Testing Issues

### Issue: Canvas Dependencies Missing

**Symptom:**

```
Error: The module 'canvas' was compiled against a different Node.js version
```

or

```
Error: Cannot find module 'canvas'
```

**Cause:** Native canvas dependencies not installed or version mismatch

**Solution:**

1. Install native dependencies:

   ```bash
   # macOS
   brew install pkg-config cairo pango libpng jpeg giflib librsvg

   # Ubuntu/Debian
   sudo apt-get install libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
   ```

2. Rebuild native modules:

   ```bash
   rm -rf node_modules
   npm install
   ```

3. If using Node version manager, rebuild for current version:
   ```bash
   npm rebuild canvas
   ```

---

### Issue: Baseline Not Found

**Symptom:**

```
Error: Baseline not found: tests/visual/baselines/1-1/fixture-1080.png
```

**Cause:** Baselines haven't been generated yet

**Solution:**

```bash
# Generate test fixtures and baselines
npm run test:visual:generate
npm run test:visual
```

---

### Issue: Visual Tests Failing After Algorithm Change

**Symptom:** Tests fail with pixel mismatch errors after intentional algorithm changes

**Solution:**

1. Review diff images to verify changes are expected:

   ```bash
   # Open the visual report
   npm run test:visual:report
   ```

2. Check `tests/visual/diffs/` for diff images showing what changed

3. If changes are intentional, update baselines:

   ```bash
   npm run test:visual:generate
   npm run test:visual
   ```

4. Commit updated baselines with your algorithm changes

---

### Issue: Head Alignment Validation Failing

**Symptom:**

```
Alignment validation failed: Head delta 5px exceeds threshold of 2px
```

**Cause:** Heads not aligning within tolerance

**Debugging:**

1. Check the HTML report for metrics:

   ```bash
   npm run test:visual:report
   ```

2. Look at the specific fixture's metrics:
   - Head delta (should be ≤2px)
   - Headroom percentage (should be 5-20%)
   - Body scale (should be 0.8-1.25)

3. Review the diff image to see visual difference

4. Check if fixture is an edge case that should skip validation:
   ```typescript
   // In alignment.visual.test.ts
   const SKIP_ALIGNMENT_VALIDATION = [
     "framing-head-cropped",
     "framing-both-heads-cropped",
     "lowvis-nose",
     // Add your fixture if it's a valid edge case
   ];
   ```

---

### Issue: Test Report Not Opening

**Symptom:** `npm run test:visual:report` does nothing

**Solution:**

1. Verify report exists:

   ```bash
   ls tests/visual/report.html
   ```

2. Open manually:

   ```bash
   # macOS
   open tests/visual/report.html

   # Linux
   xdg-open tests/visual/report.html
   ```

3. Regenerate report by running tests:
   ```bash
   npm run test:visual
   ```

---

### Issue: Fixture Generator Failing

**Symptom:** `npm run test:visual:generate` errors

**Causes & Solutions:**

1. **Missing source images**
   - Check `tests/visual/fixtures/sources/` has before/after images
   - Verify `manifest.json` references correct paths

2. **Canvas rendering issues**
   - Ensure canvas dependencies installed (see above)
   - Check image format supported (PNG, JPG, JPEG)

3. **Landmark data issues**
   - Verify `manifest.json` has valid landmark arrays
   - Ensure landmarks are normalized (0-1 range)

**Debugging:**

```bash
# Run generator with verbose output
npm run test:visual:generate -- --verbose
```

---

### Issue: Tests Pass Locally But Fail in CI

**Symptom:** Visual tests pass on your machine but fail in GitHub Actions

**Causes & Solutions:**

1. **Font rendering differences**
   - Different fonts installed on CI vs local
   - Use higher pixel tolerance or exclude text areas

2. **Canvas version mismatch**
   - Pin canvas version in package.json
   - Use lockfile (package-lock.json)

3. **Image compression differences**
   - Use PNG format for baselines (lossless)
   - Avoid JPEG for baselines

4. **Anti-aliasing differences**
   - Increase pixel tolerance threshold
   - Use whole-image mismatch percentage instead of per-pixel

**CI-specific configuration:**

```typescript
// In alignment.visual.test.ts
const PIXEL_TOLERANCE = process.env.CI ? 0.15 : 0.1;
const ALLOWED_DIFF = process.env.CI ? 0.01 : 0.005;
```

---

## Stripe & Payments

### Issue: Stripe Checkout Not Opening

**Symptom:** Upgrade button does nothing

**Causes & Solutions:**

1. **Missing Stripe publishable key**

   ```bash
   # Verify in .env.local
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **API route error**
   - Check `/api/stripe/checkout` route
   - Verify `STRIPE_SECRET_KEY` in .env.local

3. **Browser console error**
   - Check for CORS errors
   - Verify Stripe.js loaded

**Debugging:**

```typescript
// Add logging in upgrade page
const handleUpgrade = async () => {
  console.log("Starting checkout...");
  const response = await fetch("/api/stripe/checkout", {
    /* ... */
  });
  console.log("Checkout response:", response);
};
```

---

### Issue: Webhook Not Receiving Events

**Symptom:** Subscription status not updating after checkout

**Causes & Solutions:**

1. **Stripe CLI not running**

   ```bash
   # Start Stripe CLI webhook forwarding
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. **Wrong webhook secret**

   ```bash
   # Copy secret from Stripe CLI output
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

3. **Signature verification failing**
   - Check `/api/stripe/webhook` route
   - Verify raw body used for signature:
     ```typescript
     const signature = headers().get("stripe-signature");
     const event = stripe.webhooks.constructEvent(
       body, // Must be raw body, not parsed
       signature,
       webhookSecret,
     );
     ```

**Testing Webhooks:**

```bash
# Send test webhook event
stripe trigger checkout.session.completed
```

---

### Issue: Subscription Status Not Updating

**Symptom:** Payment succeeds but user still shows as free tier

**Debugging Steps:**

1. Check Supabase `subscriptions` table:

   ```sql
   SELECT * FROM subscriptions WHERE user_id = 'USER_ID';
   ```

2. Verify webhook handler updates subscription:

   ```typescript
   // In webhook route
   console.log("Handling event:", event.type);
   console.log("Subscription data:", subscription);
   ```

3. Check for database errors:

   ```typescript
   const { error } = await supabase
     .from("subscriptions")
     .upsert(subscriptionData);

   if (error) {
     console.error("Database error:", error);
   }
   ```

4. Refresh user store:
   ```typescript
   const { fetchSubscription } = useUserStore();
   await fetchSubscription();
   ```

---

### Issue: Test Card Not Working

**Symptom:** Stripe rejects test card

**Solutions:**

1. Use correct test card numbers:
   - **Success:** `4242 4242 4242 4242`
   - **Requires authentication:** `4000 0025 0000 3155`
   - **Declined:** `4000 0000 0000 0002`

2. Ensure test mode enabled:
   - Check Stripe dashboard toggle (top-right)
   - Use `pk_test_` key, not `pk_live_`

3. Fill in required fields:
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

---

## Authentication & Sessions

### Issue: "Auth session missing" Error

**Symptom:**

```
AuthSessionMissingError: Auth session missing!
```

**Cause:** User not logged in (this is normal)

**Solution:**

This error is **expected** when user is not authenticated. The app handles it gracefully:

```typescript
// In user-store.ts
const isSessionMissing =
  userError.message?.includes("Auth session missing") ||
  userError.name === "AuthSessionMissingError";

if (isSessionMissing) {
  // User simply not logged in - normal state
  set({ user: null, isInitialized: true });
  return;
}
```

**No action needed** unless error persists after login.

---

### Issue: User Logged Out Unexpectedly

**Symptom:** User redirected to login page randomly

**Causes & Solutions:**

1. **Session expired**
   - Sessions expire after 1 hour by default
   - Refresh token should auto-renew
   - Check Supabase auth settings

2. **Token refresh failing**

   ```typescript
   // Check auth state listener in user-store.ts
   supabase.auth.onAuthStateChange(async (event, session) => {
     if (event === "TOKEN_REFRESHED") {
       console.log("Token refreshed:", session);
     }
   });
   ```

3. **Browser blocking cookies**
   - Check browser settings allow cookies
   - Disable strict cookie policies

---

### Issue: Login Redirects to Wrong Page

**Symptom:** After login, user not redirected to `/editor`

**Cause:** `redirectTo` parameter not set correctly

**Solution:**

1. Verify redirect in login form:

   ```typescript
   const { error } = await supabase.auth.signInWithPassword({
     email,
     password,
     options: {
       redirectTo: `${window.location.origin}/editor`,
     },
   });
   ```

2. Check auth callback route:
   ```typescript
   // app/auth/callback/route.ts
   const redirectTo = requestUrl.searchParams.get("redirect_to") ?? "/editor";
   return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
   ```

---

### Issue: Profile Not Created After Signup

**Symptom:** User created but no profile in database

**Cause:** Database trigger not working

**Solution:**

1. Check trigger exists in Supabase:

   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Manually create profile:

   ```sql
   INSERT INTO profiles (id, email, subscription_tier, subscription_status)
   VALUES ('USER_ID', 'user@example.com', 'free', 'active');
   ```

3. Re-create trigger:
   ```sql
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

---

## Canvas Rendering Issues

### Issue: Canvas Not Displaying

**Symptom:** Blank canvas area, no photos shown

**Causes & Solutions:**

1. **Fabric.js not initialized**

   ```typescript
   // Check canvas ref
   useEffect(() => {
     if (!canvasRef.current) return;

     const canvas = new fabric.Canvas(canvasRef.current);
     console.log("Canvas initialized:", canvas);
   }, []);
   ```

2. **Canvas dimensions zero**

   ```typescript
   // Verify canvas size
   console.log("Canvas dimensions:", {
     width: canvasRef.current?.width,
     height: canvasRef.current?.height,
   });
   ```

3. **Images not loaded**
   ```typescript
   fabric.Image.fromURL(dataUrl, (img) => {
     console.log("Image loaded:", img.width, img.height);
     canvas.add(img);
   });
   ```

---

### Issue: Landmarks Not Showing

**Symptom:** Photos render but landmarks invisible

**Debugging:**

1. Check `showLandmarks` state:

   ```typescript
   const showLandmarks = useEditorStore((state) => state.showLandmarks);
   console.log("Show landmarks:", showLandmarks);
   ```

2. Verify landmarks data:

   ```typescript
   console.log("Before landmarks:", beforePhoto?.landmarks);
   console.log("After landmarks:", afterPhoto?.landmarks);
   ```

3. Check landmark rendering logic:
   ```typescript
   // In renderLandmarks() function
   landmarks.forEach((landmark, index) => {
     console.log(`Landmark ${index}:`, { x: landmark.x, y: landmark.y });
     // Ensure x/y are normalized (0-1)
     // Convert to canvas coordinates: x * canvasWidth, y * canvasHeight
   });
   ```

---

### Issue: Canvas Zoom/Pan Not Working

**Symptom:** Mouse wheel or drag doesn't zoom/pan

**Causes & Solutions:**

1. **Event listeners not attached**

   ```typescript
   canvas.on("mouse:wheel", handleZoom);
   canvas.on("mouse:down", handlePanStart);
   canvas.on("mouse:move", handlePanMove);
   ```

2. **Canvas selection mode enabled**

   ```typescript
   canvas.selection = false; // Disable selection box
   canvas.forEachObject((obj) => {
     obj.selectable = false; // Make objects non-selectable
   });
   ```

3. **Zoom bounds not set**
   ```typescript
   const MIN_ZOOM = 0.5;
   const MAX_ZOOM = 5;
   const newZoom = Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
   ```

---

## Performance Issues

### Issue: Slow Pose Detection

**Symptom:** Detection takes >5 seconds

**Solutions:**

1. **Scale images before detection**

   ```typescript
   // In image-utils.ts
   const MAX_IMAGE_DIMENSION = 1024; // Lower for faster detection
   ```

2. **Use lower quality photos for preview**
   - Detect on scaled version
   - Export with original high-res

3. **Check device performance**
   - MediaPipe runs on CPU (no GPU acceleration in browser)
   - Slower on older devices/browsers

---

### Issue: Canvas Lag When Zooming

**Symptom:** Choppy zoom/pan interaction

**Solutions:**

1. **Reduce landmark count**

   ```typescript
   // Render only key landmarks
   const KEY_LANDMARKS = [11, 12, 13, 14, 23, 24, 25, 26]; // Shoulders, hips
   ```

2. **Use requestAnimationFrame for smooth updates**

   ```typescript
   const handleZoom = (opt: fabric.IEvent) => {
     requestAnimationFrame(() => {
       const zoom = canvas.getZoom();
       canvas.setZoom(zoom * delta);
       canvas.renderAll();
     });
   };
   ```

3. **Debounce render calls**
   ```typescript
   const debouncedRender = debounce(() => canvas.renderAll(), 16);
   ```

---

### Issue: Large Memory Usage

**Symptom:** Browser tab uses >1GB RAM

**Causes & Solutions:**

1. **Large images not disposed**

   ```typescript
   // Dispose old images when uploading new ones
   canvas.forEachObject((obj) => {
     canvas.remove(obj);
     obj.dispose?.();
   });
   ```

2. **Multiple canvas instances**
   - Ensure only one canvas per page
   - Dispose canvas on unmount:
     ```typescript
     useEffect(() => {
       return () => {
         canvas.dispose();
       };
     }, []);
     ```

3. **Data URLs kept in memory**
   - Consider using Blob URLs for large images
   - Revoke Blob URLs when done:
     ```typescript
     URL.revokeObjectURL(blobUrl);
     ```

---

## Debugging Strategies

### Alignment Debug Logging

Svolta includes a dedicated alignment debug logging system that writes to both the browser console and a file for easy comparison.

#### Enable Alignment Debug Logging

```javascript
// In browser console:
window.svoltaDebug.enable(); // Enable debug logging
window.svoltaDebug.disable(); // Disable debug logging
window.svoltaDebug.isEnabled(); // Check status

// Or via localStorage:
localStorage.setItem("svolta_debug_alignment", "true");

// Or via environment variable in .env.local:
NEXT_PUBLIC_DEBUG_ALIGNMENT = true;
```

#### Debug Log Output

When enabled, each export writes structured data to `debug/alignment-log.json`:

```json
{
  "timestamp": "2026-01-04T10:30:45.123Z",
  "input": {
    "beforeImg": { "width": 1536, "height": 2048 },
    "afterImg": { "width": 1536, "height": 2048 },
    "targetWidth": 1080,
    "targetHeight": 1350,
    "beforeLandmarks": { "count": 33, "nose": {...}, "shoulders": {...} },
    "afterLandmarks": { "count": 33, "nose": {...}, "shoulders": {...} }
  },
  "result": {
    "before": { "drawX": -11, "drawY": -91, "drawWidth": 1164, "drawHeight": 1552 },
    "after": { "drawX": -308, "drawY": -556, "drawWidth": 1719, "drawHeight": 2293 },
    "useShoulderAlignment": false,
    "cropTopOffset": 0
  },
  "metadata": { "source": "png" }
}
```

#### Debug API Endpoints (Development Only)

```bash
# Read all log entries
curl http://localhost:3000/api/debug/alignment-log

# Clear log file
curl -X DELETE http://localhost:3000/api/debug/alignment-log
```

**Key Files:**

- `/lib/debug/alignment-logger.ts` - Debug utility module
- `/app/api/debug/alignment-log/route.ts` - File writing API

---

### Generic Debug Logging

Add general debug mode to see detailed logs:

```typescript
// lib/debug.ts
export const DEBUG = process.env.NODE_ENV === "development";

export function debug(message: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`[Svolta Debug] ${message}`, ...args);
  }
}

// Usage
import { debug } from "@/lib/debug";
debug("Pose detected:", landmarks);
```

---

### Use React DevTools

1. Install React Developer Tools browser extension
2. Open DevTools → Components tab
3. Inspect component props and state
4. View Zustand store state

---

### Use Redux DevTools for Zustand

```bash
pnpm add @redux-devtools/extension
```

```typescript
// In store
import { devtools } from "zustand/middleware";

export const useEditorStore = create<EditorState>()(
  devtools(
    (set) => ({
      /* ... */
    }),
    { name: "EditorStore" },
  ),
);
```

Open Redux DevTools browser extension to see state changes.

---

### Network Debugging

Check API calls in browser DevTools:

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Check for failed requests
4. Inspect request/response payloads

---

### Supabase Logging

Enable Supabase client logging:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, key, {
  auth: {
    debug: true, // Enable auth logs
  },
});
```

---

### Stripe Event Logs

View webhook events in Stripe Dashboard:

1. Go to **Developers → Webhooks**
2. Click on webhook endpoint
3. View event history
4. Check for failed events

---

### Performance Profiling

Use Chrome DevTools Performance tab:

1. Open DevTools → Performance
2. Click Record
3. Perform slow action (e.g., zoom canvas)
4. Stop recording
5. Analyze flame graph for bottlenecks

---

**Next Steps:**

- [Setup Guide](setup.md) - Development environment setup
- [State & Hooks Guide](state-hooks.md) - State management architecture
