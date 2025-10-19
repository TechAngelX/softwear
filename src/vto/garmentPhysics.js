// main/src/vto/garmentPhysics.js
import { OneEuroFilter } from '../utils/OneEuroFilter';

// TODO - still some work / research to do here (time permitting...)

/**
 * Physics simulation system for realistic garment behaviour.
 * Handles cloth dynamics, collision detection, and movement response.
 *
 * @class GarmentPhysics
 */

const LANDMARKS = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
};

const filterConfig = { freq: 30, mincutoff: 0.5, beta: 0.5, dcutoff: 1.0 };

export class GarmentPhysics {
    constructor() {
        this.lastTorsoX = null;
        this.lastTimestamp = null;
        this.swayVelocity = 0;
        this.velocityFilter = new OneEuroFilter(filterConfig.freq, filterConfig.mincutoff, filterConfig.beta, filterConfig.dcutoff);
    }

    update(landmarks) {
        if (!landmarks || !landmarks[LANDMARKS.LEFT_SHOULDER] || !landmarks[LANDMARKS.RIGHT_SHOULDER]) {
            this.swayVelocity *= 0.9;
            return;
        }

        const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];

        const currentTorsoX = (leftShoulder.x + rightShoulder.x) / 2;
        const now = Date.now();

        if (this.lastTorsoX !== null && this.lastTimestamp !== null) {
            const deltaTime = (now - this.lastTimestamp) / 1000.0;
            if (deltaTime > 0) {
                const velocity = (currentTorsoX - this.lastTorsoX) / deltaTime;
                const smoothedVelocity = this.velocityFilter.filter(velocity, now);

                this.swayVelocity = smoothedVelocity * 1.5;
            }
        }

        this.lastTorsoX = currentTorsoX;
        this.lastTimestamp = now;
    }

    getSway() {
        this.swayVelocity *= 0.95;
        return Math.max(-1.0, Math.min(1.0, this.swayVelocity));
    }
}
