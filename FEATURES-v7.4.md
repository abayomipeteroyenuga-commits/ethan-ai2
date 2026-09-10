# ETHAN AI v7.4 — Free Search Edition

## Core change
The search engine no longer requires an OpenAI API key. Search requests are answered with public/open data sources and ETHAN AI's own deterministic ranking/deduplication layer.

## Sources
- Wikipedia / Wikimedia for knowledge and public media references
- DuckDuckGo Instant Answer data for additional knowledge references
- OpenAlex for academic works
- GDELT for recent global news
- Stack Exchange for technical community discussions

## Search modes
- Smart Answer / Web: keyless public-source search
- News: GDELT
- Images / Videos: Wikimedia Commons
- Academic: OpenAlex
- Discussions: Stack Exchange
- Files: local text matching for TXT/MD/CSV/JSON/HTML content

## Cost behavior
No OpenAI environment variable is required and this build does not call OpenAI. Public services can have fair-use/rate limits, so free search is not guaranteed to be unlimited at commercial scale.
