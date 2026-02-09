'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    Environment,
    ContactShadows,
    KeyboardControls,
    useKeyboardControls,
    PointerLockControls,
    Sky,
    Stars,
    Loader
} from '@react-three/drei';
import {
    EffectComposer,
    DepthOfField,
    Bloom,
    Noise
} from '@react-three/postprocessing';
import gsap from 'gsap';
import { Vector3, Raycaster } from 'three';
import { useStore } from '@/store/useStore';
import { Apartment } from './Apartment';

function MovementLogic() {
    const { camera, scene } = useThree();
    const [, getKeys] = useKeyboardControls();
    const phase = useStore((state) => state.phase);
    const velocity = useRef(new Vector3(0, 0, 0));
    // Raycaster looking down from high up to find the "roof" or "floor"
    const raycaster = useMemo(() => new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 100), []);

    useFrame((state, delta) => {
        if (phase !== 'explore') return;

        // --- MOVEMENT & COLLISION ---
        const { forward, backward, left, right, sprint } = getKeys();

        const moveFront = (forward ? 1 : 0) - (backward ? 1 : 0);
        const moveSide = (right ? 1 : 0) - (left ? 1 : 0);

        if (moveFront !== 0 || moveSide !== 0) {
            const camForward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            camForward.y = 0;
            camForward.normalize();

            const camRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            camRight.y = 0;
            camRight.normalize();

            const targetDir = new Vector3()
                .addScaledVector(camForward, moveFront)
                .addScaledVector(camRight, moveSide);

            if (targetDir.length() > 0) targetDir.normalize();

            // --- MOVEMENT LOGIC (No Wall Collision, Only Floor/Edge Check) ---
            const speed = sprint ? 14 : 7;
            const displacement = targetDir.multiplyScalar(speed * delta);

            // Predict next position
            const nextPos = camera.position.clone().add(displacement);

            // Raycast at NEXT position to check for floor/stairs/void
            // We cast from slightly higher to detect steps up
            raycaster.ray.origin.set(nextPos.x, camera.position.y + 2.0, nextPos.z);
            // Ensure we look down
            raycaster.ray.direction.set(0, -1, 0);
            raycaster.far = 100; // Reset render distance

            const intersections = raycaster.intersectObjects(scene.children, true);

            if (intersections.length > 0) {
                const groundY = intersections[0].point.y;
                const currentFootY = camera.position.y - 1.7;

                // STAIR/STEP LOGIC:
                // Increased threshold to 1.5 to allow climbing steeper/taller stairs
                if (groundY - currentFootY < 1.5) {
                    // Valid move
                    camera.position.x = nextPos.x;
                    camera.position.z = nextPos.z;

                    // Smoothly adjust height to new floor
                    const targetHeight = groundY + 1.7;
                    camera.position.y = gsap.utils.interpolate(camera.position.y, targetHeight, delta * 15);
                }
            } else {
                // Void/Edge detected - do not move X/Z (prevents falling off map)
            }
        } else {
            // Idle - just keep grounded at current position
            raycaster.ray.origin.set(camera.position.x, camera.position.y + 1.0, camera.position.z);
            raycaster.ray.direction.set(0, -1, 0);
            const intersections = raycaster.intersectObjects(scene.children, true);
            if (intersections.length > 0) {
                const groundY = intersections[0].point.y;
                camera.position.y = gsap.utils.interpolate(camera.position.y, groundY + 1.7, delta * 10);
            }
        }
    });

    return null;
}

function CameraRig() {
    const { camera } = useThree();
    const phase = useStore((state) => state.phase);
    const dofRef = useRef<any>(null);
    const orbitRef = useRef<any>(null);

    // Initial camera settings to fix clipping
    useEffect(() => {
        camera.near = 0.1;
        camera.far = 5000; // Majorly increase far plane
        camera.updateProjectionMatrix();

        // Initial setup camera - Professional perspective
        camera.position.set(30, 25, 40);
        camera.lookAt(0, 0, 0);
    }, [camera]);

    useEffect(() => {
        if (phase === 'setup') {
            gsap.to(camera.position, {
                x: 25,
                y: 20,
                z: 35,
                duration: 3,
                ease: 'power3.inOut',
            });

            if (orbitRef.current) {
                gsap.to(orbitRef.current.target, {
                    x: 0,
                    y: 0,
                    z: 0,
                    duration: 3,
                    ease: 'power3.inOut',
                });
            }
        } else if (phase === 'explore') {
            // Smoothly move into the territory
            // Initially stay high to avoid clipping through low ground
            camera.position.y = 50;

            gsap.to(camera.position, {
                x: 1,
                y: 1.7, // Target ground height
                z: 8,
                duration: 2.5,
                ease: 'power3.inOut',
                onUpdate: () => {
                    camera.lookAt(0, 2, 0); // Look at the house entrance
                }
            });

            if (dofRef.current) {
                gsap.to(dofRef.current, {
                    focusDistance: 0.9,
                    focalLength: 0.01,
                    duration: 2.5,
                    ease: 'power3.inOut',
                });
            }
        }
    }, [phase, camera]);

    return (
        <>
            <EffectComposer>
                <DepthOfField
                    ref={dofRef}
                    target={[0, 1, 0]}
                    focalLength={0.02}
                    bokehScale={2}
                    height={480}
                />
                <Bloom luminanceThreshold={2} mipmapBlur intensity={0.2} />
                <Noise opacity={0.02} />
            </EffectComposer>

            {phase === 'setup' ? (
                <OrbitControls
                    ref={orbitRef}
                    autoRotate
                    enableZoom={false}
                    maxPolarAngle={Math.PI / 2.1} // Stop looking below the floor
                    makeDefault
                />
            ) : (
                <PointerLockControls />
            )}

            <MovementLogic />
        </>
    );
}

export function Scene() {
    const map = useMemo(() => [
        { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
        { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
        { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
        { name: 'right', keys: ['ArrowRight', 'KeyD'] },
        { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
    ], []);

    const setPhase = useStore((state) => state.setPhase);

    useEffect(() => {
        setPhase('setup');
    }, [setPhase]);

    return (
        <div className="h-full w-full bg-black">
            <KeyboardControls map={map}>
                <Canvas shadows camera={{ fov: 45 }}>
                    <Suspense fallback={null}>
                        <CameraRig />
                        {/* The Apartment component now auto-grounds itself to [0,0,0] */}
                        <Apartment />
                        <Sky sunPosition={[100, 20, 100]} />
                        <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                        <Environment preset="city" />
                        <directionalLight
                            position={[100, 20, 100]}
                            intensity={0.8}
                            castShadow
                            shadow-mapSize={[1024, 1024]}
                        >
                            <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50]} />
                        </directionalLight>
                        <ContactShadows
                            position={[0, -0.01, 0]}
                            opacity={0.4}
                            scale={50}
                            blur={2}
                            far={10}
                            resolution={256}
                            color="#000000"
                        />
                    </Suspense>
                </Canvas>
            </KeyboardControls>
        </div>
    );
}
