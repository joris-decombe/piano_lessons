# **Pixel Piano: Shadows & Separations Specification**

**Version:** 1.0  
**Context:** Supplements PIXEL\_PIANO\_PLAYER\_POV\_SPECS.md  
**Light Source:** Top-Down, slightly from North (Player POV). Shadows fall South.

## **1\. Key Separations (The "Gap" Logic)**

In a pixel-perfect 168px octave, we cannot use real gaps (margin-right: 1px) because they break the integer math. We use **Inner Shadows** to create separations.

### **A. Idle State (Unpressed)**

* **Visual Goal:** Keys appear as a continuous ivory surface with hairline cracks.  
* **Technique:** Every white key (except the last B in a set, if needed for tiling) gets a **1px Right-Side Inner Shadow**.  
  * box-shadow: inset \-1px 0 0 0 \#9CA3AF (Gray 400).  
* **Why Inner?** Using an outer border increases the element width. Using an inner shadow keeps the hit-box exactly 24px.

### **B. Pressed State (Articulation)**

When a key is pressed, it moves "down" (Northward Recess). The separation line must remain visible or become more pronounced to show depth.

* **Technique:** The pressed key darkens (bg-gray-300). The 1px separator remains.  
* **Neighbor Interaction:** Because the pressed key is physically lower, the *adjacent unpressed key* essentially casts a shadow onto the pressed key's edge.  
  * **Visual Hack:** The "Pressed" color (\#D1D5DB) is distinct enough from the "Separator" color (\#9CA3AF) that no extra shadow logic is strictly required for the *gap* itself. The color contrast handles the depth.

## **2\. Cast Shadows: Black on White**

The black keys float above the white keys. They cast shadows.

### **A. Idle State (Floating)**

* **Physics:** The key is 12px high.  
* **Shadow:** Casts a sharp shadow onto the white keys below.  
* **Direction:** South (Towards player).  
* **Dimensions:**  
  * **Offset:** 0px Horizontal, 4px Vertical.  
  * **Blur:** 0px (Pixel Art Style).  
  * **Color:** \#000000 at 20-30% opacity (or a solid dark color if transparency is forbidden).  
* **Implementation:**  
  * CSS box-shadow: 0 4px 0 0 rgba(0,0,0,0.25) applied to the Black Key sprite.  
  * *Note:* Since black keys have z-index: 30, this shadow naturally falls on top of the White Keys (z-index: 10).

### **B. Pressed State (Sinking)**

* **Physics:** The key sinks 12px down (border shrinks to 0). It is now flush or nearly flush with the white key surface (in the pocket).  
* **Shadow Change:** As the key lowers, the shadow must **shrink**.  
* **Animation:**  
  * Transition box-shadow from 0 4px 0 0 ... to 0 0 0 0 ....  
  * **Result:** The shadow disappears exactly as the key "bottoms out" into the pocket. This visual cue reinforces the "sinking" physics.

## **3\. Cast Shadows: White on White (The "Cliff")**

When a white key is pressed, it drops \~10mm below its neighbors. This creates a vertical "cliff" face exposed on the *neighbors*.

### **Scenario: Key \[C\] is Pressed, \[D\] is Idle**

* **Physics:** \[D\] is higher than \[C\]. Light from above should cast a shadow from \[D\]'s left edge onto \[C\].  
* **Pixel Art Simplification:** Calculating dynamic neighbor shadows in CSS is expensive.  
* **The "Northward Recess" Solution:**  
  * Recall the animation from PLAYER\_POV\_SPECS: The pressed key moves translateY(-2px) (North).  
  * This movement creates a distinct misalignment at the bottom ("Lip") and top ("Pocket").  
  * **Shadow Hack:** The darkened color of the pressed key (\#D1D5DB) effectively simulates it being "in shadow." We do **not** need to render a specific cast shadow from D onto C. The color change \+ positional shift is sufficient for the brain to interpret depth.

## **4\. Key Pocket Shadows (The Void)**

The "Key Pocket" (the notches cut into white keys) is logically empty space.

* **Color:** Pure Black (\#000000).  
* **Role:** This acts as the "Floor" of the piano action.  
* **Interaction:**  
  * **Idle Black Key:** Sits *above* the void. The void is barely visible around the edges.  
  * **Pressed Black Key:** Sits *inside* the void. The black key (now border-bottom: 0\) blends into this void, creating a "seamless merge" with the dark background, further selling the "swallowed" effect.

## **5\. Summary of Shadow States**

| Element | State | Shadow Style (Tailwind Class equivalent) | Effect |
| :---- | :---- | :---- | :---- |
| **White Key** | Idle | shadow-\[inset\_-1px\_0\_0\_\#9CA3AF\] | 1px hairline crack on right. |
| **White Key** | Pressed | bg-piano-white-pressed | Whole key darkens. No new shadow cast. |
| **Black Key** | Idle | shadow-\[0\_4px\_0\_0\_rgba(0,0,0,0.25)\] | Casts shadow onto white keys. |
| **Black Key** | Pressed | shadow-none | Shadow vanishes as key sinks. |

