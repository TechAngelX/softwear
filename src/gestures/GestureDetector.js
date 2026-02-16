// src/gestures/GestureDetector.js

class GestureDetector {
    constructor() {
        this.history = [];
        this.maxHistoryFrames = 15;
        this.cooldownPeriod = 3000;
        this.lastGestureTime = 0;
        this.lastGestureType = null;
        this.clapState = {
            isClapping: false,
            validFrames: 0,
            requiredFrames: 2,
            cooldown: 3000,
            lastTriggerTime: 0,
            hasTriggered: false,
            distanceHistory: []
        };
        this.peaceSignState = {
            isPeaceSigning: false,
            validFrames: 0,
            requiredFrames: 3,
            cooldown: 5000,
            lastTriggerTime: 0
        };
        this.armsCrossedState = {
            isCrossing: false,
            validFrames: 0,
            requiredFrames: 5,
            cooldown: 5000,
            lastTriggerTime: 0
        };
    }

    update(landmarks) {
        if (!landmarks?.poseLandmarks) {
            this.addToHistory(null);
            this.resetStates();
            return null;
        }

        const currentTime = Date.now();
        const gestureData = this.extractGestureFeatures(landmarks);
        this.addToHistory(gestureData);
        let gestureResult = null;

        this.processClapGesture();
        if (this.clapState.hasTriggered) {
            if (currentTime - this.clapState.lastTriggerTime > this.clapState.cooldown) {
                this.clapState.lastTriggerTime = currentTime;
                gestureResult = { type: 'clap', confidence: 0.95 };
            }
            this.clapState.hasTriggered = false;
        }

        const armsCrossedResult = this.detectArmsCrossed();
        if (armsCrossedResult && !gestureResult) {
            if (currentTime - this.armsCrossedState.lastTriggerTime > this.armsCrossedState.cooldown) {
                this.armsCrossedState.lastTriggerTime = currentTime;
                gestureResult = armsCrossedResult;
            }
        }

        const peaceSignResult = this.detectPeaceSign();
        if (peaceSignResult && !gestureResult) {
            if (currentTime - this.peaceSignState.lastTriggerTime > this.peaceSignState.cooldown) {
                this.peaceSignState.lastTriggerTime = currentTime;
                gestureResult = peaceSignResult;
            }
        }

        if (!gestureResult) {
            const simplePointingResult = this.detectSimplePointing();
            if (simplePointingResult) {
                gestureResult = simplePointingResult;
            }
        }

        if (gestureResult) {
            if (gestureResult.type !== this.lastGestureType || currentTime - this.lastGestureTime > this.cooldownPeriod) {
                this.lastGestureTime = currentTime;
                this.lastGestureType = gestureResult.type;
                return gestureResult;
            }
        } else {
            this.lastGestureType = null;
        }

        return null;
    }

    processClapGesture() {
        const recentHandData = this.history.slice(-5);
        const handDistances = recentHandData.map(frame => {
            if (frame && frame.hands.left.valid && frame.hands.right.valid) {
                return {
                    distance: this.distance3D(frame.hands.left.wrist, frame.hands.right.wrist),
                    leftY: frame.hands.left.wrist.y,
                    rightY: frame.hands.right.wrist.y
                };
            }
            return null;
        });

        const validDistances = handDistances.filter(d => d !== null);

        if (validDistances.length >= 3) {
            const current = validDistances[validDistances.length - 1];
            const prev = validDistances[validDistances.length - 2];
            const prevPrev = validDistances[validDistances.length - 3];

            // Check hands were apart, then came together rapidly
            const wasApart = prevPrev.distance > 0.2;
            const cameTogetherRapidly = current.distance < prev.distance * 0.75;
            const areClose = current.distance < 0.15;

            // Check hands are at similar height (not too far apart vertically)
            const handsAtSimilarHeight = Math.abs(current.leftY - current.rightY) < 0.2;

            const isClapMotion = wasApart && cameTogetherRapidly && areClose && handsAtSimilarHeight;

            if (isClapMotion) {
                this.clapState.hasTriggered = true;
            }
        }
    }


    resetStates() {
        this.clapState.isClapping = false;
        this.clapState.hasTriggered = false;
        this.peaceSignState.isPeaceSigning = false;
        this.armsCrossedState.isCrossing = false;
    }

    extractGestureFeatures(landmarks) {
        const pose = landmarks.poseLandmarks;
        const leftHand = landmarks.leftHandLandmarks;
        const rightHand = landmarks.rightHandLandmarks;

        return {
            timestamp: Date.now(),
            hands: {
                left: this.analyseHand(leftHand),
                right: this.analyseHand(rightHand)
            },
            pose: {
                leftWrist: pose[15],
                rightWrist: pose[16],
                leftShoulder: pose[11],
                rightShoulder: pose[12],
                leftHip: pose[23],
                rightHip: pose[24]
            }
        };
    }

    analyseHand(handLandmarks) {
        if (!handLandmarks || handLandmarks.length < 21) {
            return { valid: false };
        }

        const wrist = handLandmarks[0];
        const indexTip = handLandmarks[8];
        const middleTip = handLandmarks[12];
        const ringTip = handLandmarks[16];
        const pinkyTip = handLandmarks[20];
        const thumbTip = handLandmarks[4];

        const fingersExtended = this.countExtendedFingers(handLandmarks);
        const palmFacingCamera = this.isPalmFacingCamera(handLandmarks);
        return {
            valid: true,
            wrist: wrist,
            indexTip: indexTip,
            middleTip: middleTip,
            fingersExtended: fingersExtended,
            palmFacingCamera: palmFacingCamera,
            direction: {
                x: indexTip.x - wrist.x,
                y: indexTip.y - wrist.y
            }
        };
    }

