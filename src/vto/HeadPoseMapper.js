// src/vto/HeadPoseMapper.js
import * as THREE from 'three';
import { OneEuroFilter } from '../utils/OneEuroFilter';

const MEDIAPIPE_FACE_LANDMARKS = {
    NOSE_TIP: 1,
    LEFT_EYE_OUTER: 33,
    RIGHT_EYE_OUTER: 263,
    LEFT_EAR: 234,
    RIGHT_EAR: 454,
    FOREHEAD: 10,
    CHIN: 152
};

export class HeadPoseMapper {
    constructor(smplxData = null) {
        this.lastPosition = new THREE.Vector3();
        this.lastQuaternion = new THREE.Quaternion();
        this.lastScale = new THREE.Vector3(1, 1, 1);
        this.isInitialised = false;
        this.smplxData = smplxData;

        const filterConfig = {
            freq: 30,
            mincutoff: 1.0,
            beta: 0.1,
            dcutoff: 1.0
        };

        this.positionFilters = {
            x: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff),
            y: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff),
            z: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff)
        };

        this.rotationFilters = {
            x: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff),
            y: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff),
            z: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff),
            w: new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff)
        };

        this.scaleFilter = new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff);
    }

    getLandmark(landmarks, index) {
        if (!landmarks || !landmarks[index]) return null;
        const { x, y, z } = landmarks[index];
        return new THREE.Vector3(x * 2 - 1, (1 - y) * 2 - 1, z * -2);
    }

    calculateAccessoryPosition(faceLandmarks, garmentDetails) {
        console.log('Garment details:', garmentDetails);
        console.log('Head type:', garmentDetails?.headType);
        console.log('SMPLX data available:', !!this.smplxData);
        const leftEye = this.getLandmark(faceLandmarks, MEDIAPIPE_FACE_LANDMARKS.LEFT_EYE_OUTER);
        const rightEye = this.getLandmark(faceLandmarks, MEDIAPIPE_FACE_LANDMARKS.RIGHT_EYE_OUTER);
        const nose = this.getLandmark(faceLandmarks, MEDIAPIPE_FACE_LANDMARKS.NOSE_TIP);

        if (!leftEye || !rightEye || !nose) return null;

        let basePosition;
        if (garmentDetails?.category === 'glasses') {
            basePosition = new THREE.Vector3().addVectors(leftEye, rightEye).multiplyScalar(0.5);
        } else {
            basePosition = new THREE.Vector3().lerpVectors(
                new THREE.Vector3().addVectors(leftEye, rightEye).multiplyScalar(0.5),
                nose,
                0.2
            );
        }

        if (this.smplxData) {
            console.log('Applying SMPLX adjustments');
            const headBone = this.smplxData.head;
            const headHeight = headBone.tail[2] - headBone.head[2];
            const eyeWidth = Math.abs(this.smplxData.left_eye_smplhf.head[0] - this.smplxData.right_eye_smplhf.head[0]);

            if (garmentDetails?.headType === 'glasses') {
                console.log('Adjusting for glasses');
                basePosition.x += eyeWidth * -2.2;
            } else if (garmentDetails?.headType === 'hat') {
                console.log('Adjusting for hat');
                const foreheadLevel = headHeight * 7.0;
                basePosition.x += eyeWidth * -2.2;
                basePosition.y += foreheadLevel * 0.2;
                console.log('Hat adjustment applied:', foreheadLevel * 0.2);
            }
        }

        return basePosition;
    }

    calculateProportionalScale(faceWidth, garmentDetails) {
        if (this.smplxData) {
            const eyeWidth = Math.abs(this.smplxData.left_eye_smplhf.head[0] - this.smplxData.right_eye_smplhf.head[0]);
            const proportionalBase = eyeWidth * 26.5;          
            return proportionalBase + (faceWidth * (garmentDetails?.scale || 1.0) );
        }

        const baseScale = 2.3;
        const scaleMultiplier = (garmentDetails?.scale || 1.0);
        return baseScale + (faceWidth * scaleMultiplier);
    }

    update(faceLandmarks, garmentDetails) {
        if (!faceLandmarks) return null;

        const leftEar = this.getLandmark(faceLandmarks, MEDIAPIPE_FACE_LANDMARKS.LEFT_EAR);
        const rightEar = this.getLandmark(faceLandmarks, MEDIAPIPE_FACE_LANDMARKS.RIGHT_EAR);
        const forehead = this.getLandmark(faceLandmarks, MEDIAPIPE_FACE_LANDMARKS.FOREHEAD);
        const chin = this.getLandmark(faceLandmarks, MEDIAPIPE_FACE_LANDMARKS.CHIN);

        if (!leftEar || !rightEar || !forehead || !chin) return null;

        const faceWidth = leftEar.distanceTo(rightEar);

        const position = this.calculateAccessoryPosition(faceLandmarks, garmentDetails);
        if (!position) return null;

        const midPointEars = new THREE.Vector3().addVectors(leftEar, rightEar).multiplyScalar(0.5);
        const forward = new THREE.Vector3().subVectors(chin, forehead).normalize();
        const up = new THREE.Vector3().subVectors(forehead, midPointEars).normalize();
        const right = new THREE.Vector3().crossVectors(up, forward).normalize();
        up.crossVectors(forward, right).normalize();

        const rotationMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
        let quaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
        quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2));

        const finalScale = this.calculateProportionalScale(faceWidth, garmentDetails);
        const scale = new THREE.Vector3(finalScale, finalScale, finalScale);

        const timestamp = Date.now();

        if (!this.isInitialised) {
            this.lastPosition.copy(position);
            this.lastQuaternion.copy(quaternion);
            this.lastScale.copy(scale);
            this.isInitialised = true;
        } else {
            this.lastPosition.set(
                this.positionFilters.x.filter(position.x, timestamp),
                this.positionFilters.y.filter(position.y, timestamp),
                this.positionFilters.z.filter(position.z, timestamp)
            );

            this.lastQuaternion.set(
                this.rotationFilters.x.filter(quaternion.x, timestamp),
                this.rotationFilters.y.filter(quaternion.y, timestamp),
                this.rotationFilters.z.filter(quaternion.z, timestamp),
                this.rotationFilters.w.filter(quaternion.w, timestamp)
            ).normalize();

            const smoothScale = this.scaleFilter.filter(finalScale, timestamp);
            this.lastScale.set(smoothScale, smoothScale, smoothScale);
        }

        return {
            position: this.lastPosition,
            quaternion: this.lastQuaternion,
            scale: this.lastScale
        };
    }
}
