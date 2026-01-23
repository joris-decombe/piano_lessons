## 2026-01-21 - Missing CSP in Next.js Static Export
**Vulnerability:** Application lacked a Content Security Policy (CSP), exposing it to XSS.
**Learning:** Next.js `output: "export"` ignores `next.config.js` headers and `metadata` API doesn't support `http-equiv` meta tags.
**Prevention:** Manually inject `<meta http-equiv="Content-Security-Policy" ...>` in the root `layout.tsx` for static exports.

## 2026-01-21 - Unbounded Client-Side File Processing
**Vulnerability:** Client-side XML parsing of user uploads had no size limit, risking DoS (browser freeze).
**Learning:** Even client-side processing needs input validation to protect the user's session/browser.
**Prevention:** Enforce `MAX_FILE_SIZE` checks before passing `File` objects to parsers.
