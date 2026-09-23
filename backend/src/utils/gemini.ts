/**
 * DOCU: Robust Google Gemini LLM API client with multi-model fallback resilience.
 * Supported active models: gemini-3.6-flash, gemini-3.5-flash, gemini-3.1-flash-lite.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */

export const ACTIVE_GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
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
    const rawKey = process.env.GEMINI_API_KEY?.trim();
    if (!rawKey || rawKey.includes('your_gemini') || rawKey.includes('test-ci')) {
      return null;
    }

    const timeoutMs = options.timeoutMs ?? 20000;

    for (const model of ACTIVE_GEMINI_MODELS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${rawKey}`;
        const payload: Record<string, unknown> = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };

        if (options.systemInstruction) {
          payload.system_instruction = { parts: [{ text: options.systemInstruction }] };
        }

        const generationConfig: Record<string, unknown> = {};
        if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;
        if (options.temperature !== undefined) generationConfig.temperature = options.temperature;
        if (options.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = options.maxOutputTokens;

        if (Object.keys(generationConfig).length > 0) {
          payload.generationConfig = generationConfig;
        }

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
          // Try next model if 404 (model retired) or 503 (high demand) or 429
          continue;
        }

        const data = (await response.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string' && text.trim().length > 0) {
          return { text: text.trim(), model };
        }
      } catch (err: any) {
        clearTimeout(timer);
        console.warn(`[GeminiClient] Attempt with model ${model} failed: ${err.message}`);
      }
    }

    return null;
  }
}
