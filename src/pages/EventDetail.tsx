import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
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
import { MemberChip } from '@/components/family/MemberAvatar';
import { Button } from '@/components/ui/Button';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';

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

  if (!event) {
    return (
      <div className="p-6 text-center text-cruise-muted">
        Event not found
      </div>
    );
  }

  const config = CATEGORY_CONFIG[event.category];
  const assignedMembers = members.filter((m) =>
    event.memberIds.includes(m.id),
  );
  const photos = event.photos ?? [];

  const handleAddPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
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
  };

  const handleDeletePhoto = async (photoId: string) => {
    await updateEvent(event.id, {
      photos: photos.filter((p) => p.id !== photoId),
    });
  };

  const handleToggleFavorite = async () => {
    await updateEvent(event.id, { isFavorite: !event.isFavorite });
  };

  const handleSetMood = async (mood: MoodRating) => {
    await updateEvent(event.id, {
      mood: event.mood === mood ? null : mood,
    });
  };

  const handleShare = async () => {
    const text = [
      event.title,
      formatTimeRange(event.startTime, event.endTime),
      event.venue && `at ${event.venue}${event.deck != null ? ` (Deck ${event.deck})` : ''}`,
      event.notes && `\n${event.notes}`,
    ].filter(Boolean).join(' — ');

    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleDelete = async () => {
    await deleteEvent(event.id);
    navigate(-1);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-2 border-b border-cruise-border">
        <button onClick={() => navigate(-1)} className="text-cruise-muted p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Event Details</h1>
        <button onClick={handleShare} className="text-cruise-muted p-1">
          <Share2 className="w-5 h-5" />
        </button>
        <button onClick={handleToggleFavorite} className="p-1">
          <Star className={`w-5 h-5 ${event.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-cruise-muted'}`} />
        </button>
        <button
          onClick={() => navigate(`/event/${event.id}/edit`)}
          className="text-ocean-400 p-1"
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
          />
          <span className="text-sm font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>

        <h2 className="text-xl font-bold">{event.title}</h2>

        {/* Time */}
        <div className="flex items-center gap-2 text-cruise-muted">
          <Clock className="w-4 h-4" />
          <span>{formatTimeRange(event.startTime, event.endTime)}</span>
        </div>

        {/* Venue */}
        {event.venue && (
          <div className="flex items-center gap-2 text-cruise-muted">
            <MapPin className="w-4 h-4" />
            <span>
              {event.venue}
              {event.deck != null && ` · Deck ${event.deck}`}
            </span>
          </div>
        )}

        {/* Mood picker */}
        <div>
          <span className="text-sm text-cruise-muted block mb-2">How was it?</span>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map(({ emoji, label }) => (
              <button
                key={emoji}
                onClick={() => handleSetMood(emoji)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-colors ${
                  event.mood === emoji
                    ? 'bg-ocean-500/20 border-ocean-500'
                    : 'bg-cruise-card border-cruise-border'
                }`}
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-[10px] text-cruise-muted">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Members */}
        {assignedMembers.length > 0 && (
          <div>
            <span className="text-sm text-cruise-muted block mb-2">
              Attendees
            </span>
            <div className="flex flex-wrap gap-2">
              {assignedMembers.map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div>
            <span className="text-sm text-cruise-muted block mb-1">Notes</span>
            <p className="text-cruise-text bg-cruise-card rounded-xl p-3 border border-cruise-border whitespace-pre-wrap">
              {event.notes}
            </p>
          </div>
        )}

        {/* Photos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-cruise-muted">
              Photos {photos.length > 0 && `(${photos.length})`}
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-ocean-400 bg-ocean-400/10 px-3 py-1.5 rounded-full"
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
            />
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, photoIdx) => (
                <div
                  key={photo.id}
                  role="button"
                  onClick={() => setLightboxIndex(photoIdx)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-cruise-surface"
                >
                  <img
                    src={photo.dataUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo.id);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-cruise-border rounded-xl p-6 text-center text-cruise-muted/50 text-sm"
            >
              Tap to add photos from this event
            </button>
          )}
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">
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
                <p key={i} className="text-sm text-amber-200/80 mt-1">
                  Overlaps with &ldquo;{other.title}&rdquo; for{' '}
                  {conflictMembers.map((m) => m.name).join(', ')}
                </p>
              );
            })}
          </div>
        )}

        {/* Delete button */}
        <Button variant="danger" onClick={handleDelete} className="mt-4">
          <span className="flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete Event
          </span>
        </Button>
      </div>

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
    </div>
  );
}
