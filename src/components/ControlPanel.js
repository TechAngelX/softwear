// src/components/ControlPanel.js

import React from 'react';
import SelfieButton from './SelfieButton';
import { useStateManager, ACTIONS } from '../stateManager';

const ControlPanel = ({ vtoCanvasRef, onBackgroundChange }) => {
    const { state, dispatch } = useStateManager();
    const { showLandmarks, showGarment, selectedBackground, bodyModelMode, physicsEnabled } = state.vtoState;
    const { selectedGarment, selectedGender } = state.vtoState;
    const { garmentData } = state.data;
    const { theme } = state.appState;
    const currentGarment = garmentData?.[selectedGender]?.[selectedGarment];

    const handleToggleGarment = () => {
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { showGarment: !showGarment } });
    };

    const handleToggleLandmarks = () => {
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { showLandmarks: !showLandmarks } });
    };

    const handleToggleTheme = () => {
        dispatch({ type: ACTIONS.SET_THEME, payload: theme === 'dark' ? 'light' : 'dark' });
    };

    return (
        <div className="component-container">
            <h3 className="component-title" style={{marginTop: '24px'}}>
                Go Visual
            </h3>

            <div className="controls-grid">
                <button
                    onClick={onBackgroundChange}
                    className={`btn-control ${selectedBackground ? 'active' : ''}`}
                >
                    {selectedBackground ? `Wardrobe ${selectedBackground.slice(-1)}` : 'Wardrobe Off'}
                </button>
                <SelfieButton
                    vtoCanvasRef={vtoCanvasRef}
                    garmentName={currentGarment?.name}
                    selectedGender={selectedGender}
                    disabled={!selectedGarment || !showGarment}
                />
            </div>

            <h3 className="component-title">
                Options
            </h3>
            <div className="controls-grid">
                <button
                    onClick={handleToggleGarment}
                    className={`btn-control ${showGarment ? 'active' : ''}`}
                >
                    {showGarment ? 'Hide Garment [G]' : 'Show Garment [G]'}
                </button>
                <button
                    onClick={handleToggleLandmarks}
                    className={`btn-control ${showLandmarks ? 'active' : ''}`}
                >
                    {showLandmarks ? 'Hide Landmarks [L]' : 'Show Landmarks [L]'}
                </button>
                <button
                    onClick={handleToggleTheme}
                    className="btn-control"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
            </div>
        </div>
    );
};

export default ControlPanel;
