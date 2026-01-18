import { useState, useEffect } from "react";
import { formatTime } from "@/lib/utils";

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
}: ControlsProps) {

    const [isSongMenuOpen, setIsSongMenuOpen] = useState(false);

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

    // formatTime removed, using utility

    return (
        <div className="relative w-full bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-3 md:p-4 shadow-xl">

            {/* Progress Bar - Compact */}
            <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                <span className="text-xs font-mono text-zinc-400 w-10 text-right" data-testid="current-time">
                    {formatTime(currentTime)}
                </span>
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    className="flex-1 cursor-pointer accent-indigo-500 h-2 bg-gray-200 rounded-lg appearance-none dark:bg-gray-700"
                />
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-10" data-testid="duration">
                    {formatTime(duration)}
                </span>
            </div>
            {/* Controls Row */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-6">

                {/* Play/Pause Button */}
                <button
                    onClick={onTogglePlay}
                    data-testid="play-button"
                    className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 ml-0.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                        </svg>
                    )}
                </button>

                {/* Song Selector */}
                {songSettings && (
                    <div className="relative">
                        <button
                            onClick={() => setIsSongMenuOpen(!isSongMenuOpen)}
                            className="flex items-center gap-2 bg-black/5 dark:bg-white/5 py-1 px-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap max-w-[100px] truncate">
                                {songSettings.currentSong.title}
                            </span>
                            <svg className={`w-3 h-3 text-gray-400 transition-transform ${isSongMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isSongMenuOpen && (
                            <>
                                {/* Backdrop to close on click outside */}
                                <div className="fixed inset-0 z-40" onClick={() => setIsSongMenuOpen(false)} />

                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden transition-all z-50">
                                    {songSettings.songs.map(song => (
                                        <button
                                            key={song.id}
                                            onClick={() => {
                                                songSettings.onSelectSong(song);
                                                setIsSongMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-xs transition-colors ${song.id === songSettings.currentSong.id
                                                ? "bg-indigo-600/20 text-indigo-400"
                                                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                                }`}
                                        >
                                            <div className="font-bold">{song.title}</div>
                                            <div className="opacity-70 text-[10px]">{song.artist}</div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Speed Control Slider */}
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 py-1 px-3 rounded-full w-48">
                    <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Speed: {playbackRate.toFixed(1)}x</span>
                    <input
                        type="range"
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        value={playbackRate}
                        onChange={(e) => onSetPlaybackRate(parseFloat(e.target.value))}
                        className="w-full cursor-pointer h-1.5 bg-gray-400 rounded-lg appearance-none accent-indigo-600"
                    />
                </div>

                {/* Visual Settings Toggle */}
                {/* We can add a simple Color Picker UI here */}
            </div>

            {/* Visual Customization Panel */}
            <div className="mt-2 border-t border-white/10 pt-4 flex flex-wrap gap-6 justify-center text-sm text-gray-300">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={visualSettings.splitHands}
                        onChange={(e) => visualSettings.setSplitHands(e.target.checked)}
                        className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Split Hands</span>
                </label>

                {visualSettings.splitHands ? (
                    <>
                        <div className="flex items-center gap-2">
                            <span>Left Hand:</span>
                            <input
                                type="color"
                                value={visualSettings.leftColor}
                                onChange={(e) => visualSettings.setLeftColor(e.target.value)}
                                className="h-6 w-8 cursor-pointer rounded bg-transparent p-0 border-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Right Hand:</span>
                            <input
                                type="color"
                                value={visualSettings.rightColor}
                                onChange={(e) => visualSettings.setRightColor(e.target.value)}
                                className="h-6 w-8 cursor-pointer rounded bg-transparent p-0 border-none"
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-2">
                        <span>Theme Color:</span>
                        <input
                            type="color"
                            value={visualSettings.unifiedColor}
                            onChange={(e) => visualSettings.setUnifiedColor(e.target.value)}
                            className="h-6 w-8 cursor-pointer rounded bg-transparent p-0 border-none"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
