// src/views/GenderSelector.js

import React, { useEffect } from 'react';
import { useDeviceDetection } from '../utils/DeviceDetectionContext';
import { audioManager, initializeAudio } from '../utils/AudioManager';
import { useResponsiveText } from '../hooks/useResponsiveText';
const GenderSelector = ({ onSelectGender }) => {
    const { isMobileLayout, deviceInfo } = useDeviceDetection();
    const isMobile = useResponsiveText();
    const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'N/A';

    useEffect(() => {
        initializeAudio();
    }, []);

    if (isMobileLayout && !deviceInfo.isPortrait) {
        return (
            <div className="rotate-device-overlay">
                <div className="rotate-device-icon"></div>
                <p>Please rotate your device to portrait mode</p>
            </div>
        );
    }

    const handleGenderSelect = (gender) => {
        audioManager.playSound(gender === 'male' ? 'maleSelected' : 'femaleSelected');
        onSelectGender(gender);
    };

    const containerClass = `gender-selector ${isMobileLayout ? 'mobile-portrait' : 'desktop-landscape'}`;
    return (
        <div className={containerClass}>
            <div className="build-info">
                <span>Build Date: {buildDate}</span>
            </div>
            <div className="gender-selector-header">
                <h2 className="gender-selector-title">
                    {isMobile ? "Choose Your Model" : "Choose Your Model"}
                </h2>
                <p className="gender-selector-subtitle">
                    Select a model type to begin your virtual try-on experience
                </p>
            </div>

            <div className="gender-options">
                <button
                    className="gender-option male-option"
                    onClick={() => handleGenderSelect('male')}
                >
                    <div className="gender-card">
                        <div className="gender-icon-wrapper">
                            <div className="gender-icon male-icon">♂</div>
                            <div className="icon-glow male-glow"></div>
                        </div>
                        <div className="gender-content">
                            <h3 className="gender-title">Men's Collection</h3>
                            <p className="gender-description">
                                {isMobile ? "Men's clothing & accessories" : "Explore our range of men's clothing and accessories"}
                            </p>
                            <div className="gender-features">
                                <span className="feature-tag">T-shirts</span>
                                <span className="feature-tag">Jackets</span>
                                <span className="feature-tag">Accessories</span>
                            </div>
                        </div>
                        <div className="selection-indicator">
                            <span className="feature-tag">Select</span>
                        </div>
                    </div>
                </button>

                <button
                    className="gender-option female-option"
                    onClick={() => handleGenderSelect('female')}
                >
                    <div className="gender-card">
                        <div className="gender-icon-wrapper">
                            <div className="gender-icon female-icon">♀</div>
                            <div className="icon-glow female-glow"></div>
                        </div>
                        <div className="gender-content">
                            <h3 className="gender-title">Women's Collection</h3>
                            <p className="gender-description">
                                {isMobile ? "Women's fashion & style" : "Discover our selection of women's fashion and style"}
                            </p>
                            <div className="gender-features">
                                <span className="feature-tag">Dresses</span>
                                <span className="feature-tag">Jackets</span>
                                <span className="feature-tag">Tops</span>
                            </div>
                        </div>
                        <div className="selection-indicator">
                            <span className="feature-tag">Select</span>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default GenderSelector;
