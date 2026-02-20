// src/utils/modelPath.js

/**
 * Model path resolution utilities for 3D garment asset management.
 * Maps garment identifiers to their corresponding 3D model file paths.
 * Automatically selects mobile-optimized versions on mobile devices.
 *
 * Utilises Garment catalogue IDs (e.g., 'basicTee', 'aviatorSunglasses')
 * Fallback path resolution for unknown items
 *
 * @module modelPath
 */

/**
 * Resolves a garment object to its corresponding 3D model file path.
 * Automatically uses mobile-optimized versions (_mlb.glb) on mobile devices.
 * Falls back to placeholder if model not found.
 *
 * @param {Object} garment - Garment data object with a `modelPath` property.
 * @param {boolean} forceMobile - Force mobile version regardless of device detection.
 * @returns {string|null} Resolved file path to the 3D model or null if not found.
 */
export const resolveModelPath = (garment, forceMobile = false) => {
    if (!garment || !garment.modelPath) {
        console.warn('Garment object is missing, or does not have a modelPath property.', garment);
        return null;
    }

    const shouldUseMobile = forceMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);

    if (shouldUseMobile) {
        // Prefer explicit modelPathMobile from catalogue when available
        if (garment.modelPathMobile) {
            return garment.modelPathMobile;
        }
        // Fallback to convention-based _mob.glb replacement
        return garment.modelPath.replace('.glb', '_mob.glb');
    }

    return garment.modelPath;
};

/**
 * Resolves thumbnail path with placeholder fallback
 * @param {Object} garment - Garment data object
 * @returns {string} Path to thumbnail or placeholder
 */
export const resolveThumbnailPath = (garment) => {
    if (!garment) {
        return './images/placeholderTee.png';
    }

    if (garment.thumbnail) {
        return `./${garment.thumbnail}`;
    }

    return './images/placeholderTee.png';
};

/**
 * Checks if a model file exists at the given path
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} True if file exists
 */
export const checkModelExists = async (path) => {
    try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
};

/**
 * Resolves model path with fallback checking
 * @param {Object} garment - Garment data object
 * @param {boolean} forceMobile - Force mobile version
 * @returns {Promise<string|null>} Resolved path or null
 */
export const resolveModelPathWithFallback = async (garment, forceMobile = false) => {
    const primaryPath = resolveModelPath(garment, forceMobile);

    if (!primaryPath) return null;

    const exists = await checkModelExists(primaryPath);

    if (exists) {
        return primaryPath;
    }

    if (forceMobile) {
        const regularPath = resolveModelPath(garment, false);
        const regularExists = await checkModelExists(regularPath);
        if (regularExists) {
            console.warn(`Mobile version not found, falling back to regular: ${regularPath}`);
            return regularPath;
        }
    }

    console.warn(`Model not found: ${primaryPath}`);
    return null;
};
