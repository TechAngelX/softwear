// src/App.js

import React, { useState, useEffect } from 'react';
import { StateProvider, useStateManager, ACTIONS } from './stateManager';
import { DeviceDetectionProvider, useDeviceDetection } from './utils/DeviceDetectionContext';
import PPModal from './components/PPModal';
import PrivacyPolicy from './views/PrivacyPolicy';
import MainDisplay from './components/MainDisplay';
import SplashPage from './views/SplashPage';
import MobileView from './views/MobileView';
import GenderSelector from './views/GenderSelector';

function AppContent() {
    const { state, dispatch, handlePrivacyAccept, handlePrivacyDecline } = useStateManager();
    const [showSplash, setShowSplash] = useState(true);
    const { showPrivacyModal, showPrivacyPage, privacyAccepted, privacyConsentChecked, theme } = state.appState;
    const { selectedGender } = state.vtoState;
    const { isMobileLayout, deviceInfo } = useDeviceDetection();

    // Apply theme class to document root and persist to localStorage
    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light-mode');
        } else {
            document.documentElement.classList.remove('light-mode');
        }
        try {
            localStorage.setItem('softwear_theme', theme);
        } catch {
            // localStorage unavailable
        }
    }, [theme]);

    useEffect(() => {
        const splashShown = sessionStorage.getItem('softWearSplashShown');
        if (splashShown) {
            setShowSplash(false);
        }
    }, []);
    const handleSplashEnter = () => {
        sessionStorage.setItem('softWearSplashShown', 'true');
        setShowSplash(false);
    };
    const handleGoHome = () => {
        sessionStorage.removeItem('softWearSplashShown');
        setShowSplash(true);
    };
    const handlePrivacyAcceptLocal = () => {
        handlePrivacyAccept();
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGender: null } });
    };
    const handleShowFullPolicy = () => {
        dispatch({ type: ACTIONS.SET_APP_STATE, payload: { showPrivacyPage: true, showPrivacyModal: false } });
    };

    const handleBackFromPolicy = () => {
        dispatch({ type: ACTIONS.SET_APP_STATE, payload: { showPrivacyPage: false, showPrivacyModal: true } });
    };

    const handleFooterPrivacyClick = () => {
        dispatch({ type: ACTIONS.SET_APP_STATE, payload: { showPrivacyPage: true } });
    };

    const handleBackFromFooterPolicy = () => {
        dispatch({ type: ACTIONS.SET_APP_STATE, payload: { showPrivacyPage: false } });
    };

    const handleInitialGenderSelection = (gender) => {
        dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGender: gender } });
    };

    if (showSplash) {
        return <SplashPage onEnter={handleSplashEnter} />;
    }

    if (!privacyConsentChecked) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#000',
                color: 'white'
            }}>
                Loading...
            </div>
        );
    }

    if (showPrivacyPage) {
        return (
            <PrivacyPolicy
                onBack={showPrivacyModal ? handleBackFromPolicy : handleBackFromFooterPolicy}
            />
        );
    }

    if (!privacyAccepted) {
        return (
            <div className="app-container">
                <PPModal
                    isOpen={showPrivacyModal}
                    onAccept={handlePrivacyAcceptLocal}
                    onClose={handlePrivacyDecline}
                    onShowFullPolicy={handleShowFullPolicy}
                />
                <div className="privacy-required-message">
                    <p>To continue, please review and accept our privacy policy.</p>
                    <button
                        className="btn-privacy-agree"
                        onClick={() => dispatch({ type: ACTIONS.SET_APP_STATE, payload: { showPrivacyModal: true } })}
                    >
                        Review Privacy Policy
                    </button>
                </div>
            </div>
        );
    }

    if (!selectedGender) {
        return <GenderSelector onSelectGender={handleInitialGenderSelection} />;
    }

    if (isMobileLayout && !deviceInfo.isPortrait) {
        return (
            <div className="rotate-device-overlay">
                <div className="rotate-device-icon"></div>
                <p>Please rotate your device to portrait mode</p>
            </div>
        );
    }

    if (isMobileLayout) {
        return (
            <div className="app-container">
                <MobileView deviceInfo={deviceInfo} />
                <footer className="app-footer">
                    <p>© 2025 TechAngelX for Birkbeck, University of London</p>
                    <button
                        className="footer-privacy-link"
                        onClick={handleFooterPrivacyClick}
                    >
                        Privacy Policy
                    </button>
                </footer>
            </div>
        );
    }

    return (
        <div className="app-container">
            <MainDisplay onGoHome={handleGoHome} />
            <footer className="app-footer">
                <p>© 2025 TechAngelX for Birkbeck, University of London</p>
                <button
                    className="footer-privacy-link"
                    onClick={handleFooterPrivacyClick}
                >
                    Privacy Policy
                </button>
            </footer>
        </div>
    );
}

export default function App() {
    return (
        <StateProvider>
            <DeviceDetectionProvider>
                <AppContent />
            </DeviceDetectionProvider>
        </StateProvider>
    );
}
