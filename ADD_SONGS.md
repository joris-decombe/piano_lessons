# Adding Songs

Piano Lessons supports loading songs from **Standard MIDI Files (.mid)** and **ABC Notation**.

## 1. Adding a MIDI File

1.  Place your `.mid` file in the `public/` directory (or a subdirectory like `public/songs/`).
2.  Open `src/app/page.tsx`.
3.  Add a new entry to the `songs` array:

```typescript
{
  id: 'unique-id',
  title: 'Song Title',
  artist: 'Composer Name',
  url: '/path/to/file.mid', // Relative to public/
  type: 'midi'
}
```

## 2. Adding ABC Notation

You can define songs directly in the code using ABC notation strings. This is useful for simple melodies or dynamically generated music.

1.  Open `src/app/page.tsx`.
2.  Add a new entry to the `songs` array:

```typescript
{
  id: 'unique-id-abc',
  title: 'Song Title',
  artist: 'Composer',
  type: 'abc',
  abc: `T: Title
M: 4/4
L: 1/4
Q: 1/4=120
K: C
C D E F | G A B c |]` // Your ABC string here
}
```

### Tips for ABC
- Always specify **M** (Meter), **L** (Default Note Length), and **K** (Key).
- Use **Q** (Tempo) to ensure correct playback speed (e.g., `Q: 1/4=120` for 120 BPM).
- The visualizer currently maps the first voice/track found.

## 3. Adding MusicXML as Built-in Songs

You can now add MusicXML files as permanent entries in the song list.

1.  Place your `.xml` file in `public/scores/`.
2.  Open `src/app/page.tsx`.
3.  Add a new entry to the `songs` array:

```typescript
{
  id: 'unique-id-xml',
  title: 'Song Title',
  artist: 'Composer',
  url: `${BASE_PATH}/scores/filename.xml`, // Uses BASE_PATH defined in page.tsx
  type: 'musicxml',
  difficulty: 'advanced'
}
```

## 4. Uploading MusicXML Files (In-App)

You can upload MusicXML files (`.xml`, `.musicxml`) directly through the application interface.

1.  Click the **"Add New Song"** card on the main screen.
2.  Select your MusicXML file.
3.  The file will be processed locally in your browser (converted to MIDI).
4.  **Privacy & Persistence:** Files never leave your device. Uploaded songs are saved to your local browser storage and will be available on your next visit.

## Bundled Score Credits

The following MusicXML scores are bundled with the application. The underlying compositions are in the public domain; the digital transcriptions were created by community contributors:

| Score | Composer | Transcription Source |
|---|---|---|
| Clair de Lune | Claude Debussy | [MuseScore community](https://musescore.com) — exported via MuseScore 2.3.2 |
| Arabesque No. 1 | Claude Debussy | [MuseScore user 19710](https://musescore.com/user/19710/scores/55396) — exported via MuseScore 3.5.2 |

Thank you to the MuseScore community for making these transcriptions freely available.
