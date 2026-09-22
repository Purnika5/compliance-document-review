import { config } from '../config';
import { ISearchAnalytics, ISearchRecord } from './search-engine.service';

export interface IConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ICopilotResponse {
  engine: 'xai-grok' | 'gemini-fallback' | 'algorithmic-fallback';
  greeting: string;
  text: string;
  suggested_followups: string[];
}

export class GrokCopilotService {
  /**
   * Generates a conversational compliance response using xAI Grok API with graceful dual-tier fallbacks.
   */
  public static async generateConversationalSummary(
    records: ISearchRecord[],
    analytics: ISearchAnalytics,
    userQuery?: string,
    conversationHistory?: IConversationMessage[]
  ): Promise<ICopilotResponse> {
    // 1. Attempt Grok API if API Key is configured
    if (config.xai.apiKey && config.xai.apiKey.trim().length > 0) {
      try {
        const grokResult = await this.callGrokApi(records, analytics, userQuery, conversationHistory);
        if (grokResult) {
          return grokResult;
        }
      } catch (err: any) {
        console.warn(`[GrokCopilotService] xAI Grok API call failed or timed out (${err?.message || err}). Falling back to secondary engine.`);
      }
    }

    // In test environment without explicit API key, avoid open network handles
    if (process.env.NODE_ENV === 'test' && !config.xai.apiKey) {
      return this.generateAlgorithmicFallback(records, analytics);
    }

    // 2. Attempt Gemini fallback service if configured
    try {
      const geminiResult = await this.callGeminiFallback(records, analytics, userQuery);
      if (geminiResult) {
        return geminiResult;
      }
    } catch (geminiErr: any) {
      // Proceed to algorithmic fallback
    }

    // 3. Guaranteed High-Fidelity Algorithmic Fallback
    return this.generateAlgorithmicFallback(records, analytics);
  }

  /**
   * Calls xAI Grok endpoint using standard OpenAI chat completions spec.
   */
  private static async callGrokApi(
    records: ISearchRecord[],
    analytics: ISearchAnalytics,
    userQuery?: string,
    conversationHistory?: IConversationMessage[]
  ): Promise<ICopilotResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.xai.timeoutMs);

    const systemPrompt = `You are Springer Capital's Neural Compliance Copilot.
You are analyzing live institutional document records, version histories, and regulatory audit flags.
Your goal is to converse naturally and concisely, delivering warm greetings, executive summaries,
and risk warnings based ONLY on the provided JSON data.
Highlight critical metrics (Approved vs Pending vs Needs Revision) and flag counts.
Format key items with markdown bolding and bullet points. Never fabricate data.`;

    const summaryPayload = {
      analytics,
      sample_records: records.slice(0, 5).map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        version: r.version,
        advisor: r.advisor_name,
        flags_count: r.flags_count,
        flags: r.flags.map((f) => ({ rule: f.rule, passage: f.passage, explanation: f.explanation })),
      })),
    };

    const messages: IConversationMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-4).forEach((msg) => {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    messages.push({
      role: 'user',
      content: `User query: "${userQuery || 'Summarize current search results'}"
Data Payload:
${JSON.stringify(summaryPayload, null, 2)}
Deliver a concise, executive conversational response explaining these findings. Also conclude with 2 or 3 recommended follow-up actions.`,
    });

    try {
      const response = await fetch(config.xai.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.xai.apiKey}`,
        },
        body: JSON.stringify({
          model: config.xai.model,
          messages,
          temperature: 0.2,
          max_tokens: 650,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`xAI Grok API error status: ${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();

      if (content) {
        const followups = this.extractFollowUps(analytics, content);
        return {
          engine: 'xai-grok',
          greeting: 'Greetings! Here is your Neural Copilot compliance briefing:',
          text: content,
          suggested_followups: followups,
        };
      }
    } finally {
      clearTimeout(timeout);
    }

    return null;
  }

  /**
   * Secondary fallback to internal Gemini pipeline if available.
   */
  private static async callGeminiFallback(
    records: ISearchRecord[],
    analytics: ISearchAnalytics,
    userQuery?: string
  ): Promise<ICopilotResponse | null> {
    if (!config.services.aiServiceUrl) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${config.services.aiServiceUrl}/copilot-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics, query: userQuery, record_count: records.length }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          return {
            engine: 'gemini-fallback',
            greeting: 'Springer Intelligence (Gemini Engine):',
            text: data.summary,
            suggested_followups: this.extractFollowUps(analytics),
          };
        }
      }
    } catch {
      // ignore
    } finally {
      clearTimeout(timeout);
    }

    return null;
  }

  /**
   * Deterministic, zero-latency algorithmic fallback guarantee.
   */
  public static generateAlgorithmicFallback(
    records: ISearchRecord[],
    analytics: ISearchAnalytics
  ): ICopilotResponse {
    const total = analytics.total_records;
    const { Approved, Pending, 'Needs Revision': needsRevision, Rejected } = analytics.by_status;

    let text = '';
    if (total === 0) {
      text = 'I scanned the institutional repository and found **no documents** matching your specified search criteria. Try broadening your date range or adjusting status filters.';
    } else {
      const statusParts: string[] = [];
      if (Approved > 0) statusParts.push(`**${Approved} Approved**`);
      if (Pending > 0) statusParts.push(`**${Pending} Pending**`);
      if (needsRevision > 0) statusParts.push(`**${needsRevision} Needs Revision**`);
      if (Rejected > 0) statusParts.push(`**${Rejected} Rejected**`);

      text = `I scanned your repository records. You currently have **${total} active document${total === 1 ? '' : 's'}** matching your query${
        statusParts.length > 0 ? ` (${statusParts.join(', ')})` : ''
      }.`;

      if (analytics.flagged_documents_count > 0) {
        text += `\n\n⚠️ **${analytics.flagged_documents_count} filing${
          analytics.flagged_documents_count === 1 ? '' : 's'
        }** contain active compliance warnings under **FINRA Rule 2210** or **SEC Rule 206** standards.`;
      }

      if (analytics.documents_with_revisions > 0) {
        text += `\n\n🔄 **${analytics.documents_with_revisions} filing${
          analytics.documents_with_revisions === 1 ? '' : 's'
        }** possess multi-version revision histories.`;
      }
    }

    return {
      engine: 'algorithmic-fallback',
      greeting: 'Welcome back! Here is your requested compliance overview:',
      text,
      suggested_followups: this.extractFollowUps(analytics),
    };
  }

  /**
   * Generates dynamic contextual follow-up prompts.
   */
  private static extractFollowUps(analytics: ISearchAnalytics, textContent?: string): string[] {
    const followups: string[] = [];

    if (analytics.by_status['Needs Revision'] > 0) {
      followups.push('Show files needing revision');
    }
    if (analytics.flagged_documents_count > 0) {
      followups.push('Show flagged passages');
    }
    if (analytics.documents_with_revisions > 0) {
      followups.push('View version 2 revisions');
    }
    if (analytics.by_status.Rejected > 0) {
      followups.push('Filter only Rejected');
    }
    if (analytics.by_status.Pending > 0 && followups.length < 3) {
      followups.push('Filter only Pending');
    }

    if (followups.length === 0) {
      followups.push('Show all recent filings', 'Filter by this month');
    }

    return followups.slice(0, 3);
  }
}
