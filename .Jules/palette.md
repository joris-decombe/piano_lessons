## 2026-01-21 - Range Slider Accessibility
**Learning:** Range sliders (`<input type="range">`) announce raw numbers by default, which is confusing for non-numeric values like musical notes or playback speeds.
**Action:** Always implement `aria-valuetext` on range sliders to provide human-readable values (e.g., "C4", "1.5x").
