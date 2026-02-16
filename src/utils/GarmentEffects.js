// src/utils/GarmentEffects.js

/**
 * Garment transition effects system for visual feedback during garment changes.
 * Provides smooth animations when switching between garments in the VTO interface.
 * (in-progress...)
 * @module GarmentEffects
 */


// TODO: Test out the different effects or remove if not needed
// TRANSITION_EFFECTS.NONE - No effect 
// TRANSITION_EFFECTS.FADE - Smooth fade in/out 
// TRANSITION_EFFECTS.SCALE_POP - Bounce scale effect 
// TRANSITION_EFFECTS.WIREFRAME - Wireframe transition 
// TRANSITION_EFFECTS.PARTICLE_DISSOLVE - Particle effect (placeholder) 
// TRANSITION_EFFECTS.SHADER_DISSOLVE - Shader effect (placeholder) 
// TRANSITION_EFFECTS.GLITCH - Glitch effect (placeholder) 
// TRANSITION_EFFECTS.GRACEFUL_APPEAR - Graceful scale and fade appearance

import * as THREE from 'three';

/**
 * Available transition effect types for garment switching.
 * @enum {string}
 */
export const TRANSITION_EFFECTS = {
    NONE: 'none',
    FADE: 'fade',
    SCALE_POP: 'scalePop',
    PARTICLE_DISSOLVE: 'particleDissolve',
    SHADER_DISSOLVE: 'shaderDissolve',
    WIREFRAME: 'wireframe',
    GLITCH: 'glitch',
    GRACEFUL_APPEAR: 'gracefulAppear'
};

/**
 * Manages garment transition effects and animations.
 * Handles appear/disappear effects with configurable parameters.
 *
 * @class GarmentEffectManager
 */
export class GarmentEffectManager {
    constructor() {
        this.config = {
            appearEffect: TRANSITION_EFFECTS.FADE,
            disappearEffect: TRANSITION_EFFECTS.FADE,
            duration: 1800,
            easing: 'easeOutBounce'
        };
        this.activeAnimations = new Map();
    }

    setAppearEffect(effect) {
        this.config.appearEffect = effect;
    }

    setDisappearEffect(effect) {
        this.config.disappearEffect = effect;
    }

    setEffects(appearEffect, disappearEffect) {
        this.config.appearEffect = appearEffect;
        this.config.disappearEffect = disappearEffect;
    }

    /**
     * Shows garment with configured appear effect.
     * @param {THREE.Object3D} garmentModel - 3D garment model
     * @param {Function} onComplete - Completion callback
     */
    showGarment(garmentModel, onComplete = null) {
        if (!garmentModel) return;
        console.log('EFFECT: Showing garment with', this.config.appearEffect);

        this.stopAnimation(garmentModel);

        switch (this.config.appearEffect) {
            case TRANSITION_EFFECTS.FADE:
                this.fadeIn(garmentModel, onComplete);
                break;
            case TRANSITION_EFFECTS.SCALE_POP:
                this.scalePop(garmentModel, onComplete);
                break;
            case TRANSITION_EFFECTS.GRACEFUL_APPEAR:
                this.gracefulAppear(garmentModel, onComplete);
                break;
            case TRANSITION_EFFECTS.PARTICLE_DISSOLVE:
                this.particleDissolveIn(garmentModel, onComplete);
                break;
            case TRANSITION_EFFECTS.WIREFRAME:
                this.wireframeIn(garmentModel, onComplete);
                break;
            default:
                garmentModel.visible = true;
                if (onComplete) onComplete();
        }
    }

    /**
     * Hides garment with configured disappear effect.
     * @param {THREE.Object3D} garmentModel - 3D garment model
     * @param {Function} onComplete - Completion callback
     */
    hideGarment(garmentModel, onComplete = null) {
        if (!garmentModel) return;
        console.log('EFFECT: Hiding garment with', this.config.disappearEffect);

        this.stopAnimation(garmentModel);

        switch (this.config.disappearEffect) {
            case TRANSITION_EFFECTS.FADE:
                this.fadeOut(garmentModel, onComplete);
                break;
            case TRANSITION_EFFECTS.SCALE_POP:
                this.scaleDown(garmentModel, onComplete);
                break;
            case TRANSITION_EFFECTS.PARTICLE_DISSOLVE:
                this.particleDissolveOut(garmentModel, onComplete);
                break;
            default:
                garmentModel.visible = false;
                if (onComplete) onComplete();
        }
    }

