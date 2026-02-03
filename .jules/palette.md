## 2025-02-18 - Range Slider Accessibility
**Learning:** Range inputs (<input type="range">) in this codebase often lack `aria-valuetext`, leaving screen reader users with raw numbers (e.g., "60", "1") instead of meaningful values (e.g., "C4", "1.0x speed").
**Action:** When adding or modifying sliders, always implement `aria-valuetext` to provide human-readable context.
