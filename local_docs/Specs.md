# **Pixel Piano: Master Technical Specifications**

**Version:** 2.0 (Unified)  
**Aesthetic Goal:** "Hi-Bit Satie" (Modern Pixel Art, Flat Colors, 60fps Motion)  
**Scale:** 1mm (Physical) ≈ 1 Logical Pixel

## **1\. Aesthetic Philosophy & Rendering Rules**

### **The "Hi-Bit" Look**

We are moving from a "Simulation" aesthetic to a stylized one.

* **Logical Pixel Grid:** All static assets snap to a strict integer grid.  
* **No Sub-Pixel Blur:** Shadows and borders must be solid/sharp.  
* **Smooth Motion:** While the *assets* are blocky, the *movement* (falling notes, key presses) remains high-framerate (60fps).

### **Core Rendering Rules**

1. **No border-radius:** Use strict rectangles.  
2. **Solid Shadows:** Use box-shadow: 0 4px 0 0 \#000 instead of blurred RGBA shadows.  
3. **Inner Borders:** Use inset shadows for key separators to strictly preserve the 168px Octave width.

## **2\. Component Anatomy (The Case)**

The "Cabinet" frames the keys. It is built using "2.5D" construction (Top Face \+ Front Face borders).

### **A. Cheek Blocks (Side Blocks)**

The solid wooden blocks framing the keyboard on the left and right.

* **Geometry:** **Rectangular Prism** (Runs the full length of the white keys).  
* **Dimensions:**  
  * **Width:** **36px** (1.5x Key Width).  
  * **Height:** **150px** (Matches White Key Total Length).  
* **Visual Construction:**  
  * **Top Surface:** bg-gray-800 (Lit).  
  * **Front Face (3D Depth):** border-b-\[12px\] border-gray-900 (Dark).  
  * *Note:* The 12px border simulates the vertical front face of the block.

### **B. The Key Slip (Bottom Frame)**

The strip running horizontally across the bottom.

* **Dimensions:** Height **24px** x Full Width.  
* **Layering (Critical):** **Z-Index 0** (Lowest).  
* **Relationship:** The Keys (z-10) sit **ON TOP** of the Key Slip.  
* **The "Lip" Overhang:**  
  * The Key Slip should be positioned with a negative margin (or the keys with a positive overlap) so the bottom **2px** of the White Keys covers the top of the Key Slip.  
  * *Highlight:* A 1px border-t border-gray-700 on the slip distinguishes it from the keys.

### **C. Nameboard & Felt (Top Area)**

* **Nameboard:** The dark area above the keys (bg-slate-900).  
* **Cavity Shadow:** A **12px height** solid black strip (bg-black) immediately behind the keys.  
* **Red Felt:** A **2px** solid line (bg-rose-900) strictly separating the Keys from the Nameboard.

## **3\. Key Specifications**

### **White Keys**

* **Width:** **24px** (Base Grid Unit).  
* **Height:** **150px**.  
* **Travel (Dip):** **6px**.  
* **Visual Style:**  
  * Flat color surface.  
  * **Separator:** box-shadow: inset \-1px 0 0 \#9CA3AF (Right side only).  
  * **Lip:** Simulated via the 2px physical overhang on the Key Slip (see Section 2B).

### **Black Keys (The "Sinking" Sprite)**

* **Width:** **14px**.  
* **Top Surface:** **96px** (The clickable area).  
* **3D Face (Border):** **12px** border-bottom (Darker color).  
* **Total Visual Height:** 108px (96px Surface \+ 12px Border).  
* **Offset:** See Section 4\.

## **4\. The Octave Layout (Lookup Table)**

**Total Octave Width:** 168px.  
**Constraint:** Do not calculate these positions. Hardcode them to prevent anti-aliasing artifacts.

