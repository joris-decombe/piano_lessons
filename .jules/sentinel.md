## 2026-01-21 - Missing CSP in Next.js Static Export
**Vulnerability:** Application lacked a Content Security Policy (CSP), exposing it to XSS.
**Learning:** Next.js `output: "export"` ignores `next.config.js` headers and `metadata` API doesn't support `http-equiv` meta tags.
**Prevention:** Manually inject `<meta http-equiv="Content-Security-Policy" ...>` in the root `layout.tsx` for static exports.

## 2026-01-24 - Untestable File Validation
**Vulnerability:** File upload logic was tightly coupled to the DOM `File` API, making unit testing difficult and leading to weak client-side validation.
**Learning:** Decoupling validation logic using a `FileLike` interface (name, size) allows robust unit testing without mocking DOM globals.
**Prevention:** Always extract validation logic into pure functions accepting plain objects/interfaces rather than DOM types.

## 2026-01-25 - Parser Configuration Trade-offs
**Vulnerability:** Default XML parser settings might allow DoS or XXE, but hardening them can break valid data.
**Learning:** Disabling `processEntities` in `fast-xml-parser` to prevent entity expansion also prevents decoding of standard HTML entities (like `&amp;`) in text content, breaking valid MusicXML titles.
**Prevention:** Use explicit resource limits (max measures/events) for DoS protection instead of disabling core parser features that affect data correctness.
