// src/vto/holisticManager.js

/**
 * Shared MediaPipe Holistic singleton.
 *
 * Both the desktop (MainDisplay) and mobile (MobileView) try-on paths need a
 * single Holistic instance to avoid multiple instances competing for the camera.
 * This module centralises creation and guards against concurrent initialisation.
 *
 * @module holisticManager
 */

import { Holistic } from '@mediapipe/holistic';

let globalHolistic = null;
let isInitialising = false;

/**
 * Creates (or returns the existing) shared Holistic instance.
 *
 * @param {boolean} isMobile - Use the lighter model/thresholds tuned for mobile.
 * @returns {Promise<Holistic>} The initialised Holistic instance.
 * @throws Propagates any initialisation error so callers can surface it.
 */
export async function initialiseGlobalHolistic(isMobile = false) {
    if (globalHolistic) return globalHolistic;

    // If another caller is mid-initialisation, wait for it rather than racing.
    if (isInitialising) {
        while (isInitialising) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return globalHolistic;
    }

    isInitialising = true;
    try {
        const holistic = new Holistic({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
        });

        holistic.setOptions({
            selfieMode: false,
            modelComplexity: isMobile ? 0 : 1,
            smoothLandmarks: false,
            enableSegmentation: true,
            smoothSegmentation: true,
            refineFaceLandmarks: false,
            minDetectionConfidence: isMobile ? 0.4 : 0.5,
            minTrackingConfidence: isMobile ? 0.3 : 0.5
        });

        await holistic.initialize();
        globalHolistic = holistic;
        return holistic;
    } catch (error) {
        globalHolistic = null;
        throw error;
    } finally {
        isInitialising = false;
    }
}

/** @returns {Holistic|null} The current shared instance, if any. */
export function getGlobalHolistic() {
    return globalHolistic;
}
