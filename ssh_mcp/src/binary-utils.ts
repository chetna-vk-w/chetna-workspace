/**
 * Binary data detection and handling utilities
 */

/**
 * Detect if buffer contains binary data
 * Based on presence of null bytes and control characters
 */
export function isBinary(buffer: Buffer, sampleSize: number = 8000): boolean {
  const size = Math.min(buffer.length, sampleSize);
  const sample = buffer.slice(0, size);

  // Check for null bytes (strong indicator of binary)
  if (sample.includes(0)) {
    return true;
  }

  // Count control characters (excluding common text control chars)
  let controlChars = 0;
  const textControlChars = new Set([9, 10, 13]); // tab, newline, carriage return

  for (let i = 0; i < size; i++) {
    const byte = sample[i];

    // Control characters (0-31) excluding text control chars
    if (byte < 32 && !textControlChars.has(byte)) {
      controlChars++;
    }

    // High bytes (128-255) might indicate binary or non-UTF8
    if (byte > 127) {
      // Could be UTF-8 multibyte or binary, check pattern
      // For simplicity, we'll use a threshold
    }
  }

  // If more than 5% of sampled bytes are control chars, likely binary
  const threshold = size * 0.05;
  return controlChars > threshold;
}

/**
 * Detect file type by extension
 */
export function detectFileType(filename: string): 'text' | 'binary' {
  const textExtensions = new Set([
    '.txt', '.md', '.json', '.xml', '.yaml', '.yml',
    '.js', '.ts', '.py', '.rb', '.java', '.c', '.cpp', '.h',
    '.html', '.css', '.scss', '.sass',
    '.sh', '.bash', '.zsh',
    '.conf', '.config', '.ini', '.env',
    '.log', '.csv', '.tsv',
  ]);

  const binaryExtensions = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
    '.mp3', '.mp4', '.avi', '.mkv', '.mov',
    '.exe', '.dll', '.so', '.dylib',
    '.bin', '.dat', '.db', '.sqlite',
  ]);

  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));

  if (textExtensions.has(ext)) {
    return 'text';
  }

  if (binaryExtensions.has(ext)) {
    return 'binary';
  }

  // Unknown extension, assume text
  return 'text';
}

/**
 * Encode binary data to base64
 */
export function encodeBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Decode base64 to binary
 */
export function decodeBase64(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Detect content type
 */
export interface ContentInfo {
  isBinary: boolean;
  encoding: 'utf-8' | 'binary' | 'base64';
  mimeType?: string;
}

export function analyzeContent(buffer: Buffer, filename?: string): ContentInfo {
  const binary = isBinary(buffer);

  if (binary) {
    return {
      isBinary: true,
      encoding: 'binary',
      mimeType: filename ? guessMimeType(filename) : 'application/octet-stream',
    };
  }

  return {
    isBinary: false,
    encoding: 'utf-8',
    mimeType: 'text/plain',
  };
}

/**
 * Guess MIME type by file extension
 */
export function guessMimeType(filename: string): string {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));

  const mimeTypes: { [key: string]: string } = {
    // Text
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',

    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',

    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    // Archives
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',

    // Video
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',

    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Safe string conversion (handles binary)
 */
export function bufferToString(buffer: Buffer): string {
  if (isBinary(buffer)) {
    return encodeBase64(buffer);
  }

  return buffer.toString('utf-8');
}

/**
 * Format size in human-readable format
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
