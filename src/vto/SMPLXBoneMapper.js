// src/vto/SMPLXBoneMapper.js
import * as THREE from 'three';
import { resolveBoneRoles } from './boneRoles';
import { limbDirection, POSE } from './bodyFrame';

/**
 * Drives a rigged garment's ARM bones to follow the user's arms.
 *
 * Pose-agnostic: each bone's rest ("bind") direction is read from the actual
 * skeleton at load, so A-pose or T-pose garments both work — no hardcoded
 * direction constants. Each bone is aimed in its **parent-local** space (the
 * previous version assigned a world-space rotation straight to the local
 * quaternion, which — with the parent chain collar→spine — was the main cause
 * of the contortion).
 *
 * Owns bones only; the garment root transform is owned by VtoPoseEngine.
 */

// upper-arm bone -> the joint it should point at, and its child bone (for rest axis)
const ARM_CHAINS = [
    { bone: 'left_shoulder', child: 'left_elbow', from: POSE.L_SHOULDER, to: POSE.L_ELBOW },
    { bone: 'right_shoulder', child: 'right_elbow', from: POSE.R_SHOULDER, to: POSE.R_ELBOW },
    // forearms processed after upper arms so their parent world transform is current
    { bone: 'left_elbow', child: 'left_wrist', from: POSE.L_ELBOW, to: POSE.L_WRIST },
    { bone: 'right_elbow', child: 'right_wrist', from: POSE.R_ELBOW, to: POSE.R_WRIST },
];

export class SMPLXPoseMapper {
    constructor(boneData = {}, isMobile = false) {
        this.initialized = false;
        this.roleMap = {};
        this.restAxis = {};          // role -> THREE.Vector3 (child dir in bone-local space)
        this.lastQuat = {};          // role -> THREE.Quaternion (smoothing)
        this.visibilityThreshold = isMobile ? 0.1 : 0.5;
        this.slerpAmount = isMobile ? 0.5 : 0.35;

        this._q = new THREE.Quaternion();
        this._qInv = new THREE.Quaternion();
        this._target = new THREE.Vector3();
    }

    initializeBones(riggedModel) {
        this.roleMap = {};
        this.restAxis = {};
        this.lastQuat = {};

        let skeletonBones = [];
        riggedModel?.traverse((obj) => {
            if (obj.isSkinnedMesh && obj.skeleton && skeletonBones.length === 0) {
                skeletonBones = obj.skeleton.bones;
            }
        });
        if (skeletonBones.length === 0) {
            // No skeleton — static mesh; nothing to drive (root transform still applies).
            this.initialized = false;
            return;
        }

        this.roleMap = resolveBoneRoles(skeletonBones);

        // Cache each driven bone's rest direction to its child, read from the
        // ACTUAL bind pose (child's local translation). Works for any pose.
        for (const chain of ARM_CHAINS) {
            const bone = this.roleMap[chain.bone];
            const child = this.roleMap[chain.child];
            if (!bone || !child) continue;
            const axis = child.position.clone();
            if (axis.lengthSq() < 1e-8) continue;
            this.restAxis[chain.bone] = axis.normalize();
            this.lastQuat[chain.bone] = bone.quaternion.clone();
        }

        this.initialized = Object.keys(this.restAxis).length > 0;
    }

    /**
     * @param {THREE.Object3D} model - garment wrapper (root transform already set)
     * @param {Array} worldLandmarks - MediaPipe poseWorldLandmarks (metric)
     */
    applyPoseToRiggedGarment(model, worldLandmarks, timestamp) {
        if (!this.initialized || !worldLandmarks || !model) return;

        for (const chain of ARM_CHAINS) {
            const bone = this.roleMap[chain.bone];
            const restAxis = this.restAxis[chain.bone];
            if (!bone || !restAxis || !bone.parent) continue;

            const dirScene = limbDirection(worldLandmarks, chain.from, chain.to, this.visibilityThreshold);
            if (!dirScene) continue; // low confidence — hold last rotation

            // Convert the desired child direction from scene space into the
            // bone's parent-local space, then aim the rest axis at it.
            bone.parent.getWorldQuaternion(this._q);      // refreshes parent chain (incl. just-set upper arm)
            this._qInv.copy(this._q).invert();
            this._target.copy(dirScene).applyQuaternion(this._qInv).normalize();

            const targetQuat = new THREE.Quaternion().setFromUnitVectors(restAxis, this._target);
            const smoothed = this.lastQuat[chain.bone];
            smoothed.slerp(targetQuat, this.slerpAmount);
            bone.quaternion.copy(smoothed);
        }
    }
}
