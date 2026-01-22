import { twMerge } from "tailwind-merge";

interface KeyProps {
    note: string; // e.g. "C4", "Db4"
    isBlack: boolean;
    isActive: boolean;
    label?: string; // e.g. "C"
    isPreview?: boolean;
}

export function Key({ note, isBlack, isActive, activeColor, label, isPreview }: KeyProps & { activeColor?: string }) {
    // Determine beam color (default to cyan/rose if not provided, or gold fallback)
    // Actually activeColor is passed from page.tsx (Cyan/Rose).
    const glowColor = activeColor || (isBlack ? "#fbbf24" : "#38bdf8"); // Fallback Gold/Sky

    return (
        <div
            data-note={note}
            className={twMerge(
                "relative flex items-end justify-center rounded-b-lg transition-all duration-200 ease-in-out origin-top will-change-transform",
                isBlack
                    ? "z-10 -mx-[0.625%] h-[60%] w-[1.25%] bg-black text-white shadow-[0_6px_12px_rgba(0,0,0,0.4),inset_0_-1px_3px_rgba(255,255,255,0.15)]"
                    : "z-0 h-full flex-1 bg-white text-gray-500 shadow-[0_4px_6px_rgba(0,0,0,0.12)] border-r border-black/10",
                isActive && isBlack && !activeColor && "bg-slate-800 scale-y-[0.98] brightness-95 shadow-[0_4px_8px_rgba(0,0,0,0.35)]",
                isActive && !isBlack && !activeColor && "bg-slate-200 scale-y-[0.98] brightness-95 shadow-[0_2px_4px_rgba(0,0,0,0.15)]",
                isActive && "scale-y-[0.98] brightness-95", // Ensure custom colored active keys also get press effect
                isPreview && "", // Preview keys don't need special border handling anymore
                "select-none"
            )}
            style={{
                backgroundColor: isActive && activeColor ? activeColor : undefined,
                transform: isActive ? "scaleY(0.98) translateY(1px)" : undefined,
                boxShadow: isActive
                    ? `0 0 20px ${activeColor || glowColor}, 0 0 10px ${activeColor || glowColor} inset`
                    : undefined,
                borderColor: undefined, // Remove border color
                borderWidth: undefined, // Remove border width
                // Z-Index Layering:
                // Black Active: 40
                // Black Inactive: 30
                // White Active: 20
                // White Inactive: 0
                // This ensures Black Keys are ALWAYS above White Keys.
                zIndex: isBlack ? (isActive ? 40 : 30) : (isActive ? 20 : 0)
            }}
        >
            {/* Preview Overlay (Top Half Only) */}
            {isPreview && (
                <div
                    className="absolute top-0 left-0 w-full h-[50%] pointer-events-none rounded-t-[1px]"
                    style={{
                        background: `linear-gradient(to bottom, ${activeColor || glowColor}80, transparent)`,
                    }}
                />
            )}

            {/* Laser Beam Effect */}
            {isActive && (
                <div
                    className="absolute bottom-full left-0 w-full pointer-events-none"
                    style={{
                        height: "200px", // Shorter beam
                        background: `linear-gradient(to top, ${activeColor || glowColor}33, transparent)`, // Lower opacity (0.2)
                        filter: "blur(8px)", // Soften edges
                        zIndex: -1
                    }}
                />
            )}
            {!isBlack && label && <span className="mb-2 text-xs font-semibold opacity-50">{label}</span>}
        </div>
    );
}
