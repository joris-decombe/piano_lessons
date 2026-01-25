## 2026-01-21 - Missing CSP in Next.js Static Export
**Vulnerability:** Application lacked a Content Security Policy (CSP), exposing it to XSS.
**Learning:** Next.js `output: "export"` ignores `next.config.js` headers and `metadata` API doesn't support `http-equiv` meta tags.
**Prevention:** Manually inject `<meta http-equiv="Content-Security-Policy" ...>` in the root `layout.tsx` for static exports.

## 2026-01-21 - Client-Side File Validation
**Vulnerability:** Missing file size and type validation on client-side uploads could lead to DoS or processing of invalid files.
**Learning:** Checking `File.size` and `File.name` before processing is a cheap and effective first line of defense. Decoupling validation logic using `FileLike` interface makes testing easier in Node.js environments.
**Prevention:** Implement `validateFile` utility with strict size limits and extension checks.
