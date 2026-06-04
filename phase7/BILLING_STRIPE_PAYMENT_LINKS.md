# Bliss Planner Billing: Stripe Payment Links

Chosen provider for the first paid-release checkout: Stripe Payment Links.

Why this is the first billing path:
- Fastest path to a real hosted checkout without building subscription logic first.
- Supports products/subscriptions from the Stripe Dashboard.
- Bliss Planner already exposes `/api/billing/status` and `/api/billing/checkout`.

## Render Environment Variable

Create a Stripe Payment Link, then set:

```text
BLISS_BILLING_CHECKOUT_URL=https://buy.stripe.com/<your-payment-link>
```

Optional future server-side integration:

```text
STRIPE_SECRET_KEY=sk_live_...
```

## Current App Behavior

- `/api/billing/status` reports whether a billing provider is configured.
- `/api/billing/checkout` returns the configured `BLISS_BILLING_CHECKOUT_URL` for workspace owners.
- Checkout requests are written to the production audit log when Postgres is configured.

## Before Paid Launch

- Create final pricing plans.
- Add tax/VAT policy.
- Add refund and cancellation terms.
- Add Stripe webhook handling for completed checkout/subscription state.
- Add billing state display in the admin/workspace settings UI.
