// src/stateManager.js

import React, { createContext, useReducer, useContext, useEffect } from 'react';

const PRIVACY_CONSENT_KEY = 'softwear_privacy_consent';
const THEME_KEY = 'softwear_theme';

const getInitialTheme = () => {
    try {
        return localStorage.getItem(THEME_KEY) || 'dark';
    } catch {
        return 'dark';
    }
};

export const initialState = {
    appState: {
        showSplash: true,
        showPrivacyModal: false,
        showPrivacyPage: false,
        privacyAccepted: false,
        privacyConsentChecked: false,
        theme: getInitialTheme(),
    },
    vtoState: {
        selectedGender: null,
        selectedGarment: null,
        isSwitchingGender: false,
        isDetecting: true,
        showLandmarks: true,
        showGarment: true,
        bodyModelMode: 'off',
        physicsEnabled: true,
        selectedBackground: null,
        activeCategoryIndex: 0
    },
    viewState: {
        holisticInitialised: false,
        canvasDimensions: { width: 1280, height: 720 },
        poseLandmarks: null,
        faceLandmarks: null,
        rightHandLandmarks: null,
        leftHandLandmarks: null,
        isControlPanelOpen: false,
        gestureEnabled: true,
        detectionPaused: false,
        showDebug: false,
        selfieCountdown: null,
    },
    data: {
        garmentMenu: null,
        garmentData: null,
        boneData: null,
    }
};

export const ACTIONS = {
    SET_APP_STATE: 'SET_APP_STATE',
    SET_VTO_STATE: 'SET_VTO_STATE',
    SET_VIEW_STATE: 'SET_VIEW_STATE',
    LOAD_DATA: 'LOAD_DATA',
    CHECK_PRIVACY_CONSENT: 'CHECK_PRIVACY_CONSENT',
    ACCEPT_PRIVACY: 'ACCEPT_PRIVACY',
    SET_THEME: 'SET_THEME',
};

const appReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.SET_APP_STATE:
            return {
                ...state,
                appState: { ...state.appState, ...action.payload }
            };
        case ACTIONS.SET_VTO_STATE:
            return {
                ...state,
                vtoState: { ...state.vtoState, ...action.payload }
            };
        case ACTIONS.SET_VIEW_STATE:
            return {
                ...state,
                viewState: { ...state.viewState, ...action.payload }
            };
        case ACTIONS.LOAD_DATA:
            return {
                ...state,
                data: { ...state.data, ...action.payload }
            };
        case ACTIONS.CHECK_PRIVACY_CONSENT:
            const hasConsented = action.payload;
            return {
                ...state,
                appState: {
                    ...state.appState,
                    privacyConsentChecked: true,
                    privacyAccepted: hasConsented,
                    showPrivacyModal: !hasConsented
                }
            };
        case ACTIONS.ACCEPT_PRIVACY:
            return {
                ...state,
                appState: {
                    ...state.appState,
                    privacyAccepted: true,
                    showPrivacyModal: false
                }
            };
        case ACTIONS.SET_THEME:
            return {
                ...state,
                appState: {
                    ...state.appState,
                    theme: action.payload
                }
            };
        default:
            return state;
    }
};

const StateContext = createContext(initialState);

export function StateProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    useEffect(() => {
        if (!state.appState.privacyConsentChecked) {
            try {
                const consent = localStorage.getItem(PRIVACY_CONSENT_KEY);
                const hasConsented = consent === 'true';
                dispatch({ type: ACTIONS.CHECK_PRIVACY_CONSENT, payload: hasConsented });
            } catch (error) {
                console.warn('Unable to access localStorage for privacy consent');
                dispatch({ type: ACTIONS.CHECK_PRIVACY_CONSENT, payload: false });
            }
        }
    }, []);  

    const handlePrivacyAccept = () => {
        try {
            localStorage.setItem(PRIVACY_CONSENT_KEY, 'true');
        } catch (error) {
            console.warn('Unable to save privacy consent');
        }
        dispatch({ type: ACTIONS.ACCEPT_PRIVACY });
    };

    const handlePrivacyDecline = () => {
        try {
            localStorage.setItem(PRIVACY_CONSENT_KEY, 'false');
        } catch (error) {
            console.warn('Unable to save privacy consent');
        }
        dispatch({
            type: ACTIONS.SET_APP_STATE,
            payload: { showPrivacyModal: false, privacyAccepted: false }
        });
    };

    return (
        <StateContext.Provider value={{
            state,
            dispatch,
            handlePrivacyAccept,
            handlePrivacyDecline
        }}>
            {children}
        </StateContext.Provider>
    );
}

export function useStateManager() {
    return useContext(StateContext);
}
