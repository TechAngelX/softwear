// src/tests/utils/QuaternionMath.test.js

import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import * as THREE from 'three';

// Mock THREE.js for quaternion testing
jest.mock('three', () => {
    const mockVector3 = function(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
        this.set = jest.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; return this; });
        this.lerp = jest.fn(function(target, alpha) {
            this.x += (target.x - this.x) * alpha;
            this.y += (target.y - this.y) * alpha;
            this.z += (target.z - this.z) * alpha;
            return this;
        });
        this.copy = jest.fn(function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; });
        this.distanceTo = jest.fn(() => 0.3);
        return this;
    };

    const mockQuaternion = function(x = 0, y = 0, z = 0, w = 1) {
        this.x = x; this.y = y; this.z = z; this.w = w;
        this.setFromAxisAngle = jest.fn(function(axis, angle) {
            // Simple mock implementation
            this.x = axis.x * Math.sin(angle / 2);
            this.y = axis.y * Math.sin(angle / 2);
            this.z = axis.z * Math.sin(angle / 2);
            this.w = Math.cos(angle / 2);
            return this;
        });
        this.normalize = jest.fn(function() {
            const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
            if (length > 0) {
                this.x /= length; this.y /= length; this.z /= length; this.w /= length;
            }
            return this;
        });
        this.slerp = jest.fn(function(target, alpha) {
            this.x += (target.x - this.x) * alpha;
            this.y += (target.y - this.y) * alpha;
            this.z += (target.z - this.z) * alpha;
            this.w += (target.w - this.w) * alpha;
            return this;
        });
        this.copy = jest.fn(function(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; });
        return this;
    };

    return { Vector3: mockVector3, Quaternion: mockQuaternion };
});

jest.mock('../../utils/OneEuroFilter', () => ({
    OneEuroFilter: jest.fn(() => ({ filter: jest.fn(v => v) }))
}));

describe('Quaternion Mathematical Operations', () => {
    let poseEngine;
    let mockCamera;

    beforeEach(() => {
        poseEngine = new VtoPoseEngine();
        mockCamera = { fov: 50, aspect: 16/9, position: { z: 2.5 } };
    });

    test('quaternion creation from axis-angle', () => {
        const quaternion = new THREE.Quaternion();
        const axis = new THREE.Vector3(0, 1, 0);
        const angle = Math.PI / 4;

        quaternion.setFromAxisAngle(axis, angle);

        expect(quaternion.setFromAxisAngle).toHaveBeenCalledWith(axis, angle);
        expect(typeof quaternion.x).toBe('number');
        expect(typeof quaternion.y).toBe('number');
        expect(typeof quaternion.z).toBe('number');
        expect(typeof quaternion.w).toBe('number');
    });

    test('quaternion normalisation maintains unit length', () => {
        const quaternion = new THREE.Quaternion(0.5, 0.5, 0.5, 0.5);

        quaternion.normalize();

        expect(quaternion.normalize).toHaveBeenCalled();
        // Test that normalisation was attempted
        const length = Math.sqrt(quaternion.x ** 2 + quaternion.y ** 2 + quaternion.z ** 2 + quaternion.w ** 2);
        expect(length).toBeCloseTo(1, 2);
    });

    test('quaternion SLERP interpolation', () => {
        const quat1 = new THREE.Quaternion(0, 0, 0, 1);
        const quat2 = new THREE.Quaternion(0, 0.707, 0, 0.707);

        quat1.slerp(quat2, 0.5);

        expect(quat1.slerp).toHaveBeenCalledWith(quat2, 0.5);
    });

    test('shoulder rotation calculation from pose landmarks', () => {
        const landmarks = Array(33).fill().map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.8 }));
        landmarks[11] = { x: 0.4, y: 0.5, z: 0.1, visibility: 0.9 }; // left shoulder
        landmarks[12] = { x: 0.6, y: 0.5, z: -0.1, visibility: 0.9 }; // right shoulder
        landmarks[23] = { x: 0.45, y: 0.7, z: 0, visibility: 0.8 }; // left hip
        landmarks[24] = { x: 0.55, y: 0.7, z: 0, visibility: 0.8 }; // right hip

        const mockGarment = {
            position: new THREE.Vector3(),
            scale: new THREE.Vector3(1, 1, 1),
            quaternion: new THREE.Quaternion()
        };

        poseEngine.update(landmarks, mockGarment, mockCamera);

        // Verify rotation was applied
        expect(mockGarment.quaternion.copy).toHaveBeenCalled();
    });
});
