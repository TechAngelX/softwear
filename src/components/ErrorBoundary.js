// src/components/ErrorBoundary.js

import React from 'react';

/**
 * Top-level error boundary. Catches render/runtime errors in the React tree
 * and shows a recoverable fallback instead of a blank white screen.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('softWEAR encountered an error:', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="app-error-boundary" role="alert">
                    <h1>Something went wrong</h1>
                    <p>The virtual try-on hit an unexpected error. Reloading usually fixes it.</p>
                    <button type="button" className="app-error-reload" onClick={this.handleReload}>
                        Reload app
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
