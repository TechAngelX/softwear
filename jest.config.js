// jest.config.js

module.exports = {
    testEnvironment: 'jsdom',

    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },


    transformIgnorePatterns: [
        "/node_modules/(?!(three|@mediapipe)/)"
    ],

     moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/tests/__mocks__/fileMock.js',
        '\\.(glb|gltf)$': '<rootDir>/src/tests/__mocks__/fileMock.js'
    },

    moduleFileExtensions: ['js', 'jsx'],

    testMatch: ['<rootDir>/src/**/*.test.js'],

    setupFilesAfterEnv: ['<rootDir>/src/testSetup.js'],
};
