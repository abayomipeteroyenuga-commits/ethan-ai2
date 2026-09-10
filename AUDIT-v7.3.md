# ETHAN AI v7.3 Comprehensive Audit

Fixed:
- Supabase was blocked by the production CSP; allowed the Supabase JS CDN and configured project endpoint.
- Removed stale-cache risk with a new service-worker version and same-origin network-first strategy.
- Added automatic service-worker update/reload handling.
- Prevented overlapping search requests from racing and overwriting newer results.
- Added client search timeout/abort handling.
- Hardened malformed API-response handling.
- Prevented corrupted localStorage from crashing app startup.
- Added safer file-size/type handling.
- Added voice-search error handling.
- Added auth request timeouts.
- Replaced blocking password-reset prompt with the account modal flow.
- Added successful-search local usage-meter progression.
- Added null-safe panel behavior.
- Improved commercial UI dark mode and reduced-motion behavior.
- Optimized large PNG assets for faster loading.
- Added automatic Supabase Auth -> profiles trigger in schema and a v7.3 migration.
- Retained family-friendly Safe Search and API protections.

Current intentional limitations:
- Paid checkout is still not live.
- Server-enforced commercial quotas are not yet connected to authenticated users.
- PDF text extraction is not yet implemented.
- Dedicated image/video search cards are not yet backed by separate media APIs.
