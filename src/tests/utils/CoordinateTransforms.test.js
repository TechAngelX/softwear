// src/tests/utils/CoordinateTransforms.test.js

import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import * as THREE from 'three';

jest.mock('three', () => {
    const mockVector3 = function(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
        this.set = jest.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; return this; });
        this.lerp = jest.fn(function() { return this; });
        this.copy = jest.fn(function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; });
        this.distanceTo = jest.fn(() => 0.3);
        return this;
    };

    const mockQuaternion = function(x = 0, y = 0, z = 0, w = 1) {
        this.x = x; this.y = y; this.z = z; this.w = w;
        this.setFromAxisAngle = jest.fn(function() { return this; });
        this.normalize = jest.fn(function() { return this; });
        this.slerp = jest.fn(function() { return this; });
        this.copy = jest.fn(function() { return this; });
        return this;
    };

    return { Vector3: mockVector3, Quaternion: mockQuaternion };
});

jest.mock('../../utils/OneEuroFilter', () => ({
    OneEuroFilter: jest.fn(() => ({ filter: jest.fn(v => v) }))
}));

describe('Coordinate System Transformations', () => {
    let poseEngine;

    beforeEach(() => {
        poseEngine = new VtoPoseEngine();
    });

    test('MediaPipe to world coordinate transformation', () => {
        const mediaPipeCoords = { x: 0.5, y: 0.5, z: 0 };
        const camera = {
            fov: 50,
            aspect: 16/9,
            position: { z: 2.5 }
        };

        const worldVector = new THREE.Vector3(mediaPipeCoords.x, mediaPipeCoords.y, mediaPipeCoords.z);
        poseEngine._projectToWorld(worldVector, camera);

        // Test that transformation was applied (center should become origin)
        expect(worldVector.x).toBeCloseTo(0, 5);
        expect(worldVector.y).toBeCloseTo(0, 5);
        expect(worldVector.z).toBe(0.5);
    });

    test('perspective projection calculations', () => {
        const camera = { fov: 50, aspect: 16/9, position: { z: 2.5 } };
        const targetZ = 0.5;

        const vFOV = camera.fov * Math.PI / 180;
        const height = 2 * Math.tan(vFOV / 2) * Math.abs(targetZ - camera.position.z);
        const width = height * camera.aspect;

        expect(height).toBeGreaterThan(0);
        expect(width).toBeGreaterThan(0);
        expect(width / height).toBeCloseTo(camera.aspect, 2);
    });

    test('coordinate system bounds checking', () => {
        const testCoords = [
            { x: 0, y: 0 }, // top-left
            { x: 1, y: 1 }, // bottom-right
            { x: 0.5, y: 0.5 }, // center
            { x: -0.1, y: 0.5 }, // out of bounds
            { x: 1.1, y: 0.5 }  // out of bounds
        ];

        testCoords.forEach(coord => {
            const worldVector = new THREE.Vector3(coord.x, coord.y, 0);
            const camera = { fov: 50, aspect: 1, position: { z: 2.5 } };

            poseEngine._projectToWorld(worldVector, camera);

            // Transformation should handle all input ranges
            expect(typeof worldVector.x).toBe('number');
            expect(typeof worldVector.y).toBe('number');
            expect(isNaN(worldVector.x)).toBe(false);
            expect(isNaN(worldVector.y)).toBe(false);
        });
    });

    test('depth coordinate handling', () => {
        const coords = [
            { x: 0.5, y: 0.5, z: -0.5 },
            { x: 0.5, y: 0.5, z: 0 },
            { x: 0.5, y: 0.5, z: 0.5 }
        ];

        coords.forEach(coord => {
            const worldVector = new THREE.Vector3(coord.x, coord.y, coord.z);
            const camera = { fov: 50, aspect: 1, position: { z: 2.5 } };

            poseEngine._projectToWorld(worldVector, camera);

            expect(worldVector.z).toBe(0.5); // Target Z should be consistent
        });
    });
});
