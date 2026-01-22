import { twMerge } from "tailwind-merge";

interface KeyProps {
    note: string;
    isBlack: boolean;
    isActive: boolean;
    label?: string;
    isPreview?: boolean;
    activeColor?: string; // Restored
    style?: React.CSSProperties; // Allow passing left/width/height/zIndex
}

export function Key({ note, isBlack, isActive, label, isPreview, activeColor, style }: KeyProps) {
    return (
        <div
            data-note={note}
            className={twMerge(
                "absolute top-0 select-none overflow-hidden", // Absolute positioning is key now
                "transition-transform duration-75 ease-piano-press", // Fast attack
                !isActive && "duration-150 ease-piano-release" // Bouncy release
            )}
            style={{
                ...style,
                transform: isActive ? "translateY(var(--spacing-key-dip))" : "translateY(0)",
                backgroundColor: isBlack ? "var(--color-piano-black-surface)" : "var(--color-piano-white-surface)",
                boxShadow: isBlack
                    ? (isActive ? "var(--shadow-pixel-black-pressed)" : "var(--shadow-pixel-black)")
                    : "var(--shadow-pixel-white)",
                // Black keys are shorter (96px), White keys full height (150px) - handled by props or default classes?
                // We'll let the parent pass exact pixel dimensions in 'style', but we can set defaults/classes here if needed.
                // Actually, let's enforce color changes on active here.
            }}
        >
            {/* Active State Color Overlay - Semi-transparent to show key shape */}
            <div
                className={twMerge(
                    "absolute inset-0 pointer-events-none transition-opacity duration-75",
                    isActive ? "opacity-60" : "opacity-0"
                )}
                style={{
                    backgroundColor: activeColor || (isBlack ? "var(--color-piano-black-active)" : "var(--color-piano-white-active)")
                }}
            />

            {/* Note Label (White Keys only) */}
            {!isBlack && label && (
                <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
                    <span className="text-[10px] font-sans text-stone-500 font-bold opacity-50 block">{label}</span>
                </div>
            )}

            {/* 3D "Lip" / Highlight (White Keys) */}
            {!isBlack && (
                <div
                    className="absolute bottom-0 left-0 w-full pointer-events-none"
                    style={{
                        height: "12px",
                        backgroundColor: "var(--color-piano-white-lip)"
                    }}
                />
            )}

            {/* Black Key Highlight (Top Edge) */}
            {isBlack && (
                <div
                    className="absolute top-0 left-0 w-full pointer-events-none"
                    style={{
                        height: "4px", // Subtle top highlight
                        backgroundColor: "var(--color-piano-black-highlight)"
                    }}
                />
            )}

            {/* Black Key 3D Face (Bottom) - Rendered via shadows or extra div? 
                 Globals has --color-piano-black-face.
                 The main div bg is 'surface'. 
                 The 'boxShadow' handles the Z-depth for black keys.
             */}
        </div>
    );
}
