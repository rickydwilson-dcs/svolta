# Stripe Integration Setup

> Configure Stripe for local development and production payments.

## Prerequisites

- Stripe account with API keys (test mode for dev, live mode for production)
- Supabase project configured and `.env.local` created
- Local development environment running (`npm run dev`)
- Stripe CLI installed: `brew install stripe/stripe-cli/stripe`

## Steps

### 1. Configure Environment Variables

Add to `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Test price IDs (create in Stripe Dashboard test mode)
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_test_pro_monthly
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_test_pro_yearly
```

### 2. Set Up Webhook Endpoint

In the Stripe Dashboard (test mode), create a webhook endpoint:

- **URL:** `https://www.svolta.app/api/stripe/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 3. Configure Test Mode (Local)

Forward Stripe webhook events to your local server:

```bash
# Login to Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret printed by `stripe listen` to `STRIPE_WEBHOOK_SECRET`.

### 4. Test the Payment Flow

Use these test cards (any future expiry, any CVC):

| Scenario           | Card Number         | Result             |
| ------------------ | ------------------- | ------------------ |
| Success            | 4242 4242 4242 4242 | Payment succeeds   |
| Decline            | 4000 0000 0000 0002 | Card declined      |
| Auth Required      | 4000 0025 0000 3155 | 3D Secure required |
| Insufficient Funds | 4000 0000 0000 9995 | Insufficient funds |

Trigger test webhook events manually:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

## Verification

- [ ] Test card payment (4242...) succeeds and redirects to success URL
- [ ] Webhook events received and logged (check `stripe listen` output)
- [ ] Subscription record created in Supabase after checkout
- [ ] User store updates to show Pro status after payment
- [ ] Usage limits no longer enforced for Pro user
- [ ] Customer Portal accessible for Pro users

## Troubleshooting

**Webhook signature error (`No signatures found`):**
Make sure `STRIPE_WEBHOOK_SECRET` matches the secret from `stripe listen`, not the Dashboard secret — they are different.

**Test vs live mode confusion:**
`sk_test_` keys only work with test webhooks and test price IDs. Never mix test and live keys.

**Subscription not reflected in app:**
Check that the webhook handler received `checkout.session.completed` and that `user_id` was passed in the checkout session metadata. See [How Billing Works](../architecture/how-billing-works.md) for the full webhook flow.
