// src/tests/integration/CameraPoseIntegration.test.js

import cameraManager from '../../utils/CameraManager';

// Mock MediaPipe
jest.mock('@mediapipe/holistic', () => ({
    Holistic: jest.fn().mockImplementation(() => ({
        setOptions: jest.fn(),
        initialize: jest.fn().mockResolvedValue(undefined),
        onResults: jest.fn(),
        send: jest.fn().mockResolvedValue(undefined)
    }))
}));

// Mock Camera utils
jest.mock('@mediapipe/camera_utils', () => ({
    Camera: jest.fn().mockImplementation((videoElement, config) => ({
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn()
    }))
}));

describe('Camera-Pose Integration', () => {
    beforeEach(() => {
        global.navigator.mediaDevices = {
            getUserMedia: jest.fn().mockResolvedValue({
                getTracks: () => [{ stop: jest.fn() }]
            })
        };
    });

    test('should initialize camera manager singleton', async () => {
        const mockVideo = document.createElement('video');
        const mockOnFrame = jest.fn();

        await cameraManager.startCamera(mockVideo, mockOnFrame);

        expect(cameraManager.cameraInstance).toBeDefined();
    });

    test('should handle camera singleton pattern', async () => {
        const mockVideo = document.createElement('video');
        const mockOnFrame = jest.fn();

        // First call
        const camera1 = await cameraManager.startCamera(mockVideo, mockOnFrame);

        // Second call should return same instance
        const camera2 = await cameraManager.startCamera(mockVideo, mockOnFrame);

        expect(camera1).toBe(camera2);
    });

    test('should stop camera properly', () => {
        cameraManager.stopCamera();
        expect(cameraManager.cameraInstance).toBeNull();
    });
});
