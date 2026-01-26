export interface FileLike {
  name: string;
  size: number;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validateFile = (file: FileLike | null | undefined): ValidationResult => {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
    };
  }

  // Check extension
  const validExtensions = ['.xml', '.musicxml'];
  const fileName = file.name.toLowerCase();
  const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  if (!isValidExtension) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a .xml or .musicxml file."
    };
  }

  return { valid: true };
};
