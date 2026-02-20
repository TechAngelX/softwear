// src/views/MobileView.js

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { loadItemData, loadItemMenu } from '../utils/dataLoader';
import { resolveModelPathWithFallback } from '../utils/modelPath';
import { VtoPoseEngine } from '../vto/VtoPoseEngine';
import { HeadPoseMapper } from '../vto/HeadPoseMapper';
import { SMPLXPoseMapper } from '../vto/SMPLXBoneMapper';
import GarmentChooser from '../components/GarmentChooser';
import { useStateManager, ACTIONS } from '../stateManager';
import SelfieButton from '../components/SelfieButton';
import { useDeviceDetection } from '../utils/DeviceDetectionContext';
import { GarmentPhysics } from '../vto/garmentPhysics';
import cameraManager from '../utils/CameraManager';
import { applySegmentationWithBackground } from '../vto/greenscreen';
import { OneEuroFilter } from '../utils/OneEuroFilter';
import { audioManager } from '../utils/AudioManager';

const backgroundImages = {};
const preloadBackgroundImage = (bgId) => {
    if (!backgroundImages[bgId]) {
        const img = new Image();
        img.onload = () => {
            backgroundImages[bgId] = img;
        };
        img.onerror = (error) => {
            console.error(`Failed to load background ${bgId}:`, error);
        };
        img.src = `./images/${bgId}.webp`;
    }
};

const getMobileDimensions = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (vw > vh) {
        return { width: vh, height: vw };
    }

    return { width: vw, height: vh };
};

