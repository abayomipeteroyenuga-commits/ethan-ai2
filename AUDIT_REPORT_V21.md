# Ethan Office v21 — Document Utility Startup/Null Reference Fix

## Root cause
The Ethan Document Utility database was actually opening successfully, but its startup `refresh()` function then tried to write into several UI containers that were missing from `document-utility.html`.

That produced:
`Cannot set properties of null (setting 'innerHTML')`

Because database opening and interface rendering were wrapped in the same catch block, the app incorrectly reported the problem as a storage/database failure.

## Repairs
- Restored all Document Utility runtime containers:
  - recentDash
  - docsGrid
  - foldersGrid
  - favGrid
  - recentGrid
  - trashGrid
  - signatureGrid
  - imageOutputs
  - compareOutput
  - engineResult
  - pdfToolResult
  - editMeta
  - pageStrip
- Added page-strip styling for the document editor.
- Added null-safe `setText()` / `setHTML()` helpers.
- Rewrote `refresh()` so missing optional UI cannot crash storage startup.
- Made document/folder/signature renderers null-safe.
- Made page-strip/editor metadata rendering null-safe.
- Separated database-open errors from interface-rendering errors so a UI bug is never mislabeled as a database corruption issue.
- Kept the v19 IndexedDB version-safe opening logic and secure Android WebView origin.
- Updated PWA cache to `ethan-office-v21-docutil-nullfix`.

## Validation
- Ethan Office pages: 13
- Missing main navigation destinations: 0
- Duplicate main HTML IDs: 0
- Unresolved main UI handlers: 0
- Main JavaScript syntax: PASS
- Document Utility JavaScript syntax: PASS
- Conversion gateway JavaScript syntax: PASS
- Document Utility missing `$()` DOM references: 0
- Document Utility duplicate IDs: 0
- All 13 restored runtime containers present: PASS
- Service-worker core assets: PASS
- Android embedded assets synchronized with web build: PASS
- Codemagic workflows: ethan-office-debug, ethan-office-release
- Android package: org.ethandigitalacademy.office
- Android versionName: 21.0.0
- Android versionCode: 22

## Important note
No existing Document Utility files or IndexedDB data are cleared or deleted by this repair.
