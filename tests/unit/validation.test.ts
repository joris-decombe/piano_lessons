import { describe, it, expect } from 'vitest';
import { validateMusicXMLFile, validateSong } from '../../src/lib/validation';

describe('validateMusicXMLFile', () => {
    it('should validate a correct file', () => {
        const file = { name: 'song.xml', size: 1000 };
        const result = validateMusicXMLFile(file);
        expect(result.valid).toBe(true);
    });

    it('should validate a correct .musicxml file', () => {
        const file = { name: 'song.musicxml', size: 1000 };
        const result = validateMusicXMLFile(file);
        expect(result.valid).toBe(true);
    });

    it('should allow uppercase extensions', () => {
        const file = { name: 'SONG.XML', size: 1000 };
        const result = validateMusicXMLFile(file);
        expect(result.valid).toBe(true);
    });

    it('should reject a file that is too large', () => {
        const file = { name: 'song.xml', size: 6 * 1024 * 1024 }; // 6MB
        const result = validateMusicXMLFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too large');
    });

    it('should reject invalid extensions', () => {
        const file = { name: 'song.txt', size: 1000 };
        const result = validateMusicXMLFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });

    it('should handle null file', () => {
        // @ts-expect-error Testing runtime check
        const result = validateMusicXMLFile(null);
        expect(result.valid).toBe(false);
    });
});

describe('validateSong', () => {
    it('should validate a correct MIDI song', () => {
        const song = {
            id: '1',
            title: 'Test',
            artist: 'Me',
            type: 'midi',
            url: 'https://example.com/song.mid'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should validate a correct ABC song', () => {
        const song = {
            id: '2',
            title: 'Test ABC',
            artist: 'Me',
            type: 'abc',
            abc: 'C D E F'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should reject non-objects', () => {
        expect(validateSong(null)).toBe(false);
        expect(validateSong('string')).toBe(false);
    });

    it('should reject missing required fields', () => {
        const song = {
            // id missing
            title: 'Test',
            artist: 'Me',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject invalid types', () => {
        const song = {
            id: '1',
            title: 'Test',
            artist: 'Me',
            type: 'mp3' // Invalid
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject malicious URLs (javascript:)', () => {
        const song = {
            id: '1',
            title: 'Hacked',
            artist: 'Hacker',
            type: 'midi',
            url: 'javascript:alert(1)'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject malicious URLs (vbscript:)', () => {
        const song = {
            id: '1',
            title: 'Hacked',
            artist: 'Hacker',
            type: 'midi',
            url: 'vbscript:msgbox "pwned"'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should allow data URLs', () => {
        const song = {
            id: '1',
            title: 'Generated',
            artist: 'App',
            type: 'midi',
            url: 'data:audio/midi;base64,TVRo...'
        };
        expect(validateSong(song)).toBe(true);
    });
});
