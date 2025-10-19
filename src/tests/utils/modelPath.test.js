// src/tests/utils/modelPath.test.js
import { resolveModelPath } from '../../utils/modelPath';

describe('Model Path Resolution', () => {
    test('resolves correct path for male garments', () => {
        // expects a single garment object, not multiple strings.
        const garment = {
            id: 'basicTee',
            modelPath: './public/3dmodels/men/tshirts/basictee/basictee.glb'
        };
        const path = resolveModelPath(garment);
        expect(path).toBe('./public/3dmodels/men/tshirts/basictee/basictee.glb');
    });

    test('resolves correct path for female garments', () => {
        // same, but with female - expects a single garment object, not multiple strings.
        const garment = {
            id: 'summerDress',
            modelPath: './public/3dmodels/women/dresses/summerdress/summerdress.glb'
        };
        const path = resolveModelPath(garment);
        expect(path).toBe('./public/3dmodels/women/dresses/summerdress/summerdress.glb');
    });

    test('resolves to the mobile version when forced', () => {
        const garment = { modelPath: './public/3dmodels/men/jackets/puffer/puffer.glb' };
        // The second argument `forceMobile` is a boolean.
        const path = resolveModelPath(garment, true);
        expect(path).toBe('./public/3dmodels/men/jackets/puffer/puffer_mlb.glb');
    });

    test('handles unknown garments with fallback', () => {
        const garment = { modelPath: './public/3dmodels/test/test.glb' };
        const path = resolveModelPath(garment);
        expect(path).toBe('./public/3dmodels/test/test.glb');
    });

    test('returns null for missing garment object', () => {
        const path = resolveModelPath(null);
        expect(path).toBeNull();
    });
});
