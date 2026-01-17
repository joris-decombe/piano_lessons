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
