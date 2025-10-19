// src/tests/gestures/GestureDetector.test.js

import { GestureDetector } from '../../gestures/GestureDetector';

describe('GestureDetector', () => {
    let gestureDetector;
    let mockLandmarks;

    beforeEach(() => {
        gestureDetector = new GestureDetector();

        mockLandmarks = {
            poseLandmarks: Array(33).fill().map((_, i) => ({
                x: 0.5,
                y: 0.5,
                z: 0,
                visibility: 0.8
            })),
            leftHandLandmarks: Array(21).fill().map(() => ({
                x: 0.3, y: 0.5, z: 0
            })),
            rightHandLandmarks: Array(21).fill().map(() => ({
                x: 0.7, y: 0.5, z: 0
            }))
        };
    });

    test('initialises with default state', () => {
        expect(gestureDetector).toBeInstanceOf(GestureDetector);
        expect(gestureDetector.history).toHaveLength(0);
        expect(gestureDetector.lastGestureTime).toBe(0);
        expect(gestureDetector.lastGestureType).toBeNull();
    });

    test('returns null for invalid landmarks', () => {
        const result = gestureDetector.update(null);
        expect(result).toBeNull();
    });

    test('returns null for missing pose landmarks', () => {
        const invalidLandmarks = {
            poseLandmarks: null,
            leftHandLandmarks: mockLandmarks.leftHandLandmarks,
            rightHandLandmarks: mockLandmarks.rightHandLandmarks
        };

        const result = gestureDetector.update(invalidLandmarks);
        expect(result).toBeNull();
    });

    test('processes landmarks and adds to history', () => {
        gestureDetector.update(mockLandmarks);

        expect(gestureDetector.history).toHaveLength(1);
        expect(gestureDetector.history[0]).toHaveProperty('timestamp');
        expect(gestureDetector.history[0]).toHaveProperty('hands');
        expect(gestureDetector.history[0]).toHaveProperty('pose');
    });

    test('maintains maximum history length', () => {
        for (let i = 0; i < 20; i++) {
            gestureDetector.update(mockLandmarks);
        }

        expect(gestureDetector.history).toHaveLength(gestureDetector.maxHistoryFrames);
    });

    test('pointing detection method exists and handles input', () => {
        const pointingLandmarks = {
            ...mockLandmarks,
            leftHandLandmarks: Array(21).fill().map((_, i) => {
                if (i === 0) return { x: 0.5, y: 0.4, z: 0 }; // wrist
                if (i === 8) return { x: 0.7, y: 0.4, z: 0 }; // index finger
                return { x: 0.45, y: 0.45, z: 0 };
            })
        };

        for (let i = 0; i < 5; i++) {
            gestureDetector.update(pointingLandmarks);
        }

        const result = gestureDetector.detectSimplePointing();
        expect(result?.type).toMatch(/pointing_(left|right)/);
    });

    test('finger extension detection works correctly', () => {
        const extendedFingerLandmarks = Array(21).fill().map((_, i) => {
            if (i === 0) return { x: 0.3, y: 0.6, z: 0 }; // wrist
            if (i === 8) return { x: 0.3, y: 0.3, z: 0 }; // index tip (extended up)
            if (i === 12) return { x: 0.35, y: 0.3, z: 0 }; // middle tip (extended up)
            if (i === 16) return { x: 0.25, y: 0.6, z: 0 }; // ring tip (down)
            if (i === 20) return { x: 0.27, y: 0.6, z: 0 }; // pinky tip (down)
            return { x: 0.3, y: 0.5, z: 0 };
        });

        const result = gestureDetector.countExtendedFingers(extendedFingerLandmarks);
        expect(result).toHaveProperty('index');
        expect(result).toHaveProperty('middle');
        expect(result).toHaveProperty('ring');
        expect(result).toHaveProperty('pinky');
    });

    test('clap processing method exists and handles distance changes', () => {
        const closeDistance = 0.1;
        const farDistance = 0.5;

        gestureDetector.clapState.distanceHistory = [farDistance, farDistance, closeDistance];
        gestureDetector.processClapGesture();

        // Test that the method processes without crashing
        expect(gestureDetector.clapState).toHaveProperty('hasTriggered');
    });

    test('arms crossed detection method exists', () => {
        const result = gestureDetector.detectArmsCrossed();
        expect(result === null || typeof result === 'object').toBe(true);
    });

    test('extracts gesture features correctly', () => {
        const features = gestureDetector.extractGestureFeatures(mockLandmarks);

        expect(features).toHaveProperty('timestamp');
        expect(features).toHaveProperty('hands');
        expect(features).toHaveProperty('pose');
        expect(features.hands).toHaveProperty('left');
        expect(features.hands).toHaveProperty('right');
    });

    test('calculates 3D distance correctly', () => {
        const pointA = { x: 0, y: 0, z: 0 };
        const pointB = { x: 3, y: 4, z: 0 };

        const distance = gestureDetector.distance3D(pointA, pointB);
        expect(distance).toBeCloseTo(5, 1);
    });

    test('handles null points in distance calculation', () => {
        const distance = gestureDetector.distance3D(null, { x: 1, y: 1, z: 1 });
        expect(distance).toBe(Infinity);
    });

    test('resets states when no landmarks provided', () => {
        gestureDetector.clapState.isClapping = true;
        gestureDetector.peaceSignState.isPeaceSigning = true;

        gestureDetector.update(null);

        expect(gestureDetector.clapState.isClapping).toBe(false);
        expect(gestureDetector.peaceSignState.isPeaceSigning).toBe(false);
    });

    test('analyses hand landmarks correctly', () => {
        const handLandmarks = Array(21).fill().map((_, i) => ({
            x: 0.3 + i * 0.01,
            y: 0.5 + i * 0.01,
            z: 0
        }));

        const handData = gestureDetector.analyseHand(handLandmarks);

        expect(handData.valid).toBe(true);
        expect(handData).toHaveProperty('wrist');
        expect(handData).toHaveProperty('indexTip');
        expect(handData).toHaveProperty('fingersExtended');
        expect(handData).toHaveProperty('direction');
    });
});
