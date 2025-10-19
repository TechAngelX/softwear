// src/views/ItemPreview.js

import React, { useRef, useEffect, useState, useMemo } from 'react';
import '../../styles/itemPreview.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { loadItemData } from '../utils/dataLoader';
import { useStateManager } from '../stateManager';
import { resolveModelPath, resolveThumbnailPath } from '../utils/modelPath';

const ItemPreview = () => {
    const { state } = useStateManager();
    const { selectedGarment, selectedGender, selectedBackground } = state.vtoState;
    const { garmentData } = state.data;

    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const modelRef = useRef(null);
    const animationRef = useRef(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const currentGarment = useMemo(() => {
        if (!garmentData || !selectedGender || !selectedGarment) return null;
        return garmentData[selectedGender]?.[selectedGarment] || null;
    }, [garmentData, selectedGender, selectedGarment]);

    const cleanupThreeJS = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current);
            modelRef.current.traverse((child) => {
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
            modelRef.current = null;
        }

        if (rendererRef.current && mountRef.current?.contains(rendererRef.current.domElement)) {
            mountRef.current.removeChild(rendererRef.current.domElement);
            rendererRef.current.dispose();
            rendererRef.current = null;
        }
    };

    useEffect(() => {
        if (!mountRef.current || !currentGarment) return;

        cleanupThreeJS();

        const mount = mountRef.current;
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, 200/175, 0.1, 100);
        camera.position.set(0, 0, 4);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(200, 175);
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(2, 3, 2);
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.3);
        fillLight.position.set(-2, 1, 2);
        scene.add(fillLight);

        return cleanupThreeJS;
    }, [currentGarment]);

    useEffect(() => {
        if (!currentGarment || !sceneRef.current) return;

        setIsLoading(true);
        setLoadError(null);

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');

        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);

        const modelPath = resolveModelPath(currentGarment);

        if (!modelPath) {
            setLoadError('Model path not found');
            setIsLoading(false);
            return;
        }

        gltfLoader.load(
            modelPath,
            (gltf) => {
                if (!sceneRef.current) return;

                const model = gltf.scene;

                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                model.position.set(-center.x, -center.y, -center.z);

                const modelGroup = new THREE.Group();
                modelGroup.add(model);

                const maxDimension = Math.max(size.x, size.y, size.z);
                const targetSize = 2.8;
                const scale = targetSize / maxDimension;
                modelGroup.scale.setScalar(scale);

                modelGroup.position.set(0, 0, 0);

                if (modelRef.current) {
                    sceneRef.current.remove(modelRef.current);
                }

                modelRef.current = modelGroup;
                sceneRef.current.add(modelGroup);

                setIsLoading(false);
                setLoadError(null);

                const animate = () => {
                    if (!modelRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

                    modelRef.current.rotation.y += .035;
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                    animationRef.current = requestAnimationFrame(animate);
                };
                animate();
            },
            undefined,
            (error) => {
                console.error('Error loading preview model:', error);
                setLoadError('Failed to load model');
                setIsLoading(false);
            }
        );

        return () => {
            dracoLoader.dispose();
        };
    }, [currentGarment]);

    if (!selectedGarment) {
        return (
            <div className="preview-section">
                <h3 className="section-title">Item Preview</h3>
                <div className="item-preview-panel" style={{
                    backgroundImage: 'url(./images/item-prev-wardrobe.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}>
                    <div className="no-selection">No item selected</div>
                </div>
            </div>
        );
    }

    const handleImageError = (event) => {
        event.target.src = './images/placeholderTee.png';
    };

    return (
        <div className="preview-section">
            <h3 className="section-title">Item Preview</h3>

            <div className="item-preview">
                <div className="item-preview-content">
                    <div className="item-preview-image" style={{
                        backgroundImage: 'url(./images/item-prev-wardrobe.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}>
                        {isLoading && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: '#fff',
                                fontSize: '0.8rem',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                padding: '8px 12px',
                                borderRadius: '4px'
                            }}>
                                Loading 3D preview...
                            </div>
                        )}
                        {loadError && (
                            <div style={{
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                color: '#fff',
                                fontSize: '0.8rem',
                                textAlign: 'center',
                                padding: '10px',
                                backgroundColor: 'rgba(0,0,0,0.6)'
                            }}>
                                <img
                                    src={resolveThumbnailPath(currentGarment)}
                                    alt={currentGarment?.name || 'Garment'}
                                    onError={handleImageError}
                                    style={{
                                        maxWidth: '80px',
                                        maxHeight: '80px',
                                        objectFit: 'contain',
                                        marginBottom: '8px',
                                        opacity: 0.9
                                    }}
                                />
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                    3D preview unavailable
                                </div>
                            </div>
                        )}
                        <div ref={mountRef} style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }} />
                    </div>

                    {currentGarment && (
                        <div className="item-preview-details">
                            <div className="item-preview-info">
                                <span className="item-preview-label">Name:</span>
                                <span className="item-preview-value">{currentGarment.name}</span>
                            </div>

                            <div className="item-preview-info">
                                <span className="item-preview-label">Price:</span>
                                <span className="item-preview-value">{currentGarment.price}</span>
                            </div>

                            <div className="item-preview-info">
                                <span className="item-preview-label">SKU:</span>
                                <span className="item-preview-value">{currentGarment.sku || selectedGarment}</span>
                            </div>

                            {currentGarment.material && (
                                <div className="item-preview-info">
                                    <span className="item-preview-label">Material:</span>
                                    <span className="item-preview-value">{currentGarment.material}</span>
                                </div>
                            )}

                            {selectedBackground && (
                                <div className="item-preview-info">
                                    <span className="item-preview-label">Background:</span>
                                    <span className="item-preview-value">Wardrobe {selectedBackground.slice(-1)}</span>
                                </div>
                            )}

                            {currentGarment.description && (
                                <div className="item-preview-description">
                                    <span className="item-preview-label">Description:</span>
                                    <p>{currentGarment.description}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ItemPreview;
