## 2026-01-20 - CSP in Next.js Static Exports
**Vulnerability:** Missing Content Security Policy (CSP) headers in a statically exported Next.js application, leaving it vulnerable to XSS and data injection.
**Learning:** Standard `next.config.js` headers are ignored when using `output: 'export'`. Additionally, Next.js `metadata.other` API renders `<meta name="...">` tags, which are ignored for CSP. Browsers require `<meta http-equiv="...">`.
**Prevention:** Manually insert the `<meta http-equiv="Content-Security-Policy" ...>` tag into the `<head>` section of the Root Layout component.
