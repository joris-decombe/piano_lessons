## 2026-01-21 - Missing CSP in Next.js Static Export
**Vulnerability:** Application lacked a Content Security Policy (CSP), exposing it to XSS.
**Learning:** Next.js `output: "export"` ignores `next.config.js` headers and `metadata` API doesn't support `http-equiv` meta tags.
**Prevention:** Manually inject `<meta http-equiv="Content-Security-Policy" ...>` in the root `layout.tsx` for static exports.

## 2026-01-22 - Unrestricted Client-Side File Upload
**Vulnerability:** Client-side MusicXML parser read entire files into memory without size limits, causing browser freezes/crashes (DoS).
**Learning:** Client-side input processing requires validation just like server-side to protect the user experience and preventing resource exhaustion.
**Prevention:** Enforce `file.size` checks before reading file contents into memory (e.g., `file.text()`).
