import { XMLParser } from 'fast-xml-parser';
import { ParsedScore, ParsedTrack, NoteEvent } from './types';

// With preserveOrder: true, each element becomes an object with a single tag key
// whose value is an array of child elements. Attributes live under `:@`.
// Text content appears as { '#text': value }.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderedElement = Record<string, any>;

/** Extract the tag name from an ordered element (the first key that isn't ':@') */
function tagName(el: OrderedElement): string {
    for (const key of Object.keys(el)) {
        if (key !== ':@') return key;
    }
    return '';
}

/** Get the text value of a child element by tag name */
function getVal(children: OrderedElement[], tag: string): string | undefined {
    for (const child of children) {
        if (tag in child) {
            const inner = child[tag];
            // Leaf elements: [{ '#text': value }]
            if (inner.length === 1 && '#text' in inner[0]) {
                return String(inner[0]['#text']);
            }
            // Empty element — exists but has no text
            return '';
        }
    }
    return undefined;
}

/** Get the child elements array for a given tag */
function getChild(children: OrderedElement[], tag: string): OrderedElement[] | undefined {
    for (const child of children) {
        if (tag in child) {
            return child[tag];
        }
    }
    return undefined;
}

/** Get all children matching a tag (for repeated elements like multiple <note>) */
function getAllChildren(children: OrderedElement[], tag: string): OrderedElement[][] {
    const results: OrderedElement[][] = [];
    for (const child of children) {
        if (tag in child) {
            results.push(child[tag]);
        }
    }
    return results;
}

/** Get an attribute value from an element's :@ object */
function getAttr(el: OrderedElement, attr: string): string | undefined {
    const attrs = el[':@'];
    if (!attrs) return undefined;
    return attrs[`@_${attr}`];
}

