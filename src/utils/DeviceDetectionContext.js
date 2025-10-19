// src/utils/DeviceDetectionContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const DeviceDetectionContext = createContext();

export const useDeviceDetection = () => {
    const context = useContext(DeviceDetectionContext);
    if (!context) {
        throw new Error('useDeviceDetection must be used within a DeviceDetectionProvider');
    }
    return context;
};

export const DeviceDetectionProvider = ({ children }) => {
    const [deviceInfo, setDeviceInfo] = useState({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        deviceType: 'unknown',
        screenWidth: 0,
        screenHeight: 0,
        hasTouch: false,
        orientation: 'portrait',
        isPortrait: true
    });

    const [isMobileLayout, setIsMobileLayout] = useState(false);

    useEffect(() => {
        const detectDevice = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            const isMobile = width <= 768 || hasTouch;
            const isTablet = width > 768 && width <= 1024;
            const isDesktop = width > 1024 && !hasTouch;

            let deviceType = 'desktop';
            if (isMobile) deviceType = 'mobile';
            else if (isTablet) deviceType = 'tablet';

            let isPortrait = height > width;

            if (isMobile) {
                const aspectRatio = height / width;
                isPortrait = aspectRatio > 0.9 ||
                    window.orientation === 0 ||
                    window.orientation === 180 ||
                    (window.screen && window.screen.orientation &&
                        (window.screen.orientation.angle === 0 || window.screen.orientation.angle === 180));
            }

            const orientation = isPortrait ? 'portrait' : 'landscape';

            const newDeviceInfo = {
                isMobile,
                isTablet,
                isDesktop,
                deviceType,
                screenWidth: width,
                screenHeight: height,
                hasTouch,
                orientation,
                isPortrait: isPortrait
            };

            setDeviceInfo(newDeviceInfo);
            setIsMobileLayout(isMobile);
        };

        detectDevice();

        window.addEventListener('resize', detectDevice);
        window.addEventListener('orientationchange', () => {
            setTimeout(detectDevice, 150);
        });

        return () => {
            window.removeEventListener('resize', detectDevice);
            window.removeEventListener('orientationchange', detectDevice);
        };
    }, []);

    return (
        <DeviceDetectionContext.Provider value={{ deviceInfo, isMobileLayout }}>
            {children}
        </DeviceDetectionContext.Provider>
    );
};
