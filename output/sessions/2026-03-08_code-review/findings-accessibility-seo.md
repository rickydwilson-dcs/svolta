# Accessibility & SEO Review Findings

**Reviewer:** cs-frontend-engineer
**Scope:** Full accessibility and SEO audit covering all layout files (`app/layout.tsx`, `app/(marketing)/layout.tsx`, `app/(auth)/layout.tsx`, `app/(app)/layout.tsx`), all page components (`app/(marketing)/page.tsx`, `app/(auth)/login/`, `app/(auth)/signup/`, `app/(app)/editor/`, `app/(app)/settings/`, `app/(app)/upgrade/`), all UI primitives (`components/ui/` -- 13 components), all editor feature components (`components/features/editor/` -- 12 components), SEO configuration files (`robots.ts`, `sitemap.ts`), and design tokens (`docs/standards/design-tokens.md`).
**Date:** 2026-03-08

## Summary

The codebase demonstrates good accessibility foundations -- skip link in root layout, proper use of Radix UI for modal/dialog semantics, `aria-label` attributes on icon buttons, canvas `role="img"` with labels, and `aria-hidden="true"` on decorative SVGs. SEO basics are solid with `generateMetadata`, OpenGraph tags, structured data, and a robots.ts disallowing private routes. However, there are meaningful gaps: missing `id="main-content"` targets for the skip link in non-marketing layouts, no focus-visible styles on CSS-class-based buttons (`.btn-pill`), several SVGs in the upgrade page lacking `aria-hidden`, the SegmentedControl missing an accessible group label, the sitemap omitting key public pages, and colour contrast concerns with the text-secondary token in dark mode.

## Findings

### [HIGH] A11Y-001: Skip link target `#main-content` missing in app and auth layouts

- **File:** `app/(app)/editor/_components/EditorContent.tsx` (line 152), `app/(auth)/layout.tsx` (line 26)
- **Issue:** The root layout (`app/layout.tsx` line 58-63) includes a skip link pointing to `#main-content`, but only the marketing layout (`app/(marketing)/layout.tsx` line 16) defines `<main id="main-content">`. The app layout's `<main>` (EditorContent line 152) and the auth layout's `<main>` (line 26) lack this `id`.
- **Impact:** Keyboard users activating the skip link on editor, settings, upgrade, login, or signup pages will not skip to content -- the link does nothing.
- **Fix:** Add `id="main-content"` to the `<main>` element in `app/(auth)/layout.tsx` (line 26) and to the `<main>` element in `EditorContent.tsx` (line 152).
- **Effort:** trivial

### [HIGH] A11Y-002: CSS-class buttons (`.btn-pill`, `.btn-primary`, `.btn-ghost`, `.btn-secondary`) have no focus indicator

- **File:** `app/globals.css` (lines 304-354)
- **Issue:** The `.btn-pill`, `.btn-primary`, `.btn-ghost`, and `.btn-secondary` CSS classes define no `:focus-visible` styles. These classes are used directly on `<Link>` and `<a>` elements throughout the marketing landing page (`app/(marketing)/page.tsx` lines 63-77, 267, 307, 328) and the upgrade page. The `Button` React component has `focus-visible:outline-none` but does not add a replacement ring for all variants.
- **Impact:** Keyboard users cannot see which button or link is currently focused when navigating the marketing page or upgrade page. This is a WCAG 2.4.7 (Focus Visible) failure.
- **Fix:** Add `:focus-visible` styles to `.btn-pill` in `globals.css`, for example: `.btn-pill:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }`. Also verify the `Button` component adds a visible focus ring (it has `focus-visible:outline-none` but no replacement ring on the `primary` variant).
- **Effort:** small

### [HIGH] A11Y-003: SegmentedControl lacks accessible group label (`aria-label` or `aria-labelledby`)