    fadeIn(garmentModel, onComplete) {
        garmentModel.visible = true;
        garmentModel.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 0;
            }
        });
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.config.duration, 1);

            garmentModel.traverse(child => {
                if (child.material) {
                    child.material.opacity = progress;
                }
            });
            if (progress < 1) {
                const animId = requestAnimationFrame(animate);
                this.activeAnimations.set(garmentModel, animId);
            } else {
                this.activeAnimations.delete(garmentModel);
                if (onComplete) onComplete();
            }
        };
        animate();
    }

    fadeOut(garmentModel, onComplete) {
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.config.duration, 1);

            garmentModel.traverse(child => {
                if (child.material) {
                    child.material.opacity = 1 - progress;
                }
            });
            if (progress < 1) {
                const animId = requestAnimationFrame(animate);
                this.activeAnimations.set(garmentModel, animId);
            } else {
                garmentModel.visible = false;
                this.activeAnimations.delete(garmentModel);
                if (onComplete) onComplete();
            }
        };
        animate();
    }

    scalePop(garmentModel, onComplete) {
        garmentModel.visible = true;
        garmentModel.scale.set(0, 0, 0);
        const targetScale = garmentModel.userData.originalScale || new THREE.Vector3(1, 1, 1);
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.config.duration, 1);

            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            const scale = eased * 1.1;
            garmentModel.scale.copy(targetScale).multiplyScalar(scale);

            if (progress < 1) {
                const animId = requestAnimationFrame(animate);
                this.activeAnimations.set(garmentModel, animId);
            } else {
                garmentModel.scale.copy(targetScale);
                this.activeAnimations.delete(garmentModel);
                if (onComplete) onComplete();
            }
        };
        animate();
    }

    gracefulAppear(garmentModel, onComplete) {
        garmentModel.visible = true;

        garmentModel.scale.set(0.8, 0.8, 0.8);
        garmentModel.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 0;
            }
        });

        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.config.duration, 1);

            const eased = 1 - Math.pow(1 - progress, 3);
            const scale = 0.8 + (0.2 * eased);

            garmentModel.scale.set(scale, scale, scale);
            garmentModel.traverse(child => {
                if (child.material) {
                    child.material.opacity = eased;
                }
            });

            if (progress < 1) {
                const animId = requestAnimationFrame(animate);
                this.activeAnimations.set(garmentModel, animId);
            } else {
                this.activeAnimations.delete(garmentModel);
                if (onComplete) onComplete();
            }
        };
        animate();
    }

    scaleDown(garmentModel, onComplete) {
        const startScale = garmentModel.scale.clone();
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.config.duration, 1);

            const scale = (1 - progress);
            garmentModel.scale.copy(startScale).multiplyScalar(scale);
            if (progress < 1) {
                const animId = requestAnimationFrame(animate);
                this.activeAnimations.set(garmentModel, animId);
            } else {
                garmentModel.visible = false;
                this.activeAnimations.delete(garmentModel);
                if (onComplete) onComplete();
            }
        };
        animate();
    }

    wireframeIn(garmentModel, onComplete) {
        garmentModel.visible = true;
        const originalMaterials = new Map();
        garmentModel.traverse(child => {
            if (child.material) {
                originalMaterials.set(child, child.material);
                child.material = child.material.clone();
                child.material.wireframe = true;
                child.material.opacity = 1;
            }
        });

        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.config.duration, 1);

            garmentModel.traverse(child => {
                if (child.material && originalMaterials.has(child)) {
                    if (progress > 0.7) {
                        const solidProgress = (progress - 0.7) / 0.3;
                        child.material.wireframe = solidProgress < 1;
                        if (solidProgress >= 1) {
                            child.material = originalMaterials.get(child);
                        }
                    }
                }
            });
            if (progress < 1) {
                const animId = requestAnimationFrame(animate);
                this.activeAnimations.set(garmentModel, animId);
            } else {
                this.activeAnimations.delete(garmentModel);
                if (onComplete) onComplete();
            }
        };
        animate();
    }

    particleDissolveIn(garmentModel, onComplete) {
        this.scalePop(garmentModel, onComplete);
    }

    particleDissolveOut(garmentModel, onComplete) {
        this.fadeOut(garmentModel, onComplete);
    }

    stopAnimation(garmentModel) {
        if (this.activeAnimations.has(garmentModel)) {
            cancelAnimationFrame(this.activeAnimations.get(garmentModel));
            this.activeAnimations.delete(garmentModel);
        }
    }

    cleanup() {
        this.activeAnimations.forEach(animId => cancelAnimationFrame(animId));
        this.activeAnimations.clear();
    }
}

export const garmentEffects = new GarmentEffectManager();
