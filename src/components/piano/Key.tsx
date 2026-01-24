
import { twMerge } from "tailwind-merge";

interface KeyProps {
    note: string;
    isBlack: boolean;
    isActive: boolean;
    isLeftNeighborActive?: boolean;
    isRightNeighborActive?: boolean;
    // Black Neighbor States
    leftBlackNeighborState?: 'none' | 'idle' | 'active';
    rightBlackNeighborState?: 'none' | 'idle' | 'active';
    // Precise Cut Geometry (Pixels)
    cutLeft?: number;
    cutRight?: number;
    label?: string;
    activeColor?: string;
    style?: React.CSSProperties;
}

export function Key({ note, isBlack, isActive, isLeftNeighborActive, isRightNeighborActive, leftBlackNeighborState, rightBlackNeighborState, cutLeft = 0, cutRight = 0, label, activeColor, style }: KeyProps) {

    // Helper to generate dynamic shadow (Box Shadow: Full Height)
    const getBoxShadow = () => {
        // Base Shadow for Idle Black Keys (restored)
        if (isBlack) return "inset 0 2px 4px rgba(0,0,0,0.5)";

        // White Keys: Conditional shadows based on neighbors
        // Note: Static separator is now handled by border-right.
        const shadows = [];

        // --- White Key Separators (Dynamic Depth) ---

        // LEFT SIDE
        if (isActive && !isLeftNeighborActive) {
            // We are down, neighbor is up => Strong shadow on our left wall
            shadows.push("inset 4px 0 4px -2px rgba(0,0,0,0.4)");
        } else if (isActive && isLeftNeighborActive) {
            // Both down => Fine separator
            shadows.push("inset 1px 0 0 0 rgba(0,0,0,0.3)");
        }

        // RIGHT SIDE
        if (isActive && !isRightNeighborActive) {
             shadows.push("inset -4px 0 4px -2px rgba(0,0,0,0.4)");
        }
        
        // NOTE: Black Key Casting Shadows moved to `backgroundImage` to control height.

        return shadows.length > 0 ? shadows.join(", ") : "none";
    };

    // Helper to generate gradient shadows (Background Image: Partial Height)
    const getShadowGradient = () => {
        if (isBlack || isActive) return "none"; // Only idle white keys receive these shadows

        const gradients = [];
        const shadowH = "96px"; // Matches Black Key Height

        // LEFT Neighbor Shadow (Gradient L->R)
        if (leftBlackNeighborState === 'idle') {
            gradients.push(`linear-gradient(to right, rgba(0,0,0,0.3) 0px, transparent 4px)`);
        } else if (leftBlackNeighborState === 'active') {
             gradients.push(`linear-gradient(to right, rgba(0,0,0,0.2) 0px, transparent 2px)`);
        }

        // RIGHT Neighbor Shadow (Gradient R->L)
        if (rightBlackNeighborState === 'idle') {
             gradients.push(`linear-gradient(to left, rgba(0,0,0,0.3) 0px, transparent 4px)`);
        } else if (rightBlackNeighborState === 'active') {
             gradients.push(`linear-gradient(to left, rgba(0,0,0,0.2) 0px, transparent 2px)`);
        }

        return gradients.length > 0 ? gradients.join(", ") : "none";
    };

    const getBackgroundSize = () => {
        if (isBlack || isActive) return undefined;
        // We want the gradients to be 100% width but only 96px height
        // If we have multiple gradients, we need multiple sizes?
        // Actually, since they are L->R and R->L, they can overlap.
        // We can set one common size if they are same height.
        return `100% 96px`; 
    };

    const getBackgroundRepeat = () => {
         return "no-repeat";
    };

    // Precise Geometry Masking with Chamfer (Rounding)
    const getClipPath = () => {
        if (isBlack || (cutLeft === 0 && cutRight === 0)) return undefined;

        const cutH = "100px";

        const x1 = cutLeft;
        const cutRightPx = cutRight;

        // Chamfer Radius
        const r = 2;

        let path = "";

        // LEFT CUT Handling
        if (x1 > 0) {
            path += `${x1 + r}px 0, `;
        } else {
            path += `0 0, `;
        }

        // RIGHT CUT Handling
        if (cutRight > 0) {
            path += `calc(100% - ${cutRight + r}px) 0, `;
            path += `calc(100% - ${cutRight}px) ${r}px, `;
            path += `calc(100% - ${cutRight}px) ${cutH}, `;
        } else {
            path += `100% 0, 100% ${cutH}, `;
        }

        // Bottom Area
        path += `100% ${cutH}, 100% 100%, 0 100%, 0 ${cutH}, `;

        // Finish Left Cut Logic
        if (x1 > 0) {
            path += `${x1}px ${cutH}, `;
            path += `${x1}px ${r}px, `;
        } else {
            path += `0 ${cutH}, `;
        }

        return `polygon(${path.replace(/, $/, "")})`;
    };

    return (
        <div
            data-note={note}
            className={twMerge(
                "absolute top-0 select-none overflow-hidden box-border",
                "transition-all duration-75 ease-press",
                !isActive && "duration-150 ease-release"
            )}
            style={{
                ...style,
                // Animation Logic (Refined: -1px Travel)
                transform: isActive
                    ? (isBlack ? "translateY(1px)" : "translateY(-1px)")
                    : "translateY(0)",

                // Colors
                backgroundColor: isActive && activeColor
                    ? activeColor
                    : (isBlack ? "var(--color-piano-black-surface)" : "var(--color-piano-white-surface)"),

                // Border Color
                borderColor: isBlack && isActive && activeColor
                    ? `color-mix(in srgb, ${activeColor}, black 20%)`
                    : (isBlack ? "var(--color-piano-black-face)" : "transparent"),

                // Borders
                borderBottomWidth: isBlack ? (isActive ? "2px" : "12px") : "0px",
                borderBottomStyle: isBlack ? "solid" : "none",
                
                // Explicit Separator for White Keys
                borderRightWidth: isBlack ? "0px" : "1px",
                borderRightStyle: isBlack ? "none" : "solid",
                borderRightColor: "var(--color-piano-white-shadow)",

                boxShadow: getBoxShadow(),
                backgroundImage: getShadowGradient(),
                backgroundSize: getBackgroundSize(),
                backgroundRepeat: getBackgroundRepeat(),
                clipPath: getClipPath(),
            }}
        >
            {/* Note Label */}
            {!isBlack && label && (
                <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none z-10">
                    <span className="text-[10px] font-sans text-gray-600 font-bold opacity-75 block">{label}</span>
                </div>
            )}

            {/* Black Key Highlight */}
            {isBlack && (
                <div
                    className="absolute top-0 left-0 w-full pointer-events-none"
                    style={{
                        height: "1px",
                        backgroundColor: "rgba(255,255,255,0.1)"
                    }}
                />
            )}
        </div>
    );
}
