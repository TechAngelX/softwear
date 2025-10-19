// src/views/PrivacyPolicy.js

/**
 * Privacy policy display component with full legal text.
 * Shows comprehensive privacy information and data handling practices.
 *
 * @component
 * @param {Function} onBack - Navigation callback to return to previous view
 */
import React from 'react';

const PrivacyPolicy = ({ onBack }) => {
    return (
        <div className="privacy-policy-page">
            <div className="privacy-policy-container">
                <header className="privacy-policy-header">
                    <button
                        className="back-btn"
                        onClick={onBack}
                    >
                        ← Back
                    </button>
                    <h1>softWEAR Privacy Policy</h1>
                    <p className="last-updated">Last updated: Sept 2025</p>
                </header>

                <div className="privacy-policy-content">
                    <section>
                        <h2>1. Information We Collect</h2>
                        <p>
                            softWEAR processes your body pose and movement data in real-time to provide
                            our Virtual Try-On service. This includes:
                        </p>
                        <ul>
                            <li>Body landmark coordinates from your camera feed</li>
                            <li>Pose estimation data for garment fitting</li>
                            <li>Movement tracking for real-time garment positioning</li>
                        </ul>
                    </section>

                    <section>
                        <h2>2. How We Use Your Information</h2>
                        <p>
                            Your pose and body tracking data is used exclusively to:
                        </p>
                        <ul>
                            <li>Position virtual garments accurately on your body</li>
                            <li>Fit clothing items to your body shape and movements</li>
                            <li>Provide real-time virtual try-on experiences</li>
                        </ul>
                        <p>
                            Additionally, you have the option to take a 'selfie' within the app. This feature
                            captures the combined camera feed and virtual garment for you to save
                            or share.
                        </p>
                    </section>

                    <section>
                        <h2>3. Data Storage and Retention</h2>
                        <p>
                            Your privacy is our priority. We do not store any personal data:
                        </p>
                        <ul>
                            <li>All pose tracking occurs locally on your device</li>
                            <li>No body measurement data is transmitted to our servers</li>
                            <li>Camera feed and pose data are processed in real-time only</li>
                            <li>No personal information is retained after your session ends</li>
                        </ul>
                        <p>
                            Selfie images you choose to create are not stored by softWEAR. They are saved
                            directly to your device's photo gallery or clipboard, and are not sent to any
                            servers.
                        </p>
                    </section>

                    <section>
                        <h2>4. Camera Access</h2>
                        <p>
                            softWEAR requires camera access to function. Your camera feed:
                        </p>
                        <ul>
                            <li>Remains on your device at all times</li>
                            <li>Is not recorded, saved, or transmitted</li>
                            <li>Is used only for real-time pose detection</li>
                            <li>Can be disabled at any time through your browser settings</li>
                        </ul>
                    </section>

                    <section>
                        <h2>5. Third-Party Services</h2>
                        <p>
                            softWEAR uses MediaPipe (Google) for pose detection. This processing
                            occurs locally on your device and does not transmit data to Google servers.
                        </p>
                    </section>

                    <section>
                        <h2>6. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul>
                            <li>Deny camera access (though this prevents app functionality)</li>
                            <li>Stop using the service at any time</li>
                            <li>Contact us with privacy-related questions</li>
                        </ul>
                    </section>

                    <section>
                        <h2>7. Contact Information</h2>
                        <p>
                            For questions about this Privacy Policy, please contact us at:
                            <br />
                            Email: angelricki@outlook.co.uk
                            <br />
                        </p>
                    </section>

                    <section>
                        <h2>8. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify users
                            of any material changes by updating the "Last updated" date at the top
                            of this policy.
                        </p>
                    </section>
                </div>

                <div className="privacy-policy-footer">
                    <button
                        className="btn-privacy-agree"onClick={onBack}
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
