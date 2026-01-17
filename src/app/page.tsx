"use client";

import { useState, useMemo } from "react";
import { usePianoAudio } from "@/hooks/usePianoAudio";
import { Keyboard } from "@/components/piano/Keyboard";
import { Waterfall } from "@/components/piano/Waterfall";
import { Controls } from "@/components/piano/Controls";

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const audio = usePianoAudio("/gnossienne1.mid");

  const [splitHands, setSplitHands] = useState(true);
  const [leftColor, setLeftColor] = useState("#fb7185"); // Rose default
  const [rightColor, setRightColor] = useState("#22d3ee"); // Cyan default
  const [unifiedColor, setUnifiedColor] = useState("#fbbf24"); // Gold default

  // Determine active notes for visual feedback on Keyboard
  // Note: Waterfall handles its own visual state based on time.
  // Keyboard needs to know which keys are currently *sounding*.
  // We can derive this from audio.midi + audio.currentTime

  const activeNotes = useMemo(() => {
    if (!audio.midi) return []; // Keep highlight on pause!

    // Find notes that overlap with currentTick
    const active: { note: string; color: string }[] = [];

    audio.midi.tracks.forEach((track, trackIndex) => {
      let trackColor;
      if (splitHands) {
        // Simple heuristic: Track 0 is usually Right, Track 1+ is Left/Other
        // Or cycle if more tracks?
        // User requested Left/Right customization. 
        // Assuming Track 0 = Right, Track 1 = Left for this MIDI.
        trackColor = trackIndex === 0 ? rightColor : leftColor;
      } else {
        trackColor = unifiedColor;
      }

      track.notes.forEach(note => {
        // Use TICKS for exact sync
        if (audio.currentTick >= note.ticks && audio.currentTick < note.ticks + note.durationTicks) {
          active.push({ note: note.name, color: trackColor });
        }
      });
    });
    return active;
  }, [audio.midi, audio.currentTick, audio.isPlaying, splitHands, leftColor, rightColor, unifiedColor]);


  if (!hasStarted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
        <button
          onClick={() => {
            setHasStarted(true);
            // Optionally auto-play here, but browser policy usually requires 'resume' context. 
            // The hook's togglePlay calls Tone.start() which is good.
          }}
          className="rounded-full bg-indigo-600 px-8 py-4 text-xl font-bold transition-transform hover:scale-105 active:scale-95"
        >
          Start Piano Lesson
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950 px-4 py-6 md:px-8">

      {/* Header / Title */}
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Gnossienne No. 1</h1>
        <div className="text-sm text-zinc-400">Erik Satie</div>
      </header>

      {/* Main Visual Area */}
      <main className="relative flex-1 min-h-0 w-full flex flex-col">

        {/* Waterfall Container */}
        <div className="flex-1 w-full max-w-[1200px] mx-auto bg-zinc-900/50 border-x border-zinc-800 relative ">
          <Waterfall
            midi={audio.midi}
            currentTime={audio.currentTime}
            currentTick={audio.currentTick} // Pass tick for rendering
            // windowSizeSeconds still used for what? 
            // Waterfall uses TICKS now internaly for window.
            // But we might want to keep it API compatible if needed?
            // Actually Waterfall ignores windowSizeSeconds if using Ticks internal logic.
            // But let's pass it anyway or clean up later.
            windowSizeSeconds={3 * (1 / audio.playbackRate)}
            // We need to pass color logic to Waterfall too? 
            // Waterfall currently calculates colors internally based on track index.
            // We should pass the color settings prop to Waterfall!
            // Check Waterfall props... it doesn't have it yet.
            // I will leave it using default colors for now and fix in next step?
            // Or better: update Waterfall props NOW.
            activeColors={{ split: splitHands, left: leftColor, right: rightColor, unified: unifiedColor }}
          />
          {/* Hit Line Separator */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.4)] z-40 pointer-events-none" />
        </div>

        {/* Keyboard Container */}
        <div className="w-full shrink-0 z-50">
          <Keyboard activeNotes={activeNotes} />
        </div>

      </main>

      {/* Controls Area */}
      <footer className="mt-6 w-full max-w-2xl mx-auto">
        <Controls
          isPlaying={audio.isPlaying}
          onTogglePlay={audio.togglePlay}
          currentTime={audio.currentTime}
          duration={audio.duration}
          onSeek={audio.seek}
          playbackRate={audio.playbackRate}
          onSetPlaybackRate={audio.setPlaybackRate}
          visualSettings={{
            splitHands, setSplitHands,
            leftColor, setLeftColor,
            rightColor, setRightColor,
            unifiedColor, setUnifiedColor
          }}
        />
      </footer>
    </div>
  );
}
