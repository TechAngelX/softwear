// src/components/PPModal.js

/**
 * Privacy policy modal component for initial consent.
 * Compact modal before full privacy policy display.
 *
 */
import React, { useEffect, useRef } from 'react';

const PPModal = ({ isOpen, onAccept, onClose, onShowFullPolicy }) => {
    const acceptRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        acceptRef.current?.focus();
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="privacy-modal-overlay" onClick={onClose}>
            <div
                className="privacy-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="privacy-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="privacy-modal-content">
                    <h2 id="privacy-modal-title">Privacy Notice</h2>
                    <p>
                        softWEAR uses your camera for real-time virtual try-on.
                        All processing happens locally on your device. We do not store,
                        record, or transmit any camera data or personal information.
                    </p>
                    <p>
                        By continuing, you consent to camera access for pose detection.
                        You can revoke this permission at any time through your browser settings.
                    </p>
                    <p>
                        <button
                            type="button"
                            className="privacy-link"
                            onClick={onShowFullPolicy}
                        >
                            Read our full Privacy Policy
                        </button>
                    </p>

                    <div className="privacy-modal-actions">
                        <button
                            type="button"
                            className="btn-privacy-close"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            ref={acceptRef}
                            className="btn-privacy-agree"
                            onClick={onAccept}
                        >
                            Accept & Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PPModal;
