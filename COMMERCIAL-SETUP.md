# ETHAN AI v7 Commercial Setup
v7 adds pricing, account/usage UI, a Supabase-ready commercial schema and RLS policies.

## Supabase
Create a Supabase project, review and run `supabase/schema.sql`, then connect email/password Auth. Put only the browser-safe project URL and publishable/anon key in `config.js`. Never expose the service-role key.

## Paystack
Create Plus and Pro monthly plans. Keep the secret key server-side. Use verified subscription webhooks to update `subscriptions`; never unlock paid access from browser state alone.

## Suggested launch tiers
Free: ₦0 — 20 AI searches/day
Plus: ₦3,000/month — 300 AI searches/month
Pro: ₦7,500/month — 1,000 AI searches/month

## Before accepting money
Wire Supabase JWT validation and server-side quota enforcement into `/api/search`, then add secure Paystack initialize and webhook endpoints. Add production rate limiting/WAF.
