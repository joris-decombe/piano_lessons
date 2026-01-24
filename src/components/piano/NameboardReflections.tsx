import { useMemo } from "react";

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
    
    const getActiveData = (note: string) => {
        const normalize = (n: string) => n.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
        const target = normalize(note);
        return activeKeys.find(k => normalize(k.note) === target);
    };

    return (
        <div className="relative w-full h-full pointer-events-none overflow-hidden">
            {keysData.map((key) => {
                const activeData = getActiveData(key.note);
                
                // Mirroring the key's material color
                // White Keys reflect light gray, Black Keys reflect dark gray
                let color = key.isBlack ? "rgba(31,41,55,0.4)" : "rgba(226,228,233,0.2)";
                let opacity = 1;
                let height = "2px";

                if (activeData) {
                    color = activeData.color;
                    opacity = 0.8;
                    height = "4px"; // Bloom effect for active keys
                }

                // Narrow band at the bottom edge facing the keys
                return (
                    <div
                        key={key.midi}
                        className="absolute bottom-0 transition-all duration-75"
                        style={{
                            left: `${key.left}px`,
                            width: `${key.width}px`,
                            height: height,
                            backgroundColor: color,
                            opacity: opacity,
                            // Subtle glow for active
                            boxShadow: activeData ? `0 0 4px ${color}` : "none",
                        }}
                    />
                );
            })}
        </div>
    );
}