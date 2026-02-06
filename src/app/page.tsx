"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import * as Tone from "tone";

const BASE_PATH = '/piano_lessons';

// Song Management
interface Song {
  id: string;
  title: string;
  artist: string;
  url?: string;
  abc?: string;
  type: 'midi' | 'abc';
}

const defaultSongs: Song[] = [
  { id: 'gnossienne1', title: 'Gnossienne No. 1', artist: 'Erik Satie', url: `${BASE_PATH}/gnossienne1.mid`, type: 'midi' },
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
E E F G | G F E D | C C D E | D3/2 C/2 C2 |`
  }
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
  const { theme } = useTheme();

  // Auto-scale to fit screen width
  useEffect(() => {
    const updateScale = () => {
      setScale(calculateKeyboardScale(window.innerWidth));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
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
  // Target: 180px per second. 
  const lookAheadTime = useMemo(() => {
    if (waterfallHeight > 0) {
      return Math.max(0.8, Math.min(4.0, waterfallHeight / 180));
    }
    return 1.5;
  }, [waterfallHeight]);

  const audio = usePianoAudio(song, { lookAheadTime });

  const [splitHands, setSplitHands] = useState(true);
  const [leftColor, setLeftColor] = useState("var(--color-note-left)");
  const [rightColor, setRightColor] = useState("var(--color-note-right)");
  const [unifiedColor, setUnifiedColor] = useState("var(--color-note-unified)");
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
    const colors = { split: splitHands, left: leftColor, right: rightColor, unified: unifiedColor };
    const splitSettings = { strategy: splitStrategy, splitPoint };

    return audio.activeNotes.map(activeNote => {
      const midiNumber = Tone.Frequency(activeNote.note).toMidi();
      const trackColor = getNoteColor(activeNote.track, midiNumber, colors, splitSettings);
      return { note: activeNote.note, color: trackColor };
    });
  }, [audio.activeNotes, splitHands, leftColor, rightColor, unifiedColor, splitStrategy, splitPoint]);

  // Memoize settings objects to prevent Controls re-renders
  const visualSettings = useMemo(() => ({
    splitHands, setSplitHands,
    leftColor, setLeftColor,
    rightColor, setRightColor,
    unifiedColor, setUnifiedColor,
    splitStrategy, setSplitStrategy,
    splitPoint, setSplitPoint,
    showGrid, setShowGrid
  }), [splitHands, leftColor, rightColor, unifiedColor, splitStrategy, splitPoint, showGrid]);

  const songSettingsMemo = useMemo(() => ({
    songs: allSongs,
    currentSong: song,
    onSelectSong: onSongChange
  }), [allSongs, song, onSongChange]);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[var(--color-void)] px-[calc(1rem+env(safe-area-inset-left))] py-6 md:px-8 landscape:pt-1 landscape:pb-[calc(0.25rem+env(safe-area-inset-bottom))] relative overflow-hidden crt-effect noise-texture" data-theme={theme}>
      {/* Portrait Warning */}
      <div className="fixed inset-0 z-[100] hidden portrait:flex flex-col items-center justify-center bg-[var(--color-void)]/95 text-center p-8">
        <div className="text-4xl mb-4">↻</div>
        <h2 className="text-2xl font-bold text-[var(--color-text-bright)] mb-2 uppercase tracking-tighter">Please Rotate Your Device</h2>
        <p className="pixel-text-muted">Piano Lessons works best in landscape mode.</p>
      </div>

      <button
        onClick={onExit}
        className="absolute top-4 left-[calc(1rem+env(safe-area-inset-left))] z-50 p-2 pixel-btn-primary hover:scale-110 group"
        aria-label="Return to Song List"
      >
        <svg className="w-5 h-5 transform transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>

      {/* Header / Title - Hidden in mobile landscape to save space */}
      <header className="mb-2 landscape:hidden flex items-center justify-between shrink-0 pl-16">
        <h1 className="text-xl font-bold text-[var(--color-text-bright)]">{song.title}</h1>
        <div className="text-xs pixel-text-muted">{song.artist}</div>
      </header>

      {/* Main Visual Area */}
      <main className="relative flex-1 min-h-0 w-full flex flex-col bg-[var(--color-void)]">

        {/* Unified Scroll Container */}
        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden relative flex flex-col no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          {/* Centered Content Wrapper */}
          <div
            className="mx-auto h-full flex flex-col relative transition-transform duration-300 ease-out origin-top"
            style={{
              minWidth: 'fit-content',
              transform: `scale(${scale})`,
            }}
          >
            
            {/* Action Area: Waterfall flows BEHIND Keyboard */}
            <div className="relative flex-1 flex flex-col min-h-0">
                
                {/* 1. Waterfall Layer (z-40) - Interleaves between Nameboard (z-30) and Reflections (z-60) */}
                <div 
                  ref={waterfallContainerRef}
                  data-testid="waterfall-container"
                  className="absolute top-0 left-0 right-0 z-40 pointer-events-none"
                  style={{ bottom: 'var(--spacing-key-h)' }}
                >
                    <Waterfall
                        midi={audio.midi}
                        currentTick={audio.currentTick}
                        playbackRate={audio.playbackRate}
                        activeColors={{ split: splitHands, left: leftColor, right: rightColor, unified: unifiedColor }}
                        lookAheadTicks={audio.lookAheadTicks}
                        showGrid={showGrid}
                        containerHeight={waterfallHeight}
                    />
                </div>

                {/* 2. Layout Spacer (Pushes Keyboard to bottom) */}
                <div className="flex-1" />

                {/* 3. Keyboard Layer (No Z-Index wrapper to allow interleaving) */}
                <div className="relative shrink-0">
                    <Keyboard keys={coloredKeys} />
                </div>
            </div>

          </div>
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
      alert(validation.error);
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
      alert(error instanceof Error ? error.message : 'Failed to convert file');
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


  if (hasStarted) {
    return (
      <PianoLesson
        song={currentSong}
        allSongs={allSongs}
        onSongChange={setCurrentSong}
        onExit={() => setHasStarted(false)}
      />
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--color-void)] text-[var(--color-text)] p-8 relative overflow-y-auto crt-effect" data-theme={theme}>

      <h1 className="pixel-title text-2xl md:text-4xl mb-4 z-10 text-[var(--color-accent-primary)]">Piano Lessons</h1>
      <p className="pixel-text-muted mb-12 z-10 text-lg">Select a piece to begin practicing</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10 w-full max-w-4xl px-4">
        {allSongs.map((song) => (
          <button
            key={song.id}
            data-testid={`song-${song.id}`}
            onClick={async () => {
              // Start audio context on user interaction (iOS requirement)
              try {
                const Tone = await import('tone');
                await Tone.start();
                if (Tone.context.state === 'suspended') {
                  await Tone.context.resume();
                }
              } catch (e) {
                console.error('Failed to start audio context:', e);
              }
              setCurrentSong(song);
              setHasStarted(true);
            }}
            className="group relative flex flex-col items-start p-6 pixel-btn hover:scale-[1.02] text-left"
          >
            <h3 className="text-2xl font-bold text-[var(--color-text-bright)] mb-1 uppercase tracking-tighter">{song.title}</h3>
            <p className="pixel-text-subtle font-medium">{song.artist}</p>

            <div className="mt-6 flex items-center pixel-text-accent text-sm font-bold">
              <span>Start Lesson</span>
              <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        ))}

        {/* Upload New Song Card */}
        <div className="group relative flex flex-col items-start p-6 pixel-panel border-dashed hover:pixel-inset transition-all hover:scale-[1.02] text-left">
          <div className="flex w-full justify-between items-start">
            <h3 className="text-2xl font-bold text-[var(--color-text-bright)] mb-1 uppercase tracking-tighter">Add New Song</h3>
            <button onClick={(e) => { e.stopPropagation(); setIsHelpOpen(true); }} className="pixel-text-muted hover:pixel-text-accent transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          </div>
          <p className="pixel-text-subtle font-medium">Import MusicXML files</p>

          <label className="mt-6 flex items-center pixel-text-accent text-sm font-bold cursor-pointer hover:pixel-text-bright">
            <span>Select .xml / .musicxml</span>
            <input
              type="file"
              accept=".xml,.musicxml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </label>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="z-10 mt-12 w-full max-w-4xl px-4">
        <h2 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-wider mb-4 text-center">Theme</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as Theme)}
              className={`flex flex-col items-center p-3 text-xs ${theme === t.id ? 'pixel-btn-primary' : 'pixel-btn'}`}
            >
              {/* Color swatches */}
              <div className="theme-swatch">
                {t.swatches.map((color, i) => (
                  <div key={i} style={{ backgroundColor: color }} />
                ))}
              </div>
              <span className="font-bold">{t.name}</span>
              <span className="text-[10px] opacity-70">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Silent Mode Warning for iOS */}
      {showSilentModeHint && (
        <div className="fixed bottom-20 left-4 right-4 z-50 pixel-panel p-4" style={{ backgroundColor: 'var(--color-accent-tertiary)' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📱</span>
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
        </div>
      )}

      {/* PWA Install Hint for iPhone */}
      {showPWAHint && (
        <div className="fixed bottom-4 left-4 right-4 z-50 pixel-panel p-4" style={{ backgroundColor: 'var(--color-ui-active)' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-sm text-[var(--color-text-bright)] font-bold uppercase tracking-tighter">
                For the best experience
              </p>
              <p className="text-xs text-[var(--color-text)] mt-1">
                Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
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
        </div>
      )}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
