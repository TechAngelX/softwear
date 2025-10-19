// src/tests/performance/SimplePerformance.test.js

import { VtoPoseEngine } from '../../vto/VtoPoseEngine';
import { loadItemData } from '../../utils/dataLoader';

describe('Performance Unit Tests', () => {
    test('VtoPoseEngine update performance', () => {
        const engine = new VtoPoseEngine();
        const mockLandmarks = Array(33).fill().map(() => ({
            x: 0.5, y: 0.5, z: 0, visibility: 0.8
        }));

        const startTime = performance.now();
        engine.update(mockLandmarks);
        const duration = performance.now() - startTime;

        expect(duration).toBeLessThan(5); // Example threshold in milliseconds
    });

    test('DataLoader fetch performance', async () => {
        // Mock the fetch call to prevent a real network request
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    items: {
                        male: {
                            basicTee: { name: 'Basic Tee' }
                        }
                    }
                }),
            })
        );

        const start = performance.now();
        await loadItemData();
        const duration = performance.now() - start;

        // The mock is synchronous, so the duration should be very small
        expect(duration).toBeLessThan(10);
        expect(global.fetch).toHaveBeenCalledWith('./data/itemCatalogue.json');
    });
});
