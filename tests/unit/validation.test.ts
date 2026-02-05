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
    it('should validate a correct song object', () => {
        const song = {
            id: 'test-song',
            title: 'Test Song',
            artist: 'Test Artist',
            type: 'midi',
            url: 'https://example.com/song.mid'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should validate a correct ABC song', () => {
        const song = {
            id: 'abc-song',
            title: 'ABC Song',
            artist: 'ABC Artist',
            type: 'abc',
            abc: 'C D E F'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should reject objects missing required fields', () => {
        const song = {
            title: 'No ID',
            artist: 'Artist',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject objects with invalid types for fields', () => {
        const song = {
            id: '123',
            title: 123, // Invalid
            artist: 'Artist',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject objects with invalid song type', () => {
        const song = {
            id: '123',
            title: 'Song',
            artist: 'Artist',
            type: 'mp3' // Invalid
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject objects with malicious URLs (javascript:)', () => {
        const song = {
            id: 'malicious',
            title: 'Malicious',
            artist: 'Hacker',
            type: 'midi',
            url: 'javascript:alert(1)'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject objects with malicious URLs (vbscript:)', () => {
        const song = {
            id: 'malicious',
            title: 'Malicious',
            artist: 'Hacker',
            type: 'midi',
            url: 'vbscript:alert(1)'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should allow data URIs', () => {
        const song = {
            id: 'data-uri',
            title: 'Data URI',
            artist: 'Artist',
            type: 'midi',
            url: 'data:audio/midi;base64,TVRo...'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should allow relative paths', () => {
        const song = {
            id: 'relative',
            title: 'Relative',
            artist: 'Artist',
            type: 'midi',
            url: '/songs/mysong.mid'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should handle null/undefined', () => {
        expect(validateSong(null)).toBe(false);
        expect(validateSong(undefined)).toBe(false);
    });
});
