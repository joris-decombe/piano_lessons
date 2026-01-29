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
            title: 'Test Song',
            artist: 'Test Artist',
            type: 'midi',
            url: 'https://example.com/song.mid'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should validate a correct ABC song', () => {
        const song = {
            id: '2',
            title: 'ABC Song',
            artist: 'Test Artist',
            type: 'abc',
            abc: 'C D E F'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should reject missing required fields', () => {
        expect(validateSong({ title: 'No ID' })).toBe(false);
        expect(validateSong({ id: '1', artist: 'Artist' })).toBe(false); // Missing title
    });

    it('should reject invalid types', () => {
        const song = {
            id: '1',
            title: 'Test',
            artist: 'Test',
            type: 'invalid'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject javascript: URLs', () => {
        const song = {
            id: '1',
            title: 'Hacked',
            artist: 'Hacker',
            type: 'midi',
            url: 'javascript:alert(1)'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject javascript: URLs with different casing', () => {
        const song = {
            id: '1',
            title: 'Hacked',
            artist: 'Hacker',
            type: 'midi',
            url: 'JavaScript:alert(1)'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject non-object inputs', () => {
        expect(validateSong(null)).toBe(false);
        expect(validateSong('string')).toBe(false);
        expect(validateSong(123)).toBe(false);
    });

    it('should validate data: URLs', () => {
         const song = {
            id: '1',
            title: 'Uploaded',
            artist: 'Me',
            type: 'midi',
            url: 'data:audio/midi;base64,abc'
        };
        expect(validateSong(song)).toBe(true);
    });
});
