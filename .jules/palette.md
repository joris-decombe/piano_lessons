# Palette's Journal

This document records critical UX and accessibility learnings for the Piano Lessons project.

## 2024-05-23 - Accessibility First

**Learning:** This project uses custom range sliders for musical parameters. Standard range inputs lack semantic context for musical values (e.g., "60" vs "C4").
**Action:** Always implement `aria-valuetext` for any slider that represents a non-numeric concept (like notes) or formatted values (like "1.5x").
