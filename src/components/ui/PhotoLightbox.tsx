import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { EventPhoto } from '@/types';

interface PhotoLightboxProps {
  photos: EventPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const photo = photos[index];

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : i));
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX;
    if (endX === undefined) return;
    const diff = endX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!photo) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      {photos.length > 1 && (
        <span className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-white/70">
          {index + 1} / {photos.length}
        </span>
      )}

      {/* Prev button */}
      {index > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {index < photos.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Photo */}
      <div
        className="max-w-full max-h-full p-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={photo.dataUrl}
          alt={photo.caption || ''}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
        {photo.caption && (
          <p className="text-center text-white/80 text-sm mt-3">{photo.caption}</p>
        )}
      </div>
    </div>
  );
}
