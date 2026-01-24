# **Pixel Piano: Player's Perspective Specifications**

**Version:** 3.1 (Fixed Tables)  
**Reference:** Based on Master Specs v2.8  
**Perspective:** The user is looking directly down at the keyboard (Orthographic Top-Down).  
**North:** Towards the Nameboard/Logo.  
**South:** Towards the Player/Stomach.

## **1\. The "Container" Concept (Static Frame)**

From the player's point of view, the piano is a rigid furniture frame that "cups" or contains the moving keys. The keys should never extend beyond this frame.

### **The Frame Components**

1. **Side Arms (Cheek Blocks):**  
   * **Visual:** The robust wooden blocks on the far Left and Right.  
   * **Length:** **154px** (Matches the static frame depth).  
   * **Alignment:** \* **South:** Aligns perfectly with the **Key Slip**.  
     * **North:** Aligns perfectly with the **Nameboard**.  
   * **Z-Level:** High (Flush with the top of unpressed white keys).  
2. **Front Rail (Key Slip):**  
   * **Visual:** The strip running along the bottom edge, connecting the two Cheek Blocks.  
   * **Alignment:** Its South edge aligns perfectly with the Cheek Blocks (154px).  
   * **Visibility:** Because it is "longer" than the keys (see below), a distinct strip of the Key Slip is **always visible** sticking out from under the keys.  
   * **Z-Level:** Low (The keys float above it).  
3. **Back Rail (Nameboard):**  
   * **Visual:** The dark vertical board at the North end.  
      * **Material:** Slightly glossy/reflective.
      * **Reflection:** Subtle vertical banding (`bg-piano-reflection`) running North-South to mimic overhead studio lighting on a lacquered surface.
      * **Interaction:** Touches the top of the Cheek Blocks.
## **2\. The Keyboard (Dynamic Elements)**

The keys sit *inside* the frame described above.

### **White Keys**

* **Visual:** The main playing surface.  
* **Length:** **150px**.  
* **The "Gap":** Since the Frame is 154px and Keys are 150px, there is a **4px visible band** of the Key Slip (Front Rail) exposed at the bottom. The keys do not hang over the edge of the furniture; they are contained within it.  
* **Geometry:** Strict rectangles with specific cutouts (see "Key Pockets" below).
* **Key Lip:** The vertical South face of the white key. In this 2D view, it corresponds to the bottom edge that overhangs the Key Slip.

### **Black Keys**

* **Visual:** Floating islands sitting in the "wells" between white keys.  
* **Length:** **96px** (Top Surface).  
* **Placement:** They define the "North" half of the keyboard.

## **3\. Interaction Physics (The Pivot)**

This is the most critical visual update. We simulate the mechanics of a fulcrum located deep inside the piano (North).

### **White Key Animation: "The Northward Recess"**

When the player presses a white key, the front of the key pivots downward and slightly *away* from them.

* **Action:** The key moves **North** (Up on screen) and gets darker.  
* **Translation:** translateY(-2px) (Negative Y is North).  
* **Color Shift:** Change from \#E2E4E9 (Lit) to \#D1D5DB (Shadowed).  
* **Visual Result:**  
  * The "Lip" of the key retreats away from the player.  
  * This exposes **more** of the Key Slip/Frame underneath (widening the visible gap from 4px to 6px).  
  * This creates a realistic "teeter-totter" feeling rather than a sliding drawer feeling.

**Realism Assessment:**
*   **The Cheat:** In a true top-down view, a dipping key would just get slightly smaller or darker. Moving it "Up/North" is a visual trick to simulate the key tilting *away* from the player's eye-line.
*   **The Feeling:** Highly effective for a 2D interface. It breaks the "sliding button" trope. By exposing the static frame underneath, it anchors the piano as a heavy object while the key feels like a mechanical lever.

### **Black Key Animation: "The Deep Sink"**

The black keys do not just move down; they sink into a hole.

* **Action:** The 3D front face collapses as the key submerges into the Key Pocket.  
* **Animation:**  
  * border-bottom-width transitions from **12px** (Idle) to **0px** (Pressed).  
  * transform transitions translateY(2px) (South) to compensate for the border shrinking, keeping the top surface visually centered in the pocket.  
* **Visual Result:** The key looks like it is being swallowed by the white keys.

**Realism Assessment:**
*   **The Cheat:** Real black keys don't lose their front face. However, in "2.5D" projection, removing the bottom border is the only way to convey "depth = 0".
*   **The Feeling:** This provides the "weight" of the aesthetic. It feels tactile, like pushing a button flush with a console. The "Void" (black pocket) is critical—without it, the key looks like it vanished; with it, it looks *swallowed*.

## **4\. The "Key Pocket" Geometry (The Curving)**

For the black keys to look like they belong, the white keys must be shaped to accommodate them. We do not use simple rectangles for the white keys.  
**The 3-Shape Rule (Masking):**  
From the Top-Down view, the white keys have "bites" taken out of them to form the wells for the black keys.

1. **Type C & F (Left-Straight):**  
   * Full width at bottom (South).  
   * **Notch** on the Top-Right (North-East) corner.  
2. **Type D, G, A (Both-Cut):**  
   * Full width at bottom (South).  
   * **Notches** on *both* Top-Left and Top-Right corners.  
   * *Result:* This key looks like a "T" shape.  
3. **Type E & B (Right-Straight):**  
   * Full width at bottom (South).  
   * **Notch** on the Top-Left (North-West) corner.

**Implementation Note:**

* **The Void:** The pocket background is pure black (`#000000`/`bg-piano-black-void`).
* **Clearance (Margins):** The well must be slightly wider than the black key to prevent visual "jamming".
  * *Recommended Clearance:* 1px on Left/Right/North.
  * *Black Key Width:* 14px.
  * *Well Width:* ~16px.
* **Shadows:** The well itself casts no shadow; it *receives* the black key.
* When a black key sinks, it sinks into this specific dark void.

## **5\. Technical Dimensions Reference (Player View)**

All coordinates are relative to the top-left of the octave container.

| Element | Width | Height (N-S Length) | Z-Index |
| :---- | :---- | :---- | :---- |
| **Nameboard** | Full | Varied | 40 (Top) |
| **Felt** | Full | 2px | 35 |
| **Black Key** | 14px | **108px** (Visual Total) | 30 |
| **Cheek Block** | 36px | **154px** (Longest) | 20 |
| **White Key** | 24px | **150px** (Recessed) | 10 |
| **Cavity (Well)** | Varied | Matches Pocket | 5 |
| **Key Slip** | Full | **24px** (Vertical Face) | 0 (Bottom) |

* **Key Slip Offset:** The Key Slip is positioned such that its bottom edge aligns with the bottom edge of the Cheek Blocks.  
* **White Key Offset:** The White Keys stop **4px North** of the Cheek Block's bottom edge.

## **6\. Color Palette (Player POV)**

| Component | Color Code | Role |
| :---- | :---- | :---- |
| **Frame (Blocks/Slip)** | \#111827 (Gray 900\) | The static container. Dark and heavy. |
| **Key Pocket (Void)** | \#000000 (Pure Black) | The empty space between white keys where black keys sit. |
| **White Key (Lit)** | \#E2E4E9 (Cool Gray) | The main surface catching overhead light. |
| **White Key (Shadow)** | \#9CA3AF (Gray 400\) | The pressed state (in shadow). |
| **Black Key (Top)** | \#1F2937 (Gray 800\) | Matte surface. |
| **Reflections** | white @ 10% Opacity | Subtle vertical banding on the Nameboard. |

