// src/tests/views/GenderSelector.test.js

/**
 * @fileoverview Unit tests for the GenderSelector component.
 * Mocks the device detection and audio manager to test component rendering and interactions.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GenderSelector from '../../views/GenderSelector';
import { useDeviceDetection } from '../../utils/DeviceDetectionContext';
import { audioManager } from '../../utils/AudioManager';

jest.mock('../../utils/DeviceDetectionContext');
jest.mock('../../utils/AudioManager');

describe('GenderSelector Component', () => {

    const mockOnSelectGender = jest.fn();
    const mockPlaySound = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        audioManager.playSound = mockPlaySound;
    });

    // Test Case 1: Desktop Layout
    test('should render desktop layout with correct titles and buttons', () => {
        // Mock a desktop environment
        useDeviceDetection.mockReturnValue({
            isMobileLayout: false,
            deviceInfo: {
                isPortrait: false,
            }
        });

        render(<GenderSelector onSelectGender={mockOnSelectGender} />);

        // Assert that the main title and subtitle are present
        expect(screen.getByText('Choose Your Model')).toBeInTheDocument();
        expect(screen.getByText('Select a model type to begin your virtual try-on experience')).toBeInTheDocument();

        const maleButton = screen.getByText('Men\'s Collection').closest('button');
        const femaleButton = screen.getByText('Women\'s Collection').closest('button');

        expect(maleButton).toBeInTheDocument();
        expect(femaleButton).toBeInTheDocument();

        expect(screen.getByText('♂')).toBeInTheDocument();
        expect(screen.getByText('♀')).toBeInTheDocument();
    });

    // Test Case 2: Mobile Portrait Layout
    test('should render mobile portrait layout correctly', () => {
        // Mock a mobile portrait environment
        useDeviceDetection.mockReturnValue({
            isMobileLayout: true,
            deviceInfo: {
                isPortrait: true,
            }
        });

        render(<GenderSelector onSelectGender={mockOnSelectGender} />);

        // Assert that the main content is rendered and not the rotate overlay
        expect(screen.getByText('Choose Your Model')).toBeInTheDocument();
        expect(screen.queryByText('Please rotate your device to portrait mode')).not.toBeInTheDocument();
    });

    // Test Case 3: Mobile Landscape Layout
    test('should render rotate device overlay in mobile landscape', () => {
        // Mock a mobile landscape environment
        useDeviceDetection.mockReturnValue({
            isMobileLayout: true,
            deviceInfo: {
                isPortrait: false,
            }
        });

        render(<GenderSelector onSelectGender={mockOnSelectGender} />);

        expect(screen.getByText('Please rotate your device to portrait mode')).toBeInTheDocument();
        expect(screen.queryByText('Choose Your Model')).not.toBeInTheDocument();
    });

    // Test Case 4: Male Button Click
    test('should call onSelectGender with "male" and play sound when male button is clicked', () => {
        // Mock a desktop environment
        useDeviceDetection.mockReturnValue({
            isMobileLayout: false,
            deviceInfo: { isPortrait: true }
        });

        render(<GenderSelector onSelectGender={mockOnSelectGender} />);

        const maleButton = screen.getByText('Men\'s Collection').closest('button');
        fireEvent.click(maleButton);

        expect(mockOnSelectGender).toHaveBeenCalledWith('male');
        expect(mockPlaySound).toHaveBeenCalledWith('maleSelected');
    });

    // Test Case 5: Female Button Click
    test('should call onSelectGender with "female" and play sound when female button is clicked', () => {
        // Mock a desktop environment
        useDeviceDetection.mockReturnValue({
            isMobileLayout: false,
            deviceInfo: { isPortrait: true }
        });

        render(<GenderSelector onSelectGender={mockOnSelectGender} />);

        const femaleButton = screen.getByText('Women\'s Collection').closest('button');
        fireEvent.click(femaleButton);

        expect(mockOnSelectGender).toHaveBeenCalledWith('female');
        expect(mockPlaySound).toHaveBeenCalledWith('femaleSelected');
    });
});
