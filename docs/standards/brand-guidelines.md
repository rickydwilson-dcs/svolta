# Svolta Brand Guidelines

> **For Claude Code:** Use this document as the source of truth when updating any visual or brand elements across the Svolta codebase.

---

## Brand Core

| Attribute   | Value                                           |
| ----------- | ----------------------------------------------- |
| **Name**    | svolta _(always lowercase)_                     |
| **Tagline** | see change _(lowercase)_                        |
| **Product** | AI-powered before/after fitness photo alignment |
| **Domain**  | svolta.app                                      |

---

## Tagline

| Property | Value                                              |
| -------- | -------------------------------------------------- |
| Text     | `see change`                                       |
| Case     | **lowercase always**                               |
| Origin   | Wordplay on "sea change" (profound transformation) |

### Usage

```
svolta — see change
```

The tagline works as:

- Brand lockup: `svolta — see change`
- Standalone statement
- CTA context: "see change" as button/action prompt

---

## Logo Mark

The Svolta mark is an abstract alignment figure representing the app's core function: bringing body landmarks into perfect alignment.

### Structure

- **Head node** — top center, largest node
- **Shoulder bar** — horizontal line with nodes at each end
- **Spine** — vertical center line
- **Hip bar** — horizontal line with nodes at each end
- **5 total nodes:** 1 head, 2 shoulders, 2 hips

### Proportions (100×100 viewBox)

```
Head:      cx="50" cy="15" r="8.5"
Shoulders: y="38", x1="25" x2="75", node r="5.2"
Hips:      y="72", x1="30" x2="70", node r="5.2"
Spine:     x="50", y1="22" y2="78"
Stroke:    2px, round caps
```

---

## Color Modes

### Dark Mode

Use on dark backgrounds (`#0A0A0A`)

| Element        | Color        | Hex       |
| -------------- | ------------ | --------- |
| Lines          | Light purple | `#C9A0DC` |
| Head node      | Orange       | `#F58529` |
| Shoulder nodes | Pink         | `#DD2A7B` |
| Hip nodes      | Blue         | `#515BD4` |

### Light Mode

Use on light backgrounds (`#FAFAFA`)

| Element        | Color       | Hex       |
| -------------- | ----------- | --------- |
| Lines          | Deep purple | `#5C3D7A` |
| Head node      | Orange      | `#F58529` |
| Shoulder nodes | Pink        | `#DD2A7B` |
| Hip nodes      | Blue        | `#515BD4` |

### Mono Mode

Use on gradient backgrounds — all elements white (`#FFFFFF`)

---

## Wordmark

| Property | Value                              |
| -------- | ---------------------------------- |
| Text     | `svolta`                           |
| Case     | **lowercase always**               |
| Weight   | `font-weight: 300` (light)         |
| Tracking | `letter-spacing: -0.025em` (tight) |
| Style    | Gradient text preferred            |

### Gradient Text CSS

```css
.wordmark {
  font-weight: 300;
  letter-spacing: -0.025em;
  background: linear-gradient(90deg, #f58529, #dd2a7b, #8134af, #515bd4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Tailwind

```html
<span
  class="font-light tracking-tight bg-gradient-to-r from-[#F58529] via-[#DD2A7B] via-[#8134AF] to-[#515BD4] bg-clip-text text-transparent"
>
  svolta
</span>
```

---

## Brand Gradient

### Primary (45° for backgrounds)

```css
background: linear-gradient(45deg, #f58529, #dd2a7b, #8134af, #515bd4);
```

### Text (90° horizontal)

```css
background: linear-gradient(90deg, #f58529, #dd2a7b, #8134af, #515bd4);
```

### Hover Variant

```css
background: linear-gradient(45deg, #ff9c4e, #f53e8f, #9a46cc, #656ee5);
```

---

## Color Palette

### Brand Colors

| Name   | Hex       | Usage                          |
| ------ | --------- | ------------------------------ |
| Orange | `#F58529` | Gradient start, head node      |
| Pink   | `#DD2A7B` | Primary accent, shoulder nodes |
| Purple | `#8134AF` | Secondary accent               |
| Blue   | `#515BD4` | Gradient end, hip nodes        |

### Line Colors (derived)

| Name         | Hex       | Usage                      |
| ------------ | --------- | -------------------------- |
| Light Purple | `#C9A0DC` | Lines on dark backgrounds  |
| Deep Purple  | `#5C3D7A` | Lines on light backgrounds |

### Surface Colors

| Token             | Light     | Dark      |
| ----------------- | --------- | --------- |
| Canvas            | `#FAFAFA` | `#000000` |
| Surface Primary   | `#FFFFFF` | `#000000` |
| Surface Secondary | `#F5F5F5` | `#121212` |
| Surface Elevated  | `#FFFFFF` | `#262626` |

### Text Colors

| Token     | Light     | Dark      |
| --------- | --------- | --------- |
| Primary   | `#262626` | `#FAFAFA` |
| Secondary | `#8E8E8E` | `#A8A8A8` |
| Tertiary  | `#C7C7C7` | `#737373` |

---

## Lockup Sizes

| Size | Icon | Text Class | Gap  |
| ---- | ---- | ---------- | ---- |
| XL   | 64px | `text-4xl` | 20px |
| LG   | 44px | `text-2xl` | 16px |
| MD   | 32px | `text-lg`  | 12px |
| SM   | 24px | `text-sm`  | 8px  |

---

## React Component Usage

```tsx
import { SvoltaLogo, SvoltaWordmark } from '@/components/ui/SvoltaLogo';

// Mark only
<SvoltaLogo size={32} />
<SvoltaLogo size={44} mode="light" />
<SvoltaLogo size={48} mode="mono" />

// With wordmark
<SvoltaLogo size={44} showWordmark />
<SvoltaLogo size={32} showWordmark wordmarkStyle="solid" />

// Wordmark only
<SvoltaWordmark size="lg" />
<SvoltaWordmark size="md" style="solid" mode="light" />
```

---

## Utility Classes

```css
/* Background gradient */
.bg-instagram-gradient {
  background: linear-gradient(45deg, #f58529, #dd2a7b, #8134af, #515bd4);
}

/* Text gradient */
.text-instagram-gradient {
  background: linear-gradient(90deg, #f58529, #dd2a7b, #8134af, #515bd4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Pink glow */
.shadow-glow {
  box-shadow: 0 4px 20px rgba(221, 42, 123, 0.3);
}
```

---

## File Structure

```
public/
├── favicon.ico
├── apple-touch-icon.png
└── logo/
    ├── svolta-mark-dark.svg
    ├── svolta-mark-light.svg
    └── svolta-mark-mono.svg

components/ui/
└── SvoltaLogo.tsx
```

---

## Don'ts

- ❌ Don't capitalize: use `svolta` not `Svolta`
- ❌ Don't apply effects to the mark (shadows, outlines, filters)
- ❌ Don't stretch or distort
- ❌ Don't use off-brand colors
- ❌ Don't place colored mark on gradients (use mono version)
- ❌ Don't go below 16px without testing

---

## Implementation Checklist

- [ ] Replace "Svolta" → "svolta" everywhere
- [ ] Add SVG files to `/public/logo/`
- [ ] Add `SvoltaLogo.tsx` to `/components/ui/`
- [ ] Update header/nav to use new component
- [ ] Update favicon and apple-touch-icon
- [ ] Update OG image
- [ ] Verify dark/light mode line colors

---

_Finalized: December 2024_
