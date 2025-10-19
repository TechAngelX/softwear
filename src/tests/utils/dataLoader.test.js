// src/tests/utils/dataLoader.test.js

import { loadItemData, loadItemCatalogue } from '../../utils/dataLoader';
const dataLoaderModule = require('../../utils/dataLoader');

// Mock a  "global fetch" function
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            items: {
                male: {
                    basicTee: {
                        name: "NK Sport Raglan Basic",
                        price: "£27.99",
                        modelPath: "./3dmodels/men/tshirts/basictee/basictee.glb"
                    }
                },
                female: {
                    basicTee: {
                        name: "Basic T-Shirt",
                        price: "£19.99",
                        modelPath: "./3dmodels/women/tshirts/basictee/basictee.glb"
                    }
                }
            },
            categories: {}
        }),
    })
);

describe('dataLoader', () => {
    // Reset the internal cache before each test
    beforeEach(() => {
        dataLoaderModule.dataCache.catalogue = null;
        jest.clearAllMocks();
    });

    test('loadItemData fetches and returns the correct item data', async () => {
        const itemData = await loadItemData();

        // Check if fetch was called with the correct URL
        expect(global.fetch).toHaveBeenCalledWith('./data/itemCatalogue.json');

        // Check if the returned data structure matches the expected gendercategory/format
        expect(itemData).toHaveProperty('male');
        expect(itemData).toHaveProperty('female');

        // Verify that a specific item's' data is correct
        expect(itemData.male.basicTee.name).toBe('NK Sport Raglan Basic');
        expect(itemData.female.basicTee.price).toBe('£19.99');
    });

    test('loadItemData uses caching for subsequent calls', async () => {
        // First call should trigger a fetch
        await loadItemData();

        // Second call SHOULD not trigger another fetch due to caching
        await loadItemData();

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('loadItemData handles network errors gracefully', async () => {
        // THis should fail. Mock a failed fetch request
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 404,
            })
        );

        const itemData = await loadItemData();

        // The function should return an empty object on failure
        expect(itemData).toEqual({});
    });
});
