import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse } from 'date-fns';
import {
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAppStore, isValidIsoDate } from '@/stores/appStore';
import { useCruise } from '@/hooks/useCruise';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { chatWithConcierge } from '@/utils/gemini';
import { formatTime } from '@/utils/time';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  "What's happening this evening?",
  'Plan a family afternoon',
  "Any kids' activities today?",
  'Best shows tonight?',
  'When and where is dinner?',
];

/**
 * Build a compact text snapshot of the user's cruise that we hand to Gemini
 * as context. We deliberately limit it to a few days around the selected
 * date so we stay well under the model's context window even for trips with
 * hundreds of events.
 */
function buildPlannerContext(args: {
  cruiseName?: string;
  shipName?: string;
  startDate?: string;
  endDate?: string;
  selectedDate: string;
  members: { name: string; isChild: boolean }[];
  events: {
    date: string;
    startTime: string;
    endTime: string;
    title: string;
    venue: string;
    deck: number | null;
    category: string;
    notes: string;
  }[];
}): string {
  const lines: string[] = [];
  if (args.cruiseName || args.shipName) {
    lines.push(
      `Cruise: ${args.cruiseName ?? 'Unnamed'}${args.shipName ? ` aboard ${args.shipName}` : ''}`,
    );
  }
  if (args.startDate && args.endDate) {
    lines.push(`Dates: ${args.startDate} → ${args.endDate}`);
  }
  if (isValidIsoDate(args.selectedDate)) {
    const todayLabel = format(
      parse(args.selectedDate, 'yyyy-MM-dd', new Date()),
      'EEEE, MMMM d, yyyy',
    );
    lines.push(`Currently viewing: ${todayLabel}`);
  }
  if (args.members.length > 0) {
    lines.push(
      `Family on this trip: ${args.members
        .map((m) => `${m.name}${m.isChild ? ' (child)' : ''}`)
        .join(', ')}`,
    );
  }

  if (args.events.length === 0) {
    lines.push('\nNo events have been logged in the planner yet.');
    return lines.join('\n');
  }

  // Group by date so the model can reason about a day at a time. Trim to
  // the 5-day window centred on the currently-viewed day so the prompt
  // stays compact regardless of trip length.
  const sorted = [...args.events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  const dates = Array.from(new Set(sorted.map((e) => e.date))).sort();
  const focus = isValidIsoDate(args.selectedDate) ? args.selectedDate : dates[0];
  const focusIdx = focus ? dates.indexOf(focus) : 0;
  const startIdx = Math.max(0, focusIdx - 2);
  const endIdx = Math.min(dates.length, startIdx + 5);
  const visibleDates = new Set(dates.slice(startIdx, endIdx));

  lines.push('\nPlanned events (showing days near the currently-viewed day):');
  let lastDate = '';
  for (const e of sorted) {
    if (!visibleDates.has(e.date)) continue;
    if (e.date !== lastDate) {
      const label = format(
        parse(e.date, 'yyyy-MM-dd', new Date()),
        'EEE, MMM d',
      );
      lines.push(`\n${label}:`);
      lastDate = e.date;
    }
    const time = `${formatTime(e.startTime)} – ${formatTime(e.endTime)}`;
    const where = e.venue
      ? ` @ ${e.venue}${e.deck != null ? ` (Deck ${e.deck})` : ''}`
      : '';
    const cat = e.category ? ` [${e.category}]` : '';
    lines.push(`  • ${time}${cat} ${e.title}${where}`);
    if (e.notes) {
      const trimmed = e.notes.replace(/\s+/g, ' ').slice(0, 120);
      lines.push(`    note: ${trimmed}`);
    }
  }

  return lines.join('\n');
}

export function Concierge() {
  const navigate = useNavigate();
  const apiKey = useAppStore((s) => s.apiKey);
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const cruise = useCruise(activeCruiseId);
  const events = useAllCruiseEvents();
  const members = useFamily();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const plannerContext = useMemo(
    () =>
      buildPlannerContext({
        cruiseName: cruise?.name,
        shipName: cruise?.shipName,
        startDate: cruise?.startDate,
        endDate: cruise?.endDate,
        selectedDate,
        members: members.map((m) => ({ name: m.name, isChild: m.isChild })),
        events: events.map((e) => ({
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          title: e.title,
          venue: e.venue,
          deck: e.deck,
          category: e.category,
          notes: e.notes,
        })),
      }),
    [cruise, events, members, selectedDate],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading) return;

    if (!apiKey) {
      // #79: surface an inline assistant message instead of silently no-op'ing.
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: messageText },
        {
          role: 'assistant',
          content:
            "I need a Gemini API key before I can chat. Tap 'Settings' below to add one — it's free and stays on this device.",
        },
      ]);
      setInput('');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: messageText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithConcierge(
        updatedMessages,
        apiKey,
        plannerContext,
      );

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I hit an error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // #90: navigate(-1) breaks on direct/refresh load (no history). Fall back
  // to the home tab so the back button always does something useful.
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div
      className="flex flex-col flex-1 min-h-0 max-w-lg w-full mx-auto"
      style={{ color: 'var(--fg-default)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-2 pb-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <button
          onClick={handleBack}
          className="p-1 press"
          style={{ color: 'var(--fg-muted)' }}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Cruise Concierge
          </h1>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-soft)' }}
            >
              <Sparkles className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Your Personal Cruise Concierge
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                Ask me anything about your cruise — dining, shows, excursions, and more!
              </p>
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full press"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-muted)',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[85%] rounded-2xl px-4 py-3"
              style={
                msg.role === 'user'
                  ? {
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-fg)',
                    }
                  : {
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--fg-default)',
                    }
              }
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--fg-muted)' }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No API key warning */}
      {!apiKey && (
        <div className="px-4 pb-2">
          <div
            className="p-3 rounded-xl"
            style={{
              backgroundColor: 'var(--warning-soft)',
              border: '1px solid var(--warning)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--warning)' }}>
              Add your Gemini API key in{' '}
              <button
                onClick={() => navigate('/settings')}
                className="underline font-medium"
              >
                Settings
              </button>{' '}
              to chat.
            </p>
          </div>
        </div>
      )}

      {/* Input area */}
      <div
        className="shrink-0 p-3 safe-bottom"
        style={{ borderTop: '1px solid var(--border-default)' }}
      >
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={apiKey ? 'Ask about activities, shows, dining...' : 'Add an API key in Settings to chat'}
            disabled={isLoading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 transition-opacity shrink-0 press"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
