// src/tests/performance/MemoryLeaks.test.js

import cameraManager from '../../utils/CameraManager';

// Mock dependencies
jest.mock('@mediapipe/holistic', () => ({
    Holistic: jest.fn(() => ({
        setOptions: jest.fn(),
        initialize: jest.fn(),
        onResults: jest.fn(),
        close: jest.fn()
    }))
}));

// Mock MediaPipe Camera
jest.mock('@mediapipe/camera_utils', () => ({
    Camera: jest.fn().mockImplementation((videoElement, config) => ({
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn()
    }))
}));

describe('Memory Leak Tests', () => {
    beforeEach(() => {
        global.navigator.mediaDevices = {
            getUserMedia: jest.fn().mockResolvedValue({
                getTracks: () => [{ stop: jest.fn() }]
            })
        };
    });

    test('CameraManager cleanup prevents memory leaks', async () => {
        const initialMemory = process.memoryUsage().heapUsed;

        for (let i = 0; i < 10; i++) { 
            await cameraManager.startCamera(document.createElement('video'), () => {});
            cameraManager.stopCamera();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024); // Under 2MB
    });
});
