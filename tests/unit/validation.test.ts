import { describe, it, expect } from 'vitest';
import { validateFile, MAX_FILE_SIZE } from '../../src/lib/validation';

describe('validateFile', () => {
    it('should return valid for a correct xml file', () => {
        const file = { name: 'song.xml', size: 1024 };
        const result = validateFile(file);
        expect(result.valid).toBe(true);
    });

    it('should return valid for a correct musicxml file', () => {
        const file = { name: 'song.musicxml', size: 1024 };
        const result = validateFile(file);
        expect(result.valid).toBe(true);
    });

    it('should be case insensitive for extension', () => {
        const file = { name: 'song.XML', size: 1024 };
        const result = validateFile(file);
        expect(result.valid).toBe(true);
    });

    it('should fail if file is null', () => {
        const result = validateFile(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('No file selected');
    });

    it('should fail if file is too large', () => {
        const file = { name: 'song.xml', size: MAX_FILE_SIZE + 1 };
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds the limit');
    });

    it('should fail for invalid extension', () => {
        const file = { name: 'song.txt', size: 1024 };
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });
});
