import { describe, it, expect } from 'vitest';
import { MusicXMLParser } from '../../src/lib/musicxml/parser';
import { MIDIGenerator } from '../../src/lib/musicxml/midi-generator';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>24</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>24</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>24</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe('Client-Side MusicXML Conversion', () => {
    it('should parse MusicXML correctly', () => {
        const parser = new MusicXMLParser();
        const score = parser.parse(SAMPLE_XML);

        expect(score.tracks.length).toBe(1);
        expect(score.tracks[0].events.length).toBe(2);

        const event1 = score.tracks[0].events[0];
        expect(event1.pitch).toBe('C4');
        expect(event1.durationTicks).toBe(128); // 24 divisions -> 1 quarter -> 128 ticks (if standardized)

        const event2 = score.tracks[0].events[1];
        expect(event2.pitch).toBe('D4');
    });

    it('should generate MIDI base64', () => {
        const parser = new MusicXMLParser();
        const score = parser.parse(SAMPLE_XML);

        const generator = new MIDIGenerator();
        const base64 = generator.generate(score);

        expect(typeof base64).toBe('string');
        expect(base64.length).toBeGreaterThan(0);
        // Basic check for MIDI header MThd (Base64 'TVRoZA' start)
        expect(base64.startsWith('TVRoZA')).toBe(true);
    });
});
