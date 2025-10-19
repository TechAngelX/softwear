// src/views/SplashPage.js
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { loadItemData } from '../utils/dataLoader';
import { resolveModelPath } from '../utils/modelPath';
import '../../styles/splashPage.css'; 

const SplashPage = ({ onEnter }) => {
    const mountRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isIntroDone, setIsIntroDone] = useState(false);
    const [currentModelInfo, setCurrentModelInfo] = useState({
        name: 'LOADING...',
        price: ""
    });
    const [displayedName, setDisplayedName] = useState('');
    const [catalogueData, setCatalogueData] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'N/A';
    const lastChangeTimeRef = useRef(0);

    useEffect(() => {
        if (currentModelInfo.name && currentModelInfo.name !== 'LOADING...') {
            setDisplayedName('');
            let index = 0;
            const interval = setInterval(() => {
                if (index < currentModelInfo.name.length) {
                    setDisplayedName(currentModelInfo.name.substring(0, index + 1));
                    index++;
                } else {
                    clearInterval(interval);
                }
            }, 80);
            return () => clearInterval(interval);
        }
    }, [currentModelInfo.name]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsIntroDone(true);
        }, 4800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const loadCatalogue = async () => {
            try {
                const data = await loadItemData();
                setCatalogueData(data);
            } catch (error) {
                console.error('Error loading catalogue:', error);
            }
        };
        loadCatalogue();
    }, []);

    const handleEnterExperience = () => {
        onEnter();
    };

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                lastChangeTimeRef.current = Date.now();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (!mountRef.current || !catalogueData) return;

        let scene, camera, renderer;
        let hologramGrid, starField, currentModel = null;
        let animFrameId;
        const clock = new THREE.Clock();

        let currentModelIndex = 0;
        let isTransitioning = false;
        let cameraMode = 0;
        let lastCameraChange = 0;

        const DISPLAY_TIME = isMobile ? 10000 : 6000;
        const CAMERA_CHANGE_TIME = 8000;
        let cameraAngle = 0;
        let cameraRadius = isMobile ? 8 : 12;
        let cameraHeight = 0;
        let orbitSpeed = 0.2;

        const UNIVERSAL_SCALE = 14.0;
        const HEAD_ACCESSORIES = ['aviatorSunglasses', 'wayfarerSunglasses', 'baseballCap', 'fedoraHat'];

        const featuredItems = isMobile ? [
            {
                key: 'poloTee',
                gender: 'male',
                color: new THREE.Color(0xbb86fc),
                scale: 2.0,
                speed: 0.2,
                position: { x: 0, y: 0, z: 0 }
            },
            {
                key: 'aviatorSunglasses',
                gender: 'male',
                color: new THREE.Color(0x99ccff),
                scale: 2.0,
                speed: 0.3,
                position: { x: 0, y: 0, z: 0 }
            }
        ] : [
            {
                key: 'baseballCap',
                gender: 'male',
                color: new THREE.Color(0xbb86fc),
                scale: 2.0,
                speed: 0.3,
                position: { x: 0, y: 0, z: 0 }
            },
            {
                key: 'wayfarerSunglasses',
                gender: 'male',
                color: new THREE.Color(0x03dac6),
                scale: 2.0,
                speed: 0.5,
                position: { x: 0, y: 0, z: 0 }
            },
            {
                key: 'leatherJacket',
                gender: 'male',
                color: new THREE.Color(0x003399),
                scale: 1.5,
                speed: 0.5,
                position: { x: 0, y: 0, z: 0 }
            },
            {
                key: 'sportie',
                gender: 'female',
                color: new THREE.Color(0x3333ff),
                scale: 2.0,
                speed: 1.4,
                position: { x: 10, y: 0, z: 0 }
            },
            {
                key: 'poloTee',
                gender: 'male',
                color: new THREE.Color(0xffffff),
                scale: 2.5,
                speed: 1.6,
                position: { x: -3, y: 0, z: -0.8 }
            },
            {
                key: 'soccerTee',
                gender: 'male',
                color: new THREE.Color(0xffffff),
                scale: 2.0,
                speed: 1.5,
                position: { x: 0, y: 0, z: 0 }
            }
        ];

        const modelData = featuredItems.map(item => {
            const garment = catalogueData[item.gender]?.[item.key];
            if (!garment) return null;
            return {
                catalogueKey: item.key,
                gender: item.gender,
                scale: item.scale,
                color: item.color,
                rotationSpeed: item.speed,
                info: { name: garment.name.toUpperCase(), price: garment.price },
                position: item.position,
                isHeadAccessory: HEAD_ACCESSORIES.includes(item.key)
            };
        }).filter(Boolean);

        const container = mountRef.current;
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);

        function createStarField() {
            const starCount = isMobile ? 300 : 500;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(starCount * 3);
            const colors = new Float32Array(starCount * 3);
            const sizes = new Float32Array(starCount);

            for (let i = 0; i < starCount; i++) {
                const radius = 30 + Math.random() * 70;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = radius * Math.cos(phi);
                positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

                const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.8);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
                sizes[i] = Math.random() * 3 + 1;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 }
                },
                vertexShader: `
                    attribute float size;
                    varying vec3 vColor;
                    varying float vSize;
                    uniform float time;
                    
                    void main() {
                        vColor = color;
                        vSize = size;
                        
                        vec3 pos = position;
                        float twinkle = sin(time * 2.0 + length(pos) * 0.01);
                        
                        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z) * (0.5 + twinkle * 0.5);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    varying vec3 vColor;
                    varying float vSize;
                    
                    void main() {
                        vec2 coord = gl_PointCoord - vec2(0.5);
                        float dist = length(coord);
                        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                        gl_FragColor = vec4(vColor, alpha * 0.8);
                    }
                `,
                transparent: true,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            return new THREE.Points(geometry, material);
        }

        function createHolographicGrid() {
            const size = isMobile ? 20 : 40;
            const divisions = isMobile ? 15 : 30;
            const geometry = new THREE.PlaneGeometry(size, size, divisions, divisions);
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(0x03dac6) }
                },
                vertexShader: `
                    uniform float time;
                    void main() {
                        vec3 pos = position;
                        float dist = length(pos.xy);
                        
                        pos.z += sin(dist * 2.0 - time * 1.5) * 0.2;
                        pos.z += cos(pos.x * 3.0 + time * 0.8) * 0.1;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 color;
                    void main() {
                        float opacity = sin(time * 0.5) * 0.1 + 0.3;
                        gl_FragColor = vec4(color, opacity);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                wireframe: true
            });

            const grid = new THREE.Mesh(geometry, material);
            grid.rotation.x = -Math.PI / 2;
            grid.position.y = -2;
            return grid;
        }

        const loadModel = (modelInfo) => {
            const garment = catalogueData[modelInfo.gender]?.[modelInfo.catalogueKey];
            if (!garment) return;

            const path = resolveModelPath(garment, true);
            if (!path) return;

            gltfLoader.load(path, (gltf) => {
                if (currentModel) {
                    fadeOutModel(currentModel, () => {
                        scene.remove(currentModel);
                        addNewModel(gltf, modelInfo);
                        isTransitioning = false;
                    });
                } else {
                    addNewModel(gltf, modelInfo);
                    isTransitioning = false;
                }
            }, undefined, (error) => {
                console.error('Error loading 3D model:', error);
                isTransitioning = false;
            });
        };

        const fadeOutModel = (model, onComplete) => {
            const duration = 800;
            const startTime = Date.now();
            const fadeAnimation = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const opacity = 1 - progress;
                model.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.transparent = true;
                        child.material.opacity = opacity;
                    }
                });
                model.scale.multiplyScalar(1 + progress * 0.1);
                if (progress < 1) {
                    requestAnimationFrame(fadeAnimation);
                } else {
                    onComplete();
                }
            };
            fadeAnimation();
        };

        const addNewModel = (gltf, modelInfo) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.set(-center.x, -center.y, -center.z);
            currentModel = new THREE.Group();
            currentModel.add(model);
            const TARGET_CENTER_Y = 1.75;
            const centerOffset = TARGET_CENTER_Y - center.y;
            const finalY = modelInfo.position.y + centerOffset;
            currentModel.position.set(modelInfo.position.x, finalY, modelInfo.position.z);
            currentModel.scale.setScalar(0.1);

            currentModel.scale.x *= -1;

            currentModel.userData = {
                rotationSpeed: modelInfo.rotationSpeed,
                baseColor: modelInfo.color,
                targetScale: modelInfo.scale * UNIVERSAL_SCALE
            };
            currentModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 0;
                    if (child.material.emissive) {
                        child.material.emissive.copy(modelInfo.color).multiplyScalar(0.05);
                    }
                }
            });
            scene.add(currentModel);
            fadeInModel(currentModel);
            setCurrentModelInfo(modelInfo.info);
            lastChangeTimeRef.current = Date.now();
        };

        const fadeInModel = (model) => {
            const duration = 1200;
            const startTime = Date.now();
            const fadeAnimation = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                model.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.opacity = easeOut * 0.95;
                    }
                });
                const currentScale = easeOut * model.userData.targetScale;
                model.scale.setScalar(currentScale);
                model.scale.x *= -1;
                if (progress < 1) {
                    requestAnimationFrame(fadeAnimation);
                }
            };
            fadeAnimation();
        };

        function updateCameraOrbit(elapsedTime) {
            const now = Date.now();

            if (now - lastCameraChange > CAMERA_CHANGE_TIME) {
                cameraMode = (cameraMode + 1) % 4;
                lastCameraChange = now;
            }

            let baseSpeed, radiusModifier, heightModifier, focusY;

            switch (cameraMode) {
                case 0:
                    baseSpeed = 0.15;
                    radiusModifier = Math.sin(elapsedTime * 0.3) * 1.5;
                    heightModifier = Math.sin(elapsedTime * 0.2) * 0.8;
                    focusY = 0.5;
                    break;
                case 1:
                    baseSpeed = 0.08;
                    radiusModifier = Math.sin(elapsedTime * 0.5) * 3.0;
                    heightModifier = Math.cos(elapsedTime * 0.3) * 2.0;
                    focusY = 1.0;
                    break;
                case 2:
                    baseSpeed = 0.25;
                    radiusModifier = Math.sin(elapsedTime * 0.8) * 2.0 + Math.cos(elapsedTime * 1.2) * 1.0;
                    heightModifier = Math.sin(elapsedTime * 0.6) * 1.5;
                    focusY = 0.0;
                    break;
                case 3:
                    baseSpeed = 0.12;
                    radiusModifier = Math.sin(elapsedTime * 0.2) * 4.0;
                    heightModifier = Math.sin(elapsedTime * 0.15) * 3.0 + Math.cos(elapsedTime * 0.4) * 1.0;
                    focusY = 1.5;
                    break;
            }

            const smoothAngle = elapsedTime * baseSpeed;
            const breathingRadius = cameraRadius + radiusModifier;
            const dynamicHeight = cameraHeight + heightModifier;

            camera.position.x = Math.cos(smoothAngle) * breathingRadius;
            camera.position.z = Math.sin(smoothAngle) * breathingRadius;
            camera.position.y = dynamicHeight;

            const focusPoint = new THREE.Vector3(0, focusY, 0);
            camera.lookAt(focusPoint);
        }

        function init() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(
                isMobile ? 65 : 55,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            renderer = new THREE.WebGLRenderer({
                antialias: !isMobile,
                alpha: true,
                powerPreference: isMobile ? "low-power" : "high-performance"
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
            renderer.setSize(window.innerWidth, window.innerHeight);
            container.appendChild(renderer.domElement);

            starField = createStarField();
            scene.add(starField);

            hologramGrid = createHolographicGrid();
            scene.add(hologramGrid);

            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 5, 5);
            scene.add(directionalLight);

            const pointLight = new THREE.PointLight(0xbb86fc, 1.0, 20);
            pointLight.position.set(0, 5, 0);
            scene.add(pointLight);

            if (modelData.length > 0) {
                loadModel(modelData[0]);
            }
            setIsLoaded(true);
        }

        function animate() {
            animFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            const now = Date.now();

            updateCameraOrbit(elapsedTime);

            if (starField) {
                starField.material.uniforms.time.value = elapsedTime;
                starField.rotation.y += 0.0005;
            }

            if (hologramGrid) {
                hologramGrid.material.uniforms.time.value = elapsedTime;
            }

            if (currentModel) {
                const baseRotation = currentModel.userData.rotationSpeed * 0.01;
                const dynamicRotation = Math.sin(elapsedTime * 0.5) * 0.008;
                currentModel.rotation.y += baseRotation + dynamicRotation;

                const bob = Math.sin(elapsedTime * 2.0) * 0.1;
                currentModel.position.y += bob * 0.1;
            }

            if (!isTransitioning && now - lastChangeTimeRef.current > DISPLAY_TIME && modelData.length > 1) {
                isTransitioning = true;
                currentModelIndex = (currentModelIndex + 1) % modelData.length;
                lastChangeTimeRef.current = now;
                loadModel(modelData[currentModelIndex]);
            }

            renderer.render(scene, camera);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        init();
        animate();

        window.addEventListener('resize', onWindowResize);
        return () => {
            cancelAnimationFrame(animFrameId);
            window.removeEventListener('resize', onWindowResize);
            if (renderer && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            if (renderer) renderer.dispose();
        };
    }, [catalogueData, isMobile]);

    return (
        <div className="splash-page-wrapper">
            <div className="build-info">
                <span>Build Date: {buildDate}</span>
            </div>

            <div className={`initial-logo-container ${isIntroDone ? 'done' : ''}`}>
                <h1 className="softwear-title-glass">softWEAR</h1>
            </div>

            <div ref={mountRef} className="splash-canvas-container" style={{ pointerEvents: 'none' }}></div>

            <div className={`splash-ui-container ${isLoaded ? 'visible' : ''}`} style={{ pointerEvents: 'auto' }}>
                <div className="model-indicator">
                    <div className="model-indicator-label">NOW SHOWCASING</div>
                    <div className="model-indicator-name">{displayedName}</div>
                    {currentModelInfo.price && (
                        <div className="model-indicator-price">{currentModelInfo.price}</div>
                    )}
                </div>

                <div className="splash-scroll-content">
                    <main>
                        <section className="hero-section content-section">
                            <div className={`splash-content ${isIntroDone ? 'loaded' : ''}`}>
                                <div className="hero-text-container">
                                    <div className="hero-badge">
                                        <span className="badge-text">Next-Generation Virtual Try-On</span>
                                    </div>
                                    <h1 className="main-splash-title-hero">
                                        <span className="title-line-hero">softWEAR</span>
                                    </h1>
                                    <h2 className="splash-title-hero">
                                        <span className="title-line-hero">The Future of</span>
                                        <span className="title-line-hero">Fashion</span>
                                    </h2>
                                    <p className="splash-description-hero">
                                        Experience virtual try-on like never before. Interactive, immersive,
                                        and intelligent fashion technology that transforms how you shop.
                                    </p>
                                </div>
                                <div className="cta-section">
                                    <button onClick={handleEnterExperience} className="primary-btn">
                                        <span>Enter Experience</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default SplashPage;
