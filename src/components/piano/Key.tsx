
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

    // Helper to generate dynamic shadow
    const getBoxShadow = () => {
        if (!isActive) return !isBlack ? "var(--shadow-key-separator)" : "none";

        if (isBlack) return "inset 0 2px 4px rgba(0,0,0,0.5)";

        // White Keys: Conditional shadows based on neighbors
        const shadows = [];

        // --- White Key Separators ---

        // LEFT SIDE
        if (!isLeftNeighborActive) {
            // Neighbor is Higher: Casts strong shadow on us (Side Wall)
            shadows.push("inset 4px 0 4px -2px rgba(0,0,0,0.4)");
        } else {
            // Neighbor is Equal (Both Down): Show 1px separator line here.
            // Using slightly darker/sharper opacity to ensure it looks like a separator line
            shadows.push("inset 1px 0 0 0 rgba(0,0,0,0.3)");
        }

        // RIGHT SIDE
        if (!isRightNeighborActive) {
            // Neighbor is Higher: Casts strong shadow on us
            shadows.push("inset -4px 0 4px -2px rgba(0,0,0,0.4)");
        } else {
            // Neighbor is Equal: DO NOT draw separator.
            // We rely on the Right Neighbor's Left-Edge separator.
        }

        // --- Black Key Casting Shadows ---
        // Only render black key shadows on IDLE keys. 
        // If key is Active (Pressed), we remove the shadow to keep the "clean" look user requested.
        if (!isActive) {
            if (leftBlackNeighborState === 'idle') {
                shadows.push("inset 6px 0 8px -2px rgba(0,0,0,0.6)");
            } else if (leftBlackNeighborState === 'active') {
                shadows.push("inset 3px 0 4px -2px rgba(0,0,0,0.4)");
            }

            if (rightBlackNeighborState === 'idle') {
                shadows.push("inset -6px 0 8px -2px rgba(0,0,0,0.6)");
            } else if (rightBlackNeighborState === 'active') {
                shadows.push("inset -3px 0 4px -2px rgba(0,0,0,0.4)");
            }
        }

        return shadows.join(", ");
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

                boxShadow: getBoxShadow(),
                clipPath: getClipPath(),
            }}
        >
            {/* Note Label */}
            {!isBlack && label && (
                <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
                    <span className="text-[10px] font-sans text-[var(--color-piano-white-shadow)] font-bold opacity-50 block">{label}</span>
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
