import { useState, useEffect } from 'react';
import { platform } from '@/platform';

/**
 * Hook to resolve a stored photo URI to a displayable src string.
 *
 * On web, this is a no-op pass-through (photos are base64 data URLs).
 * On native, this reads the file from device storage and returns a
 * base64 data URL that can be used in <img src>.
 */
export function usePhotoSrc(uri: string | undefined): string {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    if (!uri) {
      setSrc('');
      return;
    }

    // On web, data URLs are already displayable — fast path
    if (uri.startsWith('data:')) {
      setSrc(uri);
      return;
    }

    // On native, resolve the file path
    let cancelled = false;
    platform.photos.getPhotoSrc(uri).then((resolved) => {
      if (!cancelled) setSrc(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return src;
}

/**
 * Compress a photo using canvas (works on both web and native).
 * Returns a base64 data URL.
 */
export function compressPhoto(file: File, maxSize = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Save a compressed photo through the platform layer.
 * On web: returns the dataUrl as-is.
 * On native: writes to file system and returns the file path.
 */
export async function savePhoto(dataUrl: string): Promise<string> {
  return platform.photos.savePhoto(dataUrl);
}
