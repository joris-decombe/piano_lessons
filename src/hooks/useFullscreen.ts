import { useState, useEffect, useCallback } from 'react';

interface FullscreenAPI {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
}

interface DocumentWithFullscreen extends Document {
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
}

export function useFullscreen() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Check if fullscreen API is supported
    const isSupported = useCallback(() => {
        const elem = document.documentElement as unknown as FullscreenAPI;
        const doc = document as DocumentWithFullscreen;
        return !!(
            document.fullscreenEnabled ||
            elem.webkitRequestFullscreen ||
            elem.mozRequestFullScreen ||
            elem.msRequestFullscreen ||
            doc.webkitExitFullscreen ||
            doc.mozCancelFullScreen ||
            doc.msExitFullscreen
        );
    }, []);

    // Get current fullscreen element (cross-browser)
    const getFullscreenElement = useCallback(() => {
        const doc = document as DocumentWithFullscreen;
        return (
            doc.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement
        );
    }, []);

    // Update state based on fullscreen status
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!getFullscreenElement());
        };

        // Listen to all vendor-prefixed fullscreen change events
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [getFullscreenElement]);

    // Enter fullscreen
    const enterFullscreen = useCallback(async () => {
        if (!isSupported()) {
            console.warn('Fullscreen API is not supported');
            return;
        }

        const elem = document.documentElement as unknown as FullscreenAPI;

        try {
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                await elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (error) {
            console.error('Error entering fullscreen:', error);
        }
    }, [isSupported]);

    // Exit fullscreen
    const exitFullscreen = useCallback(async () => {
        const doc = document as DocumentWithFullscreen;

        try {
            if (doc.exitFullscreen) {
                await doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
                await doc.webkitExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                await doc.mozCancelFullScreen();
            } else if (doc.msExitFullscreen) {
                await doc.msExitFullscreen();
            }
        } catch (error) {
            console.error('Error exiting fullscreen:', error);
        }
    }, []);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(async () => {
        if (isFullscreen) {
            await exitFullscreen();
        } else {
            await enterFullscreen();
        }
    }, [isFullscreen, enterFullscreen, exitFullscreen]);

    return {
        isFullscreen,
        toggleFullscreen,
        exitFullscreen,
        isSupported: isSupported(),
    };
}
