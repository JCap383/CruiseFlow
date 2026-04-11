import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parse, isValid } from 'date-fns';
import {
  ArrowLeft,
  Clock,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  AlertTriangle,
  Camera,
  X,
  Star,
  Share2,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEvent, useEventsForDay, updateEvent, deleteEvent } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useEventConflicts } from '@/hooks/useConflicts';
import { CATEGORY_CONFIG, MOOD_OPTIONS } from '@/types';
import type { EventPhoto, MoodRating } from '@/types';
import { formatTimeRange } from '@/utils/time';
import { isValidIsoDate } from '@/stores/appStore';
import { MemberChip } from '@/components/family/MemberAvatar';
import { Button } from '@/components/ui/Button';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';
import { SocialShareMenu } from '@/components/ui/SocialShareMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

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

export function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const event = useEvent(id);
  const members = useFamily();
  const dayEvents = useEventsForDay(event?.date);
  const conflicts = useEventConflicts(id ?? '', dayEvents);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!event) {
    return (
      <div
        className="p-6 text-center"
        style={{ color: 'var(--fg-muted)' }}
        role="status"
      >
        Event not found
      </div>
    );
  }

  // #77: humanized date label so users see *which day* the event lives on,
  // not just the time. Falls back to the raw ISO string if parsing fails.
  const eventDateLabel = (() => {
    if (!isValidIsoDate(event.date)) return event.date;
    const d = parse(event.date, 'yyyy-MM-dd', new Date());
    return isValid(d) ? format(d, 'EEEE, MMM d, yyyy') : event.date;
  })();

  const config = CATEGORY_CONFIG[event.category];
  const assignedMembers = members.filter((m) =>
    event.memberIds.includes(m.id),
  );
  const photos = event.photos ?? [];

  // Parse category-specific metadata from notes
  const parseMetadata = (raw: string) => {
    let base = raw;
    let booking: { status: string; confirmation: string; cost: string } | null = null;
    let dining: { partySize: string; dressCode: string; specialRequest: string } | null = null;
    const bm = base.match(/\n?\[BOOKING:\s*([^\]]*)\]/);
    if (bm) {
      const parts = (bm[1] ?? '').split('|').map((s) => s.trim());
      booking = { status: parts[0] ?? '', confirmation: parts[1] ?? '', cost: parts[2] ?? '' };
      base = base.replace(bm[0], '').trim();
    }
    const dm = base.match(/\n?\[DINING:\s*([^\]]*)\]/);
    if (dm) {
      const parts = (dm[1] ?? '').split('|').map((s) => s.trim());
      dining = { partySize: parts[0] ?? '', dressCode: parts[1] ?? '', specialRequest: parts[2] ?? '' };
      base = base.replace(dm[0], '').trim();
    }
    return { base, booking, dining };
  };

  const meta = parseMetadata(event.notes ?? '');
  const hasBooking = meta.booking && (meta.booking.status || meta.booking.confirmation || meta.booking.cost);
  const hasDining = meta.dining && (meta.dining.partySize || meta.dining.dressCode || meta.dining.specialRequest);

  const handleAddPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const newPhotos: EventPhoto[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await compressPhoto(file);
        newPhotos.push({
          id: nanoid(),
          dataUrl,
          caption: '',
          addedAt: Date.now(),
        });
      }
      await updateEvent(event.id, {
        photos: [...photos, ...newPhotos],
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    await updateEvent(event.id, {
      photos: photos.filter((p) => p.id !== photoId),
    });
    setDeletePhotoId(null);
  };

  const handleToggleFavorite = async () => {
    await updateEvent(event.id, { isFavorite: !event.isFavorite });
  };

  const handleSetMood = async (mood: MoodRating) => {
    await updateEvent(event.id, {
      mood: event.mood === mood ? null : mood,
    });
  };

  const handleDelete = async () => {
    await deleteEvent(event.id);
    navigate(-1);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 pt-2 pb-2"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1 press"
          style={{ color: 'var(--fg-muted)' }}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Event Details</h1>
        <button
          onClick={() => setShowShareMenu(true)}
          className="p-1 press"
          style={{ color: 'var(--fg-muted)' }}
          aria-label="Share event"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleToggleFavorite}
          className="p-1 press"
          aria-label={event.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className="w-5 h-5"
            style={{
              color: event.isFavorite ? 'var(--warning)' : 'var(--fg-muted)',
              fill: event.isFavorite ? 'var(--warning)' : 'transparent',
            }}
          />
        </button>
        <button
          onClick={() => navigate(`/event/${event.id}/edit`)}
          className="p-1 press"
          style={{ color: 'var(--accent)' }}
          aria-label="Edit event"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>

        <h2 className="text-xl font-bold">{event.title}</h2>

        {/* #77: Date row — surfaces which day this event belongs to. */}
        <div
          className="flex items-center gap-2"
          style={{ color: 'var(--fg-muted)' }}
        >
          <Calendar className="w-4 h-4" aria-hidden="true" />
          <span>{eventDateLabel}</span>
        </div>

        {/* Time */}
        <div
          className="flex items-center gap-2"
          style={{ color: 'var(--fg-muted)' }}
        >
          <Clock className="w-4 h-4" aria-hidden="true" />
          <span>{formatTimeRange(event.startTime, event.endTime)}</span>
        </div>

        {/* Venue */}
        {event.venue && (
          <div
            className="flex items-center gap-2"
            style={{ color: 'var(--fg-muted)' }}
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            <span>
              {event.venue}
              {event.deck != null && ` · Deck ${event.deck}`}
            </span>
          </div>
        )}

        {/* Mood picker */}
        <div>
          <span
            className="text-sm block mb-2"
            style={{ color: 'var(--fg-muted)' }}
          >
            How was it?
          </span>
          <div className="flex gap-2" role="radiogroup" aria-label="Rate this event">
            {MOOD_OPTIONS.map(({ emoji, label }) => {
              const active = event.mood === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => handleSetMood(emoji)}
                  role="radio"
                  aria-checked={active}
                  aria-label={label}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl press transition-colors"
                  style={{
                    backgroundColor: active
                      ? 'var(--accent-soft)'
                      : 'var(--bg-card)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                  }}
                >
                  <span className="text-xl">{emoji}</span>
                  <span
                    className="text-[10px]"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Members */}
        {assignedMembers.length > 0 && (
          <div>
            <span
              className="text-sm block mb-2"
              style={{ color: 'var(--fg-muted)' }}
            >
              Attendees
            </span>
            <div className="flex flex-wrap gap-2">
              {assignedMembers.map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}

        {/* Booking details */}
        {hasBooking && meta.booking && (
          <div>
            <span
              className="text-sm block mb-1"
              style={{ color: 'var(--fg-muted)' }}
            >
              Booking
            </span>
            <div
              className="rounded-xl p-3 flex flex-col gap-1 text-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              {meta.booking.status && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg-muted)' }}>Status</span>
                  <span
                    className="capitalize"
                    style={{ color: 'var(--fg-default)' }}
                  >
                    {meta.booking.status}
                  </span>
                </div>
              )}
              {meta.booking.confirmation && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg-muted)' }}>Confirmation</span>
                  <span
                    className="font-mono"
                    style={{ color: 'var(--fg-default)' }}
                  >
                    {meta.booking.confirmation}
                  </span>
                </div>
              )}
              {meta.booking.cost && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg-muted)' }}>Cost</span>
                  <span style={{ color: 'var(--fg-default)' }}>
                    {meta.booking.cost}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dining details */}
        {hasDining && meta.dining && (
          <div>
            <span
              className="text-sm block mb-1"
              style={{ color: 'var(--fg-muted)' }}
            >
              Dining
            </span>
            <div
              className="rounded-xl p-3 flex flex-col gap-1 text-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              {meta.dining.partySize && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg-muted)' }}>Party size</span>
                  <span style={{ color: 'var(--fg-default)' }}>
                    {meta.dining.partySize}
                  </span>
                </div>
              )}
              {meta.dining.dressCode && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg-muted)' }}>Dress code</span>
                  <span
                    className="capitalize"
                    style={{ color: 'var(--fg-default)' }}
                  >
                    {meta.dining.dressCode.replace('-', ' ')}
                  </span>
                </div>
              )}
              {meta.dining.specialRequest && (
                <div className="flex justify-between gap-2">
                  <span
                    className="shrink-0"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    Request
                  </span>
                  <span
                    className="text-right"
                    style={{ color: 'var(--fg-default)' }}
                  >
                    {meta.dining.specialRequest}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {meta.base && (
          <div>
            <span
              className="text-sm block mb-1"
              style={{ color: 'var(--fg-muted)' }}
            >
              Notes
            </span>
            <p
              className="rounded-xl p-3 whitespace-pre-wrap"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-default)',
              }}
            >
              {meta.base}
            </p>
          </div>
        )}

        {/* Reminder */}
        {event.reminderMinutes != null && (
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--fg-muted)' }}
          >
            <span>⏰</span>
            <span>Reminder {event.reminderMinutes} min before</span>
          </div>
        )}

        {/* Photos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm"
              style={{ color: 'var(--fg-muted)' }}
            >
              Photos {photos.length > 0 && `(${photos.length})`}
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full press"
              style={{
                color: 'var(--accent)',
                backgroundColor: 'var(--accent-soft)',
              }}
              aria-label="Add photo"
            >
              <Camera className="w-3.5 h-3.5" />
              Add Photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddPhotos(e.target.files)}
              aria-label="Select photos to upload"
            />
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2" role="list" aria-label="Event photos">
              {photos.map((photo, photoIdx) => (
                <div
                  key={photo.id}
                  role="listitem"
                  onClick={() => setLightboxIndex(photoIdx)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIndex(photoIdx); }}}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                  aria-label={photo.caption || `Photo ${photoIdx + 1}`}
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || ''}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletePhotoId(photo.id);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                    aria-label="Delete photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl p-6 text-center text-sm press"
              style={{
                border: '2px dashed var(--border-default)',
                color: 'var(--fg-subtle)',
              }}
            >
              Tap to add photos from this event
            </button>
          )}
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div
            className="p-3 rounded-xl"
            style={{
              backgroundColor: 'var(--warning-soft)',
              border: '1px solid var(--warning)',
            }}
            role="alert"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: 'var(--warning)' }}
                aria-hidden="true"
              />
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--warning)' }}
              >
                Schedule Conflict
              </span>
            </div>
            {conflicts.map((c, i) => {
              const other =
                c.eventA.id === event.id ? c.eventB : c.eventA;
              const conflictMembers = members.filter((m) =>
                c.memberIds.includes(m.id),
              );
              return (
                <p
                  key={i}
                  className="text-sm mt-1"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Overlaps with &ldquo;{other.title}&rdquo; for{' '}
                  {conflictMembers.map((m) => m.name).join(', ')}
                </p>
              );
            })}
          </div>
        )}

        {/* Delete button */}
        <Button
          variant="danger"
          onClick={() => setShowDeleteConfirm(true)}
          className="mt-4"
          aria-label="Delete event"
        >
          <span className="flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete Event
          </span>
        </Button>
      </div>

      {/* Photo upload loading overlay */}
      {isUploading && <LoadingOverlay message="Compressing photos..." />}

      {/* Delete event confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Event"
          message={`Are you sure you want to delete "${event.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Delete photo confirmation */}
      {deletePhotoId && (
        <ConfirmDialog
          title="Delete Photo"
          message="Are you sure you want to remove this photo? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDeletePhoto(deletePhotoId)}
          onCancel={() => setDeletePhotoId(null)}
        />
      )}

      {lightboxIndex >= 0 && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onUpdateCaption={async (photoId, caption) => {
            await updateEvent(event.id, {
              photos: photos.map((p) =>
                p.id === photoId ? { ...p, caption } : p,
              ),
            });
          }}
        />
      )}

      {showShareMenu && (
        <SocialShareMenu
          event={event}
          onClose={() => setShowShareMenu(false)}
        />
      )}
    </div>
  );
}
