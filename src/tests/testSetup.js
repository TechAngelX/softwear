// src/tests/testSetup.js

import '@testing-library/jest-dom';

global.fetch = jest.fn((url) => {
    return Promise.resolve({
        json: () => Promise.resolve({
            items: [
                { id: '1', name: 'Mock Garment' }
            ],
            categories: []
        }),
    });
});

Object.defineProperty(global, 'localStorage', {
    value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
    },
    writable: true,
});
