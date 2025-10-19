// src/components/SelfieButton.js

import React, { useState } from 'react';
import { SelfieService } from '../utils/SelfieService';
import { useStateManager, ACTIONS } from '../stateManager';
import { audioManager } from '../utils/AudioManager';

const SelfieButton = ({ vtoCanvasRef, garmentName, selectedGender, disabled }) => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const { dispatch } = useStateManager();

    const handleSelfie = async () => {
        if (!vtoCanvasRef?.current || disabled) return;

        try {
            setIsCapturing(true);
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 'Get Ready!' } });
            await new Promise(resolve => setTimeout(resolve, 1000));
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 3 } });
            await new Promise(resolve => setTimeout(resolve, 1000));
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 2 } });
            await new Promise(resolve => setTimeout(resolve, 1000));
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 1 } });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const blob = await vtoCanvasRef.current.takeSelfie();
            const filename = SelfieService.generateFilename(garmentName, selectedGender);

            await SelfieService.copyToClipboard(blob);
            const saveResult = await SelfieService.saveToDevice(blob, filename);

            if (saveResult.success) {
                setShowSuccess(true);
                audioManager.playSound('cameraShutter');
            }

        } catch (error) {
            console.error('Selfie capture failed:', error);
        } finally {
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: null } });
            setIsCapturing(false);
            setTimeout(() => setShowSuccess(false), 2000);
        }
    };

    return (
        <button
            onClick={handleSelfie}
            disabled={disabled || isCapturing}
            className={`selfie-btn ${isCapturing ? 'capturing' : ''} ${showSuccess ? 'success' : ''}`}
        >
            <div className="selfie-btn-content">
                {isCapturing ? (
                    <>
                        <div className="capture-spinner"></div>
                        <span>Capturing...</span>
                    </>
                ) : showSuccess ? (
                    <>
                        <span className="success-icon">✓</span>
                        <span>Saved!</span>
                    </>
                ) : (
                    <>
                        <span className="camera-icon">Take Selfie</span>
                    </>
                )}
            </div>
        </button>
    );
};

export default SelfieButton;
