import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { PianoKey, PianoKeyProps } from './PianoKey3D';
import { generatePianoLayout } from './pianoLayout';
import { GRAND_PIANO_LAYOUT, PIANO_MEASUREMENTS } from './utils/keyGeometry';

interface Keyboard3DProps {
    keys: ReturnType<typeof generatePianoLayout>;
    activeKeys: { note: string; color?: string; isPreview?: boolean }[];
}

/**
 * Stage Component: Renders the Keys and the Cabinetry.
 */
function PianoStage({ keys: layoutKeys, activeKeys }: Keyboard3DProps) {
    // Width of the full keyboard
    const totalWidth = 52 * PIANO_MEASUREMENTS.whiteKey.width;
    const halfWidth = totalWidth / 2;

    // Key Layout Calculation
    const keyElements = useMemo(() => {
        // Constants
        const OCTAVE_WIDTH = 165.2; // 7 * 23.6
        // A0 is the start. It is Note 9 (A) in Octave 0. Layout[9].x is 129.8.
        const A0_ABSOLUTE_X = 129.8;

        // Center the keyboard
        const centerShift = -totalWidth / 2;

        // Note Names for white/black check
        const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];



        return layoutKeys.map((key) => {
            const normalize = (n: string) => n.replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#");
            const target = normalize(key.note);
            const match = activeKeys.find(k => normalize(k.note) === target);
            const isPressed = match ? !match.isPreview : false;

            // Extract Note and Octave
            // Format "A0", "C#1" etc.
            // We can infer MIDI index or just parse.
            // A0 is standard start.
            // Let's rely on the iteration.

            // NOTE: layoutKeys starts at A0.
            // Ideally we need the MIDI index or a robust way to know 'NoteInOctave'.
            // Let's parse the note string.
            const noteLetter = key.note.replace(/\d+/, ''); // "A#", "C"
            const octaveStr = key.note.match(/-?\d+/)?.[0] || "0";
            const octave = parseInt(octaveStr);

            // Find Note Index in C-based Octave (0-11)
            const noteInOctave = NOTE_NAMES.indexOf(normalize(noteLetter));

            // Lookup Layout Config

            const layoutConfig = GRAND_PIANO_LAYOUT[noteInOctave];

            if (!layoutConfig) return null;

            // Calculate Absolute X from C0 (Where C0 = 0)
            const absoluteX = (octave * OCTAVE_WIDTH) + layoutConfig.x;

            // Shift so A0 is at 0 (Keyboard Start), then Center
            const xPos = (absoluteX - A0_ABSOLUTE_X) + centerShift;

            /* Legacy Logic Disabled
            let xPos = 0;

            if (key.isBlack) {
                // Black Key Logic
                // Base X is the Start of the Octave (C)
                // We need to know where "C" of this octave is relative to "A0".
                // Relative to C0 (MIDI 12):
                // Absolute Octave Index (from C0):
                // A0 is MIDI 21. C0 is 12.
                // Current MIDI = (octave + 1) * 12 + noteInOctave. (If C4 based? No standard scientific pitch).
                // Actually simpler:
                // Global White Index of C in this octave?
                // A0=0. B0=1. C1=2.
                // C(N) = 2 + (N-1)*7. 
                // Let's just calc relative to C0, then shift by A0's offset.

                // C0 is "Origin 0".
                // A0 is MIDI 21. C0 is MIDI 12.
                // A0 is 9 semitones above C0. 
                // (C, C#, D, D#, E, F, F#, G, G#, A).
                // White keys from C0 to A0: C, D, E, F, G, A (6th key? Index 5).
                // X_C0 = 0. X_A0 = 5 * W_WIDTH.

                // Current Key absolute MIDI (approx):
                // Octave * 12 + noteInOctave.
                // But `key.note` octave number might vary (Yamaha C3 vs C4).
                // Let's assume standard A0, C8.
                // Octave 0 contains A0, B0.
                // Octave 1 contains C1..B1.

                const absOctave = octave; // E.g. 0, 1, 8.

                // White Key Indicies from absolute C(-1)? 
                // Let's just use the `(Octave * 7 * W)` logic relative to C-basis.

                const octaveStartMM = absOctave * 7 * W_WIDTH;
                const offsetMM = BLACK_OFFSETS[noteInOctave] || 0;

                // Calculate Raw X from C-based origin (where C0 = 0)
                let rawX = octaveStartMM + offsetMM;

                // Shift to Center (Mesh is centered at 0)
                // The formula gives the LEFT EDGE. The mesh origin is CENTER.
                rawX += B_WIDTH / 2;

                // Correct for A0 being the start of the keyboard (Visual x=0).
                // A0 is in Octave 0. noteInOctave=9 (A).
                // A0 Raw X = (0 * 7 * W) + (Offset for A? A is white).
                // Wait, A0 is white.
                // A0 is the 6th white key of imaginary octave starting at C0.
                // Offset of A0 = 5 * W_WIDTH.
                // So subtract 5 * W_WIDTH from everything.

                // Refinements:
                // A#0 (Octave 0, Note 10).
                // RawX = (0) + Offset[10].
                // Offset[10] (A#) = 6*W - 0.35*B.
                // FinalX = (6*W - 0.35*B) - (5*W) = W - 0.35*B.
                // Correct: A# is between A and B.

                xPos = rawX - (5 * W_WIDTH);

            } else {
                // White Key Logic
                // Simple: Global White Index * Width
                xPos = globalWhiteIndex * W_WIDTH;
                globalWhiteIndex++;
            }

            */
            // End Legacy Logic


            // PIVOT Logic (Rear Pivot)
            const zPos = key.isBlack ? -250 : -230;
            const yPos = key.isBlack ? PIANO_MEASUREMENTS.whiteKey.height : 0;

            let type: PianoKeyProps['type'] = 'white';
            if (key.isBlack) {
                type = 'black';
            } else {
                const noteName = key.note.replace(/\d+/, '');
                if (['C', 'F'].includes(noteName)) type = 'right-cut';
                else if (['E', 'B'].includes(noteName)) type = 'left-cut';
                else type = 'middle-cut';
            }

            return (
                <PianoKey
                    key={key.note}
                    type={type}
                    position={[xPos, yPos, zPos]}
                    isPressed={isPressed}
                    note={key.note}
                />
            );
        });
    }, [layoutKeys, activeKeys, totalWidth]);

    // --- CABINETRY ---
    // Dimensions
    const BLOCK_WIDTH = 60;
    const BLOCK_HEIGHT = 40;
    // Key slip runs along front
    const SLIP_DEPTH = 20;

    return (
        <group>
            {/* 1. The Keys */}
            {keyElements}

            {/* 2. Cheek Blocks (Left/Right) - Glossy Black */}
            < mesh position={[-(halfWidth + BLOCK_WIDTH / 2), BLOCK_HEIGHT / 2 - 5, -80]} receiveShadow castShadow >
                <boxGeometry args={[BLOCK_WIDTH, BLOCK_HEIGHT, 260]} />
                <meshStandardMaterial color="#050505" roughness={0.05} metalness={0.1} />
            </mesh >
            <mesh position={[(halfWidth + BLOCK_WIDTH / 2), BLOCK_HEIGHT / 2 - 5, -80]} receiveShadow castShadow>
                <boxGeometry args={[BLOCK_WIDTH, BLOCK_HEIGHT, 260]} />
                <meshStandardMaterial color="#050505" roughness={0.05} metalness={0.1} />
            </mesh>

            {/* 3. Key Slip (Front Strip) - Matte/Satin Black */}
            <mesh position={[0, 8, 25]} receiveShadow>
                <boxGeometry args={[totalWidth + (BLOCK_WIDTH * 2), 20, 20]} />
                <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.1} />
            </mesh>

            {/* 4. Fallboard (Back Wall) - High Gloss */}
            <mesh position={[0, 60, -260]} receiveShadow>
                {/* Placed behind the black key pivot area (-250) */}
                <boxGeometry args={[totalWidth + (BLOCK_WIDTH * 2), 140, 20]} />
                <meshStandardMaterial color="#050505" roughness={0.02} metalness={0.3} />
            </mesh>

            {/* 5. Keybed (The Floor) - Dark Red Felt */}
            {/* Lowered to y=-12 so top surface is at y=-2 to avoid Z-fighting with keys at y=0 */}
            <mesh position={[0, -12, -100]} receiveShadow>
                <boxGeometry args={[totalWidth + (BLOCK_WIDTH * 2) + 20, 20, 450]} />
                <meshStandardMaterial
                    color="#110000"
                    roughness={0.9}
                />
            </mesh>
        </group >
    );
}

