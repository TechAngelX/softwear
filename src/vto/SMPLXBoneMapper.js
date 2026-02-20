// src/vto/SMPLXBoneMapper.js
import * as THREE from 'three';

const MEDIAPIPE_LANDMARKS = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
};

export class SMPLXPoseMapper {
    constructor(boneData = {}, isMobile = false) {
        this.initialized = false;
        this.boneMap = {};
        this.skeleton = null;
        this.boneData = boneData;
        this.lastMorphInfluence = 0.0;
        this.lastBoneQuaternions = {};
        this.lastUpdateTime = 0;
        this.visibilityThreshold = isMobile ? 0.1 : 0.5;

        this.bindVectors = this.calculateBindVectors(boneData);

        this.shoulderWidthMultiplier = 1.75;
        this.downThreshold = -0.85;
        this.slerpAmount = 0.3;

        this.worldVectors = {
            up: new THREE.Vector3(0, 1, 0),
        };
    }

    calculateBindVectors(boneData) {
        if (!boneData || !boneData.left_shoulder) {
            return {
                leftArm: new THREE.Vector3(1, 0, 0),
                rightArm: new THREE.Vector3(-1, 0, 0),
                leftForearm: new THREE.Vector3(1, 0, 0),
                rightForearm: new THREE.Vector3(-1, 0, 0),
                spine: new THREE.Vector3(0, 1, 0),
            };
        }

        const leftShoulderPos = new THREE.Vector3(...boneData.left_shoulder.head);
        const leftElbowPos = new THREE.Vector3(...boneData.left_elbow.head);
        const rightShoulderPos = new THREE.Vector3(...boneData.right_shoulder.head);
        const rightElbowPos = new THREE.Vector3(...boneData.right_elbow.head);
        const leftWristPos = new THREE.Vector3(...boneData.left_wrist.head);
        const rightWristPos = new THREE.Vector3(...boneData.right_wrist.head);

        const leftArmDir = new THREE.Vector3().subVectors(leftElbowPos, leftShoulderPos).normalize();
        const rightArmDir = new THREE.Vector3().subVectors(rightElbowPos, rightShoulderPos).normalize();
        const leftForearmDir = new THREE.Vector3().subVectors(leftWristPos, leftElbowPos).normalize();
        const rightForearmDir = new THREE.Vector3().subVectors(rightWristPos, rightElbowPos).normalize();

        return {
            leftArm: leftArmDir,
            rightArm: rightArmDir,
            leftForearm: leftForearmDir,
            rightForearm: rightForearmDir,
            spine: new THREE.Vector3(0, 1, 0),
        };
    }

    initializeBones(riggedModel) {
        this.boneMap = {};
        this.skeleton = null;
        this.lastBoneQuaternions = {};

        if (riggedModel) {
            riggedModel.traverse((object) => {
                if (object.isSkinnedMesh && object.skeleton) {
                    this.skeleton = object.skeleton;
                    object.skeleton.bones.forEach(bone => {
                        if (bone.name) {
                            this.boneMap[bone.name] = bone;
                        }
                    });
                }
            });
        }
        this.initialized = Object.keys(this.boneMap).length > 0;
    }

