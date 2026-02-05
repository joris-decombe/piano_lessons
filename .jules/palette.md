## 2025-10-26 - [Range Sliders for Music Notes]
**Learning:** Range inputs (`<input type="range">`) that control musical values (like split points or pitch) are inaccessible if they only announce numbers (e.g., "60"). Screen reader users need the semantic note name (e.g., "C4").
**Action:** Always add `aria-valuetext={getNoteName(value)}` to range sliders representing musical notes to ensure the announcement matches the visual label.
