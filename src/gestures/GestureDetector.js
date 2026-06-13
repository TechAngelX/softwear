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

        // Authoritative gesture recogniser.
        // - Held gestures (pointing / arms-crossed / peace) must be sustained for
        //   holdMs before firing once — kills accidental flicks.
        // - Edge gestures (clap) fire the instant the pose appears, because a clap
        //   is momentary; requiring a hold would miss it.
        this.hold = { type: null, startTime: 0, frames: 0, fired: false };
        this.holdMs = 300;
        this.minHoldFrames = 3;
        this.globalCooldownMs = 900;
        this.lastFireTime = 0;
        this.edgeGestures = new Set(['clap']);

        // Arming state for UI feedback (#8): what gesture is being held and how
        // close it is to firing (0..1). Read by the view after each update().
        this.pending = null;
    }

    update(landmarks) {
        if (!landmarks?.poseLandmarks) {
            this.addToHistory(null);
            this.resetStates();
            this.hold = { type: null, startTime: 0, frames: 0, fired: false };
            this.pending = null;
            return null;
        }

        const now = Date.now();
        this.addToHistory(this.extractGestureFeatures(landmarks));

        const candidate = this.detectCandidate(landmarks);
        const cooledDown = (now - this.lastFireTime) >= this.globalCooldownMs;
        let fired = null;

        if (candidate !== this.hold.type) {
            // New candidate this frame. Edge gestures (clap) fire immediately.
            this.hold = { type: candidate, startTime: now, frames: candidate ? 1 : 0, fired: false };
            if (candidate && this.edgeGestures.has(candidate) && cooledDown) {
                fired = this._fire(candidate, now);
            }
        } else if (candidate) {
            // Same candidate continuing — held (level) gestures arm over holdMs.
            this.hold.frames++;
            if (!this.hold.fired && !this.edgeGestures.has(candidate)) {
                const heldLongEnough = (now - this.hold.startTime) >= this.holdMs && this.hold.frames >= this.minHoldFrames;
                if (heldLongEnough && cooledDown) {
                    fired = this._fire(candidate, now);
                }
            }
        }

        // Publish arming progress for on-screen feedback (held gestures only).
        if (candidate && !this.edgeGestures.has(candidate) && !this.hold.fired) {
            this.pending = { type: candidate, progress: Math.min(1, (now - this.hold.startTime) / this.holdMs) };
        } else {
            this.pending = null;
        }

        return fired;
    }

    _fire(type, now) {
        this.hold.fired = true;
        this.lastFireTime = now;
        this.lastGestureTime = now;
        this.lastGestureType = type;
        this.pending = null;
        return { type, confidence: 0.95 };
    }

    /**
     * Resolves the single, unambiguous gesture the body is making this frame.
     * Pose-skeleton driven (robust) with priority ordering so similar poses
     * (crossed arms vs. hands together) never conflict.
     */
    detectCandidate(landmarks) {
        const poseGesture = this.detectPoseGesture(landmarks.poseLandmarks);
        if (poseGesture) return poseGesture;
        if (this.isPeaceSignFrame(landmarks)) return 'peace_sign';
        return null;
    }

    detectPoseGesture(pose) {
        if (!pose) return null;

        const Lsh = pose[11], Rsh = pose[12];
        const Lel = pose[13], Rel = pose[14];
        const Lw = pose[15], Rw = pose[16];
        const Lhip = pose[23], Rhip = pose[24];
        if (!Lsh || !Rsh || !Lw || !Rw) return null;

        // Require the key joints to be confidently tracked.
        if ([Lsh, Rsh, Lw, Rw].some(p => (p.visibility ?? 1) < 0.5)) return null;

        // Everything is scaled by shoulder width so it is distance-invariant.
        const sw = Math.hypot(Lsh.x - Rsh.x, Lsh.y - Rsh.y);
        if (sw < 0.05) return null; // person too small / not facing camera — unreliable

        const shoulderY = (Lsh.y + Rsh.y) / 2;
        const midShoulderX = (Lsh.x + Rsh.x) / 2;
        const hipY = (Lhip && Rhip) ? (Lhip.y + Rhip.y) / 2 : shoulderY + sw * 1.5;
        const wristGap = Math.hypot(Lw.x - Rw.x, Lw.y - Rw.y);

        // 1) Arms crossed — each wrist near the OPPOSITE shoulder, high on the torso.
        const lwToRsh = Math.hypot(Lw.x - Rsh.x, Lw.y - Rsh.y);
        const rwToLsh = Math.hypot(Rw.x - Lsh.x, Rw.y - Lsh.y);
        const handsHigh = Lw.y < shoulderY + 0.45 * sw && Rw.y < shoulderY + 0.45 * sw;
        if (lwToRsh < 0.6 * sw && rwToLsh < 0.6 * sw && handsHigh && wristGap < 0.8 * sw) {
            return 'arms_crossed';
        }

        // 2) Hands together (clap) — wrists meet near the centre line, anywhere
        //    from just above the shoulders down to the hips. Edge-triggered.
        const centred = Math.abs((Lw.x + Rw.x) / 2 - midShoulderX) < 0.6 * sw;
        const inTorsoBand = Lw.y > shoulderY - 0.2 * sw && Rw.y > shoulderY - 0.2 * sw && Lw.y < hipY && Rw.y < hipY;
        if (wristGap < 0.5 * sw && centred && inTorsoBand) {
            return 'clap';
        }

        // 3) Pointing — a natural reach to one side at ANY comfortable height.
        //    The arm must be extended outward: the wrist is clearly outside the
        //    shoulder AND past the elbow (so a resting/hanging arm never counts).
        //    Image x is mirrored on screen, so a wrist reaching toward image-left
        //    reads to the user as "pointing right".
        const REACH = 0.25 * sw;       // wrist this far outside the shoulder
        const elbowMargin = 0.05 * sw; // and clearly beyond the elbow
        const relReliable = (Rel?.visibility ?? 1) >= 0.5;
        const lelReliable = (Lel?.visibility ?? 1) >= 0.5;

        const rightReach = (Rsh.x - Rw.x) > REACH && (!relReliable || Rw.x < Rel.x - elbowMargin);
        const leftReach = (Lw.x - Lsh.x) > REACH && (!lelReliable || Lw.x > Lel.x + elbowMargin);

        if (rightReach && !leftReach) return 'pointing_right';
        if (leftReach && !rightReach) return 'pointing_left';
        if (rightReach && leftReach) {
            // Both arms out — go with whichever is reaching further.
            return (Rsh.x - Rw.x) >= (Lw.x - Lsh.x) ? 'pointing_right' : 'pointing_left';
        }

        return null;
    }

    isPeaceSignFrame(landmarks) {
        for (const hand of [landmarks.leftHandLandmarks, landmarks.rightHandLandmarks]) {
            const h = this.analyseHand(hand);
            if (h.valid && h.fingersExtended.index && h.fingersExtended.middle &&
                !h.fingersExtended.ring && !h.fingersExtended.pinky) {
                return true;
            }
        }
        return false;
    }

    processClapGesture() {
        // Use POSE wrists (landmarks 15/16) rather than hand landmarks: when the
        // hands meet they occlude each other and MediaPipe routinely drops one
        // hand, so hand-landmark based clap detection almost never fires. Pose
        // wrists stay tracked through the whole motion.
        const recentFrames = this.history.slice(-6);
        const samples = recentFrames.map(frame => {
            const lw = frame?.pose?.leftWrist;
            const rw = frame?.pose?.rightWrist;
            if (!lw || !rw) return null;
            if ((lw.visibility ?? 1) < 0.4 || (rw.visibility ?? 1) < 0.4) return null;
            // 2D distance — z from pose is too noisy to be useful here
            return {
                distance: Math.hypot(lw.x - rw.x, lw.y - rw.y),
                heightDiff: Math.abs(lw.y - rw.y)
            };
        }).filter(Boolean);

        if (samples.length < 3) return;

        const current = samples[samples.length - 1];
        const prev = samples[samples.length - 2];
        const prevPrev = samples[samples.length - 3];

        // Hands were clearly apart, then came together quickly, and ended close
        // and roughly level — distinguishes a clap from resting clasped hands.
        const wasApart = Math.max(prev.distance, prevPrev.distance) > 0.22;
        const cameTogetherRapidly = current.distance < prev.distance * 0.82;
        const areClose = current.distance < 0.18;
        const handsAtSimilarHeight = current.heightDiff < 0.2;

        if (wasApart && cameTogetherRapidly && areClose && handsAtSimilarHeight) {
            this.clapState.hasTriggered = true;
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

        // A hand only spans ~10% of the image width, so the fingertip->wrist
        // horizontal offset when pointing sideways is small. 0.15 was unreachable;
        // ~0.05 reliably catches a deliberate sideways point. Image x is mirrored
        // on screen, so a fingertip to the image-left reads as "pointing right".
        const DIRECTION_THRESHOLD = 0.05;
        const ELEVATION = 0.7; // wrist above this (lower y = higher) counts as raised

        if (framesWithLeftHand.length >= 3) {
            const avgDirection = framesWithLeftHand.reduce((sum, frame) => sum + frame.hands.left.direction.x, 0) / framesWithLeftHand.length;
            const isHighUp = framesWithLeftHand.some(f => f.hands.left.wrist.y < ELEVATION);

            if (isHighUp && avgDirection < -DIRECTION_THRESHOLD) {
                return { type: 'pointing_right', confidence: 0.8, hand: 'left' };
            }
            if (isHighUp && avgDirection > DIRECTION_THRESHOLD) {
                return { type: 'pointing_left', confidence: 0.8, hand: 'left' };
            }
        }

        if (framesWithRightHand.length >= 3) {
            const avgDirection = framesWithRightHand.reduce((sum, frame) => sum + frame.hands.right.direction.x, 0) / framesWithRightHand.length;
            const isHighUp = framesWithRightHand.some(f => f.hands.right.wrist.y < ELEVATION);

            if (isHighUp && avgDirection < -DIRECTION_THRESHOLD) {
                return { type: 'pointing_right', confidence: 0.8, hand: 'right' };
            }
            if (isHighUp && avgDirection > DIRECTION_THRESHOLD) {
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
