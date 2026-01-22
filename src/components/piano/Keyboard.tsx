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
