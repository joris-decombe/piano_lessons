## 2026-01-21 - Missing CSP in Next.js Static Export
**Vulnerability:** Application lacked a Content Security Policy (CSP), exposing it to XSS.
**Learning:** Next.js `output: "export"` ignores `next.config.js` headers and `metadata` API doesn't support `http-equiv` meta tags.
**Prevention:** Manually inject `<meta http-equiv="Content-Security-Policy" ...>` in the root `layout.tsx` for static exports.

## 2026-01-24 - Untestable File Validation
**Vulnerability:** File upload logic was tightly coupled to the DOM `File` API, making unit testing difficult and leading to weak client-side validation.
**Learning:** Decoupling validation logic using a `FileLike` interface (name, size) allows robust unit testing without mocking DOM globals.
**Prevention:** Always extract validation logic into pure functions accepting plain objects/interfaces rather than DOM types.

## 2026-01-26 - Unvalidated LocalStorage
**Vulnerability:** Application blindly parsed and trusted `localStorage` data, potentially allowing Stored XSS via malicious `url` properties.
**Learning:** `localStorage` is not a trusted store; it can be manipulated by other scripts on the same origin or by users.
**Prevention:** Always validate and sanitize data retrieved from storage before usage, especially URLs or HTML content.
