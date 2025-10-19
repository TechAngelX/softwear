// src/tests/integration/PoseGarmentIntegration.test.js

import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import { HeadPoseMapper } from '../../vto/HeadPoseMapper';
import * as THREE from 'three';

// Mock THREE.js with all required methods
jest.mock('three', () => {
    const mockVector3 = function(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
        this.set = jest.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; return this; });
        this.copy = jest.fn(function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; });
        this.lerp = jest.fn(function(target, alpha) {
            this.x += (target.x - this.x) * alpha;
            this.y += (target.y - this.y) * alpha;
            this.z += (target.z - this.z) * alpha;
            return this;
        });
        this.lerpVectors = jest.fn(function(a, b, alpha) {
            this.x = a.x + (b.x - a.x) * alpha;
            this.y = a.y + (b.y - a.y) * alpha;
            this.z = a.z + (b.z - a.z) * alpha;
            return this;
        });
        this.distanceTo = jest.fn(() => 0.15);
        this.normalize = jest.fn(function() { return this; });
        this.crossVectors = jest.fn(function() { return this; });
        this.subVectors = jest.fn(function(a, b) {
            this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z;
            return this;
        });
        this.addVectors = jest.fn(function(a, b) {
            this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z;
            return this;
        });
        this.multiplyScalar = jest.fn(function(s) {
            this.x *= s; this.y *= s; this.z *= s;
            return this;
        });
        return this;
    };

    const mockQuaternion = function(x = 0, y = 0, z = 0, w = 1) {
        this.x = x; this.y = y; this.z = z; this.w = w;
        this.set = jest.fn(function(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; });
        this.copy = jest.fn(function(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; });
        this.setFromRotationMatrix = jest.fn(function() { return this; });
        this.setFromAxisAngle = jest.fn(function(axis, angle) {
            this.x = axis.x * Math.sin(angle / 2);
            this.y = axis.y * Math.sin(angle / 2);
            this.z = axis.z * Math.sin(angle / 2);
            this.w = Math.cos(angle / 2);
            return this;
        });
        this.multiply = jest.fn(function() { return this; });
        this.normalize = jest.fn(function() { return this; });
        this.slerp = jest.fn(function() { return this; });
        return this;
    };

    const mockMatrix4 = function() {
        this.makeBasis = jest.fn(function() { return this; });
        return this;
    };

    return {
        Vector3: mockVector3,
        Quaternion: mockQuaternion,
        Matrix4: mockMatrix4
    };
});

// Mock OneEuroFilter
jest.mock('../../utils/OneEuroFilter', () => ({
    OneEuroFilter: jest.fn(() => ({
        filter: jest.fn(v => v)
    }))
}));

describe('Pose-Garment Rendering Integration', () => {
    let vtoPoseEngine;
    let headPoseMapper;
    let mockGarment;
    let mockCamera;

    beforeEach(() => {
        vtoPoseEngine = new VtoPoseEngine();
        headPoseMapper = new HeadPoseMapper();

        mockGarment = {
            position: new THREE.Vector3(),
            scale: new THREE.Vector3(1, 1, 1),
            quaternion: new THREE.Quaternion(),
            visible: true
        };

        mockCamera = {
            fov: 50,
            aspect: 16/9,
            position: { z: 2.5 }
        };
    });

    test('should process pose landmarks through VtoPoseEngine', () => {
        const poseLandmarks = Array(33).fill().map((_, i) => ({
            x: 0.5 + (i % 3 - 1) * 0.1,
            y: 0.5 + Math.sin(i) * 0.1,
            z: 0,
            visibility: 0.8
        }));

        // VtoPoseEngine.update doesn't return a value, it modifies the garment
        vtoPoseEngine.update(poseLandmarks, mockGarment, mockCamera);

        expect(mockGarment.position).toBeDefined();
        expect(mockGarment.scale).toBeDefined();
        expect(mockGarment.quaternion).toBeDefined();
    });

    test('should process face landmarks through HeadPoseMapper', () => {
        const faceLandmarks = Array(468).fill().map(() => ({ x: 0.5, y: 0.5, z: 0 }));
        faceLandmarks[1] = { x: 0.5, y: 0.4, z: 0 }; // nose tip
        faceLandmarks[33] = { x: 0.3, y: 0.45, z: 0 }; // left eye outer
        faceLandmarks[263] = { x: 0.7, y: 0.45, z: 0 }; // right eye outer
        faceLandmarks[234] = { x: 0.25, y: 0.4, z: 0 }; // left ear
        faceLandmarks[454] = { x: 0.75, y: 0.4, z: 0 }; // right ear
        faceLandmarks[10] = { x: 0.5, y: 0.2, z: 0 }; // forehead
        faceLandmarks[152] = { x: 0.5, y: 0.7, z: 0 }; // chinn

        const result = headPoseMapper.update(faceLandmarks, { scale: 1.0 });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('position');
        expect(result).toHaveProperty('quaternion');
        expect(result).toHaveProperty('scale');
    });

    test('should handle invalid landmarks gracefully', () => {
        vtoPoseEngine.update(null, mockGarment, mockCamera);
        const headResult = headPoseMapper.update(null, { scale: 1.0 });

        expect(mockGarment.position).toBeDefined();
        expect(headResult).toBeNull();
        expect(mockGarment.visible).toBe(false);
    });

    test('should maintain integration between pose engines', () => {
        const poseLandmarks = Array(33).fill().map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.8 }));
        const faceLandmarks = Array(468).fill().map(() => ({ x: 0.5, y: 0.5, z: 0 }));

        // Set required face landmarks
        faceLandmarks[1] = { x: 0.5, y: 0.4, z: 0 };
        faceLandmarks[33] = { x: 0.3, y: 0.45, z: 0 };
        faceLandmarks[263] = { x: 0.7, y: 0.45, z: 0 };
        faceLandmarks[234] = { x: 0.25, y: 0.4, z: 0 };
        faceLandmarks[454] = { x: 0.75, y: 0.4, z: 0 };
        faceLandmarks[10] = { x: 0.5, y: 0.2, z: 0 };
        faceLandmarks[152] = { x: 0.5, y: 0.7, z: 0 };

        expect(() => {
            vtoPoseEngine.update(poseLandmarks, mockGarment, mockCamera);
            const headResult = headPoseMapper.update(faceLandmarks, { scale: 1.0 });
            expect(headResult).not.toBeNull();
        }).not.toThrow();
    });
});
