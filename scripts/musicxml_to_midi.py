import sys
import music21
import argparse


def convert_musicxml_to_midi(input_path, output_path):
    try:
        # Parse the MusicXML file
        score = music21.converter.parse(input_path)

        # Write to MIDI file
        score.write("midi", fp=output_path)
        print(f"Successfully converted {input_path} to {output_path}")
        return True
    except Exception as e:
        print(f"Error converting file: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert MusicXML to MIDI")
    parser.add_argument("input", help="Input MusicXML file path")
    parser.add_argument("output", help="Output MIDI file path")

    args = parser.parse_args()

    success = convert_musicxml_to_midi(args.input, args.output)
    if not success:
        sys.exit(1)
