"use client";

import { useMemo } from "react";
import { Key } from "./Key";

const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

interface ActiveNote {
    note: string;
    color: string;
}

interface KeyboardProps {
    activeNotes: (string | ActiveNote)[]; // List of active note names or objects
}

export function Keyboard({ activeNotes }: KeyboardProps) {
    // Generate 88 keys starting from A0
    // ... (memo gen is same)
    const keys = useMemo(() => {
        const k = [];
        for (let i = 21; i <= 108; i++) {
            const octave = Math.floor(i / 12) - 1;
            const noteIndex = i % 12;
            const noteName = NOTES[noteIndex];
            const fullName = `${noteName}${octave}`;
            const isBlack = noteName.includes("b") || noteName.includes("#");

            k.push({
                midi: i,
                note: fullName,
                isBlack,
                label: noteName === "C" ? `C${octave}` : undefined
            });
        }
        return k;
    }, []);

    // Normalization helper
    const getActiveState = (keyNote: string) => {
        const normalize = (n: string) => n.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
        const target = normalize(keyNote);

        const match = activeNotes.find(active => {
            const activeName = typeof active === 'string' ? active : active.note;
            return normalize(activeName) === target;
        });

        if (!match) return { isActive: false, color: undefined };

        const color = typeof match === 'string' ? undefined : match.color;
        return { isActive: true, color };
    };

    return (
        <div className="relative flex h-48 landscape:h-32 w-full justify-center rounded-b-xl bg-transparent">
            <div className="flex h-full w-full max-w-[1200px] flex-row items-stretch justify-between">
                {keys.map((key) => {
                    const { isActive, color } = getActiveState(key.note);
                    return (
                        <Key
                            key={key.note}
                            note={key.note}
                            isBlack={key.isBlack}
                            isActive={isActive}
                            activeColor={color}
                            label={key.label}
                        />
                    );
                })}
            </div>
        </div>
    );
}
