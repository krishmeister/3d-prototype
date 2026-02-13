'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, MeshStandardMaterial, Color, DoubleSide } from 'three';
import { useStore } from '@/store/useStore';

interface HereArrowProps {
    position: [number, number, number];
    id: string;
    proximityRadius?: number;
    onProximityEnter?: (id: string) => void;
    onProximityExit?: (id: string) => void;
}

/**
 * A floating, animated downward-pointing arrow marker.
 * Triggers proximity callbacks when the camera gets close.
 */
export function HereArrow({
    position,
    id,
    proximityRadius = 3,
    onProximityEnter,
    onProximityExit,
}: HereArrowProps) {
    const arrowRef = useRef<any>(null);
    const { camera } = useThree();
    const wasInside = useRef(false);

    // Arrow material - bright glowing green/cyan
    const material = useMemo(
        () =>
            new MeshStandardMaterial({
                color: new Color(0x00ffaa),
                emissive: new Color(0x00ff88),
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.85,
                side: DoubleSide,
            }),
        []
    );

    useFrame((state) => {
        if (!arrowRef.current) return;

        const t = state.clock.elapsedTime;

        // Bobbing animation
        arrowRef.current.position.y = position[1] + Math.sin(t * 2) * 0.15;

        // Slow rotation
        arrowRef.current.rotation.y = t * 1.5;

        // Pulsing scale
        const pulse = 1 + Math.sin(t * 3) * 0.1;
        arrowRef.current.scale.set(pulse, pulse, pulse);

        // Proximity detection
        const arrowPos = new Vector3(position[0], position[1], position[2]);
        const camPos = camera.position.clone();
        // Ignore Y for proximity (horizontal distance only)
        arrowPos.y = 0;
        camPos.y = 0;
        const dist = arrowPos.distanceTo(camPos);

        const isInside = dist < proximityRadius;

        if (isInside && !wasInside.current) {
            wasInside.current = true;
            onProximityEnter?.(id);
        } else if (!isInside && wasInside.current) {
            wasInside.current = false;
            onProximityExit?.(id);
        }
    });

    return (
        <group ref={arrowRef} position={position}>
            {/* Downward pointing arrow - cone shape */}
            <mesh material={material} rotation={[Math.PI, 0, 0]} position={[0, 0.3, 0]}>
                <coneGeometry args={[0.25, 0.5, 4]} />
            </mesh>

            {/* Thin stem above */}
            <mesh material={material} position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
            </mesh>

            {/* Glowing ring at base */}
            <mesh material={material} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.3, 0.03, 8, 24]} />
            </mesh>
        </group>
    );
}
