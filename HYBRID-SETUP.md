# ETHAN AI v7.5 Hybrid Setup

1. Deploy this ZIP. Free Search works without OpenAI.
2. Run `supabase/v7.5-hybrid-migration.sql` once in Supabase SQL Editor.
3. Before activating paid Premium AI, add these Vercel server environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (publishable/anon key)
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional; defaults to `gpt-5.6-luna`)
   - `MAX_OUTPUT_TOKENS` (optional; defaults to 1400)
4. Redeploy Vercel after adding variables.
5. Payment/webhook code must be the only system that changes a user's `profiles.plan` to a paid plan.

Free Search does not require the OpenAI variables.