export function Keyboard3D(props: Keyboard3DProps) {
    return (
        <div className="relative h-64 w-full bg-black rounded-b-xl overflow-hidden shadow-2xl">
            <Canvas shadows dpr={[1, 2]}>
                {/* 1. Camera: FIXED Player Perspective */}
                <PerspectiveCamera
                    makeDefault
                    position={[0, 350, 250]} // 35cm Up, 25cm Back
                    fov={45}
                    onUpdate={(c) => c.lookAt(0, 0, -50)} // Look just behind the front keys
                />

                {/* 2. Lighting: Moodier, less blown out */}
                <ambientLight intensity={0.2} />
                <directionalLight
                    position={[-100, 300, 100]} // High Left
                    intensity={0.5}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                    shadow-bias={-0.0001}
                />

                {/* 3. Environment: Soft Studio */}
                <Environment preset="studio" blur={1} />

                {/* 4. Contact Shadows for grounding */}
                <ContactShadows
                    position={[0, -0.1, 0]}
                    opacity={0.4}
                    scale={100}
                    blur={2}
                    far={10}
                />

                {/* 5. The Content */}
                <PianoStage {...props} />

                {/* 6. Controls (Restricted Vertical Angle) */}
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    maxPolarAngle={Math.PI / 2.2} // Prevent going under the floor
                    minPolarAngle={0}
                    target={[0, 0, -100]}
                />
            </Canvas>
        </div>
    );
}
