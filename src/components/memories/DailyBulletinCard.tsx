import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Plus, MoreHorizontal, Trash2, RefreshCw } from 'lucide-react';
import type { DailyBulletin } from '@/types';
import { updateCruise } from '@/hooks/useCruise';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { haptics } from '@/utils/haptics';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

/**
 * #95: compress a camera-captured image to a ~1200px JPEG before storing it
 * inline on the cruise record. Bulletins are reference-only so we prioritize
 * file size over pristine quality — the user just needs to read the printed
 * times and venue names at a glance.
 */
function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = (h / w) * MAX; w = MAX; }
          else { w = (w / h) * MAX; h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface DailyBulletinCardProps {
  cruiseId: string;
  date: string; // ISO date (yyyy-MM-dd)
  dayNum: number | null;
  weekday: string; // e.g., "Tuesday"
  bulletin: DailyBulletin | undefined;
  dailyBulletins: Record<string, DailyBulletin> | undefined;
}

type CaptureSide = 'front' | 'back';

/**
 * #95: Per-day "Daily Bulletin" card that lives at the top of the Daily
 * Schedule page. It lets the user snap a photo of the printed ship bulletin
 * (Freestyle Daily, Cruise Compass, etc.) for quick reference later in the
 * day. Supports an optional back-side photo, full-screen viewing via the
 * shared PhotoLightbox, and a "+ create event" handoff so users can add
 * something they spotted in the bulletin without losing context.
 */
export function DailyBulletinCard({
  cruiseId,
  date,
  dayNum,
  weekday,
  bulletin,
  dailyBulletins,
}: DailyBulletinCardProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureSideRef = useRef<CaptureSide>('front');
  const [isUploading, setIsUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const label = dayNum ? `Day ${dayNum} · ${weekday}` : weekday;

  const triggerCapture = (side: CaptureSide) => {
    captureSideRef.current = side;
    void haptics.tap();
    fileInputRef.current?.click();
  };

  const handleCapture = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const dataUrl = await compressPhoto(file);
      const side = captureSideRef.current;
      const current = bulletin;
      // Build the next bulletin record. We intentionally preserve the
      // opposite side when replacing just one face so "retake front"
      // doesn't wipe a previously-captured back.
      let next: DailyBulletin;
      if (side === 'front') {
        next = {
          front: dataUrl,
          ...(current?.back ? { back: current.back } : {}),
          updatedAt: Date.now(),
        };
      } else {
        // Adding/replacing the back requires a front to already exist.
        if (!current?.front) {
          toast.error('Add the front side first');
          return;
        }
        next = {
          front: current.front,
          back: dataUrl,
          updatedAt: Date.now(),
        };
      }
      const map = { ...(dailyBulletins ?? {}), [date]: next };
      await updateCruise(cruiseId, { dailyBulletins: map });
      toast.success(side === 'front' ? 'Bulletin saved' : 'Back side added');
      void haptics.success();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    const map = { ...(dailyBulletins ?? {}) };
    delete map[date];
    await updateCruise(cruiseId, { dailyBulletins: map });
    toast.success('Bulletin removed');
    setMenuOpen(false);
  };

  // Lightbox photo list — synthesize EventPhoto-shaped objects on the fly so
  // we can reuse PhotoLightbox without inventing a new schema.
  const photos = bulletin
    ? [
        {
          id: `${date}-front`,
          dataUrl: bulletin.front,
          caption: '',
          addedAt: bulletin.updatedAt,
        },
        ...(bulletin.back
          ? [
              {
                id: `${date}-back`,
                dataUrl: bulletin.back,
                caption: '',
                addedAt: bulletin.updatedAt,
              },
            ]
          : []),
      ]
    : [];

  const pageLabels = bulletin
    ? bulletin.back
      ? [`${label} · Front`, `${label} · Back`]
      : [`${label} · Front`]
    : [];

  return (
    <>
      <div
        className="mx-4 mt-3 p-3 rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-muted)' }} />
            <Text variant="subhead" weight="semibold" truncate>
              Daily Bulletin
            </Text>
            {dayNum && (
              <span
                className="text-footnote px-1.5 py-0.5 rounded-md shrink-0"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
              >
                Day {dayNum}
              </span>
            )}
          </div>
          {bulletin && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1.5 rounded-full press"
                style={{ color: 'var(--fg-muted)', minWidth: 36, minHeight: 36 }}
                aria-label="Bulletin options"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  {/* Click-away scrim so tapping outside dismisses the menu. */}
                  <button
                    className="fixed inset-0 z-20"
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 z-30 rounded-xl shadow-lg py-1 min-w-[180px]"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                    }}
                    role="menu"
                  >
                    <button
                      onClick={() => { setMenuOpen(false); triggerCapture('front'); }}
                      className="w-full px-3 py-2 text-left text-subhead flex items-center gap-2 press"
                      style={{ color: 'var(--fg-default)' }}
                      role="menuitem"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retake front
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); triggerCapture('back'); }}
                      className="w-full px-3 py-2 text-left text-subhead flex items-center gap-2 press"
                      style={{ color: 'var(--fg-default)' }}
                      role="menuitem"
                    >
                      {bulletin.back ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {bulletin.back ? 'Retake back' : 'Add back side'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-subhead flex items-center gap-2 press"
                      style={{ color: 'var(--danger)' }}
                      role="menuitem"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete bulletin
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!bulletin ? (
          <button
            onClick={() => triggerCapture('front')}
            className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl press"
            style={{
              border: '1.5px dashed var(--border-default)',
              color: 'var(--fg-muted)',
              minHeight: 96,
            }}
            aria-label={`Add bulletin photo for ${label}`}
          >
            <Camera className="w-6 h-6" />
            <Text variant="footnote" tone="muted">
              Tap to snap today's printed schedule
            </Text>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setLightboxIndex(0)}
              className="relative shrink-0 press rounded-xl overflow-hidden"
              style={{ width: 96, height: 128, backgroundColor: 'var(--bg-default)' }}
              aria-label={`View ${label} front`}
            >
              <img
                src={bulletin.front}
                alt={`${label} bulletin front`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span
                className="absolute bottom-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                Front
              </span>
            </button>
            {bulletin.back ? (
              <button
                onClick={() => setLightboxIndex(1)}
                className="relative shrink-0 press rounded-xl overflow-hidden"
                style={{ width: 96, height: 128, backgroundColor: 'var(--bg-default)' }}
                aria-label={`View ${label} back`}
              >
                <img
                  src={bulletin.back}
                  alt={`${label} bulletin back`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span
                  className="absolute bottom-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                >
                  Back
                </span>
              </button>
            ) : (
              <button
                onClick={() => triggerCapture('back')}
                className="shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl press"
                style={{
                  width: 96,
                  height: 128,
                  border: '1.5px dashed var(--border-default)',
                  color: 'var(--fg-muted)',
                }}
                aria-label={`Add back side for ${label}`}
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">Add back</span>
              </button>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <Text variant="footnote" tone="muted">
                {bulletin.back ? 'Front & back saved' : 'Front only'}
              </Text>
              <Text variant="caption" tone="subtle">
                Tap to view full-screen
              </Text>
            </div>
          </div>
        )}
      </div>

      {/* Hidden camera/file input — triggered by any of the capture buttons.
          We stash the target side in a ref so a single input can serve both
          the "retake front" and "add back" paths. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleCapture(e.target.files);
          e.target.value = '';
        }}
        aria-label="Capture bulletin photo"
      />

      {isUploading && <LoadingOverlay message="Saving bulletin..." />}

      {lightboxIndex !== null && bulletin && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          initialIndex={Math.min(lightboxIndex, photos.length - 1)}
          pageLabels={pageLabels}
          onClose={() => setLightboxIndex(null)}
          onAddToSchedule={() => {
            // Close the lightbox and jump straight into the event-create
            // flow. The daily-schedule page is already scoped to `date`,
            // so new events land on the correct day automatically.
            setLightboxIndex(null);
            navigate('/event/new');
          }}
        />
      )}
    </>
  );
}
