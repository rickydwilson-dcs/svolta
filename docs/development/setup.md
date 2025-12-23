# PoseProof - Development Setup Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-22
**Scope:** Local development environment setup for PoseProof

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Supabase Setup](#supabase-setup)
- [Stripe Setup](#stripe-setup)
- [Running the Application](#running-the-application)
- [Development Tools](#development-tools)
- [Common Issues](#common-issues)
- [Next Steps](#next-steps)

---

## Prerequisites

Before starting development, ensure you have the following installed:

### Required Software

| Software    | Version       | Purpose            | Installation                        |
| ----------- | ------------- | ------------------ | ----------------------------------- |
| **Node.js** | 20.x or later | JavaScript runtime | [nodejs.org](https://nodejs.org/)   |
| **pnpm**    | 9.x or later  | Package manager    | `npm install -g pnpm`               |
| **Git**     | 2.x or later  | Version control    | [git-scm.com](https://git-scm.com/) |

### Verify Installation

```bash
node --version  # Should show v20.x or higher
pnpm --version  # Should show 9.x or higher
git --version   # Should show 2.x or higher
```

### Accounts Required

- **Supabase Account** - [supabase.com](https://supabase.com/) (free tier available)
- **Stripe Account** - [stripe.com](https://stripe.com/) (test mode, free)

---

## Installation

### 1. Clone the Repository

```bash
# HTTPS
git clone https://github.com/YOUR_USERNAME/poseproof.git

# SSH
git clone git@github.com:YOUR_USERNAME/poseproof.git

cd poseproof
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all dependencies listed in `package.json`, including:

- **Next.js 16** - React framework
- **Tailwind CSS 4** - Styling
- **Supabase** - Authentication and database
- **MediaPipe** - Pose detection
- **Fabric.js** - Canvas manipulation
- **Stripe** - Payment processing
- **Zustand** - State management

### 3. Verify Installation

```bash
# Check for node_modules
ls node_modules

# Verify key dependencies
pnpm list next @supabase/supabase-js stripe fabric
```

---

## Environment Configuration

### 1. Create Environment File

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

### 2. Environment Variables

Add the following variables to `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

---

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Enter project details:
   - Name: `poseproof-dev`
   - Database password: Generate a secure password
   - Region: Choose closest to your location
4. Wait for project to be created (2-3 minutes)

### 2. Get API Credentials

1. In Supabase dashboard, go to **Settings > API**
2. Copy the following values to `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon/Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run Database Migrations

PoseProof requires specific database tables and RLS policies.

```bash
# Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

**Alternative:** Manually run SQL migrations from `supabase/migrations/` in the Supabase SQL editor.

### 4. Verify Database Setup

Check that the following tables exist in Supabase:

- `profiles` - User profiles
- `subscriptions` - Subscription data
- `usage` - Monthly export usage tracking

```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'subscriptions', 'usage');
```

### 5. Configure Authentication

1. Go to **Authentication > Providers** in Supabase
2. Enable **Email** provider
3. Disable email confirmation for development:
   - Go to **Authentication > Settings**
   - Uncheck "Enable email confirmations"
   - Set "Site URL" to `http://localhost:3000`

---

## Stripe Setup

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com/)
2. Complete account setup
3. Stay in **Test Mode** (toggle in top-right)

### 2. Get API Keys

1. Go to **Developers > API keys**
2. Copy keys to `.env.local`:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

### 3. Create Products and Prices

#### Create Pro Monthly Product

1. Go to **Products** in Stripe Dashboard
2. Click "+ Add product"
3. Configure:
   - Name: `PoseProof Pro - Monthly`
   - Description: `Professional features with unlimited exports`
   - Pricing:
     - Price: `£7.99`
     - Billing period: `Monthly`
     - Currency: `GBP`
4. Save and copy **Price ID** → `STRIPE_PRO_MONTHLY_PRICE_ID`

#### Create Pro Yearly Product

1. Add another product:
   - Name: `PoseProof Pro - Yearly`
   - Description: `Professional features with unlimited exports (save 20%)`
   - Pricing:
     - Price: `£79` (18% savings vs monthly)
     - Billing period: `Yearly`
     - Currency: `GBP`
2. Save and copy **Price ID** → `STRIPE_PRO_YEARLY_PRICE_ID`

### 4. Configure Webhooks (Local Development)

Use Stripe CLI for local webhook testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will output a webhook signing secret:

```
> Ready! Your webhook signing secret is whsec_xxxxx
```

Copy this to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Keep the `stripe listen` command running** during development to receive webhook events.

---

## Running the Application

### 1. Start Development Server

```bash
pnpm dev
```

The application will start at [http://localhost:3000](http://localhost:3000).

### 2. Verify Application is Running

Open your browser and check:

- **Home Page:** [http://localhost:3000](http://localhost:3000)
- **Editor:** [http://localhost:3000/editor](http://localhost:3000/editor)
- **Login:** [http://localhost:3000/login](http://localhost:3000/login)
- **Upgrade:** [http://localhost:3000/upgrade](http://localhost:3000/upgrade)

### 3. Test Core Features

#### Test Photo Upload

1. Go to [http://localhost:3000/editor](http://localhost:3000/editor)
2. Upload a before photo (use any photo with a person)
3. Upload an after photo
4. Verify pose detection runs (landmarks appear)

#### Test Alignment

1. After uploading both photos, click "Auto-Align"
2. Verify the after photo aligns to the before photo
3. Adjust alignment controls (anchor point, scale, offset)
4. Toggle landmarks visibility

#### Test Export

1. After aligning photos, click "Export"
2. Enter filename
3. Select quality (High/Medium/Low)
4. Click "Export Comparison"
5. Verify image downloads

#### Test Authentication

1. Go to [http://localhost:3000/login](http://localhost:3000/login)
2. Create account with email/password
3. Verify redirect to `/editor`
4. Check that usage tracking works (exports remaining count)

#### Test Stripe Checkout (Test Mode)

1. Go to [http://localhost:3000/upgrade](http://localhost:3000/upgrade)
2. Click "Upgrade to Pro" (monthly)
3. Use test card: `4242 4242 4242 4242`
4. Fill in test data:
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
5. Complete checkout
6. Verify redirect back to app
7. Verify usage shows "Unlimited" exports

---

## Development Tools

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server at localhost:3000
pnpm build            # Build production bundle
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues automatically
pnpm type-check       # Run TypeScript compiler

# Testing
pnpm test             # Run Vitest unit tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report
pnpm test:e2e         # Run Playwright E2E tests
pnpm test:e2e:ui      # Run E2E tests with UI

# Validation
pnpm validate         # Run type-check + lint + test
```

### Git Hooks (Husky)

Pre-configured git hooks run automatically:

- **pre-commit:** Lints and formats staged files
- **pre-push:** Runs full lint check

Hooks are configured in `.husky/` directory.

### VSCode Extensions (Recommended)

Install these extensions for the best development experience:

- **ESLint** - `dbaeumer.vscode-eslint`
- **Prettier** - `esbenp.prettier-vscode`
- **Tailwind CSS IntelliSense** - `bradlc.vscode-tailwindcss`
- **TypeScript Error Translator** - `mattpocock.ts-error-translator`

### Browser Extensions

- **React Developer Tools** - Debug React components
- **Redux DevTools** - Inspect Zustand store state

---

## Common Issues

### Issue: Port 3000 Already in Use

**Error:**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
pnpm dev -- -p 3001
```

---

### Issue: Supabase Connection Failed

**Error:**

```
Failed to fetch user: Invalid API key
```

**Solution:**

1. Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Restart dev server after changing environment variables
3. Check Supabase project is not paused (free tier auto-pauses after 1 week)

---

### Issue: MediaPipe Not Loading

**Error:**

```
Failed to initialize pose detector
```

**Solution:**

1. Check browser console for CORS errors
2. MediaPipe loads files from CDN - ensure internet connection
3. Try hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
4. Check browser compatibility (Chrome/Edge recommended)

---

### Issue: Stripe Webhook Not Receiving Events

**Error:**

```
Webhook signature verification failed
```

**Solution:**

1. Ensure `stripe listen` is running in a separate terminal
2. Verify `STRIPE_WEBHOOK_SECRET` matches the CLI output
3. Check webhook endpoint is accessible at `http://localhost:3000/api/stripe/webhook`
4. Restart dev server after adding webhook secret

---

### Issue: TypeScript Errors on Install

**Error:**

```
Type error: Cannot find module '@/types/...'
```

**Solution:**

```bash
# Clean install
rm -rf node_modules .next
pnpm install

# Verify TypeScript config
pnpm type-check
```

---

### Issue: Hot Reload Not Working

**Symptom:** Changes not reflecting in browser

**Solution:**

1. Check for syntax errors in code
2. Restart dev server
3. Clear Next.js cache:
   ```bash
   rm -rf .next
   pnpm dev
   ```
4. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

### Issue: Image Upload Fails (HEIC Files)

**Error:**

```
Failed to convert HEIC image
```

**Solution:**

1. HEIC conversion happens client-side using `heic2any`
2. Ensure browser supports WebAssembly
3. Check browser console for errors
4. Test with non-HEIC images (JPG/PNG) first

---

### Issue: Database Migration Fails

**Error:**

```
Error: relation "profiles" already exists
```

**Solution:**

```bash
# Reset local Supabase
supabase db reset

# Or manually drop tables in Supabase SQL Editor
DROP TABLE IF EXISTS usage CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

# Then re-run migrations
supabase db push
```

---

## Next Steps

Now that your development environment is set up:

1. **Read Architecture Docs**
   - [State Management & Hooks](state-hooks.md)
   - [Troubleshooting Guide](troubleshooting.md)

2. **Explore the Codebase**
   - `/app` - Next.js App Router pages
   - `/components` - React components
   - `/lib` - Utility functions (MediaPipe, Supabase, Stripe)
   - `/stores` - Zustand state stores
   - `/hooks` - Custom React hooks

3. **Start Development**
   - Check Linear project: [PoseProof Project](https://linear.app/rickydwilson/project/poseproof-832cc9c427e2)
   - Pick a task from the backlog
   - Create a feature branch from `develop`
   - Use Claude Skills agents for assistance

4. **Run Tests**

   ```bash
   pnpm test           # Unit tests
   pnpm test:e2e       # E2E tests
   ```

5. **Submit Pull Requests**
   - Push to `develop` branch (solo dev workflow)
   - Quality gates run automatically via git hooks

---

**Questions or Issues?**

- **Project Board:** [Linear - PoseProof](https://linear.app/rickydwilson/project/poseproof-832cc9c427e2)
- **Documentation:** See `docs/` directory
- **Claude Skills:** Use `@cs-fullstack-engineer` or other agents for help
