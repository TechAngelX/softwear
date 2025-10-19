// src/views/SplashPage.js
/**
 * VtoViewPanel - Main virtual try-on display component for real-time garment visualization.
 *
 * This component serves as the primary interface for the virtual try-on experience, handling:
 * - Real-time video feed processing and display
 * - 3D garment rendering overlay via VtoCanvas
 * - Gesture recognition and visual feedback
 * - Performance monitoring and debug information
 * - Background scene management for virtual wardrobes
 * - Selfie countdown and capture coordination
 *
 * The panel integrates MediaPipe pose detection with Three.js 3D rendering to provide
 * accurate garment positioning and realistic try-on experiences. It supports both
 * regular garments (body tracking) and accessories (face tracking) with automatic
 * zoom adjustments for optimal fitting visualization.
 *
 * Key features:
 * - Mirrored video display with pose landmark overlay
 * - Real-time gesture detection for hands-free navigation
 * - Dynamic background switching for virtual environments
 * - Performance metrics tracking (FPS, landmark detection rate)
 * - Debug panel with comprehensive system information
 * - Responsive design with mobile and desktop support
 *
 * @component
 * @param {Object} props - Component properties
 * @param {React.RefObject} props.videoElement - Reference to HTML video element for camera feed
 * @param {React.RefObject} props.canvasElement - Reference to canvas for MediaPipe processing
 * @param {boolean} props.holisticInitialised - Whether MediaPipe Holistic is ready
 * @param {Object} props.landmarks - Pose, face, and hand landmark data from MediaPipe
 * @param {string} props.selectedGender - Current gender selection ('male'|'female')
 * @param {string} props.selectedGarment - Currently selected garment identifier
 * @param {Object} props.dimensions - Canvas dimensions {width, height}
 * @param {boolean} props.showGarment - Whether to display the 3D garment
 * @param {Function} props.setShowGarment - Toggle garment visibility
 * @param {React.ReactNode} props.children - Child components (typically garment chooser)
 * @param {string} props.bodyModelMode - Body model display mode ('off'|'smpl'|'smplx')
 * @param {Function} props.setBodyModelMode - Change body model mode
 * @param {boolean} props.physicsEnabled - Whether garment physics simulation is active
 * @param {boolean} props.isAccessoryCategory - Whether current garment is a head accessory
 * @param {Function} props.onGestureAction - Callback for gesture recognition events
 * @param {Function} props.onDetectionToggle - Callback for detection pause/resume
 * @param {string} props.selectedBackground - Current virtual background identifier
 * @param {React.Ref} ref - Forward ref for parent component interaction (selfie capture)
 *
 * @returns {JSX.Element} The complete VTO panel with video, 3D overlay, and controls
 *
 * @example
 * <VtoViewPanel
 *   videoElement={videoRef}
 *   canvasElement={canvasRef}
 *   holisticInitialised={true}
 *   landmarks={{poseLandmarks: [...], faceLandmarks: [...]}}
 *   selectedGender="male"
 *   selectedGarment="basicTee"
 *   dimensions={{width: 1280, height: 720}}
 *   showGarment={true}
 *   onGestureAction={handleGesture}
 *   ref={vtoRef}
 * >
 *   <GarmentChooser />
 * </VtoViewPanel>
 */

