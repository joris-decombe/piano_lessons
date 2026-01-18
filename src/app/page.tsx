"use client";

import { useState, useMemo, useEffect } from "react";
import { usePianoAudio } from "@/hooks/usePianoAudio";
import { Keyboard } from "@/components/piano/Keyboard";
import { Waterfall } from "@/components/piano/Waterfall";
import { Controls } from "@/components/piano/Controls";
import { MusicXMLParser } from "@/lib/musicxml/parser";
import { MIDIGenerator } from "@/lib/musicxml/midi-generator";

// Song Management
interface Song {
  id: string;
  title: string;
  artist: string;
  url?: string;
  abc?: string;
  type: 'midi' | 'abc';
}

const BASE_PATH = '/piano_lessons';

const defaultSongs: Song[] = [
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
E E F G | G F E D | C C D E | D3/2 C/2 C2 |`
  }
];

function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold text-white mb-4">About MusicXML</h3>
        <div className="space-y-3 text-sm text-zinc-300">
          <p>MusicXML is a standard digital sheet music format that can be exported from most notation software.</p>
          <p><strong>Where to find .musicxml files:</strong></p>
          <ul className="list-disc pl-5 space-y-1 text-zinc-400">
            <li><a href="https://musescore.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">MuseScore</a> (Export as MusicXML)</li>
            <li><a href="https://imslp.org" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">IMSLP</a> (Petrucci Music Library)</li>
            <li><a href="https://openscore.cc" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">OpenScore</a></li>
          </ul>
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50 mt-4">
            <p className="text-xs text-zinc-400"><strong>Note:</strong> We convert MusicXML to MIDI on our secure server. Your files are processed privately and not shared.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [allSongs, setAllSongs] = useState<Song[]>(defaultSongs);
  const [currentSong, setCurrentSong] = useState<Song>(defaultSongs[0]);

  const [hasStarted, setHasStarted] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
          // eslint-disable-next-line
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


    if (file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) {
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
    } else {
      alert("Please upload a .xml or .musicxml file.");
    }
  };

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10 w-full max-w-4xl px-4 pb-12">
          {allSongs.map((song) => (
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

          {/* Upload New Song Card */}

          {/* Client-Side Conversion: Always enabled now */}
          <div className="group relative flex flex-col items-start p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800 border-dashed hover:border-cyan-500/50 hover:bg-zinc-900/60 transition-all hover:scale-[1.02] text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

            <div className="flex w-full justify-between items-start">
              <h3 className="text-2xl font-bold text-zinc-100 mb-1">Add New Song</h3>
              <button onClick={(e) => { e.stopPropagation(); setIsHelpOpen(true); }} className="text-zinc-500 hover:text-cyan-400 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            </div>
            <p className="text-zinc-400 font-medium">Import MusicXML files</p>

            <label className="mt-6 flex items-center text-cyan-400 text-sm font-bold group-hover:text-cyan-300 cursor-pointer">
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

        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
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
            currentTick={audio.currentTick}
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
            songs: allSongs,
            currentSong,
            onSelectSong: setCurrentSong
          }}
        />
      </footer>
    </div>
  );
}
