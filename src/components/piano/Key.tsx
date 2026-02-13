
import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface KeyProps {
    note: string;
    isBlack: boolean;
    isActive: boolean;
    isLeftNeighborActive?: boolean;
    isRightNeighborActive?: boolean;
    // Neighbor colors for side-illumination
    leftNeighborColor?: string;
    rightNeighborColor?: string;
    // Black Neighbor States
    leftBlackNeighborState?: 'none' | 'idle' | 'active';
    rightBlackNeighborState?: 'none' | 'idle' | 'active';
    // Black neighbor colors for AO tinting
    leftBlackNeighborColor?: string;
    rightBlackNeighborColor?: string;
    // Precise Cut Geometry (Pixels)
    cutLeft?: number;
    cutRight?: number;
    label?: string;
    activeColor?: string;
    style?: React.CSSProperties;
}

export const Key = memo(function Key({ note, isBlack, isActive, isLeftNeighborActive, isRightNeighborActive, leftNeighborColor, rightNeighborColor, leftBlackNeighborState, rightBlackNeighborState, leftBlackNeighborColor, rightBlackNeighborColor, cutLeft = 0, cutRight = 0, label, activeColor, style }: KeyProps) {

    // --- GEOMETRY & PHYSICS ---
    // Physical dip + squash/stretch for impact feel
    const transform = isActive
        ? (isBlack ? "translateY(1px) scaleX(0.97) scaleY(1.02)" : "translateY(-1px) scaleX(1.02) scaleY(0.97)")
        : "translateY(0) scale(1)";

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

    // Side-illumination overlays (colored divs instead of box-shadow, works with var() colors)
    const getSideIllumination = () => {
        if (isBlack) return null;
        const overlays = [];
        if (isActive && activeColor) {
            // Self-illumination: light escapes to sides where neighbor is NOT active
            if (!isLeftNeighborActive) {
                overlays.push(<div key="si-l" className="absolute top-0 left-0 h-full w-[3px] opacity-25 pointer-events-none z-[2]" style={{ background: `linear-gradient(to right, ${activeColor}, transparent)` }} />);
            }
            if (!isRightNeighborActive) {
                overlays.push(<div key="si-r" className="absolute top-0 right-0 h-full w-[3px] opacity-25 pointer-events-none z-[2]" style={{ background: `linear-gradient(to left, ${activeColor}, transparent)` }} />);
            }
        } else if (!isActive) {
            // Neighbor-cast illumination: inactive key lit by active neighbors
            if (isLeftNeighborActive && leftNeighborColor) {
                overlays.push(<div key="ni-l" className="absolute top-0 left-0 h-full w-[4px] opacity-20 pointer-events-none z-[2]" style={{ background: `linear-gradient(to right, ${leftNeighborColor}, transparent)` }} />);
            }
            if (isRightNeighborActive && rightNeighborColor) {
                overlays.push(<div key="ni-r" className="absolute top-0 right-0 h-full w-[4px] opacity-20 pointer-events-none z-[2]" style={{ background: `linear-gradient(to left, ${rightNeighborColor}, transparent)` }} />);
            }
        }
        return overlays;
    };

    // Black Key AO (Ambient Occlusion) on White Keys — tinted when active
    const getAOOverlay = () => {
        if (isBlack || isActive) return null;
        const bands = [];
        const aoStyle = { height: 'var(--spacing-black-h)' };
        if (leftBlackNeighborState === 'idle') {
            bands.push(<div key="l-ao" className="absolute top-0 left-0 w-[2px] bg-[var(--color-key-white-lo)] opacity-80 pointer-events-none z-[5]" style={aoStyle} />);
        } else if (leftBlackNeighborState === 'active') {
            bands.push(<div key="l-ao-a" className="absolute top-0 left-0 w-[1px] opacity-60 pointer-events-none z-[5]" style={{ ...aoStyle, backgroundColor: leftBlackNeighborColor || 'var(--color-key-white-lo)' }} />);
        }
        if (rightBlackNeighborState === 'idle') {
            bands.push(<div key="r-ao" className="absolute top-0 right-0 w-[2px] bg-[var(--color-key-white-lo)] opacity-80 pointer-events-none z-[5]" style={aoStyle} />);
        } else if (rightBlackNeighborState === 'active') {
            bands.push(<div key="r-ao-a" className="absolute top-0 right-0 w-[1px] opacity-60 pointer-events-none z-[5]" style={{ ...aoStyle, backgroundColor: rightBlackNeighborColor || 'var(--color-key-white-lo)' }} />);
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
                    {/* Specular pixel cluster */}
                    <div className="absolute top-[1px] left-[2px] w-[2px] h-[1px] bg-[var(--color-key-black-hi)] opacity-60 pointer-events-none" />
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
                    <>
                        <div className="absolute top-0 left-0 right-[1px] h-[1px] bg-[var(--color-key-white-hi)]" />
                        {/* Specular pixel cluster — wet highlight */}
                        <div className="absolute top-[2px] left-[2px] w-[3px] h-[1px] bg-white opacity-40 pointer-events-none" />
                    </>
                )}

                {getSideIllumination()}
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
