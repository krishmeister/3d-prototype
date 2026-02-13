'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import './LandscapePrompt.css';

/**
 * Shows a full-screen overlay on mobile when the device is in portrait mode,
 * prompting the user to rotate to landscape. Also handles requesting
 * fullscreen + orientation lock when the experience starts.
 */
export function LandscapePrompt() {
    const isMobile = useStore((s) => s.isMobile);
    const phase = useStore((s) => s.phase);
    const [isPortrait, setIsPortrait] = useState(false);

    // Detect portrait/landscape
    useEffect(() => {
        if (!isMobile) return;

        const checkOrientation = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, [isMobile]);

    // Request fullscreen and lock orientation when entering explore phase
    useEffect(() => {
        if (!isMobile || phase !== 'explore') return;

        const requestFullscreenAndLandscape = async () => {
            try {
                // Request fullscreen
                const doc = document.documentElement;
                if (doc.requestFullscreen) {
                    await doc.requestFullscreen();
                } else if ((doc as any).webkitRequestFullscreen) {
                    await (doc as any).webkitRequestFullscreen();
                }
            } catch (e) {
                console.log('[LandscapePrompt] Fullscreen request failed:', e);
            }

            try {
                // Lock to landscape
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape');
                }
            } catch (e) {
                console.log('[LandscapePrompt] Orientation lock failed (may not be supported):', e);
            }
        };

        requestFullscreenAndLandscape();
    }, [isMobile, phase]);

    // Don't show on desktop or if already in landscape
    if (!isMobile || !isPortrait) return null;

    return (
        <div className="landscape-prompt-overlay">
            <div className="landscape-prompt-content">
                <div className="landscape-prompt-icon">
                    <svg viewBox="0 0 100 80" width="80" height="64" fill="none" stroke="white" strokeWidth="3">
                        {/* Phone shape */}
                        <rect x="30" y="5" width="40" height="70" rx="6" />
                        {/* Rotation arrow */}
                        <path d="M15 40 C15 15, 85 15, 85 40" strokeDasharray="4 2" />
                        <polygon points="85,35 85,45 78,40" fill="white" stroke="none" />
                    </svg>
                </div>
                <h2 className="landscape-prompt-title">Rotate Your Device</h2>
                <p className="landscape-prompt-text">
                    For the best experience, please rotate your device to landscape mode
                </p>
            </div>
        </div>
    );
}
