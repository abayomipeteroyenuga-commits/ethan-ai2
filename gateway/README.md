# Ethan Office Suite v16 — Document Utility Conversion Gateway

This server keeps provider credentials out of the browser and APK.

## Features
- `/api/convert`: DOC/DOCX/XLS/XLSX/PPT/PPTX/PDF/image format conversions using ConvertAPI.
- `/api/pdf`: searchable PDF OCR, PDF compression/optimization, page extraction, split pages, rotate pages, PDF/A archival, password protection, and password removal when the current password is supplied.

## Setup
1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Add `CONVERTAPI_TOKEN` for Office/file conversion.
4. Add `CLOUDCONVERT_API_KEY` for advanced PDF/OCR tools.
5. Restrict `ALLOWED_ORIGINS` to your real Ethan Office web origin before public deployment.
6. Run `npm start` and serve behind HTTPS.

Do not place API keys in `index.html`, Android assets, GitHub public code, or the APK.
