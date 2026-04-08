import { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  ImagePlus,
  Loader2,
  Check,
  Plus,
  Trash2,
  X,
  MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/stores/appStore';
import { addEvent } from '@/hooks/useEvents';
import { CATEGORY_CONFIG, type EventCategory } from '@/types';
import { formatTime } from '@/utils/time';
import { extractEventsFromImages } from '@/utils/gemini';

interface UploadedImage {
  data: string; // base64
  mediaType: string;
  preview: string; // data URL for display
}

interface ExtractedEvent {
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  venue: string;
  deck: number | null;
  notes: string;
  selected: boolean;
}

export function Scanner() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { apiKey, activeCruiseId, selectedDate, addScanResult } = useAppStore();

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [extractedDate, setExtractedDate] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  // Resize + compress images to stay well within Gemini's token limits.
  // Phone cameras shoot 12MP+ photos; a cruise planner only needs ~1500px
  // max dimension to be fully readable by the vision model.
  const compressImage = useCallback(
    (file: File): Promise<{ data: string; preview: string }> => {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const MAX = 1536; // px — sweet spot for readability vs tokens
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const scale = MAX / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          URL.revokeObjectURL(url);
          const base64 = dataUrl.split(',')[1]!;
          resolve({ data: base64, preview: dataUrl });
        };
        img.src = url;
      });
    },
    [],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach(async (file) => {
        const { data, preview } = await compressImage(file);
        setImages((prev) => [
          ...prev,
          { data, mediaType: 'image/jpeg', preview },
        ]);
      });
    },
    [compressImage],
  );

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const extractEvents = async () => {
    if (!apiKey) {
      setError('Add your Gemini API key in Settings first.');
      return;
    }
    if (images.length === 0) return;

    setIsExtracting(true);
    setError('');
    setExtractedEvents([]);

    try {
      const result = await extractEventsFromImages(
        images.map((img) => ({ data: img.data, mediaType: img.mediaType })),
        apiKey,
        selectedDate,
      );

      const events = (result.events || []).map(
        (e: Omit<ExtractedEvent, 'selected'>) => ({
          ...e,
          selected: true,
        }),
      );

      setExtractedEvents(events);
      setExtractedDate(result.date || null);

      // Save scan result to store for the chat concierge
      addScanResult({
        date: result.date || null,
        events: result.events || [],
        rawText: result.rawText || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleEvent = (idx: number) => {
    setExtractedEvents((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, selected: !e.selected } : e)),
    );
  };

  const toggleAll = () => {
    const allSelected = extractedEvents.every((e) => e.selected);
    setExtractedEvents((prev) =>
      prev.map((e) => ({ ...e, selected: !allSelected })),
    );
  };

  const addSelectedToCalendar = async () => {
    if (!activeCruiseId) return;

    const toAdd = extractedEvents.filter((e) => e.selected);
    const date = extractedDate || selectedDate;

    for (const event of toAdd) {
      await addEvent({
        cruiseId: activeCruiseId,
        title: event.title,
        date,
        startTime: event.startTime,
        endTime: event.endTime,
        category: (Object.keys(CATEGORY_CONFIG).includes(event.category)
          ? event.category
          : 'personal') as EventCategory,
        venue: event.venue || '',
        deck: event.deck,
        notes: event.notes || '',
        memberIds: [],
        reminderMinutes: null,
        photos: [],
      });
    }

    setAddedCount(toAdd.length);
    // Remove added events from the list
    setExtractedEvents((prev) => prev.filter((e) => !e.selected));
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-2 pb-2 border-b border-cruise-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Scan Planner</h1>
          <p className="text-sm text-cruise-muted">
            Upload your daily cruise planner
          </p>
        </div>
        <button
          onClick={() => navigate('/concierge')}
          className="flex items-center gap-1.5 text-sm text-ocean-400 bg-ocean-400/10 px-3 py-1.5 rounded-full"
        >
          <MessageCircle className="w-4 h-4" />
          Concierge
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* API key warning */}
        {!apiKey && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm text-amber-300">
              Add your Gemini API key in{' '}
              <button
                onClick={() => navigate('/settings')}
                className="underline font-medium"
              >
                Settings
              </button>{' '}
              to use AI features.
            </p>
          </div>
        )}

        {/* Drop zone / Upload area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-cruise-border rounded-2xl p-8 text-center cursor-pointer hover:border-ocean-500/50 transition-colors"
        >
          <div className="flex flex-col items-center gap-3">
            {images.length === 0 ? (
              <>
                <div className="w-14 h-14 bg-ocean-500/10 rounded-2xl flex items-center justify-center">
                  <ImagePlus className="w-7 h-7 text-ocean-400" />
                </div>
                <div>
                  <p className="font-medium text-cruise-text">
                    Upload cruise planner photos
                  </p>
                  <p className="text-sm text-cruise-muted mt-1">
                    Tap to select or drag & drop
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-ocean-400" />
                <p className="text-sm text-cruise-muted">Add more photos</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <div key={i} className="relative shrink-0">
                <img
                  src={img.preview}
                  alt={`Planner page ${i + 1}`}
                  className="h-32 w-auto rounded-xl object-cover border border-cruise-border"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(i);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Extract button */}
        {images.length > 0 && extractedEvents.length === 0 && (
          <Button
            onClick={extractEvents}
            disabled={isExtracting || !apiKey}
            className="flex items-center justify-center gap-2"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing {images.length} photo
                {images.length > 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Extract Events
              </>
            )}
          </Button>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Success message */}
        {addedCount > 0 && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-emerald-300">
              Added {addedCount} event{addedCount > 1 ? 's' : ''} to your
              schedule!
            </p>
          </div>
        )}

        {/* Extracted events */}
        {extractedEvents.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Found {extractedEvents.length} events
                {extractedDate && (
                  <span className="text-sm font-normal text-cruise-muted ml-2">
                    for {extractedDate}
                  </span>
                )}
              </h2>
              <button
                onClick={toggleAll}
                className="text-xs text-ocean-400 px-2 py-1"
              >
                {extractedEvents.every((e) => e.selected)
                  ? 'Deselect all'
                  : 'Select all'}
              </button>
            </div>

            {extractedEvents.map((event, i) => {
              const catConfig =
                CATEGORY_CONFIG[event.category as EventCategory] ??
                CATEGORY_CONFIG.personal;
              return (
                <button
                  key={i}
                  onClick={() => toggleEvent(i)}
                  className={`w-full text-left rounded-2xl p-4 border transition-all ${
                    event.selected
                      ? 'bg-cruise-card border-ocean-500/40'
                      : 'bg-cruise-surface border-cruise-border opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        event.selected
                          ? 'bg-ocean-500 border-ocean-500'
                          : 'border-cruise-border'
                      }`}
                    >
                      {event.selected && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>

                    {/* Category bar */}
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: catConfig.color }}
                    />

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-cruise-text text-sm">
                        {event.title}
                      </h3>
                      <p className="text-xs text-cruise-muted mt-0.5">
                        {formatTime(event.startTime)} –{' '}
                        {formatTime(event.endTime)}
                        {event.venue && ` · ${event.venue}`}
                        {event.deck != null && ` · Deck ${event.deck}`}
                      </p>
                      {event.notes && (
                        <p className="text-xs text-cruise-muted/70 mt-0.5 truncate">
                          {event.notes}
                        </p>
                      )}
                      <span
                        className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: catConfig.color + '22',
                          color: catConfig.color,
                        }}
                      >
                        {catConfig.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Add selected to calendar */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setExtractedEvents([]);
                  setImages([]);
                  setAddedCount(0);
                }}
                className="flex-1"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  Clear
                </span>
              </Button>
              <Button
                onClick={addSelectedToCalendar}
                disabled={!extractedEvents.some((e) => e.selected)}
                className="flex-1"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add {extractedEvents.filter((e) => e.selected).length} to
                  Calendar
                </span>
              </Button>
            </div>

            {/* Chat CTA */}
            <button
              onClick={() => navigate('/concierge')}
              className="w-full p-4 bg-ocean-500/10 border border-ocean-500/20 rounded-2xl text-left"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-ocean-400" />
                <div>
                  <p className="text-sm font-medium text-ocean-300">
                    Ask the Concierge
                  </p>
                  <p className="text-xs text-cruise-muted">
                    "What shows are on tonight?" "Plan our afternoon"
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
