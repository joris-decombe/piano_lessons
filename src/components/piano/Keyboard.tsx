
import { useMemo } from "react";
import { Key } from "./Key";
import { getKeyPosition, getTotalKeyboardWidth, getKeyCuts } from "./geometry";

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

        if (!match) return { isActive: false, color: undefined, isPreview: false };
        return { isActive: !match.isPreview, color: match.color, isPreview: match.isPreview };
    };

    const totalWidth = getTotalKeyboardWidth();

    return (
        <div className="flex flex-col items-center bg-[var(--color-piano-bg)] select-none">

            {/* 1. TOP: Nameboard & Logo */}
            {/* Z-Index 20 matches Cheek Blocks */}
            <div className="w-full h-8 bg-black border-b-4 border-[var(--color-piano-black-face)] relative flex items-center justify-center shadow-lg z-20 overflow-hidden">
                {/* Reflection Overlay (Specs v3.1) - Smooth Bottom-Up Gradient (No Vertical Lines) */}
                <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                        background: "linear-gradient(0deg, rgba(255,255,255,0.15) 0%, transparent 40%)"
                    }}
                />
            </div>

            {/* 2. MIDDLE: The Action Area */}
            {/* BG Matches Frame so cavities look deep */}
            <div className="relative z-[10] flex flex-row shadow-2xl bg-[var(--color-piano-black-face)]">

                {/* Left Cheek Block: Height 154px - z-20 (Frame) */}
                <div className="w-[36px] h-[154px] bg-[var(--color-piano-black-surface)] border-b-[12px] border-[var(--color-piano-black-face)] box-border relative z-[20]" />

                {/* The Keyboard Container */}
                <div
                    data-testid="keys-container"
                    className="relative h-[150px]"
                    style={{ width: `${totalWidth}px` }}
                >
                    {/* Nameboard Cover (Lip) - REMOVED to eliminate North Gap (Zero Gap) */}

                    {/* Cavity (Behind Keys) */}
                    <div className="w-full h-full bg-[var(--color-piano-black-face)] absolute top-0 left-0 right-0 -z-10" />

                    {/* Keys */}
                    {keysData.map((key) => {
                        const { isActive, color } = getActiveState(key.note);

                        // Check neighbors (by MIDI index) for White Keys
                        const keyIndex = key.midi - 21;

                        let leftKeyData = null;
                        let rightKeyData = null;

                        if (!key.isBlack) {
                            // Find Left White
                            let l = keyIndex - 1;
                            while (l >= 0) {
                                if (!keysData[l].isBlack) { leftKeyData = keysData[l]; break; }
                                l--;
                            }
                            // Find Right White
                            let r = keyIndex + 1;
                            while (r < keysData.length) {
                                if (!keysData[r].isBlack) { rightKeyData = keysData[r]; break; }
                                r++;
                            }
                        } else {
                            // For Black keys, simple adjacency
                            leftKeyData = keysData[keyIndex - 1];
                            rightKeyData = keysData[keyIndex + 1];
                        }

                        // Determine Black Neighbor States
                        const rawLeft = keysData[keyIndex - 1];
                        const rawRight = keysData[keyIndex + 1];

                        let leftBlackState: 'none' | 'idle' | 'active' = 'none';
                        let rightBlackState: 'none' | 'idle' | 'active' = 'none';

                        if (rawLeft && rawLeft.isBlack) {
                            const isActive = getActiveState(rawLeft.note).isActive;
                            leftBlackState = isActive ? 'active' : 'idle';
                        }

                        if (rawRight && rawRight.isBlack) {
                            const isActive = getActiveState(rawRight.note).isActive;
                            rightBlackState = isActive ? 'active' : 'idle';
                        }

                        // Determine White Neighbor States
                        const isLeftActive = leftKeyData ? getActiveState(leftKeyData.note).isActive : false;
                        const isRightActive = rightKeyData ? getActiveState(rightKeyData.note).isActive : false;

                        // Pass CUT PROPS instead of keyShape
                        return (
                            <Key
                                key={key.midi}
                                note={key.note}
                                isBlack={key.isBlack}
                                cutLeft={key.cutLeft}   // PIXEL PERFECT CUT
                                cutRight={key.cutRight} // PIXEL PERFECT CUT
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
                                    top: key.isBlack ? '2px' : '0px', // North Gap for Black Keys only
                                    zIndex: key.zIndex
                                }}
                            />
                        );
                    })}
                </div>

                {/* Right Cheek Block: Height 154px - z-20 */}
                <div className="w-[36px] h-[154px] bg-[var(--color-piano-black-surface)] border-b-[12px] border-[var(--color-piano-black-face)] box-border relative z-[20]" />

            </div>

            {/* 3. BOTTOM: Key Slip - z-0 */}
            <div className="w-full h-6 bg-[var(--color-piano-black-face)] border-t border-[var(--color-piano-black-highlight)] z-[0] -mt-[4px] relative shadow-lg" />

            {/* Global Scroll stopper */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

        </div>
    );
}
