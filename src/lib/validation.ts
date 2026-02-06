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

export function validateSong(song: unknown): song is Song {
    if (!song || typeof song !== 'object') {
        return false;
    }

    const s = song as Partial<Song>;

    if (typeof s.id !== 'string' || !s.id) return false;
    if (typeof s.title !== 'string' || !s.title) return false;
    if (typeof s.artist !== 'string') return false;
    if (s.type !== 'midi' && s.type !== 'abc') return false;

    // URL validation for MIDI
    if (s.type === 'midi') {
        if (typeof s.url !== 'string') return false;

        // Scheme check
        const url = s.url.toLowerCase().trim();
        const allowedSchemes = ['http://', 'https://', 'data:', 'blob:'];
        const isRelative = url.startsWith('/');

        const hasValidScheme = allowedSchemes.some(scheme => url.startsWith(scheme)) || isRelative;

        if (!hasValidScheme) return false;

        // Explicitly block javascript:
        if (url.includes('javascript:')) return false;
    }

    // ABC validation
    if (s.type === 'abc') {
        if (typeof s.abc !== 'string') return false;
    }

    return true;
}
