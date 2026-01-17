import mido


def analyze_midi(filename):
    try:
        mid = mido.MidiFile(filename)
        print(f"Analysis of {filename}:")
        print(f"Type: {mid.type}")
        print(f"Ticks per beat: {mid.ticks_per_beat}")

        for i, track in enumerate(mid.tracks):
            print(f"\nTrack {i}: {track.name}")
            instrument = "Unknown"
            note_count = 0
            channels = set()

            for msg in track:
                if msg.type == "program_change":
                    instrument = f"Program {msg.program} (Channel {msg.channel})"
                if msg.type == "note_on":
                    note_count += 1
                    channels.add(msg.channel)

            print(f"  Instrument: {instrument}")
            print(f"  Note Count: {note_count}")
            print(f"  Channels: {channels}")

    except Exception as e:
        print(f"Error analyzing {filename}: {e}")


if __name__ == "__main__":
    analyze_midi("public/ode.mid")
