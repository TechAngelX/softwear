// src/hooks/glbHook.js
import { useState, useEffect } from 'react';

export const useGLBHook = (garmentUrl) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!garmentUrl) return;

        setIsLoading(true);

        // Dummy loading timeout
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [garmentUrl]);

    return { isLoading, error };
};
