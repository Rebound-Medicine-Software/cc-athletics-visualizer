// SHA-256 file content hash + composite identity key.
// Uses Web Crypto, available in all evergreen browsers.

export interface FileFingerprint {
  hash: string;
  size: number;
  lastModified: number;
  name: string;
}

export async function fingerprintFile(file: File): Promise<FileFingerprint> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return {
    hash,
    size: file.size,
    lastModified: file.lastModified,
    name: file.name,
  };
}
