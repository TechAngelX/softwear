// public/draco.worker.js
import * as THREE from 'three';

// TODO LATER...
//
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
//
// self.onmessage = (event) => {
//     const { modelPath, dracoDecoderPath } = event.data;
//
//     const dracoLoader = new DRACOLoader();
//     dracoLoader.setDecoderPath(dracoDecoderPath);
//
//     const gltfLoader = new GLTFLoader();
//     gltfLoader.setDRACOLoader(dracoLoader);
//
//     gltfLoader.load(
//         modelPath,
//         (gltf) => {
//             const sceneJSON = gltf.scene.toJSON();
//             self.postMessage({ success: true, scene: sceneJSON });
//         },
//         undefined,
//         (error) => {
//             self.postMessage({ success: false, error: 'Failed to load model in worker.' });
//         }
//     );
// };
