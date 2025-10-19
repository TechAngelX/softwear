# Softwear

Softwear is a real-time virtual try-on platform built with React, Three.js, and Mediapipe. It uses live camera input to map user body motion, apply digital clothing models, and simulate realistic drape and movement in 3D.

---
### Check out the Live Demo:
## [https://softwear.techangelx.com](https://softwear.techangelx.com)

## Overview
![Screenshot](readme_images/screenshot1.png)


Softwear blends computer vision, CGI, and physics-based rendering to let users experience virtual garments directly in the browser.  
It tracks body pose using Mediapipe, maps it to a 3D mesh, and dynamically overlays clothing assets with real-time physics and lighting.

---

## Core Features

- Live body tracking using Mediapipe and ONNX Runtime
- Realistic 3D garment overlays with Three.js and WebGL shaders
- Cloth physics simulation via WebAssembly-based engine
- Compressed GLTF/DRACO model loading from `/public/models`
- Integrated webcam access over HTTPS
- Modular React components for garment and camera control

---

## Tech Stack

- React — Component-based UI
- Three.js — 3D rendering
- TailwindCSS — Styling and layout
- Inter — Clean, modern typeface
- Mediapipe / ONNX Runtime — Body and pose tracking
- @react-three/fiber — React bindings for Three.js
- Webpack — Custom build pipeline
- Jest / JSDoc — Testing and documentation

---

## Development

### Install dependencies:
```bash
npm install
Run local server (HTTPS required for webcam):
npm run dev
```
### Build for production:

```
npm run build
```
### Requirements
Node.js v18 or higher
Browser with WebGL 2 and MediaDevices API support
HTTPS environment for camera access

### Author

Ricki Angel
https://github.com/TechAngelX

#### License

MIT License
© 2025 Ricki Angel
