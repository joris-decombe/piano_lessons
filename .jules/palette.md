## 2025-10-26 - Accessibility of Sliders
**Learning:** Range inputs (`<input type="range">`) often represent non-numeric data (like musical notes) or formatted values (speeds). Screen readers default to reading the raw number, which is confusing (e.g., reading "60" instead of "C4").
**Action:** Always add `aria-valuetext` to range inputs when the raw number isn't the primary mental model for the user.
