## 2024-05-23 - Slider Accessibility
**Learning:** Standard `<input type="range">` sliders show numeric values by default, which can be meaningless (e.g. "60" for Middle C). Adding `aria-valuetext` allows us to present human-readable values (like "C4" or "1:30") to screen reader users without changing the visual design.
**Action:** Always check if a slider's numeric value is self-explanatory. If not, provide a formatted string via `aria-valuetext`.
