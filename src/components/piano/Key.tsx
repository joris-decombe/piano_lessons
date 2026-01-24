
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

    // --- GEOMETRY & PHYSICS ---
    // Physical dip (-1px North for white, +1px South for black)
    const transform = isActive 
        ? (isBlack ? "translateY(1px)" : "translateY(-1px)") 
        : "translateY(0)";

    const whiteFaceHeight = "100%";
    const blackTopHeight = isActive ? "calc(100% - 2px)" : "calc(100% - 10px)";
    
    // --- SHADOWS (Hard Pixel Art) ---

    // White Key Internal Depth (Cast by neighbors)
    const getInternalShadows = () => {
        if (isBlack || !isActive) return "none";
        const shadows = [];
        if (!isLeftNeighborActive) shadows.push("inset 2px 0 0 0 var(--color-pal-6)");
        if (!isRightNeighborActive) shadows.push("inset -2px 0 0 0 var(--color-pal-6)");
        return shadows.length > 0 ? shadows.join(", ") : "none";
    };

    // Black Key AO (Ambient Occlusion) on White Keys
    const getAOOverlay = () => {
        if (isBlack || isActive) return null;
        const bands = [];
        if (leftBlackNeighborState === 'idle') {
            bands.push(<div key="l-ao" className="absolute top-0 left-0 w-[2px] h-[96px] bg-[var(--color-pal-6)] opacity-60 pointer-events-none z-[5]" />);
        } else if (leftBlackNeighborState === 'active') {
            bands.push(<div key="l-ao-a" className="absolute top-0 left-0 w-[1px] h-[96px] bg-[var(--color-pal-6)] opacity-60 pointer-events-none z-[5]" />);
        }
        if (rightBlackNeighborState === 'idle') {
             bands.push(<div key="r-ao" className="absolute top-0 right-0 w-[2px] h-[96px] bg-[var(--color-pal-6)] opacity-60 pointer-events-none z-[5]" />);
        } else if (rightBlackNeighborState === 'active') {
             bands.push(<div key="r-ao-a" className="absolute top-0 right-0 w-[1px] h-[96px] bg-[var(--color-pal-6)] opacity-60 pointer-events-none z-[5]" />);
        }
        return bands;
    };

    const getClipPath = () => {
        if (isBlack || (cutLeft === 0 && cutRight === 0)) return undefined;
        const cutH = "96px"; 
        return `polygon(${cutLeft}px 0, ${cutLeft}px ${cutH}, 0 ${cutH}, 0 100%, 100% 100%, 100% ${cutH}, calc(100% - ${cutRight}px) ${cutH}, calc(100% - ${cutRight}px) 0)`;
    };
    
    if (isBlack) {
        return (
            <div
                data-note={note}
                className="absolute top-0 select-none"
                style={{ ...style, zIndex: 25, transform }}
            >
                {/* 1. The Bed/Front Face (Dark Base) */}
                <div className="absolute inset-0 bg-[var(--color-pal-2)] rounded-sm" />
                
                {/* 2. The Top Face */}
                <div 
                    className={twMerge(
                        "absolute top-0 left-0 w-full transition-all duration-75 ease-pixel bg-[var(--color-pal-3)]",
                    )}
                    style={{ height: blackTopHeight }}
                >
                     {/* Active Color Overlay */}
                     {isActive && activeColor && (
                         <div className="absolute inset-0 opacity-60" style={{ backgroundColor: activeColor }} />
                     )}
                     <div className="absolute top-0 left-0 w-full h-[1px] bg-[rgba(255,255,255,0.1)]" />
                </div>
            </div>
        );
    }

    return (
        <div
            data-note={note}
            className="absolute top-0 select-none"
            style={{
                ...style,
                zIndex: 20,
                backgroundColor: "var(--color-pal-0)", 
                transform
            }}
        >
            {/* The Face */}
            <div 
                className={twMerge(
                    "absolute top-0 left-0 w-full transition-all duration-75 ease-pixel bg-[var(--color-piano-white-surface)]",
                )}
                style={{
                    height: whiteFaceHeight,
                    clipPath: getClipPath(),
                    boxShadow: getInternalShadows(), 
                    borderRight: "1px solid var(--color-pal-6)",
                }}
            >
                 {/* Active Color Overlay */}
                 {isActive && activeColor && (
                     <div className="absolute inset-0 opacity-40 z-[1]" style={{ backgroundColor: activeColor }} />
                 )}

                 {label && (
                    <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none z-10">
                        <span className="text-[10px] font-sans text-[var(--color-pal-4)] font-bold opacity-100 block">{label}</span>
                    </div>
                 )}
                 {getAOOverlay()}
            </div>
        </div>
    );
}
