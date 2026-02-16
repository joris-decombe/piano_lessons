import { useState, useEffect, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatTime } from "@/lib/utils";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { useTheme, THEMES, Theme } from "@/hooks/useTheme";
import { Timeline } from "./Timeline";

interface VisualSettings {
    splitHands: boolean;
    setSplitHands: (val: boolean) => void;
    splitStrategy: 'tracks' | 'point';
    setSplitStrategy: (val: 'tracks' | 'point') => void;
    splitPoint: number;
    setSplitPoint: (val: number) => void;
    showGrid: boolean;
    setShowGrid: (val: boolean) => void;
}

interface Song {
    id: string;
    title: string;
    artist: string;
    url?: string;
    abc?: string;
    type: 'midi' | 'abc' | 'musicxml';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface SongSettings {
    songs: Song[];
    currentSong: Song;
    onSelectSong: (song: Song) => void;
}

interface ControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    playbackRate: number;
    onSetPlaybackRate: (rate: number) => void;
    visualSettings: VisualSettings;
    songSettings?: SongSettings;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    onToggleLoop: () => void;
    onSetLoop: (start: number, end: number) => void;
}

export const Controls = memo(function Controls({
    isPlaying,
    onTogglePlay,
    currentTime,
    duration,
    onSeek,
    playbackRate,
    onSetPlaybackRate,
    visualSettings,
    songSettings,
    isLooping,
    loopStart,
    loopEnd,
    onToggleLoop,
    onSetLoop
}: ControlsProps) {

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSongMenuOpen, setIsSongMenuOpen] = useState(false);
    const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
    const isTouch = useTouchDevice();
    const { theme, setTheme } = useTheme();

    // Close settings on Escape key
    useEffect(() => {
        if (!isSettingsOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setIsSettingsOpen(false);
                setIsSongMenuOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [isSettingsOpen]);

    // Load persisted songs on mount
    useEffect(() => {
        if (!songSettings) return;

        try {
            const saved = localStorage.getItem('piano_lessons_uploads');
            if (saved) {
                const uploads: Song[] = JSON.parse(saved);
                const existingIds = new Set(songSettings.songs.map(s => s.id));
                const newUploads = uploads.filter(u => !existingIds.has(u.id));

                if (newUploads.length > 0) {
                    newUploads.forEach(s => songSettings.songs.push(s));
                }
            }
        } catch (e) {
            console.error("Failed to load saved songs", e);
        }
    }, [songSettings]);

    // Progress percentage
    const progressPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

    return (
        <div className="relative w-full">

            {/* Pixel Art Control Bar */}
            <div className={`relative w-full pixel-panel px-4 py-2 flex items-center justify-between gap-4 ${isTouch ? 'h-[72px] md:h-[80px]' : 'h-[56px] md:h-[64px]'}`}>

                {/* Timeline Area (Elevated when looping to avoid overlap) */}
                <div className={`absolute top-0 left-4 right-4 w-auto transition-none z-10 ${isLooping ? (isTouch ? '-mt-[32px]' : '-mt-[26px]') : '-mt-[10px]'}`}>
                    <Timeline
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={onSeek}
                        isLooping={isLooping}
                        loopStart={loopStart}
                        loopEnd={loopEnd}
                        onSetLoop={onSetLoop}
                    />
                </div>

                {/* Left: Song Info (Compact) */}
                <div className="flex-1 min-w-0 pr-2 flex items-center gap-3">
                    {songSettings && (
                        <div className="text-xs truncate max-w-[150px] md:max-w-[200px]">
                            <span className="font-semibold text-[var(--color-text)]" data-testid="current-song-title">{songSettings.currentSong.title}</span>
                            <span className="hidden md:inline text-[var(--color-muted)] mx-1">/</span>
                            <span className="hidden md:inline text-[var(--color-subtle)]">{songSettings.currentSong.artist}</span>
                        </div>
                    )}
                    <span className="text-[10px] font-mono text-[var(--color-muted)] w-8" data-testid="current-time">
                        {formatTime(currentTime)}
                    </span>
                </div>

                {/* Center: Play/Pause & Rewind */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleLoop}
                        aria-label="Toggle Loop"
                        title="Toggle loop"
                        className={`flex-shrink-0 flex items-center justify-center pixel-btn ${isLooping ? 'pixel-btn-primary' : ''} ${isTouch ? 'w-12 h-12' : 'w-10 h-10'}`}
                    >
                        <svg className={`${isTouch ? 'w-5 h-5' : 'w-4 h-4'} pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>

                    <button
                        onClick={() => {
                            onSeek(0);
                            if (isLooping) onToggleLoop();
                        }}
                        aria-label="Return to start"
                        title="Return to start (Home)"
                        className={`flex-shrink-0 flex items-center justify-center pixel-btn ${isTouch ? 'w-12 h-12' : 'w-8 h-8 md:w-10 md:h-10'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${isTouch ? 'w-5 h-5' : 'w-4 h-4 md:w-5 md:h-5'}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <button
                        onClick={onTogglePlay}
                        data-testid="play-button"
                        aria-label={isPlaying ? "Pause" : "Play"}
                        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                        className={`flex-shrink-0 flex items-center justify-center pixel-btn-primary ${isTouch ? 'w-16 h-16' : 'w-10 h-10 md:w-12 md:h-12'}`}
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${isTouch ? 'w-7 h-7' : 'w-5 h-5'}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${isTouch ? 'w-7 h-7' : 'w-5 h-5 ml-0.5'}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Right: Duration + Progress + Settings */}
                <div className="flex-1 flex justify-end items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-[var(--color-muted)] w-8 text-right" data-testid="duration">
                            {formatTime(duration)}
                        </span>
                        <span className="hidden md:inline text-[10px] font-mono text-[var(--color-accent-primary)]">
                            {progressPercent}%
                        </span>
                    </div>
                    {isSupported && (
                        <button
                            onClick={toggleFullscreen}
                            data-testid="fullscreen-button"
                            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                            className={`flex items-center justify-center pixel-btn ${isTouch ? 'w-12 h-12' : 'w-8 h-8'}`}
                        >
                            {isFullscreen ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        aria-label="Settings"
                        aria-expanded={isSettingsOpen}
                        title="Settings"
                        className={`flex items-center justify-center ${isSettingsOpen ? 'pixel-btn-primary' : 'pixel-btn'} ${isTouch ? 'w-12 h-12' : 'w-8 h-8'}`}
                    >
                        <svg className={`${isTouch ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
            </div>

            {/* Settings Popover - Pixel Art Style with animation */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute bottom-full right-0 mb-4 pixel-panel p-3 z-50 flex flex-col gap-3 ${isTouch ? 'w-[320px] max-h-[70vh] overflow-y-auto' : 'w-[280px]'}`}
                        >

                            {/* Song Selection */}
                            {songSettings && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Song</label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsSongMenuOpen(!isSongMenuOpen)}
                                            aria-label="Select song"
                                            aria-expanded={isSongMenuOpen}
                                            className={`w-full flex items-center justify-between pixel-inset text-sm text-[var(--color-text)] hover:text-[var(--color-text-bright)] ${isTouch ? 'p-3' : 'p-2'}`}
                                        >
                                            <span className="truncate">{songSettings.currentSong.title}</span>
                                            <svg className={`w-4 h-4 text-[var(--color-subtle)] transition-transform ${isSongMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        <AnimatePresence>
                                            {isSongMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    transition={{ duration: 0.1 }}
                                                    className="absolute bottom-full left-0 mb-2 w-full pixel-panel overflow-hidden max-h-[200px] overflow-y-auto"
                                                >
                                                    {songSettings.songs.map(song => (
                                                        <button
                                                            key={song.id}
                                                            onClick={() => {
                                                                songSettings.onSelectSong(song);
                                                                setIsSongMenuOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 text-xs ${isTouch ? 'py-3' : 'py-2'} ${song.id === songSettings.currentSong.id ? "bg-[var(--color-ui-active)] text-[var(--color-text-bright)]" : "text-[var(--color-subtle)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text)]"}`}
                                                        >
                                                            <div className="font-bold">{song.title}</div>
                                                            <div className="opacity-70 text-[10px]">{song.artist}</div>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            <div className="pixel-divider" />

                            {/* Speed Control */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
                                    <span>Speed</span>
                                    <span className="text-[var(--color-accent-primary)]">{playbackRate.toFixed(1)}x</span>
                                </div>
                                <div className="pixel-inset p-1">
                                    <input
                                        type="range"
                                        min={0.1}
                                        max={2.0}
                                        step={0.1}
                                        value={playbackRate}
                                        onChange={(e) => onSetPlaybackRate(parseFloat(e.target.value))}
                                        aria-label="Playback speed"
                                        className={`w-full cursor-pointer bg-transparent appearance-none accent-[var(--color-accent-primary)] touch-none ${isTouch ? 'h-6' : 'h-2'}`}
                                    />
                                </div>
                            </div>

                            <div className="pixel-divider" />

                            {/* Visual Settings */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Appearance</label>

                                <label className={`flex items-center justify-between cursor-pointer ${isTouch ? 'py-2' : 'py-1'}`}>
                                    <span className="text-sm text-[var(--color-text)]">Show Grid</span>
                                    <div className={`pixel-toggle ${visualSettings.showGrid ? 'pixel-toggle-on' : ''}`} role="switch" aria-checked={visualSettings.showGrid}>
                                        <input
                                            type="checkbox"
                                            checked={visualSettings.showGrid}
                                            onChange={(e) => visualSettings.setShowGrid(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className="pixel-toggle-thumb" />
                                    </div>
                                </label>

                                <label className={`flex items-center justify-between cursor-pointer ${isTouch ? 'py-2' : 'py-1'}`}>
                                    <span className="text-sm text-[var(--color-text)]">Split Hands</span>
                                    <div className={`pixel-toggle ${visualSettings.splitHands ? 'pixel-toggle-on' : ''}`} role="switch" aria-checked={visualSettings.splitHands}>
                                        <input
                                            type="checkbox"
                                            checked={visualSettings.splitHands}
                                            onChange={(e) => visualSettings.setSplitHands(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className="pixel-toggle-thumb" />
                                    </div>
                                </label>

                                {visualSettings.splitHands ? (
                                    <div className="space-y-2">
                                        {/* Strategy Selector */}
                                        <div className="pixel-inset p-2 space-y-2">
                                            <div className="text-[10px] uppercase font-bold text-[var(--color-muted)]">Method</div>
                                            <div className="flex gap-1">
                                                <button
                                                    className={`flex-1 text-xs ${isTouch ? 'py-2' : 'py-1'} ${visualSettings.splitStrategy === 'tracks' ? 'pixel-btn-primary' : 'pixel-btn'}`}
                                                    onClick={() => visualSettings.setSplitStrategy('tracks')}
                                                >
                                                    Tracks
                                                </button>
                                                <button
                                                    className={`flex-1 text-xs ${isTouch ? 'py-2' : 'py-1'} ${visualSettings.splitStrategy === 'point' ? 'pixel-btn-primary' : 'pixel-btn'}`}
                                                    onClick={() => visualSettings.setSplitStrategy('point')}
                                                >
                                                    Split Pt
                                                </button>
                                            </div>

                                            {/* Split Point Slider */}
                                            {visualSettings.splitStrategy === 'point' && (
                                                <div className="pt-1 space-y-1">
                                                    <div className="flex justify-between text-xs text-[var(--color-subtle)]">
                                                        <span>Note</span>
                                                        <span>C{Math.floor(visualSettings.splitPoint / 12) - 1}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={21}
                                                        max={108}
                                                        value={visualSettings.splitPoint}
                                                        onChange={(e) => visualSettings.setSplitPoint(parseInt(e.target.value))}
                                                        className={`w-full bg-transparent appearance-none accent-[var(--color-accent-primary)] ${isTouch ? 'h-6' : 'h-2'}`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="pixel-divider" />

                            {/* Theme Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Theme</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {THEMES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id as Theme)}
                                            className={`flex flex-col items-center text-[10px] px-1 ${isTouch ? 'py-3' : 'py-2'} ${theme === t.id ? 'pixel-btn-primary' : 'pixel-btn'}`}
                                            title={t.description}
                                        >
                                            <div className="flex gap-[2px] mb-1">
                                                {t.swatches.map((color, i) => (
                                                    <div key={i} className={`${isTouch ? 'w-3 h-3' : 'w-2 h-2'}`} style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.3)' }} />
                                                ))}
                                            </div>
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
});
