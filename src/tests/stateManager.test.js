// src/tests/stateManager.test.js

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
    initialState,
    StateProvider,
    useStateManager,
    ACTIONS
} from '../stateManager';

// Mock localStorage
const localStorageMock = (function() {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        removeItem: jest.fn(key => {
            delete store[key];
        }),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Test component
const TestComponent = () => {
    const { state, dispatch, handlePrivacyAccept, handlePrivacyDecline } = useStateManager();
    return (
        <div>
            <div data-testid="privacy-accepted">{state.appState.privacyAccepted.toString()}</div>
            <div data-testid="show-privacy-modal">{state.appState.showPrivacyModal.toString()}</div>
            <div data-testid="privacy-consent-checked">{state.appState.privacyConsentChecked.toString()}</div>
            <div data-testid="show-splash">{state.appState.showSplash.toString()}</div>
            <div data-testid="selected-gender">{state.vtoState.selectedGender || 'null'}</div>
            <div data-testid="control-panel-open">{state.viewState.isControlPanelOpen.toString()}</div>
            <div data-testid="garment-menu">{JSON.stringify(state.data.garmentMenu)}</div>
            <button data-testid="accept-btn" onClick={handlePrivacyAccept}>Accept</button>
            <button data-testid="decline-btn" onClick={handlePrivacyDecline}>Decline</button>
            <button
                data-testid="set-app-state-btn"
                onClick={() => dispatch({ type: ACTIONS.SET_APP_STATE, payload: { showSplash: false } })}
            >
                Set App State
            </button>
            <button
                data-testid="set-vto-state-btn"
                onClick={() => dispatch({ type: ACTIONS.SET_VTO_STATE, payload: { selectedGender: 'male' } })}
            >
                Set VTO State
            </button>
            <button
                data-testid="set-view-state-btn"
                onClick={() => dispatch({ type: ACTIONS.SET_VIEW_STATE, payload: { isControlPanelOpen: true } })}
            >
                Set View State
            </button>
            <button
                data-testid="load-data-btn"
                onClick={() => dispatch({ type: ACTIONS.LOAD_DATA, payload: { garmentMenu: ['item1', 'item2'] } })}
            >
                Load Data
            </button>
        </div>
    );
};

describe('StateManager Integration Tests', () => {
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    test('should initialise with default state if no local storage consent', async () => {
        localStorageMock.getItem.mockReturnValue(null);

        render(
            <StateProvider>
                <TestComponent />
            </StateProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('privacy-consent-checked').textContent).toBe('true');
        });

        expect(localStorageMock.getItem).toHaveBeenCalledWith('softwear_privacy_consent');
        expect(screen.getByTestId('privacy-accepted').textContent).toBe('false');
        expect(screen.getByTestId('show-privacy-modal').textContent).toBe('true');
    });

    test('should initialise with accepted state if local storage consent exists', async () => {
        localStorageMock.getItem.mockReturnValue('true');

        render(
            <StateProvider>
                <TestComponent />
            </StateProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('privacy-consent-checked').textContent).toBe('true');
        });

        expect(localStorageMock.getItem).toHaveBeenCalledWith('softwear_privacy_consent');
        expect(screen.getByTestId('privacy-accepted').textContent).toBe('true');
        expect(screen.getByTestId('show-privacy-modal').textContent).toBe('false');
    });

    test('handlePrivacyAccept should update state and local storage', async () => {
        localStorageMock.getItem.mockReturnValue(null);

        render(
            <StateProvider>
                <TestComponent />
            </StateProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('show-privacy-modal').textContent).toBe('true');
        });

        fireEvent.click(screen.getByTestId('accept-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('privacy-accepted').textContent).toBe('true');
            expect(screen.getByTestId('show-privacy-modal').textContent).toBe('false');
        });

        expect(localStorageMock.setItem).toHaveBeenCalledWith('softwear_privacy_consent', 'true');
    });

    test('handlePrivacyDecline should update state and local storage', async () => {
        localStorageMock.getItem.mockReturnValue(null);

        render(
            <StateProvider>
                <TestComponent />
            </StateProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('show-privacy-modal').textContent).toBe('true');
        });

        fireEvent.click(screen.getByTestId('decline-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('privacy-accepted').textContent).toBe('false');
            expect(screen.getByTestId('show-privacy-modal').textContent).toBe('false');
        });

        expect(localStorageMock.setItem).toHaveBeenCalledWith('softwear_privacy_consent', 'false');
    });

    test('should allow dispatching app state actions', async () => {
        localStorageMock.getItem.mockReturnValue('true');

        render(
            <StateProvider>
                <TestComponent />
            </StateProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('show-splash').textContent).toBe('true');
        });

        fireEvent.click(screen.getByTestId('set-app-state-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('show-splash').textContent).toBe('false');
        });
    });

    test('should allow dispatching VTO state actions', async () => {
        localStorageMock.getItem.mockReturnValue('true');

        render(
            <StateProvider>
                <TestComponent />
            </StateProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('selected-gender').textContent).toBe('null');
        });

        fireEvent.click(screen.getByTestId('set-vto-state-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('selected-gender').textContent).toBe('male');
        });
    });

    test('should handle view state updates', async () => {
        localStorageMock.getItem.mockReturnValue('true');

        render(
            <StateProvider>
                <TestComponent />
            </StateProvider>
        );

        expect(screen.getByTestId('control-panel-open').textContent).toBe('false');

        fireEvent.click(screen.getByTestId('set-view-state-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('control-panel-open').textContent).toBe('true');
        });
    });

    test('should handle data loading actions', async () => {
        localStorageMock.getItem.mockReturnValue('true');

        render(
            <StateProvider>
                <TestComponent />
            </StateProvider>
        );

        expect(screen.getByTestId('garment-menu').textContent).toBe('null');

        fireEvent.click(screen.getByTestId('load-data-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('garment-menu').textContent).toBe('["item1","item2"]');
        });
    });
});
