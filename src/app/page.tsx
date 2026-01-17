"use client";

import { useState, useMemo } from "react";
import { usePianoAudio } from "@/hooks/usePianoAudio";
import { Keyboard } from "@/components/piano/Keyboard";
import { Waterfall } from "@/components/piano/Waterfall";
import { Controls } from "@/components/piano/Controls";

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);

  const BASE_PATH = '/piano_lessons';

  // Song Management
  // Song Management
  interface Song {
    id: string;
    title: string;
    artist: string;
    url?: string;
    abc?: string;
    type: 'midi' | 'abc';
  }

  const songs: Song[] = [
    { id: 'gnossienne1', title: 'Gnossienne No. 1', artist: 'Claude Debussy', url: `${BASE_PATH}/gnossienne1.mid`, type: 'midi' },
    { id: 'twinkle', title: 'Twinkle Twinkle Little Star', artist: 'Traditional (Clean Piano)', url: `${BASE_PATH}/twinkle.mid`, type: 'midi' },
    {
      id: 'ode_abc',
      title: 'Ode to Joy (ABC)',
      artist: 'Beethoven (Live Generated)',
      type: 'abc',
      abc: `T: Ode to Joy
M: 4/4
L: 1/4
Q: 1/4=120
K: C
E E F G | G F E D | C C D E | E3/2 D/2 D2 |
E E F G | G F E D | C C D E | D3/2 C/2 C2 |
D D E C | D E/2F/2 E C | D E/2F/2 E D | C D G,2 |
E E F G | G F E D | C C D E | D3/2 C/2 C2 |]`
    }
  ];
  const [currentSong, setCurrentSong] = useState<Song>(songs[0]);

  const audio = usePianoAudio(currentSong);

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
  }, [audio.midi, audio.currentTick, splitHands, leftColor, rightColor, unifiedColor]);


  if (!hasStarted) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-white p-8 relative overflow-hidden">
        {/* Background Ambient Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-zinc-950 pointer-events-none" />

        <h1 className="text-4xl md:text-6xl font-bold mb-2 z-10 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Piano Lessons</h1>
        <p className="text-zinc-400 mb-12 z-10 text-lg">Select a piece to begin practicing</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10 w-full max-w-4xl px-4">
          {songs.map((song) => (
            <button
              key={song.id}
              onClick={() => {
                setCurrentSong(song);
                setHasStarted(true);
              }}
              className="group relative flex flex-col items-start p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition-all hover:scale-[1.02] text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

              <h3 className="text-2xl font-bold text-zinc-100 mb-1">{song.title}</h3>
              <p className="text-zinc-400 font-medium">{song.artist}</p>

              <div className="mt-6 flex items-center text-indigo-400 text-sm font-bold group-hover:text-indigo-300">
                <span>Start Lesson</span>
                <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950 px-4 py-6 md:px-8 landscape:py-1 relative overflow-hidden">

      {/* Portrait Warning Overlay */}
      <div className="fixed inset-0 z-[100] hidden portrait:flex flex-col items-center justify-center bg-zinc-950/95 text-center p-8 backdrop-blur-sm">
        <div className="text-4xl mb-4">↻</div>
        <h2 className="text-2xl font-bold text-white mb-2">Please Rotate Your Device</h2>
        <p className="text-zinc-400">Piano Lessons works best in landscape mode.</p>
      </div>

      {/* Header / Title - Hidden in mobile landscape to save space */}
      <header className="mb-2 landscape:hidden flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-zinc-100">Gnossienne No. 1</h1>
        <div className="text-xs text-zinc-400">Claude Debussy</div>
      </header>

      {/* Main Visual Area */}
      <main className="relative flex-1 min-h-0 w-full flex flex-col">

        {/* Waterfall Container */}
        <div className="flex-1 w-full max-w-[1200px] mx-auto bg-zinc-900/50 border-x border-zinc-800 relative ">
          <Waterfall
            midi={audio.midi}
            currentTime={audio.currentTime}
            currentTick={audio.currentTick}
            windowSizeSeconds={3 * (1 / audio.playbackRate)}
            activeColors={{ split: splitHands, left: leftColor, right: rightColor, unified: unifiedColor }}
          />
          {/* Hit Line Separator */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.4)] z-40 pointer-events-none" />
        </div>

        {/* Keyboard Container */}
        <div className="w-full shrink-0 z-50 landscape:h-auto">
          <Keyboard activeNotes={activeNotes} />
        </div>

      </main>

      {/* Controls Area */}
      <footer className="mt-6 landscape:mt-1 w-full max-w-2xl mx-auto z-[60]">
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
          songSettings={{
            songs,
            currentSong,
            onSelectSong: setCurrentSong
          }}
        />
      </footer>
    </div>
  );
}
