
import { memo } from "react";
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

export const Key = memo(function Key({ note, isBlack, isActive, isLeftNeighborActive, isRightNeighborActive, leftBlackNeighborState, rightBlackNeighborState, cutLeft = 0, cutRight = 0, label, activeColor, style }: KeyProps) {

    // --- GEOMETRY & PHYSICS ---
    // Physical dip (-1px North for white, +1px South for black)
    const transform = isActive 
        ? (isBlack ? "translateY(1px)" : "translateY(-1px)") 
        : "translateY(0)";

    const blackTopHeight = isActive ? "calc(100% - 2px)" : "calc(100% - 10px)";
    
    // --- SHADOWS (Hard Pixel Art) ---

    // White Key Internal Depth (Cast by neighbors)
    const getInternalShadows = () => {
        if (isBlack || !isActive) return "none";
        const shadows = [];
        if (!isLeftNeighborActive) shadows.push("var(--shadow-key-left)");
        if (!isRightNeighborActive) shadows.push("var(--shadow-key-right)");
        return shadows.length > 0 ? shadows.join(", ") : "none";
    };

    // Black Key AO (Ambient Occlusion) on White Keys
    const getAOOverlay = () => {
        if (isBlack || isActive) return null;
        const bands = [];
        const aoStyle = { height: 'var(--spacing-black-h)' };
        if (leftBlackNeighborState === 'idle') {
            bands.push(<div key="l-ao" className="absolute top-0 left-0 w-[2px] bg-[var(--color-key-white-lo)] opacity-80 pointer-events-none z-[5]" style={aoStyle} />);
        } else if (leftBlackNeighborState === 'active') {
            bands.push(<div key="l-ao-a" className="absolute top-0 left-0 w-[1px] bg-[var(--color-key-white-lo)] opacity-60 pointer-events-none z-[5]" style={aoStyle} />);
        }
        if (rightBlackNeighborState === 'idle') {
            bands.push(<div key="r-ao" className="absolute top-0 right-0 w-[2px] bg-[var(--color-key-white-lo)] opacity-80 pointer-events-none z-[5]" style={aoStyle} />);
        } else if (rightBlackNeighborState === 'active') {
            bands.push(<div key="r-ao-a" className="absolute top-0 right-0 w-[1px] bg-[var(--color-key-white-lo)] opacity-60 pointer-events-none z-[5]" style={aoStyle} />);
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
                <div className="absolute inset-0 bg-[var(--color-key-black-lo)]" />

                {/* 2. The Top Face */}
                <div
                    className={twMerge(
                        "absolute top-0 left-0 w-full transition-all duration-75 ease-pixel bg-[var(--color-key-black)]",
                    )}
                    style={{ height: blackTopHeight }}
                >
                    {/* Active Color Overlay */}
                    {isActive && activeColor && (
                        <div
                            className="absolute inset-0 opacity-60"
                            style={{
                                backgroundColor: activeColor,
                                boxShadow: "var(--shadow-bevel-active)"
                            }}
                        />
                    )}
                    {/* Subtle highlight on top edge */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-[var(--color-key-black-hi)] opacity-50" />
                </div>
            </div>
        );
    }

    // White key: similar depth treatment as black keys
    const whiteFaceTop = isActive ? "2px" : "0px";

    return (
        <div
            data-note={note}
            className="absolute top-0 select-none"
            style={{
                ...style,
                zIndex: 20,
                backgroundColor: "var(--color-void)",
                transform
            }}
        >
            {/* 1. The Bed/Side Face (visible when pressed) */}
            <div
                className="absolute inset-0"
                style={{
                    clipPath: getClipPath(),
                    backgroundColor: "var(--color-key-white-lo)",
                    borderRight: "1px solid var(--color-border)"
                }}
            />

            {/* 2. The Top Face */}
            <div
                className={twMerge(
                    "absolute left-0 w-full transition-all duration-75 ease-pixel",
                )}
                style={{
                    top: whiteFaceTop,
                    height: `calc(100% - ${whiteFaceTop})`,
                    clipPath: getClipPath(),
                    backgroundColor: "var(--color-key-white)",
                    boxShadow: isActive
                        ? getInternalShadows()
                        : `inset 1px 1px 0 0 var(--color-key-white-hi), ${getInternalShadows() !== "none" ? getInternalShadows() : ""}`.replace(/, $/, ""),
                    borderRight: "1px solid var(--color-border)"
                }}
            >
                {/* Active Color Overlay */}
                {isActive && activeColor && (
                    <div
                        className="absolute inset-0 opacity-50 z-[1]"
                        style={{
                            backgroundColor: activeColor,
                            boxShadow: "var(--shadow-bevel-active)"
                        }}
                    />
                )}

                {/* Top highlight line */}
                {!isActive && (
                    <div className="absolute top-0 left-0 right-[1px] h-[1px] bg-[var(--color-key-white-hi)]" />
                )}

                {label && (
                    <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none z-10">
                        <span className="text-[10px] font-sans text-[var(--color-muted)] font-bold block">{label}</span>
                    </div>
                )}
                {getAOOverlay()}
            </div>
        </div>
    );
});
