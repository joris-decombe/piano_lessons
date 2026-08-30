import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stand-in for Tone's context, so we can drive it through the states iOS uses.
const tone = vi.hoisted(() => ({
    state: 'running' as string,
    start: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

vi.mock('tone', () => ({
    get context() {
        return {
            get state() {
                if (tone.state === 'THROW') throw new Error('context gone');
                return tone.state;
            },
        };
    },
    start: () => tone.start(),
}));

const { ensureAudioContext, isContextParked, audioContextState } = await import('@/lib/audio-context');

beforeEach(() => {
    tone.state = 'running';
    tone.start.mockReset();
    tone.start.mockImplementation(() => Promise.resolve());
});

describe('audio context recovery', () => {
    it('treats iOS\'s non-standard "interrupted" state as parked', () => {
        tone.state = 'interrupted';
        expect(isContextParked()).toBe(true);
        expect(audioContextState()).toBe('interrupted');

        tone.state = 'suspended';
        expect(isContextParked()).toBe(true);

        tone.state = 'running';
        expect(isContextParked()).toBe(false);
        // 'closed' is dead, not parked — resuming it cannot help.
        tone.state = 'closed';
        expect(isContextParked()).toBe(false);
    });

    it('does not touch a context that is already running', async () => {
        await expect(ensureAudioContext()).resolves.toBe(true);
        expect(tone.start).not.toHaveBeenCalled();
    });

    it('resumes an interrupted context', async () => {
        tone.state = 'interrupted';
        tone.start.mockImplementation(async () => { tone.state = 'running'; });

        await expect(ensureAudioContext()).resolves.toBe(true);
        expect(tone.start).toHaveBeenCalledTimes(1);
    });

    it('gives up rather than hanging when Safari never settles resume()', async () => {
        vi.useFakeTimers();
        tone.state = 'interrupted';
        // The bug: on iOS this promise can simply never resolve.
        tone.start.mockImplementation(() => new Promise<void>(() => {}));

        const pending = ensureAudioContext();
        await vi.advanceTimersByTimeAsync(2000);
        await expect(pending).resolves.toBe(false);
        vi.useRealTimers();
    });

    it('reports success if the context recovers while resume() is still pending', async () => {
        vi.useFakeTimers();
        tone.state = 'interrupted';
        tone.start.mockImplementation(() => new Promise<void>(() => {}));

        const pending = ensureAudioContext();
        tone.state = 'running'; // Safari came back without settling the promise
        await vi.advanceTimersByTimeAsync(2000);
        await expect(pending).resolves.toBe(true);
        vi.useRealTimers();
    });

    it('reports a context that throws on state access as closed, not parked', () => {
        tone.state = 'THROW';
        expect(audioContextState()).toBe('closed');
        expect(isContextParked()).toBe(false);
    });
});
