# ETHAN AI v7.5 Hybrid

## Free plan
- Free public-source search remains available without an OpenAI API key.
- Wikipedia/Wikimedia, DuckDuckGo Instant Answers, OpenAlex, GDELT and Stack Exchange.
- Free users never trigger OpenAI.

## Premium plans
- Plus: 40 Premium AI searches/month.
- Pro: 150/month.
- Education/Business: 350/month.
- Premium requests require a signed-in Supabase user and server-verified paid plan.
- OpenAI key remains server-side in Vercel.
- If OpenAI is not configured, premium requests gracefully fall back to Free Search.

## Security
- Plan entitlement checked server-side.
- v7.5 migration removes client ability to self-upgrade profile plan.
- Monthly usage is checked before Premium AI calls.
