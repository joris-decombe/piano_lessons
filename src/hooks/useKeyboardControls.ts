import { useEffect, useRef } from 'react';

interface KeyboardControlsProps {
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    currentTime: number;
    duration: number;
}

export function useKeyboardControls({
    onTogglePlay,
    onSeek,
    currentTime,
    duration,
}: KeyboardControlsProps) {
    const stateRef = useRef({ currentTime, duration });

    useEffect(() => {
        stateRef.current = { currentTime, duration };
    }, [currentTime, duration]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input or textarea
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                (e.target as HTMLElement).isContentEditable
            ) {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    onTogglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    const newTimeBack = Math.max(0, stateRef.current.currentTime - 5);
                    onSeek(newTimeBack);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    const newTimeFwd = Math.min(stateRef.current.duration, stateRef.current.currentTime + 5);
                    onSeek(newTimeFwd);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onTogglePlay, onSeek]);
}
