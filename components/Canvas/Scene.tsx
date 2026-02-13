'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Vector3, Raycaster, MathUtils } from 'three';
import { useStore } from '@/store/useStore';
import { Apartment } from './Apartment';
import { HereArrow } from './HereArrow';
import { PendantPointLight } from './PendantPointLight';

interface LightPosition {
    id: string;
    position: [number, number, number];
}

// Shared flag: true while the camera is animating from orbit → explore spawn
// This prevents MovementLogic from fighting with the GSAP tween
const transitionState = { active: false };

// Reusable vectors to avoid GC pressure every frame
const _camForward = new Vector3();
const _camRight = new Vector3();
const _targetDir = new Vector3();
const _nextPos = new Vector3();

function MovementLogic() {
    const { camera, scene } = useThree();
    const [, getKeys] = useKeyboardControls();
    const phase = useStore((state) => state.phase);
    const raycaster = useMemo(() => new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 100), []);

    useFrame((_, delta) => {
        // Skip during phase transition or non-explore
        if (phase !== 'explore' || transitionState.active) return;

        const { forward, backward, left, right, sprint } = getKeys();
        const moveFront = (forward ? 1 : 0) - (backward ? 1 : 0);
        const moveSide = (right ? 1 : 0) - (left ? 1 : 0);

        if (moveFront !== 0 || moveSide !== 0) {
            _camForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
            _camForward.y = 0;
            _camForward.normalize();

            _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
            _camRight.y = 0;
            _camRight.normalize();

            _targetDir.set(0, 0, 0)
                .addScaledVector(_camForward, moveFront)
                .addScaledVector(_camRight, moveSide);
            if (_targetDir.lengthSq() > 0) _targetDir.normalize();

            const speed = sprint ? 14 : 7;
            _targetDir.multiplyScalar(speed * delta);

            _nextPos.copy(camera.position).add(_targetDir);

            raycaster.ray.origin.set(_nextPos.x, camera.position.y, _nextPos.z);
            raycaster.ray.direction.set(0, -1, 0);
            raycaster.far = 100;

            const intersections = raycaster.intersectObjects(scene.children, true);

            if (intersections.length > 0) {
                const groundY = intersections[0].point.y;
                const currentFootY = camera.position.y - 1.7;

                if (groundY - currentFootY < 1.5) {
                    camera.position.x = _nextPos.x;
                    camera.position.z = _nextPos.z;
                    const targetHeight = groundY + 1.7;
                    // Faster lerp = snappier height tracking
                    camera.position.y = MathUtils.lerp(camera.position.y, targetHeight, Math.min(delta * 20, 1));
                }
            }
        } else {
            // Idle grounding
            raycaster.ray.origin.set(camera.position.x, camera.position.y + 1.0, camera.position.z);
            raycaster.ray.direction.set(0, -1, 0);
            const intersections = raycaster.intersectObjects(scene.children, true);
            if (intersections.length > 0) {
                const groundY = intersections[0].point.y;
                camera.position.y = MathUtils.lerp(camera.position.y, groundY + 1.7, Math.min(delta * 20, 1));
            }
        }
    });

    return null;
}

/**
 * Manages pointer lock state based on light proximity.
 * Unlocks when player enters proximity (shows cursor for phone UI).
 * Re-locks when player exits proximity (resumes FPS controls).
 */
