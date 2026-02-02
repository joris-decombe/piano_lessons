/**
 * Validation utilities for user inputs
 */

export interface FileLike {
    name: string;
    size: number;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xml', '.musicxml'];

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateMusicXMLFile(file: FileLike): ValidationResult {
    if (!file) {
        return { valid: false, error: "No file provided." };
    }

    // 1. Check File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`
        };
    }

    // 2. Check Extension (Case-insensitive)
    const lowerName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));

    if (!hasValidExtension) {
        return {
            valid: false,
            error: "Invalid file type. Please upload a .xml or .musicxml file."
        };
    }

    return { valid: true };
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  url?: string;
  abc?: string;
  type: 'midi' | 'abc';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateSong(song: any): song is Song {
    if (!song || typeof song !== 'object') return false;

    // Required fields
    if (typeof song.id !== 'string') return false;
    if (typeof song.title !== 'string') return false;
    if (typeof song.artist !== 'string') return false;
    if (song.type !== 'midi' && song.type !== 'abc') return false;

    // Optional fields
    if (song.url !== undefined && typeof song.url !== 'string') return false;
    if (song.abc !== undefined && typeof song.abc !== 'string') return false;

    // Security Check: URL
    if (song.url) {
        const url = song.url.toLowerCase().trim();
        // Prevent XSS via javascript: protocol
        if (url.startsWith('javascript:') || url.startsWith('vbscript:')) {
            return false;
        }
    }

    return true;
}
