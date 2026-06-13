// src/vto/VtoPoseEngine.js
import * as THREE from 'three';
import { computeBodyBasis, POSE } from './bodyFrame';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Owns the garment ROOT transform only: depth (Z) and screen position from image
 * landmarks, and torso orientation from the body frame. Arm/bone articulation is
 * owned separately by SMPLXBoneMapper.
 *
 * Fit model: the garment keeps a FIXED real-world scale and is moved in Z by the
 * user's shoulder width, so the perspective camera shrinks/grows it naturally as
 * the user moves forward/back (and the garment sits at a correct depth for
 * occlusion). Apparent shoulder width then tracks the user geometrically.
 *
 * TUNING:
 *  - fitFactor: how wide the garment sits relative to the user's shoulders
 *    (1.0 = match; >1 looser/wider, <1 tighter). This is the main fit knob.
 *  - garmentScale / refShoulderSpan: overall size & depth calibration.
 */
export class VtoPoseEngine {
    constructor() {
        this.isMobile = window.innerWidth <= 768;

        this.currentPosition = new THREE.Vector3();
        this.currentScale = new THREE.Vector3(1, 1, 1);
        this.currentQuaternion = new THREE.Quaternion();
        this.hasState = false;

        this.lostFrames = 0;
        this.lostFrameThreshold = 15; // ~0.5s grace before hiding

        this.visibilityThreshold = this.isMobile ? 0.1 : 0.5;
        this.positionLerp = this.isMobile ? 0.6 : 0.4;
        this.rotationSlerp = 0.3;

        // Fit/size calibration
        this.fitFactor = 1.0;          // apparent shoulder width = image shoulders * this
        this.garmentScale = 1.0;       // fixed wrapper scale (real-world size)
        this.refShoulderSpan = 0.45;   // garment shoulder width (world units) at scale 1 — sets depth
        this.minDepth = 0.4;
        this.maxDepth = 6.0;

        this._tmp = new THREE.Vector3();
        this._scaleVec = new THREE.Vector3();
    }

    update(landmarks, worldLandmarks, garmentModel, camera) {
        if (!landmarks || !garmentModel || !camera) {
            if (garmentModel) garmentModel.visible = false;
            return;
        }

        const ls = landmarks[POSE.L_SHOULDER];
        const rs = landmarks[POSE.R_SHOULDER];
        const shouldersVisible = ls && rs &&
            (ls.visibility ?? 1) > this.visibilityThreshold &&
            (rs.visibility ?? 1) > this.visibilityThreshold;

        if (!shouldersVisible) {
            this.lostFrames++;
            garmentModel.visible = this.lostFrames <= this.lostFrameThreshold && this.hasState;
            return;
        }
        this.lostFrames = 0;
        garmentModel.visible = true;

        const shoulderMidX = (ls.x + rs.x) / 2;
        const shoulderMidY = (ls.y + rs.y) / 2;
        const lh = landmarks[POSE.L_HIP];
        const rh = landmarks[POSE.R_HIP];
        const shoulderImg = Math.max(Math.hypot(ls.x - rs.x, ls.y - rs.y), 0.02);
        const hipMidY = (lh && rh) ? (lh.y + rh.y) / 2 : shoulderMidY + shoulderImg * 1.4;
        const torsoCenterY = (shoulderMidY + hipMidY) / 2;

        const vFOV = (camera.fov * Math.PI) / 180;
        const tanHalf = Math.tan(vFOV / 2);

        // Depth so the garment's shoulders subtend (image shoulders * fitFactor)
        // of the frame. Move back → shoulderImg shrinks → depth grows → perspective
        // shrinks the garment. Geometric, so it tracks forward/back instantly.
        const denom = 2 * Math.max(shoulderImg * this.fitFactor, 0.01) * tanHalf * camera.aspect;
        const d = clamp(this.refShoulderSpan / denom, this.minDepth, this.maxDepth);
        const depthZ = camera.position.z - d;

        const target = this._projectAtDepth(shoulderMidX, torsoCenterY, depthZ, camera, tanHalf, this._tmp);
        const basis = computeBodyBasis(worldLandmarks, this.visibilityThreshold);

        if (!this.hasState) {
            this.currentPosition.copy(target);
            this.currentScale.setScalar(this.garmentScale);
            if (basis) this.currentQuaternion.copy(basis.quaternion);
            this.hasState = true;
        } else {
            this.currentPosition.lerp(target, this.positionLerp);
            this.currentScale.lerp(this._scaleVec.setScalar(this.garmentScale), 0.3);
            if (basis) this.currentQuaternion.slerp(basis.quaternion, this.rotationSlerp);
        }

        garmentModel.position.copy(this.currentPosition);
        garmentModel.scale.copy(this.currentScale);
        garmentModel.quaternion.copy(this.currentQuaternion);
    }

    // Project a normalized image point (x,y in [0,1]) onto the plane at world depth z.
    _projectAtDepth(nx, ny, z, camera, tanHalf, out) {
        const dist = Math.abs(z - camera.position.z);
        const height = 2 * tanHalf * dist;
        const width = height * camera.aspect;
        out.set((nx - 0.5) * width, -(ny - 0.5) * height, z);
        return out;
    }
}
