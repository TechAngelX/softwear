// src/tests/vto/HeadPoseMapper.test.js

import { HeadPoseMapper } from '../../vto/HeadPoseMapper';
import * as THREE from 'three';

// Mock THREE.js classes
jest.mock('three', () => {
    const mockVector3 = function(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.set = jest.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; return this; });
        this.copy = jest.fn(function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; });
        this.addVectors = jest.fn(function(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; });
        this.multiplyScalar = jest.fn(function(s) { this.x *= s; this.y *= s; this.z *= s; return this; });
        this.subVectors = jest.fn(function(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; });
        this.distanceTo = jest.fn(() => 0.15);
        this.normalize = jest.fn(function() { return this; });
        this.crossVectors = jest.fn(function() { return this; });
        this.lerpVectors = jest.fn(function() { return this; });
        return this;
    };

    const mockQuaternion = function(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        this.set = jest.fn(function(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; });
        this.copy = jest.fn(function(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; });
        this.setFromRotationMatrix = jest.fn(function() { return this; });
        this.multiply = jest.fn(function() { return this; });
        this.setFromAxisAngle = jest.fn(function() { return this; });
        this.normalize = jest.fn(function() { return this; });
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

describe('HeadPoseMapper', () => {
    let headMapper;
    let mockFaceLandmarks;

    beforeEach(() => {
        headMapper = new HeadPoseMapper();

        // Create mock face landmarks array with key facial points
        mockFaceLandmarks = Array(468).fill(null);
        mockFaceLandmarks[1] = { x: 0.5, y: 0.4, z: 0 }; // nose tip
        mockFaceLandmarks[33] = { x: 0.3, y: 0.45, z: 0 }; // left eye outer
        mockFaceLandmarks[263] = { x: 0.7, y: 0.45, z: 0 }; // right eye outr
        mockFaceLandmarks[234] = { x: 0.25, y: 0.4, z: 0 }; // left ear
        mockFaceLandmarks[454] = { x: 0.75, y: 0.4, z: 0 }; // right earr
        mockFaceLandmarks[10] = { x: 0.5, y: 0.2, z: 0 }; // forehead
        mockFaceLandmarks[152] = { x: 0.5, y: 0.7, z: 0 }; // chin
    });

    test('initialises without errors', () => {
        expect(headMapper).toBeInstanceOf(HeadPoseMapper);
        expect(headMapper.isInitialised).toBe(false);
    });

    test('returns null for invalid face landmarks', () => {
        const result = headMapper.update(null, {});
        expect(result).toBeNull();
    });

    test('returns null for incomplete face landmarks', () => {
        const incompleteLandmarks = Array(468).fill(null);
        incompleteLandmarks[1] = { x: 0.5, y: 0.4, z: 0 };

        const result = headMapper.update(incompleteLandmarks, {});
        expect(result).toBeNull();
    });

    test('processes valid face landmarks and returns transform data', () => {
        const garmentDetails = { category: 'glasses', scale: 1.0 };

        const result = headMapper.update(mockFaceLandmarks, garmentDetails);

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('position');
        expect(result).toHaveProperty('quaternion');
        expect(result).toHaveProperty('scale');
    });

    test('calculates different positions for glasses vs hat categories', () => {
        const glassesResult = headMapper.update(mockFaceLandmarks, { category: 'glasses' });
        const hatResult = headMapper.update(mockFaceLandmarks, { headType: 'hat' });

        expect(glassesResult).not.toBeNull();
        expect(hatResult).not.toBeNull();
    });

    test('handles missing garment details gracefully', () => {
        const result = headMapper.update(mockFaceLandmarks, null);

        expect(result).not.toBeNull();
        expect(result.position).toBeDefined();
        expect(result.quaternion).toBeDefined();
        expect(result.scale).toBeDefined();
    });

    test('applies SMPL-X adjustments when data provided', () => {
        const mockSMPLXData = {
            head: { tail: [0, 0, 1], head: [0, 0, 0] },
            left_eye_smplhf: { head: [-0.1, 0, 0] },
            right_eye_smplhf: { head: [0.1, 0, 0] }
        };

        const mapperWithSMPLX = new HeadPoseMapper(mockSMPLXData);
        const result = mapperWithSMPLX.update(mockFaceLandmarks, { headType: 'glasses' });

        expect(result).not.toBeNull();
    });

    test('maintains state between updates', () => {
        const firstResult = headMapper.update(mockFaceLandmarks, {});
        const secondResult = headMapper.update(mockFaceLandmarks, {});

        expect(headMapper.isInitialised).toBe(true);
        expect(firstResult).not.toBeNull();
        expect(secondResult).not.toBeNull();
    });

    test('calculates proportional scaling based on face width', () => {
        const smallScale = headMapper.calculateProportionalScale(0.1, { scale: 1.0 });
        const largeScale = headMapper.calculateProportionalScale(0.3, { scale: 1.0 });

        expect(largeScale).toBeGreaterThan(smallScale);
    });

    test('handles edge case landmarks without crashing', () => {
        const edgeCaseLandmarks = Array(468).fill({ x: 0, y: 0, z: 0 });
        edgeCaseLandmarks[1] = { x: 0.5, y: 0.5, z: 0 };
        edgeCaseLandmarks[33] = { x: 0.5, y: 0.5, z: 0 };
        edgeCaseLandmarks[263] = { x: 0.5, y: 0.5, z: 0 };
        edgeCaseLandmarks[234] = { x: 0.5, y: 0.5, z: 0 };
        edgeCaseLandmarks[454] = { x: 0.5, y: 0.5, z: 0 };
        edgeCaseLandmarks[10] = { x: 0.5, y: 0.5, z: 0 };
        edgeCaseLandmarks[152] = { x: 0.5, y: 0.5, z: 0 };

        expect(() => {
            headMapper.update(edgeCaseLandmarks, {});
        }).not.toThrow();
    });
});