    countExtendedFingers(handLandmarks) {
        const fingerIndices = {
            THUMB: [4],
            INDEX: [8],
            MIDDLE: [12],
            RING: [16],
            PINKY: [20]
        };
        const fingersExtended = {
            thumb: this.isFingerExtended(handLandmarks, fingerIndices.THUMB),
            index: this.isFingerExtended(handLandmarks, fingerIndices.INDEX),
            middle: this.isFingerExtended(handLandmarks, fingerIndices.MIDDLE),
            ring: this.isFingerExtended(handLandmarks, fingerIndices.RING),
            pinky: this.isFingerExtended(handLandmarks, fingerIndices.PINKY)
        };
        return fingersExtended;
    }

    isFingerExtended(handLandmarks, fingerIndices) {
        const tipIndex = fingerIndices[0];
        const mcpIndex = tipIndex - 3;
        const tipY = handLandmarks[tipIndex].y;
        const mcpY = handLandmarks[mcpIndex].y;

        return tipY < mcpY;
    }

    isPalmFacingCamera(handLandmarks) {
        const wrist = handLandmarks[0];
        const middleFingerMcp = handLandmarks[9];
        const middleFingerTip = handLandmarks[12];

        const palmDirection = middleFingerTip.z - wrist.z;
        return palmDirection < -0.02;
    }

    detectArmsCrossed() {
        const recentFrames = this.history.slice(-5);
        let crossCount = 0;
        const wristToShoulderDistanceThreshold = 0.2;
        const wristToWristDistanceThreshold = 0.15; 

        for (const frame of recentFrames) {
            if (frame && frame.hands.left.valid && frame.hands.right.valid && frame.pose.leftWrist && frame.pose.rightWrist && frame.pose.leftShoulder && frame.pose.rightShoulder && frame.pose.leftHip && frame.pose.rightHip) {
                const leftWrist = frame.hands.left.wrist;
                const rightWrist = frame.hands.right.wrist;
                const leftShoulder = frame.pose.leftShoulder;
                const rightShoulder = frame.pose.rightShoulder;
                const leftHip = frame.pose.leftHip;
                const rightHip = frame.pose.rightHip;

                const isLeftWristAboveHip = leftWrist.y < leftHip.y;
                const isRightWristAboveHip = rightWrist.y < rightHip.y;

                const leftHandNearRightShoulder = this.distance3D(leftWrist, rightShoulder) < wristToShoulderDistanceThreshold;
                const rightHandNearLeftShoulder = this.distance3D(rightWrist, leftShoulder) < wristToShoulderDistanceThreshold;

                const handsAreClose = this.distance3D(leftWrist, rightWrist) < wristToWristDistanceThreshold;

                if ((leftHandNearRightShoulder || rightHandNearLeftShoulder) && isLeftWristAboveHip && isRightWristAboveHip && handsAreClose) {
                    crossCount++;
                }
            }
        }

        if (crossCount >= this.armsCrossedState.requiredFrames) {
            return { type: 'arms_crossed', confidence: 0.95 };
        }

        return null;
    }

    detectPeaceSign() {
        const recentFrames = this.history.slice(-5);
        let validFrames = 0;

        for (const frame of recentFrames) {
            const hands = [frame?.hands.left, frame?.hands.right].filter(h => h?.valid);
            for (const hand of hands) {
                if (hand.fingersExtended.index && hand.fingersExtended.middle && !hand.fingersExtended.ring && !hand.fingersExtended.pinky) {
                    validFrames++;
                    break;
                }
            }
        }

        if (validFrames >= this.peaceSignState.requiredFrames) {
            return { type: 'peace_sign', confidence: 0.95 };
        }

        return null;
    }

    detectSimplePointing() {
        const recentFrames = this.history.slice(-5);
        const framesWithLeftHand = recentFrames.filter(f => f?.hands.left.valid);
        const framesWithRightHand = recentFrames.filter(f => f?.hands.right.valid);

        // Require 3+ frames for detection
        if (framesWithLeftHand.length >= 3) {
            const avgDirection = framesWithLeftHand.reduce((sum, frame) => sum + frame.hands.left.direction.x, 0) / framesWithLeftHand.length;

            // Check hand is elevated (above waist level)
            const isHighUp = framesWithLeftHand.some(f => f.hands.left.wrist.y < 0.6);

            // Threshold of 0.15 for better detection
            if (isHighUp && avgDirection < -0.15) {
                return { type: 'pointing_right', confidence: 0.8, hand: 'left' };
            }

            if (isHighUp && avgDirection > 0.15) {
                return { type: 'pointing_left', confidence: 0.8, hand: 'left' };
            }
        }

        if (framesWithRightHand.length >= 3) {
            const avgDirection = framesWithRightHand.reduce((sum, frame) => sum + frame.hands.right.direction.x, 0) / framesWithRightHand.length;

            // Check hand is elevated (above waist level)
            const isHighUp = framesWithRightHand.some(f => f.hands.right.wrist.y < 0.6);

            // Threshold of 0.15 for better detection
            if (isHighUp && avgDirection < -0.15) {
                return { type: 'pointing_right', confidence: 0.8, hand: 'right' };
            }

            if (isHighUp && avgDirection > 0.15) {
                return { type: 'pointing_left', confidence: 0.8, hand: 'right' };
            }
        }

        return null;
    }
    distance3D(a, b) {
        if (!a || !b) return Infinity;
        return Math.sqrt(
            Math.pow(a.x - b.x, 2) +
            Math.pow(a.y - b.y, 2) +
            Math.pow(a.z - b.z, 2)
        );
    }

    addToHistory(gestureData) {
        this.history.push(gestureData);
        if (this.history.length > this.maxHistoryFrames) {
            this.history.shift();
        }
    }
}

export { GestureDetector };
