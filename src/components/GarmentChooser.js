// components/GarmentChooser.js

/**
 * Interactive garment selection component supporting multiple layout modes.
 * Provides intuitive navigation through garment categories and individual items.
 *
 * Layout Modes:
 * - 'overlay': Floating controls over the VTO canvas
 * - 'sidebar': Traditional sidebar interface for desktop
 */
import React from 'react';
import { resolveThumbnailPath } from '../utils/modelPath';

const GarmentChooser = ({ garments, selectedGarment, confirmedGarment, onSelectGarment, onCategoryChange, layout = 'overlay', activeCategory, confirmedCategoryIndex }) => {

    const resolveImagePath = (garmentId) => {
        const garment = garments[activeCategory]?.items.find(item => item.id === garmentId);
        return resolveThumbnailPath(garment);
    }

    const handleImageError = (event) => {
        event.target.src = './images/placeholderTee.png';
    };

    if (layout === 'overlay') {
        const currentCategory = garments[activeCategory]?.category;
        const totalCategories = garments.length;

        const handlePrev = () => {
            const newIndex = (activeCategory - 1 + totalCategories) % totalCategories;
            onCategoryChange(newIndex);
        };

        const handleNext = () => {
            const newIndex = (activeCategory + 1) % totalCategories;
            onCategoryChange(newIndex);
        };

        const isConfirmed = confirmedCategoryIndex !== null;

        return (
            <div className="on-screen-garment-chooser">
                <div className={`garment-category-nav ${isConfirmed && confirmedCategoryIndex === activeCategory ? 'confirmed' : ''}`}>
                    <button onClick={handlePrev} className="category-arrow-btn">‹</button>
                    <span className="category-name-display">{currentCategory}</span>
                    <button onClick={handleNext} className="category-arrow-btn">›</button>
                </div>
                <div className="garment-items-container">
                    {garments[activeCategory] && garments[activeCategory].items.map((garment) => {
                        const isSelected = selectedGarment === garment.id;
                        const isConfirmed = confirmedGarment === garment.id;
                        let buttonClass = 'garment-icon-btn';
                        if (isSelected) buttonClass += ' selected';
                        if (isConfirmed) buttonClass += ' confirmed';

                        return (
                            <button
                                key={garment.id}
                                onClick={() => onSelectGarment(garment.id)}
                                className={buttonClass}
                                title={garment.name}
                            >
                                <img
                                    src={resolveImagePath(garment.id)}
                                    alt={garment.name}
                                    onError={handleImageError}
                                />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className='sidebar-garment-chooser'>
            <div className="category-pills">
                {garments.map((category, index) => (
                    <button
                        key={index}
                        onClick={() => onCategoryChange(index)}
                        className={`category-pill ${activeCategory === index ? 'active' : ''}`}
                    >
                        {category.category}
                    </button>
                ))}
            </div>
            <div className="garment-items-container">
                {garments[activeCategory] && garments[activeCategory].items.map((garment) => (
                    <button
                        key={garment.id}
                        onClick={() => onSelectGarment(garment.id)}
                        className={`sidebar-garment-btn ${selectedGarment === garment.id ? 'active' : ''}`}
                        title={garment.name}
                    >
                        {garment.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default GarmentChooser;
