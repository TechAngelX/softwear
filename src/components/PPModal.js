// src/components/PPModal.js

/**
 * Privacy policy modal component for initial consent.
 * Compact modal before full privacy policy display.
 *
 */
import React from 'react';

const PPModal = ({ isOpen, onAccept, onClose, onShowFullPolicy }) => {
    if (!isOpen) return null;

    return (
        <div className="privacy-modal-overlay">
            <div className="privacy-modal">
                <div className="privacy-modal-content">
                    <h2>Privacy Notice</h2>
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
                            className="privacy-link"
                            onClick={onShowFullPolicy}
                        >
                            Read our full Privacy Policy
                        </button>
                    </p>

                    <div className="privacy-modal-actions">
                        <button
                            className="btn-privacy-close"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
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