- **File:** `components/ui/SegmentedControl.tsx` (lines 37-74)
- **Issue:** The `ToggleGroup.Root` rendered by `SegmentedControl` has no `aria-label` or `aria-labelledby` prop. Screen readers will announce the group with no context about what is being selected.
- **Impact:** Screen reader users cannot understand the purpose of the segmented control (e.g., "Align by", "Export type", "Background type").
- **Fix:** Add an `ariaLabel` prop to `SegmentedControlProps` and pass it as `aria-label` to `ToggleGroup.Root`. Update all call sites to provide a descriptive label.
- **Effort:** small

### [MEDIUM] A11Y-004: Editor page has no `<h1>` heading

- **File:** `app/(app)/editor/_components/EditorContent.tsx` (entire file)
- **Issue:** The editor page renders no heading elements at all. The page title is only conveyed via the logo image.
- **Impact:** Screen reader users have no page heading to orient themselves. Heading navigation (a primary screen reader navigation method) is unavailable.
- **Fix:** Add a visually hidden `<h1>` near the top of the editor, e.g. `<h1 className="sr-only">Photo Editor</h1>`.
- **Effort:** trivial

### [MEDIUM] A11Y-005: Upgrade page SVG icons missing `aria-hidden="true"`

- **File:** `app/(app)/upgrade/page.tsx` (lines 75, 191, 244-258, 268)
- **Issue:** Multiple decorative SVGs on the upgrade page (back arrow, feature check icons, trust badge icons, shield icon) lack `aria-hidden="true"`. They are purely decorative and should be hidden from the accessibility tree.
- **Impact:** Screen readers will attempt to announce these SVGs, creating noise in the reading flow.
- **Fix:** Add `aria-hidden="true"` to all decorative SVGs on this page (the back-arrow SVG at line 75, check icons at line 191, trust badge SVGs at lines 244-258, and the shield SVG at line 268).
- **Effort:** trivial

### [MEDIUM] A11Y-006: Toggle component has no visible focus indicator

- **File:** `components/ui/Toggle.tsx` (lines 47-77)
- **Issue:** The underlying `<input>` is `sr-only` (visually hidden), and the visual track/thumb elements rendered via sibling `<div>` elements do not reflect focus state. There are no `peer-focus-visible:` utility classes on the visual elements.
- **Impact:** Keyboard users tabbing through toggles cannot see which toggle is focused.
- **Fix:** Add `peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--border-focus)] peer-focus-visible:ring-offset-2` to the track `<div>` (line 61) so focus is visually indicated.
- **Effort:** trivial

### [MEDIUM] A11Y-007: MarketingHeader nav lacks `aria-label`

- **File:** `components/layout/MarketingHeader.tsx` (line 42)
- **Issue:** The `<nav>` in the marketing header has no `aria-label` attribute. While the footer nav correctly uses `aria-label="Footer"`, the header nav is unlabelled.
- **Impact:** When a page has multiple `<nav>` landmarks (header and footer), screen reader users cannot distinguish between them.
- **Fix:** Add `aria-label="Main"` or `aria-label="Header navigation"` to the `<nav>` at line 42.
- **Effort:** trivial

### [MEDIUM] A11Y-008: DropZone error message not announced to screen readers via live region

- **File:** `components/features/editor/DropZone.tsx` (lines 148-152)
- **Issue:** The error message `<div>` below the drop zone does not have `role="alert"` or `aria-live="polite"`. When a file validation error occurs, screen readers will not automatically announce it.
- **Impact:** Blind users may not know their upload failed.
- **Fix:** Add `role="alert"` to the error `<div>` at line 149, similar to how the `Input` component already handles errors (line 72).
- **Effort:** trivial

### [LOW] A11Y-009: Colour contrast concern -- `text-secondary` in dark mode

- **File:** `docs/standards/design-tokens.md` (line 149-150)
- **Issue:** Dark mode `--text-secondary` is `#94a3b8` (slate-400) on `--surface-primary` `#0f172a` (slate-900). This yields a contrast ratio of approximately 4.6:1, which barely passes WCAG AA for normal text (4.5:1) but fails for small text used in many UI contexts (12px-14px body copy at `text-sm` and `text-xs`).
- **Impact:** Small secondary text may be difficult to read in dark mode for users with moderate vision impairment.
- **Fix:** Consider lightening `--text-secondary` in dark mode to `#a8b5c7` or similar to achieve a more comfortable 5:1+ ratio, especially where it is used at small sizes.
- **Effort:** small

