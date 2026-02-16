# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Softwear is a real-time virtual try-on platform built with React, Three.js, and Mediapipe. It uses live camera input to track user body motion, apply digital clothing models, and simulate realistic drape and movement in 3D.

The application runs in the browser and requires HTTPS for webcam access. It supports both desktop and mobile layouts with optimized rendering for each platform.

## Common Commands

### Development
```bash
npm install              # Install dependencies
npm start                # Start dev server on https://localhost:3000 (requires SSL certs in ssl/ dir)
npm run build            # Production build to dist/
npm test                 # Run all Jest tests
npm run docs             # Generate JSDoc documentation
```

### Testing
```bash
npm test                           # Run all tests
npm test -- --watch                # Run tests in watch mode
npm test -- src/tests/vto/         # Run specific test directory
npm test -- VtoPoseEngine.test.js  # Run specific test file
```

### SSL Setup for Development
The dev server requires HTTPS for webcam access. Place SSL certificates in `ssl/`:
- `ssl/key.pem`
- `ssl/cert.pem`

If certificates are missing, webpack will warn and fall back to HTTP (webcam will not work).

## Architecture

### State Management (`src/stateManager.js`)
Centralized state using React Context + useReducer pattern. All state is organized into four main sections:

- **appState**: Privacy consent, splash screen, modal visibility
- **vtoState**: Gender selection, garment selection, physics toggles, background selection
- **viewState**: Canvas dimensions, landmarks, control panel state, holistic initialization
- **data**: Garment catalogue, bone data, menu structure

Use `ACTIONS` constants for all state updates via `dispatch()`.

### Core VTO (Virtual Try-On) Pipeline

1. **Camera Input** (`src/utils/CameraManager.js`)
   - Manages webcam access and video stream
   - Handles device selection and constraints

2. **Pose Detection** (`src/components/MainDisplay.js`)
   - Uses Mediapipe Holistic for body, face, and hand tracking
   - Singleton pattern with `globalHolistic` to prevent multiple instances
   - Landmarks are filtered with One Euro Filter for smoothing

3. **Pose Mapping** (`src/vto/VtoPoseEngine.js`)
   - Maps 2D Mediapipe landmarks to 3D garment position/scale/rotation
   - Tracks shoulder and hip landmarks to determine torso placement
   - Different visibility thresholds for mobile (0.1) vs desktop (0.5)

4. **Skeletal Rigging** (`src/vto/SMPLXBoneMapper.js`)
   - Maps Mediapipe pose to SMPL-X bone hierarchy
   - Applies quaternion rotations to rigged garment bones
   - Uses bone data from `public/data/smplx_bone_data.json`

5. **3D Rendering** (`src/components/VtoCanvas.js`)
   - Three.js scene with WebGL rendering
   - GLTF/DRACO model loading with compression support
   - Separate model paths for desktop and mobile (`modelPath` vs `modelPathMobile`)

6. **Greenscreen/Background** (`src/vto/greenscreen.js`)
   - Canvas-based background removal using Mediapipe segmentation masks
   - Custom background image support

### Component Hierarchy

```
App.js (with StateProvider + DeviceDetectionProvider)
├── SplashPage (initial entry)
├── GenderSelector (gender selection)
└── MainDisplay (main VTO interface)
    ├── VtoViewPanel (camera + 3D canvas)
    │   ├── background-canvas (greenscreen/video)
    │   └── VtoCanvas (Three.js 3D garments)
    ├── GarmentChooser (garment selection UI)
    ├── ItemPreview (garment details)
    └── ControlPanel (settings/toggles)
```

### Data Loading (`src/utils/dataLoader.js`)

All garment and configuration data loads from `public/data/`:
- `itemCatalogue.json` - Garment metadata, pricing, model paths, organized by gender
- `smplx_bone_data.json` - SMPL-X skeletal bone configuration for rigging

Data is cached in-memory to prevent redundant fetches. Use `loadItemMenu()`, `loadItemData()`, and `loadBoneData()` functions.

### 3D Model Structure

Models are stored in `public/3dmodels/` organized by gender:
```
public/3dmodels/
├── men/
│   ├── tshirts/
│   ├── jackets/
│   └── accessories/
└── women/
    ├── tops/
    └── accessories/
```

Each garment has:
- Desktop version: `*.glb` (higher poly count)
- Mobile version: `*_mob.glb` (optimized for mobile)
- DRACO compression for reduced file sizes

### Device Detection (`src/utils/DeviceDetectionContext.js`)

Provides:
- `isMobileLayout` - Based on screen width (≤768px)
- `deviceInfo` - OS, browser, portrait/landscape, touch support

Used throughout the app to conditionally render mobile vs desktop UIs and adjust performance settings.

### Hooks

- **`useResponsiveText`** (`src/hooks/useResponsiveText.js`) - Dynamic text sizing based on viewport

### Performance

Global performance metrics tracked in `window.softWearPerformance`:
- `garmentFPS` - 3D rendering frame rate
- `bodyMeshFPS` - Body mesh update rate
- `landmarkRate` - Landmark detection frequency

One Euro Filter is used extensively for smoothing landmarks and reducing jitter (see `src/utils/OneEuroFilter.js`).

## Key Implementation Details

### Holistic Singleton Pattern
Mediapipe Holistic is initialized once as a singleton (`globalHolistic` in `MainDisplay.js`) with a lock (`isHolisticInitialising`) to prevent race conditions. This is critical to avoid multiple instances competing for camera access.

### Model Disposal
When switching garments, use `disposeModel()` helper to properly clean up Three.js geometries, materials, and textures to prevent memory leaks.

### Canvas Mirroring
The camera feed is horizontally flipped (mirrored) for natural user experience. This is handled in the canvas transform operations.

### Background Images
Background images are preloaded from `public/images/*.webp` and cached in `backgroundImages` object to avoid loading delays during selection.

### Privacy Consent
Privacy consent is stored in localStorage with key `softwear_privacy_consent`. The app blocks access until consent is given.

## File Organization

- `src/components/` - React UI components
- `src/views/` - Page-level view components
- `src/vto/` - Virtual try-on engine (pose mapping, physics, skeletal rigging)
- `src/utils/` - Utilities (camera, audio, data loading, device detection)
- `src/hooks/` - Custom React hooks
- `src/tests/` - Jest test suites (unit, integration, performance)
- `public/3dmodels/` - 3D garment assets
- `public/data/` - JSON configuration files
- `public/images/` - Background images and UI assets
- `styles/` - CSS stylesheets

## Development Notes

### Adding New Garments
1. Add GLTF models to `public/3dmodels/{gender}/{category}/`
2. Update `public/data/itemCatalogue.json` with garment metadata
3. Include both desktop and mobile versions (`modelPath` and `modelPathMobile`)
4. Ensure DRACO compression is applied for optimal loading

### Testing
Tests use Jest with jsdom environment. Mocks are in `src/tests/__mocks__/`:
- Three.js, Mediapipe, and ONNX Runtime are mocked
- Image/GLB files use fileMock.js

### Webpack Configuration
- Dev server runs on port 3000 with HTTPS
- DRACO decoder files copied from `node_modules/three/examples/jsm/libs/draco` to `dist/draco/`
- Cross-Origin headers set for SharedArrayBuffer support (required for WebAssembly)

### Browser Requirements
- WebGL 2 support
- MediaDevices API (getUserMedia)
- HTTPS environment for camera access
- SharedArrayBuffer support (for ONNX Runtime WebAssembly)
