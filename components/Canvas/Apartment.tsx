'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group, Box3, Vector3 } from 'three';

export function Apartment() {
    const { scene } = useGLTF('/wiser-apartment2.glb');
    const groupRef = useRef<Group>(null);

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

        scene.traverse((obj) => {
            if (obj instanceof Mesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
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
