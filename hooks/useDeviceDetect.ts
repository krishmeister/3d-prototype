'use client';

import { useState, useEffect } from 'react';

interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
}

export function useDeviceDetect(): DeviceInfo {
    const [device, setDevice] = useState<DeviceInfo>({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
    });

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        const hasTouchScreen = navigator.maxTouchPoints > 0;
        const isMobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
        const isTabletUA = /ipad|tablet|playbook|silk/i.test(ua) ||
            (hasTouchScreen && !/mobi/i.test(ua) && window.innerWidth >= 768);

        if (isTabletUA) {
            setDevice({ isMobile: false, isTablet: true, isDesktop: false });
        } else if (isMobileUA || (hasTouchScreen && window.innerWidth < 768)) {
            setDevice({ isMobile: true, isTablet: false, isDesktop: false });
        } else {
            setDevice({ isMobile: false, isTablet: false, isDesktop: true });
        }
    }, []);

    return device;
}
