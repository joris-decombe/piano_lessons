
export interface FileLike {
  name: string;
  size: number;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateMusicXMLFile(file: FileLike): { valid: boolean; error?: string } {
  const isXml = /\.(xml|musicxml)$/i.test(file.name);
  if (!isXml) {
    return { valid: false, error: "Please upload a .xml or .musicxml file." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.` };
  }

  return { valid: true };
}
