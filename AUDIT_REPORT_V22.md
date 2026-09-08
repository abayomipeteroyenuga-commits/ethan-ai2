# Ethan Office v22 — Security Audit

{
  "main_js": "PASS",
  "gateway_js": "PASS",
  "utility_js": "PASS",
  "duplicate_ids": [],
  "pages": 13,
  "missing_nav": [],
  "auth_gate": true,
  "otp_controls": {
    "crypto_random": true,
    "hashed_otp": true,
    "expiry": true,
    "attempt_limit": true,
    "request_rate_limit": true,
    "verify_rate_limit": true,
    "signed_session": true,
    "logout_revocation": true,
    "conversion_auth": true,
    "pdf_auth": true,
    "security_headers": true
  },
  "smtp_secret_not_client": true,
  "manifest_json": true,
  "cache": "PASS",
  "missing_sw_assets": [],
  "env_fields": true
}
