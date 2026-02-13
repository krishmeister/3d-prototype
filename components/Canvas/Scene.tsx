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
    Bloom,
    Noise
} from '@react-three/postprocessing';
import gsap from 'gsap';
import { Vector3, Raycaster, MathUtils, Euler } from 'three';
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESKTOP: Keyboard + Mouse movement
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function MovementLogic() {
    const { camera, scene } = useThree();
    const [, getKeys] = useKeyboardControls();
    const phase = useStore((state) => state.phase);
    const raycaster = useMemo(() => new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 100), []);

    useFrame((_, delta) => {
        if (phase !== 'explore' || transitionState.active) return;

        // Optimization: Find the apartment model to raycast against specifically
        // This avoids checking every object in the scene (lights, stars, etc.)
        const apartmentModel = scene.getObjectByName('apartment-model');
        const raycastTarget = apartmentModel ? [apartmentModel] : scene.children;

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

            const speed = sprint ? 16 : 10;
            _targetDir.multiplyScalar(speed * delta);

            _nextPos.copy(camera.position).add(_targetDir);

            raycaster.ray.origin.set(_nextPos.x, camera.position.y, _nextPos.z);
            raycaster.ray.direction.set(0, -1, 0);
            raycaster.far = 100;

            const intersections = raycaster.intersectObjects(raycastTarget, true);

            if (intersections.length > 0) {
                const groundY = intersections[0].point.y;
                const currentFootY = camera.position.y - 1.7;

                if (groundY - currentFootY < 1.5) {
                    camera.position.x = _nextPos.x;
                    camera.position.z = _nextPos.z;
                    const targetHeight = groundY + 1.7;
                    camera.position.y = MathUtils.lerp(camera.position.y, targetHeight, Math.min(delta * 20, 1));
                }
            }
        } else {
            raycaster.ray.origin.set(camera.position.x, camera.position.y + 1.0, camera.position.z);
            raycaster.ray.direction.set(0, -1, 0);
            const intersections = raycaster.intersectObjects(raycastTarget, true);
            if (intersections.length > 0) {
                const groundY = intersections[0].point.y;
                camera.position.y = MathUtils.lerp(camera.position.y, groundY + 1.7, Math.min(delta * 20, 1));
            }
        }
    });

    return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOBILE: Touch joystick + swipe look movement
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function MobileMovementLogic() {
    const { camera, scene } = useThree();
    const phase = useStore((state) => state.phase);
    const raycaster = useMemo(() => new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 100), []);

    // Camera rotation state (euler angles)
    const cameraEuler = useRef(new Euler(0, 0, 0, 'YXZ'));

    useFrame((_, delta) => {
        if (phase !== 'explore' || transitionState.active) return;

        // Read touch inputs directly from store state (avoid subscription overhead)
        const { joystickInput, touchLookDelta } = useStore.getState();

        // ── Camera look (swipe) ──
        if (touchLookDelta.x !== 0 || touchLookDelta.y !== 0) {
            cameraEuler.current.setFromQuaternion(camera.quaternion);
            cameraEuler.current.y -= touchLookDelta.x;
            cameraEuler.current.x -= touchLookDelta.y;
            // Clamp vertical look to avoid flipping
            cameraEuler.current.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cameraEuler.current.x));
            camera.quaternion.setFromEuler(cameraEuler.current);

            // Reset delta after consuming
            useStore.getState().setTouchLookDelta(0, 0);
        }

        // ── Movement (joystick) ──
        const moveFront = joystickInput.y; // -1 to 1
        const moveSide = joystickInput.x;  // -1 to 1

        if (Math.abs(moveFront) > 0.05 || Math.abs(moveSide) > 0.05) {
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

            const speed = 8; // Slightly slower on mobile for control
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Pointer lock manager (desktop only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
            controls.unlock();
        } else {
            const timer = setTimeout(() => {
                controls.lock();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [activeLightId, phase, pointerLockRef]);

    return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESKTOP: Camera rig with post-processing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DesktopCameraRig() {
    const { camera } = useThree();
    const phase = useStore((state) => state.phase);
    const activeLightId = useStore((state) => state.activeLightId);
    const orbitRef = useRef<any>(null);
    const pointerLockRef = useRef<any>(null);

    useEffect(() => {
        camera.near = 0.1;
        camera.far = 5000;
        camera.updateProjectionMatrix();
        camera.position.set(30, 25, 40);
        camera.lookAt(0, 0, 0);
    }, [camera]);

    useEffect(() => {
        if (phase === 'setup') {
            gsap.to(camera.position, {
                x: 25, y: 20, z: 35,
                duration: 3,
                ease: 'power3.inOut',
            });
            if (orbitRef.current) {
                gsap.to(orbitRef.current.target, {
                    x: 0, y: 0, z: 0,
                    duration: 3,
                    ease: 'power3.inOut',
                });
            }
        } else if (phase === 'explore') {
            transitionState.active = true;
            gsap.to(camera.position, {
                x: -12, y: 1.7, z: 30,
                duration: 2.5,
                ease: 'power2.inOut',
                onUpdate: () => { camera.lookAt(5, 2, 0); },
                onComplete: () => { transitionState.active = false; }
            });
        }
    }, [phase, camera]);

    return (
        <>
            <EffectComposer multisampling={4}>
                <Bloom luminanceThreshold={2} mipmapBlur intensity={0.2} />
                <Noise opacity={0.02} />
            </EffectComposer>

            {phase === 'setup' ? (
                <OrbitControls
                    ref={orbitRef}
                    autoRotate
                    enableZoom={false}
                    maxPolarAngle={Math.PI / 2.1}
                    makeDefault
                />
            ) : (
                <PointerLockControls ref={pointerLockRef} />
            )}

            <PointerLockManager
                pointerLockRef={pointerLockRef}
                activeLightId={activeLightId}
                phase={phase}
            />

            <MovementLogic />
        </>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOBILE: Camera rig (no post-processing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function MobileCameraRig() {
    const { camera } = useThree();
    const phase = useStore((state) => state.phase);
    const orbitRef = useRef<any>(null);

    useEffect(() => {
        camera.near = 0.1;
        camera.far = 3000;
        camera.updateProjectionMatrix();
        camera.position.set(30, 25, 40);
        camera.lookAt(0, 0, 0);
    }, [camera]);

    useEffect(() => {
        if (phase === 'setup') {
            gsap.to(camera.position, {
                x: 25, y: 20, z: 35,
                duration: 3,
                ease: 'power3.inOut',
            });
            if (orbitRef.current) {
                gsap.to(orbitRef.current.target, {
                    x: 0, y: 0, z: 0,
                    duration: 3,
                    ease: 'power3.inOut',
                });
            }
        } else if (phase === 'explore') {
            transitionState.active = true;
            gsap.to(camera.position, {
                x: -12, y: 1.7, z: 30,
                duration: 2.5,
                ease: 'power2.inOut',
                onUpdate: () => { camera.lookAt(5, 2, 0); },
                onComplete: () => { transitionState.active = false; }
            });
        }
    }, [phase, camera]);

    return (
        <>
            {/* No EffectComposer on mobile for performance */}

            {phase === 'setup' ? (
                <OrbitControls
                    ref={orbitRef}
                    autoRotate
                    enableZoom={false}
                    maxPolarAngle={Math.PI / 2.1}
                    makeDefault
                    enableDamping
                />
            ) : null}
            {/* No PointerLockControls on mobile — touch-look handled by MobileMovementLogic */}

            <MobileMovementLogic />
        </>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Scene component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    const isMobile = useStore((state) => state.isMobile);

    // Hardcoded light positions
    const lightPositions: LightPosition[] = useMemo(() => [
        { id: 'light_main_1', position: [9.70, 1.6, -14.39] },
    ], []);

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

    // ── Shared scene content (used by both mobile & desktop) ──
    const sceneContent = (
        <Suspense fallback={null}>
            {isMobile ? <MobileCameraRig /> : <DesktopCameraRig />}
            <Apartment />

            {/* HereArrow markers */}
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

            {/* Point lights */}
            {lightPositions.map((light) => (
                <PendantPointLight
                    key={`pl_${light.id}`}
                    lightId={light.id}
                    position={light.position}
                />
            ))}

            <Sky sunPosition={[100, 20, 100]} />
            <Stars
                radius={300}
                depth={50}
                count={isMobile ? 500 : 5000}
                factor={4}
                saturation={0}
                fade
                speed={1}
            />
            <Environment preset="city" />
            <directionalLight
                position={[100, 20, 100]}
                intensity={0.8}
                castShadow={!isMobile}
                shadow-mapSize={isMobile ? [512, 512] : [2048, 2048]}
            >
                <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50]} />
            </directionalLight>
            {!isMobile && (
                <ContactShadows
                    position={[0, -0.01, 0]}
                    opacity={0.4}
                    scale={50}
                    blur={2}
                    far={10}
                    resolution={512}
                    color="#000000"
                />
            )}
        </Suspense>
    );

    // Mobile: no KeyboardControls wrapper needed
    if (isMobile) {
        return (
            <div className="h-full w-full bg-black">
                <Canvas
                    camera={{ fov: 55 }}
                    dpr={[1, 1]}
                    gl={{ antialias: false, powerPreference: 'high-performance' }}
                    performance={{ min: 0.3 }}
                >
                    {sceneContent}
                </Canvas>
            </div>
        );
    }

    // Desktop: full experience
    return (
        <div className="h-full w-full bg-black">
            <KeyboardControls map={map}>
                <Canvas
                    shadows
                    camera={{ fov: 45 }}
                    dpr={[1, 1.5]}
                    gl={{ antialias: true, powerPreference: 'high-performance' }}
                    performance={{ min: 0.5 }}
                >
                    {sceneContent}
                </Canvas>
            </KeyboardControls>
        </div>
    );
}
