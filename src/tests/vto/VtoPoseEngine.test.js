// src/tests/vto/VtoPoseEngine.test.js
import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import { POSE } from '../../vto/bodyFrame';
import * as THREE from 'three';

function imageLandmarks() {
    // 33 image landmarks, shoulders/hips visible and offset around centre
    const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));
    lm[POSE.L_SHOULDER] = { x: 0.42, y: 0.40, z: 0, visibility: 0.99 };
    lm[POSE.R_SHOULDER] = { x: 0.58, y: 0.40, z: 0, visibility: 0.99 };
    lm[POSE.L_HIP] = { x: 0.45, y: 0.70, z: 0, visibility: 0.99 };
    lm[POSE.R_HIP] = { x: 0.55, y: 0.70, z: 0, visibility: 0.99 };
    return lm;
}

function worldLandmarks() {
    const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
    lm[POSE.L_SHOULDER] = { x: 0.2, y: -0.5, z: 0, visibility: 1 };
    lm[POSE.R_SHOULDER] = { x: -0.2, y: -0.5, z: 0, visibility: 1 };
    lm[POSE.L_HIP] = { x: 0.1, y: 0, z: 0, visibility: 1 };
    lm[POSE.R_HIP] = { x: -0.1, y: 0, z: 0, visibility: 1 };
    return lm;
}

describe('VtoPoseEngine', () => {
    let engine, garment, camera;

    beforeEach(() => {
        engine = new VtoPoseEngine();
        garment = new THREE.Object3D();
        camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
        camera.position.set(0, 0, 2.5);
    });

    test('hides the garment when required inputs are missing', () => {
        engine.update(null, null, garment, camera);
        expect(garment.visible).toBe(false);
    });

    test('hides the garment when shoulders are not visible', () => {
        const lm = imageLandmarks();
        lm[POSE.L_SHOULDER].visibility = 0;
        lm[POSE.R_SHOULDER].visibility = 0;
        // exceed the grace period
        for (let i = 0; i < 30; i++) engine.update(lm, null, garment, camera);
        expect(garment.visible).toBe(false);
    });

    test('places and scales the garment when shoulders are visible', () => {
        engine.update(imageLandmarks(), worldLandmarks(), garment, camera);
        expect(garment.visible).toBe(true);
        expect(Number.isFinite(garment.position.x)).toBe(true);
        expect(Number.isFinite(garment.position.y)).toBe(true);
        expect(garment.scale.x).toBeGreaterThan(0);
        expect(garment.scale.x).toBe(garment.scale.y); // uniform
    });

    test('applies a finite, normalized torso orientation from world landmarks', () => {
        engine.update(imageLandmarks(), worldLandmarks(), garment, camera);
        const q = garment.quaternion;
        expect(Number.isFinite(q.x + q.y + q.z + q.w)).toBe(true);
        expect(q.length()).toBeCloseTo(1, 3);
    });

    test('does not throw without world landmarks (orientation simply holds)', () => {
        expect(() => engine.update(imageLandmarks(), null, garment, camera)).not.toThrow();
        expect(garment.visible).toBe(true);
    });
});
