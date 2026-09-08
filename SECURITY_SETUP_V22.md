# Ethan Office v22 — Secure Email OTP Setup

Ethan Office v22 includes real server-backed email OTP authentication. It is not a fake/demo OTP.

## Required server configuration
Deploy the `gateway/` service and configure its environment variables from `gateway/.env.example`.

Required:
- `AUTH_SECRET` — at least 32 random characters; keep server-side only.
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `ALLOWED_ORIGINS=https://office.ethandigitalacademy.org`

Optional access control:
- `AUTH_ALLOWED_EMAILS` — comma-separated email addresses.
- `AUTH_ALLOWED_DOMAINS` — comma-separated allowed domains.

## Security controls
- Cryptographically random six-digit OTP.
- OTP expires after 10 minutes.
- OTP stored only as an HMAC hash, never plaintext.
- Maximum five incorrect attempts per OTP.
- Request and verification rate limiting.
- Signed HMAC session tokens with expiry.
- Session token kept in sessionStorage, not persistent localStorage.
- Logout revokes the current session server-side.
- Conversion/PDF gateway routes require an authenticated session.
- CORS origin allow-list.
- Express x-powered-by disabled.
- Existing file-upload size/type controls remain active.

## Important deployment rule
For the strongest protection, host the web app and authentication gateway under the same trusted Ethan Office deployment/origin or reverse-proxy `/api` to this gateway. Do not put SMTP credentials or `AUTH_SECRET` in browser JavaScript.

The PWA can still be installed. Because PWA files are cached on a user's device, email OTP controls entry through the Ethan Office interface and server services; it cannot make already-cached static HTML cryptographically inaccessible to a device owner with developer-level access. Highly confidential server-stored documents would require server-side encrypted storage and authorization in a future backend.
