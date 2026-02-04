## 2024-05-22 - Range Slider Accessibility
**Learning:** Range sliders for musical values (like MIDI numbers or playback speed) are often inaccessible because they announce raw numbers (e.g., "60" or "1.5") instead of meaningful values (e.g., "C4" or "1.5x speed").
**Action:** Always implement `aria-valuetext` on `<input type="range">` elements when the raw numeric value is not the most meaningful representation for the user.
