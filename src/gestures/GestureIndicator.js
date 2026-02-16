// src/gestures/GestureIndicator.js

/**
 * Visual indicator component for displaying active gestures in the VTO interface.
 * Provides real-time feedback when gestures are detected and confirmed.
 *
 * @component
 * @param {Object} props - Component properties
 * @param {string} props.activeGesture - Currently active gesture type
 * @param {string} props.selectedGender - Current gender selection for swap icon
 * @returns {JSX.Element|null} Gesture indicator or null if no active gesture
 *
 * @example
 * <GestureIndicator
 *   activeGesture="pointing_left"
 *   selectedGender="male"
 * />
 */
import React from 'react';

const GestureIndicator = ({ activeGesture, selectedGender }) => {
    if (!activeGesture) return null;

    /**
     * Maps gesture types to appropriate visual icons.
     *
     * @param {string} gestureType - The detected gesture type
     * @returns {string} Unicode icon for the gesture
     */
    const getGestureIcon = (gestureType) => {
        switch (gestureType) {
            case 'pointing_left':
                return '👈';
            case 'pointing_right':
                return '👉';
            case 'clap':
                return '👏';
            case 'peace_sign':
                return '✌️';
            case 'arms_crossed':
                return selectedGender === 'male' ? '♀' : '♂';
            default:
                return '🤚';
        }
    };

    /**
     * Determines indicator positioning based on gesture type.
     *
     * @param {string} gestureType - The detected gesture type
     * @returns {string} CSS class for positioning
     */
    const getGesturePosition = (gestureType) => {
        switch (gestureType) {
            case 'pointing_left':
                return 'gesture-indicator-left';
            case 'pointing_right':
                return 'gesture-indicator-right';
            case 'clap':
            case 'peace_sign':
                return 'gesture-indicator-center';
            case 'arms_crossed':
                return 'gesture-indicator-center swap-gender';
            default:
                return 'gesture-indicator-center';
        }
    };

    /**
     * Assigns color themes for different gesture types.
     *
     * @param {string} gestureType - The detected gesture type
     * @returns {string} Hex color code for glow effect
     */
    const getGlowColor = (gestureType) => {
        switch (gestureType) {
            case 'pointing_left':
            case 'pointing_right':
                return '#03dac6';
            case 'clap':
                return '#ff6b6b';
            case 'peace_sign':
                return '#ffd700';
            case 'arms_crossed':
                return '#bb86fc';
            default:
                return '#ffffff';
        }
    };

    const glowColor = getGlowColor(activeGesture);

    return (
        <div
            className={`gesture-indicator ${getGesturePosition(activeGesture)}`}
            style={{ '--glow-color': glowColor }}
        >
            <div className="gesture-indicator-icon">
                {getGestureIcon(activeGesture)}
            </div>
        </div>
    );
};

export default GestureIndicator;
