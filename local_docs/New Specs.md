# **Pixel Piano: Technical Specifications**

**Reference:** Adapted from GRAND\_PIANO.md  
**Scale:** \~1mm \= 1 Logical Pixel  
**Grid Basis:** 24px Column

## **1\. Key Dimensions (Logical Pixels)**

To ensure pixel-perfect rendering, all physical millimeter measurements have been quantized to integers.

### **White Keys**

| Dimension | Value | Notes |
| :---- | :---- | :---- |
| **Width** | **24px** | *Was 23.6mm.* Base unit of the grid. |
| **Total Height** | **150px** | *Was 150mm.* |
| **Front "Lip"** | **12px** | Height of the front vertical face highlight. |
| **Travel (Dip)** | **6px** | *Was 10mm.* Visual movement distance. |
| **Gap** | **0px** | Visual gaps are handled via inset shadows (1px). |

### **Black Keys**

| Dimension | Value | Notes |
| :---- | :---- | :---- |
| **Width** | **14px** | *Was 13.7mm.* |
| **Height** | **96px** | *Was 95mm.* |
| **Z-Height** | **12px** | Visual "thickness" (border-bottom thickness). |
| **Travel (Dip)** | **6px** | Moves same distance as white keys. |

## **2\. The Octave Layout (Look-Up Table)**

**Crucial:** Do not calculate positions with percentages. Use these exact pixel coordinates relative to the start of the octave (0px).  
**Octave Total Width:** 168px (7 keys \* 24px)

| Key Name | Type | X Position (Left) | Width | Z-Index | Note on Placement |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **C** | White | 0px | 24px | 0 |  |
| **C\#** | Black | **15px** | 14px | 10 | Left-biased (Gap is at 24px) |
| **D** | White | 24px | 24px | 0 |  |
| **D\#** | Black | **43px** | 14px | 10 | Right-biased (Gap is at 48px) |
| **E** | White | 48px | 24px | 0 |  |
| **F** | White | 72px | 24px | 0 |  |
| **F\#** | Black | **85px** | 14px | 10 | Strong Left-biased (Gap at 96px) |
| **G** | White | 96px | 24px | 0 |  |
| **G\#** | Black | **113px** | 14px | 10 | Centered (Gap at 120px) |
| **A** | White | 120px | 24px | 0 |  |
| **A\#** | Black | **141px** | 14px | 10 | Right-biased (Gap at 144px) |
| **B** | White | 144px | 24px | 0 |  |

## **3\. Color Palette (Theme: "Satie's Rain")**

A sophisticated, low-contrast palette suitable for long practice sessions.

### **White Key Sprites**

* **Surface (Idle):** \#E2E4E9 (Cool Grey)  
* **Highlight (Lip):** \#FFFFFF (Pure White)  
* **Shadow (Side):** \#9CA3AF (Inset border)  
* **Surface (Active):** \#D1D5DB (Darker Grey)  
* **Active Accent:** \#60A5FA (Soft Blue tint 20%)

### **Black Key Sprites**

* **Surface (Idle):** \#1F2937 (Charcoal)  
* **Highlight (Top):** \#374151 (Lighter Charcoal edge)  
* **3D Face (Bottom):** \#111827 (Deep Black/Blue)  
* **Surface (Active):** \#000000

### **Background / Waterfall**

* **BG:** \#0F172A (Slate 900\)  
* **Grid Lines:** \#1E293B (Slate 800\)  
* **Falling Notes:** \#38BDF8 (Sky Blue) with \#0EA5E9 outline.

## **4\. Animation Physics (CSS)**

### **Key Press (The "Thud")**

* **Transition:** transform  
* **Duration:** 75ms  
* **Timing:** cubic-bezier(0, 0, 0.2, 1\) (Immediate out)  
* **State Change:**  
  * Idle: translate-y-0  
  * Active: translate-y-\[6px\] (Moves down)  
  * *Black Key Detail:* When active, reduce border-bottom-width from 12px to 6px to simulate sinking into the keybed.

### **Falling Notes (The "Flow")**

* **Speed:** Variable (User controlled)  
* **Rendering:** Canvas requestAnimationFrame  
* **Motion:** Linear interpolation (Time-based, not Frame-based) to ensure synchronization with audio.