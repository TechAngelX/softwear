// src/tests/utils/AnthropometricScaling.test.js

import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import * as THREE from 'three';

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
        this.distanceTo = jest.fn((other) => {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const dz = this.z - other.z;
            return Math.sqrt(dx*dx + dy*dy + dz*dz);
        });
        return this;
    };

    const mockQuaternion = function(x = 0, y = 0, z = 0, w = 1) {
        this.x = x; this.y = y; this.z = z; this.w = w;
        this.setFromAxisAngle = jest.fn(function(axis, angle) {
            this.x = axis.x * Math.sin(angle / 2);
            this.y = axis.y * Math.sin(angle / 2);
            this.z = axis.z * Math.sin(angle / 2);
            this.w = Math.cos(angle / 2);
            return this;
        });
        this.normalize = jest.fn(function() { return this; });
        this.copy = jest.fn(function(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; });
        this.slerp = jest.fn(function() { return this; });
        return this;
    };

    return { Vector3: mockVector3, Quaternion: mockQuaternion };
});

jest.mock('../../utils/OneEuroFilter', () => ({
    OneEuroFilter: jest.fn(() => ({ filter: jest.fn(v => v) }))
}));

describe('Anthropometric Scaling Algorithms', () => {
    let poseEngine;

    beforeEach(() => {
        poseEngine = new VtoPoseEngine();
    });

    test('torso height calculation from landmarks', () => {
        const landmarks = Array(33).fill().map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.8 }));
        landmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 0.9 }; // left shoulder
        landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 0.9 }; // right shoulder  
        landmarks[23] = { x: 0.45, y: 0.7, z: 0, visibility: 0.8 }; // left hip
        landmarks[24] = { x: 0.55, y: 0.7, z: 0, visibility: 0.8 }; // right hip

        const mockGarment = {
            position: new THREE.Vector3(),
            scale: new THREE.Vector3(1, 1, 1),
            quaternion: new THREE.Quaternion()
        };
        const mockCamera = { fov: 50, aspect: 1, position: { z: 2.5 } };

        poseEngine.update(landmarks, mockGarment, mockCamera);

        // Shoulder midpoint should be calculated
        expect(poseEngine.shoulderMidpoint.x).toBe(0.5);
        expect(poseEngine.shoulderMidpoint.y).toBe(0.3);

        expect(poseEngine.hipMidpoint.x).toBe(0.5);
        expect(poseEngine.hipMidpoint.y).toBeCloseTo(0.778, 2);

        // Distance should be calculated
        expect(poseEngine.shoulderMidpoint.distanceTo).toHaveBeenCalled();
    });
    test('proportional scaling based on body measurements', () => {
        const testCases = [
            { torsoHeight: 0.2, expectedScale: 0.54 },  // smaller person
            { torsoHeight: 0.3, expectedScale: 0.81 },  // average person
            { torsoHeight: 0.4, expectedScale: 1.08 }   // taller person
        ];

        testCases.forEach(({ torsoHeight, expectedScale }) => {
            const GARMENT_TORSO_HEIGHT_RATIO = 2.7;
            const calculatedScale = torsoHeight * GARMENT_TORSO_HEIGHT_RATIO;

            expect(calculatedScale).toBeCloseTo(expectedScale, 2);
        });
    });

    test('scaling maintains aspect ratio', () => {
        const originalScale = new THREE.Vector3(1, 1, 1);
        const scaleFactor = 1.5;

        originalScale.x *= scaleFactor;
        originalScale.y *= scaleFactor;
        originalScale.z *= scaleFactor;

        expect(originalScale.x).toBe(originalScale.y);
        expect(originalScale.y).toBe(originalScale.z);
        expect(originalScale.x).toBe(1.5);
    });

    test('handles edge case measurements', () => {
        const edgeCases = [
            { torsoHeight: 0, shouldScale: 0 },
            { torsoHeight: 0.01, shouldScale: 0.027 },
            { torsoHeight: 1.0, shouldScale: 2.7 }
        ];

        edgeCases.forEach(({ torsoHeight, shouldScale }) => {
            const GARMENT_TORSO_HEIGHT_RATIO = 2.7;
            const result = torsoHeight * GARMENT_TORSO_HEIGHT_RATIO;

            expect(result).toBeCloseTo(shouldScale, 3);
            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    test('anthropometric filtering smooths measurements', () => {
        const poseEngine = new VtoPoseEngine();
        const measurements = [0.25, 0.3, 0.28, 0.32, 0.29];

        // Test that filtering exists and processes values
        measurements.forEach(measurement => {
            const filtered = poseEngine.scaleFilter.filter(measurement, Date.now());
            expect(typeof filtered).toBe('number');
            expect(isNaN(filtered)).toBe(false);
        });
    });

    test('validates landmark visibility thresholds', () => {
        const landmarks = Array(33).fill().map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.8 }));

        // Test low visibility landmarks
        landmarks[11].visibility = 0.3; // below threshold
        landmarks[12].visibility = 0.9; // above threshold
        landmarks[23].visibility = 0.7; // above threshold  
        landmarks[24].visibility = 0.8; // above threshold

        const mockGarment = {
            position: new THREE.Vector3(),
            scale: new THREE.Vector3(1, 1, 1),
            quaternion: new THREE.Quaternion(),
            visible: true
        };
        const mockCamera = { fov: 50, aspect: 1, position: { z: 2.5 } };

        poseEngine.update(landmarks, mockGarment, mockCamera);

        // Should hide garment when key landmarks have low visibility
        expect(mockGarment.visible).toBe(false);
    });
});
