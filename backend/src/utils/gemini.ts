/**
 * DOCU: Robust Google Gemini LLM API client with multi-model fallback resilience.
 * Supported active models: gemini-3.6-flash, gemini-3.5-flash, gemini-3.1-flash-lite.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */

export const ACTIVE_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

/**
 * Strips markdown code fences (```json ... ``` or ``` ... ```) that models
 * sometimes emit even when responseMimeType is application/json.
 */
export function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface GeminiGenerateResult {
  text: string;
  model: string;
}

export class GeminiClient {
  public static async generateContent(
    prompt: string,
    options: GeminiGenerateOptions = {}
  ): Promise<GeminiGenerateResult | null> {
    const rawKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GEMINI_KEY ||
      'AQ.Ab8RN6K25AMITEVj7ZHf0vuU86-YQzdmYfj6uRfe7q-1EqEW9w'
    ).trim();
    if (!rawKey || rawKey.includes('your_gemini') || rawKey.includes('test-ci')) {
      return null;
    }

    const timeoutMs = options.timeoutMs ?? 25000;

    // Build multi-turn contents if conversationHistory is provided
    const rawContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      for (const msg of options.conversationHistory) {
        if (!msg.content || !msg.content.trim()) continue;
        const role = msg.role === 'user' ? 'user' : 'model';
        rawContents.push({
          role,
          parts: [{ text: msg.content.trim() }],
        });
      }
    }

    // Append the current turn
    rawContents.push({
      role: 'user',
      parts: [{ text: prompt.trim() }],
    });

    // Sanitize contents so consecutive turns of the same role are merged (required by Gemini API)
    const sanitizedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const item of rawContents) {
      const prev = sanitizedContents[sanitizedContents.length - 1];
      if (prev && prev.role === item.role) {
        prev.parts[0].text += '\n\n' + item.parts[0].text;
      } else {
        sanitizedContents.push({
          role: item.role,
          parts: [{ text: item.parts[0].text }],
        });
      }
    }

    for (const model of ACTIVE_GEMINI_MODELS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${rawKey}`;
        const payload: Record<string, unknown> = {
          contents: sanitizedContents,
        };

        if (options.systemInstruction) {
          payload.system_instruction = { parts: [{ text: options.systemInstruction }] };
        }

        const generationConfig: Record<string, unknown> = {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 1500,
        };
        if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;

        payload.generationConfig = generationConfig;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[GeminiClient] Model ${model} returned HTTP ${response.status}: ${errText.slice(0, 100)}`);
          // Try next model if 404, 503, 429
          continue;
        }

        const data = (await response.json()) as any;
        const parts = data?.candidates?.[0]?.content?.parts;
        let text = '';
        if (Array.isArray(parts) && parts.length > 0) {
          // In thinking models, part 0 may be thoughts (thought: true), so extract the non-thought response
          const answerPart = parts.find((p: any) => !p.thought && p.text);
          text = (answerPart ? answerPart.text : (parts[parts.length - 1]?.text || '')).trim();
        }

        if (text && typeof text === 'string' && text.length > 0) {
          return { text, model };
        }
      } catch (err: any) {
        clearTimeout(timer);
        console.warn(`[GeminiClient] Attempt with model ${model} failed: ${err.message}`);
      }
    }

    return null;
  }
}
