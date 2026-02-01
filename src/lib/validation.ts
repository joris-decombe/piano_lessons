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

export interface Song {
    id: string;
    title: string;
    artist: string;
    url?: string;
    abc?: string;
    type: 'midi' | 'abc';
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

export function validateSong(data: unknown): data is Song {
    if (typeof data !== 'object' || data === null) {
        return false;
    }

    // Cast to any to access properties safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const song = data as any;

    // Check required string fields
    if (typeof song.id !== 'string' || song.id.trim() === '') return false;
    if (typeof song.title !== 'string') return false;
    if (typeof song.artist !== 'string') return false;

    // Check type enum
    if (song.type !== 'midi' && song.type !== 'abc') return false;

    // Check URL if present
    if (song.url !== undefined) {
        if (typeof song.url !== 'string') return false;
        // Block javascript: protocol
        if (song.url.trim().toLowerCase().startsWith('javascript:')) return false;
    }

    // Check ABC if present
    if (song.abc !== undefined) {
        if (typeof song.abc !== 'string') return false;
    }

    return true;
}
