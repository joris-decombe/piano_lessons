from mido import Message, MidiFile, MidiTrack


def create_twinkle():
    mid = MidiFile()
    track = MidiTrack()
    mid.tracks.append(track)

    # Set instrument to Acoustic Grand Piano (Program 0)
    track.append(Message("program_change", program=0, time=0))

    # Notes for Twinkle Twinkle Little Star (C Major)
    # Pitch: 60=C4, 67=G4, 69=A4, 65=F4, 64=E4, 62=D4
    # Time is in ticks. default ticks_per_beat=480.
    # Quarter note = 480. Half note = 960.

    quarter = 480
    half = 960

    notes = [
        # Line 1: Twinkle, twinkle, little star
        (60, quarter),
        (60, quarter),
        (67, quarter),
        (67, quarter),
        (69, quarter),
        (69, quarter),
        (67, half),
        # Line 2: How I wonder what you are
        (65, quarter),
        (65, quarter),
        (64, quarter),
        (64, quarter),
        (62, quarter),
        (62, quarter),
        (60, half),
        # Line 3: Up above the world so high
        (67, quarter),
        (67, quarter),
        (65, quarter),
        (65, quarter),
        (64, quarter),
        (64, quarter),
        (62, half),
        # Line 4: Like a diamond in the sky
        (67, quarter),
        (67, quarter),
        (65, quarter),
        (65, quarter),
        (64, quarter),
        (64, quarter),
        (62, half),
        # Line 5: Twinkle, twinkle, little star
        (60, quarter),
        (60, quarter),
        (67, quarter),
        (67, quarter),
        (69, quarter),
        (69, quarter),
        (67, half),
        # Line 6: How I wonder what you are
        (65, quarter),
        (65, quarter),
        (64, quarter),
        (64, quarter),
        (62, quarter),
        (62, quarter),
        (60, half),
    ]

    # We need to structure Note On / Note Off events
    # We'll make them legato-ish (full duration)

    for pitch, duration in notes:
        # Note On (velocity 64 - medium soft)
        track.append(Message("note_on", note=pitch, velocity=80, time=0))
        # Note Off (after duration)
        track.append(Message("note_off", note=pitch, velocity=64, time=duration))

    output_file = "public/twinkle.mid"
    mid.save(output_file)
    print(f"Generated clean piano MIDI: {output_file}")


if __name__ == "__main__":
    create_twinkle()