const MobileView = React.forwardRef((props, ref) => {
    const { state, dispatch } = useStateManager();
    const { selectedGender, selectedGarment, isSwitchingGender, physicsEnabled, activeCategoryIndex, selectedBackground } = state.vtoState;
    const { poseLandmarks, selfieCountdown, holisticInitialised, faceLandmarks, rightHandLandmarks, leftHandLandmarks } = state.viewState;
    const { garmentMenu, garmentData, boneData } = state.data;
    const { isMobileLayout, deviceInfo } = useDeviceDetection();

    const videoElement = useRef(null);
    const canvasElement = useRef(null);
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const garmentModelRef = useRef(null);
    const animationFrameRef = useRef(null);
    const latestLandmarksRef = useRef(null);

    const [loadingProgress, setLoadingProgress] = useState(0);
    const [modelLoadError, setModelLoadError] = useState(null);
    const [mobileDimensions, setMobileDimensions] = useState(() => getMobileDimensions());

    const poseEngineRef = useRef(null);
    const headPoseMapperRef = useRef(new HeadPoseMapper(boneData));
    const poseMapperRef = useRef(new SMPLXPoseMapper(boneData, true));
    const physicsEngineRef = useRef(new GarmentPhysics());

    useEffect(() => {
        latestLandmarksRef.current = poseLandmarks;
        console.log('Landmarks updated:', poseLandmarks?.length || 0);
    }, [poseLandmarks]);

    useEffect(() => {
        if (!poseEngineRef.current) {
            poseEngineRef.current = new VtoPoseEngine();
            console.log('Created pose engine');
        }
    }, []);

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
    }, [dispatch]);

    useEffect(() => {
        if (selectedGender && garmentMenu) {
            const genderMenu = garmentMenu[selectedGender];
            if (genderMenu && genderMenu.length > 0 && genderMenu[0].items.length > 0) {
                dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGarment: genderMenu[0].items[0].id, activeCategoryIndex: 0 } });
            }
        }
    }, [selectedGender, garmentMenu, dispatch]);

    useEffect(() => {
        const handleResize = () => {
            const newDimensions = getMobileDimensions();
            setMobileDimensions(newDimensions);
            dispatch({
                type: ACTIONS.SET_VIEW_STATE,
                payload: { canvasDimensions: newDimensions }
            });
        };

        // Track timeout ref for cleanup
        let orientationTimeout = null;

        const handleOrientationChange = () => {
            // Clear any pending timeout
            if (orientationTimeout) {
                clearTimeout(orientationTimeout);
            }
            orientationTimeout = setTimeout(handleResize, 100);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);

        return () => {
            // Cleanup timeout
            if (orientationTimeout) {
                clearTimeout(orientationTimeout);
            }
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, [dispatch]);

    const currentGarment = useMemo(() => {
        if (!garmentData || !selectedGender || !selectedGarment) return null;
        return garmentData[selectedGender]?.[selectedGarment] || null;
    }, [garmentData, selectedGender, selectedGarment]);

    const isAccessoryCategory = useMemo(() => {
        if (!garmentMenu || !selectedGender || !selectedGarment) return false;
        const accessoryCategories = ['Accessories', 'Headwear', 'Eyewear'];
        const currentCategory = garmentMenu[selectedGender]?.find(cat =>
            cat.items.some(item => item.id === selectedGarment)
        )?.category;
        return accessoryCategories.includes(currentCategory);
    }, [garmentMenu, selectedGender, selectedGarment]);

    const getCurrentGarments = () => garmentMenu ? garmentMenu[selectedGender] || [] : [];

    const handleSelectGarment = (garmentId) => {
        if (selectedGarment !== garmentId) {
            audioManager.playSound('changeGarment');
            dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGarment: garmentId } });
        }
    };

    const handleCategoryChange = (categoryIndex) => {
        audioManager.playSound('changeCategory');
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { activeCategoryIndex: categoryIndex } });
        const newCategory = getCurrentGarments()[categoryIndex];
        if (newCategory && newCategory.items.length > 0) {
            handleSelectGarment(newCategory.items[0].id);
        } else {
            handleSelectGarment(null);
        }
    };

    const handleGenderChange = (gender) => {
        if (gender === selectedGender || isSwitchingGender) return;
        audioManager.playSound(gender === 'male' ? 'maleSelected' : 'femaleSelected');
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { isSwitchingGender: true, selectedGarment: null } });
        setTimeout(() => {
            dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGender: gender, isSwitchingGender: false } });
        }, 800);
    };

    const handleBackgroundCycle = () => {
        const backgrounds = [null, 'wdm1', 'wdm2'];
        const currentIndex = backgrounds.indexOf(selectedBackground);
        const nextIndex = (currentIndex + 1) % backgrounds.length;
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedBackground: backgrounds[nextIndex] } });
    };

    useEffect(() => {
        if (!mountRef.current) return;

        const mount = mountRef.current;
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, mobileDimensions.width / mobileDimensions.height, 0.1, 1000);
        camera.position.set(0, 0, 2.5);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false,
            powerPreference: "low-power",
            preserveDrawingBuffer: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mobileDimensions.width, mobileDimensions.height);
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(0.5, 1, 1);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-0.5, 0.5, 1);
        scene.add(fillLight);

        const animate = () => {
            if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

            const currentTime = Date.now();
            const currentLandmarks = latestLandmarksRef.current;

            if (garmentModelRef.current && poseEngineRef.current) {
                if (currentLandmarks && currentLandmarks.length > 0) {
                    if (isAccessoryCategory && faceLandmarks) {
                        const headTransform = headPoseMapperRef.current.update(faceLandmarks, currentGarment);
                        if (headTransform) {
                            garmentModelRef.current.position.lerp(headTransform.position, 0.1);
                            garmentModelRef.current.quaternion.slerp(headTransform.quaternion, 0.1);
                            garmentModelRef.current.scale.copy(headTransform.scale);
                            garmentModelRef.current.visible = true;
                        }
                    } else {
                        garmentModelRef.current.visible = true;
                        try {
                            poseEngineRef.current.update(currentLandmarks, garmentModelRef.current, cameraRef.current);
                            if (poseMapperRef.current) {
                                poseMapperRef.current.applyPoseToRiggedGarment(garmentModelRef.current, currentLandmarks, null, currentTime);
                            }
                        } catch (error) {
                            console.error('Pose update error:', error);
                        }
                    }
                } else {
                    garmentModelRef.current.visible = true;
                }

                if (physicsEnabled && currentLandmarks) {
                    physicsEngineRef.current.update(currentLandmarks);
                }
            }

            rendererRef.current.render(sceneRef.current, cameraRef.current);
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (rendererRef.current && mount.contains(rendererRef.current.domElement)) {
                mount.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, [mobileDimensions, isAccessoryCategory, currentGarment, physicsEnabled, faceLandmarks]);

    useEffect(() => {
        if (cameraRef.current && rendererRef.current) {
            cameraRef.current.aspect = mobileDimensions.width / mobileDimensions.height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(mobileDimensions.width, mobileDimensions.height);
        }
    }, [mobileDimensions]);

    useEffect(() => {
        if (!currentGarment || !sceneRef.current) return;

        let cancelled = false;
        setLoadingProgress(0);
        setModelLoadError(null);

        const loadMobileGarment = async () => {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('/draco/');
            const loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader);

            if (garmentModelRef.current && sceneRef.current) {
                sceneRef.current.remove(garmentModelRef.current);
                garmentModelRef.current = null;
            }

            try {
                const resolvedPath = await resolveModelPathWithFallback(currentGarment, true);

                if (!resolvedPath) {
                    setModelLoadError('Mobile model not found');
                    return;
                }

                const gltf = await new Promise((resolve, reject) => {
                    loader.load(
                        resolvedPath,
                        (gltf) => {
                            setLoadingProgress(100);
                            resolve(gltf);
                        },
                        (progress) => {
                            if (progress.lengthComputable) {
                                const percentage = (progress.loaded / progress.total) * 100;
                                setLoadingProgress(percentage);
                            }
                        },
                        (error) => {
                            reject(error);
                        }
                    );
                });

                if (cancelled) return;

                const model = gltf.scene;

                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                model.position.set(-center.x, -center.y, -center.z);

                const modelWrapper = new THREE.Group();
                modelWrapper.add(model);

                const maxDim = Math.max(size.x, size.y, size.z);
                const mobileScale = 0.5;
                modelWrapper.scale.setScalar(mobileScale);

                modelWrapper.position.set(0, 0, 0);
                modelWrapper.visible = true;

                garmentModelRef.current = modelWrapper;
                sceneRef.current.add(modelWrapper);

                if (poseMapperRef.current) {
                    poseMapperRef.current.initializeBones(modelWrapper);
                }

            } catch (error) {
                console.error('Mobile: Failed to load garment:', error);
                setModelLoadError('Failed to load garment model: ' + error.message);
                setLoadingProgress(0);
            } finally {
                dracoLoader.dispose();
            }
        };

        loadMobileGarment();
        return () => {
            cancelled = true;
        };
    }, [currentGarment]);

    useEffect(() => {
        if (!selectedGender || !videoElement.current || !canvasElement.current || isSwitchingGender) return;

        if (selectedBackground) {
            preloadBackgroundImage(selectedBackground);
        }

        const initialiseCameraAndHolistic = async () => {
            const video = videoElement.current;
            const canvas = canvasElement.current;
            const ctx = canvas.getContext('2d');

            canvas.width = mobileDimensions.width;
            canvas.height = mobileDimensions.height;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.objectFit = 'cover';

            try {
                const holistic = await cameraManager.initialiseGlobalHolistic();
                if (!holistic) throw new Error('Holistic instance is null');

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

                    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
                        const landmarks = results.poseLandmarks.map((landmark) => ({
                            x: landmark.x,
                            y: landmark.y,
                            z: landmark.z,
                            visibility: landmark.visibility
                        }));

                        dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { poseLandmarks: landmarks } });
                    } else {
                        dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { poseLandmarks: null } });
                    }

                    dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: {
                            faceLandmarks: results.faceLandmarks || null,
                            leftHandLandmarks: results.leftHandLandmarks || null,
                            rightHandLandmarks: results.rightHandLandmarks || null
                        }});
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
            cameraManager.stopCamera();
            dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { holisticInitialised: false, poseLandmarks: null } });
        };
    }, [selectedGender, isSwitchingGender, selectedBackground, mobileDimensions, dispatch]);

    React.useImperativeHandle(ref, () => ({
        takeSelfie: async () => {
            const backgroundCanvas = canvasElement.current;
            const threeCanvas = rendererRef.current?.domElement;

            if (!backgroundCanvas || !threeCanvas) {
                throw new Error("Selfie failed: Missing canvas elements");
            }

            const compositeCanvas = document.createElement('canvas');
            const scale = 2;
            compositeCanvas.width = mobileDimensions.width * scale;
            compositeCanvas.height = mobileDimensions.height * scale;
            const compositeCtx = compositeCanvas.getContext('2d');

            compositeCtx.imageSmoothingEnabled = true;
            compositeCtx.imageSmoothingQuality = 'high';

            compositeCtx.save();
            compositeCtx.scale(-1, 1);
            compositeCtx.translate(-compositeCanvas.width, 0);
            compositeCtx.drawImage(backgroundCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height);
            compositeCtx.restore();

            compositeCtx.drawImage(threeCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height);

            compositeCtx.font = `${12 * scale}px SF Pro Display`;
            compositeCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            compositeCtx.textAlign = 'right';
            compositeCtx.fillText('softWEAR', compositeCanvas.width - (10 * scale), compositeCanvas.height - (10 * scale));

            return new Promise((resolve, reject) => {
                compositeCanvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create image blob'));
                    }
                }, 'image/png', 0.95);
            });
        }
    }));

    if (!isMobileLayout || !deviceInfo.isPortrait) {
        return null;
    }

    return (
        <div className="mobile-view-container">
            <video ref={videoElement} className="video-element" style={{ display: 'none' }}></video>
            <canvas
                ref={canvasElement}
                className="canvas-element"
                width={mobileDimensions.width}
                height={mobileDimensions.height}
            ></canvas>
            <div
                ref={mountRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 5
                }}
            />

            {loadingProgress > 0 && loadingProgress < 100 && (
                <div className="mobile-loading-overlay">
                    <div className="mobile-loading-progress">
                        <div className="mobile-progress-bar" style={{ width: `${loadingProgress}%` }}></div>
                    </div>
                    <div className="mobile-loading-text">Loading mobile garment... {Math.round(loadingProgress)}%</div>
                </div>
            )}

            {modelLoadError && (
                <div className="mobile-error-overlay">
                    <div className="mobile-error-message">
                        <img src="./images/placeholderTee.png" alt="Placeholder" style={{ width: '48px', height: '48px' }} />
                        <p>{modelLoadError}</p>
                    </div>
                </div>
            )}

            {selfieCountdown !== null && (
                <div className="countdown-overlay">
                    <span className="countdown-text">{selfieCountdown}</span>
                </div>
            )}

            {!holisticInitialised && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">Initialising AI Body Detection...</div>
                </div>
            )}

            <div className="mobile-controls-overlay">
                <div className="mobile-top-bar">
                    <button
                        onClick={() => handleGenderChange('male')}
                        className={`gender-btn-mobile ${selectedGender === 'male' ? 'active' : ''}`}
                        disabled={isSwitchingGender}
                    >
                        ♂
                    </button>
                    <button
                        onClick={() => handleGenderChange('female')}
                        className={`gender-btn-mobile ${selectedGender === 'female' ? 'active' : ''}`}
                        disabled={isSwitchingGender}
                    >
                        ♀
                    </button>
                </div>

                {garmentMenu && getCurrentGarments().length > 0 && (
                    <GarmentChooser
                        layout="overlay"
                        activeCategory={activeCategoryIndex}
                        garments={getCurrentGarments()}
                        selectedGarment={selectedGarment}
                        onSelectGarment={handleSelectGarment}
                        onCategoryChange={handleCategoryChange}
                    />
                )}

                <div className="mobile-bottom-actions">
                    <button
                        onClick={handleBackgroundCycle}
                        className="background-cycle-btn"
                    >
                        {selectedBackground ? `Wardrobe ${selectedBackground.slice(-1)}` : 'Wardrobe Off'}
                    </button>
                    <SelfieButton
                        vtoCanvasRef={{ current: { takeSelfie: ref?.current?.takeSelfie } }}
                        garmentName={currentGarment?.name}
                        selectedGender={selectedGender}
                        disabled={!selectedGarment}
                    />
                </div>
            </div>
        </div>
    );
});

export default MobileView;
