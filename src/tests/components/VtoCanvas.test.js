// src/tests/components/VtoCanvas.test.js

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import VtoCanvas from '../../components/VtoCanvas';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useStateManager } from '../../stateManager';
import { useDeviceDetection } from '../../utils/DeviceDetectionContext';
import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import { HeadPoseMapper } from '../../vto/HeadPoseMapper';
import { resolveModelPathWithFallback } from '../../utils/modelPath';

jest.mock('../../utils/OneEuroFilter', () => {
    return {
        OneEuroFilter: jest.fn(() => ({
            filter: jest.fn(v => v)
        }))
    };
});

// Mock all external dependencies
jest.mock('three', () => {
    const originalThree = jest.requireActual('three');
    const mockVector3 = jest.fn(() => ({
        set: jest.fn(),
        setScalar: jest.fn(),
        copy: jest.fn(),
        lerp: jest.fn(),
        x: 0,
        y: 0,
        z: 0,
    }));
    return {
        ...originalThree,
        Scene: jest.fn(() => ({
            add: jest.fn(),
            remove: jest.fn(),
        })),
        PerspectiveCamera: jest.fn(() => ({
            position: mockVector3(),
            lookAt: jest.fn(),
            updateProjectionMatrix: jest.fn(),
            fov: 50,
            aspect: 1
        })),
        WebGLRenderer: jest.fn(() => ({
            setSize: jest.fn(),
            setPixelRatio: jest.fn(),
            setClearColor: jest.fn(),
            render: jest.fn(),
            domElement: null,
            dispose: jest.fn(),
        })),
        AmbientLight: jest.fn(() => ({})),
        DirectionalLight: jest.fn(() => ({
            position: mockVector3(),
        })),
        Group: jest.fn(() => ({
            add: jest.fn(),
            traverse: jest.fn((callback) => {
                const mockSkinnedMesh = { isSkinnedMesh: true, material: { skinning: false }, traverse: jest.fn(), isMesh: true, geometry: { dispose: jest.fn(), attributes: { position: { count: 100 } } } };
                callback(mockSkinnedMesh);
            }),
            scale: { x: 1, y: 1, z: 1 }, //  mocks the scale property
            position: mockVector3(),
            quaternion: { slerp: jest.fn(), copy: jest.fn() },
        })),
        Vector3: mockVector3,
        Quaternion: jest.fn(() => ({
            slerp: jest.fn(),
            copy: jest.fn(),
        })),
        Box3: jest.fn(() => ({
            setFromObject: jest.fn(),
            getCenter: jest.fn(() => mockVector3()),
        })),
        SRGBColorSpace: {},
        ACESFilmicToneMapping: {}
    };
});
jest.mock('three/examples/jsm/loaders/DRACOLoader');
jest.mock('three/examples/jsm/loaders/GLTFLoader');
jest.mock('../../stateManager');
jest.mock('../../utils/DeviceDetectionContext');
jest.mock('../../vto/VtoPoseEngine');
jest.mock('../../vto/HeadPoseMapper');
jest.mock('../../utils/modelPath');
jest.mock('../../vto/SMPLXBoneMapper', () => {
    return {
        SMPLXPoseMapper: jest.fn(() => ({
            initializeBones: jest.fn(),
            applyPoseToRiggedGarment: jest.fn()
        }))
    };
});
jest.mock('../../vto/garmentPhysics', () => {
    return {
        GarmentPhysics: jest.fn(() => ({
            update: jest.fn(),
            getSway: jest.fn(),
        }))
    };
});

