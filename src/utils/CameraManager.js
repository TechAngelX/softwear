// src/utils/CameraManager.js

import { Camera } from '@mediapipe/camera_utils';

class CameraManager {
    constructor() {
        this.cameraInstance = null;
        this.onFrameCallback = null;
        this.isDetecting = true;
        this.lastProcessTime = 0;
        this.processingThrottle = 16;
    }

    async startCamera(videoElement, onFrameCallback) {
        if (this.cameraInstance) {
            return this.cameraInstance;
        }

        this.onFrameCallback = onFrameCallback;

        const isMobile = window.innerWidth <= 768;

        const throttledCallback = async () => {
            if (!this.onFrameCallback || !this.isDetecting) return;

            const now = performance.now();
            if (isMobile && (now - this.lastProcessTime) < this.processingThrottle) {
                return;
            }

            this.lastProcessTime = now;
            await this.onFrameCallback();
        };

        const cameraConfig = {
            onFrame: throttledCallback
        };

        if (isMobile) {
            cameraConfig.width = 640;
            cameraConfig.height = 480;
            cameraConfig.facingMode = 'user';
            cameraConfig.frameRate = { ideal: 30, max: 30 };
        } else {
            cameraConfig.width = 1280;
            cameraConfig.height = 720;
            cameraConfig.frameRate = { ideal: 30 };
        }

        this.cameraInstance = new Camera(videoElement, cameraConfig);

        try {
            await this.cameraInstance.start();
        } catch (error) {
            console.error('Failed to start camera:', error);

            // Cleanup first attempt
            if (this.cameraInstance) {
                this.cameraInstance.stop();
                this.cameraInstance = null;
            }

            // Retry with lower resolution
            this.cameraInstance = new Camera(videoElement, {
                onFrame: throttledCallback,
                width: isMobile ? 480 : 1280,
                height: isMobile ? 360 : 720
            });
            await this.cameraInstance.start();
        }

        return this.cameraInstance;
    }

    stopCamera() {
        if (this.cameraInstance) {
            this.cameraInstance.stop();
            this.cameraInstance = null;
            this.onFrameCallback = null;
            this.lastProcessTime = 0;
        }
    }

    setDetection(isDetecting) {
        this.isDetecting = isDetecting;
        if (!isDetecting) {
            this.lastProcessTime = 0;
        }
    }

    setMobileThrottle(ms) {
        this.processingThrottle = Math.max(16, ms);
    }

    getPerformanceInfo() {
        const isMobile = window.innerWidth <= 768;
        return {
            isMobile,
            throttle: this.processingThrottle,
            resolution: isMobile ? '640x480' : '1280x720',
            targetFPS: isMobile ? 30 : 30,
            isDetecting: this.isDetecting
        };
    }
}

const cameraManager = new CameraManager();
export default cameraManager;
