import { SystemAuditLogger, sanitizePii } from '../src/utils/systemAuditLogger';

describe('DevOps System Audit Logging & PII Redaction', () => {
  beforeEach(() => {
    SystemAuditLogger.clearBuffer();
  });

  describe('sanitizePii', () => {
    it('should redact email addresses in strings', () => {
      const input = 'User contact is advisor.john@example.com for review';
      const output = sanitizePii(input);
      expect(output).not.toContain('advisor.john@example.com');
      expect(output).toContain('[REDACTED_EMAIL]');
    });

    it('should redact Social Security Numbers (SSN)', () => {
      const input = 'Client SSN is 123-45-6789 confidential';
      const output = sanitizePii(input);
      expect(output).not.toContain('123-45-6789');
      expect(output).toContain('[REDACTED_SSN]');
    });

    it('should redact phone numbers', () => {
      const input = 'Call the compliance desk at 555-123-4567';
      const output = sanitizePii(input);
      expect(output).not.toContain('555-123-4567');
      expect(output).toContain('[REDACTED_PHONE]');
    });

    it('should redact Bearer and JWT tokens in headers or strings', () => {
      const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const output = sanitizePii(input);
      expect(output).not.toContain('eyJhbGci');
      expect(output).toContain('Bearer [REDACTED_TOKEN]');
    });

    it('should redact sensitive keys in nested objects without leaking values', () => {
      const payload = {
        username: 'advisor1',
        password: 'SuperSecretPassword!123',
        token: 'secret-auth-token',
        nested: {
          email: 'officer@firm.com',
          ssn: '987-65-4321',
          notes: 'Customer phone 212-555-0199 discussed risk',
        },
      };

      const sanitized = sanitizePii(payload);

      expect(sanitized.password).toBe('[REDACTED_SECRET]');
      expect(sanitized.token).toBe('[REDACTED_SECRET]');
      expect(sanitized.nested.email).toBe('[REDACTED_EMAIL]');
      expect(sanitized.nested.ssn).toBe('[REDACTED_SSN]');
      expect(sanitized.nested.notes).toContain('[REDACTED_PHONE]');
      expect(sanitized.nested.notes).not.toContain('212-555-0199');
    });

    it('should truncate excessively long text blocks to prevent raw document dumps in logs', () => {
      const longText = 'A'.repeat(500);
      const output = sanitizePii(longText);
      expect(output.length).toBeLessThan(300);
      expect(output).toContain('[TRUNCATED_TEXT]');
    });
  });

  describe('SystemAuditLogger', () => {
    it('should record state changes with who, what, when structure', () => {
      const record = SystemAuditLogger.logStateChange({
        who: {
          userId: 'usr-123',
          role: 'OFFICER',
          ip: '192.168.1.10',
          userAgent: 'Mozilla/5.0',
        },
        what: {
          action: 'DOCUMENT_STATUS_UPDATE',
          method: 'PATCH',
          path: '/documents/doc-abc/status',
          statusCode: 200,
          durationMs: 42,
          resourceType: 'document',
          resourceId: 'doc-abc',
          stateChanges: {
            previousStatus: 'PENDING',
            newStatus: 'APPROVED',
            reviewerEmail: 'officer@example.com',
          },
        },
      });

      expect(record.level).toBe('AUDIT');
      expect(record.eventType).toBe('SYSTEM_STATE_CHANGE');
      expect(record.who.userId).toBe('usr-123');
      expect(record.what.action).toBe('DOCUMENT_STATUS_UPDATE');
      expect(record.what.stateChanges?.newStatus).toBe('APPROVED');
      expect((record.what.stateChanges as any)?.reviewerEmail).toBe('[REDACTED_EMAIL]');
      expect(record.timestamp).toBeDefined();
      expect(record.when).toBeDefined();

      const recent = SystemAuditLogger.getRecentLogs();
      expect(recent.length).toBe(1);
      expect(recent[0].what.action).toBe('DOCUMENT_STATUS_UPDATE');
    });
  });
});
