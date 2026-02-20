"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePianoAudio } from "@/hooks/usePianoAudio";
import { Keyboard } from "@/components/piano/Keyboard";
import { Waterfall } from "@/components/piano/Waterfall";
import { Controls } from "@/components/piano/Controls";
import { useTheme, THEMES, Theme } from "@/hooks/useTheme";
import { MusicXMLParser } from "@/lib/musicxml/parser";
import { MIDIGenerator } from "@/lib/musicxml/midi-generator";
import { validateMusicXMLFile } from "@/lib/validation";
import { calculateKeyboardScale } from "@/lib/audio-logic";
import { getNoteColor } from "@/lib/note-colors";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ToastContainer, showToast } from "@/components/Toast";
import { EffectsCanvas, EffectsNote } from "@/components/piano/EffectsCanvas";
import { abcToMidiBuffer } from "@/lib/abc-loader";
import { playHoverSound, playSelectSound, warmUpAudio } from "@/lib/menu-sounds";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/piano_lessons';

// Song Management
interface Song {
  id: string;
  title: string;
  artist: string;
  url?: string;
  abc?: string;
  type: 'midi' | 'abc' | 'musicxml';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

// Progress tracking
interface ProgressData {
  [songId: string]: { lastPlayedAt: number };
}

function getProgress(): ProgressData {
  try {
    const raw = localStorage.getItem('piano_lessons_progress');
    return raw ? (JSON.parse(raw) as ProgressData) : {};
  } catch {
    return {};
  }
}

function setLastPlayed(songId: string) {
  try {
    const progress = getProgress();
    progress[songId] = { lastPlayedAt: Date.now() };
    localStorage.setItem('piano_lessons_progress', JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress', e);
  }
}

// Playback rate persistence
function getSavedPlaybackRate(): number {
  try {
    const raw = localStorage.getItem('piano_lessons_playback_rate');
    if (raw) {
      const rate = parseFloat(raw);
      if (isFinite(rate) && rate >= 0.1 && rate <= 2.0) return rate;
    }
  } catch { /* ignore */ }
  return 1;
}

function savePlaybackRate(rate: number) {
  try {
    localStorage.setItem('piano_lessons_playback_rate', String(rate));
  } catch { /* ignore */ }
}

// Per-song position persistence
function getSavedSongPosition(songId: string): number {
  try {
    const raw = localStorage.getItem('piano_lessons_song_position');
    if (raw) {
      const positions = JSON.parse(raw) as Record<string, number>;
      const tick = positions[songId];
      if (typeof tick === 'number' && tick >= 0) return tick;
    }
  } catch { /* ignore */ }
  return 0;
}

function saveSongPosition(songId: string, tick: number) {
  try {
    const raw = localStorage.getItem('piano_lessons_song_position');
    const positions: Record<string, number> = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    positions[songId] = tick;
    localStorage.setItem('piano_lessons_song_position', JSON.stringify(positions));
  } catch { /* ignore */ }
}

const defaultSongs: Song[] = [
  // Beginner
  { id: 'twinkle', title: 'Twinkle Twinkle Little Star', artist: 'Traditional (Clean Piano)', url: `${BASE_PATH}/twinkle.mid`, type: 'midi', difficulty: 'beginner' },
  { id: 'ode_to_joy', title: 'Ode to Joy', artist: 'Beethoven', url: `${BASE_PATH}/scores/ode_to_joy.xml`, type: 'musicxml', difficulty: 'beginner' },
  { id: 'minuet_in_g', title: 'Minuet in G Major', artist: 'J.S. Bach', url: `${BASE_PATH}/scores/minuet_in_g.xml`, type: 'musicxml', difficulty: 'beginner' },
  { id: 'fur_elise_easy', title: 'Für Elise (Easy)', artist: 'Beethoven', url: `${BASE_PATH}/scores/fur_elise_easy.xml`, type: 'musicxml', difficulty: 'beginner' },
  { id: 'prelude_c_major', title: 'Prelude in C Major', artist: 'J.S. Bach', url: `${BASE_PATH}/scores/prelude_c_major.xml`, type: 'musicxml', difficulty: 'beginner' },
  // Intermediate
  { id: 'gymnopedie_1', title: 'Gymnopédie No. 1', artist: 'Erik Satie', url: `${BASE_PATH}/scores/gymnopedie_1.xml`, type: 'musicxml', difficulty: 'intermediate' },
  { id: 'moonlight_sonata_1', title: 'Moonlight Sonata (1st mvt)', artist: 'Beethoven', url: `${BASE_PATH}/scores/moonlight_sonata_1.xml`, type: 'musicxml', difficulty: 'intermediate' },
  { id: 'maple_leaf_rag', title: 'Maple Leaf Rag', artist: 'Scott Joplin', url: `${BASE_PATH}/scores/maple_leaf_rag.xml`, type: 'musicxml', difficulty: 'intermediate' },
  { id: 'nocturne_op9_no2', title: 'Nocturne Op. 9 No. 2', artist: 'Chopin', url: `${BASE_PATH}/scores/nocturne_op9_no2.xml`, type: 'musicxml', difficulty: 'intermediate' },
  // Advanced
  { id: 'clair_de_lune', title: 'Clair de Lune', artist: 'Claude Debussy', url: `${BASE_PATH}/scores/clair_de_lune.xml`, type: 'musicxml', difficulty: 'advanced' },
  { id: 'arabesque_1', title: 'Arabesque No. 1', artist: 'Claude Debussy', url: `${BASE_PATH}/scores/arabesque_1.xml`, type: 'musicxml', difficulty: 'advanced' },
  { id: 'gnossienne1', title: 'Gnossienne No. 1', artist: 'Erik Satie', url: `${BASE_PATH}/gnossienne1.mid`, type: 'midi', difficulty: 'advanced' },
];

function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60">
      <div className="pixel-panel p-6 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 pixel-text-muted hover:pixel-text-accent">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold text-[var(--color-text-bright)] mb-4 uppercase tracking-tighter">About MusicXML</h3>
        <div className="space-y-3 text-sm text-[var(--color-text)]">
          <p>MusicXML is a standard digital sheet music format that can be exported from most notation software.</p>
          <p><strong className="pixel-text-accent">Where to find .musicxml files:</strong></p>
          <ul className="list-disc pl-5 space-y-1 pixel-text-subtle">
            <li><a href="https://musescore.com" target="_blank" rel="noopener noreferrer" className="hover:pixel-text-accent underline decoration-dotted">MuseScore</a> (Export as MusicXML)</li>
            <li><a href="https://imslp.org" target="_blank" rel="noopener noreferrer" className="hover:pixel-text-accent underline decoration-dotted">IMSLP</a> (Petrucci Music Library)</li>
            <li><a href="https://openscore.cc" target="_blank" rel="noopener noreferrer" className="hover:pixel-text-accent underline decoration-dotted">OpenScore</a></li>
          </ul>
          <div className="p-3 pixel-inset mt-4">
            <p className="text-xs pixel-text-muted"><strong>Note:</strong> We convert MusicXML to MIDI on our secure server. Your files are processed privately and not shared.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PianoLessonProps {
  song: Song;
  allSongs: Song[];
  onSongChange: (song: Song) => void;
  onExit: () => void;
}

function PianoLesson({ song, allSongs, onSongChange, onExit }: PianoLessonProps) {
  const [waterfallHeight, setWaterfallHeight] = useState(0);
  const waterfallContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerPxHeight, setContainerPxHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const stableOnExit = useCallback(() => onExit(), [onExit]);

  // Restore persisted playback rate and song position
  const [savedRate] = useState(() => getSavedPlaybackRate());
  const [savedTick] = useState(() => getSavedSongPosition(song.id));
  const currentTickRef = useRef(0);

  // Track unified container size: width → scale, height → pixel-based compensation (avoids % quirks on iOS Safari)
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setScale(calculateKeyboardScale(entries[0].contentRect.width));
      setContainerPxHeight(entries[0].contentRect.height);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Track height for constant-speed waterfall
  useEffect(() => {
    if (!waterfallContainerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setWaterfallHeight(entries[0].contentRect.height);
    });
    obs.observe(waterfallContainerRef.current);
    return () => obs.disconnect();
  }, []);

  // Dynamic LookAhead calculation based on Height (Constant Speed)
  // Target: 180px per second. User can override via settings.
  const [lookAheadOverride, setLookAheadOverride] = useState<number | null>(null);
  const autoLookAheadTime = useMemo(() => {
    if (waterfallHeight > 0) {
      return Math.max(0.8, Math.min(4.0, waterfallHeight / 180));
    }
    return 1.5;
  }, [waterfallHeight]);
  const lookAheadTime = lookAheadOverride ?? autoLookAheadTime;

  const audio = usePianoAudio(song, { lookAheadTime, initialPlaybackRate: savedRate, initialTick: savedTick });

  // Persist playback rate on change
  useEffect(() => {
    savePlaybackRate(audio.playbackRate);
  }, [audio.playbackRate]);

  // Track currentTick in ref and persist on unmount
  useEffect(() => {
    currentTickRef.current = audio.currentTick;
  }, [audio.currentTick]);

  useEffect(() => {
    const songId = song.id;
    return () => {
      saveSongPosition(songId, currentTickRef.current);
    };
  }, [song.id]);

  // Keyboard shortcuts: Space=play/pause, arrows=seek, Escape=back
  useKeyboardShortcuts({
    onTogglePlay: audio.togglePlay,
    onSeek: audio.seek,
    onExit: stableOnExit,
    currentTime: audio.currentTime,
    duration: audio.duration,
    isPlaying: audio.isPlaying,
  });

  const [splitHands, setSplitHands] = useState(true);
  const [splitStrategy, setSplitStrategy] = useState<'tracks' | 'point'>('tracks');
  const [splitPoint, setSplitPoint] = useState(60); // Middle C (C4)
  const [showGrid, setShowGrid] = useState(true);

  // Auto-detect strategy on song load
  useEffect(() => {
    if (audio.midi) {
      const target = audio.midi.tracks.length <= 1 ? 'point' : 'tracks';
      setTimeout(() => setSplitStrategy(prev => prev === target ? prev : target), 0);
    }
  }, [audio.midi]);

  // Combine Active notes for visualization
  const coloredKeys = useMemo(() => {
    const colors = {
      split: splitHands,
      left: "var(--color-note-left)",
      right: "var(--color-note-right)",
      unified: "var(--color-note-unified)"
    };
    const splitSettings = { strategy: splitStrategy, splitPoint };

    return audio.activeNotes.map(activeNote => {
      const midiNumber = Tone.Frequency(activeNote.note).toMidi();
      const trackColor = getNoteColor(activeNote.track, midiNumber, colors, splitSettings);
      return { note: activeNote.note, color: trackColor, startTick: activeNote.startTick };
    });
  }, [audio.activeNotes, splitHands, splitStrategy, splitPoint]);

  // Effects canvas data: active notes with MIDI numbers for key positioning
  const effectsNotes: EffectsNote[] = useMemo(() => {
    return coloredKeys.map(ck => ({
      note: ck.note,
      midi: Tone.Frequency(ck.note).toMidi(),
      color: ck.color,
      startTick: ck.startTick,
    }));
  }, [coloredKeys]);

  // Memoize settings objects to prevent Controls re-renders
  const visualSettings = useMemo(() => ({
    splitHands, setSplitHands,
    splitStrategy, setSplitStrategy,
    splitPoint, setSplitPoint,
    showGrid, setShowGrid
  }), [splitHands, splitStrategy, splitPoint, showGrid]);

  const songSettingsMemo = useMemo(() => ({
    songs: allSongs,
    currentSong: song,
    onSelectSong: onSongChange
  }), [allSongs, song, onSongChange]);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--color-void)] px-[env(safe-area-inset-left,0px)] py-6 md:px-8 landscape:pt-1 landscape:pb-[env(safe-area-inset-bottom)] relative overflow-hidden crt-effect noise-texture" data-theme={theme}>
      {/* Vignette overlay — cinematic edge darkening */}
      <div className="vignette-overlay" aria-hidden="true" />

      {/* Portrait Warning */}
      <div className="fixed inset-0 z-[100] hidden portrait:flex flex-col items-center justify-center bg-[var(--color-void)]/95 text-center p-8">
        <div className="text-4xl mb-4">↻</div>
        <h2 className="text-2xl font-bold text-[var(--color-text-bright)] mb-2 uppercase tracking-tighter">Please Rotate Your Device</h2>
        <p className="pixel-text-muted">Piano Lessons works best in landscape mode.</p>
      </div>

      <button
        onClick={onExit}
        className="absolute top-4 left-[calc(1rem+env(safe-area-inset-left))] z-50 px-3 py-2 pixel-btn-primary hover:scale-105 group flex items-center gap-2"
        aria-label="Return to Song List"
        title="Back to songs (Esc)"
      >
        <svg className="w-4 h-4 transform transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="hidden md:inline text-xs font-bold uppercase tracking-tight landscape:hidden">Songs</span>
      </button>

      {/* Header / Title - Hidden in mobile landscape to save space */}
      <header className="mb-2 landscape:hidden flex items-center justify-between shrink-0 pl-16">
        <h1 className="text-xl font-bold text-[var(--color-text-bright)]">{song.title}</h1>
        <div className="text-xs pixel-text-muted">{song.artist}</div>
      </header>

      {/* Main Visual Area */}
      <main className="relative flex-1 min-h-0 w-full flex flex-col bg-[var(--color-void)]">

        {/* Unified Container */}
        <div ref={containerRef} className="flex-1 w-full overflow-hidden relative" style={{ scrollbarWidth: 'none' }}>

          {/* Centered Content Wrapper — 1296px Base Width for symmetric scaling */}
          <div
            className="mx-auto flex flex-col items-center relative transition-transform duration-300 ease-out origin-top-left"
            style={{
              width: '1296px', // Match BASE_PIANO_WIDTH scaling logic
              height: scale < 1 && containerPxHeight > 0 ? `${containerPxHeight / scale}px` : '100%',
              transform: `scale(${scale})`,
            }}
          >

            {/* Action Area: Waterfall flows BEHIND Keyboard */}
            {/* Use Flexbox to center the 1248px content within the 1296px container */}
            <div className="relative flex-1 flex flex-col min-h-0 items-center w-full">

              {/* 1. Waterfall Layer (z-40) - Interleaves between Nameboard (z-30) and Reflections (z-60) */}
              <div
                ref={waterfallContainerRef}
                data-testid="waterfall-container"
                className="absolute top-0 z-40 pointer-events-none"
                style={{
                  width: '1248px', // Exact content width
                  bottom: 'var(--spacing-key-h)',
                  '--playback-rate': audio.playbackRate
                } as React.CSSProperties}
              >
                <div className="waterfall-atmosphere" aria-hidden="true" />
                <Waterfall
                  midi={audio.midi}
                  currentTick={audio.currentTick}
                  isPlaying={audio.isPlaying}
                  playbackRate={audio.playbackRate}
                  activeColors={{
                    split: splitHands,
                    left: "var(--color-note-left)",
                    right: "var(--color-note-right)",
                    unified: "var(--color-note-unified)"
                  }}
                  lookAheadTicks={audio.lookAheadTicks}
                  showGrid={showGrid}
                  containerHeight={waterfallHeight}
                />
              </div>

              {/* 1b. Effects Canvas Overlay - Particles, glow, trails */}
              {/* Shares waterfall bounds so it never covers the keyboard */}
              <div
                className="absolute top-0 z-[42] pointer-events-none"
                style={{
                  width: '1248px',
                  bottom: 'var(--spacing-key-h)'
                }}
              >
                <EffectsCanvas
                  activeNotes={effectsNotes}
                  containerHeight={waterfallHeight}
                  theme={theme}
                  isPlaying={audio.isPlaying}
                />
              </div>

              {/* 2. Layout Spacer (Pushes Keyboard to bottom) */}
              <div className="flex-1" />

              {/* 3. Keyboard Layer - z-50 to render above waterfall and effects */}
              <div className="relative shrink-0 z-50" style={{ width: '1248px' }}>
                <Keyboard keys={coloredKeys} />
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Controls Area */}
      <footer className="mt-6 landscape:mt-8 w-full max-w-2xl mx-auto z-[60]">
        <Controls
          isPlaying={audio.isPlaying}
          onTogglePlay={audio.togglePlay}
          currentTime={audio.currentTime}
          duration={audio.duration}
          onSeek={audio.seek}
          playbackRate={audio.playbackRate}
          onSetPlaybackRate={audio.setPlaybackRate}
          lookAheadTime={lookAheadTime}
          minLookAheadTime={autoLookAheadTime}
          onSetLookAheadTime={setLookAheadOverride}
          visualSettings={visualSettings}
          songSettings={songSettingsMemo}
          isLooping={audio.isLooping}
          loopStart={audio.loopStart}
          loopEnd={audio.loopEnd}
          onToggleLoop={audio.toggleLoop}
          onSetLoop={audio.setLoop}
        />
      </footer>
      <HelpModal isOpen={false} onClose={() => { }} />

      {/* Loading overlay — covers blank piano while audio/MIDI initializes */}
      <AnimatePresence>
        {!audio.isLoaded && (
          <motion.div
            key="piano-loading"
            className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-[var(--color-void)]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center space-y-3 px-6 max-w-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-accent-primary)] animate-pulse">
                Now Loading
              </p>
              <h2 className="text-xl font-bold text-[var(--color-text-bright)] uppercase tracking-tighter leading-tight">
                {song.title}
              </h2>
              <p className="text-xs pixel-text-muted">{song.artist}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <div className="w-1.5 h-1.5 bg-[var(--color-accent-primary)] animate-pulse" />
                <div className="w-1.5 h-1.5 bg-[var(--color-accent-primary)] animate-pulse [animation-delay:200ms]" />
                <div className="w-1.5 h-1.5 bg-[var(--color-accent-primary)] animate-pulse [animation-delay:400ms]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}

