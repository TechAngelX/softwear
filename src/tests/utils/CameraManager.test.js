// src/tests/utils/CameraManager.test.js

import cameraManager from '../../utils/CameraManager';
import { Camera } from '@mediapipe/camera_utils';

// A Singleton test. Mock the MediaPipe Camera class to prevent it from trying to access a real camera
jest.mock('@mediapipe/camera_utils', () => ({
    Camera: jest.fn().mockImplementation(() => ({
        start: jest.fn(() => Promise.resolve()),
        stop: jest.fn(),
    })),
}));

describe('CameraManager', () => {
    let mockVideoElement;
    let mockOnFrameCallback;
    let mockCameraInstance;

    beforeEach(() => {
        mockVideoElement = document.createElement('video');
        mockOnFrameCallback = jest.fn();
        mockCameraInstance = {
            start: jest.fn(() => Promise.resolve()),
            stop: jest.fn(),
        };
        cameraManager.cameraInstance = null;
        Camera.mockClear();
    });

    test('should start the camera correctly when startCamera is called', async () => {
        const expectedWidth = 1280;
        const expectedHeight = 720;

        await cameraManager.startCamera(mockVideoElement, mockOnFrameCallback);

        expect(Camera).toHaveBeenCalledWith(mockVideoElement, {
            onFrame: expect.any(Function),
            width: expectedWidth,
            height: expectedHeight
        });
        expect(cameraManager.cameraInstance.start).toHaveBeenCalledTimes(1);
    });

    test('should stop the camera correctly when stopCamera is called', async () => {
        cameraManager.cameraInstance = mockCameraInstance;

        cameraManager.stopCamera();

        expect(mockCameraInstance.stop).toHaveBeenCalledTimes(1);
        expect(cameraManager.cameraInstance).toBeNull();
    });

    test('should not start the camera if it is already running', async () => {
        await cameraManager.startCamera(mockVideoElement, mockOnFrameCallback);
        const firstCameraInstance = cameraManager.cameraInstance;

        await cameraManager.startCamera(mockVideoElement, mockOnFrameCallback);

        expect(Camera).toHaveBeenCalledTimes(1);
        expect(firstCameraInstance.start).toHaveBeenCalledTimes(1);
        expect(cameraManager.cameraInstance).toBe(firstCameraInstance);
    });

    test('should toggle detection on the camera feed', () => {
        cameraManager.setDetection(false);

        expect(cameraManager.isDetecting).toBe(false);

        cameraManager.setDetection(true);

        expect(cameraManager.isDetecting).toBe(true);
    });
});
