// src/vto/VtoPoseEngine.js
import * as THREE from 'three';
import { computeBodyBasis, POSE } from './bodyFrame';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const NOSE = 0;

/**
 * Owns the garment ROOT transform: depth (Z), screen position, and yaw.
 * Arm/bone articulation is owned by SMPLXBoneMapper.
 *
 *  - ORIENTATION: the garment hangs VERTICAL (like real clothing) and YAWS with
 *    you. The yaw is the real chest-forward direction from the metric 3D body
 *    frame (Tasks Vision world landmarks), amplified — monocular depth makes the
 *    raw turn subtle, so a gain makes it read while staying on real data (not the
 *    noisy foreshortening guess). Pitch/roll are dropped so it never goes
 *    top-down or tips over.
 *  - SIZE/DEPTH: yaw-invariant (nose → shoulder-mid), so size holds as you turn.
 *
 * TUNING:
 *   - fitFactor : overall garment size.
 *   - yawGain   : how strongly it turns (1 = raw real turn, higher = more).
 *   - yawSign   : flip if it turns the wrong way.
 *   - maxYaw    : cap on turn (radians).
 */
export class VtoPoseEngine {
    constructor() {
        this.isMobile = window.innerWidth <= 768;

        this.currentPosition = new THREE.Vector3();
        this.currentScale = new THREE.Vector3(1, 1, 1);
        this.currentQuaternion = new THREE.Quaternion();
        this.hasState = false;

        this.lostFrames = 0;
        this.lostFrameThreshold = 15;

        this.visibilityThreshold = this.isMobile ? 0.1 : 0.5;
        this.positionLerp = this.isMobile ? 0.6 : 0.4;
        this.rotationSlerp = 0.35;

        this.fitFactor = 1.0;
        this.garmentScale = 1.0;
        this.refSize = 0.5;
        this.minDepth = 0.4;
        this.maxDepth = 6.0;
        this.torsoDrop = 1.1;

        // Yaw (real 3D chest direction, amplified, vertical garment)
        this.yawGain = 1.8;
        this.yawSign = 1;
        this.maxYaw = 1.0;          // ~57°
        this.yawSmooth = 0.25;
        this.smoothYaw = 0;

        this._tmp = new THREE.Vector3();
        this._scaleVec = new THREE.Vector3();
        this._yawQuat = new THREE.Quaternion();
        this.smoothInvSize = 0;
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
        const shoulderW = Math.max(Math.hypot(ls.x - rs.x, ls.y - rs.y), 0.001);

        // Yaw-invariant size cue: nose -> shoulder-mid
        const nose = landmarks[NOSE];
        const noseOK = nose && (nose.visibility ?? 1) > this.visibilityThreshold;
        let invSize = noseOK ? Math.hypot(nose.x - shoulderMidX, nose.y - shoulderMidY) : shoulderW * 0.9;
        invSize = Math.max(invSize, 0.02);
        this.smoothInvSize = this.smoothInvSize ? this.smoothInvSize + (invSize - this.smoothInvSize) * 0.3 : invSize;

        const vFOV = (camera.fov * Math.PI) / 180;
        const tanHalf = Math.tan(vFOV / 2);

        const denom = 2 * Math.max(this.smoothInvSize * this.fitFactor, 0.01) * tanHalf * camera.aspect;
        const d = clamp(this.refSize / denom, this.minDepth, this.maxDepth);
        const depthZ = camera.position.z - d;

        const torsoCenterY = shoulderMidY + this.smoothInvSize * this.torsoDrop;
        const target = this._projectAtDepth(shoulderMidX, torsoCenterY, depthZ, camera, tanHalf, this._tmp);

        // Real yaw from the 3D chest-forward axis, amplified; garment stays vertical.
        const basis = computeBodyBasis(worldLandmarks, this.visibilityThreshold, 0);
        if (basis) {
            const z = basis.z; // chest-forward in scene axes
            let yaw = Math.atan2(z.x, z.z) * this.yawSign * this.yawGain;
            yaw = clamp(yaw, -this.maxYaw, this.maxYaw);
            this.smoothYaw += (yaw - this.smoothYaw) * this.yawSmooth;
        }
        const targetQuat = this._yawQuat.setFromAxisAngle(WORLD_UP, this.smoothYaw);

        if (!this.hasState) {
            this.currentPosition.copy(target);
            this.currentScale.setScalar(this.garmentScale);
            this.currentQuaternion.copy(targetQuat);
            this.hasState = true;
        } else {
            this.currentPosition.lerp(target, this.positionLerp);
            this.currentScale.lerp(this._scaleVec.setScalar(this.garmentScale), 0.3);
            this.currentQuaternion.slerp(targetQuat, this.rotationSlerp);
        }

        garmentModel.position.copy(this.currentPosition);
        garmentModel.scale.copy(this.currentScale);
        garmentModel.quaternion.copy(this.currentQuaternion);
    }

    _projectAtDepth(nx, ny, z, camera, tanHalf, out) {
        const dist = Math.abs(z - camera.position.z);
        const height = 2 * tanHalf * dist;
        const width = height * camera.aspect;
        out.set((nx - 0.5) * width, -(ny - 0.5) * height, z);
        return out;
    }
}
