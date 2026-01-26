import { useMemo } from "react";
import { Key } from "./Key";
import { getKeyPosition, getTotalKeyboardWidth, getKeyCuts } from "./geometry";
import { NameboardReflections } from "./NameboardReflections";

interface KeyboardKey {
    note: string;
    color: string;
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
            const { cutLeft, cutRight } = getKeyCuts(i);

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
                height: isBlack ? 96 : 150,
                zIndex: isBlack ? 30 : 10,
                cutLeft, // Precision Geometry
                cutRight,
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

        if (!match) return { isActive: false, color: undefined };
        return { isActive: true, color: match.color };
    };

    const totalKeysWidth = getTotalKeyboardWidth();
    const totalPianoWidth = 36 + totalKeysWidth + 36;

    return (
        <div className="flex flex-col items-center bg-black select-none">

            {/* 1. TOP: Nameboard & Logo (z-30) */}
            <div 
                className="h-8 bg-[var(--color-pal-1)] border-b-4 border-[var(--color-pal-2)] relative flex flex-row items-center justify-center z-30 overflow-hidden"
                style={{ width: `${totalPianoWidth}px` }}
            >
                <div className="w-[36px] h-full flex-shrink-0 bg-[var(--color-pal-1)]" />
                {/* Reflections placeholder (removed from here) */}
                <div style={{ width: `${totalKeysWidth}px` }} className="relative h-full flex-shrink-0" />
                <div className="w-[36px] h-full flex-shrink-0 bg-[var(--color-pal-1)]" />
            </div>

            {/* Global Reflection Layer (z-60) - Renders ON TOP of Waterfall and Nameboard */}
            <div className="absolute top-0 w-full flex justify-center z-60 pointer-events-none" style={{ height: '32px' }}>
                 <div style={{ width: `${totalKeysWidth}px` }} className="relative h-full">
                    <NameboardReflections keysData={keysData} activeKeys={activeKeys} />
                 </div>
            </div>

            {/* 2. MIDDLE: The Action Area */}
            <div className="relative z-[20] flex flex-row bg-transparent">

                {/* Left Cheek Block (z-30) */}
                <div className="w-[36px] h-[154px] bg-[var(--color-pal-1)] border-b-[12px] border-[var(--color-pal-2)] box-border relative z-[30] border-r-2 border-[var(--color-pal-0)]" />

                {/* The Keyboard Container */}
                <div
                    data-testid="keys-container"
                    className="relative h-[150px]"
                    style={{ width: `${totalKeysWidth}px` }}
                >
                    {/* Cavity (Behind Keys) - Void Color (z-0) */}
                    <div className="w-full h-full bg-[var(--color-piano-void)] absolute top-0 left-0 right-0 z-0" />

                    {/* Keys (z-20/25) */}
                    {keysData.map((key) => {
                        const { isActive, color } = getActiveState(key.note);
                        const keyIndex = key.midi - 21;

                        let leftKeyData = null;
                        let rightKeyData = null;

                        if (!key.isBlack) {
                            let l = keyIndex - 1;
                            while (l >= 0) {
                                if (!keysData[l].isBlack) { leftKeyData = keysData[l]; break; }
                                l--;
                            }
                            let r = keyIndex + 1;
                            while (r < keysData.length) {
                                if (!keysData[r].isBlack) { rightKeyData = keysData[r]; break; }
                                r++;
                            }
                        }

                        const rawLeft = keysData[keyIndex - 1];
                        const rawRight = keysData[keyIndex + 1];

                        let leftBlackState: 'none' | 'idle' | 'active' = 'none';
                        let rightBlackState: 'none' | 'idle' | 'active' = 'none';

                        if (rawLeft && rawLeft.isBlack) {
                            leftBlackState = getActiveState(rawLeft.note).isActive ? 'active' : 'idle';
                        }
                        if (rawRight && rawRight.isBlack) {
                            rightBlackState = getActiveState(rawRight.note).isActive ? 'active' : 'idle';
                        }

                        const isLeftActive = leftKeyData ? getActiveState(leftKeyData.note).isActive : false;
                        const isRightActive = rightKeyData ? getActiveState(rightKeyData.note).isActive : false;

                        return (
                            <Key
                                key={key.midi}
                                note={key.note}
                                isBlack={key.isBlack}
                                cutLeft={key.cutLeft}
                                cutRight={key.cutRight}
                                isActive={isActive}
                                isLeftNeighborActive={isLeftActive}
                                isRightNeighborActive={isRightActive}
                                leftBlackNeighborState={leftBlackState}
                                rightBlackNeighborState={rightBlackState}
                                activeColor={color}
                                label={key.label}
                                style={{
                                    left: `${key.left}px`,
                                    width: `${key.width}px`,
                                    height: `${key.height}px`,
                                    top: key.isBlack ? '2px' : '0px', 
                                }}
                            />
                        );
                    })}
                </div>

                {/* Right Cheek Block (z-30) */}
                <div className="w-[36px] h-[154px] bg-[var(--color-pal-1)] border-b-[12px] border-[var(--color-pal-2)] box-border relative z-[30] border-l-2 border-[var(--color-pal-0)]" />

            </div>

            {/* 3. BOTTOM: Key Slip (z-60) */}
            <div 
                className="h-6 bg-[var(--color-pal-1)] border-t-2 border-[var(--color-pal-2)] z-[60] -mt-[4px] relative" 
                style={{ width: `${totalPianoWidth}px` }}
            />

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

        </div>
    );
}