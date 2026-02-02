## 2025-02-19 - Accessible Range Sliders
**Learning:** Range inputs (`<input type="range">`) often display a number visually but announce only the number to screen readers, which lacks context (e.g., "60" vs "C4"). Using `aria-valuetext` provides the necessary human-readable context.
**Action:** Always pair `type="range"` with `aria-valuetext` when the value has a specific unit or mapping (like notes or speed multipliers). Verify using `get_attribute("aria-valuetext")` in Playwright.
