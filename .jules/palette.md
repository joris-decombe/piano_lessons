## 2024-05-23 - Dynamic Range Slider Labels
**Learning:** Range sliders representing complex values (like MIDI notes) need dynamic `aria-valuetext` and visual labels to be accessible and usable. Raw numbers are insufficient.
**Action:** Always implement a helper function (like `getNoteName`) to convert raw values to human-readable strings for both visual display and `aria-valuetext`.
