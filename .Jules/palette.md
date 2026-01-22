## 2024-05-22 - Range Sliders & Domain Values
**Learning:** Range inputs (`<input type="range">`) showing domain-specific data (like MIDI notes or playback speed) often default to raw numbers, which is confusing for screen readers.
**Action:** Always implement `aria-valuetext` with a human-readable string (e.g., "C#4" instead of "61") to ensure the value is meaningful to all users.
