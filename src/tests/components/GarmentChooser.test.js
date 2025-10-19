// src/tests/components/GarmentChooser.test.js

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GarmentChooser from '../../components/GarmentChooser';
import { resolveThumbnailPath } from '../../utils/modelPath';

jest.mock('../../utils/modelPath');

describe('GarmentChooser Component', () => {
    const mockGarments = [
        {
            category: 'T-Shirts',
            items: [
                { id: 'basicTee', name: 'Basic T-Shirt', thumbnail: 'path/to/tee.png' },
                { id: 'birkbeckTee', name: 'Birkbeck T-Shirt', thumbnail: 'path/to/birkbeck.png' },
            ],
        },
        {
            category: 'Jackets',
            items: [
                { id: 'pufferJacket', name: 'Puffer Jacket', thumbnail: 'path/to/puffer.png' },
            ],
        },
    ];

    const mockOnSelectGarment = jest.fn();
    const mockOnCategoryChange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        resolveThumbnailPath.mockReturnValue('mock/path/to/thumbnail.png');
    });

    describe('Overlay Layout', () => {
        test('renders correctly with initial props', () => {
            render(
                <GarmentChooser
                    garments={mockGarments}
                    selectedGarment="basicTee"
                    confirmedGarment=""
                    onSelectGarment={mockOnSelectGarment}
                    onCategoryChange={mockOnCategoryChange}
                    layout="overlay"
                    activeCategory={0}
                />
            );

            expect(screen.getByText('T-Shirts')).toBeInTheDocument();
            expect(screen.getByText('‹')).toBeInTheDocument();
            expect(screen.getByText('›')).toBeInTheDocument();
            expect(screen.getAllByRole('button', { name: /T-Shirt/i }).length).toBe(2);
        });

        test('calls onSelectGarment with the correct id when a garment is clicked', () => {
            render(
                <GarmentChooser
                    garments={mockGarments}
                    selectedGarment=""
                    confirmedGarment=""
                    onSelectGarment={mockOnSelectGarment}
                    onCategoryChange={mockOnCategoryChange}
                    layout="overlay"
                    activeCategory={0}
                />
            );

            const teeButton = screen.getByRole('button', { name: /Basic T-Shirt/i });
            fireEvent.click(teeButton);

            expect(mockOnSelectGarment).toHaveBeenCalledWith('basicTee');
        });

        test('calls onCategoryChange with the correct index when nav buttons are clicked', () => {
            render(
                <GarmentChooser
                    garments={mockGarments}
                    selectedGarment="basicTee"
                    confirmedGarment=""
                    onSelectGarment={mockOnSelectGarment}
                    onCategoryChange={mockOnCategoryChange}
                    layout="overlay"
                    activeCategory={0}
                />
            );

            const nextButton = screen.getByText('›');
            fireEvent.click(nextButton);

            expect(mockOnCategoryChange).toHaveBeenCalledWith(1);
        });

        test('applies correct classes for selected and confirmed garments', () => {
            render(
                <GarmentChooser
                    garments={mockGarments}
                    selectedGarment="basicTee"
                    confirmedGarment="birkbeckTee"
                    onSelectGarment={mockOnSelectGarment}
                    onCategoryChange={mockOnCategoryChange}
                    layout="overlay"
                    activeCategory={0}
                />
            );

            const selectedButton = screen.getByRole('button', { name: /Basic T-Shirt/i });
            const confirmedButton = screen.getByRole('button', { name: /Birkbeck T-Shirt/i });

            expect(selectedButton).toHaveClass('selected');
            expect(confirmedButton).toHaveClass('confirmed');
        });
    });

    describe('Sidebar Layout', () => {
        test('renders correctly with initial props', () => {
            render(
                <GarmentChooser
                    garments={mockGarments}
                    selectedGarment="basicTee"
                    confirmedGarment=""
                    onSelectGarment={mockOnSelectGarment}
                    onCategoryChange={mockOnCategoryChange}
                    layout="sidebar"
                    activeCategory={0}
                />
            );

            expect(screen.getByText('T-Shirts')).toBeInTheDocument();
            expect(screen.getByText('Jackets')).toBeInTheDocument();
            expect(screen.getByText('Basic T-Shirt')).toBeInTheDocument();
            expect(screen.getByText('Birkbeck T-Shirt')).toBeInTheDocument();
            expect(screen.queryByText('Puffer Jacket')).not.toBeInTheDocument();
        });

        test('calls onCategoryChange when a category pill is clicked', () => {
            render(
                <GarmentChooser
                    garments={mockGarments}
                    selectedGarment=""
                    confirmedGarment=""
                    onSelectGarment={mockOnSelectGarment}
                    onCategoryChange={mockOnCategoryChange}
                    layout="sidebar"
                    activeCategory={0}
                />
            );

            const jacketsPill = screen.getByRole('button', { name: 'Jackets' });
            fireEvent.click(jacketsPill);

            expect(mockOnCategoryChange).toHaveBeenCalledWith(1);
        });

        test('calls onSelectGarment when a garment button is clicked', () => {
            render(
                <GarmentChooser
                    garments={mockGarments}
                    selectedGarment=""
                    confirmedGarment=""
                    onSelectGarment={mockOnSelectGarment}
                    onCategoryChange={mockOnCategoryChange}
                    layout="sidebar"
                    activeCategory={0}
                />
            );

            const teeButton = screen.getByRole('button', { name: 'Basic T-Shirt' });
            fireEvent.click(teeButton);

            expect(mockOnSelectGarment).toHaveBeenCalledWith('basicTee');
        });

        test('applies correct classes for active category and selected garment', () => {
            render(
                <GarmentChooser
                    garments={mockGarments}
                    selectedGarment="pufferJacket"
                    confirmedGarment=""
                    onSelectGarment={mockOnSelectGarment}
                    onCategoryChange={mockOnCategoryChange}
                    layout="sidebar"
                    activeCategory={1}
                />
            );

            const activePill = screen.getByRole('button', { name: 'Jackets' });
            const selectedGarmentButton = screen.getByRole('button', { name: 'Puffer Jacket' });

            expect(activePill).toHaveClass('active');
            expect(selectedGarmentButton).toHaveClass('active');
        });
    });
});
