# ETHAN AI Search v4

Implemented:
- Search, AI Chat and Files modes
- Live AI overview + web citations when OPENAI_API_KEY is configured
- All / Web / News / Images / Videos / Education / Discussions filters
- Recency and Global / Nigeria / Africa focus filters
- Follow-up questions and related-query prompts
- Voice search using browser speech recognition
- Local text-file analysis for TXT, MD, CSV, JSON and HTML
- PDF attachment UI hook (server extraction is a future backend step)
- Search history, saved searches and answer feedback
- Source cards with type icons and citation chips
- PWA install support, mobile layout and dark mode
- Basic request-size limits, security headers and rate limiting
- Root index.html for easy local testing

Local index testing uses Wikipedia fallback because browser-only mode cannot securely hold AI API keys.
