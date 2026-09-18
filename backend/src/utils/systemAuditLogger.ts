/**
 * DevOps System & Infrastructure Audit Logging System.
 * Records all infrastructure-level state changes (who, what, when) to stdout / ops logs
 * with zero raw PII leakage.
 * 
 * Distinct from the product-facing PostgreSQL audit_trail table.
 */

export interface SystemAuditWho {
  userId: string;
  role: string;
  ip: string;
  userAgent?: string;
}

export interface SystemAuditWhat {
  action: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  resourceType?: string;
  resourceId?: string;
  stateChanges?: Record<string, unknown>;
  error?: string;
}

export interface SystemAuditRecord {
  timestamp: string;
  level: 'AUDIT';
  eventType: 'SYSTEM_STATE_CHANGE';
  who: SystemAuditWho;
  what: SystemAuditWhat;
  when: string;
}

// Regex patterns for sensitive PII
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const PHONE_REGEX = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
const CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
const JWT_OR_BEARER_REGEX = /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi;

const SENSITIVE_KEY_NAMES = new Set([
  'password',
  'passwd',
  'token',
  'jwt',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'creditcard',
  'cardnumber',
  'ssn',
  'email',
  'phonenumber',
  'phone',
]);

/**
 * Deeply redacts raw PII and credentials from strings, objects, and arrays.
 */
export function sanitizePii(value: any, depth = 0): any {
  if (depth > 8 || value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let sanitized = value
      .replace(JWT_OR_BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
      .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
      .replace(SSN_REGEX, '[REDACTED_SSN]')
      .replace(PHONE_REGEX, '[REDACTED_PHONE]')
      .replace(CARD_REGEX, '[REDACTED_CARD]');

    // Truncate excessively long strings (e.g. extracted text or file content)
    if (sanitized.length > 250) {
      sanitized = sanitized.substring(0, 250) + '... [TRUNCATED_TEXT]';
    }
    return sanitized;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePii(item, depth + 1));
  }

  if (typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
      if (SENSITIVE_KEY_NAMES.has(lowerKey)) {
        if (lowerKey.includes('email')) {
          cleaned[key] = '[REDACTED_EMAIL]';
        } else if (lowerKey.includes('phone')) {
          cleaned[key] = '[REDACTED_PHONE]';
        } else if (lowerKey.includes('ssn')) {
          cleaned[key] = '[REDACTED_SSN]';
        } else {
          cleaned[key] = '[REDACTED_SECRET]';
        }
      } else {
        cleaned[key] = sanitizePii(val, depth + 1);
      }
    }
    return cleaned;
  }

  return String(value);
}

// In-memory ring buffer of recent system audit logs for ops queries / verification
const MAX_LOG_BUFFER = 100;
const systemAuditBuffer: SystemAuditRecord[] = [];

export class SystemAuditLogger {
  public static logStateChange(record: {
    who: SystemAuditWho;
    what: SystemAuditWhat;
  }): SystemAuditRecord {
    const now = new Date().toISOString();

    const sanitizedWho: SystemAuditWho = {
      userId: record.who.userId || 'system',
      role: record.who.role || 'SYSTEM',
      ip: record.who.ip || '127.0.0.1',
      userAgent: record.who.userAgent ? sanitizePii(record.who.userAgent) : undefined,
    };

    const sanitizedWhat: SystemAuditWhat = {
      action: record.what.action,
      method: record.what.method,
      path: record.what.path,
      statusCode: record.what.statusCode,
      durationMs: record.what.durationMs,
      resourceType: record.what.resourceType,
      resourceId: record.what.resourceId,
      stateChanges: record.what.stateChanges ? sanitizePii(record.what.stateChanges) : undefined,
      error: record.what.error ? sanitizePii(record.what.error) : undefined,
    };

    const auditEntry: SystemAuditRecord = {
      timestamp: now,
      level: 'AUDIT',
      eventType: 'SYSTEM_STATE_CHANGE',
      who: sanitizedWho,
      what: sanitizedWhat,
      when: now,
    };

    // Store in ring buffer
    systemAuditBuffer.unshift(auditEntry);
    if (systemAuditBuffer.length > MAX_LOG_BUFFER) {
      systemAuditBuffer.pop();
    }

    // Output formatted structured JSON to stdout for container log ingestion (docker logs)
    console.log(`[SYSTEM_AUDIT] ${JSON.stringify(auditEntry)}`);

    return auditEntry;
  }

  public static getRecentLogs(limit = 20): SystemAuditRecord[] {
    return systemAuditBuffer.slice(0, Math.min(limit, systemAuditBuffer.length));
  }

  public static clearBuffer(): void {
    systemAuditBuffer.length = 0;
  }
}
