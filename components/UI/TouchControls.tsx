'use client';

import React, { useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import './TouchControls.css';

/**
 * Mobile touch controls: virtual joystick (left) + touch-look (right).
 * Only renders when isMobile is true and phase is 'explore'.
 */
export function TouchControls() {
    const isMobile = useStore((s) => s.isMobile);
    const phase = useStore((s) => s.phase);
    const setJoystickInput = useStore((s) => s.setJoystickInput);
    const setTouchLookDelta = useStore((s) => s.setTouchLookDelta);

    // Joystick state
    const joystickOrigin = useRef<{ x: number; y: number } | null>(null);
    const joystickTouchId = useRef<number | null>(null);
    const knobRef = useRef<HTMLDivElement>(null);

    // Touch-look state
    const lookTouchId = useRef<number | null>(null);
    const lastLookPos = useRef<{ x: number; y: number } | null>(null);

    // ── Joystick handlers ──
    const onJoystickStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        // Just take the first changed touch if we don't have one yet
        if (joystickTouchId.current !== null) return;

        const touch = e.changedTouches[0];
        joystickTouchId.current = touch.identifier;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        joystickOrigin.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    }, []);

    const onJoystickMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (joystickTouchId.current === null || !joystickOrigin.current || !knobRef.current) return;

        // Find the specific touch we are tracking
        let touch: React.Touch | undefined;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId.current) {
                touch = e.changedTouches[i];
                break;
            }
        }
        if (!touch) return; // The touch moving isn't the joystick one

        const maxDist = 42; // max knob travel in px
        let dx = touch.clientX - joystickOrigin.current.x;
        let dy = touch.clientY - joystickOrigin.current.y;

        // Clamp to circle
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        // Move knob visually
        knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Normalize to -1..1 and update store
        setJoystickInput(dx / maxDist, -dy / maxDist); // negative Y = forward
    }, [setJoystickInput]);

    const onJoystickEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (joystickTouchId.current === null) return;

        // Check if the ended touch is the joystick one
        let isJoystickTouch = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId.current) {
                isJoystickTouch = true;
                break;
            }
        }
        if (!isJoystickTouch) return;

        // Reset
        joystickTouchId.current = null;
        joystickOrigin.current = null;
        if (knobRef.current) {
            knobRef.current.style.transform = 'translate(-50%, -50%)';
        }
        setJoystickInput(0, 0);
    }, [setJoystickInput]);

    // ── Touch-look handlers ──
    const onLookStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (lookTouchId.current !== null) return;

        const touch = e.changedTouches[0];
        lookTouchId.current = touch.identifier;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
    }, []);

    const onLookMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (lookTouchId.current === null || !lastLookPos.current) return;

        // Find the specific touch we are tracking
        let touch: React.Touch | undefined;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookTouchId.current) {
                touch = e.changedTouches[i];
                break;
            }
        }
        if (!touch) return;

        const dx = touch.clientX - lastLookPos.current.x;
        const dy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };

        // Sensitivity multiplier
        setTouchLookDelta(dx * 0.003, dy * 0.003);
    }, [setTouchLookDelta]);

    const onLookEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (lookTouchId.current === null) return;

        // Check if the ended touch is the look one
        let isLookTouch = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookTouchId.current) {
                isLookTouch = true;
                break;
            }
        }
        if (!isLookTouch) return;

        lookTouchId.current = null;
        lastLookPos.current = null;
        setTouchLookDelta(0, 0);
    }, [setTouchLookDelta]);

    // Don't render on desktop or during setup
    if (!isMobile || phase !== 'explore') return null;

    return (
        <div className="touch-controls">
            {/* Left: Virtual Joystick */}
            <div
                className="joystick-zone"
                onTouchStart={onJoystickStart}
                onTouchMove={onJoystickMove}
                onTouchEnd={onJoystickEnd}
                onTouchCancel={onJoystickEnd}
            >
                <div className="joystick-base" />
                <div className="joystick-knob" ref={knobRef} />
            </div>

            {/* Right: Touch Look (Full Right Half) */}
            <div
                className="touch-look-zone"
                onTouchStart={onLookStart}
                onTouchMove={onLookMove}
                onTouchEnd={onLookEnd}
                onTouchCancel={onLookEnd}
            >
                <div className="look-hint-icon">👁</div>
            </div>
        </div>
    );
}
