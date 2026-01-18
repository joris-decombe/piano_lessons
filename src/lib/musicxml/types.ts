
export interface NoteEvent {
    pitch: string; // e.g. "C4"
    duration: string; // e.g. "4", "2", "1" (quarter, half, whole) or ticks
    startTick: number;
    durationTicks: number;
    velocity: number;
    channel?: number;
}

export interface ParsedTrack {
    id: string;
    name?: string;
    instrument?: string;
    events: NoteEvent[];
}

export interface ParsedScore {
    title: string;
    tempo: number; // BPM
    timeSignature: [number, number]; // [numerator, denominator]
    tracks: ParsedTrack[];
}
