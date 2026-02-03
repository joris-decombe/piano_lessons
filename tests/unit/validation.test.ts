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
    it('should validate a valid midi song', () => {
        const song = {
            id: '1',
            title: 'Test',
            artist: 'Artist',
            type: 'midi',
            url: 'https://example.com/song.mid'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should validate a valid abc song', () => {
        const song = {
            id: '2',
            title: 'ABC Song',
            artist: 'Mozart',
            type: 'abc',
            abc: 'C D E F'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should reject invalid types', () => {
        const song = {
            id: '3',
            title: 'Bad Type',
            artist: 'Unknown',
            type: 'mp3' // Invalid
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject missing required fields', () => {
        const song = {
            id: '4',
            title: 'Missing Artist'
            // missing artist, type
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject malicious URLs', () => {
        const song = {
            id: '5',
            title: 'Hacked',
            artist: 'Hacker',
            type: 'midi',
            url: 'javascript:alert(1)'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject file URLs', () => {
        const song = {
            id: '6',
            title: 'Local File',
            artist: 'Hacker',
            type: 'midi',
            url: 'file:///etc/passwd'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should allow data URLs', () => {
        const song = {
            id: '7',
            title: 'Data URL',
            artist: 'Valid',
            type: 'midi',
            url: 'data:audio/midi;base64,TVRo...'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should allow relative URLs', () => {
        const song = {
            id: '8',
            title: 'Relative URL',
            artist: 'Valid',
            type: 'midi',
            url: '/songs/mysong.mid'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should reject unknown schemes', () => {
        const song = {
            id: '9',
            title: 'Unknown Scheme',
            artist: 'Valid',
            type: 'midi',
            url: 'ftp://example.com/song.mid'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject non-object input', () => {
        expect(validateSong(null)).toBe(false);
        expect(validateSong("string")).toBe(false);
        expect(validateSong(123)).toBe(false);
    });
});