import React, { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import { loadItemData } from '../utils/dataLoader';
import { resolveModelPath } from '../utils/modelPath';
import VtoCanvas from '../components/VtoCanvas';
import GestureIndicator from '../gestures/GestureIndicator';
import { GestureDetector } from '../gestures/GestureDetector';
import { useStateManager, ACTIONS } from '../stateManager';
import { useDeviceDetection } from '../utils/DeviceDetectionContext';

const getPerformanceStatus = (fps) => {
    if (fps >= 23) return { text: 'Excellent', color: '#4caf50' };
    if (fps >= 18) return { text: 'Good', color: '#ff9800' };
    if (fps >= 12) return { text: 'Fair', color: '#ff9800' };
    return { text: 'Poor', color: '#cf6679' };
};

const VtoViewPanel = forwardRef(({
                                     videoElement,
                                     canvasElement,
                                     holisticInitialised,
                                     landmarks,
                                     selectedGender,
                                     selectedGarment,
                                     dimensions,
                                     showGarment,
                                     setShowGarment,
                                     children,
                                     bodyModelMode,
                                     setBodyModelMode,
                                     physicsEnabled,
                                     isAccessoryCategory,
                                     onGestureAction,
                                     onDetectionToggle,
                                     selectedBackground
                                 }, ref) => {
    const { deviceInfo } = useDeviceDetection();
    const { state, dispatch } = useStateManager();
    const { selfieCountdown, detectionPaused, showDebug, gestureEnabled } = state.viewState;
    const [garmentData, setGarmentData] = useState(null);
    const [showClapEffect, setShowClapEffect] = useState(false);
    const [activeGesture, setActiveGesture] = useState(null);
    const [gestureDetector] = useState(() => new GestureDetector());
    const [performanceMetrics, setPerformanceMetrics] = useState({ landmarkRate: 0, renderFPS: 0 });
    const [meshInfo, setMeshInfo] = useState({ vertices: 0, fileSize: 0 });
    const [indicatorText, setIndicatorText] = useState('');
    const [showIndicator, setShowIndicator] = useState(false);
    const indicatorTimeoutRef = useRef(null);
    const landmarkRateTracker = useRef({ lastTime: 0, frameCount: 0 }).current;

    useEffect(() => {
        const fetchData = async () => {
            const data = await loadItemData();
            setGarmentData(data);
        };
        fetchData();
    }, []);

    useEffect(() => {
        console.log('Gesture detection check:', {
            gestureEnabled,
            hasLandmarks: !!landmarks,
            detectionPaused,
            poseLandmarks: landmarks?.poseLandmarks?.length || 0,
            leftHandLandmarks: landmarks?.leftHandLandmarks?.length || 0,
            rightHandLandmarks: landmarks?.rightHandLandmarks?.length || 0
        });

        if (!gestureEnabled || !landmarks || detectionPaused) {
            return;
        }

        const completeLandmarks = {
            poseLandmarks: landmarks.poseLandmarks,
            leftHandLandmarks: landmarks.leftHandLandmarks,
            rightHandLandmarks: landmarks.rightHandLandmarks
        };

        const confirmedGesture = gestureDetector.update(completeLandmarks);
        if (confirmedGesture) {
            console.log('Gesture detected:', confirmedGesture);
            onGestureAction(confirmedGesture);
            setActiveGesture(confirmedGesture.type);
            setTimeout(() => {
                setActiveGesture(null);
            }, 500);
            if (confirmedGesture.type === 'clap') {
                setShowClapEffect(true);
                setTimeout(() => setShowClapEffect(false), 500);
            }
        }
    }, [landmarks, gestureEnabled, gestureDetector, onGestureAction, detectionPaused]);

    useEffect(() => {
        if (landmarks.poseLandmarks && !detectionPaused) {
            const now = Date.now();
            landmarkRateTracker.frameCount++;
            const timeDiff = now - landmarkRateTracker.lastTime;
            if (timeDiff > 1000) {
                const rate = Math.round((landmarkRateTracker.frameCount * 1000) / timeDiff);
                setPerformanceMetrics(prev => ({ ...prev, landmarkRate: rate }));
                landmarkRateTracker.lastTime = now;
                landmarkRateTracker.frameCount = 0;
            }
        }
    }, [landmarks, detectionPaused]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (window.softWearPerformance && window.softWearPerformance.garmentFPS) {
                setPerformanceMetrics(prev => ({ ...prev, renderFPS: window.softWearPerformance.garmentFPS }));
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const garmentDetails = useMemo(() => {
        if (!garmentData || !selectedGender || !selectedGarment) return null;
        return garmentData[selectedGender]?.[selectedGarment] || null;
    }, [garmentData, selectedGender, selectedGarment]);

    const dynamicModelPath = useMemo(() => {
        if (bodyModelMode === 'smplx') {
            return './3dmodels/men/baseModelM/baseModelM.glb';
        }
        if (showGarment) {
            if (!selectedGarment || !garmentDetails) {
                return null;
            }
            const path = resolveModelPath(garmentDetails);
            return path;
        }
        return null;
    }, [bodyModelMode, showGarment, selectedGarment, garmentDetails]);

    const handlePositionPerfect = (isPerfect) => {
        dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { detectionPaused: isPerfect } });
        if (onDetectionToggle) {
            onDetectionToggle(!isPerfect);
        }
    };

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.shiftKey && (event.key === 'd' || event.key === 'D')) {
                dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { showDebug: !showDebug } });
            }
            if (event.key === 'x' || event.key === 'X') {
                dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { gestureEnabled: !gestureEnabled } });
            }
            if (event.key === 'r' || event.key === 'R') {
                dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { detectionPaused: false } });
                if (onDetectionToggle) {
                    onDetectionToggle(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [dispatch, showDebug, gestureEnabled, onDetectionToggle]);

    useEffect(() => {
        if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
        let text = '';
        switch (bodyModelMode) {
            case 'smplx': text = 'Model View: Rigged SMPL-X'; break;
            case 'off': text = 'Model View: Off'; break;
            default: setShowIndicator(false); return;
        }
        setIndicatorText(text);
        setShowIndicator(true);
        if (bodyModelMode === 'off') {
            indicatorTimeoutRef.current = setTimeout(() => setShowIndicator(false), 2500);
        }
    }, [bodyModelMode]);

    if (!dimensions) return null;

    const performanceStatus = getPerformanceStatus(performanceMetrics.renderFPS);
    const frameInference = performanceMetrics.renderFPS > 0 ? `${Math.round(1000 / performanceMetrics.renderFPS)}ms` : '--';
    const backgroundClass = selectedBackground ? `bg-${selectedBackground}` : '';

    return (
        <>
            {selfieCountdown !== null && (
                <div className="countdown-overlay">
                    <span className="countdown-text">{selfieCountdown}</span>
                </div>
            )}

            <div className={`main-video-panel ${isAccessoryCategory ? 'face-focus-mode' : ''} ${backgroundClass}`}>
                {activeGesture === 'arms_crossed' && <div className="gesture-indicator-overlay"><div className="gesture-indicator arms-crossed">Gender Swap Confirmed</div></div>}
                {showClapEffect && <div className="clap-effect-overlay" />}

                <div className="vto-zoom-container">
                    <video ref={videoElement} className="video-element" style={{ display: 'none' }}></video>
                    <canvas ref={canvasElement} className="canvas-element" id="background-canvas" width={dimensions.width} height={dimensions.height}></canvas>
                    {holisticInitialised && (
                        <VtoCanvas
                            poseLandmarks={landmarks.poseLandmarks}
                            faceLandmarks={landmarks.faceLandmarks}
                            isAccessoryCategory={isAccessoryCategory}
                            dimensions={dimensions}
                            garmentDetails={garmentDetails}
                            showBodyMesh={false}
                            garmentModelPath={dynamicModelPath}
                            physicsEnabled={physicsEnabled}
                            onMeshInfoUpdate={setMeshInfo}
                            ref={ref}
                        />
                    )}
                    {gestureEnabled && activeGesture && !detectionPaused && (
                        <GestureIndicator activeGesture={activeGesture} selectedGender={selectedGender} />
                    )}
                    {gestureEnabled && !detectionPaused && (
                        <div className="gesture-status-indicator">
                            <div className="gesture-status-icon"></div>
                            <div className="gesture-status-text">Gesture Control: ON</div>
                        </div>
                    )}
                </div>

                {selectedGarment && garmentDetails && (
                    <div className={`garment-info-indicator ${isAccessoryCategory ? 'garment-info-indicator-head' : ''}`}>
                        <div className="garment-info-label">Now Trying</div>
                        <div className="garment-info-name">{garmentDetails.name}</div>
                        <div className="garment-info-price">{garmentDetails.price}</div>
                    </div>
                )}

                {showIndicator && (<div className="model-view-indicator">{indicatorText}</div>)}
                <div className="on-screen-controls">{children}</div>
                {!holisticInitialised && (
                    <div className="loading-overlay">
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Initialising AI Body Detection...</div>
                    </div>
                )}

                {showDebug && (
                    <div
                        className="debug-panel" style={{
                        position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.85)',
                        color: 'white', padding: '12px', fontSize: '11px', zIndex: 10,
                        borderRadius: '6px', fontFamily: 'monospace', border: '2px solid #ff6b6b',
                        minWidth: '420px',
                        display: 'flex',
                        gap: '16px'
                    }}>
                        <div style={{ flex: '1', minWidth: '220px' }}>
                            <div style={{ color: '#f0f308', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
                                Debug Panel (Dev use only)
                            </div>
                            <div style={{ marginBottom: '4px' }}>Body Model: {bodyModelMode.toUpperCase()}</div>
                            <div style={{ fontSize: '10px', color: 'rgb(0,255,255)', marginBottom: '2px' }}>Operational Status:</div>
                            <div style={{ marginBottom: '4px' }}>Pose Detection: <span style={{
                                color: landmarks.poseLandmarks && !detectionPaused ?
                                    '#4caf50' : '#cf6679',
                                fontWeight: 'bold'
                            }}>{landmarks.poseLandmarks && !detectionPaused ?
                                'Active' : detectionPaused ? 'Paused' : 'Inactive'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Garment: {showGarment ?
                                (selectedGarment || 'None') : 'Hidden'}</div>
                            <div style={{ marginBottom: '4px' }}>Physics: <span style={{
                                color: physicsEnabled ?
                                    '#4caf50' : '#cf6679',
                                fontWeight: 'bold'
                            }}>{physicsEnabled ?
                                'Enabled' : 'Disabled'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Gesture Control: <span style={{
                                color: gestureEnabled && !detectionPaused ?
                                    '#4caf50' : '#cf6679',
                                fontWeight: 'bold'
                            }}>{gestureEnabled && !detectionPaused ?
                                'Enabled' : 'Disabled'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Current Gesture: <span style={{ fontWeight: 'bold' }}>{activeGesture ||
                                'None'}</span></div>
                            <div style={{ marginBottom: '4px' }}>Resolution: {dimensions.width}×{dimensions.height}</div>
                            <div style={{ marginBottom: '4px' }}>Device: <span style={{ fontWeight: 'bold' }}>{deviceInfo?.deviceType ||
                                'N/A'}</span></div>
                            <div style={{ marginTop: '8px', padding: '8px 0', borderTop: '1px solid #333' }}>
                                <div style={{ fontSize: '10px', color: 'rgb(0,255,255)', marginBottom: '2px' }}>Performance Metrics:</div>
                                <div style={{ marginBottom: '4px' }}>Performance: <span style={{ color: performanceStatus.color, fontWeight: 'bold' }}>{performanceStatus.text}</span></div>
                                <div style={{ marginBottom: '4px' }}>GFX Render Rate: <span style={{ fontWeight: 'bold' }}>{performanceMetrics.renderFPS} FPS</span></div>
                                <div style={{ marginBottom: '4px' }}>Frame Inference: <span style={{ fontWeight: 'bold' }}>{frameInference}</span></div>
                                <div style={{ marginBottom: '4px' }}>MediaPipe Tracking Speed:
                                    <span style={{ fontWeight: 'bold' }}>{!detectionPaused ?
                                        performanceMetrics.landmarkRate : '0 (Paused)'} Hz</span></div>
                                <div style={{ fontSize: '10px', color: 'rgb(0,255,255)', marginBottom: '2px', marginTop: '8px' }}>
                                    {selectedGarment ?
                                        `${selectedGarment.charAt(0).toUpperCase() + selectedGarment.slice(1)} Mesh Info:` : 'Mesh Info:'}
                                </div>
                                <div style={{ marginBottom: '4px' }}>File Size: <span style={{ fontWeight: 'bold' }}>{meshInfo.fileSize > 0 ?
                                    `${meshInfo.fileSize} KB` : '--'}</span></div>
                                <div style={{ marginBottom: '4px' }}>Vertex Count: <span style={{ fontWeight: 'bold' }}>{meshInfo.vertices > 0 ?
                                    meshInfo.vertices.toLocaleString() : '--'}</span></div>
                            </div>
                        </div>

                        <div style={{ flex: '0 0 180px', borderLeft: '1px solid #333', paddingLeft: '12px' }}>
                            <div style={{ marginBottom: '8px', padding: '4px 0', borderBottom: '1px solid #333' }}>
                                <div style={{ fontSize: '10px', color: 'rgb(0,255,255)', marginBottom: '2px' }}>Controls:</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>'Shift+D' - Toggle Panel</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>'G' - Toggle Garment</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>'M' - Toggle SMPL-X Body</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>'P' - Toggle Physics</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>'X' - Toggle Gesture Control</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>'R' - Resume Detection</div>
                            </div>

                            <div>
                                <div style={{ fontSize: '10px', color: 'rgb(0,255,255)', marginBottom: '2px' }}>Gestures:</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>Point Right - Next Garment</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>Point Left - Previous Garment</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>Peace Sign - Take Selfie</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>Arms Crossed - Change Gender</div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>Clap - Change Category</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
});

export default VtoViewPanel;
