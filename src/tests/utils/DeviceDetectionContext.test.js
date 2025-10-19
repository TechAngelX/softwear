// src/tests/utils/DeviceDetectionContext.test.js

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useDeviceDetection, DeviceDetectionProvider } from '../../utils/DeviceDetectionContext';

describe('DeviceDetectionContext', () => {
    const originalWindow = { ...window };
    const originalNavigator = { ...navigator };

    const setupMocks = (width, height, hasTouch = false) => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
        Object.defineProperty(navigator, 'maxTouchPoints', { writable: true, configurable: true, value: hasTouch ? 1 : 0 });

        if (hasTouch) {
            Object.defineProperty(window, 'ontouchstart', { writable: true, configurable: true, value: {} });
        } else {
            delete window.ontouchstart;
        }
    };

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalWindow.innerWidth });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalWindow.innerHeight });
        Object.defineProperty(navigator, 'maxTouchPoints', { writable: true, configurable: true, value: originalNavigator.maxTouchPoints });
        delete window.ontouchstart;
        jest.clearAllTimers();
    });

    test('should detect desktop device on initial render', () => {
        setupMocks(1920, 1080, false);
        const { result } = renderHook(() => useDeviceDetection(), { wrapper: DeviceDetectionProvider });

        expect(result.current.deviceInfo.isDesktop).toBe(true);
        expect(result.current.deviceInfo.isMobile).toBe(false);
        expect(result.current.deviceInfo.isTablet).toBe(false);
        expect(result.current.deviceInfo.deviceType).toBe('desktop');
        expect(result.current.deviceInfo.orientation).toBe('landscape');
    });

    test('should detect mobile device based on width', () => {
        setupMocks(500, 800, false);
        const { result } = renderHook(() => useDeviceDetection(), { wrapper: DeviceDetectionProvider });

        expect(result.current.deviceInfo.isMobile).toBe(true);
        expect(result.current.deviceInfo.isDesktop).toBe(false);
        expect(result.current.deviceInfo.isTablet).toBe(false);
        expect(result.current.deviceInfo.deviceType).toBe('mobile');
        expect(result.current.deviceInfo.orientation).toBe('portrait');
    });

    test('should detect mobile device based on touch support', () => {
        setupMocks(600, 400, true);
        const { result } = renderHook(() => useDeviceDetection(), { wrapper: DeviceDetectionProvider });

        expect(result.current.deviceInfo.isMobile).toBe(true);
        expect(result.current.deviceInfo.isDesktop).toBe(false);
        expect(result.current.deviceInfo.isTablet).toBe(false);
        expect(result.current.deviceInfo.deviceType).toBe('mobile');
    });

    test('should detect tablet device', () => {
        setupMocks(900, 600, false);
        const { result } = renderHook(() => useDeviceDetection(), { wrapper: DeviceDetectionProvider });

        expect(result.current.deviceInfo.isTablet).toBe(true);
        expect(result.current.deviceInfo.isMobile).toBe(false);
        expect(result.current.deviceInfo.isDesktop).toBe(false);
        expect(result.current.deviceInfo.deviceType).toBe('tablet');
    });

    test('should update on window resize event', () => {
        setupMocks(1920, 1080, false);
        const { result } = renderHook(() => useDeviceDetection(), { wrapper: DeviceDetectionProvider });

        expect(result.current.deviceInfo.isDesktop).toBe(true);

        act(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
            window.dispatchEvent(new Event('resize'));
        });

        expect(result.current.deviceInfo.isMobile).toBe(true);
        expect(result.current.deviceInfo.deviceType).toBe('mobile');
    });

    test('should handle orientation changes', () => {
        jest.useFakeTimers();
        setupMocks(500, 800, true);
        const { result } = renderHook(() => useDeviceDetection(), { wrapper: DeviceDetectionProvider });

        expect(result.current.deviceInfo.isPortrait).toBe(true);

        act(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
            Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 500 });
            window.dispatchEvent(new Event('orientationchange'));

            jest.advanceTimersByTime(200);
        });

        expect(result.current.deviceInfo.orientation).toBe('landscape');

        jest.useRealTimers();
    });
});