| Key | Type | X-Pos (Left) | Width | Placement Note |
| :---- | :---- | :---- | :---- | :---- |
| **C** | White | **0px** | 24px |  |
| **C\#** | Black | **15px** | 14px | Left-biased |
| **D** | White | **24px** | 24px |  |
| **D\#** | Black | **43px** | 14px | Right-biased |
| **E** | White | **48px** | 24px |  |
| **F** | White | **72px** | 24px |  |
| **F\#** | Black | **85px** | 14px | Strong Left-biased |
| **G** | White | **96px** | 24px |  |
| **G\#** | Black | **113px** | 14px | Centered |
| **A** | White | **120px** | 24px |  |
| **A\#** | Black | **141px** | 14px | Strong Right-biased |
| **B** | White | **144px** | 24px |  |

## **5\. Animation Logic (The "Sinking" Effect)**

To make the pixel art look mechanical and heavy, we do not just "slide" the keys. We compress their 3D borders.

### **Black Key Animation**

* **Idle State:**  
  * transform: translateY(0)  
  * border-bottom-width: 12px  
* **Active State:**  
  * transform: translateY(6px) (Top surface moves down).  
  * border-bottom-width: 6px (Bottom edge stays fixed, face compresses).  
* **Timing:**  
  * Press: 75ms (Instant).  
  * Release: 150ms (Bouncy).

### **White Key Animation**

* **Action:** Simple translateY(6px).  
* **Visual:** The bottom of the key will slide further over the Key Slip.

## **6\. Color Palette (Theme: "Satie's Rain")**

| Category | Component | Hex Color | Tailwind Name |
| :---- | :---- | :---- | :---- |
| **Case** | Main Body | \#0F172A | bg-piano-bg (Slate 900\) |
|  | Lit Surfaces | \#1F2937 | bg-piano-black-surface |
|  | Dark Faces | \#111827 | bg-piano-black-face |
|  | Felt | \#9F1239 | bg-piano-felt |
| **White Keys** | Surface | \#E2E4E9 | bg-piano-white-surface |
|  | Pressed | \#D1D5DB | bg-piano-white-pressed |
|  | Separator | \#9CA3AF | shadow-piano-white-shadow |
| **Black Keys** | Surface | \#1F2937 | bg-piano-black-surface |
|  | Front Face | \#111827 | border-piano-black-face |
|  | Pressed | \#000000 |  |
| **Waterfall** | Notes | \#38BDF8 | bg-piano-accent (Sky 400\) |
|  | Border | \#0EA5E9 | border-piano-accent-dim |

## **7\. React Assembly Structure**

\<PianoCase className="flex flex-col items-center bg-piano-bg"\>

  {/\* 1\. TOP: Nameboard & Logo \*/}  
  \<div className="w-full h-32 bg-piano-bg border-b-4 border-black relative"\>  
    {/\* Logo centered here \*/}  
  \</div\>

  {/\* 2\. MIDDLE: The Action Area \*/}  
  {/\* z-10 ensures keys float ABOVE the Key Slip below \*/}  
  \<div className="relative z-10 flex flex-row shadow-2xl"\>  
      
    {/\* Left Cheek Block \*/}  
    \<div className="w-\[36px\] h-\[150px\] bg-piano-black-surface border-b-\[12px\] border-piano-black-face box-border" /\>

    {/\* The Keyboard Container \*/}  
    \<div className="relative"\>  
      \<div className="w-full h-2 bg-piano-felt absolute \-top-2 left-0 right-0" /\> {/\* Felt \*/}  
      \<div className="w-full h-4 bg-black absolute top-0 left-0 right-0 \-z-10" /\> {/\* Cavity \*/}  
      \<Keyboard /\>  
    \</div\>

    {/\* Right Cheek Block \*/}  
    \<div className="w-\[36px\] h-\[150px\] bg-piano-black-surface border-b-\[12px\] border-piano-black-face box-border" /\>

  \</div\>

  {/\* 3\. BOTTOM: Key Slip \*/}  
  {/\* \-mt-1 creates the overlap where Keys overhang the Slip \*/}  
  \<div className="w-full h-12 bg-piano-black-face border-t border-piano-black-accent z-0 \-mt-1 relative" /\>

\</PianoCase\>  
