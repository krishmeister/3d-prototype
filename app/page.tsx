'use client';

import { useEffect } from 'react';
import { Scene } from '@/components/Canvas/Scene';
import { Overlay } from '@/components/UI/Overlay';
import { PhoneUI } from '@/components/UI/PhoneUI';
import { TouchControls } from '@/components/UI/TouchControls';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import { useStore } from '@/store/useStore';

export default function Home() {
    const { isMobile, isTablet } = useDeviceDetect();
    const setIsMobile = useStore((s) => s.setIsMobile);

    // Set device type in global store on mount
    useEffect(() => {
        setIsMobile(isMobile || isTablet);
    }, [isMobile, isTablet, setIsMobile]);

    return (
        <main className="h-screen w-full relative overflow-hidden bg-black">
            <div className="h-screen w-full absolute inset-0">
                <Scene />
            </div>
            <Overlay />
            <PhoneUI />
            <TouchControls />
        </main>
    );
}
