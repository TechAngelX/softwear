// src/tests/integration/PoseGarmentIntegration.test.js

import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import { HeadPoseMapper } from '../../vto/HeadPoseMapper';
import * as THREE from 'three';

// Uses the real `three` (jest config does not ignore it) so the body-frame math
// is exercised for real, matching the unit tests.

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
        vtoPoseEngine.update(poseLandmarks, poseLandmarks, mockGarment, mockCamera);

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
        vtoPoseEngine.update(null, null, mockGarment, mockCamera);
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
            vtoPoseEngine.update(poseLandmarks, poseLandmarks, mockGarment, mockCamera);
            const headResult = headPoseMapper.update(faceLandmarks, { scale: 1.0 });
            expect(headResult).not.toBeNull();
        }).not.toThrow();
    });
});
