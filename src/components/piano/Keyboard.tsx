"use client";

import { useMemo } from "react";
import { Key } from "./Key";
import { generatePianoLayout } from "./pianoLayout";

interface KeyboardKey {
    note: string;
    color: string;
    isPreview?: boolean;
}

interface KeyboardProps {
    keys: KeyboardKey[];
}

export function Keyboard({ keys: activeKeys }: KeyboardProps) {
    // Use virtual piano layout with exact positions
    const keys = useMemo(() => generatePianoLayout().map(key => {
        const octave = parseInt(key.note.match(/\d+$/)?.[0] || "0");
        const noteName = key.note.replace(/\d+$/, "");
        return {
            ...key,
            label: noteName === "C" ? `C${octave}` : undefined
        };
    }), []);
    const k = [];
    const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    const whiteKeyWidth = 100 / 52; // 52 white keys across 100%
    const blackKeyWidth = whiteKeyWidth * 0.5; // 50% of white key width (more substantial)

    // Black key offsets within an octave (as % of octave width)
    // Based on real piano measurements where black keys are NOT centered
    const blackKeyOffsets: Record<string, number> = {
        'Db': 0.6,   // C# closer to C
        'Eb': 1.75,  // D# closer to E
        'Gb': 3.6,   // F# position
        'Ab': 4.9,   // G# centered
        'Bb': 6.25   // A# position
    };

    let whiteKeyIndex = 0;

    for (let i = 21; i <= 108; i++) {
        const octave = Math.floor(i / 12) - 1;
        const noteIndex = i % 12;
        const noteName = NOTES[noteIndex];
        const fullName = `${noteName}${octave}`;
        const isBlack = noteName.includes("b") || noteName.includes("#");

        let left = 0;

        if (isBlack) {
            // Calculate position based on octave and offset
            const octaveStart = Math.floor(whiteKeyIndex / 7) * 7 * whiteKeyWidth;
            const offset = blackKeyOffsets[noteName] || 0;
            left = octaveStart + (offset * whiteKeyWidth);
        } else {
            // White keys are evenly spaced
            left = whiteKeyIndex * whiteKeyWidth;
            whiteKeyIndex++;
        }

        k.push({
            midi: i,
            note: fullName,
            isBlack,
            left,
            width: isBlack ? blackKeyWidth : whiteKeyWidth,
            label: noteName === "C" ? `C${octave}` : undefined
        });
    }
    return k;
}, []);

// Normalization helper
const getActiveState = (keyNote: string) => {
    // We need to match keyNote (e.g. Db4) to incoming keys (e.g. C#4 potentially?)
    // Let's normalize everything to Sharps for comparison if needed.
    // Or simply checking if the MIDI number matches? 
    // The incoming `keys` has `note` (string). Getting MIDI from it is safer.

    const normalize = (n: string) => n.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
    const target = normalize(keyNote);

    const match = activeKeys.find(k => normalize(k.note) === target);

    if (!match) return { isActive: false, color: undefined, isPreview: false };
    return { isActive: !match.isPreview, color: match.color, isPreview: match.isPreview };
};

return (
    <div className="relative flex h-48 landscape:h-32 w-full justify-center rounded-b-xl bg-transparent">
        <div className="relative h-full w-full max-w-[1200px] bg-white rounded-b-xl overflow-hidden">
            {keys.map((key) => {
                const { isActive, color, isPreview } = getActiveState(key.note);
                return (
                    <Key
                        key={key.note}
                        note={key.note}
                        isBlack={key.isBlack}
                        isActive={isActive}
                        activeColor={color}
                        label={key.label}
                        isPreview={isPreview}
                        left={key.left}
                        width={key.width}
                    />
                );
            })}
        </div>
    </div>
);
}
