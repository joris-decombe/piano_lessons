"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Key } from "./Key";
import { generatePianoLayout } from "./pianoLayout";

// Dynamically import Keyboard3D with no SSR to avoid hydration mismatch
const Keyboard3D = dynamic(() => import("./Keyboard3D").then(mod => mod.Keyboard3D), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-white">Loading 3D Piano...</div>
});

interface KeyboardKey {
    note: string;
    color: string;
    isPreview?: boolean;
}

interface KeyboardProps {
    keys: KeyboardKey[];
}

export function Keyboard({ keys: activeKeys }: KeyboardProps) {
    // Enable 3D by default via dynamic import logic
    const use3D = true;

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
        const normalize = (n: string) => n.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
        const target = normalize(keyNote);
        const match = activeKeys.find(k => normalize(k.note) === target);
        if (!match) return { isActive: false, color: undefined, isPreview: false };
        return { isActive: !match.isPreview, color: match.color, isPreview: match.isPreview };
    };

    if (use3D) {
        return (
            <div className="relative h-64 w-full justify-center bg-transparent">
                <Keyboard3D keys={keys} activeKeys={activeKeys} />
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // Fallback / Mobile 2D Implementation (Original Code)
    // -------------------------------------------------------------------------
    return (
        <div
            className="relative flex h-48 landscape:h-32 w-full justify-center bg-transparent"
            style={{ perspective: '1000px' }}
        >
            <div
                className="relative h-full w-full max-w-[1200px] bg-white rounded-b-xl overflow-hidden shadow-2xl"
                style={{
                    transform: 'rotateX(5deg)',
                    transformOrigin: 'top',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}
            >
                {/* Fallboard background */}
                <div
                    className="absolute inset-x-0 top-0 h-[40%] pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, #000000, #1a1a1a)',
                        boxShadow: 'inset 0 -20px 40px rgba(255,255,255,0.05)',
                        zIndex: -2
                    }}
                />

                {/* Red felt strip */}
                <div
                    className="absolute inset-x-0 pointer-events-none"
                    style={{
                        top: '60%',
                        height: '8px',
                        background: 'linear-gradient(to bottom, #8b0000, #660000)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        zIndex: -1
                    }}
                />

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
