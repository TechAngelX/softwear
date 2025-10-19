// src/utils/AudioManager.js

class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.globalVolume = 0.2;
    }

    async preloadSound(name, path, volume = null) {
        try {
            const audio = new Audio(path);
            audio.preload = 'auto';

            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', resolve, { once: true });
                audio.addEventListener('error', reject, { once: true });
                audio.load();
            });

            this.sounds.set(name, {
                audio: audio,
                individualVolume: volume || this.globalVolume
            });

            console.log(`Audio "${name}" preloaded successfully`);
        } catch (error) {
            console.warn(`Failed to preload audio "${name}":`, error);
        }
    }

    playSound(name) {
        const soundData = this.sounds.get(name);
        if (soundData) {
            const { audio, individualVolume } = soundData;

            audio.volume = individualVolume * this.globalVolume;
            audio.currentTime = 0;
            audio.play().catch(e => console.warn(`Error playing ${name}:`, e));
        } else {
            console.warn(`Sound "${name}" not found. Did you preload it?`);
        }
    }

    setVolume(name, volume) {
        const soundData = this.sounds.get(name);
        if (soundData) {
            soundData.individualVolume = Math.max(0, Math.min(1, volume));
        }
    }

    setGlobalVolume(volume) {
        this.globalVolume = Math.max(0, Math.min(1, volume));
    }
}

export const audioManager = new AudioManager();

export const initializeAudio = async () => {
    await Promise.all([
        audioManager.preloadSound('changeGarment', './audio/changGarment.mp3', 0.35),
        audioManager.preloadSound('changeCategory', './audio/changeCategory.mp3', 0.3),
        audioManager.preloadSound('maleSelected', './audio/maleSelected.mp3', 0.3),
        audioManager.preloadSound('femaleSelected', './audio/femaleSelected.mp3', 0.3),
        audioManager.preloadSound('cameraShutter', './audio/cameraShutter.mp3', 0.3)
    ]);
};
