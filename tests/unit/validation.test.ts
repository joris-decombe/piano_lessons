import { describe, it, expect } from 'vitest';
import { validateMusicXMLFile } from '../../src/lib/validation';

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
