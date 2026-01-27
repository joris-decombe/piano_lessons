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
