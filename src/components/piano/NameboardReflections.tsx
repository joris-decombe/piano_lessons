
import { useMemo } from "react";
import { getKeyPosition } from "./geometry";

interface NameboardReflectionsProps {
    keysData: Array<{
        midi: number;
        note: string;
        isBlack: boolean;
        left: number;
        width: number;
    }>;
    activeKeys: Array<{ note: string; color: string; isPreview?: boolean }>;
}

export function NameboardReflections({ keysData, activeKeys }: NameboardReflectionsProps) {
    
    // Helper to check active state
    const isActive = (note: string) => {
        const normalize = (n: string) => n.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
        const target = normalize(note);
        return activeKeys.some(k => normalize(k.note) === target);
    };

    return (
        <div className="relative w-full h-full pointer-events-none">
            {keysData.map((key) => {
                if (key.isBlack) return null; // No reflection for black keys

                const active = isActive(key.note);

                return (
                    <div
                        key={key.midi}
                        className="absolute bottom-0 h-full bg-white transition-opacity duration-75"
                        style={{
                            left: `${key.left}px`,
                            width: `${key.width}px`,
                            // Dithering/Pixel Art Style:
                            // Use opacity to simulate reflection strength.
                            // Active = 5% (Angled away/Dimmer). Idle = 15%.
                            opacity: active ? 0.05 : 0.15,
                            // Optional: Add a mask or gradient to fade it out as it goes up?
                            // For Pixel Art, maybe just a solid block or a dithering pattern.
                            // Let's stick to solid block for now as per "Pixel Art Techniques" doc (dithering is preferred but opacity is acceptable for simple prototyping).
                            // Better: A hard gradient (banding).
                            background: "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)"
                        }}
                    />
                );
            })}
        </div>
    );
}
