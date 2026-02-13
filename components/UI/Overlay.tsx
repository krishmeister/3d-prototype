'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function Overlay() {
    const phase = useStore((state) => state.phase);
    const startExperience = useStore((state) => state.startExperience);
    const isMobile = useStore((state) => state.isMobile);

    // Force reset to setup on full page load
    useEffect(() => {
        if (typeof window !== 'undefined' && window.performance.navigation.type === 1) {
            // Hard refresh or fresh load
        }
    }, []);
    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-center items-center">
            {/* Setup Phase UI */}
            <div
                className={`pointer-events-auto transition-all duration-1000 ease-in-out transform ${phase === 'setup' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}
            >
                <div className="bg-black/50 backdrop-blur-md p-8 rounded-2xl text-white text-center border border-white/10 shadow-2xl">
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">Wiser by Schneider</h1>
                    <p className="text-gray-200 mb-6 font-medium">Experience the Future of Living</p>
                    <button
                        id="start-button"
                        onClick={startExperience}
                        className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition-colors active:scale-95 transform"
                    >
                        Start Journey
                    </button>
                </div>
            </div>

            {/* Explore Phase UI */}
            <div
                className={`absolute bottom-12 pointer-events-auto transition-all duration-1000 ease-in-out transform ${phase === 'explore' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
            >
                <div className="bg-white/10 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full shadow-lg">
                    <p className="text-white/70 text-sm font-medium">
                        {isMobile
                            ? 'Use joystick to move • Swipe to look'
                            : 'WASD/Arrows to walk • Mouse to look'}
                    </p>
                </div>
            </div>
        </div>
    );
}

