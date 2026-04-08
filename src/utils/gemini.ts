const GEMINI_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiRequest {
  systemInstruction?: { parts: GeminiPart[] };
  contents: GeminiContent[];
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
}

async function geminiRequest(
  model: string,
  apiKey: string,
  body: GeminiRequest,
): Promise<GeminiResponse> {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg =
      (err as { error?: { message?: string } }).error?.message ||
      `Gemini API error ${resp.status}`;
    throw new Error(msg);
  }
  return resp.json() as Promise<GeminiResponse>;
}

// ── Extract events from cruise planner photos ──────────────────────────

interface ImageInput {
  data: string;
  mediaType: string;
}

export interface ExtractedEventData {
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  venue: string;
  deck: number | null;
  notes: string;
}

export interface ExtractionResult {
  date: string | null;
  events: ExtractedEventData[];
  rawText: string;
  error?: string;
}

export async function extractEventsFromImages(
  images: ImageInput[],
  apiKey: string,
  cruiseDate: string,
): Promise<ExtractionResult> {
  const parts: GeminiPart[] = [];

  for (const img of images) {
    parts.push({
      inlineData: { mimeType: img.mediaType, data: img.data },
    });
  }

  parts.push({
    text: `You are analyzing cruise ship daily planner/newsletter images (like a "Cruise Compass" or "Fun Times").

Extract ALL activities, events, shows, dining times, and anything scheduled into structured JSON.

For each event, extract:
- title: the event name
- startTime: in 24h format "HH:mm" (e.g. "14:30")
- endTime: in 24h format "HH:mm" (estimate 1 hour if not specified)
- category: one of "dining", "entertainment", "excursion", "kids-club", "reservation", "personal", "reminder"
- venue: the location/venue name
- deck: deck number if mentioned (number or null)
- notes: any extra details (dress code, age restrictions, cost, etc.)

${cruiseDate ? `The date for these events is: ${cruiseDate}` : 'If you can determine the date from the image, include it.'}

Respond ONLY with a JSON object in this exact format:
{
  "date": "${cruiseDate || 'YYYY-MM-DD or null if unknown'}",
  "events": [
    {
      "title": "string",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "category": "string",
      "venue": "string",
      "deck": null,
      "notes": "string"
    }
  ],
  "rawText": "The full text content extracted from the image for reference"
}`,
  });

  const result = await geminiRequest('gemini-2.0-flash', apiKey, {
    contents: [{ parts }],
    generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
  });

  const text =
    result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [
      null,
      text,
    ];
    return JSON.parse(jsonMatch[1]!.trim()) as ExtractionResult;
  } catch {
    return {
      events: [],
      date: null,
      rawText: text,
      error: 'Could not parse structured events',
    };
  }
}

// ── Chat concierge ─────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithConcierge(
  messages: ChatMessage[],
  apiKey: string,
  plannerContext: string,
): Promise<string> {
  const systemInstruction = `You are CruiseFlow Concierge — a friendly, knowledgeable personal cruise assistant.

You have access to the following cruise daily planner data that was extracted from photos the user uploaded:

<cruise_planner_data>
${plannerContext || 'No planner data uploaded yet.'}
</cruise_planner_data>

Your role:
- Answer questions about today's activities, showtimes, dining options, entertainment, kids activities, etc.
- Make personalized recommendations based on interests (e.g. "what should we do with the kids this afternoon?")
- Help plan the day by suggesting an itinerary
- Provide tips about venues, deck locations, and timing
- Be enthusiastic but concise — people are on vacation and want quick answers
- If asked about something not in the planner data, say you don't have that info but offer general cruise advice
- When suggesting events, include the time and venue so they can easily add them to their schedule
- Format times in 12-hour format for readability

Keep responses concise and practical. You're helping someone enjoy their cruise, not writing an essay.`;

  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const result = await geminiRequest('gemini-2.0-flash', apiKey, {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  });

  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
