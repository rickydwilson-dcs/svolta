# Svolta Backlog

## Status Legend

- `[ ]` Todo
- `[~]` In Progress
- `[x]` Done

---

## Phase 6: Landing & Polish (Current)

### High Priority

- [ ] Hero section with animated before/after demo
- [ ] Features section showcasing core capabilities
- [ ] Pricing section with Free/Pro comparison
- [ ] PWA configuration and manifest
- [ ] Production deployment to Vercel

### Medium Priority

- [ ] Page transition animations (Framer Motion)
- [ ] SEO meta tags and Open Graph images
- [ ] Performance audit and optimization
- [ ] Accessibility audit (WCAG 2.1 AA)

### Low Priority

- [ ] Blog/content section
- [ ] Testimonials/social proof
- [ ] Analytics integration

---

## Bugs

_No open bugs_

---

## Infrastructure

### Email & Domain

- [ ] Set up Resend for transactional email (magic link, notifications)
  - Add and verify `svolta.app` domain in Resend
  - Configure DNS records (SPF, DKIM, DMARC)
  - Connect Resend SMTP to Supabase custom SMTP settings
  - Apply branded magic link email template (`output/2026-03-14_magic-link-email-template.html`)
- [ ] Set up Google Workspace for `svolta.app`
  - Configure MX records for Google Workspace
  - Create primary email address (e.g., `hello@svolta.app`)
  - Ensure DNS changes don't conflict with Resend records

---

## Technical Debt

- [ ] Review and clean up unused dependencies
- [ ] Consolidate duplicate type definitions
- [ ] Add missing test coverage for hooks

---

## Ideas / Icebox

_Items parked for future consideration_
