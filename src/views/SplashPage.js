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
        }, 2500);
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

    useEffect(() => {
        console.info(`softWEAR | Build: ${buildDate}`);
    }, [buildDate]);

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
        let hologramGrid, starField, starConnections, currentModel = null;
        let animFrameId;
        const clock = new THREE.Clock();

        let currentModelIndex = 0;
        let isTransitioning = false;
        let cameraMode = 0;
        let lastCameraChange = 0;
        let lastElapsed = 0;

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
                scale: 2.0,
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
                scale: 2.0,
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
            if (!garment) {
                console.warn(`Featured item "${item.key}" not found in catalogue for ${item.gender}`);
                return null;
            }
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
                const phi = Math.random() * Math.PI * 0.5; // Upper hemisphere only
                positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)); // Always above origin
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
                        float phase = dot(pos, vec3(12.9898, 78.233, 45.164));
                        float twinkle = sin(time * (1.0 + fract(phase) * 2.0) + phase) * 0.3 + 0.7;

                        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z) * twinkle;
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
            const gridGroup = new THREE.Group();

            const createGridPlane = (size, divisions, yPos, zOffset) => {
                const geometry = new THREE.PlaneGeometry(size, size, divisions, divisions);
                const material = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 }
                    },
                    vertexShader: `
                        uniform float time;
                        varying float vDist;
                        varying float vWave;
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            vec3 pos = position;
                            float dist = length(pos.xy);
                            vDist = dist;

                            float wave = sin(dist * 1.5 - time * 2.0) * 0.5;
                            wave += cos(pos.x * 2.0 + time * 1.2) * 0.3;
                            wave += sin(pos.y * 1.8 - time * 0.9) * 0.2;
                            pos.z += wave;
                            vWave = wave;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform float time;
                        varying float vDist;
                        varying float vWave;
                        varying vec2 vUv;
                        void main() {
                            float pulse = sin(time * 0.8) * 0.15 + 0.65;
                            float fade = 1.0 - smoothstep(0.0, 30.0, vDist);
                            float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x)
                                           * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
                            float glow = abs(vWave) * 1.5;
                            vec3 neonCyan = vec3(0.0, 1.0, 0.95);
                            vec3 neonPurple = vec3(0.73, 0.53, 0.99);
                            vec3 color = mix(neonCyan, neonPurple, glow);
                            gl_FragColor = vec4(color, pulse * fade * edgeFade * (0.5 + glow));
                        }
                    `,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    wireframe: true
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.y = yPos;
                mesh.position.z = zOffset;
                return mesh;
            };

            const mainSize = isMobile ? 30 : 50;
            const mainDiv = isMobile ? 20 : 35;

            // Main floor grid
            gridGroup.add(createGridPlane(mainSize, mainDiv, -3, 0));
            // Extended far grid for depth
            gridGroup.add(createGridPlane(mainSize, mainDiv, -3, -(mainSize * 0.85)));

            gridGroup.userData.meshes = gridGroup.children;
            return gridGroup;
        }

        function createStarConnections(starGeometry) {
            const positions = starGeometry.getAttribute('position').array;
            const starCount = positions.length / 3;
            const maxConnections = isMobile ? 100 : 300;
            const connectionDistance = 25;

            const linePositions = [];
            let connections = 0;

            for (let i = 0; i < starCount && connections < maxConnections; i++) {
                for (let j = i + 1; j < starCount && connections < maxConnections; j++) {
                    const dx = positions[i * 3] - positions[j * 3];
                    const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                    const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < connectionDistance) {
                        linePositions.push(
                            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
                        );
                        connections++;
                    }
                }
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

            const material = new THREE.LineBasicMaterial({
                color: 0x03dac6,
                transparent: true,
                opacity: 0.1,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            return new THREE.LineSegments(geometry, material);
        }

        const preloadCache = new Map();
        const preloadingKeys = new Set();

        const preloadModel = (modelInfo) => {
            const key = modelInfo.catalogueKey;
            if (preloadCache.has(key) || preloadingKeys.has(key)) return;

            const garment = catalogueData[modelInfo.gender]?.[key];
            if (!garment) return;
            const path = resolveModelPath(garment, true);
            if (!path) return;

            preloadingKeys.add(key);
            gltfLoader.load(path, (gltf) => {
                preloadCache.set(key, gltf);
                preloadingKeys.delete(key);
            }, undefined, () => {
                preloadingKeys.delete(key);
            });
        };

        const showModel = (modelInfo) => {
            const cached = preloadCache.get(modelInfo.catalogueKey);
            if (cached) {
                // Keep the parsed model cached so repeat cycles are instant (no re-parse hitch)
                swapModel(cached, modelInfo);
            } else {
                const garment = catalogueData[modelInfo.gender]?.[modelInfo.catalogueKey];
                if (!garment) return;
                const path = resolveModelPath(garment, true);
                if (!path) return;

                gltfLoader.load(path, (gltf) => {
                    preloadCache.set(modelInfo.catalogueKey, gltf);
                    swapModel(gltf, modelInfo);
                }, undefined, (error) => {
                    console.error('Error loading 3D model:', error);
                    isTransitioning = false;
                    if (modelData.length > 1) {
                        currentModelIndex = (currentModelIndex + 1) % modelData.length;
                        lastChangeTimeRef.current = Date.now();
                        showModel(modelData[currentModelIndex]);
                    }
                });
            }
        };

        const swapModel = (gltf, modelInfo) => {
            if (currentModel) {
                const oldModel = currentModel;
                fadeOutModel(oldModel, () => {
                    scene.remove(oldModel);
                });
                addNewModel(gltf, modelInfo);
                isTransitioning = false;
            } else {
                addNewModel(gltf, modelInfo);
                isTransitioning = false;
            }
        };

        const fadeOutModel = (model, onComplete) => {
            const duration = 400;
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
                targetScale: modelInfo.scale * UNIVERSAL_SCALE,
                baseY: finalY
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
            const duration = 600;
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
                alpha: false,
                powerPreference: isMobile ? "low-power" : "high-performance"
            });
            renderer.setClearColor(0x000000, 1);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
            renderer.setSize(window.innerWidth, window.innerHeight);
            container.appendChild(renderer.domElement);

            starField = createStarField();
            scene.add(starField);

            starConnections = createStarConnections(starField.geometry);
            scene.add(starConnections);

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

            // Preload ALL models at startup for seamless transitions
            modelData.forEach((info) => preloadModel(info));

            if (modelData.length > 0) {
                showModel(modelData[0]);
            }
            setIsLoaded(true);
        }

        function animate() {
            animFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            // Frame-rate-independent step, clamped so a tab-switch can't cause a jump
            const delta = Math.min(elapsedTime - lastElapsed, 0.05);
            lastElapsed = elapsedTime;
            const dt60 = delta * 60;
            const now = Date.now();

            updateCameraOrbit(elapsedTime);

            if (starField) {
                starField.material.uniforms.time.value = elapsedTime;
                starField.rotation.y += 0.0005;
                if (starConnections) {
                    starConnections.rotation.y = starField.rotation.y;
                }
            }

            if (hologramGrid && hologramGrid.userData.meshes) {
                hologramGrid.userData.meshes.forEach(mesh => {
                    mesh.material.uniforms.time.value = elapsedTime;
                });
            }

            if (currentModel) {
                const baseRotation = currentModel.userData.rotationSpeed * 0.01 * dt60;
                const dynamicRotation = Math.sin(elapsedTime * 0.5) * 0.008 * dt60;
                currentModel.rotation.y += baseRotation + dynamicRotation;

                const bob = Math.sin(elapsedTime * 2.0) * 0.1;
                currentModel.position.y = currentModel.userData.baseY + bob;
            }

            if (!isTransitioning && now - lastChangeTimeRef.current > DISPLAY_TIME && modelData.length > 1) {
                isTransitioning = true;
                currentModelIndex = (currentModelIndex + 1) % modelData.length;
                lastChangeTimeRef.current = now;
                showModel(modelData[currentModelIndex]);
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

            const disposeMesh = (obj) => {
                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry?.dispose();
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(mat => {
                            if (mat) {
                                mat.map?.dispose();
                                mat.normalMap?.dispose();
                                mat.roughnessMap?.dispose();
                                mat.metalnessMap?.dispose();
                                mat.emissiveMap?.dispose();
                                mat.dispose();
                            }
                        });
                    }
                });
            };

            if (currentModel) disposeMesh(currentModel);
            if (starField) {
                starField.geometry?.dispose();
                starField.material?.dispose();
            }
            if (starConnections) {
                starConnections.geometry?.dispose();
                starConnections.material?.dispose();
            }
            if (hologramGrid && hologramGrid.userData.meshes) {
                hologramGrid.userData.meshes.forEach(mesh => {
                    mesh.geometry?.dispose();
                    mesh.material?.dispose();
                });
            }
            dracoLoader.dispose();

            if (renderer && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            if (renderer) renderer.dispose();
        };
    }, [catalogueData, isMobile]);

    return (
        <div className="splash-page-wrapper">
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
                                        <span className="badge-text">Virtual Try-On Platform</span>
                                    </div>
                                    <h1 className="main-splash-title-hero">
                                        <span className="title-line-hero">softWEAR</span>
                                    </h1>
                                    <h2 className="splash-title-hero">
                                        <span className="title-line-hero">Try on real clothes</span>
                                        <span className="title-line-hero">using your camera</span>
                                    </h2>
                                    <p className="splash-description-hero">
                                        softWEAR maps your body in real time and fits 3D garments to your
                                        movement. Nothing is uploaded — tracking and rendering run entirely
                                        in your browser, on your device.
                                    </p>

                                    <div className="feature-highlights">
                                        <div className="feature">
                                            <span className="feature-icon" aria-hidden="true">&#9889;</span>
                                            <span>Real-time tracking</span>
                                        </div>
                                        <div className="feature">
                                            <span className="feature-icon" aria-hidden="true">&#128274;</span>
                                            <span>On-device &amp; private</span>
                                        </div>
                                        <div className="feature">
                                            <span className="feature-icon" aria-hidden="true">&#127760;</span>
                                            <span>Runs in your browser</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="cta-section">
                                    <button type="button" onClick={handleEnterExperience} className="primary-btn">
                                        <span>Launch Try-On</span>
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
