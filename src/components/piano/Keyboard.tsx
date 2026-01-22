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
    const SIDE_BLOCK_WIDTH = 48; // Cheek blocks width

    return (
        /* Main Piano Container */
        <div className="relative flex flex-col items-center select-none">

            {/* Top Frame Overlay (Fallboard Felt) - Already exists, moved inside the key area */}

            <div className="flex flex-row items-stretch bg-[#0F172A] p-4 pb-0 rounded-xl rounded-b-none shadow-2xl">

                {/* Left Cheek Block */}
                <div
                    className="relative w-[48px] h-[150px] bg-[#0F172A] border-r-2 border-slate-800 z-50 rounded-l-lg"
                    style={{ boxShadow: 'inset -2px 0 5px rgba(0,0,0,0.5)' }}
                >
                    {/* Wood Grain / Varnish Highlight */}
                    <div className="absolute top-0 right-0 w-[1px] h-full bg-slate-700 opacity-50" />
                </div>

                {/* Keys Area */}
                <div
                    className="relative h-[150px] shrink-0 bg-[#0F172A] overflow-hidden"
                    style={{ width: `${totalWidth}px` }}
                >
                    {/* The "Felt" Strip / Fallboard Frame */}
                    <div
                        className="absolute top-0 left-0 w-full z-50 pointer-events-none"
                        style={{
                            height: '12px',
                            backgroundColor: '#0F172A',
                            borderBottom: '4px solid #b91c1c', // Dark Red Felt ? Or Slate? Let's go Red for classic felt look, or Dark Blue for Satie?
                            // User said Satie palette. Let's stick to Dark Slate but slightly lighter for contrast, or Dark Red as accent.
                            // Let's use the 'dim' accent or just dark slate.
                            borderColor: '#334155',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)'
                        }}
                    />

                    {keysData.map((key) => {
                        const { isActive, color, isPreview } = getActiveState(key.note);

                        return (
                            <Key
                                key={key.midi}
                                note={key.note}
                                isBlack={key.isBlack}
                                isActive={isActive}
                                activeColor={color}
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

                {/* Right Cheek Block */}
                <div
                    className="relative w-[48px] h-[150px] bg-[#0F172A] border-l-2 border-slate-800 z-50 rounded-r-lg"
                    style={{ boxShadow: 'inset 2px 0 5px rgba(0,0,0,0.5)' }}
                >
                    <div className="absolute top-0 left-0 w-[1px] h-full bg-slate-700 opacity-50" />
                </div>
            </div>

            {/* Key Slip (Front Frame) - Below the keys */}
            <div
                className="w-full h-[24px] bg-[#1e293b] rounded-b-lg relative shadow-lg -mt-[4px] z-40"
                style={{
                    width: `${totalWidth + (SIDE_BLOCK_WIDTH * 2) + 32}px`, // +32 for padding
                    background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
                    borderTop: '1px solid #0f172a' // Dark border to blend
                }}
            >
                {/* Highlight edge */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10" />
            </div>

        </div>
    );
}
