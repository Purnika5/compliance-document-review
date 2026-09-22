import { SearchEngineService, IRequestUser } from '../src/services/search-engine.service';
import { GrokCopilotService } from '../src/services/grok-copilot.service';

describe('Neural Compliance Copilot & Filterable Document Search Engine', () => {
  describe('SearchEngineService.parseDateRange()', () => {
    it('correctly parses "today" into beginning and end of today', () => {
      const range = SearchEngineService.parseDateRange('today');
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      expect(range.start!.getHours()).toBe(0);
      expect(range.end!.getHours()).toBe(23);
    });

    it('correctly parses "past 7 days"', () => {
      const range = SearchEngineService.parseDateRange('past 7 days');
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      const diffDays = Math.round((range.end!.getTime() - range.start!.getTime()) / (24 * 3600 * 1000));
      expect(diffDays).toBeGreaterThanOrEqual(7);
    });

    it('correctly parses "this month"', () => {
      const range = SearchEngineService.parseDateRange('this month');
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      expect(range.start!.getDate()).toBe(1);
    });

    it('correctly parses a 4-digit year like "2026"', () => {
      const range = SearchEngineService.parseDateRange('2026');
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      expect(range.start!.getFullYear()).toBe(2026);
      expect(range.start!.getMonth()).toBe(0);
      expect(range.end!.getFullYear()).toBe(2026);
      expect(range.end!.getMonth()).toBe(11);
    });

    it('correctly parses custom ISO date range string', () => {
      const range = SearchEngineService.parseDateRange('2026-03-01 to 2026-03-15');
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      expect(range.start!.getFullYear()).toBe(2026);
      expect(range.start!.getMonth()).toBe(2);
      expect(range.start!.getDate()).toBe(1);
      expect(range.end!.getFullYear()).toBe(2026);
      expect(range.end!.getMonth()).toBe(2);
      expect(range.end!.getDate()).toBe(15);
    });
  });

  describe('GrokCopilotService - Dual-Tier Fallback & Algorithmic Summary', () => {
    const mockAnalytics = {
      total_records: 4,
      latest_versions_only: true,
      by_status: {
        Approved: 2,
        'Needs Revision': 1,
        Pending: 1,
        Rejected: 0,
      },
      documents_with_revisions: 2,
      flagged_documents_count: 1,
    };

    const mockRecords = [
      {
        id: 'doc-1',
        title: 'Institutional Fund Pitch',
        status: 'Needs Revision' as const,
        version: 2,
        total_versions: 2,
        has_revisions: true,
        latest_doc_id: 'doc-1',
        advisor_id: 'adv-1',
        advisor_name: 'Keith Lachica',
        advisor_email: 'keith@springercapital.com',
        file_name: 'pitch.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        created_at: new Date().toISOString(),
        flags_count: 1,
        flags: [
          {
            rule: 'FINRA Rule 2210',
            passage: 'Guaranteed 20% annualized yields.',
            explanation: 'Promissory returns are prohibited.',
          },
        ],
      },
    ];

    it('generates rich algorithmic summary when AI APIs are unconfigured or offline', () => {
      const fallback = GrokCopilotService.generateAlgorithmicFallback(mockRecords, mockAnalytics);
      expect(fallback.engine).toBe('algorithmic-fallback');
      expect(fallback.greeting).toContain('Welcome back');
      expect(fallback.text).toContain('4 active documents');
      expect(fallback.text).toContain('2 Approved');
      expect(fallback.text).toContain('1 Needs Revision');
      expect(fallback.text).toContain('FINRA Rule 2210');
      expect(fallback.suggested_followups.length).toBeGreaterThan(0);
      expect(fallback.suggested_followups).toContain('Show files needing revision');
    });

    it('falls back seamlessly without throwing when Grok API is unreachable', async () => {
      // Calling generateConversationalSummary with no API key triggers fallback instantly
      const response = await GrokCopilotService.generateConversationalSummary(
        mockRecords,
        mockAnalytics,
        'Show my filings'
      );
      expect(response).toBeDefined();
      expect(['xai-grok', 'gemini-fallback', 'algorithmic-fallback']).toContain(response.engine);
      expect(response.text.length).toBeGreaterThan(10);
      expect(Array.isArray(response.suggested_followups)).toBe(true);
    });
  });

  describe('SearchEngineService Role Scoping & Lineage Integrity', () => {
    it('enforces advisor isolation condition', async () => {
      const advisorUser: IRequestUser = {
        id: 'advisor-uuid-1234',
        role: 'Advisor',
        name: 'John Doe',
        email: 'john@springer.capital',
      };

      // Mock query to verify parameterized SQL statement contains advisor_id constraint
      const poolModule = require('../src/db/pool');
      let capturedSql = '';
      let capturedValues: any[] = [];
      const querySpy = jest.spyOn(poolModule, 'query').mockImplementation(((...args: any[]) => {
        capturedSql = args[0] || '';
        capturedValues = args[1] || [];
        return Promise.resolve({ rows: [] } as any);
      }) as any);

      await SearchEngineService.executeSearch(
        { query: 'Portfolio Alpha', uploaded_by: 'someone-else' },
        advisorUser
      );

      querySpy.mockRestore();

      // Advisor must ALWAYS have d.advisor_id = user.id in WHERE clause
      expect(capturedSql).toContain('d.advisor_id = $1');
      expect(capturedValues[0]).toBe('advisor-uuid-1234');
    });

    it('allows Officer enterprise queries across advisors', async () => {
      const officerUser: IRequestUser = {
        id: 'officer-uuid-9999',
        role: 'Officer',
        name: 'Sarah Connor',
        email: 'sarah@springer.capital',
      };

      const poolModule = require('../src/db/pool');
      let capturedSql = '';
      let capturedValues: any[] = [];
      const querySpy = jest.spyOn(poolModule, 'query').mockImplementation(((...args: any[]) => {
        capturedSql = args[0] || '';
        capturedValues = args[1] || [];
        return Promise.resolve({ rows: [] } as any);
      }) as any);

      await SearchEngineService.executeSearch(
        { query: 'Portfolio', uploaded_by: 'Marcus Vance' },
        officerUser
      );

      querySpy.mockRestore();

      // Officer query should not restrict to officer's own ID; it should search advisor by name/email
      expect(capturedSql).not.toContain('d.advisor_id = $1');
      expect(capturedSql).toContain('u.name ILIKE');
      expect(capturedValues).toContain('%marcus vance%');
    });
  });
});
