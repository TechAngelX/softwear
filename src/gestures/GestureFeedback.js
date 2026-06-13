// src/gestures/GestureFeedback.js

/**
 * On-screen "arming" feedback for held gestures. As the user holds a recognised
 * pose, a labelled progress bar fills toward the trigger point, so the system
 * visibly responds before it fires. This closed-loop feedback is what makes the
 * gesture controls feel reliable rather than guesswork.
 *
 * @param {{ type: string, progress: number }|null} pending - Current arming state.
 */
import React from 'react';

const LABELS = {
    pointing_right: 'Next garment ▶',
    pointing_left: '◀ Previous garment',
    arms_crossed: 'Swap model',
    peace_sign: 'Selfie',
};

const GestureFeedback = ({ pending }) => {
    if (!pending) return null;
    const label = LABELS[pending.type];
    if (!label) return null;

    const pct = Math.max(0, Math.min(100, Math.round((pending.progress || 0) * 100)));

    return (
        <div className={`gesture-feedback gesture-feedback--${pending.type}`} aria-hidden="true">
            <div className="gesture-feedback-label">{label}</div>
            <div className="gesture-feedback-track">
                <div className="gesture-feedback-fill" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

export default GestureFeedback;
