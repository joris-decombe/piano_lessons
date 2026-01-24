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

    // White Key "Face Shift" (Pivoting Away)
    // Idle: Full Height (150px). Pressed: Shortened by 2px (South edge moves North).
    // The 'Bed' (Container background) becomes visible at the bottom.
    const whiteFaceHeight = isActive ? "calc(100% - 2px)" : "100%";

    // Black Key "Submersion" (Sinking In)
    // The Top Face (Light) extends downwards to cover the Front Face (Dark).
    // Idle: Top Face is shorter (revealing 10px front). Pressed: Top Face is longer (revealing 2px front).
    const blackTopHeight = isActive ? "calc(100% - 2px)" : "calc(100% - 10px)";
    
    // --- SHADOWS (Hard Pixel Art) ---

    // White Key Internal Depth (Cast by neighbors)
    const getInternalShadows = () => {
        if (isBlack || !isActive) return "none";
        // We are down (Active White).
        const shadows = [];
        
        // Left Neighbor UP? Casts shadow on our Left Wall.
        if (!isLeftNeighborActive) {
            // Hard band, 2px wide (Reduced from 3px).
            shadows.push("inset 2px 0 0 0 var(--color-pal-6)");
        }
        
        // Right Neighbor UP? Casts shadow on our Right Wall.
        if (!isRightNeighborActive) {
            shadows.push("inset -2px 0 0 0 var(--color-pal-6)");
        }
        
        return shadows.length > 0 ? shadows.join(", ") : "none";
    };

    // Black Key AO (Ambient Occlusion) on White Keys
    // Implemented as Hard Bands (Banding)
    const getAOOverlay = () => {
        if (isBlack || isActive) return null; // Only Idle White Keys get AO
        
        const bands = [];
        
        // Left Black Neighbor Shadow (L->R)
        if (leftBlackNeighborState === 'idle') {
            // 2px wide band, slightly darker
            bands.push(<div key="l-ao" className="absolute top-0 left-0 w-[2px] h-[96px] bg-[var(--color-pal-6)] opacity-60 pointer-events-none" />);
        } else if (leftBlackNeighborState === 'active') {
            // 1px wide band
            bands.push(<div key="l-ao-a" className="absolute top-0 left-0 w-[1px] h-[96px] bg-[var(--color-pal-6)] opacity-60 pointer-events-none" />);
        }

        // Right Black Neighbor Shadow (R->L)
        if (rightBlackNeighborState === 'idle') {
             bands.push(<div key="r-ao" className="absolute top-0 right-0 w-[2px] h-[96px] bg-[var(--color-pal-6)] opacity-60 pointer-events-none" />);
        } else if (rightBlackNeighborState === 'active') {
             bands.push(<div key="r-ao-a" className="absolute top-0 right-0 w-[1px] h-[96px] bg-[var(--color-pal-6)] opacity-60 pointer-events-none" />);
        }
        
        return bands;
    };

    // --- CLIP PATH (White Keys) ---
    const getClipPath = () => {
        if (isBlack || (cutLeft === 0 && cutRight === 0)) return undefined;
        // Simple polygon cutout
        // Note: cutLeft/Right are widths of the cutout.
        const cutH = "96px"; // Height of black key well
        return `polygon(
            ${cutLeft}px 0, 
            ${cutLeft}px ${cutH}, 
            0 ${cutH}, 
            0 100%, 
            100% 100%, 
            100% ${cutH}, 
            calc(100% - ${cutRight}px) ${cutH}, 
            calc(100% - ${cutRight}px) 0
        )`;
    };
    
    // --- RENDER ---
    
    if (isBlack) {
        // === BLACK KEY ===
        return (
            <div
                data-note={note}
                className="absolute top-0 select-none"
                style={{
                    ...style,
                    zIndex: 30, // Always above white
                    // Container doesn't move.
                }}
            >
                {/* 1. The Bed/Front Face (Dark Base) */}
                <div className="absolute inset-0 bg-[var(--color-pal-2)] rounded-sm" />
                
                {/* 2. The Top Face (Light Highlight) - Dynamic Height */}
                <div 
                    className={twMerge(
                        "absolute top-0 left-0 w-full bg-[var(--color-pal-3)] transition-all duration-75 ease-pixel",
                        isActive && activeColor ? "" : ""
                    )}
                    style={{
                        height: blackTopHeight,
                        backgroundColor: isActive && activeColor ? activeColor : undefined,
                        border: isActive && activeColor ? `1px solid rgba(0,0,0,0.3)` : undefined
                    }}
                >
                     {/* Highlight Line (1px at top) */}
                     <div className="absolute top-0 left-0 w-full h-[1px] bg-[rgba(255,255,255,0.1)]" />
                </div>
            </div>
        );
    }

    // === WHITE KEY ===
    return (
        <div
            data-note={note}
            className="absolute top-0 select-none"
            style={{
                ...style,
                zIndex: 10,
                backgroundColor: "var(--color-pal-0)", // The Bed is Void/Black
            }}
        >
            {/* The Face (Dynamic Height) */}
            <div 
                className={twMerge(
                    "absolute top-0 left-0 w-full transition-all duration-75 ease-pixel bg-[var(--color-piano-white-surface)]",
                )}
                style={{
                    height: whiteFaceHeight,
                    clipPath: getClipPath(),
                    backgroundColor: isActive && activeColor ? activeColor : undefined,
                    boxShadow: getInternalShadows(), // Inner shadows when pressed
                    // Hard Right Border (Separator)
                    borderRight: "1px solid var(--color-pal-6)",
                    borderLeft: "1px solid rgba(255,255,255,0.2)" // Highlight left edge
                }}
            >
                 {/* Label */}
                 {label && (
                    <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none z-10">
                        <span className="text-[10px] font-sans text-[var(--color-pal-4)] font-bold opacity-100 block">{label}</span>
                    </div>
                 )}
                 
                 {/* Flow Overlay (Waterfall landing on key) */}
                 {isActive && activeColor && (
                     <div 
                        className="absolute inset-0 z-0 pointer-events-none mix-blend-overlay opacity-50 animate-scroll"
                        style={{
                            // Stream texture: Horizontal ripples moving down
                            backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.2) 2px, transparent 8px)",
                            backgroundSize: "100% 16px", // Loops every 16px
                            backgroundColor: activeColor
                        }}
                     />
                 )}
                 
                 {/* AO Overlays (Black Shadows) */}
                 {getAOOverlay()}
            </div>
            
            {/* The Exposed Bed (When pressed, bottom 2px reveals this) 
                Actually, the container bg is black, so it reveals black. 
                We might want 'Key Slip' color (Gray 900) if it's hitting the frame.
                But 'Bed' implies the interior. Let's stick to Void for now.
            */}
        </div>
    );
}