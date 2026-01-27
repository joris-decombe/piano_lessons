import { useState, useEffect } from "react";
import { formatTime } from "@/lib/utils";
import { useFullscreen } from "@/hooks/useFullscreen";
import { Timeline } from "./Timeline";

// ... (interfaces remain same)

// ... (interfaces remain same)

interface VisualSettings {
    splitHands: boolean;
    setSplitHands: (val: boolean) => void;
    leftColor: string;
    setLeftColor: (val: string) => void;
    rightColor: string;
    setRightColor: (val: string) => void;
    unifiedColor: string;
    setUnifiedColor: (val: string) => void;
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
    type: 'midi' | 'abc';
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

export function Controls({
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

    // Load persisted songs on mount
    useEffect(() => {
        if (!songSettings) return;

        try {
            const saved = localStorage.getItem('piano_lessons_uploads');
            if (saved) {
                const uploads: Song[] = JSON.parse(saved);
                // Filter out duplicates based on ID
                const existingIds = new Set(songSettings.songs.map(s => s.id));
                const newUploads = uploads.filter(u => !existingIds.has(u.id));

                if (newUploads.length > 0) {
                    // We need to mutate the songs array or have a way to set it.
                    // Since songs is passed as a prop, we ideally should have setSongs.
                    // For now, we push to the array if it's mutable, otherwise this won't trigger re-render
                    // A better approach would be lifting this state up, but given constraints:
                    newUploads.forEach(s => songSettings.songs.push(s));
                }
            }
        } catch (e) {
            console.error("Failed to load saved songs", e);
        }
    }, [songSettings]); // Load when settings are available

    return (
        <div className="relative w-full">

            {/* Minimalist Control Bar */}
            <div className="relative w-full bg-zinc-900/90 backdrop-blur-md rounded-full border border-zinc-700/50 px-4 py-2 shadow-xl flex items-center justify-between gap-4 h-[56px] md:h-[64px]">

                {/* Timeline Area (Elevated when looping to avoid overlap) */}
                <div className={`absolute top-0 left-4 right-4 w-auto transition-all duration-300 ease-out z-10 ${isLooping ? '-mt-[26px]' : '-mt-[10px]'}`}>
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
                        <div className="text-xs text-zinc-400 truncate max-w-[150px] md:max-w-[200px]">
                            <span className="font-semibold text-zinc-200" data-testid="current-song-title">{songSettings.currentSong.title}</span>
                            <span className="hidden md:inline text-zinc-500 mx-1">•</span>
                            <span className="hidden md:inline">{songSettings.currentSong.artist}</span>
                        </div>
                    )}
                    <span className="text-[10px] font-mono text-zinc-500 w-8" data-testid="current-time">
                        {formatTime(currentTime)}
                    </span>
                </div>

                {/* Center: Play/Pause */}
                {/* Center: Play/Pause & Rewind */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onToggleLoop}
                        aria-label="Toggle Loop"
                        className={`flex-shrink-0 flex items-center justify-center w-12 h-12 -mx-2 rounded-full transition-all active:scale-95 ${isLooping ? 'text-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-500/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    >
                        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>

                    <button
                        onClick={() => {
                            onSeek(0);
                            if (isLooping) onToggleLoop(); // Disable loop on reset
                        }}
                        aria-label="Return to start"
                        className="flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <button
                        onClick={onTogglePlay}
                        data-testid="play-button"
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className="flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6 ml-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Right: Settings Toggle */}
                <div className="flex-1 flex justify-end items-center gap-3 min-w-0">
                    <span className="text-[10px] font-mono text-zinc-500 w-8 text-right" data-testid="duration">
                        {formatTime(duration)}
                    </span>
                    {isSupported && (
                        <button
                            onClick={toggleFullscreen}
                            data-testid="fullscreen-button"
                            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                            className="p-2 rounded-full transition-colors text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                            {isFullscreen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        aria-label="Settings"
                        aria-expanded={isSettingsOpen}
                        className={`p-2 rounded-full transition-colors ${isSettingsOpen ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
            </div>

            {/* Settings Popover */}
            {isSettingsOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsSettingsOpen(false)} />
                    <div className="absolute bottom-full right-0 mb-4 w-[280px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-4">

                        {/* Song Selection */}
                        {songSettings && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Song</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsSongMenuOpen(!isSongMenuOpen)}
                                        aria-label="Select song"
                                        aria-expanded={isSongMenuOpen}
                                        className="w-full flex items-center justify-between bg-black/20 p-2 rounded-lg text-sm text-zinc-200 hover:bg-black/40 transition-colors"
                                    >
                                        <span className="truncate">{songSettings.currentSong.title}</span>
                                        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isSongMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {isSongMenuOpen && (
                                        <div className="absolute bottom-full left-0 mb-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden max-h-[200px] overflow-y-auto">
                                            {songSettings.songs.map(song => (
                                                <button
                                                    key={song.id}
                                                    onClick={() => {
                                                        songSettings.onSelectSong(song);
                                                        setIsSongMenuOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${song.id === songSettings.currentSong.id ? "bg-indigo-600/20 text-indigo-400" : "text-zinc-400 hover:bg-zinc-700 hover:text-white"}`}
                                                >
                                                    <div className="font-bold">{song.title}</div>
                                                    <div className="opacity-70 text-[10px]">{song.artist}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="h-[1px] bg-white/5 w-full" />

                        {/* Speed Control */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                <span>Speed</span>
                                <span className="text-indigo-400">{playbackRate.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min={0.1}
                                max={2.0}
                                step={0.1}
                                value={playbackRate}
                                onChange={(e) => onSetPlaybackRate(parseFloat(e.target.value))}
                                aria-label="Playback speed"
                                className="w-full cursor-pointer h-4 md:h-2 bg-zinc-700 rounded-lg appearance-none accent-indigo-600 touch-none"
                            />
                        </div>

                        <div className="h-[1px] bg-white/5 w-full" />

                        {/* Visual Settings */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Appearance</label>

                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Show Grid</span>
                                <input
                                    type="checkbox"
                                    checked={visualSettings.showGrid}
                                    onChange={(e) => visualSettings.setShowGrid(e.target.checked)}
                                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                                />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Split Hands</span>
                                <input
                                    type="checkbox"
                                    checked={visualSettings.splitHands}
                                    onChange={(e) => visualSettings.setSplitHands(e.target.checked)}
                                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                                />
                            </label>

                            {visualSettings.splitHands ? (
                                <div className="space-y-3">
                                    {/* Strategy Selector */}
                                    <div className="bg-black/20 p-2 rounded-lg space-y-2">
                                        <div className="text-[10px] uppercase font-bold text-zinc-500">Separation Method</div>
                                        <div className="flex bg-zinc-800 rounded-md p-0.5">
                                            <button
                                                className={`flex-1 text-xs py-1 rounded ${visualSettings.splitStrategy === 'tracks' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                                onClick={() => visualSettings.setSplitStrategy('tracks')}
                                            >
                                                Tracks
                                            </button>
                                            <button
                                                className={`flex-1 text-xs py-1 rounded ${visualSettings.splitStrategy === 'point' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                                onClick={() => visualSettings.setSplitStrategy('point')}
                                            >
                                                Split Point
                                            </button>
                                        </div>

                                        {/* Split Point Slider */}
                                        {visualSettings.splitStrategy === 'point' && (
                                            <div className="pt-1 space-y-1">
                                                <div className="flex justify-between text-xs text-zinc-400">
                                                    <span>Split Note</span>
                                                    <span>{visualSettings.splitPoint} (C{Math.floor(visualSettings.splitPoint / 12) - 1})</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={21}
                                                    max={108}
                                                    value={visualSettings.splitPoint}
                                                    onChange={(e) => visualSettings.setSplitPoint(parseInt(e.target.value))}
                                                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none accent-indigo-500"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                                            <div className="w-4 h-4 rounded-full border border-zinc-600 shadow-sm overflow-hidden flex-shrink-0">
                                                <input type="color" aria-label="Left hand color" value={visualSettings.leftColor} onChange={(e) => visualSettings.setLeftColor(e.target.value)} className="w-[150%] h-[150%] -m-[25%] p-0 cursor-pointer border-none" />
                                            </div>
                                            <span className="text-xs text-zinc-400">Left</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                                            <div className="w-4 h-4 rounded-full border border-zinc-600 shadow-sm overflow-hidden flex-shrink-0">
                                                <input type="color" aria-label="Right hand color" value={visualSettings.rightColor} onChange={(e) => visualSettings.setRightColor(e.target.value)} className="w-[150%] h-[150%] -m-[25%] p-0 cursor-pointer border-none" />
                                            </div>
                                            <span className="text-xs text-zinc-400">Right</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                                    <div className="w-4 h-4 rounded-full border border-zinc-600 shadow-sm overflow-hidden flex-shrink-0">
                                        <input type="color" aria-label="Unified color" value={visualSettings.unifiedColor} onChange={(e) => visualSettings.setUnifiedColor(e.target.value)} className="w-[150%] h-[150%] -m-[25%] p-0 cursor-pointer border-none" />
                                    </div>
                                    <span className="text-xs text-zinc-400">Unified Color</span>
                                </div>
                            )}
                        </div>

                    </div>
                </>
            )}

        </div>
    );
}
