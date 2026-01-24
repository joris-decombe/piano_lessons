import { describe, it, expect } from 'vitest';
import { validateMusicXMLFile, MAX_FILE_SIZE } from '../../src/lib/validation';

describe('validateMusicXMLFile', () => {
  it('should validate a valid small xml file', () => {
    const file = { name: 'song.xml', size: 1024 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate a valid small musicxml file', () => {
    const file = { name: 'song.musicxml', size: 1024 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(true);
  });

  it('should reject a file that is too large', () => {
    const file = { name: 'huge.xml', size: MAX_FILE_SIZE + 1 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File size exceeds limit');
  });

  it('should reject a file with invalid extension', () => {
    const file = { name: 'song.txt', size: 1024 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('should be case insensitive for extension', () => {
    const file = { name: 'SONG.XML', size: 1024 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(true);
  });
});
