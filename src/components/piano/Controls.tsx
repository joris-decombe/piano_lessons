import { useRef } from "react";

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

interface ControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    playbackRate: number;
    onSetPlaybackRate: (rate: number) => void;
    visualSettings: VisualSettings;
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
}: ControlsProps) {

    const progressBarRef = useRef<HTMLInputElement>(null);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex w-full flex-col gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-md dark:bg-black/20">

            {/* Progress Bar */}
            <div className="flex w-full items-center gap-2">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-10 text-right">
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
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-10">
                    {formatTime(duration)}
                </span>
            </div>

            <div className="flex items-center justify-between">
                {/* Play/Pause */}
                <button
                    onClick={onTogglePlay}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-500 active:scale-95"
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
