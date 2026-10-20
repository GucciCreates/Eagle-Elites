'use client';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

/**
 * Downscales large photos (max 1600px, JPEG ~0.82) before upload so phone
 * camera shots upload quickly on mobile data. PDFs and small images pass
 * through untouched; anything the browser can't decode is returned as-is.
 */
export async function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.82,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 400 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext('2d')
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', {
      type: 'image/jpeg',
    });
  } catch {
    return file;
  }
}

export function fileExtension(file: File) {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export function validateUpload(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type))
    return 'Choose a photo (JPG, PNG, WebP) or a PDF.';
  if (file.size > 15 * 1024 * 1024)
    return 'That file is too large. Please choose one under 15 MB.';
  return null;
}

/** Unique per-upload storage path inside the user's private folder. */
export function uploadPath(userId: string, kind: string, file: File) {
  return `${userId}/${kind}-${Date.now()}.${fileExtension(file)}`;
}
