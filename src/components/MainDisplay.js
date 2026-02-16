// src/components/MainDisplay.js

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Holistic } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { useDeviceDetection } from '../utils/DeviceDetectionContext';
import { useStateManager, ACTIONS } from '../stateManager';
import ItemPreview from '../views/ItemPreview';
import GarmentChooser from './GarmentChooser';
import ControlPanel from './ControlPanel';
import GenderSelector from '../views/GenderSelector';
import { loadItemMenu, loadItemData, loadBoneData } from '../utils/dataLoader';
import VtoViewPanel from '../views/VtoViewPanel';
import { OneEuroFilter } from '../utils/OneEuroFilter';
import cameraManager from '../utils/CameraManager';
import { applySegmentation, applySegmentationWithBackground } from '../vto/greenscreen';
import { audioManager, initializeAudio } from '../utils/AudioManager';
import {
    POSE_CONNECTIONS,
    FACEMESH_TESSELATION,
    HAND_CONNECTIONS
} from '@mediapipe/holistic';
import { SelfieService } from '../utils/SelfieService';
let globalHolistic = null;
let isHolisticInitialising = false;

const backgroundImages = {};
const preloadBackgroundImage = (bgId) => {
    if (!backgroundImages[bgId]) {
        const img = new Image();
        img.onload = () => {
            backgroundImages[bgId] = img;
            console.log(`Background ${bgId} loaded successfully`);
        };
        img.onerror = (error) => {
            console.error(`Failed to load background ${bgId}:`, error);
            console.error(`Attempted path: ./images/${bgId}.webp`);
        };
        img.src = `./images/${bgId}.webp`;
    }
};

if (!window.softWearPerformance) {
    window.softWearPerformance = { bodyMeshFPS: 0, garmentFPS: 0, landmarkRate: 0, lastLandmarkTime: 0, landmarkFrameCount: 0 };
}

const landmarkFilters = {};

const getOrCreateFilter = (key, freq = 30, minCutoff = 0.8, beta = 0.6, dcutoff = 1.0) => {
    if (!landmarkFilters[key]) {
        landmarkFilters[key] = new OneEuroFilter(freq, minCutoff, beta, dcutoff);
    }
    return landmarkFilters[key];
};

