// src/tests/utils/SMPLXBoneMapper.test.js

import { SMPLXPoseMapper } from '../../vto/SMPLXBoneMapper';
import * as THREE from 'three';

describe('SMPLXPoseMapper', () => {
    let mapper;

    beforeEach(() => {
        mapper = new SMPLXPoseMapper();
    });

    test('initialises without errors', () => {
        expect(mapper).toBeInstanceOf(SMPLXPoseMapper);
        expect(mapper.initialized).toBe(false);
    });

    test('handles rigged model initialisation', () => {
        const mockModel = new THREE.Group();

        // Create a  SkinnedMesh with skeleton
        const mockGeometry = new THREE.BufferGeometry();
        const mockMaterial = new THREE.MeshBasicMaterial();
        const mockSkinnedMesh = new THREE.SkinnedMesh(mockGeometry, mockMaterial);

        const mockBone = new THREE.Bone();
        mockBone.name = 'left_shoulder';

        // Create skeleton
        const mockSkeleton = new THREE.Skeleton([mockBone]);
        mockSkinnedMesh.skeleton = mockSkeleton;
        mockSkinnedMesh.isSkinnedMesh = true;

        mockModel.add(mockSkinnedMesh);

        mapper.initializeBones(mockModel);
        expect(mapper.initialized).toBe(true);
    });

    test('applies pose without landmarks gracefully', () => {
        const mockModel = new THREE.Group();
        expect(() => {
            mapper.applyPoseToRiggedGarment(mockModel, null);
        }).not.toThrow();
    });
});
