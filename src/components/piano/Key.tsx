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
                "relative flex items-end justify-center rounded-b-md transition-all duration-100 ease-out border-black/10 border",
                isBlack
                    ? "z-10 -mx-[0.625%] h-[60%] w-[1.25%] bg-black text-white shadow-lg"
                    : "z-0 h-full flex-1 bg-white text-gray-500 shadow-sm",
                isActive && isBlack && !activeColor && "bg-slate-800 scale-[0.99] !shadow-none",
                isActive && !isBlack && !activeColor && "bg-slate-200 scale-[0.99]",
                // Preview State (Hollow)
                isPreview && !isActive && !isBlack && "bg-indigo-50",
                isPreview && !isActive && isBlack && "bg-zinc-800",
                "select-none"
            )}
            style={{
                backgroundColor: isActive && activeColor ? activeColor : undefined,
                transform: isActive ? "scale(0.99)" : undefined,
                boxShadow: isActive
                    ? `0 0 20px ${activeColor || glowColor}, 0 0 10px ${activeColor || glowColor} inset`
                    : isPreview
                        ? `0 0 0 2px ${activeColor || glowColor}, inset 0 0 15px ${activeColor || glowColor}40` // Use spread shadow to simulate border without layout shift
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
