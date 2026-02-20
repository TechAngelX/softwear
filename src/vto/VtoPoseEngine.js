// src/vto/VtoPoseEngine.js
import * as THREE from 'three';
import { OneEuroFilter } from '../utils/OneEuroFilter';

const LANDMARKS = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
};

export class VtoPoseEngine {
    constructor() {
        this.targetPosition = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();
        this.targetScale = new THREE.Vector3(1, 1, 1);
        this.currentScale = new THREE.Vector3(1, 1, 1);
        this.currentRotation = new THREE.Quaternion();

        this.isMobile = window.innerWidth <= 768;
        this.lastValidLandmarks = null;
        this.trackingLost = false;
        this.lostFrameCount = 0;
        this.currentLandmarks = null;
        this.updateCount = 0;

        // Grace period: ~0.5s at 30fps before hiding garment
        this.lostFrameThreshold = 15;

        console.log('VtoPoseEngine: Initialized for mobile:', this.isMobile);

        const filterConfig = {
            freq: 30,
            mincutoff: this.isMobile ? 0.1 : 1.0,
            beta: this.isMobile ? 0.05 : 0.7,
            dcutoff: 1.0,
        };

        this.positionFilters = {
            x: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff),
            y: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff),
            z: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff),
        };

        this.rotationFilters = {
            x: new OneEuroFilter(filterConfig.freq, 0.2, 0.1, filterConfig.dcutoff),
            y: new OneEuroFilter(filterConfig.freq, 0.2, 0.1, filterConfig.dcutoff),
            z: new OneEuroFilter(filterConfig.freq, 0.2, 0.1, filterConfig.dcutoff),
            w: new OneEuroFilter(filterConfig.freq, 0.2, 0.1, filterConfig.dcutoff),
        };

        this.scaleFilter = new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, 0.1, filterConfig.dcutoff);
        this.shoulderMidpoint = new THREE.Vector3();
        this.hipMidpoint = new THREE.Vector3();
    }

    update(landmarks, garmentModel, camera) {
        this.updateCount++;
        this.currentLandmarks = landmarks;

        if (this.updateCount % 30 === 0) {
            console.log('VtoPoseEngine: Update called', {
                updateCount: this.updateCount,
                hasLandmarks: !!landmarks,
                landmarkCount: landmarks?.length || 0,
                hasModel: !!garmentModel,
                hasCamera: !!camera,
                modelVisible: garmentModel?.visible
            });
        }

        if (!landmarks || !garmentModel || !camera) {
            if(garmentModel) garmentModel.visible = false;
            return;
        }

        const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
        const leftHip = landmarks[LANDMARKS.LEFT_HIP];
        const rightHip = landmarks[LANDMARKS.RIGHT_HIP];

        if (this.updateCount % 30 === 0) {
            console.log('VtoPoseEngine: Key landmarks', {
                leftShoulder: leftShoulder ? {x: leftShoulder.x.toFixed(3), y: leftShoulder.y.toFixed(3), vis: leftShoulder.visibility.toFixed(3)} : null,
                rightShoulder: rightShoulder ? {x: rightShoulder.x.toFixed(3), y: rightShoulder.y.toFixed(3), vis: rightShoulder.visibility.toFixed(3)} : null,
                leftHip: leftHip ? {x: leftHip.x.toFixed(3), y: leftHip.y.toFixed(3), vis: leftHip.visibility.toFixed(3)} : null,
                rightHip: rightHip ? {x: rightHip.x.toFixed(3), y: rightHip.y.toFixed(3), vis: rightHip.visibility.toFixed(3)} : null
            });
        }

        const visibilityThreshold = this.isMobile ? 0.1 : 0.5;

        // Check which landmarks are visible
        const shouldersVisible = leftShoulder && rightShoulder &&
            leftShoulder.visibility > visibilityThreshold &&
            rightShoulder.visibility > visibilityThreshold;
        const hipsVisible = leftHip && rightHip &&
            leftHip.visibility > visibilityThreshold &&
            rightHip.visibility > visibilityThreshold;

        // Determine effective landmarks (with partial estimation)
        let effectiveLeftHip = leftHip;
        let effectiveRightHip = rightHip;
        let hasUsableLandmarks = shouldersVisible && hipsVisible;

        // Partial landmark fallback: estimate hips from shoulder width when hips aren't visible
        if (shouldersVisible && !hipsVisible) {
            const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
            const estimatedTorsoHeight = shoulderWidth * 1.3;
            const shoulderMidZ = (leftShoulder.z + rightShoulder.z) / 2;

            effectiveLeftHip = {
                x: leftShoulder.x,
                y: leftShoulder.y + estimatedTorsoHeight,
                z: shoulderMidZ,
                visibility: 0.3
            };
            effectiveRightHip = {
                x: rightShoulder.x,
                y: rightShoulder.y + estimatedTorsoHeight,
                z: shoulderMidZ,
                visibility: 0.3
            };
            hasUsableLandmarks = true;

            if (this.updateCount % 30 === 0) {
                console.log('VtoPoseEngine: Using estimated hip positions from shoulder width');
            }
        }

        if (!hasUsableLandmarks) {
            this.lostFrameCount++;

            // During grace period, hold garment at last valid position (freeze in place)
            if (this.lostFrameCount <= this.lostFrameThreshold && this.lastValidLandmarks) {
                // Keep garment visible but frozen at last known position
                garmentModel.visible = true;
                return;
            }

            // After grace period, hide garment
            if (this.lostFrameCount > this.lostFrameThreshold) {
                garmentModel.visible = false;
                this.trackingLost = true;
                if (this.updateCount % 30 === 0) {
                    console.log('VtoPoseEngine: Tracking lost - hiding garment');
                }
            }
            return;
        }

        this.lostFrameCount = 0;
        this.trackingLost = false;
        garmentModel.visible = true;
        this.lastValidLandmarks = { leftShoulder, rightShoulder, leftHip: effectiveLeftHip, rightHip: effectiveRightHip };

        const timestamp = Date.now();

        const shoulderMidpointX = (leftShoulder.x + rightShoulder.x) / 2;
        const shoulderMidpointY = (leftShoulder.y + rightShoulder.y) / 2;
        const hipMidpointY = (effectiveLeftHip.y + effectiveRightHip.y) / 1.8;
        const torsoCenterY = (shoulderMidpointY + hipMidpointY) / 2 - 0.05;
        const zOffset = (leftShoulder.z + rightShoulder.z) / 2;

        this.targetPosition.x = shoulderMidpointX;
        this.targetPosition.y = torsoCenterY;
        this.targetPosition.z = zOffset;

        this._projectToWorld(this.targetPosition, camera);

        this.shoulderMidpoint.set(shoulderMidpointX, shoulderMidpointY, (leftShoulder.z + rightShoulder.z) / 2);
        this.hipMidpoint.set((effectiveLeftHip.x + effectiveRightHip.x) / 2, hipMidpointY, (effectiveLeftHip.z + effectiveRightHip.z) / 2);
        const torsoHeight = this.shoulderMidpoint.distanceTo(this.hipMidpoint);

        const GARMENT_TORSO_HEIGHT_RATIO = this.isMobile ? 1.8 : 2.7;
        const targetScaleValue = Math.max(0.5, Math.min(2.0, torsoHeight * GARMENT_TORSO_HEIGHT_RATIO));

        const shoulderZDifference = leftShoulder.z - rightShoulder.z;
        const yawAngle = shoulderZDifference * 2.5;
        const targetRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle);

        const lerpFactor = this.isMobile ? 0.7 : 0.25;
        this.currentPosition.lerp(this.targetPosition, lerpFactor);
        this.currentScale.lerp(this.targetScale.set(targetScaleValue, targetScaleValue, targetScaleValue), lerpFactor);
        this.currentRotation.slerp(targetRotation, lerpFactor);

        garmentModel.position.copy(this.currentPosition);
        garmentModel.scale.copy(this.currentScale);
        garmentModel.quaternion.copy(this.currentRotation);

        if (this.updateCount % 30 === 0) {
            console.log('VtoPoseEngine: Garment updated', {
                position: {x: garmentModel.position.x.toFixed(3), y: garmentModel.position.y.toFixed(3), z: garmentModel.position.z.toFixed(3)},
                scale: garmentModel.scale.x.toFixed(3),
                visible: garmentModel.visible,
                torsoHeight: torsoHeight.toFixed(3)
            });
        }
    }

    _projectToWorld(vector, camera) {
        const targetZ = this.isMobile ? 0.3 : 0.5;
        const vFOV = camera.fov * Math.PI / 180;
        const height = 2 * Math.tan(vFOV / 2) * Math.abs(targetZ - camera.position.z);
        const width = height * camera.aspect;

        if (this.isMobile) {
            vector.x = (vector.x - 0.5) * width * 0.8;
            vector.y = -(vector.y - 0.5) * height * 0.8;
        } else {
            vector.x = (vector.x - 0.5) * width;
            vector.y = -(vector.y - 0.5) * height;
        }

        vector.z = targetZ;
    }
}
