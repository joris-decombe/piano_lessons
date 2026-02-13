import { useMemo, useCallback } from "react";
import { Key } from "./Key";
import { getKeyPosition, getTotalKeyboardWidth, getKeyCuts } from "./geometry";

interface KeyboardKey {
    note: string;
    color: string;
}

interface KeyboardProps {
    keys: KeyboardKey[];
}

// Pre-computed note normalization map for O(1) lookups
const NOTE_NORMALIZE_MAP: Record<string, string> = {};
const NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
for (let i = 21; i <= 108; i++) {
    const octave = Math.floor(i / 12) - 1;
    const noteIndex = i % 12;
    const noteName = NOTES[noteIndex];
    const fullName = `${noteName}${octave}`;
    const normalized = fullName.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
    NOTE_NORMALIZE_MAP[fullName] = normalized;
    NOTE_NORMALIZE_MAP[normalized] = normalized; // Also map normalized to itself
}

export function Keyboard({ keys: activeKeys }: KeyboardProps) {

    // Generate 88 keys from A0 (21) to C8 (108) with pre-computed neighbor indices
    const keysData = useMemo(() => {
        const k: Array<{
            midi: number;
            note: string;
            isBlack: boolean;
            left: number;
            width: number;
            height: number;
            zIndex: number;
            cutLeft: number;
            cutRight: number;
            label?: string;
            // Pre-computed neighbor indices
            leftWhiteIdx: number | null;
            rightWhiteIdx: number | null;
            leftBlackIdx: number | null;
            rightBlackIdx: number | null;
        }> = [];

        // First pass: create all keys
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
                cutLeft,
                cutRight,
                label: noteName === "C" ? `C${octave}` : undefined,
                leftWhiteIdx: null,
                rightWhiteIdx: null,
                leftBlackIdx: null,
                rightBlackIdx: null,
            });
        }

        // Second pass: pre-compute neighbor indices (O(n) instead of O(n²))
        for (let idx = 0; idx < k.length; idx++) {
            const key = k[idx];

            if (!key.isBlack) {
                // Find left white neighbor
                for (let l = idx - 1; l >= 0; l--) {
                    if (!k[l].isBlack) { key.leftWhiteIdx = l; break; }
                }
                // Find right white neighbor
                for (let r = idx + 1; r < k.length; r++) {
                    if (!k[r].isBlack) { key.rightWhiteIdx = r; break; }
                }
            }

            // Store black neighbor indices (direct neighbors)
            const rawLeft = k[idx - 1];
            const rawRight = k[idx + 1];
            if (rawLeft?.isBlack) key.leftBlackIdx = idx - 1;
            if (rawRight?.isBlack) key.rightBlackIdx = idx + 1;
        }

        return k;
    }, []);

    // Build a Map of active keys for O(1) lookups
    const activeKeyMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const k of activeKeys) {
            const normalized = NOTE_NORMALIZE_MAP[k.note] || k.note.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
            map.set(normalized, k.color);
        }
        return map;
    }, [activeKeys]);

    // O(1) active state lookup using pre-computed normalized notes
    const getActiveState = useCallback((keyNote: string) => {
        const normalized = NOTE_NORMALIZE_MAP[keyNote];
        const color = activeKeyMap.get(normalized);
        return color !== undefined
            ? { isActive: true, color }
            : { isActive: false, color: undefined };
    }, [activeKeyMap]);

    const totalKeysWidth = getTotalKeyboardWidth();
    // Case removed: totalPianoWidth is just the keys width
    // const totalPianoWidth = 36 + totalKeysWidth + 36; 

    return (
        <div className="flex flex-col items-center select-none">
            {/* The Action Area - Simplified */}
            <div className="relative z-[20] flex flex-row bg-transparent">

                {/* The Keyboard Container */}
                <div
                    data-testid="keys-container"
                    className="relative"
                    style={{ height: 'var(--spacing-key-h)', width: `${totalKeysWidth}px` }}
                >
                    {/* Cavity (Behind Keys) - Void Color (z-0) */}
                    <div className="w-full h-full bg-[var(--color-piano-void)] absolute top-0 left-0 right-0 z-0" />

                    {/* Keys (z-20/25) */}
                    {keysData.map((key) => {
                        const { isActive, color } = getActiveState(key.note);

                        // Use pre-computed neighbor indices (O(1) lookups)
                        let leftBlackState: 'none' | 'idle' | 'active' = 'none';
                        let rightBlackState: 'none' | 'idle' | 'active' = 'none';
                        let leftBlackColor: string | undefined;
                        let rightBlackColor: string | undefined;

                        if (key.leftBlackIdx !== null) {
                            const blackState = getActiveState(keysData[key.leftBlackIdx].note);
                            leftBlackState = blackState.isActive ? 'active' : 'idle';
                            leftBlackColor = blackState.color;
                        }
                        if (key.rightBlackIdx !== null) {
                            const blackState = getActiveState(keysData[key.rightBlackIdx].note);
                            rightBlackState = blackState.isActive ? 'active' : 'idle';
                            rightBlackColor = blackState.color;
                        }

                        const leftWhiteState = key.leftWhiteIdx !== null
                            ? getActiveState(keysData[key.leftWhiteIdx].note)
                            : { isActive: false, color: undefined };
                        const rightWhiteState = key.rightWhiteIdx !== null
                            ? getActiveState(keysData[key.rightWhiteIdx].note)
                            : { isActive: false, color: undefined };

                        return (
                            <Key
                                key={key.midi}
                                note={key.note}
                                isBlack={key.isBlack}
                                cutLeft={key.cutLeft}
                                cutRight={key.cutRight}
                                isActive={isActive}
                                isLeftNeighborActive={leftWhiteState.isActive}
                                isRightNeighborActive={rightWhiteState.isActive}
                                leftNeighborColor={leftWhiteState.color}
                                rightNeighborColor={rightWhiteState.color}
                                leftBlackNeighborState={leftBlackState}
                                rightBlackNeighborState={rightBlackState}
                                leftBlackNeighborColor={leftBlackColor}
                                rightBlackNeighborColor={rightBlackColor}
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
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

        </div>
    );
}