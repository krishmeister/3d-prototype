'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PointLight as ThreePointLight } from 'three';
import { useStore } from '@/store/useStore';

interface PendantPointLightProps {
    lightId: string;
    position: [number, number, number]; // The world position of the pendant lamp
}

/**
 * A 3D point light positioned near a pendant lamp.
 * Intensity is controlled by the store's lightStates.
 * Smoothly fades in/out when toggled.
 */
export function PendantPointLight({ lightId, position }: PendantPointLightProps) {
    const lightRef = useRef<ThreePointLight>(null);
    const isOn = useStore((s) => !!s.lightStates[lightId]);

    // Position the point light slightly below the pendant lamp center
    // (pendant center is at Y ≈ 2, so light emits from Y ≈ 1.8)
    const lightPos: [number, number, number] = [position[0], position[1] + 1.8, position[2]];

    useFrame((_, delta) => {
        if (!lightRef.current) return;
        const target = isOn ? 50 : 0;
        // Smooth fade
        lightRef.current.intensity += (target - lightRef.current.intensity) * Math.min(delta * 5, 1);
    });

    return (
        <pointLight
            ref={lightRef}
            position={lightPos}
            color="#ffeedd"
            intensity={0}
            distance={25}
            decay={2}
            castShadow={false}
        />
    );
}
