import { twMerge } from "tailwind-merge";
import { useSpring, animated } from "@react-spring/web";

interface KeyProps {
    note: string; // e.g. "C4", "Db4"
    isBlack: boolean;
    isActive: boolean;
    label?: string; // e.g. "C"
    isPreview?: boolean;
    left: number; // Position as percentage
    width: number; // Width as percentage
}

export function Key({ note, isBlack, isActive, activeColor, label, isPreview, left, width }: KeyProps & { activeColor?: string }) {
    // Determine beam color (default to cyan/rose if not provided, or gold fallback)
    // Actually activeColor is passed from page.tsx (Cyan/Rose).
    const glowColor = activeColor || (isBlack ? "#fbbf24" : "#38bdf8"); // Fallback Gold/Sky

    // Spring physics for key press
    const animation = useSpring({
        transform: isActive
            ? "scaleY(0.96) translateY(4px) rotateX(-2deg)"
            : "scaleY(1) translateY(0px) rotateX(0deg)",
        config: {
            mass: 1.2,
            tension: 280,
            friction: 20,
        }
    });

    return (
        <animated.div
            data-note={note}
            className={twMerge(
                "absolute flex items-end justify-center origin-top will-change-transform",
                isBlack
                    ? "h-[63%]" // Black keys: 63% height (95mm vs 150mm)
                    : "h-full border-r border-gray-400/30 border-l-[0.5px] border-l-[#d4a574]/40", // White keys: subtle separation + wood sides
                isActive && "brightness-90",
                isPreview && "",
                "select-none"
            )}
            style={{
                left: `${left}%`,
                width: `${width}%`,
                transform: animation.transform,
                // Black key styling - Dark grey (not pure black) with reflection gradient
                background: isBlack
                    ? (isActive && activeColor
                        ? activeColor
                        : 'linear-gradient(to bottom, #333 0%, #1A1A1A 15%, #0a0a0a 100%)')
                    : (isActive && activeColor
                        ? activeColor
                        : // Warm ivory with occlusion gradient (darker at top, brighter at bottom)
                        'linear-gradient(to bottom, #f5f3f0 0%, #FDFDF5 30%, #FDFDF5 70%, #ffffff 100%)'),
                boxShadow: isBlack
                    ? (isActive
                        ? `0 0 20px ${activeColor || glowColor}, 0 0 10px ${activeColor || glowColor} inset, 4px 8px 12px rgba(0,0,0,0.6), inset 1px 0 1px rgba(255,255,255,0.15), inset -1px 0 1px rgba(255,255,255,0.15)`
                        : // Strong, sharp shadow for black keys (faux-3D depth)
                        '4px 8px 12px rgba(0,0,0,0.6), inset 1px 0 1px rgba(255,255,255,0.15), inset -1px 0 1px rgba(255,255,255,0.15)')
                    : (isActive
                        ? `0 0 20px ${activeColor || glowColor}, 0 0 10px ${activeColor || glowColor} inset, 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1.0)`
                        : // Subtle shadow for white keys
                        '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1.0), inset 0 -2px 3px rgba(0,0,0,0.08)'),
                // More aggressive taper for 10mm top (corrected from 12mm)
                clipPath: isBlack && !isActive
                    ? 'polygon(13% 0%, 87% 0%, 100% 100%, 0% 100%)'
                    : undefined,
                // Per GRAND_PIANO.md: Black keys 1px 1px 0 0, White keys 0 0 2px 2px
                borderRadius: isBlack ? '1px 1px 0 0' : '0 0 2px 2px',
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
        </animated.div>
    );
}
