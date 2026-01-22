"use client";

import { useMemo } from "react";
import { Key } from "./Key";
import { getKeyPosition, getTotalKeyboardWidth } from "./geometry";

interface KeyboardKey {
    note: string;
    color: string;
    isPreview?: boolean;
}

interface KeyboardProps {
    keys: KeyboardKey[];
}

export function Keyboard({ keys: activeKeys }: KeyboardProps) {

    // Generate 88 keys from A0 (21) to C8 (108)
    const keysData = useMemo(() => {
        const k = [];
        const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

        for (let i = 21; i <= 108; i++) {
            const { left, width, isBlack } = getKeyPosition(i);

            const octave = Math.floor(i / 12) - 1;
            const noteIndex = i % 12;
            const noteName = NOTES[noteIndex];
            const fullName = `${noteName}${octave}`;

            k.push({
                midi: i,
                note: fullName,
                isBlack,
                left,
                width,
                height: isBlack ? 96 : 150, // From Specs
                zIndex: isBlack ? 10 : 0,
                label: noteName === "C" ? `C${octave}` : undefined
            });
        }
        return k;
    }, []);

    // Helper to find state
    const getActiveState = (keyNote: string) => {
        const normalize = (n: string) => n.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
        const target = normalize(keyNote);
        const match = activeKeys.find(k => normalize(k.note) === target);

        if (!match) return { isActive: false, color: undefined, isPreview: false };
        return { isActive: !match.isPreview, color: match.color, isPreview: match.isPreview };
    };

    const totalWidth = getTotalKeyboardWidth();

    return (
        /* Key Container - fixed width based on pixels */
        <div
            className="relative h-[150px] shrink-0 bg-transparent"
            style={{ width: `${totalWidth}px` }}
        >
            {keysData.map((key) => {
                const { isActive, isPreview } = getActiveState(key.note);

                // Optimization: Only render if needed? No, render all 88 for static piano.
                return (
                    <Key
                        key={key.midi}
                        note={key.note}
                        isBlack={key.isBlack}
                        isActive={isActive}
                        label={key.label}
                        isPreview={isPreview}
                        style={{
                            left: `${key.left}px`,
                            width: `${key.width}px`,
                            height: `${key.height}px`,
                            zIndex: key.zIndex
                        }}
                    />
                );
            })}
        </div>
    );
}
