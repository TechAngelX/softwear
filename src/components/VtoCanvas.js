// src/components/VtoCanvas.js
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { VtoPoseEngine } from '../vto/VtoPoseEngine';
import { HeadPoseMapper } from '../vto/HeadPoseMapper';
import { GarmentPhysics } from '../vto/garmentPhysics';
import { SMPLXPoseMapper } from '../vto/SMPLXBoneMapper';
import { useStateManager } from '../stateManager';
import { useDeviceDetection } from '../utils/DeviceDetectionContext';
import { resolveModelPathWithFallback } from '../utils/modelPath';
import smplxBoneData from '../../public/data/smplx_bone_data.json';
if (!window.softWearPerformance) {
    window.softWearPerformance = { garmentFPS: 0 };
}
const disposeModel = (model) => {
    if (!model) return;
    model.traverse((child) => {
        if (child.isMesh) {
            child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        if (material.map) material.map.dispose();
                        material.dispose();
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        }
    });
};
const VtoCanvas = forwardRef(({ onMeshInfoUpdate, isAccessoryCategory, garmentModelPath }, ref) => {
    const { state } = useStateManager();
    const { isMobileLayout } = useDeviceDetection();
    const { poseLandmarks, faceLandmarks, canvasDimensions, physicsEnabled } = state.viewState;
    const { selectedGarment, selectedGender } = state.vtoState;
    const { garmentData } = state.data;
    const garmentDetails = garmentData?.[selectedGender]?.[selectedGarment];
    const mountRef = useRef(null);
    const stateRef = useRef({}).current;

    useImperativeHandle(ref, () => ({
        takeSelfie: async () => {
            const backgroundCanvas = document.getElementById('background-canvas');
            const threeCanvas = stateRef.renderer?.domElement;

            if (!backgroundCanvas || !threeCanvas) {
                throw new Error("Selfie failed: Missing canvas elements");
            }

            const compositeCanvas = document.createElement('canvas');
            const scale = 2;
            compositeCanvas.width = canvasDimensions.width * scale;
            compositeCanvas.height = canvasDimensions.height * scale;
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

    useEffect(() => {
        stateRef.poseLandmarks = poseLandmarks;
        stateRef.faceLandmarks = faceLandmarks;
        stateRef.isAccessoryCategory = isAccessoryCategory;
        stateRef.garmentDetails = garmentDetails;
    }, [poseLandmarks, faceLandmarks, isAccessoryCategory, garmentDetails]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        stateRef.scene = new THREE.Scene();
        stateRef.camera = new THREE.PerspectiveCamera(50, mount.offsetWidth / mount.offsetHeight, 0.1, 1000);
        stateRef.camera.position.set(0, 0.0, 2.5);
        stateRef.camera.lookAt(0, 0.0, 0);

        stateRef.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance"
        });
        stateRef.renderer.setSize(mount.offsetWidth, mount.offsetHeight);
        stateRef.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        stateRef.renderer.setClearColor(0x000000, 0);
        stateRef.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        stateRef.renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(stateRef.renderer.domElement);

        const handleResize = () => {
            if (mount && stateRef.renderer && stateRef.camera) {
                stateRef.camera.aspect = mount.offsetWidth / mount.offsetHeight;
                stateRef.camera.updateProjectionMatrix();
                stateRef.renderer.setSize(mount.offsetWidth, mount.offsetHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        stateRef.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(0.5, 1, 2);
        stateRef.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(-0.5, 0.5, 2);
        stateRef.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
        rimLight.position.set(0, 1, -2);
        stateRef.scene.add(rimLight);

        const worldGroup = new THREE.Group();
        worldGroup.scale.x = -1;
        stateRef.scene.add(worldGroup);
        stateRef.worldGroup = worldGroup;

        stateRef.poseEngine = new VtoPoseEngine();
        stateRef.headPoseMapper = new HeadPoseMapper(smplxBoneData);
        stateRef.poseMapper = new SMPLXPoseMapper({}, window.innerWidth <= 768);
        stateRef.physics = new GarmentPhysics();

        let lastTime = performance.now();
        let frameCount = 0;
        const animate = () => {
            stateRef.animFrameId = requestAnimationFrame(animate);
            const currentTime = performance.now();
            frameCount++;

            if (currentTime - lastTime >= 1000) {
                window.softWearPerformance.garmentFPS = frameCount;
                frameCount = 0;
                lastTime = currentTime;
            }

            const { poseEngine, headPoseMapper, poseMapper, renderer, scene, camera, garmentModel } = stateRef;

            if (garmentModel && renderer && scene && camera) {
                if (stateRef.isAccessoryCategory) {
                    const headTransform = headPoseMapper.update(stateRef.faceLandmarks, stateRef.garmentDetails);
                    if (headTransform) {
                        garmentModel.position.lerp(headTransform.position, 0.1);
                        garmentModel.quaternion.slerp(headTransform.quaternion, 0.1);
                        garmentModel.scale.copy(headTransform.scale);
                    }
                } else {
                    poseEngine.update(stateRef.poseLandmarks, garmentModel, camera);
                    poseMapper.applyPoseToRiggedGarment(garmentModel, stateRef.poseLandmarks, null, currentTime);
                }
            }

            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        };
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (stateRef.animFrameId) {
                cancelAnimationFrame(stateRef.animFrameId);
            }
            disposeModel(stateRef.garmentModel);
            if (mount && stateRef.renderer && mount.contains(stateRef.renderer.domElement)) {
                mount.removeChild(stateRef.renderer.domElement);
            }
            if (stateRef.renderer) {
                stateRef.renderer.dispose();
            }
        };
    }, []);

    useEffect(() => {
        if (!garmentModelPath) return;

        let isCancelled = false;
        let dracoLoader = null;
        let loader = null;

        const loadGarment = async () => {
            dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('/draco/');
            loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader);

            const oldModel = stateRef.garmentModel;
            if (oldModel && stateRef.worldGroup) {
                stateRef.worldGroup.remove(oldModel);
                disposeModel(oldModel);
                stateRef.garmentModel = null;
                if (onMeshInfoUpdate) {
                    onMeshInfoUpdate({ vertices: 0, fileSize: 0 });
                }
            }

            let fileSize = 0;
            let finalPath = garmentModelPath;

            try {
                const garmentObject = { modelPath: garmentModelPath };
                finalPath = await resolveModelPathWithFallback(garmentObject, isMobileLayout);

                if (!finalPath) {
                    console.warn('No valid model path found, skipping garment load');
                    return;
                }

                const response = await fetch(finalPath, { method: 'HEAD' });
                if (response.ok) {
                    const contentLength = response.headers.get('content-length');
                    if (contentLength) {
                        fileSize = Math.round(parseInt(contentLength, 10) / 1024);
                    }
                }
            } catch (e) {
                console.warn('Could not fetch file size for model via HEAD request.');
            }

            loader.load(
                finalPath,
                (gltf) => {
                    if (isCancelled) return;

                    const rawModel = gltf.scene;
                    const modelWrapper = new THREE.Group();
                    modelWrapper.name = 'GarmentWrapper';

                    const box = new THREE.Box3().setFromObject(rawModel);
                    const center = box.getCenter(new THREE.Vector3());
                    rawModel.position.set(-center.x, -center.y, -center.z);
                    modelWrapper.add(rawModel);

                    modelWrapper.traverse((node) => {
                        if (node.isSkinnedMesh && node.material) {
                            node.material.skinning = true;
                        }
                    });

                    stateRef.garmentModel = modelWrapper;
                    if (stateRef.worldGroup) {
                        stateRef.worldGroup.add(modelWrapper);
                    }

                    if (stateRef.poseMapper) {
                        stateRef.poseMapper.initializeBones(modelWrapper);
                    }

                    if (onMeshInfoUpdate) {
                        let vertexCount = 0;
                        modelWrapper.traverse(child => {
                            if (child.isMesh) {
                                vertexCount += child.geometry.attributes.position.count;
                            }
                        });
                        onMeshInfoUpdate({ vertices: vertexCount, fileSize: fileSize });
                    }
                },
                undefined,
                (error) => {
                    if (!isCancelled) {
                        console.error('ERROR: Failed to load 3D model:', error);
                        console.error('Attempted path:', finalPath);

                        // Cleanup DRACO loader on error
                        if (dracoLoader) {
                            dracoLoader.dispose();
                            dracoLoader = null;
                        }

                        if (onMeshInfoUpdate) {
                            onMeshInfoUpdate({ vertices: 0, fileSize: 0, error: 'Model load failed' });
                        }
                    }
                }
            );
        };

        loadGarment();

        return () => {
            isCancelled = true;
            if (dracoLoader) {
                dracoLoader.dispose();
            }
        };
    }, [garmentModelPath, onMeshInfoUpdate, isMobileLayout]);

    return <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 5 }} />;
});
export default VtoCanvas;
