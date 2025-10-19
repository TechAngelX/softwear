// src/tests/performance/ConcurrentComponents.test.js

import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import { HeadPoseMapper } from '../../vto/HeadPoseMapper';
import { GestureDetector } from '../../gestures/GestureDetector';
import { audioManager } from '../../utils/AudioManager';
import * as THREE from 'three';

// Mock `THREE.js`
jest.mock('three', () => {
    const mockVector3 = function(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
        this.set = jest.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; return this; });
        this.copy = jest.fn(function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; });
        this.clone = jest.fn(() => new mockVector3(this.x, this.y, this.z));
        this.distanceTo = jest.fn(() => 0.2);
        this.addVectors = jest.fn(function() { return this; });
        this.subVectors = jest.fn(function() { return this; });
        this.normalize = jest.fn(function() { return this; });
        this.crossVectors = jest.fn(function() { return this; });
        this.lerp = jest.fn(function() { return this; });
        this.lerpVectors = jest.fn(function() { return this; });
        this.multiplyScalar = jest.fn(function() { return this; });
        return this;
    };

    const mockQuaternion = function(x = 0, y = 0, z = 0, w = 1) {
        this.x = x; this.y = y; this.z = z; this.w = w;
        this.set = jest.fn(function(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; });
        this.setFromRotationMatrix = jest.fn(function() { return this; });
        this.slerp = jest.fn(function() { return this; });
        this.copy = jest.fn(function(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; });
        this.normalize = jest.fn(function() { return this; });
        this.setFromAxisAngle = jest.fn(function() { return this; });
        this.multiply = jest.fn(function() { return this; });
        return this;
    };

    const mockMatrix4 = function() {
        this.makeBasis = jest.fn(function() { return this; });
        return this;
    };

    const mockObject3D = function() {
        this.position = new mockVector3();
        this.scale = new mockVector3();
        this.quaternion = new mockQuaternion();
        this.visible = true;
    }

    const mockPerspectiveCamera = function(fov = 50, aspect = 1, near = 0.1, far = 1000) {
        this.fov = fov;
        this.aspect = aspect;
        this.position = new mockVector3(0, 0, 2.5);
        this.lookAt = jest.fn();
        this.updateProjectionMatrix = jest.fn();
        this.set = jest.fn();
    }

    return {
        Vector3: mockVector3,
        Quaternion: mockQuaternion,
        Matrix4: mockMatrix4,
        Object3D: mockObject3D,
        PerspectiveCamera: mockPerspectiveCamera,
    };
});

// Mock OneEuroFilter
jest.mock('../../utils/OneEuroFilter', () => ({
    OneEuroFilter: jest.fn(() => ({ filter: jest.fn(v => v) }))
}));

// Mock AudioManager
jest.mock('../../utils/AudioManager', () => ({
    audioManager: {
        playSound: jest.fn().mockResolvedValue(undefined)
    }
}));

// Mock GestureDetector 
jest.mock('../../gestures/GestureDetector', () => ({
    GestureDetector: jest.fn().mockImplementation(() => ({
        update: jest.fn(() => null)
    }))
}));

describe('Concurrent Component Performance', () => {
    let poseEngine;
    let headMapper;
    let gestureDetector;

    beforeEach(() => {
        poseEngine = new VtoPoseEngine();
        headMapper = new HeadPoseMapper();
        gestureDetector = new GestureDetector();
    });

    const createMockLandmarks = () => ({
        pose: Array(33).fill().map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.8 })),
        face: Array(468).fill(null).map((_, i) => {
            if ([1, 234, 454, 10, 152, 33, 263].includes(i)) {
                return { x: 0.5, y: 0.5, z: 0 };
            }
            return null;
        }),
        leftHand: Array(21).fill().map(() => ({ x: 0.3, y: 0.5, z: 0 })),
        rightHand: Array(21).fill().map(() => ({ x: 0.7, y: 0.5, z: 0 }))
    });

    test('concurrent pose processing performance', () => {
        const mockGarment = new THREE.Object3D();
        const mockCamera = new THREE.PerspectiveCamera();
        const landmarks = createMockLandmarks();

        const start = performance.now();

        for (let frame = 0; frame < 30; frame++) {
            poseEngine.update(landmarks.pose, mockGarment, mockCamera);
            headMapper.update(landmarks.face, { scale: 1.0 });
            gestureDetector.update({
                poseLandmarks: landmarks.pose,
                leftHandLandmarks: landmarks.leftHand,
                rightHandLandmarks: landmarks.rightHand
            });
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(1000);
    });
});
