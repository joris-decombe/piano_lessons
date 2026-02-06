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
    it('should validate a valid MIDI song', () => {
        const song = {
            id: '1',
            title: 'Test Song',
            artist: 'Test Artist',
            url: '/path/to/song.mid',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should validate a valid ABC song', () => {
        const song = {
            id: '2',
            title: 'ABC Song',
            artist: 'Test Artist',
            abc: 'C D E F',
            type: 'abc'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should fail if ID is missing', () => {
        const song = {
            title: 'Test Song',
            artist: 'Test Artist',
            url: '/path/to/song.mid',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should fail if URL is missing for MIDI', () => {
        const song = {
            id: '1',
            title: 'Test Song',
            artist: 'Test Artist',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should fail for javascript: URL', () => {
        const song = {
            id: '1',
            title: 'Malicious Song',
            artist: 'Hacker',
            url: 'javascript:alert(1)',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should fail for invalid type', () => {
        const song = {
            id: '1',
            title: 'Test Song',
            artist: 'Test Artist',
            url: '/path/to/song.mid',
            type: 'mp3'
        };
        expect(validateSong(song)).toBe(false);
    });

    it('should allow data: URL', () => {
        const song = {
            id: '1',
            title: 'Test Song',
            artist: 'Test Artist',
            url: 'data:audio/midi;base64,abc',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(true);
    });

    it('should allow blob: URL', () => {
        const song = {
            id: '1',
            title: 'Test Song',
            artist: 'Test Artist',
            url: 'blob:http://example.com/uuid',
            type: 'midi'
        };
        expect(validateSong(song)).toBe(true);
    });
});
