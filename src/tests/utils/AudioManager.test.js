// src/tests/utils/AudioManager.test.js

import { audioManager, initializeAudio } from '../../utils/AudioManager';

// Mock the global Audio class
global.Audio = jest.fn().mockImplementation(() => ({
    preload: 'auto',
    addEventListener: jest.fn((event, callback) => {
        if (event === 'canplaythrough') {
            callback();
        }
    }),
    load: jest.fn(),
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(),
    volume: 0,
    currentTime: 0,
}));

describe('AudioManager', () => {
    beforeEach(() => {
        audioManager.sounds.clear();
        jest.clearAllMocks();
    });

    test('should preload sounds and store them in the cache', async () => {
        await initializeAudio();
        expect(audioManager.sounds.size).toBe(5);
        expect(audioManager.sounds.has('changeGarment')).toBe(true);
        expect(audioManager.sounds.get('changeGarment').individualVolume).toBe(0.35);
        expect(Audio).toHaveBeenCalledTimes(5);
    });

    test('should play a preloaded sound', async () => {
        await audioManager.preloadSound('testSound', './audio/test.mp3');
        audioManager.playSound('testSound');
        const soundData = audioManager.sounds.get('testSound');
        expect(soundData.audio.play).toHaveBeenCalledTimes(1);
        expect(soundData.audio.currentTime).toBe(0);
    });

    test('should not crash when playing an un-preloaded sound', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        audioManager.playSound('nonExistentSound');
        expect(consoleWarnSpy).toHaveBeenCalledWith('Sound "nonExistentSound" not found. Did you preload it?');
    });

    test('should set and apply global volume', async () => {
        await audioManager.preloadSound('testSound', './audio/test.mp3');
        const initialVolume = audioManager.sounds.get('testSound').audio.volume;
        expect(initialVolume).toBe(0); // Should be 0 before setting global volume

        audioManager.setGlobalVolume(0.5);
        audioManager.playSound('testSound');

        const soundData = audioManager.sounds.get('testSound');
        expect(soundData.audio.volume).toBeCloseTo(0.5 * 0.2);  

        soundData.individualVolume = 1.0;
        audioManager.playSound('testSound');
        expect(soundData.audio.volume).toBeCloseTo(0.5 * 1.0);
    });

    test('should set and retrieve individual sound volume', async () => {
        await audioManager.preloadSound('testSound', './audio/test.mp3', 0.8);
        const soundData = audioManager.sounds.get('testSound');
        expect(soundData.individualVolume).toBe(0.8);

        audioManager.setVolume('testSound', 0.5);
        expect(soundData.individualVolume).toBe(0.5);
    });

    test('should handle preload errors gracefully', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        const originalAudio = global.Audio;

        global.Audio = jest.fn().mockImplementation(() => ({
            preload: 'auto',
            addEventListener: jest.fn((event, callback) => {
                if (event === 'error') {
                    // Simulate an error
                    callback(new Error('Mock error'));
                }
            }),
            load: jest.fn(),
        }));

        await audioManager.preloadSound('erroredSound', './audio/errored.mp3');

        expect(audioManager.sounds.has('erroredSound')).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Failed to preload audio "erroredSound":',
            expect.any(Object)
        );

        global.Audio = originalAudio;
    });
});
