/**
 * DOCU: Advisor usage quota service — tracks file analyses and AI chat messages per 4-day period.
 * Officers are never quota-limited. Quotas auto-reset after the period expires.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
import { query } from '../db/pool';

export interface QuotaStatus {
  allowed: boolean;
  /** 'file_analysis' | 'chat_message' */
  type: 'file_analysis' | 'chat_message';
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string; // ISO date string
  resetInDays: number;
}

export interface QuotaInfo {
  fileAnalyses: { used: number; limit: number; remaining: number };
  chatMessages: { used: number; limit: number; remaining: number };
  resetsAt: string;
  resetInDays: number;
}

export class QuotaService {
  private static readonly FILE_LIMIT = 2;
  private static readonly CHAT_LIMIT = 20;
  private static readonly PERIOD_DAYS = 4;

  /**
   * Fetches or initialises the quota row for a user, auto-resetting if the period has expired.
   */
  private static async getOrCreateQuota(userId: string): Promise<any> {
    // Upsert: create if missing, then fetch
    await query(
      `INSERT INTO user_quotas (user_id, file_analyses_limit, chat_messages_limit, period_started_at, period_resets_at)
       VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '${this.PERIOD_DAYS} days')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, this.FILE_LIMIT, this.CHAT_LIMIT]
    );

    const res = await query<any>('SELECT * FROM user_quotas WHERE user_id = $1', [userId]);
    let row = res.rows[0];

    // Auto-reset if the period has expired
    if (row && new Date(row.period_resets_at) <= new Date()) {
      const resetRes = await query<any>(
        `UPDATE user_quotas SET
           file_analyses_used  = 0,
           chat_messages_used  = 0,
           period_started_at   = NOW(),
           period_resets_at    = NOW() + INTERVAL '${this.PERIOD_DAYS} days',
           updated_at          = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId]
      );
      row = resetRes.rows[0];
    }

    return row;
  }

  /**
   * Checks whether a user is allowed to perform a file analysis.
   * Always returns allowed=true for Officers.
   */
  static async checkFileAnalysis(userId: string, userRole: string): Promise<QuotaStatus> {
    if (userRole === 'Officer') {
      return { allowed: true, type: 'file_analysis', used: 0, limit: 999, remaining: 999, resetsAt: '', resetInDays: 0 };
    }

    try {
      const row = await this.getOrCreateQuota(userId);
      const used: number = row.file_analyses_used;
      const limit: number = row.file_analyses_limit;
      const remaining = Math.max(0, limit - used);
      const resetsAt: string = new Date(row.period_resets_at).toISOString();
      const resetInDays = Math.ceil((new Date(row.period_resets_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        allowed: remaining > 0,
        type: 'file_analysis',
        used,
        limit,
        remaining,
        resetsAt,
        resetInDays: Math.max(1, resetInDays),
      };
    } catch (err) {
      console.warn('[QuotaService] checkFileAnalysis DB error, allowing through:', err);
      return { allowed: true, type: 'file_analysis', used: 0, limit: this.FILE_LIMIT, remaining: this.FILE_LIMIT, resetsAt: '', resetInDays: 4 };
    }
  }

  /**
   * Checks whether a user is allowed to send an AI chat message.
   * Always returns allowed=true for Officers.
   */
  static async checkChatMessage(userId: string, userRole: string): Promise<QuotaStatus> {
    if (userRole === 'Officer') {
      return { allowed: true, type: 'chat_message', used: 0, limit: 999, remaining: 999, resetsAt: '', resetInDays: 0 };
    }

    try {
      const row = await this.getOrCreateQuota(userId);
      const used: number = row.chat_messages_used;
      const limit: number = row.chat_messages_limit;
      const remaining = Math.max(0, limit - used);
      const resetsAt: string = new Date(row.period_resets_at).toISOString();
      const resetInDays = Math.ceil((new Date(row.period_resets_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        allowed: remaining > 0,
        type: 'chat_message',
        used,
        limit,
        remaining,
        resetsAt,
        resetInDays: Math.max(1, resetInDays),
      };
    } catch (err) {
      console.warn('[QuotaService] checkChatMessage DB error, allowing through:', err);
      return { allowed: true, type: 'chat_message', used: 0, limit: this.CHAT_LIMIT, remaining: this.CHAT_LIMIT, resetsAt: '', resetInDays: 4 };
    }
  }

  /**
   * Increments the file_analyses_used counter after a successful audit.
   */
  static async consumeFileAnalysis(userId: string, userRole: string): Promise<void> {
    if (userRole === 'Officer') return;
    try {
      await query(
        `UPDATE user_quotas SET file_analyses_used = file_analyses_used + 1, updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
    } catch (err) {
      console.warn('[QuotaService] consumeFileAnalysis DB error:', err);
    }
  }

  /**
   * Increments the chat_messages_used counter after a successful AI response.
   */
  static async consumeChatMessage(userId: string, userRole: string): Promise<void> {
    if (userRole === 'Officer') return;
    try {
      await query(
        `UPDATE user_quotas SET chat_messages_used = chat_messages_used + 1, updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
    } catch (err) {
      console.warn('[QuotaService] consumeChatMessage DB error:', err);
    }
  }

  /**
   * Returns a combined quota summary for both quota types (for UI display).
   */
  static async getQuotaInfo(userId: string, userRole: string): Promise<QuotaInfo | null> {
    if (userRole === 'Officer') return null;
    try {
      const row = await this.getOrCreateQuota(userId);
      const resetsAt = new Date(row.period_resets_at).toISOString();
      const resetInDays = Math.max(1, Math.ceil((new Date(row.period_resets_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return {
        fileAnalyses: {
          used: row.file_analyses_used,
          limit: row.file_analyses_limit,
          remaining: Math.max(0, row.file_analyses_limit - row.file_analyses_used),
        },
        chatMessages: {
          used: row.chat_messages_used,
          limit: row.chat_messages_limit,
          remaining: Math.max(0, row.chat_messages_limit - row.chat_messages_used),
        },
        resetsAt,
        resetInDays,
      };
    } catch (err) {
      console.warn('[QuotaService] getQuotaInfo DB error:', err);
      return null;
    }
  }
}
