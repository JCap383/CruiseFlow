import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Pencil, Check, Download } from 'lucide-react';
import type { EventPhoto } from '@/types';

interface PhotoLightboxProps {
  photos: EventPhoto[];
  initialIndex: number;
  onClose: () => void;
  onUpdateCaption?: (photoId: string, caption: string) => void;
}

export function PhotoLightbox({ photos, initialIndex, onClose, onUpdateCaption }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const touchStartX = useRef<number | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);

  const photo = photos[index];

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
    setEditingCaption(false);
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : i));
    setEditingCaption(false);
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editingCaption) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext, editingCaption]);

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

  const startEditCaption = () => {
    setCaptionText(photo?.caption ?? '');
    setEditingCaption(true);
    setTimeout(() => captionInputRef.current?.focus(), 50);
  };

  const saveCaption = () => {
    if (photo && onUpdateCaption) {
      onUpdateCaption(photo.id, captionText.trim());
    }
    setEditingCaption(false);
  };

  const handleDownload = async () => {
    if (!photo) return;

    // Try Web Share API with file (works on iOS Safari for "Save to Photos")
    try {
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `cruiseflow-${photo.caption || 'photo'}-${photo.id.slice(0, 6)}.jpg`,
        { type: 'image/jpeg' },
      );

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: photo.caption || 'CruiseFlow Photo',
        });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }

    // Fallback: download via anchor tag
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `cruiseflow-${photo.caption || 'photo'}-${photo.id.slice(0, 6)}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!photo) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
    >
      {/* Top buttons */}
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Counter */}
      {photos.length > 1 && (
        <span className="absolute top-[max(1.25rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 text-sm text-white/70">
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
        className="max-w-full max-h-full p-4 flex flex-col items-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={photo.dataUrl}
          alt={photo.caption || ''}
          className="max-w-full max-h-[75vh] object-contain rounded-lg"
        />

        {/* Caption area */}
        <div className="mt-3 flex items-center gap-2 min-h-[2rem]">
          {editingCaption ? (
            <>
              <input
                ref={captionInputRef}
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveCaption(); }}
                placeholder="Add a caption..."
                className="bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg border border-white/20 outline-none flex-1 min-w-0"
              />
              <button onClick={saveCaption} className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 text-white">
                <Check className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onUpdateCaption ? startEditCaption : undefined}
              className="flex items-center gap-1.5 text-white/60 text-sm hover:text-white/90 transition-colors"
            >
              {photo.caption ? (
                <span className="text-white/80">{photo.caption}</span>
              ) : onUpdateCaption ? (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Add caption</span>
                </>
              ) : null}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
