import React, { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { createWhiteKeyShape, createBlackKeyProfile, PIANO_MEASUREMENTS } from './utils/keyGeometry';

export interface PianoKeyProps {
    type: 'white' | 'black' | 'left-cut' | 'right-cut' | 'middle-cut';
    position: [number, number, number];
    isPressed: boolean;
    note?: string; // Optional for debugging/labels
    idx?: number; // Optional index
}

const PLASTIC_COLOR = '#FDFDF5';
const BLACK_COLOR = '#111111';
const WOOD_COLOR = '#855E42'; // Darker "Shadowed Wood"

export function PianoKey({ type, position, isPressed }: PianoKeyProps) {
    const isBlack = type === 'black';

    // Geometry Generation
    const { capGeometry, bodyGeometry, blackGeometry } = useMemo(() => {
        if (isBlack) {
            // Black Key: Extrude trapezoid along Length
            const shape = createBlackKeyProfile();
            const extrudeSettings = {
                depth: PIANO_MEASUREMENTS.blackKey.length,
                bevelEnabled: true,
                bevelThickness: 0.5,
                bevelSize: 0.5,
                bevelSegments: 2,
            };
            const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

            // Standardise Local Origin: Front Face Center Bottom.
            // Extrude goes 0 -> +Depth. Move back so Front is at 0.
            geo.translate(0, 0, -PIANO_MEASUREMENTS.blackKey.length);

            return { blackGeometry: geo, capGeometry: null, bodyGeometry: null };
        } else {
            // White Key Construction
            // Map 'type' to shape generator type
            let shapeType: 'C_F' | 'D_G_A' | 'E_B' = 'C_F'; // Default
            if (type === 'left-cut') shapeType = 'E_B';
            if (type === 'right-cut') shapeType = 'C_F';
            if (type === 'middle-cut') shapeType = 'D_G_A';

            // 1. Plastic Cap (Top)
            const capShape = createWhiteKeyShape(shapeType, 0);
            const capExtrude = new THREE.ExtrudeGeometry(capShape, {
                depth: PIANO_MEASUREMENTS.whiteKey.plasticThickness,
                bevelEnabled: true,
                bevelThickness: 0.2, // Tiny bevel for plastic
                bevelSize: 0.2,
                bevelSegments: 3,
            });
            // Rotate to lie flat: Shape (X,Y) -> Mesh (X,-Z)
            capExtrude.rotateX(-Math.PI / 2);
            // Now UP is +Y (Thickness).
            // Lift Cap to Top
            capExtrude.translate(0, PIANO_MEASUREMENTS.whiteKey.height - PIANO_MEASUREMENTS.whiteKey.plasticThickness, 0);

            // 2. Wood Body (Bottom)
            const bodyShape = createWhiteKeyShape(shapeType, PIANO_MEASUREMENTS.whiteKey.lipOverhang);
            const bodyH = PIANO_MEASUREMENTS.whiteKey.height - PIANO_MEASUREMENTS.whiteKey.plasticThickness;
            const bodyExtrude = new THREE.ExtrudeGeometry(bodyShape, {
                depth: bodyH,
                bevelEnabled: false,
            });
            bodyExtrude.rotateX(-Math.PI / 2);

            return { capGeometry: capExtrude, bodyGeometry: bodyExtrude, blackGeometry: null };
        }
    }, [isBlack, type]);

    // --- RIGGING ---
    // User Requirement: "The Seesaw Lever"
    // Pivot is REAR (Negative Z). Mesh is FORWARD (Positive Z relative to Pivot).

    // Per GRAND_PIANO.md:
    // White Key Pivot: 230mm back.
    // Black Key Pivot: 200mm back.
    const PIVOT_LENGTH = isBlack ? 200 : 230;

    // Animation
    // Rotates the Lever Group.
    // Positive Rotation X -> Front (Positive Z) Dips Down (Negative Y).
    // Physics Tuning: Mass 0.5 (Fast), Tension 400 (Snappy), Friction 14 (Slight Bounce/Underdamped)
    const { rotation, color, emissive } = useSpring({
        rotation: isPressed ? [0.05, 0, 0] : [0, 0, 0], // ~2.8 degrees
        color: isPressed ? '#38bdf8' : (isBlack ? BLACK_COLOR : PLASTIC_COLOR),
        emissive: isPressed ? '#38bdf8' : '#000000',
        config: { mass: 0.5, tension: 400, friction: 14 }
    });

    return (
        // 1. Position the Pivot Point (The "Fulcrum") in World Space
        // 'position' prop from Keyboard3D should be the PIVOT COORDINATES.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <animated.group position={position}>

            {/* 2. Rotate the Lever (The "Arm") */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <animated.group rotation={rotation as any}>

                {/* 3. Offset the Visual Mesh FORWARD */}
                <group position={[0, 0, PIVOT_LENGTH]}>
                    {isBlack ? (
                        <mesh geometry={blackGeometry!} castShadow receiveShadow>
                            <animated.meshStandardMaterial
                                color={color}
                                emissive={emissive}
                                emissiveIntensity={isPressed ? 0.5 : 0}
                                roughness={0.1} // Satin/Semi-Gloss for Ebony
                                metalness={0.1}
                            />
                        </mesh>
                    ) : (
                        <group>
                            {/* Plastic Cap */}
                            <mesh geometry={capGeometry!} castShadow receiveShadow>
                                <animated.meshStandardMaterial
                                    color={color}
                                    emissive={emissive}
                                    emissiveIntensity={isPressed ? 0.5 : 0}
                                    roughness={0.15} // Slightly less mirror-like for Ivory/Plastic
                                    metalness={0.0}
                                />
                            </mesh>
                            {/* Wood Body */}
                            <mesh geometry={bodyGeometry!} castShadow receiveShadow>
                                <meshStandardMaterial
                                    color={WOOD_COLOR}
                                    roughness={0.9} // Matte
                                    metalness={0.0}
                                />
                            </mesh>
                        </group>
                    )}
                </group>
            </animated.group>
        </animated.group>
    );
}
