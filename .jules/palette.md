## 2025-02-18 - Slider Accessibility & Accuracy
**Learning:** Range sliders (`<input type="range">`) are often inaccessible to screen readers because they only announce the numeric value. Adding `aria-valuetext` provides necessary context (e.g., "1.5x speed" vs "1.5").
**Action:** Always add `aria-valuetext` to range sliders when the unit or meaning isn't obvious from the number alone. Also, double-check manual calculations in UI labels (like pitch names) against a source of truth to prevent "C-everywhere" bugs.
