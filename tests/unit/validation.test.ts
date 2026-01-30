import { describe, it, expect } from 'vitest';
import { validateMusicXMLFile, validateSong, Song } from '../../src/lib/validation';

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
        const song: Song = {
            id: 'test-1',
            title: 'Test Song',
            artist: 'Test Artist',
            type: 'midi',
            url: 'data:audio/midi;base64,abc'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should validate a correct ABC song', () => {
        const song: Song = {
            id: 'test-2',
            title: 'Test ABC',
            artist: 'Test Artist',
            type: 'abc',
            abc: 'X:1\nK:C\nCDEF'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should reject invalid types', () => {
        const song = {
            id: 'test-3',
            title: 'Bad Type',
            artist: 'Test Artist',
            type: 'mp3'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject missing required fields', () => {
        const song = {
            id: 'test-4',
            // title missing
            artist: 'Test Artist',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject malicious URLs', () => {
        const song = {
            id: 'hack-1',
            title: 'Hacked',
            artist: 'Hacker',
            type: 'midi',
            url: 'javascript:alert(1)'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject oversized URLs', () => {
        const song = {
            id: 'large-1',
            title: 'Large',
            artist: 'Artist',
            type: 'midi',
            url: 'a'.repeat(8 * 1024 * 1024) // 8MB
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject oversized fields', () => {
        const song = {
            id: 'a'.repeat(101),
            title: 'Title',
            artist: 'Artist',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should reject non-string fields', () => {
        const song = {
            id: 123,
            title: 'Title',
            artist: 'Artist',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });
});
