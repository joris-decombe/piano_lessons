## 2024-05-22 - Accessible Sliders and Note Logic
**Learning:** Range sliders (inputs of type range) are often inaccessible without explicit `aria-valuetext`, especially when they represent non-numeric values like musical notes. Screen readers only announce the raw numeric value by default.
**Action:** Always add `aria-valuetext` to range sliders to provide human-readable context (e.g., "1.5s", "C#4"). For dynamic values, ensure the text updates with the value.
