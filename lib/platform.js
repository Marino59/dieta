'use client';

import { useState, useEffect } from 'react';

/**
 * Rileva il sistema operativo e l'ambiente del dispositivo.
 */
export function getPlatformInfo() {
    if (typeof window === 'undefined') {
        return {
            isIOS: false,
            isAndroid: false,
            isMobile: false,
            platform: 'desktop',
            isReady: false
        };
    }

    const ua = navigator.userAgent || '';
    // Rileva iPhone, iPod, iPad e iPadOS 13+ che si presenta come Macintosh touch
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
    const isAndroid = /Android/.test(ua);
    const isMobile = isIOS || isAndroid || /Mobile/.test(ua);
    const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

    return {
        isIOS,
        isAndroid,
        isMobile,
        platform,
        isReady: true
    };
}

/**
 * Hook React per accedere alle informazioni di piattaforma nei componenti.
 */
export function usePlatform() {
    const [info, setInfo] = useState({
        isIOS: false,
        isAndroid: false,
        isMobile: false,
        platform: 'unknown',
        isReady: false
    });

    useEffect(() => {
        setInfo(getPlatformInfo());
    }, []);

    return info;
}
