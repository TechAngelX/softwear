// src/tests/utils/SMPLXBoneMapper.test.js
import { SMPLXPoseMapper } from '../../vto/SMPLXBoneMapper';
import { POSE } from '../../vto/bodyFrame';
import * as THREE from 'three';

// Build a minimal rigged garment: root → left_shoulder → left_elbow → left_wrist
function riggedModel() {
    const model = new THREE.Group();

    const root = new THREE.Bone(); root.name = 'root';
    const shoulder = new THREE.Bone(); shoulder.name = 'left_shoulder'; shoulder.position.set(0.17, 0, 0);
    const elbow = new THREE.Bone(); elbow.name = 'left_elbow'; elbow.position.set(0.27, 0, 0);
    const wrist = new THREE.Bone(); wrist.name = 'left_wrist'; wrist.position.set(0.29, 0, 0);

    root.add(shoulder); shoulder.add(elbow); elbow.add(wrist);

    const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    mesh.add(root);
    mesh.skeleton = new THREE.Skeleton([root, shoulder, elbow, wrist]);
    model.add(mesh);
    model.updateWorldMatrix(true, true);
    return model;
}

function worldLandmarks() {
    const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
    lm[POSE.L_SHOULDER] = { x: 0.2, y: -0.5, z: 0, visibility: 1 };
    lm[POSE.L_ELBOW] = { x: 0.45, y: -0.45, z: 0, visibility: 1 };
    lm[POSE.L_WRIST] = { x: 0.6, y: -0.2, z: 0, visibility: 1 };
    return lm;
}

describe('SMPLXPoseMapper', () => {
    let mapper;
    beforeEach(() => { mapper = new SMPLXPoseMapper(); });

    test('starts uninitialised', () => {
        expect(mapper).toBeInstanceOf(SMPLXPoseMapper);
        expect(mapper.initialized).toBe(false);
    });

    test('initialises from a rigged skeleton and reads rest axes from the bind pose', () => {
        mapper.initializeBones(riggedModel());
        expect(mapper.initialized).toBe(true);
        // rest axis read from the actual child position (pose-agnostic), normalized
        expect(mapper.restAxis.left_shoulder.length()).toBeCloseTo(1, 5);
        expect(mapper.restAxis.left_shoulder.x).toBeCloseTo(1, 5); // child sits along +x in this rig
    });

    test('static mesh (no skeleton) leaves it uninitialised', () => {
        mapper.initializeBones(new THREE.Group());
        expect(mapper.initialized).toBe(false);
    });

    test('applies pose without landmarks gracefully', () => {
        mapper.initializeBones(riggedModel());
        expect(() => mapper.applyPoseToRiggedGarment(new THREE.Group(), null, 0)).not.toThrow();
    });

    test('drives bone quaternions from world landmarks without throwing', () => {
        const model = riggedModel();
        mapper.initializeBones(model);
        const before = model.getObjectByName('left_shoulder').quaternion.clone();
        expect(() => mapper.applyPoseToRiggedGarment(model, worldLandmarks(), 16)).not.toThrow();
        const after = model.getObjectByName('left_shoulder').quaternion;
        expect(after.length()).toBeCloseTo(1, 3);
        // arm is raised in the landmarks → shoulder rotation should change from rest
        expect(after.angleTo(before)).toBeGreaterThan(0);
    });
});
