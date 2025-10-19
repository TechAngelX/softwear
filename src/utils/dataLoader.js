// src/utils/dataLoader.js

/**
 * Data loading utilities for softWEAR garment catalogue and configuration data.
 * Provides caching and error handling for JSON data resources.
 * Implements client-side caching to prevent redundant network requests.
 *
 * @module dataLoader
 */

/**
 * In-memory cache for loaded data to prevent redundant requests.
 * Stores parsed JSON data for the application session.
 */
export const dataCache = {
    catalogue: null,
    boneData: null
};

/**
 * Loads the complete item catalogue containing garment details and pricing.
 * Includes garment metadata, pricing information, and material specifications.
 *
 * @async
 * @returns {Promise<Object>} Complete catalogue data with items and categories
 * @throws {Error} Network or parsing errors
 *
 * @example
 * const catalogue = await loadItemCatalogue();
 * const basicTee = catalogue.items.male.basicTee;
 * console.log(basicTee.price); // "£19.99"
 */
export const loadItemCatalogue = async () => {
    if (dataCache.catalogue) {
        return dataCache.catalogue;
    }

    try {
        const response = await fetch('./data/itemCatalogue.json');
        if (!response.ok) {
            throw new Error(`Failed to load catalogue: ${response.status}`);
        }

        const data = await response.json();
        dataCache.catalogue = data;
        return data;
    } catch (error) {
        console.error('Error loading catalogue data:', error);
        return { items: {}, categories: {} };
    }
};

/**
 * Loads SMPL-X skeletal bone configuration data for rigged garment animation.
 * Contains bone hierarchy, transformation data, and joint mappings.
 *
 * @async
 * @returns {Promise<Object|null>} SMPL-X bone data or null on error
 * @throws {Error} Network or parsing errors
 */
export const loadBoneData = async () => {
    if (dataCache.boneData) {
        return dataCache.boneData;
    }

    try {
        const response = await fetch('./data/smplx_M_bone_data.json');
        if (!response.ok) {
            throw new Error(`Failed to load bone data: ${response.status}`);
        }
        const data = await response.json();
        dataCache.boneData = data;
        return data;
    } catch (error) {
        console.error('Error loading bone data:', error);
        return null;
    }
};

/**
 * Extracts item data section from the catalogue.
 * Provides garment details, pricing, and specifications organised by gender.
 *
 * @async
 * @returns {Promise<Object>} Item data organised by gender and garment type
 *
 * @example
 * const items = await loadItemData();
 * const mensTshirts = Object.keys(items.male).filter(key => key.includes('Tee'));
 */
export const loadItemData = async () => {
    const catalogue = await loadItemCatalogue();
    return catalogue.items || {};
};

/**
 * Extracts menu structure from the catalogue for UI navigation.
 * Provides category organisation and thumbnail data for garment selection.
 *
 * @async
 * @returns {Promise<Object>} Menu categories organised by gender
 *
 * @example
 * const menu = await loadItemMenu();
 * const maleCategories = menu.male; // Array of category objects
 * console.log(maleCategories[0].category);
 * // "T-Shirts"
 */
export const loadItemMenu = async () => {
    const catalogue = await loadItemCatalogue();
    return catalogue.categories || {};
};