export class MusicXMLParser {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            preserveOrder: true,
        });
    }

    parse(xmlContent: string): ParsedScore {
        const ordered: OrderedElement[] = this.parser.parse(xmlContent);

        // Find the score-partwise element (skip processing instructions, DOCTYPE, etc.)
        const scoreEl = ordered.find(el => 'score-partwise' in el);
        if (!scoreEl) {
            throw new Error("Invalid MusicXML: Missing score-partwise element");
        }
        const scoreChildren = scoreEl['score-partwise'];

        // Extract title from work/work-title
        const workChildren = getChild(scoreChildren, 'work');
        const title = (workChildren && getVal(workChildren, 'work-title')) || "Untitled";

        // Defaults
        let tempo = 120;
        let timeSignature: [number, number] = [4, 4];

        // Find all <part> elements
        const partElements = getAllChildren(scoreChildren, 'part');
        const tracks: ParsedTrack[] = [];

        for (const partChildren of partElements) {
            // The part element itself is the parent — find its :@ for the id
            const partEl = scoreChildren.find((el: OrderedElement) => 'part' in el && el['part'] === partChildren);
            const partId = partEl ? getAttr(partEl, 'id') || 'P1' : 'P1';

            // Collect events per staff for proper hand separation
            // Staff 1 = treble (right hand) → track 0, Staff 2 = bass (left hand) → track 1
            const eventsByStaff = new Map<number, NoteEvent[]>();
            // Track the last event pushed per staff for chord lookback
            const lastEventByStaff = new Map<number, NoteEvent>();
            let currentTick = 0;
            let divisions = 24;
            let staveCount = 1; // Track how many staves this part has

            // Find all <measure> elements within this part
            const measureElements = getAllChildren(partChildren, 'measure');

            for (const measureChildren of measureElements) {
                // Iterate in document order through measure children
                for (const child of measureChildren) {
                    const tag = tagName(child);

                    if (tag === 'attributes') {
                        const attrChildren = child['attributes'];
                        const divVal = getVal(attrChildren, 'divisions');
                        if (divVal) {
                            divisions = parseInt(divVal);
                        }
                        const timeChildren = getChild(attrChildren, 'time');
                        if (timeChildren) {
                            const beats = getVal(timeChildren, 'beats');
                            const beatType = getVal(timeChildren, 'beat-type');
                            if (beats && beatType) {
                                timeSignature = [parseInt(beats), parseInt(beatType)];
                            }
                        }
                        const stavesVal = getVal(attrChildren, 'staves');
                        if (stavesVal) {
                            staveCount = parseInt(stavesVal);
                        }
                    } else if (tag === 'direction') {
                        const dirChildren = child['direction'];
                        // Look for <sound tempo="..."/>
                        const soundEl = dirChildren.find((el: OrderedElement) => 'sound' in el);
                        if (soundEl) {
                            const tempoAttr = getAttr(soundEl, 'tempo');
                            if (tempoAttr) {
                                tempo = parseFloat(tempoAttr);
                            }
                        }
                    } else if (tag === 'note') {
                        const noteChildren = child['note'];

                        // Skip print-object="no" notes
                        if (getAttr(child, 'print-object') === 'no') {
                            // Still advance cursor for non-chord, non-grace notes
                            const isChord = getChild(noteChildren, 'chord') !== undefined;
                            const isGrace = getChild(noteChildren, 'grace') !== undefined;
                            if (!isChord && !isGrace) {
                                const xmlDuration = parseInt(getVal(noteChildren, 'duration') || '0');
                                currentTick += Math.round((xmlDuration / divisions) * 128);
                            }
                            continue;
                        }

                        // Grace notes have no duration — skip them entirely
                        const isGrace = getChild(noteChildren, 'grace') !== undefined;
                        if (isGrace) {
                            continue;
                        }

                        const xmlDuration = parseInt(getVal(noteChildren, 'duration') || '0');
                        const isRest = getChild(noteChildren, 'rest') !== undefined;
                        const isChord = getChild(noteChildren, 'chord') !== undefined;

                        const durationTicks = Math.round((xmlDuration / divisions) * 128);

                        // Determine which staff this note belongs to (default staff 1)
                        const staffVal = getVal(noteChildren, 'staff');
                        const staff = staffVal ? parseInt(staffVal) : 1;

                        if (!eventsByStaff.has(staff)) {
                            eventsByStaff.set(staff, []);
                        }
                        const staffEvents = eventsByStaff.get(staff)!;

                        let startTick = currentTick;
                        if (isChord) {
                            const lastEvent = lastEventByStaff.get(staff);
                            if (lastEvent) {
                                startTick = lastEvent.startTick;
                            }
                        }

                        if (!isRest) {
                            const pitchChildren = getChild(noteChildren, 'pitch');
                            if (pitchChildren) {
                                const step = getVal(pitchChildren, 'step') || 'C';
                                const octave = getVal(pitchChildren, 'octave') || '4';
                                const alterVal = getVal(pitchChildren, 'alter');
                                const alter = alterVal ? parseInt(alterVal) : 0;

                                let accidental = '';
                                if (alter === 1) accidental = '#';
                                else if (alter === -1) accidental = 'b';
                                else if (alter === 2) accidental = '##';
                                else if (alter === -2) accidental = 'bb';

                                const pitch = `${step}${accidental}${octave}`;

                                const event: NoteEvent = {
                                    pitch,
                                    duration: 'T' + durationTicks,
                                    startTick,
                                    durationTicks,
                                    velocity: 80,
                                };
                                staffEvents.push(event);
                                lastEventByStaff.set(staff, event);
                            }
                        }

                        if (!isChord) {
                            currentTick += durationTicks;
                        }
                    } else if (tag === 'backup') {
                        const backupChildren = child['backup'];
                        const xmlDuration = parseInt(getVal(backupChildren, 'duration') || '0');
                        const durationTicks = Math.round((xmlDuration / divisions) * 128);
                        currentTick -= durationTicks;
                    } else if (tag === 'forward') {
                        const forwardChildren = child['forward'];
                        const xmlDuration = parseInt(getVal(forwardChildren, 'duration') || '0');
                        const durationTicks = Math.round((xmlDuration / divisions) * 128);
                        currentTick += durationTicks;
                    }
                }
            }

            // Create one track per staff for multi-staff parts (piano = 2 staves)
            // Staff 1 (treble/right) first so it gets trackIndex 0 → right hand color
            if (staveCount > 1) {
                const staffNumbers = Array.from(eventsByStaff.keys()).sort((a, b) => a - b);
                for (const staffNum of staffNumbers) {
                    tracks.push({
                        id: staffNumbers.length > 1 ? `${partId}-staff${staffNum}` : partId,
                        events: eventsByStaff.get(staffNum) || [],
                    });
                }
            } else {
                // Single-staff part: all events in one track
                const allEvents = Array.from(eventsByStaff.values()).flat();
                allEvents.sort((a, b) => a.startTick - b.startTick);
                tracks.push({
                    id: partId,
                    events: allEvents,
                });
            }
        }

        return {
            title,
            tempo,
            timeSignature,
            tracks,
        };
    }
}