describe('VtoCanvas', () => {
    let mockUseStateManager;
    let mockUseDeviceDetection;
    let mockOnMeshInfoUpdate;

    beforeEach(() => {
        jest.clearAllMocks();

        mockOnMeshInfoUpdate = jest.fn();

        mockUseStateManager = jest.fn(() => ({
            state: {
                viewState: {
                    poseLandmarks: [],
                    faceLandmarks: [],
                    canvasDimensions: { width: 1280, height: 720 },
                    physicsEnabled: true,
                },
                vtoState: {
                    selectedGarment: 'basicTee',
                    selectedGender: 'male',
                },
                data: {
                    garmentData: {
                        male: {
                            basicTee: { id: 'basicTee', modelPath: '/path/to/model.glb' }
                        }
                    },
                },
            },
        }));

        useStateManager.mockImplementation(mockUseStateManager);

        mockUseDeviceDetection = jest.fn(() => ({
            isMobileLayout: false,
        }));

        useDeviceDetection.mockImplementation(mockUseDeviceDetection);

        const mockDomElement = document.createElement('canvas');

        // Mock THREE.js classes and methods
        THREE.Scene.mockImplementation(() => ({
            add: jest.fn(),
            remove: jest.fn(),
        }));
        THREE.Group.mockImplementation(() => ({
            add: jest.fn(),
        }));
        THREE.PerspectiveCamera.mockImplementation(() => ({
            position: { set: jest.fn(), lookAt: jest.fn(), x: 0, y: 0, z: 2.5 },
            lookAt: jest.fn(),
            updateProjectionMatrix: jest.fn(),
            fov: 50,
            aspect: 1
        }));
        THREE.WebGLRenderer.mockImplementation(() => ({
            setSize: jest.fn(),
            setPixelRatio: jest.fn(),
            setClearColor: jest.fn(),
            render: jest.fn(),
            domElement: mockDomElement,
            dispose: jest.fn(),
        }));
        THREE.AmbientLight.mockImplementation(() => ({})),
            THREE.DirectionalLight.mockImplementation(() => ({
                position: { set: jest.fn(), x: 0, y: 0, z: 0 },
            }));
        THREE.Vector3.mockImplementation(() => ({
            set: jest.fn(),
            setScalar: jest.fn(),
            copy: jest.fn(),
            lerp: jest.fn(),
        }));
        THREE.Quaternion.mockImplementation(() => ({
            slerp: jest.fn(),
            copy: jest.fn(),
        }));

        // Mock loaders
        DRACOLoader.mockImplementation(() => ({
            setDecoderPath: jest.fn(),
            dispose: jest.fn(),
        }));

        const mockGltf = { scene: new THREE.Group() };
        GLTFLoader.mockImplementation(() => ({
            setDRACOLoader: jest.fn(),
            load: jest.fn((url, onLoad) => {
                onLoad(mockGltf);
            }),
        }));
        resolveModelPathWithFallback.mockResolvedValue('/path/to/model.glb');

        global.requestAnimationFrame = jest.fn(cb => 1);
        global.cancelAnimationFrame = jest.fn();
    });

    test('should initialise Three.js scene, camera, and renderer on mount', () => {
        render(<VtoCanvas onMeshInfoUpdate={mockOnMeshInfoUpdate} />);

        expect(THREE.Scene).toHaveBeenCalledTimes(1);
        expect(THREE.PerspectiveCamera).toHaveBeenCalledTimes(1);
        expect(THREE.WebGLRenderer).toHaveBeenCalledTimes(1);
    });

    test('should dispose of resources on unmount to prevent memory leaks', () => {
        const { unmount } = render(<VtoCanvas onMeshInfoUpdate={mockOnMeshInfoUpdate} />);
        const mockRenderer = THREE.WebGLRenderer.mock.results[0].value;

        unmount();

        expect(mockRenderer.dispose).toHaveBeenCalled();
        expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    test('should load a garment model when garmentModelPath is provided', async () => {
        const garmentModelPath = '/path/to/garment.glb';
        render(<VtoCanvas onMeshInfoUpdate={mockOnMeshInfoUpdate} garmentModelPath={garmentModelPath} />);

        await act(async () => {
        });

        const mockLoader = GLTFLoader.mock.results[0].value;
        expect(mockLoader.load).toHaveBeenCalledWith(
            '/path/to/model.glb',
            expect.any(Function),
            undefined,
            expect.any(Function)
        );
        expect(mockOnMeshInfoUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ vertices: expect.any(Number), fileSize: expect.any(Number) })
        );
    });

    test('should apply pose landmarks to the garment model', () => {
        const mockPoseLandmarks = [{ x: 0.5, y: 0.5, z: 0.5 }];
        mockUseStateManager.mockReturnValue({
            state: {
                ...mockUseStateManager().state,
                viewState: { ...mockUseStateManager().state.viewState, poseLandmarks: mockPoseLandmarks },
            },
        });

        render(<VtoCanvas onMeshInfoUpdate={mockOnMeshInfoUpdate} />);

        const mockPoseEngine = VtoPoseEngine.mock.instances[0];
        act(() => {
            jest.advanceTimersByTime(16);
        });

        expect(mockPoseEngine.update).toHaveBeenCalled();
    });

    test('should apply head pose to accessory garments', () => {
        const mockFaceLandmarks = [{ x: 0.5, y: 0.5, z: 0.5 }];
        mockUseStateManager.mockReturnValue({
            state: {
                ...mockUseStateManager().state,
                viewState: { ...mockUseStateManager().state.viewState, faceLandmarks: mockFaceLandmarks },
            },
        });

        render(<VtoCanvas onMeshInfoUpdate={mockOnMeshInfoUpdate} isAccessoryCategory={true} />);

        const mockHeadPoseMapper = HeadPoseMapper.mock.instances[0];
        act(() => {
            jest.advanceTimersByTime(16);
        });

        expect(mockHeadPoseMapper.update).toHaveBeenCalled();
    });
});
