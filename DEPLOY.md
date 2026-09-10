# ETHAN AI Search v5 — Deployment

## Recommended address
`search.ethandigitalacademy.org`

## Vercel
1. Create a GitHub repository named `ethan-ai-search` and upload the contents of this ZIP **without adding another folder layer**.
2. In Vercel choose **Add New → Project**, import `ethan-ai-search`, and leave Framework Preset as **Other**.
3. Add Environment Variables:
   - `OPENAI_API_KEY` = your secret API key
   - `OPENAI_MODEL` = `gpt-5.6-luna`
   - `MAX_OUTPUT_TOKENS` = `1600`
4. Deploy.
5. Visit `/api/health`. It should show `"ok": true` and `"aiConfigured": true`.
6. Add custom domain `search.ethandigitalacademy.org` in Vercel and create the DNS record Vercel requests at your domain provider.

## Security
Never put `OPENAI_API_KEY` inside index.html, app.js, GitHub source files, screenshots, or browser localStorage. It belongs only in Vercel Environment Variables.

## Local testing
Double-click `index.html` for fallback/demo search. Live AI search requires deployment or `vercel dev` with a local `.env` file.
