import { describe, it, expect } from 'vitest';
import { validateMusicXMLFile, MAX_FILE_SIZE } from '../../src/lib/validation';

describe('MusicXML File Validation', () => {
  it('should validate a correct file', () => {
    const file = { name: 'song.musicxml', size: 1024 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate a correct file with .xml extension', () => {
    const file = { name: 'song.xml', size: 1024 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(true);
  });

  it('should validate case insensitive extension', () => {
    const file = { name: 'song.XML', size: 1024 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid extension', () => {
    const file = { name: 'song.txt', size: 1024 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Please upload a .xml or .musicxml file');
  });

  it('should reject file too large', () => {
    const file = { name: 'song.xml', size: MAX_FILE_SIZE + 1 };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File size exceeds');
  });

  it('should accept file exactly at the limit', () => {
    const file = { name: 'song.xml', size: MAX_FILE_SIZE };
    const result = validateMusicXMLFile(file);
    expect(result.valid).toBe(true);
  });
});
