// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/styles.css';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.info('softWEAR SW registered, scope:', registration.scope);
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                            console.info('softWEAR updated — refresh for latest version');
                        }
                    });
                });
            })
            .catch((error) => {
                console.warn('softWEAR SW registration failed:', error);
            });
    });
}
