interface NameboardReflectionsProps {
    keysData: Array<{
        midi: number;
        note: string;
        isBlack: boolean;
        left: number;
        width: number;
    }>;
    activeKeys: Array<{ note: string; color: string }>;
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
                // Mirroring the key's material color
                // White Keys reflect light gray, Black Keys reflect dark gray
                // We do NOT reflect the active color overlay (per user feedback)
                const color = key.isBlack ? "rgba(31,41,55,0.6)" : "rgba(226,228,233,0.3)";
                let opacity = 1;
                let height = "2px";

                // We can still subtly change opacity or height if active to show "movement"
                // but keep the color neutral.
                const activeData = getActiveData(key.note);
                
                if (activeData) {
                    opacity = 0.8;
                    height = "4px"; // Bloom/Motion
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
                            // White/Dark Glow
                            boxShadow: activeData ? `0 0 4px ${color}` : "none",
                        }}
                    />
                );
            })}
        </div>
    );
}