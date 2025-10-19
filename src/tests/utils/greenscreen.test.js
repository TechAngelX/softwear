// src/tests/utils/greenscreen.test.js

import * as greenscreenModule from '../../vto/greenscreen';

// Mock the entire greenscreen module
jest.mock('../../vto/greenscreen', () => ({
    applySegmentation: jest.fn(),
    applySegmentationWithBackground: jest.fn()
}));

describe('Greenscreen Utilities', () => {
    const { applySegmentation, applySegmentationWithBackground } = greenscreenModule;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('applySegmentation', () => {
        test('should be called with correct parameters', () => {
            const mockContext = { canvas: { width: 640, height: 480 } };
            const mockResults = { segmentationMask: {}, image: {} };

            applySegmentation(mockContext, mockResults);

            expect(applySegmentation).toHaveBeenCalledWith(mockContext, mockResults);
            expect(applySegmentation).toHaveBeenCalledTimes(1);
        });

        test('should handle missing parameters', () => {
            applySegmentation(null, null);

            expect(applySegmentation).toHaveBeenCalledWith(null, null);
        });
    });

    describe('applySegmentationWithBackground', () => {
        test('should be called with background image', () => {
            const mockContext = { canvas: { width: 640, height: 480 } };
            const mockResults = { segmentationMask: {}, image: {} };
            const mockBackground = { width: 640, height: 480 };

            applySegmentationWithBackground(mockContext, mockResults, mockBackground);

            expect(applySegmentationWithBackground).toHaveBeenCalledWith(
                mockContext, mockResults, mockBackground
            );
        });

        test('should be called without background image', () => {
            const mockContext = { canvas: { width: 640, height: 480 } };
            const mockResults = { segmentationMask: {}, image: {} };

            applySegmentationWithBackground(mockContext, mockResults, null);

            expect(applySegmentationWithBackground).toHaveBeenCalledWith(
                mockContext, mockResults, null
            );
        });
    });
});
