# Supabase Client Utilities

This directory contains Supabase client factories for server and browser contexts.

## Usage

### Server Components & Route Handlers

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // ...
}
```

### Client Components

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';

export function MyComponent() {
  const supabase = createClient();
  // ...
}
```

## Files

- **server.ts** - Server-side client with cookie handling for Next.js Server Components and Route Handlers
- **client.ts** - Browser-side client singleton for Client Components

## Environment Variables

Required environment variables (see `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations only)

## Authentication Flow

The middleware handles:
- Session refresh
- Protected route authentication
- Redirects for unauthenticated users
- Redirects for authenticated users accessing login/signup

Protected routes: `/editor/*`, `/settings/*`, `/upgrade/*`
