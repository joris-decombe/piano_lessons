export interface FileLike {
  name: string;
  size: number;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMusicXMLFile(file: FileLike): ValidationResult {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    };
  }

  // Check file extension
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xml") && !lowerName.endsWith(".musicxml")) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a .xml or .musicxml file.",
    };
  }

  return { valid: true };
}
