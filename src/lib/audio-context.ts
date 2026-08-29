import * as Tone from 'tone';

/**
 * iOS audio context recovery.
 *
 * Safari parks the AudioContext in a non-standard `'interrupted'` state when the
 * screen locks or a call arrives — not `'suspended'`, which is the only state the
 * app used to check for. Worse, `resume()` on an interrupted context returns a
 * promise that can hang indefinitely until the next user gesture, so awaiting it
 * wedges whatever called it: playback never starts and the tap looks dead.
 *
 * Everything here is written to fail open — never block the UI on the audio
 * context coming back.
 */

/** How long to wait for resume() before carrying on and reading the live state. */
const RESUME_TIMEOUT_MS = 2000;

/** Safari-only state, absent from the AudioContext typings. */
type ContextState = AudioContextState | 'interrupted';

export function audioContextState(): ContextState {
    try {
        return Tone.context.state as ContextState;
    } catch {
        return 'closed';
    }
}

/** True when the context is alive but parked — resumable, unlike 'closed'. */
export function isContextParked(): boolean {
    const state = audioContextState();
    return state === 'suspended' || state === 'interrupted';
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bring the audio context back if it is parked. Resolves to whether audio is
 * usable now. Safe to call from anywhere; a user gesture makes it far more
 * likely to succeed on iOS.
 */
export async function ensureAudioContext(): Promise<boolean> {
    if (!isContextParked()) {
        return audioContextState() === 'running';
    }

    try {
        // Tone.start() is context.resume(). Race it — on iOS it may never settle.
        await Promise.race([
            Tone.start().catch(() => undefined),
            delay(RESUME_TIMEOUT_MS),
        ]);
    } catch {
        // Fall through to the live state check below.
    }

    return audioContextState() === 'running';
}
