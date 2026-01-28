import { describe, it, expect } from 'vitest';
import { validateSong } from '../../src/lib/validation';

describe('validateSong', () => {
    it('should validate a valid MIDI song', () => {
        const input = {
            id: 'test-1',
            title: 'Test Song',
            artist: 'Test Artist',
            type: 'midi',
            url: 'https://example.com/song.mid'
        };
        const result = validateSong(input);
        expect(result).toEqual(input);
    });

    it('should validate a valid ABC song', () => {
        const input = {
            id: 'test-2',
            title: 'ABC Song',
            artist: 'ABC Artist',
            type: 'abc',
            abc: 'C D E F'
        };
        const result = validateSong(input);
        expect(result).toEqual(input);
    });

    it('should validate a data URI', () => {
         const input = {
            id: 'test-3',
            title: 'Data Song',
            artist: 'Me',
            type: 'midi',
            url: 'data:audio/midi;base64,abc'
        };
        const result = validateSong(input);
        expect(result).toEqual(input);
    });

    it('should reject malformed input (missing fields)', () => {
        expect(validateSong({})).toBeNull();
        expect(validateSong({ title: 'No ID' })).toBeNull();
        expect(validateSong({ id: '1', title: 'No Artist' })).toBeNull();
    });

    it('should reject invalid types', () => {
         const input = {
            id: 'test-4',
            title: 'Bad Type',
            artist: 'Artist',
            type: 'mp3', // Invalid
            url: 'https://example.com/song.mp3'
        };
        expect(validateSong(input)).toBeNull();
    });

    it('should reject dangerous javascript: URLs', () => {
        const input = {
            id: 'exploit-1',
            title: 'Exploit',
            artist: 'Hacker',
            type: 'midi',
            url: 'javascript:alert(1)'
        };
        expect(validateSong(input)).toBeNull();
    });

    it('should reject dangerous vbscript: URLs', () => {
        const input = {
            id: 'exploit-2',
            title: 'Exploit',
            artist: 'Hacker',
            type: 'midi',
            url: 'vbscript:msgbox'
        };
        expect(validateSong(input)).toBeNull();
    });

    it('should allow relative URLs', () => {
         const input = {
            id: 'test-5',
            title: 'Relative',
            artist: 'Artist',
            type: 'midi',
            url: '/songs/test.mid'
        };
        expect(validateSong(input)).toEqual(input);
    });

    it('should strip extra properties', () => {
        const input = {
            id: 'test-6',
            title: 'Extra',
            artist: 'Artist',
            type: 'midi',
            url: '/test.mid',
            evilProperty: 'script'
        };
        const result = validateSong(input);
        expect(result).not.toBeNull();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result as any).evilProperty).toBeUndefined();
    });
});
