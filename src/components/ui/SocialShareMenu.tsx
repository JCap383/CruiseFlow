import { useState, useRef, useEffect } from 'react';
import { Share2, X, Copy, Check } from 'lucide-react';
import type { CruiseEvent } from '@/types';
import { formatTimeRange } from '@/utils/time';

interface SocialShareMenuProps {
  event: CruiseEvent;
  onClose: () => void;
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Generates a share image from event data using canvas
 */
async function generateShareImage(event: CruiseEvent): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#0c4a6e');
  grad.addColorStop(0.5, '#0ea5e9');
  grad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // If there's a photo, draw it as background
  const photo = event.photos?.[0];
  if (photo) {
    try {
      const img = await loadImage(photo.dataUrl);
      // Draw photo with cover-fit
      const scale = Math.max(1080 / img.width, 1080 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (1080 - w) / 2, (1080 - h) / 2, w, h);
      // Dark overlay
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, 1080, 1080);
      // Bottom gradient
      const bottomGrad = ctx.createLinearGradient(0, 600, 0, 1080);
      bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bottomGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, 0, 1080, 1080);
    } catch {
      // Failed to load image, keep gradient
    }
  }

  // Title
  ctx.fillStyle = 'white';
  ctx.font = 'bold 56px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  wrapText(ctx, event.title, 540, photo ? 860 : 480, 920, 66);

  // Mood
  if (event.mood) {
    ctx.font = '64px sans-serif';
    ctx.fillText(event.mood, 540, photo ? 780 : 400);
  }

  // Time + Venue
  ctx.font = '300 28px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const meta = [
    formatTimeRange(event.startTime, event.endTime),
    event.venue,
  ].filter(Boolean).join(' · ');
  ctx.fillText(meta, 540, photo ? 940 : 560);

  // Favorite star
  if (event.isFavorite) {
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    ctx.fillText('★', 40, 80);
  }

  // Branding
  ctx.font = '500 20px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('CruiseFlow', 540, 1050);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

export function SocialShareMenu({ event, onClose }: SocialShareMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const shareText = [
    event.title,
    event.mood ?? '',
    formatTimeRange(event.startTime, event.endTime),
    event.venue ? `at ${event.venue}` : '',
    event.notes ? `\n${event.notes}` : '',
    '\nShared from CruiseFlow',
  ].filter(Boolean).join(' ');

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareNative = async () => {
    setGenerating(true);
    try {
      const blob = await generateShareImage(event);
      if (blob && navigator.share) {
        const file = new File([blob], `${event.title.replace(/\s+/g, '-')}.jpg`, { type: 'image/jpeg' });

        // Check if sharing files is supported
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: event.title,
            text: shareText,
            files: [file],
          });
        } else {
          await navigator.share({ title: event.title, text: shareText });
        }
      } else if (navigator.share) {
        await navigator.share({ title: event.title, text: shareText });
      }
    } catch {
      // User cancelled or error
    }
    setGenerating(false);
    onClose();
  };

  const handleFacebook = () => {
    // Facebook share dialog - shares the app URL with content
    const url = encodeURIComponent(window.location.href);
    const quote = encodeURIComponent(shareText);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`,
      '_blank',
      'width=600,height=400',
    );
    onClose();
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(
      `${event.title} ${event.mood ?? ''}\n${formatTimeRange(event.startTime, event.endTime)}${event.venue ? ` at ${event.venue}` : ''}\n\nShared from CruiseFlow`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      '_blank',
      'width=600,height=400',
    );
    onClose();
  };

  const handleInstagram = async () => {
    // Generate image and save to clipboard/download for Instagram
    setGenerating(true);
    try {
      const blob = await generateShareImage(event);
      if (!blob) return;

      // Try clipboard first (for paste into Instagram)
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/jpeg': blob }),
          ]);
          alert('Image copied to clipboard! Open Instagram and paste it into a new post.');
          onClose();
          return;
        } catch {
          // Clipboard write not supported, fall through to download
        }
      }

      // Fallback: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.title.replace(/\s+/g, '-')}-cruiseflow.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Image saved! Open Instagram and upload it as a new post.');
    } catch {
      // Error generating
    }
    setGenerating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-cruise-bg border-t border-cruise-border rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slide-up"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-cruise-text">Share Memory</h3>
          <button onClick={onClose} className="text-cruise-muted p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share preview */}
        <div className="bg-cruise-card rounded-xl p-3 mb-4 border border-cruise-border">
          <div className="flex items-center gap-3">
            {event.photos?.[0] ? (
              <img
                src={event.photos[0].dataUrl}
                alt=""
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-ocean-500/20 flex items-center justify-center shrink-0">
                {event.mood ?? '📸'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-cruise-text truncate text-sm">
                {event.isFavorite && '★ '}{event.title}
              </p>
              <p className="text-xs text-cruise-muted truncate">
                {formatTimeRange(event.startTime, event.endTime)}
                {event.venue && ` · ${event.venue}`}
              </p>
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Native share (iOS/Android) */}
          {typeof navigator.share === 'function' && (
            <button
              onClick={handleShareNative}
              disabled={generating}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-cruise-card border border-cruise-border active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-ocean-500 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-cruise-muted">Share</span>
            </button>
          )}

          {/* Facebook */}
          <button
            onClick={handleFacebook}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-cruise-card border border-cruise-border active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
              <FacebookIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-cruise-muted">Facebook</span>
          </button>

          {/* Instagram */}
          <button
            onClick={handleInstagram}
            disabled={generating}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-cruise-card border border-cruise-border active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center">
              <InstagramIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-cruise-muted">Instagram</span>
          </button>

          {/* X / Twitter */}
          <button
            onClick={handleTwitter}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-cruise-card border border-cruise-border active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
              <XTwitterIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-cruise-muted">X</span>
          </button>
        </div>

        {/* Copy link */}
        <button
          onClick={handleCopyText}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cruise-surface border border-cruise-border text-sm text-cruise-muted active:scale-[0.98] transition-transform"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Text</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
