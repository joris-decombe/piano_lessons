declare module 'abcjs' {
    export interface MidiBuffer {
        duration: number;
        prime(): Promise<void>;
        start(): void;
        stop(): void;
        finished: boolean;
        percent: number;
        audioBuffers: AudioBuffer[];
    }

    export interface TuneObject {
        // Basic shape of the tune object returned by render
        visualObj: unknown;
    }

    export function renderAbc(
        output: string | HTMLElement,
        abc: string,
        params?: unknown
    ): TuneObject[];

    export namespace synth {
        export function getMidiFile(
            abc: string,
            params?: { midiOutputType?: "binary" }
        ): unknown;

        export class CreateSynth {
            constructor();
            init(params: {
                audioContext?: AudioContext;
                visualObj?: unknown;
            }): Promise<void>;
            prime(): Promise<void>;
            start(): void;
            stop(): void;
            audioBuffers: AudioBuffer[]; // Accessed by us
        }
    }
}
