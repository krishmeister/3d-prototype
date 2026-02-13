'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group, Box3, Vector3, MeshStandardMaterial, Color, RepeatWrapping } from 'three';

// Material names that contain the Playboy logo
const LOGO_WALL_MATERIAL = 'Model001_Material128_32';   // Large logo on sandstone wall
const LOGO_GREEN_MATERIAL = 'Model001_Material128_34';  // Small logo on green fabric

// Material names associated with pendant hanging lights
const PENDANT_LIGHT_MATERIALS = new Set([
    'Model001_Material128_57',
    'Model001_Material128_58',
    'Model001_Material128_87',
    'Model001_Material128_60',
    'Model001_Material128_61',
    'Model001_Material128_62',
    'Model001_Material128_63',
    'Model001_Material128_92',
    'Model001_Material128_93',
]);

export interface LightPosition {
    id: string;
    position: [number, number, number];
}

export function Apartment() {
    const { scene } = useGLTF('/wiser-apartment2.glb');
    const groupRef = useRef<Group>(null);

    // Step 1: Reposition the scene and fix materials (runs before paint)
    useLayoutEffect(() => {
        const box = new Box3().setFromObject(scene);
        const center = new Vector3();
        box.getCenter(center);

        // Offset the primitive so the center of the floor is at [0,0,0]
        scene.position.x = -center.x;
        scene.position.y = -box.min.y;
        scene.position.z = -center.z;

        // First pass: collect a reference sandstone wall texture
        let wallTexture: any = null;
        scene.traverse((obj) => {
            if (obj instanceof Mesh) {
                const mat = obj.material as MeshStandardMaterial;
                if (mat?.name === 'Model001_Material128_0' && mat.map) {
                    wallTexture = mat.map;
                }
            }
        });

        // Second pass: replace logo materials and set shadows
        scene.traverse((obj) => {
            if (obj instanceof Mesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;

                const mat = obj.material as MeshStandardMaterial;

                if (mat?.name === LOGO_WALL_MATERIAL && wallTexture) {
                    const newMat = mat.clone();
                    newMat.map = wallTexture.clone();
                    newMat.map.wrapS = RepeatWrapping;
                    newMat.map.wrapT = RepeatWrapping;
                    newMat.map.repeat.set(2, 2);
                    newMat.map.needsUpdate = true;
                    newMat.needsUpdate = true;
                    obj.material = newMat;
                }

                if (mat?.name === LOGO_GREEN_MATERIAL) {
                    const newMat = mat.clone();
                    newMat.map = null;
                    newMat.color = new Color(0x1a3a1a);
                    newMat.needsUpdate = true;
                    obj.material = newMat;
                }
            }
        });
    }, [scene]);

    return (
        <group ref={groupRef} name="apartment-group">
            <primitive object={scene} name="apartment-model" />
        </group>
    );
}

useGLTF.preload('/wiser-apartment2.glb');
