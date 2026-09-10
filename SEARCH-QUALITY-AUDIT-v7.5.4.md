# ETHAN AI v7.5.4 Search Quality Audit

Fixed two visible quality problems:
1. Unrelated results: free-search results now require meaningful overlap with the user's query, exact phrase matches are heavily boosted, title relevance is weighted higher, and loose DuckDuckGo related topics are rejected.
2. Broken/incomplete words: snippets now stop at a complete sentence where possible, otherwise at a complete word with an ellipsis.

The app now prefers returning 'no sufficiently relevant result' over confidently displaying unrelated material.

Important limitation: a no-cost public-source search layer is not a complete general-web index. Premium AI remains the higher-capability path for broad/current web research.
