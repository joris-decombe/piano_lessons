# **Piano Lessons: Pixel Art Refactor Guide**

## **1\. The Aesthetic Philosophy: "Hi-Bit Satie"**

We are moving from a "Simulation" aesthetic to a "Stylized" one. The goal is to evoke the feeling of modern indie classics (like *Hyper Light Drifter* or *Celeste*)—melancholy, precise, and crisp—fitting for Satie's *Gnossienne No. 1*.

### **Core Principles**

1. **Logical Pixel Grid:** All static assets (keys, icons, text) must snap to a strict integer grid. 1 "Logical Pixel" \= 1 CSS Pixel (or 2x/3x on high DPI).  
2. **Smooth Motion:** While the *look* is blocky, the *movement* (falling notes, key presses) must remain high-framerate (60fps+). We do not artificially lower the framerate.  
3. **Lighting over Texture:** We replace gradients and wood grains with flat colors and "dithered" highlights.  
4. **No Sub-Pixel Blur:** Borders and shadows must be sharp.

## **2\. Rendering Strategy**

### **A. The "Logical Pixel" Scale**

We are defining **1mm (Physical) ≈ 1px (Logical)**.  
This allows us to maintain the relative proportions of a real piano while using clean integers.

* **White Key:** 24px wide (was 23.6mm)  
* **Black Key:** 14px wide (was 13.7mm)  
* **Octave:** 168px wide (7 white keys × 24px)

### **B. CSS vs. Canvas**

* **The Keyboard (Static/Interactive):** Use **DOM/CSS** (Tailwind).  
  * *Why?* Crisp text rendering for key labels, easy hover states, and accessibility.  
* **The Waterfall (Falling Notes):** Keep using **Canvas**.  
  * *Why?* Performance. Managing hundreds of falling nodes in the DOM triggers layout thrashing.  
  * *Style:* Draw the notes as solid rectangles with a 1px inner border. Do not use anti-aliased rounded corners.

### **C. Handling "Smooth" Pixel Art**

The constraint "really smooth animations" creates a conflict with "pixel art" (which usually snaps positions).  
**The Solution: Sub-pixel Transform, Snapped Assets.**

* **Assets:** The key sprites themselves are drawn with hard edges.  
* **Movement:** When a key is pressed, use transform: translateY(6px). The browser will interpolate this smoothly.  
  * *Note:* On high-DPI screens, this looks great. On low-res screens, it might look slightly blurry during motion, but this is acceptable for the "smooth feel" requirement.

## **3\. Technical Implementation Rules**

### **Rule 1: No border-radius**

Standard CSS rounding creates anti-aliased curves that break the pixel illusion.

* **Bad:** rounded-sm (2px radius)  
* **Good:** Use specific "stair-step" transparent pixels in your sprite, or a 1px clip-path. For this project, **perfect rectangles** are preferred for the "clean" look, or 1px "dog-ears" (chamfered corners).

### **Rule 2: Inner Shadows for Borders**

Do not use CSS borders (border: 1px solid) if they add to the element's width, as this breaks the strict 168px octave math.

* **Use:** box-shadow: inset \-1px 0 0 \#Color (Tailwind: shadow-\[inset\_-1px\_0\_0\_\#...\]).  
* This draws the separator *inside* the 24px key width.

### **Rule 3: The "Solid" Shadow**

Drop shadows must not fade.

* **Bad:** box-shadow: 0 4px 6px \-1px rgba(0,0,0,0.1)  
* **Good:** box-shadow: 0 4px 0 0 \#000000 (Solid offset).

### **Rule 4: Typography**

Use a pixel-font optimized for screen reading.

* **Recommended:** *Inter* (at small sizes with \-tracking) can work, but a dedicated font like *Press Start 2P* (too arcadey) or *VT323* is better.  
* **Best Pick for "Satie":** **"Silkscreen"** or **"Pixelify Sans"** (Google Fonts).

## **4\. Key Sprite Construction (The "3-Shape" Rule Refactored)**

We will use CSS masks or simple div layering to create the 3 white key shapes defined in the specs.

1. **Base:** A 24px x 150px white rectangle.  
2. **The "Lip":** A 24px x 12px absolute div at the bottom (brighter color).  
3. **Active State:** Instead of a glow, we shift the whole element down 6px and darken the "Front Face" color to simulate the key sinking into the shadow.

## **5\. Animation Curves**

* **Press (Attack):** Immediate. duration-75 ease-out. The key should drop instantly.  
* **Release:** slightly bouncy. duration-150 cubic-bezier(0.34, 1.56, 0.64, 1). This gives the mechanical "clunk" of the key returning.