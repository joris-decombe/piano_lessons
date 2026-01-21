"use client";

import { useMemo } from "react";
import { Midi } from "@tonejs/midi";
import { twMerge } from "tailwind-merge";

interface WaterfallProps {
    midi: Midi | null;
    currentTick: number;
    playbackRate?: number;
    activeColors?: {
        split: boolean;
        left: string;
        right: string;
        unified: string;
    };
    lookAheadTicks?: number;
}

export function Waterfall({ midi, currentTick, playbackRate = 1, activeColors, lookAheadTicks = 0 }: WaterfallProps) {

    const getNotePosition = (midiNote: number) => {
        const whiteKeyWidth = 100 / 52;
        let whiteKeyCount = 0;
        for (let i = 21; i < midiNote; i++) {
            const n = i % 12;
            const isBlack = [1, 3, 6, 8, 10].includes(n);
            if (!isBlack) whiteKeyCount++;
        }

        const n = midiNote % 12;
        const isBlack = [1, 3, 6, 8, 10].includes(n);

        if (!isBlack) {
            return { left: whiteKeyCount * whiteKeyWidth, width: whiteKeyWidth, isBlack: false };
        } else {
            const blackWidth = 1.25;
            return { left: (whiteKeyCount * whiteKeyWidth) - (blackWidth / 2), width: blackWidth, isBlack: true };
        }
    };


    const { allNotes, maxDuration } = useMemo(() => {
        if (!midi) return { allNotes: [], maxDuration: 0 };

        const notes: {
            ticks: number;
            durationTicks: number;
            midi: number;
            name: string;
            color: string;
        }[] = [];
        let maxDur = 0;

        midi.tracks.forEach((track, trackIndex) => {
            if (track.notes.length === 0) return;
            if (track.instrument.percussion) return;

            let noteColor = "#22d3ee";
            if (activeColors) {
                if (activeColors.split) {
                    noteColor = trackIndex === 0 ? activeColors.right : activeColors.left;
                } else {
                    noteColor = activeColors.unified;
                }
            } else {
                const colors = ["#22d3ee", "#fb7185", "#a78bfa", "#facc15"];
                noteColor = colors[trackIndex % colors.length];
            }

            track.notes.forEach(note => {
                if (note.durationTicks > maxDur) maxDur = note.durationTicks;
                notes.push({
                    ticks: note.ticks,
                    durationTicks: note.durationTicks,
                    midi: note.midi,
                    name: note.name,
                    color: noteColor,
                });
            });
        });

        // Sort by start tick
        return { allNotes: notes.sort((a, b) => a.ticks - b.ticks), maxDuration: maxDur };
    }, [midi, activeColors]);

    const visibleNotes = useMemo(() => {
        if (!midi || allNotes.length === 0) return [];

        const PPQ = midi.header.ppq;
        const windowSizeTicks = 6 * PPQ;
        const endTime = currentTick + windowSizeTicks;

        let startIdx = 0;
        let left = 0;
        let right = allNotes.length - 1;

        // Find first note that starts >= currentTick
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (allNotes[mid].ticks < currentTick) {
                left = mid + 1;
            } else {
                startIdx = mid;
                right = mid - 1;
            }
        }

        // Backtrack to find notes that started before currentTick but overlap
        // We look back by maxDuration to ensure we catch all potential overlaps
        let renderStartIdx = startIdx;
        const lookbackTicks = maxDuration;

        // Optimization: Don't scan blindly, use binary search?
        // No, simple backtrack is okay if we don't go back too far.
        // But if maxDuration is huge (e.g. whole song), this degrades to linear scan from beginning in worst case?
        // Yes, if there is one huge note at the beginning.
        // Ideally we'd use an Interval Tree.
        // But for typical piano music, extremely long notes are rare.
        // A better heuristic might be to stop backtracking if we see a gap > maxDuration?
        // Or simply: check notes backward from startIdx. Stop when note.ticks < currentTick - maxDuration.
        // Since notes are sorted by start time, if note[i].ticks < currentTick - maxDuration,
        // then note[i] started too early to possibly overlap (since its duration <= maxDuration).

        while (renderStartIdx > 0 && allNotes[renderStartIdx - 1].ticks > currentTick - lookbackTicks) {
            renderStartIdx--;
        }

        const active: {
            id: string; left: string; width: string; bottom: string; height: string; isBlack: boolean; name: string; color: string;
            isApproaching: boolean; isActive: boolean;
        }[] = [];

        // Track which pitches have already been rendered (from bottom up) to avoid duplicate preview lines
        const coveredPitches = new Set<string>();

        // Notes are sorted by ticks (lowest/earliest first)
        // Since we iterate from renderStartIdx forwards, we encounter "lower" notes first.
        for (let i = renderStartIdx; i < allNotes.length; i++) {
            const note = allNotes[i];

            // If note starts after the window, we can stop
            if (note.ticks > endTime) break;

            if (note.ticks + note.durationTicks > currentTick) {
                const bottomPct = ((note.ticks - currentTick) / windowSizeTicks) * 100;
                const heightPct = (note.durationTicks / windowSizeTicks) * 100;

                const { left, width, isBlack } = getNotePosition(note.midi);

                const isActive = note.ticks <= currentTick && (note.ticks + note.durationTicks) >= currentTick;

                // Calculate threshold based on lookAheadTicks if available
                const approachThreshold = lookAheadTicks > 0
                    ? (lookAheadTicks / windowSizeTicks) * 100
                    : 15 / (playbackRate || 1);

                // Only mark as approaching if:
                // 1. Not currently active
                // 2. Within threshold
                // 3. Pitch not yet "covered" by a lower note (active or approaching)
                let isApproaching = !isActive && bottomPct < approachThreshold && bottomPct > 0;

                if (coveredPitches.has(note.name)) {
                    isApproaching = false;
                }

                if (isActive || isApproaching) {
                    coveredPitches.add(note.name);
                }
                // If it's just visible but high up (not approaching/active), it doesn't "cover" the pitch yet?
                // User logic: "not really a problem since ... have notes on the waterfall that are lower".
                // If there is ANY note lower, we probably don't need a line?
                // But if the lower note is VERY far down (below view)? No, we iterate visible only.
                // If lower note is at 10% (visible, but not approaching/active?? Wait, if visible it is approaching or active basically).
                // Actually, "Active" means played. "Approaching" means < threshold.
                // What if note is > threshold? (e.g. 50% high).
                // If we have note at 50% (visible) and note at 80% (approaching? no).
                // If we have note at 50% (visible, not approaching) and note at 20% (approaching).
                // We process 20% first. It isApproaching. 
                // We process 50% next. It is NOT approaching.
                // Logic holds.

                // What if we have note at 20% (approaching). coveredPitches adds it.
                // Note at 50% (approaching). coveredPitches has it -> false. 
                // Result: Lower note gets line. Higher note doesn't. Correct.

                active.push({
                    id: `${note.name}-${note.ticks}`,
                    left: `${left}%`,
                    width: `${width}%`,
                    bottom: `${bottomPct}%`,
                    height: `${heightPct}%`,
                    isBlack,
                    name: note.name,
                    color: note.color,
                    isApproaching,
                    isActive
                });
            }
        }

        return active;
    }, [midi, currentTick, allNotes, maxDuration, playbackRate, lookAheadTicks]);


    return (
        <div className="relative h-full w-full overflow-hidden bg-transparent perspective-500">
            {/* Octave Guidelines (C-to-C sections) */}
            {Array.from({ length: 9 }).map((_, i) => {
                // C1 starts at index 0 of white keys? No.
                // Formula: getNotePosition uses MIDI 21 (A0).
                // Cs are: C1(24), C2(36), C3(48), ...
                // Let's render lines for C notes.
                const octave = i + 1; // C1 to C8
                const midiC = 24 + (i * 12);
                if (midiC > 108) return null;
                const { left } = getNotePosition(midiC);
                return (
                    <div
                        key={`guide-c-${octave}`}
                        className="absolute top-0 bottom-0 w-[1px] bg-white/5 pointer-events-none z-0"
                        style={{ left: `${left}%` }}
                    />
                );
            })}

            {visibleNotes.map(note => (
                <div key={note.id}>
                    {/* Connecting Line (Approaching) */}
                    {note.isApproaching && (
                        <div
                            className="absolute z-0 w-[1px] bg-white/20 transition-opacity duration-200"
                            style={{
                                left: `calc(${note.left} + ${parseFloat(note.width) / 2}%)`,
                                bottom: 0,
                                height: `${note.bottom}`,
                                width: "1px",
                                background: `linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,0.3))`, // Ghost white
                                opacity: Math.max(0, 1 - (parseFloat(note.bottom) / ((lookAheadTicks > 0 ? (lookAheadTicks / (6 * midi!.header.ppq)) * 100 : 15 / playbackRate))))
                            }}
                        />
                    )}

                    {/* Hit Flash / Punch Effect (Active) */}
                    {note.isActive && (
                        <div
                            key={`${note.id}-flash`}
                            className="absolute z-30"
                            style={{
                                left: note.left,
                                width: note.width,
                                bottom: "0px",
                                height: "30px", // Vertical flash
                                background: `linear-gradient(to top, ${note.color}ff, ${note.color}00)`, // Fade up
                                opacity: 0.8,
                                transformOrigin: "bottom center",
                                animation: "ping 0.4s cubic-bezier(0,0,0.2,1) 1 forwards", // Reuse ping but clamped
                                filter: 'blur(2px)' // Soft glare
                            }}
                        />
                    )}

                    {/* Note Body */}
                    <div
                        className={twMerge(
                            "absolute rounded-sm opacity-90 shadow-sm transition-transform",
                            note.isBlack ? "z-20" : "z-10",
                            note.isActive && "brightness-125"
                        )}
                        style={{
                            left: note.left,
                            width: note.width,
                            bottom: note.bottom,
                            height: note.height,
                            background: `linear-gradient(to top, ${note.color}, ${note.color}80)`,
                            border: `1px solid ${note.color}`,
                            boxShadow: note.isActive ? `0 0 20px ${note.color}, 0 0 10px white` : `0 0 15px ${note.color}80, 0 0 5px ${note.color} inset`,
                            borderRadius: "4px",
                            zIndex: note.isBlack ? 20 : 10,
                        }}
                    >
                    </div>
                </div>
            ))}
        </div>
    );
}