### [LOW] A11Y-010: `role="application"` on photo panel container may suppress screen reader shortcuts

- **File:** `components/features/editor/PhotoPanel.tsx` (line 200)
- **Issue:** The photo display area uses `role="application"`, which tells screen readers to pass all keystrokes through to the application. While this is intentional for the zoom/pan interaction, it suppresses standard screen reader navigation keys within that region.
- **Impact:** Screen reader users navigating inside the photo panel lose access to single-letter navigation, arrow key reading, etc. This is appropriate for the gesture area but should be scoped tightly.
- **Fix:** The current implementation is acceptable since it is applied only to the interactive photo region (not the entire page). Consider adding `aria-roledescription="interactive photo viewer"` for better context. No change strictly required.
- **Effort:** trivial

### [LOW] A11Y-011: Settings page heading hierarchy -- uses only `<h1>` from CardTitle

- **File:** `app/(app)/settings/page.tsx` (line 477)
- **Issue:** The settings page has an `<h1>` ("Settings") but all section headers are rendered via `CardTitle` which renders `<h3>`. There are no `<h2>` elements, creating a heading level skip (h1 -> h3).
- **Impact:** Screen reader users navigating by heading levels may be confused by the jump from h1 to h3.
- **Fix:** Either use `<h2>` for top-level section cards (Profile, Preferences, Subscription, etc.) or update `CardTitle` to accept a heading level prop.
- **Effort:** small

---

### [HIGH] SEO-001: Sitemap missing key public pages

- **File:** `app/sitemap.ts` (lines 1-26)
- **Issue:** The sitemap only includes `/`, `/login`, and `/signup`. It is missing the `/upgrade` page (which is a public-facing pricing page and an important conversion page) and any future pages like `/privacy`, `/terms`, and `/faq` that are linked from the footer.
- **Impact:** Search engines may not discover or properly index the upgrade/pricing page, reducing organic traffic to a key conversion page.
- **Fix:** Add entries for `/upgrade`, `/privacy`, `/terms`, and any other public-facing pages. Login/signup pages are arguably not useful in sitemaps since they are thin auth pages -- consider replacing them with higher-value pages.
- **Effort:** trivial

### [HIGH] SEO-002: Upgrade page missing `generateMetadata` -- inherits generic root title

- **File:** `app/(app)/upgrade/page.tsx` (entire file)
- **Issue:** The upgrade page does not export a `metadata` or `generateMetadata` object. It inherits the root layout title "svolta -- see change" which is not descriptive of the pricing page content. Since it is inside the `(app)` route group whose layout sets `noindex`, it is also being blocked from indexing (see SEO-003).
- **Impact:** If the upgrade page is intended to be public/indexable (as a pricing page should be), it needs its own metadata and should not be under the `(app)` route group. If it is intentionally private, this is lower severity.
- **Fix:** Either (a) move the upgrade page to the `(marketing)` route group so it gets indexed and add proper metadata, or (b) if it must stay in `(app)`, add `generateMetadata` for the page title even for user experience (browser tab title).
- **Effort:** small

### [HIGH] SEO-003: All `(app)` routes noindexed via meta tag, but `/upgrade` should be indexable

- **File:** `app/(app)/layout.tsx` (line 13)
- **Issue:** The app layout injects `<meta name="robots" content="noindex, nofollow" />` for all child routes. This correctly prevents `/editor` and `/settings` from being indexed, but also prevents `/upgrade` (the pricing page) from being indexed.
- **Impact:** The pricing/upgrade page is a critical SEO landing page for conversion queries ("fitness photo alignment pricing"). Having it noindexed means zero organic search traffic to this page.
- **Fix:** Move `/upgrade` to the `(marketing)` route group, or create a separate route group for it that does not apply `noindex`.
- **Effort:** small

