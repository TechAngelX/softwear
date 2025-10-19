// src/tests/integration/ErrorPropagationIntegration.test.js

import { loadItemMenu, loadItemData, dataCache } from '../../utils/dataLoader';

global.fetch = jest.fn();

describe('Error Propagation Integration', () => {
    beforeEach(() => {
        fetch.mockClear();
        // Manually clear the cache to ensure each test is isolated
        dataCache.catalogue = null;
    });

    test('should handle network failure in data loading gracefully', async () => {
        fetch.mockRejectedValue(new Error('Network error'));
        const menuData = await loadItemMenu();
        expect(menuData).toEqual({});
        const itemData = await loadItemData();
        expect(itemData).toEqual({});
    });

    test('should handle malformed JSON data gracefully', async () => {
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.reject(new Error('Invalid JSON'))
        });
        const menuData = await loadItemMenu();
        expect(menuData).toEqual({});
    });

    test('should handle fetch timeout errors', async () => {
        fetch.mockRejectedValue(new Error('Request timeout'));
        const result = await loadItemData();
        expect(result).toEqual({});
    });

    test('should handle HTTP error responses', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 404,
            json: () => Promise.resolve({})
        });
        const result = await loadItemMenu();
        expect(result).toEqual({});
    });

    test('should handle multiple consecutive failures', async () => {
        fetch.mockRejectedValue(new Error('Network error'));
        const results = await Promise.all([
            loadItemMenu(),
            loadItemData(),
            loadItemMenu()
        ]);
        expect(results[0]).toEqual({});
        expect(results[1]).toEqual({});
        expect(results[2]).toEqual({});
    });

    test('should not crash on successful data after failures', async () => {
        // First call fails and shood returns an empty object
        fetch.mockRejectedValueOnce(new Error('Network error'));
        const failResult = await loadItemData();
        expect(failResult).toEqual({});

        //  clear  cache
        dataCache.catalogue = null;

        // Second call should succeed with mock data
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                items: { male: { tee: { name: 'T-Shirt' } } },
                categories: { male: [{ category: 'Tops' }] }
            })
        });

        const successResult = await loadItemData();
        expect(successResult).toEqual({ male: { tee: { name: 'T-Shirt' } } });
    });
});``
