'use client';

import React, { useLayoutEffect, useRef, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group, Box3, Vector3, MeshStandardMaterial, TextureLoader, Color, RepeatWrapping } from 'three';

// Material names that contain the Playboy logo
const LOGO_WALL_MATERIAL = 'Model001_Material128_32';   // Large logo on sandstone wall
const LOGO_GREEN_MATERIAL = 'Model001_Material128_34';  // Small logo on green fabric

// Material names associated with pendant hanging lights
// These were identified by extracting textures and matching to the dome-shaped lamp meshes
const PENDANT_LIGHT_MATERIALS = new Set([
    'Model001_Material128_57', // Lamp shade/body (room 1)
    'Model001_Material128_58', // Lamp chain/fixture (room 1)
    'Model001_Material128_87', // Lamp detail (room 1)
    'Model001_Material128_60', // Lamp bar/rail (room 2)
    'Model001_Material128_61', // Lamp shade/body (room 2)
    'Model001_Material128_62', // Lamp wire (room 2)
    'Model001_Material128_63', // Lamp bottom (room 2)
    'Model001_Material128_92', // Lamp detail (room 2)
    'Model001_Material128_93', // Lamp detail (room 2)
]);

export interface LightPosition {
    id: string;
    position: [number, number, number];
}

interface ApartmentProps {
    onLightsDetected?: (lights: LightPosition[]) => void;
}

export function Apartment({ onLightsDetected }: ApartmentProps) {
    const { scene } = useGLTF('/wiser-apartment2.glb');
    const groupRef = useRef<Group>(null);
    const lightsDetectedRef = useRef(false);

    useLayoutEffect(() => {
        // Calculate the bounding box of the model to auto-center and ground it
        const box = new Box3().setFromObject(scene);
        const center = new Vector3();
        box.getCenter(center);
        const size = new Vector3();
        box.getSize(size);

        // Offset the primitive so the center of the floor is at [0,0,0]
        // We want the BOTTOM of the box to be at Y=0
        scene.position.x = -center.x;
        scene.position.y = -box.min.y;
        scene.position.z = -center.z;

        // Force ALL child world matrices to update with the new position offset
        // This is critical for consistent light detection across environments
        scene.updateMatrixWorld(true);

        // First pass: collect a reference sandstone wall texture from a known wall material
        let wallTexture: any = null;
        scene.traverse((obj) => {
            if (obj instanceof Mesh) {
                const mat = obj.material as MeshStandardMaterial;
                if (mat?.name === 'Model001_Material128_0' && mat.map) {
                    wallTexture = mat.map;
                }
            }
        });

        // Collect pendant light world positions
        const lightMeshPositions: Map<string, Vector3[]> = new Map();

        // Second pass: replace logo materials, set shadows, and detect lights
        scene.traverse((obj) => {
            if (obj instanceof Mesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;

                const mat = obj.material as MeshStandardMaterial;

                // Replace the large Playboy wall logo with sandstone wall texture
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

                // Replace the small green fabric logo with plain green
                if (mat?.name === LOGO_GREEN_MATERIAL) {
                    const newMat = mat.clone();
                    newMat.map = null;
                    newMat.color = new Color(0x1a3a1a);
                    newMat.needsUpdate = true;
                    obj.material = newMat;
                }

                // Detect pendant light meshes
                if (PENDANT_LIGHT_MATERIALS.has(mat?.name)) {
                    // Get world position of this mesh
                    const worldPos = new Vector3();
                    obj.updateWorldMatrix(true, false);
                    const meshBox = new Box3().setFromObject(obj);
                    meshBox.getCenter(worldPos);

                    // Cluster by proximity (lights within 5 units of each other are one cluster)
                    let foundCluster = false;
                    for (const [key, positions] of lightMeshPositions) {
                        const clusterCenter = positions[0];
                        const dist = new Vector3(worldPos.x, 0, worldPos.z)
                            .distanceTo(new Vector3(clusterCenter.x, 0, clusterCenter.z));
                        if (dist < 5) {
                            positions.push(worldPos.clone());
                            foundCluster = true;
                            break;
                        }
                    }
                    if (!foundCluster) {
                        lightMeshPositions.set(`light_${lightMeshPositions.size}`, [worldPos.clone()]);
                    }
                }
            }
        });

        // Compute cluster centers and report
        if (!lightsDetectedRef.current && onLightsDetected) {
            const lights: LightPosition[] = [];
            let idx = 0;
            for (const [, positions] of lightMeshPositions) {
                const avg = new Vector3();
                positions.forEach(p => avg.add(p));
                avg.divideScalar(positions.length);
                lights.push({
                    id: `pendant_light_${idx}`,
                    position: [avg.x, 0.1, avg.z], // Place arrow at floor level under the light
                });
                idx++;
            }
            lightsDetectedRef.current = true;
            onLightsDetected(lights);
        }
    }, [scene, onLightsDetected]);

    return (
        <group ref={groupRef} name="apartment-group">
            <primitive object={scene} name="apartment-model" />
        </group>
    );
}

useGLTF.preload('/wiser-apartment2.glb');
