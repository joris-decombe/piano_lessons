"use client";

import { useMemo } from "react";
import { Key } from "./Key";

interface KeyboardKey {
    note: string;
    color: string;
    isPreview?: boolean;
}

interface KeyboardProps {
    keys: KeyboardKey[];
}

export function Keyboard({ keys: activeKeys }: KeyboardProps) {
    // Generate 88 keys starting from A0
    const keys = useMemo(() => {
        const k = [];
        const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

        for (let i = 21; i <= 108; i++) {
            const octave = Math.floor(i / 12) - 1;
            const noteIndex = i % 12;
            const noteName = NOTES[noteIndex];
            const fullName = `${noteName}${octave}`;
            const isBlack = noteName.includes("b") || noteName.includes("#") || noteName.length > 1 && (noteName[1] === 'b' || noteName[1] === '#');
            // Note: Our manual array has 'Db', 'Eb', etc. so use those. 
            // Tone.js usually emits sharps (C#4), but we used a manual NOTES array with Flats here?
            // "Db" -> includes "b". 

            k.push({
                midi: i,
                note: fullName,
                isBlack: noteName.includes("b") || noteName.includes("#"),
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
            <div className="flex h-full w-full max-w-[1200px] flex-row items-stretch justify-between">
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
                        />
                    );
                })}
            </div>
        </div>
    );
}