export default function Home() {
  const [allSongs, setAllSongs] = useState<Song[]>(defaultSongs);
  const [currentSong, setCurrentSong] = useState<Song>(defaultSongs[0]);

  const [hasStarted, setHasStarted] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showPWAHint, setShowPWAHint] = useState(false);
  const [showSilentModeHint, setShowSilentModeHint] = useState(false);
  const [lastPlayedSongId, setLastPlayedSongId] = useState<string | null>(null);
  const [isFirstTimer, setIsFirstTimer] = useState(true);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'uploads'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'artist' | 'difficulty' | 'duration'>('default');
  const { theme, setTheme } = useTheme();

  // Load persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('piano_lessons_uploads');
      if (saved) {
        const uploadedSongs = JSON.parse(saved) as Song[];
        // Deduplicate
        const defaultIds = new Set(defaultSongs.map(s => s.id));
        const newUploads = uploadedSongs.filter(u => !defaultIds.has(u.id));
        if (newUploads.length > 0) {
          setAllSongs((prev: Song[]) => [...prev, ...newUploads]);
        }
      }
    } catch (e: unknown) {
      console.error("Failed to load persistence", e);
    }
  }, []);

  // Load progress tracking on mount
  useEffect(() => {
    const progress = getProgress();
    const songIds = Object.keys(progress);
    if (songIds.length > 0) {
      setIsFirstTimer(false);
      // Find most recently played song
      const mostRecent = songIds.reduce((a, b) =>
        progress[a].lastPlayedAt > progress[b].lastPlayedAt ? a : b
      );
      setLastPlayedSongId(mostRecent);
    }
  }, []);

  // Compute song durations (non-blocking, cosmetic)
  useEffect(() => {
    let cancelled = false;
    async function computeDurations() {
      const results: Record<string, number> = {};
      for (const song of defaultSongs) {
        try {
          if (song.type === 'midi' && song.url) {
            const res = await fetch(song.url);
            const buf = await res.arrayBuffer();
            const midi = new Midi(buf);
            results[song.id] = midi.duration;
          } else if (song.type === 'abc' && song.abc) {
            const midiBuffer = abcToMidiBuffer(song.abc);
            const midi = new Midi(midiBuffer);
            results[song.id] = midi.duration;
          } else if (song.type === 'musicxml' && song.url) {
            const res = await fetch(song.url);
            const text = await res.text();
            const parser = new MusicXMLParser();
            const score = parser.parse(text);
            const generator = new MIDIGenerator();
            const midiBase64 = generator.generate(score);
            const binary = atob(midiBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const midi = new Midi(bytes.buffer);
            results[song.id] = midi.duration;
          }
        } catch (e) {
          console.error(`Failed to compute duration for ${song.id}`, e);
        }
      }
      if (!cancelled) setDurations(results);
    }
    computeDurations();
    return () => { cancelled = true; };
  }, []);

  const saveToLocalStorage = (song: Song) => {
    try {
      const saved = localStorage.getItem('piano_lessons_uploads');
      const uploads: Song[] = saved ? (JSON.parse(saved) as Song[]) : [];
      uploads.push(song);
      localStorage.setItem('piano_lessons_uploads', JSON.stringify(uploads));
    } catch (e: unknown) {
      console.error("Failed to save song", e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;


    const validation = validateMusicXMLFile(file);
    if (!validation.valid) {
      showToast(validation.error ?? "Invalid file", "error");
      return;
    }

    try {
      const text = await file.text();

      // 1. Parse MusicXML
      const parser = new MusicXMLParser();
      const score = parser.parse(text);

      // 2. Generate MIDI
      const generator = new MIDIGenerator();
      const midiBase64 = generator.generate(score);
      const midiUrl = `data:audio/midi;base64,${midiBase64}`;

      const newSong: Song = {
        id: `upload-${Date.now()}`,
        title: score.title || file.name.replace(/\.(xml|musicxml)$/i, ''),
        artist: 'Uploaded (MusicXML)',
        url: midiUrl,
        type: 'midi'
      };

      setAllSongs(prev => [...prev, newSong]);
      saveToLocalStorage(newSong);
      setCurrentSong(newSong);
      setHasStarted(true);

    } catch (error) {
      console.error('Error converting MusicXML:', error);
      showToast(error instanceof Error ? error.message : 'Failed to convert file', "error");
    }
  };

  // Check if PWA hint should show (iPhone only, not in standalone mode)
  useEffect(() => {
    const isIPhone = /iPhone/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('pwa_hint_dismissed');

    if (isIPhone && !isStandalone && !dismissed) {
      setTimeout(() => setShowPWAHint(true), 0);
    }
  }, []);

  // Check if silent mode hint should show (iOS devices only)
  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const dismissed = localStorage.getItem('silent_mode_hint_dismissed');

    if (isIOS && !dismissed) {
      setTimeout(() => setShowSilentModeHint(true), 0);
    }
  }, []);

  // Unlock AudioContext on first user activation so hover sounds work immediately after
  useEffect(() => { warmUpAudio(); }, []);

  const selectSong = useCallback(async (song: Song) => {
    try {
      const Tone = await import('tone');
      await Tone.start();
      if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
      }
    } catch (e) {
      console.error('Failed to start audio context:', e);
    }
    setLastPlayed(song.id);
    setLastPlayedSongId(song.id);
    setIsFirstTimer(false);
    setCurrentSong(song);
    setHasStarted(true);
  }, []);

  const lastPlayedSong = useMemo(
    () => lastPlayedSongId ? allSongs.find(s => s.id === lastPlayedSongId) : null,
    [lastPlayedSongId, allSongs]
  );

  const showTabs = allSongs.length > 4;

  const filteredSongs = useMemo(() => {
    let songs = allSongs;
    if (activeTab === 'uploads') songs = songs.filter(s => s.id.startsWith('upload-'));
    else if (activeTab !== 'all') songs = songs.filter(s => s.difficulty === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      songs = songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    }
    if (sortBy !== 'default') {
      const diffOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
      songs = [...songs].sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
        if (sortBy === 'difficulty') return (diffOrder[a.difficulty ?? ''] ?? 9) - (diffOrder[b.difficulty ?? ''] ?? 9);
        if (sortBy === 'duration') return (durations[a.id] ?? Infinity) - (durations[b.id] ?? Infinity);
        return 0;
      });
    }
    return songs;
  }, [allSongs, activeTab, searchQuery, sortBy, durations]);

  return (
    <>
      <ToastContainer />
      <AnimatePresence mode="wait">
        {hasStarted ? (
          <motion.div
            key="lesson"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            <PianoLesson
              song={currentSong}
              allSongs={allSongs}
              onSongChange={setCurrentSong}
              onExit={() => setHasStarted(false)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex h-screen w-full flex-col items-center bg-[var(--color-void)] text-[var(--color-text)] p-8 pt-[max(2rem,8vh)] relative overflow-y-auto crt-effect"
            data-theme={theme}
          >
            {/* Settings Gear - Theme Popover */}
            <div className="absolute top-6 right-6 z-20">
              <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className={`flex items-center justify-center w-10 h-10 ${isThemeOpen ? 'pixel-btn-primary' : 'pixel-btn'}`}
                aria-label="Theme settings"
                title="Theme"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <AnimatePresence>
                {isThemeOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsThemeOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 pixel-panel p-3 z-20 w-[260px]"
                    >
                      <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2 block">Theme</label>
                      <div className="grid grid-cols-3 gap-1">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id as Theme)}
                            className={`flex flex-col items-center p-2 text-[10px] ${theme === t.id ? 'pixel-btn-primary' : 'pixel-btn'}`}
                            title={t.description}
                          >
                            <div className="flex gap-[2px] mb-1">
                              {t.swatches.map((color, i) => (
                                <div key={i} className="w-2 h-2" style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.3)' }} />
                              ))}
                            </div>
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="pixel-title text-2xl md:text-4xl mb-4 z-10 text-[var(--color-accent-primary)]"
            >
              Piano Lessons
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="pixel-text-muted mb-12 z-10 text-lg"
            >
              Select a piece to begin practicing
            </motion.p>

            {/* Continue Playing card for returning users */}
            {lastPlayedSong && !isFirstTimer && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                onClick={() => selectSong(lastPlayedSong)}
                className="z-10 w-full max-w-4xl px-4 mb-6"
              >
                <div className="w-full flex items-center justify-between p-4 pixel-btn-primary hover:scale-[1.01] transition-transform text-left">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Continue Playing</span>
                    <h3 className="text-lg font-bold text-[var(--color-text-bright)] uppercase tracking-tighter">{lastPlayedSong.title}</h3>
                  </div>
                  <span className="text-lg font-bold">Continue →</span>
                </div>
              </motion.button>
            )}

            {/* Song list container */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.12 }}
              className="z-10 w-full max-w-2xl px-4 flex flex-col"
              style={{ maxHeight: 'min(60vh, 480px)' }}
            >
              {/* Search + sort + filter bar */}
              <div className="flex gap-2 mb-3 items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pixel-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search songs..."
                    className="w-full pl-9 pr-3 py-2 text-sm pixel-panel bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-2 py-2 text-[10px] font-bold uppercase tracking-tight pixel-btn bg-transparent text-[var(--color-text)] cursor-pointer shrink-0"
                >
                  <option value="default">Order</option>
                  <option value="title">Title</option>
                  <option value="artist">Artist</option>
                  <option value="difficulty">Level</option>
                  <option value="duration">Length</option>
                </select>
                {showTabs && (
                  <div className="flex gap-1 shrink-0 overflow-x-auto">
                    {([
                      { key: 'all', label: 'All' },
                      { key: 'beginner', label: 'Bgn' },
                      { key: 'intermediate', label: 'Int' },
                      { key: 'advanced', label: 'Adv' },
                      { key: 'uploads', label: 'Mine' },
                    ] as const).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-2 py-2 text-[10px] font-bold uppercase tracking-tight ${activeTab === tab.key ? 'pixel-btn-primary' : 'pixel-btn'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scrollable song list */}
              <div className="overflow-y-auto flex-1 min-h-0 pixel-panel p-1">
                {filteredSongs.length === 0 && (
                  <div className="text-center py-6 pixel-text-muted text-sm">
                    No songs match this filter
                  </div>
                )}
                {filteredSongs.map((song, index) => (
                  <motion.button
                    key={song.id}
                    data-testid={`song-${song.id}`}
                    initial={index < 8 ? { opacity: 0, x: -10 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index, 6) * 0.05 }}
                    onMouseEnter={playHoverSound}
                    onClick={() => { playSelectSound(); selectSong(song); }}
                    className={`group relative w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-ui-active)] transition-colors ${isFirstTimer && song.id === 'twinkle' ? 'bg-[var(--color-ui-active)]' : ''}`}
                  >
                    {/* RPG cursor */}
                    <span className="w-4 shrink-0 opacity-0 group-hover:opacity-100 pixel-text-accent text-xs cursor-bounce transition-opacity">▶</span>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--color-text-bright)] uppercase tracking-tighter truncate">{song.title}</span>
                        {isFirstTimer && song.id === 'twinkle' && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 bg-[var(--color-accent-primary)] text-[var(--color-void)]">START HERE</span>
                        )}
                      </div>
                      <span className="text-xs pixel-text-subtle truncate block">{song.artist}</span>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 shrink-0">
                      {durations[song.id] != null && (
                        <span className="text-[10px] pixel-text-muted tabular-nums">~{Math.ceil(durations[song.id] / 60)}m</span>
                      )}
                      {song.difficulty && (
                        <span className="inline-block w-2 h-2 shrink-0" style={{ backgroundColor: DIFFICULTY_COLORS[song.difficulty] }} title={song.difficulty} />
                      )}
                    </div>
                  </motion.button>
                ))}

                {/* Upload row */}
                <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--color-ui-active)]">
                  <span className="w-4 shrink-0 pixel-text-muted text-xs">+</span>
                  <label className="flex-1 flex items-center gap-2 cursor-pointer group">
                    <span className="text-sm font-bold pixel-text-accent uppercase tracking-tighter group-hover:pixel-text-bright transition-colors">Import MusicXML</span>
                    <input
                      type="file"
                      accept=".xml,.musicxml"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button onClick={() => setIsHelpOpen(true)} className="pixel-text-muted hover:pixel-text-accent transition-colors" title="About MusicXML">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Keyboard shortcuts hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="z-10 mt-8 text-center"
            >
              <p className="text-[11px] pixel-text-muted">
                <span className="hidden md:inline">Keyboard: <kbd className="pixel-kbd">Space</kbd> play/pause &middot; <kbd className="pixel-kbd">&larr;</kbd><kbd className="pixel-kbd">&rarr;</kbd> seek &middot; <kbd className="pixel-kbd">Esc</kbd> back</span>
              </p>
            </motion.div>

            {/* Silent Mode Warning for iOS */}
            <AnimatePresence>
              {showSilentModeHint && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-20 left-4 right-4 z-50 pixel-panel p-4"
                  style={{ backgroundColor: 'var(--color-accent-tertiary)' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">!!</span>
                    <div className="flex-1">
                      <p className="text-sm text-[var(--color-text-bright)] font-bold uppercase tracking-tighter">
                        iOS Tip: Turn off silent mode
                      </p>
                      <p className="text-xs text-[var(--color-text)] mt-1">
                        Your device must not be in silent mode to hear audio
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowSilentModeHint(false);
                        localStorage.setItem('silent_mode_hint_dismissed', 'true');
                      }}
                      className="text-[var(--color-text)]/80 hover:text-[var(--color-text-bright)] transition-colors"
                      aria-label="Dismiss"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PWA Install Hint for iPhone */}
            <AnimatePresence>
              {showPWAHint && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-4 left-4 right-4 z-50 pixel-panel p-4"
                  style={{ backgroundColor: 'var(--color-ui-active)' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg font-bold pixel-text-accent">&gt;_</span>
                    <div className="flex-1">
                      <p className="text-sm text-[var(--color-text-bright)] font-bold uppercase tracking-tighter">
                        For the best experience
                      </p>
                      <p className="text-xs text-[var(--color-text)] mt-1">
                        Tap <strong>Share</strong> &rarr; <strong>Add to Home Screen</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowPWAHint(false);
                        localStorage.setItem('pwa_hint_dismissed', 'true');
                      }}
                      className="text-[var(--color-text)]/80 hover:text-[var(--color-text-bright)] transition-colors"
                      aria-label="Dismiss"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