const MainDisplay = ({ onGoHome }) => {
    const { state, dispatch } = useStateManager();
    const { selectedGender, selectedGarment, isSwitchingGender, isDetecting, showLandmarks, showGarment, bodyModelMode, physicsEnabled, selectedBackground, activeCategoryIndex } = state.vtoState;
    const { garmentMenu, garmentData, boneData } = state.data;
    const { holisticInitialised, canvasDimensions, poseLandmarks, faceLandmarks, rightHandLandmarks, leftHandLandmarks, isControlPanelOpen, gestureEnabled } = state.viewState;
    const [confirmedCategoryIndex, setConfirmedCategoryIndex] = useState(null);
    const videoElement = useRef(null);
    const canvasElement = useRef(null);
    const vtoCanvasRef = useRef(null);
    const showLandmarksRef = useRef(true);
    const showGarmentRef = useRef(true);
    const { isMobileLayout, deviceInfo } = useDeviceDetection();
    const flatGarmentList = useMemo(() => {
        if (!garmentMenu || !selectedGender) return [];
        const currentCategory = garmentMenu[selectedGender]?.[activeCategoryIndex];
        return currentCategory ? currentCategory.items.map(item => item.id) : [];
    }, [garmentMenu, selectedGender, activeCategoryIndex]);
    useEffect(() => {
        showLandmarksRef.current = showLandmarks;
    }, [showLandmarks]);
    useEffect(() => {
        showGarmentRef.current = showGarment;
    }, [showGarment]);
    useEffect(() => {
        if (selectedBackground) {
            preloadBackgroundImage(selectedBackground);
        }
    }, [selectedBackground]);
    useEffect(() => {
        initializeAudio();
    }, []);
    const cleanupResources = () => {
        cameraManager.stopCamera();
        dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { poseLandmarks: null } });
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { holisticInitialised: false } });
    };
    useEffect(() => {
        const fetchGarments = async () => {
            try {
                const menuData = await loadItemMenu();
                const itemData = await loadItemData();
                dispatch({ type: ACTIONS.LOAD_DATA, payload: { garmentMenu: menuData, garmentData: itemData } });

            } catch (error) {
                console.error('Error loading item menu:', error);
            }
        };

        fetchGarments();
        return () => cleanupResources();
    }, [dispatch]);
    useEffect(() => {
        cameraManager.setDetection(isDetecting);
    }, [isDetecting]);
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'c' || event.key === 'C') dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { showGarment: !showGarment } });
            if (event.key === 'p' || event.key === 'P') dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { physicsEnabled: !physicsEnabled } });
            if (event.key === 'l' || event.key === 'L') dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { showLandmarks: !showLandmarks } });


            if (event.key === 'm' || event.key === 'M') {
                dispatch({
                    type: ACTIONS.SET_VTO_STATE,
                    payload: {
                        bodyModelMode: bodyModelMode === 'off' ? 'smpl' : bodyModelMode === 'smpl' ? 'smplx' : 'off'
                    }
                });
            }
            if (event.key === 'g' || event.key === 'G') {
                dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { gestureEnabled: !gestureEnabled } });
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [showGarment, physicsEnabled, showLandmarks, bodyModelMode, gestureEnabled, dispatch]);
    useEffect(() => {
        const fetchBoneData = async () => {
            if (selectedGender) {
                const data = await loadBoneData(selectedGender);
                dispatch({ type: ACTIONS.LOAD_DATA, payload: { boneData: data } });
            }
        };


        fetchBoneData();
    }, [selectedGender, dispatch]);
    useEffect(() => {
        if (selectedBackground) {
            preloadBackgroundImage(selectedBackground);
        }
    }, [selectedBackground]);
    useEffect(() => {
        if (!selectedBackground) {
            console.log('Selected background:', selectedBackground);
            console.log('Background class should be:', `bg-${selectedBackground}`);
        } else {
            const img = new Image();
            img.onload = () => {
                console.log(`Wardrobe background ${selectedBackground} loaded successfully`);
            };
            img.onerror = () => {
                console.error(`Failed to load wardrobe background: ${selectedBackground}`);
                console.error(`Image path attempted: ./images/${selectedBackground}.webp`);
            };
            img.src = `./images/${selectedBackground}.webp`;

        }
        setTimeout(() => {
            const videoPanel = document.querySelector('.main-video-panel');
            if (videoPanel) {
                console.log('Video panel classes:', videoPanel.className);
                console.log('Computed background-image:', window.getComputedStyle(videoPanel).backgroundImage);
            }
        }, 100);
    }, [selectedBackground, dispatch]);
    const initialiseGlobalHolistic = async () => {
        if (globalHolistic || isHolisticInitialising) return globalHolistic;
        isHolisticInitialising = true;

        try {
            console.log('Creating Holistic instance...');
            const holistic = new Holistic({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
            });
            if (!holistic) {
                throw new Error('Failed to create Holistic instance');
            }

            console.log('Holistic instance created, setting options...');
            holistic.setOptions({
                selfieMode: false,
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: true,
                smoothSegmentation: true,
                refineFaceLandmarks: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            console.log('Initializing holistic...');
            await holistic.initialize();

            console.log('Holistic initialized successfully');
            globalHolistic = holistic;
            return holistic;
        } catch (error) {
            console.error("Failed to create global holistic:", error);
            globalHolistic = null;
            throw error;
        } finally {
            isHolisticInitialising = false;
        }
    };

    const handleInitialGenderSelection = (gender) => {
        audioManager.playSound(gender === 'male' ? 'maleSelected' : 'femaleSelected');
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGender: gender } });
    };
    const handleGenderChange = (gender) => {
        if (gender === selectedGender || isSwitchingGender) return;
        audioManager.playSound(gender === 'male' ? 'maleSelected' : 'femaleSelected');
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { isSwitchingGender: true } });
        cleanupResources();
        setTimeout(() => {
            dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGender: gender } });
            for (const key in landmarkFilters) delete landmarkFilters[key];
            setTimeout(() => dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { isSwitchingGender: false } }), 200);
        }, 800);
    };

    const handleCycleBackground = () => {
        audioManager.playSound('click');
        const backgrounds = [null, 'wd1', 'wd2', 'wd3', 'wd4'];
        const currentIndex = backgrounds.indexOf(selectedBackground);
        const nextIndex = (currentIndex + 1) % backgrounds.length;
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedBackground: backgrounds[nextIndex] } });
    };
    useEffect(() => {
        if (selectedGender && garmentMenu) {
            const genderMenu = garmentMenu[selectedGender];
            if (genderMenu && genderMenu.length > 0 && genderMenu[0].items.length > 0) {
                dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGarment: genderMenu[0].items[0].id, activeCategoryIndex: 0 } });
            }
        }

    }, [selectedGender, garmentMenu, dispatch]);

    const getCurrentGarments = () => garmentMenu ? garmentMenu[selectedGender] || [] : [];
    const handleSelectGarment = (garmentId) => {
        if (selectedGarment !== garmentId) {
            audioManager.playSound('changeGarment');
            dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGarment: garmentId } });
        }
    };
    const handleGestureAction = (gesture) => {
        switch (gesture.type) {
            case 'pointing_left':
                handleGarmentChangeByGesture('prev');
                break;
            case 'pointing_right':
                handleGarmentChangeByGesture('next');
                break;
            case 'clap':
                handleCategoryChangeByGesture('next');
                break;
            case 'peace_sign':
                handleSelfieGesture();
                break;
            case 'arms_crossed':
                handleGenderChange(selectedGender === 'male' ? 'female' : 'male');
                break;
        }
    };
    const handleGarmentChangeByGesture = (direction) => {
        const currentIndex = flatGarmentList.indexOf(selectedGarment);
        if (currentIndex === -1) {
            console.warn("Garment not found in current category, unable to change.");
            return;
        }

        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % flatGarmentList.length;
        } else {
            nextIndex = (currentIndex - 1 + flatGarmentList.length) % flatGarmentList.length;
        }
        handleSelectGarment(flatGarmentList[nextIndex]);
    };
    const handleCategoryChangeByGesture = (direction = 'next') => {
        const totalCategories = getCurrentGarments().length;
        if (totalCategories === 0) return;

        let newCategoryIndex;
        if (direction === 'next') {
            newCategoryIndex = (activeCategoryIndex + 1) % totalCategories;
        } else {
            newCategoryIndex = (activeCategoryIndex - 1 + totalCategories) % totalCategories;
        }

        audioManager.playSound('changeCategory');
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { activeCategoryIndex: newCategoryIndex } });
        setConfirmedCategoryIndex(newCategoryIndex);
        setTimeout(() => setConfirmedCategoryIndex(null), 800);

        const newCategory = getCurrentGarments()[newCategoryIndex];
        if (newCategory && newCategory.items.length > 0) {
            handleSelectGarment(newCategory.items[0].id);
        } else {
            handleSelectGarment(null);
        }
    };
    const handleCategoryChange = (categoryIndex) => {
        audioManager.playSound('changeCategory');
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { activeCategoryIndex: categoryIndex } });
        setConfirmedCategoryIndex(categoryIndex);
        setTimeout(() => setConfirmedCategoryIndex(null), 800);
        const newCategory = getCurrentGarments()[categoryIndex];
        if (newCategory && newCategory.items.length > 0) {
            handleSelectGarment(newCategory.items[0].id);
        } else {
            handleSelectGarment(null);
        }
    };
    const isAccessoryGarment = (garment) => {
        if (!garmentMenu || !selectedGender || !garment) return false;
        const accessoryCategories = ['Accessories', 'Headwear', 'Eyewear'];
        const currentCategory = garmentMenu[selectedGender]?.find(cat => cat.items.some(item => item.id === garment))?.category;
        return accessoryCategories.includes(currentCategory);
    };
    useEffect(() => {
        if (!selectedGender || !videoElement.current || !canvasElement.current || isSwitchingGender) return;

        const initialiseCameraAndHolistic = async () => {
            const video = videoElement.current;
            const canvas = canvasElement.current;
            const ctx = canvas.getContext('2d');
            canvas.width = canvasDimensions.width;
            canvas.height = canvasDimensions.height;

            try {
                const holistic = await initialiseGlobalHolistic();

                if (!holistic) {
                    throw new Error('Holistic instance is null');
                }


                console.log('Setting up holistic onResults callback...');
                holistic.onResults((results) => {
                    if (!canvasElement.current) return;

                             

                    if (results.segmentationMask && selectedBackground) {
                        const bgImg = backgroundImages[selectedBackground];
                        if (bgImg) {
                            applySegmentationWithBackground(ctx, results, bgImg);
                        } else {
                            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                        }
                    } else {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                    }

                    if (results.poseLandmarks) {
                        const now = Date.now();
                        const smoothedLandmarks = results.poseLandmarks.map((landmark, index) => ({
                            x: getOrCreateFilter(`landmark_${index}_x`).filter(landmark.x, now),
                            y: getOrCreateFilter(`landmark_${index}_y`).filter(landmark.y, now),
                            z: getOrCreateFilter(`landmark_${index}_z`).filter(landmark.z, now),
                            visibility: landmark.visibility
                        }));
                        dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { poseLandmarks: smoothedLandmarks } });
                    } else {
                        dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { poseLandmarks: null } });
                    }

                    const landmarkData = {
                        faceLandmarks: results.faceLandmarks || null,
                        leftHandLandmarks: results.leftHandLandmarks || null,
                        rightHandLandmarks: results.rightHandLandmarks || null
                    };
                    dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: landmarkData });

                    if (showLandmarksRef.current && !isMobileLayout) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'source-over';

                        if (results.faceLandmarks) {
                            drawConnectors(ctx, results.faceLandmarks, FACEMESH_TESSELATION, { color: 'rgba(255,255,255,0.3)', lineWidth: 0.5 });
                        }
                        if (results.poseLandmarks) {
                            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#0098ff', lineWidth: 3 });
                            drawLandmarks(ctx, results.poseLandmarks, { color: '#ff6b6b', radius: 2 });
                        }
                        if (results.leftHandLandmarks) {
                            drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: 'rgba(255,243,0,0.88)', lineWidth: 1 });
                        }
                        if (results.rightHandLandmarks) {
                            drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: 'rgb(8,208,0)', lineWidth: 1 });
                        }

                        ctx.restore();
                    }
                });
                const onFrame = async () => await holistic.send({ image: video });
                await cameraManager.startCamera(video, onFrame);
                dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { holisticInitialised: true } });

            } catch (error) {
                console.error("Failed to initialise MediaPipe:", error);
            }
        };

        initialiseCameraAndHolistic();
        return () => {
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { holisticInitialised: false } });
        };
    }, [selectedGender, isSwitchingGender, isMobileLayout, selectedBackground, selectedGarment, dispatch]);

    const handleSelfieGesture = async () => {
        if (!vtoCanvasRef?.current || !selectedGarment || !showGarment) return;
        try {
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 'Get Ready!' } });
            await new Promise(resolve => setTimeout(resolve, 1000));
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 3 } });
            await new Promise(resolve => setTimeout(resolve, 1000));
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 2 } });
            await new Promise(resolve => setTimeout(resolve, 1000));
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 1 } });
            await new Promise(resolve => setTimeout(resolve, 1000));
            audioManager.playSound('cameraShutter');

            const currentGarment = garmentData?.[selectedGender]?.[selectedGarment];
            const filename = SelfieService.generateFilename(currentGarment?.name, selectedGender);
            const blob = await vtoCanvasRef.current.takeSelfie();

            await SelfieService.copyToClipboard(blob);
            await SelfieService.saveToDevice(blob, filename);

            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 'Saved!' } });
            setTimeout(() => {
                dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: null } });
            }, 1000);
        } catch (error) {
            console.error('Selfie gesture failed:', error);
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: 'Failed!' } });
            setTimeout(() => {
                dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { selfieCountdown: null } });
            }, 1000);
        }
    };

    if (!selectedGender) {
        return <div className="gender-selection-screen"><GenderSelector onSelectGender={handleInitialGenderSelection} /></div>;
    }

    const currentGarments = getCurrentGarments();
    const isAccessoryCategory = isAccessoryGarment(selectedGarment);
    const genderThemeClass = selectedGender === 'female' ?
        'theme-female' : 'theme-male';

    return (
        <div className={`virtual-tryon-container ${genderThemeClass}`}>
            <div className={`overlay-backdrop ${isControlPanelOpen ? 'open' : ''}`} onClick={() => dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { isControlPanelOpen: false } })} />

            <button className={`menu-toggle-btn ${isControlPanelOpen ? 'open' : ''}`} onClick={() => dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { isControlPanelOpen: !isControlPanelOpen } })} aria-label="Toggle controls">
                <div className="bar"></div><div className="bar"></div><div className="bar"></div>
            </button>

            <div className="tryon-content">
                <VtoViewPanel
                    videoElement={videoElement}
                    canvasElement={canvasElement}
                    holisticInitialised={holisticInitialised && !isSwitchingGender}
                    landmarks={{
                        poseLandmarks,
                        faceLandmarks,
                        leftHandLandmarks,
                        rightHandLandmarks,
                    }}
                    selectedGender={selectedGender}
                    selectedGarment={selectedGarment}
                    dimensions={canvasDimensions}
                    showGarment={showGarment}
                    setShowGarment={(val) => dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { showGarment: val } })}
                    bodyModelMode={bodyModelMode}
                    setBodyModelMode={(val) => dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { bodyModelMode: val } })}
                    physicsEnabled={physicsEnabled}
                    isAccessoryCategory={isAccessoryCategory}
                    onGestureAction={handleGestureAction}
                    selectedBackground={selectedBackground}
                    boneData={boneData}
                    ref={vtoCanvasRef}
                >
                    {garmentMenu && (
                        <GarmentChooser
                            layout="overlay" activeCategory={activeCategoryIndex}
                            garments={currentGarments}
                            selectedGarment={selectedGarment}
                            onSelectGarment={handleSelectGarment}
                            onCategoryChange={handleCategoryChange}
                            confirmedCategoryIndex={confirmedCategoryIndex}
                        />
                    )}
                </VtoViewPanel>

                <div className={`control-sidebar ${isControlPanelOpen ?
                    'open' : ''}`}>
                    <button className="close-panel-btn" onClick={() => dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { isControlPanelOpen: false } })}>×</button>

                    {garmentMenu && (
                        <>
                            <div className="component-container">
                                <h3 className="component-title">Navigation</h3>
                                <button onClick={onGoHome} className="home-bar-btn" title="Return to Home Screen">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                    </svg>
                                    <span>Home</span>
                                </button>
                            </div>

                            <div className="component-container">
                                <h3 className="component-title">Change Model Type</h3>
                                <div className="gender-toggle-container">
                                    <button onClick={() => handleGenderChange('male')} className={`gender-toggle-btn ${selectedGender === 'male' ? 'active' : ''}`} disabled={isSwitchingGender}>Male</button>
                                    <button onClick={() => handleGenderChange('female')} className={`gender-toggle-btn ${selectedGender === 'female' ?
                                        'active' : ''}`} disabled={isSwitchingGender}>Female</button>
                                </div>
                            </div>

                            <div className="component-container">
                                <h3 className="component-title">Select Garment</h3>
                                <GarmentChooser
                                    layout="sidebar" activeCategory={activeCategoryIndex}
                                    garments={currentGarments}
                                    selectedGarment={selectedGarment}
                                    onSelectGarment={handleSelectGarment}
                                    onCategoryChange={handleCategoryChange}
                                    confirmedCategoryIndex={confirmedCategoryIndex}
                                />
                            </div>
                        </>
                    )}

                    <ItemPreview
                        selectedGarment={selectedGarment}
                        selectedGender={selectedGender}
                        selectedBackground={selectedBackground}
                    />

                    <ControlPanel
                        isDetecting={isDetecting}
                        setIsDetecting={(val) => dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { isDetecting: val } })}
                        showLandmarks={showLandmarks}
                        setShowLandmarks={(val) => dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { showLandmarks: val } })}
                        showGarment={showGarment}
                        setShowGarment={(val) => dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { showGarment: val } })}
                        selectedBackground={selectedBackground}
                        onBackgroundChange={handleCycleBackground}
                        vtoCanvasRef={vtoCanvasRef}
                        selectedGarment={selectedGarment}
                        selectedGender={selectedGender}
                        garmentData={garmentData}
                    />
                </div>
            </div>
        </div>
    );
};

export default MainDisplay;
