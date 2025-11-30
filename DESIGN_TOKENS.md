# PoseProof Design Tokens

Apple-style design system configuration for Tailwind CSS v4.

## Usage Examples

### Typography - Display Fonts

Use for hero headlines and large display text:

```tsx
<h1 className="text-display-2xl font-display-2xl tracking-display-2xl leading-display-2xl">
  Proof of Progress
</h1>

<h2 className="text-display-xl font-display-xl tracking-display-xl leading-display-xl">
  Transform Your Fitness Photos
</h2>

<h3 className="text-display-lg font-display-lg tracking-display-lg leading-display-lg">
  AI-Powered Alignment
</h3>
```

### Spacing - Section Padding

Use for generous, Apple-style section spacing:

```tsx
<section className="py-section">
  {/* 120px vertical padding */}
</section>

<section className="py-section-lg">
  {/* 160px vertical padding */}
</section>

<section className="py-section-xl">
  {/* 200px vertical padding */}
</section>
```

### Animations - Apple Easing

Use for smooth, Apple-style transitions:

```tsx
<div className="transition-all duration-500 ease-apple">
  {/* Apple standard easing */}
</div>

<div className="transition-all duration-700 ease-apple-out">
  {/* Apple out easing (slower exit) */}
</div>
```

### Shadows - Layered & Subtle

```tsx
<div className="shadow-md">
  {/* Medium layered shadow */}
</div>

<div className="shadow-lg">
  {/* Large layered shadow */}
</div>
```

### Border Radius - Generous

```tsx
<div className="rounded-xl">
  {/* 16px border radius */}
</div>

<div className="rounded-2xl">
  {/* 20px border radius */}
</div>

<div className="rounded-3xl">
  {/* 24px border radius */}
</div>
```

### Colors - Theme-Aware

All colors automatically adapt to light/dark mode:

```tsx
{/* Surface colors */}
<div className="bg-surface-primary">
  {/* White in light, slate-900 in dark */}
</div>

<div className="bg-surface-secondary">
  {/* Slate-50 in light, slate-800 in dark */}
</div>

{/* Text colors */}
<p className="text-text-primary">
  {/* Slate-900 in light, slate-50 in dark */}
</p>

<p className="text-text-secondary">
  {/* Slate-600 in light, slate-400 in dark */}
</p>

{/* Border colors */}
<div className="border border-border-default">
  {/* Slate-200 in light, slate-700 in dark */}
</div>

{/* Brand colors (constant across themes) */}
<button className="bg-brand-primary">
  {/* Blue-500 */}
</button>

<button className="bg-brand-secondary">
  {/* Green-500 */}
</button>

<div className="text-brand-accent">
  {/* Amber-500 */}
</div>
```

## Direct CSS Variable Access

You can also use CSS variables directly:

```tsx
<div style={{ background: 'var(--surface-primary)' }}>
  {/* Direct CSS var access */}
</div>
```

## CSS Custom Properties Reference

### Light Mode
```css
--surface-primary: #ffffff
--surface-secondary: #f8fafc
--text-primary: #0f172a
--text-secondary: #475569
--border-default: #e2e8f0
```

### Dark Mode (.dark class or prefers-color-scheme)
```css
--surface-primary: #0f172a
--surface-secondary: #1e293b
--text-primary: #f8fafc
--text-secondary: #94a3b8
--border-default: #334155
```

### Brand Colors (constant)
```css
--brand-primary: #3B82F6 (Blue)
--brand-secondary: #10B981 (Green)
--brand-accent: #F59E0B (Amber)
```

## Typography Scale

| Token | Size | Line Height | Tracking | Weight |
|-------|------|-------------|----------|--------|
| display-2xl | 72px (4.5rem) | 1.1 | -0.02em | 700 (bold) |
| display-xl | 60px (3.75rem) | 1.1 | -0.02em | 700 (bold) |
| display-lg | 48px (3rem) | 1.15 | -0.015em | 600 (semibold) |

## Spacing Scale

| Token | Size | Use Case |
|-------|------|----------|
| section | 120px (7.5rem) | Standard section padding |
| section-lg | 160px (10rem) | Large section padding |
| section-xl | 200px (12.5rem) | XL section padding (hero) |

## Animation Easing

| Token | Cubic Bezier | Use Case |
|-------|--------------|----------|
| apple | cubic-bezier(0.25, 0.1, 0.25, 1) | Standard Apple easing |
| apple-out | cubic-bezier(0.22, 1, 0.36, 1) | Slower exit animations |

## Example Component

```tsx
export function HeroSection() {
  return (
    <section className="py-section-xl bg-surface-primary">
      <div className="container mx-auto px-6">
        <h1 className="text-display-2xl font-display-2xl tracking-display-2xl leading-display-2xl text-text-primary mb-6">
          Proof of Progress
        </h1>
        <p className="text-2xl text-text-secondary max-w-2xl">
          Transform your fitness photos into professional before/after comparisons
        </p>
        <button className="mt-8 px-8 py-4 bg-brand-primary text-white rounded-2xl shadow-lg transition-all duration-500 ease-apple hover:scale-105">
          Get Started
        </button>
      </div>
    </section>
  );
}
```

## Notes

- All colors are theme-aware and automatically adapt to light/dark mode
- Use `next-themes` package for theme switching (already installed)
- Typography tokens include font-size, line-height, letter-spacing, and font-weight
- Spacing tokens use rem units for accessibility
- Animation easing curves match Apple's standard motion design

---

**Last Updated:** 2025-11-30
