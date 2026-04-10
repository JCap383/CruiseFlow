import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { chatWithConcierge } from '@/utils/gemini';

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

export function Concierge() {
  const navigate = useNavigate();
  const { apiKey } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const plannerContext = '';

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    if (!apiKey) return;

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

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-lg w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-2 pb-2 border-b border-cruise-border shrink-0">
        <button onClick={() => navigate(-1)} className="text-cruise-muted p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ocean-400" />
            Cruise Concierge
          </h1>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-16 h-16 bg-ocean-500/15 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-ocean-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Your Personal Cruise Concierge
              </h2>
              <p className="text-sm text-cruise-muted mt-1">
                Ask me anything about your cruise — dining, shows, excursions, and more!
              </p>
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs bg-cruise-card border border-cruise-border px-3 py-1.5 rounded-full text-cruise-muted hover:text-cruise-text hover:border-ocean-500/30 transition-colors"
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
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-ocean-500 text-white'
                  : 'bg-cruise-card border border-cruise-border text-cruise-text'
              }`}
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
            <div className="bg-cruise-card border border-cruise-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-cruise-muted">
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
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm text-amber-300">
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
      <div className="shrink-0 border-t border-cruise-border p-3 safe-bottom">
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about activities, shows, dining..."
            disabled={!apiKey || isLoading}
            className="flex-1 bg-cruise-card border border-cruise-border rounded-xl px-4 py-2.5 text-sm text-cruise-text placeholder:text-cruise-muted/50 focus:outline-none focus:border-ocean-500 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading || !apiKey}
            className="w-10 h-10 bg-ocean-500 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-opacity shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