function PointerLockManager({
    pointerLockRef,
    activeLightId,
    phase,
}: {
    pointerLockRef: React.RefObject<any>;
    activeLightId: string | null;
    phase: string;
}) {
    useEffect(() => {
        if (phase !== 'explore') return;
        const controls = pointerLockRef.current;
        if (!controls) return;

        if (activeLightId !== null) {
            // Player entered light proximity — unlock pointer for phone UI
            controls.unlock();
        } else {
            // Player left light proximity — re-lock pointer for FPS controls
            // Small delay to avoid conflicts with the unlock event
            const timer = setTimeout(() => {
                controls.lock();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [activeLightId, phase, pointerLockRef]);

    return null;
}

function CameraRig() {
    const { camera } = useThree();
    const phase = useStore((state) => state.phase);
    const activeLightId = useStore((state) => state.activeLightId);
    const dofRef = useRef<any>(null);
    const orbitRef = useRef<any>(null);
    const pointerLockRef = useRef<any>(null);

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
            // Block MovementLogic during the fly-in
            transitionState.active = true;

            // Fly smoothly FROM current orbit position TO spawn point
            // No sudden Y jump — the tween handles the full path
            gsap.to(camera.position, {
                x: -12,
                y: 1.7,
                z: 30,
                duration: 2.5,
                ease: 'power2.inOut',
                onUpdate: () => {
                    camera.lookAt(5, 2, 0);
                },
                onComplete: () => {
                    // Allow movement only after landing
                    transitionState.active = false;
                }
            });

            if (dofRef.current) {
                gsap.to(dofRef.current, {
                    focusDistance: 0.9,
                    focalLength: 0.01,
                    duration: 2.5,
                    ease: 'power2.inOut',
                });
            }
        }
    }, [phase, camera]);

    return (
        <>
            <EffectComposer multisampling={4}>
                <DepthOfField
                    ref={dofRef}
                    target={[0, 1, 0]}
                    focalLength={0.02}
                    bokehScale={2}
                    height={720}
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
                <PointerLockControls ref={pointerLockRef} />
            )}

            {/* Auto-unlock/lock pointer based on light proximity */}
            <PointerLockManager
                pointerLockRef={pointerLockRef}
                activeLightId={activeLightId}
                phase={phase}
            />

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
    const phase = useStore((state) => state.phase);
    const setActiveLightId = useStore((state) => state.setActiveLightId);

    // Hardcoded light positions to ensure stability and avoid runtime detection issues
    const lightPositions: LightPosition[] = useMemo(() => [
        { id: 'light_main_1', position: [4.2, 0.4, -10.5] },
        { id: 'light_main_2', position: [19.2, 0.4, -9.8] },
    ], []);

    // Removed handleLightsDetected as we are using fixed positions

    const handleProximityEnter = useCallback((id: string) => {
        console.log(`[HereArrow] Player entered proximity of: ${id}`);
        setActiveLightId(id);
    }, [setActiveLightId]);

    const handleProximityExit = useCallback((id: string) => {
        console.log(`[HereArrow] Player exited proximity of: ${id}`);
        setActiveLightId(null);
    }, [setActiveLightId]);

    useEffect(() => {
        setPhase('setup');
    }, [setPhase]);

    return (
        <div className="h-full w-full bg-black">
            <KeyboardControls map={map}>
                <Canvas
                    shadows
                    camera={{ fov: 45 }}
                    dpr={[1, 2]}
                    gl={{ antialias: true, powerPreference: 'high-performance' }}
                    performance={{ min: 0.5 }}
                >
                    <Suspense fallback={null}>
                        <CameraRig />
                        <Apartment />

                        {/* HereArrow markers near pendant lights - only visible in explore mode */}
                        {phase === 'explore' && lightPositions.map((light) => (
                            <HereArrow
                                key={light.id}
                                id={light.id}
                                position={light.position}
                                proximityRadius={3}
                                onProximityEnter={handleProximityEnter}
                                onProximityExit={handleProximityExit}
                            />
                        ))}

                        {/* Point lights near each pendant lamp, controlled by ON/OFF state */}
                        {lightPositions.map((light) => (
                            <PendantPointLight
                                key={`pl_${light.id}`}
                                lightId={light.id}
                                position={light.position}
                            />
                        ))}

                        <Sky sunPosition={[100, 20, 100]} />
                        <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                        <Environment preset="city" />
                        <directionalLight
                            position={[100, 20, 100]}
                            intensity={0.8}
                            castShadow
                            shadow-mapSize={[2048, 2048]}
                        >
                            <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50]} />
                        </directionalLight>
                        <ContactShadows
                            position={[0, -0.01, 0]}
                            opacity={0.4}
                            scale={50}
                            blur={2}
                            far={10}
                            resolution={512}
                            color="#000000"
                        />
                    </Suspense>
                </Canvas>
            </KeyboardControls>
        </div>
    );
}
