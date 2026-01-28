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

/**
 * Validates a Song object structure and sanitizes URL
 */
export function validateSong(data: unknown): Song | null {
    if (!data || typeof data !== 'object') return null;

    // We use 'as any' safely here because we check every property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = data as any;

    // 1. Validate Required Fields
    if (typeof s.id !== 'string' || !s.id) return null;
    if (typeof s.title !== 'string' || !s.title) return null;
    if (typeof s.artist !== 'string') return null;

    // 2. Validate Type
    if (s.type !== 'midi' && s.type !== 'abc') return null;

    // 3. Validate Type-Specific Fields
    if (s.type === 'midi') {
        if (typeof s.url !== 'string' || !s.url) return null;
    }
    if (s.type === 'abc') {
        if (typeof s.abc !== 'string' || !s.abc) return null;
    }

    // 4. Security: URL Validation (if present)
    if (s.url) {
        if (typeof s.url !== 'string') return null;

        // Allow relative URLs (internal assets)
        if (s.url.startsWith('/')) {
            // OK
        }
        // Allow Data URIs (user uploads)
        else if (s.url.startsWith('data:')) {
            // OK
        }
        // Check Absolute URLs
        else {
            try {
                const url = new URL(s.url);
                // Block dangerous protocols
                if (['javascript:', 'vbscript:', 'file:'].includes(url.protocol)) {
                    return null;
                }
            } catch {
                // Invalid URL format
                return null;
            }
        }
    }

    // Return clean object to strip unknown properties
    return {
        id: s.id,
        title: s.title,
        artist: s.artist,
        url: s.url,
        abc: s.abc,
        type: s.type
    };
}