    applyPoseToRiggedGarment(model, landmarks, filters, timestamp) {
        if (!this.initialized || !landmarks || !model) {
            return;
        }

        if (timestamp - this.lastUpdateTime < 33) {
            return;
        }
        this.lastUpdateTime = timestamp;

        if (!landmarks[MEDIAPIPE_LANDMARKS.LEFT_SHOULDER] || !landmarks[MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER] ||
            !landmarks[MEDIAPIPE_LANDMARKS.LEFT_ELBOW] || !landmarks[MEDIAPIPE_LANDMARKS.RIGHT_ELBOW] ||
            !landmarks[MEDIAPIPE_LANDMARKS.LEFT_WRIST] || !landmarks[MEDIAPIPE_LANDMARKS.RIGHT_WRIST]) {
            return;
        }

        const landmarkCache = {};

        const leftShoulder = landmarks[MEDIAPIPE_LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER];
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;

        const getLandmark = (index) => {
            if (!landmarkCache[index]) {
                const { x, y, z } = landmarks[index];

                if (landmarks[index].visibility < this.visibilityThreshold) {
                    landmarkCache[index] = new THREE.Vector3(0, 0, 0);
                    return landmarkCache[index];
                }

                let finalX = x;
                if ([11, 13, 15].includes(index)) {
                    finalX = shoulderCenterX - (shoulderCenterX - x) * this.shoulderWidthMultiplier;
                } else if ([12, 14, 16].includes(index)) {
                    finalX = shoulderCenterX + (x - shoulderCenterX) * this.shoulderWidthMultiplier;
                }

                landmarkCache[index] = new THREE.Vector3(
                    (finalX - 0.5) * 2,
                    -(y - 0.5) * 2,
                    -z * 2
                );
            }
            return landmarkCache[index];
        };

        const shoulderMidpoint = new THREE.Vector3().addVectors(
            getLandmark(MEDIAPIPE_LANDMARKS.LEFT_SHOULDER),
            getLandmark(MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER)
        ).multiplyScalar(0.5);
        const hipMidpoint = new THREE.Vector3().addVectors(
            getLandmark(MEDIAPIPE_LANDMARKS.LEFT_HIP),
            getLandmark(MEDIAPIPE_LANDMARKS.RIGHT_HIP)
        ).multiplyScalar(0.5);
        const torsoRotation = this.calculateBoneRotation(hipMidpoint, shoulderMidpoint, this.bindVectors.spine);

        const spineBones = ['spine1', 'spine2', 'spine3'];
        spineBones.forEach((boneName, index) => {
            if (this.boneMap[boneName] && filters && filters[boneName]) {
                const partialRotation = new THREE.Quaternion().slerp(torsoRotation, (index + 1) / spineBones.length * 0.5);
                const smoothed = this.filterQuaternion(partialRotation, torsoRotation, timestamp);
                this.boneMap[boneName].quaternion.copy(smoothed);
            }
        });

        const leftArmVec = new THREE.Vector3().subVectors(getLandmark(MEDIAPIPE_LANDMARKS.LEFT_WRIST), getLandmark(MEDIAPIPE_LANDMARKS.LEFT_SHOULDER)).normalize();
        const rightArmVec = new THREE.Vector3().subVectors(getLandmark(MEDIAPIPE_LANDMARKS.RIGHT_WRIST), getLandmark(MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER)).normalize();
        const isLeftArmDown = leftArmVec.y < this.downThreshold;
        const isRightArmDown = rightArmVec.y < this.downThreshold;

        const armBones = {
            'left_shoulder': () => this.calculateBoneRotation(getLandmark(MEDIAPIPE_LANDMARKS.LEFT_SHOULDER), getLandmark(MEDIAPIPE_LANDMARKS.LEFT_ELBOW), this.bindVectors.leftArm),
            'right_shoulder': () => this.calculateBoneRotation(getLandmark(MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER), getLandmark(MEDIAPIPE_LANDMARKS.RIGHT_ELBOW), this.bindVectors.rightArm),
            'left_elbow': () => this.calculateBoneRotation(getLandmark(MEDIAPIPE_LANDMARKS.LEFT_ELBOW), getLandmark(MEDIAPIPE_LANDMARKS.LEFT_WRIST), this.bindVectors.leftForearm),
            'right_elbow': () => this.calculateBoneRotation(getLandmark(MEDIAPIPE_LANDMARKS.RIGHT_ELBOW), getLandmark(MEDIAPIPE_LANDMARKS.RIGHT_WRIST), this.bindVectors.rightForearm),
        };

        Object.keys(armBones).forEach(boneName => {
            if (!this.boneMap[boneName]) return;

            const isLeft = boneName.includes('left');
            if ((isLeft && isLeftArmDown) || (!isLeft && isRightArmDown)) {
                return;
            }

            const targetQuaternion = armBones[boneName]();
            const lastQuat = this.lastBoneQuaternions[boneName] || this.boneMap[boneName].quaternion.clone();
            lastQuat.slerp(targetQuaternion, this.slerpAmount);
            this.boneMap[boneName].quaternion.copy(lastQuat);
            this.lastBoneQuaternions[boneName] = lastQuat.clone();
        });

        model.traverse((node) => {
            if (node.isSkinnedMesh && node.morphTargetInfluences && node.morphTargetInfluences.length > 0) {
                const time = timestamp * 0.001;
                const rawInfluence = (Math.sin(time) + 1) / 2;
                const MAX_INFLUENCE = 1.0;
                const targetInfluence = Math.min(rawInfluence, MAX_INFLUENCE);
                this.lastMorphInfluence += (targetInfluence - this.lastMorphInfluence) * 0.05;
                node.morphTargetInfluences[0] = this.lastMorphInfluence;
            }
        });
    }

    calculateBoneRotation(p1, p2, bindVector) {
        const direction = new THREE.Vector3().subVectors(p2, p1);
        if (direction.lengthSq() < 0.0001) {
            return new THREE.Quaternion();
        }
        direction.normalize();
        return new THREE.Quaternion().setFromUnitVectors(bindVector, direction);
    }

    filterQuaternion(quaternion, filterSet, timestamp) {
        if (!filterSet) {
            return quaternion;
        }
        const smoothed = new THREE.Quaternion(
            filterSet.x ? filterSet.x.filter(quaternion.x, timestamp) : quaternion.x,
            filterSet.y ? filterSet.y.filter(quaternion.y, timestamp) : quaternion.y,
            filterSet.z ? filterSet.z.filter(quaternion.z, timestamp) : quaternion.z,
            filterSet.w ? filterSet.w.filter(quaternion.w, timestamp) : quaternion.w
        );
        return smoothed.normalize();
    }
}