### [MEDIUM] SEO-004: Root layout title is only 22 characters -- underutilised

- **File:** `app/layout.tsx` (line 13)
- **Issue:** The root `metadata.title` is "svolta -- see change" (22 characters). Best practice is 50-60 characters to maximise SERP real estate.
- **Impact:** The title does not include any primary keywords. Users searching for "before after photo alignment" or "fitness photo comparison tool" will not see relevant keywords in the title.
- **Fix:** Expand to something like: `"svolta -- AI Before & After Photo Alignment for Fitness Coaches"` (62 characters).
- **Effort:** trivial

### [MEDIUM] SEO-005: Marketing page OG title is 58 characters -- acceptable but truncated on some platforms

- **File:** `app/(marketing)/page.tsx` (line 9)
- **Issue:** The OG title "svolta -- Perfect Before & After Photos for Fitness Coaches" is 58 characters, which is fine for most platforms but may be truncated on Twitter/X (max ~55 chars visible).
- **Impact:** Minor truncation on some social platforms.
- **Fix:** No urgent action needed. Optionally provide a shorter `twitter.title` override.
- **Effort:** trivial

### [MEDIUM] SEO-006: Missing `canonical` URL on marketing landing page

- **File:** `app/(marketing)/page.tsx` (lines 4-14)
- **Issue:** The marketing page metadata does not include an `alternates.canonical` property. While Next.js may handle this via `metadataBase`, explicitly setting canonical URLs prevents duplicate content issues (e.g., `www.svolta.app` vs `svolta.app`, or trailing-slash variants).
- **Impact:** Potential for search engines to split ranking signals across URL variants.
- **Fix:** Add `alternates: { canonical: 'https://www.svolta.app' }` to the marketing page metadata.
- **Effort:** trivial

### [MEDIUM] SEO-007: Login/signup in sitemap but noindexed -- conflicting signals

- **File:** `app/sitemap.ts` (lines 14-24), `app/(auth)/layout.tsx` (line 6)
- **Issue:** The sitemap includes `/login` and `/signup`, but the auth layout sets `robots: { index: false, follow: false }`. Including noindexed pages in the sitemap sends conflicting signals to search engines.
- **Impact:** Search engines may waste crawl budget on noindexed pages, or display confusing results.
- **Fix:** Remove `/login` and `/signup` from the sitemap since they are noindexed. Replace with `/upgrade` (once it is made indexable) and any other public pages.
- **Effort:** trivial

### [LOW] SEO-008: OG image and Apple icon are TODO placeholders

- **File:** `app/layout.tsx` (lines 23, 35)
- **Issue:** Both the `apple-icon.png` and `og-image.png` have TODO comments indicating they are placeholder/SVG conversions not yet completed.
- **Impact:** Social sharing previews may show broken or generic images. Apple home screen icon may not display correctly.
- **Fix:** Generate production-ready `og-image.png` (1200x630) and `apple-icon.png` (180x180) from the existing SVG sources.
- **Effort:** small

### [LOW] SEO-009: No `hreflang` or language alternates

- **File:** `app/layout.tsx`
- **Issue:** The site targets English (`lang="en"`) but does not declare `hreflang` alternates. This is only relevant if future internationalisation is planned.
- **Impact:** Minimal for a single-language site. Noted for completeness.
- **Fix:** No action required unless multi-language support is planned.
- **Effort:** N/A

## Statistics

- Critical: 0
- High: 5 (A11Y-001, A11Y-002, A11Y-003, SEO-001, SEO-002, SEO-003)
- Medium: 8 (A11Y-004, A11Y-005, A11Y-006, A11Y-007, A11Y-008, SEO-004, SEO-006, SEO-007)
- Low: 5 (A11Y-009, A11Y-010, A11Y-011, SEO-005, SEO-008, SEO-009)
- Total: 20
