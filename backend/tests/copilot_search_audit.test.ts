import { SearchEngineService } from '../src/services/search-engine.service';
import { GeminiCopilotService } from '../src/services/gemini-copilot.service';
import { GrokChatbotService } from '../src/services/grok-chatbot.service';

describe('Neural Compliance Copilot - Search & Audit Services', () => {
  describe('SearchEngineService.resolveDateRange', () => {
    it('should resolve natural language "today" into current day boundaries', () => {
      const { startDate, endDate } = SearchEngineService.resolveDateRange('today');
      expect(startDate).not.toBeNull();
      expect(endDate).not.toBeNull();
      expect(startDate!.getHours()).toBe(0);
      expect(endDate!.getHours()).toBe(23);
    });

    it('should resolve "past 7 days" and "past 30 days"', () => {
      const p7 = SearchEngineService.resolveDateRange('past 7 days');
      expect(p7.startDate).not.toBeNull();
      expect(p7.endDate).not.toBeNull();
      expect(p7.endDate!.getTime() - p7.startDate!.getTime()).toBeGreaterThan(6 * 24 * 3600 * 1000);

      const p30 = SearchEngineService.resolveDateRange('past 30 days');
      expect(p30.endDate!.getTime() - p30.startDate!.getTime()).toBeGreaterThan(28 * 24 * 3600 * 1000);
    });

    it('should resolve "this month" and "last month"', () => {
      const tm = SearchEngineService.resolveDateRange('this month');
      expect(tm.startDate).not.toBeNull();
      expect(tm.startDate!.getDate()).toBe(1);

      const lm = SearchEngineService.resolveDateRange('last month');
      expect(lm.startDate).not.toBeNull();
      expect(lm.startDate!.getDate()).toBe(1);
    });

    it('should resolve specific years and ISO date intervals', () => {
      const yr = SearchEngineService.resolveDateRange('2026');
      expect(yr.startDate!.getFullYear()).toBe(2026);
      expect(yr.endDate!.getFullYear()).toBe(2026);

      const interval = SearchEngineService.resolveDateRange('2026-01-01 to 2026-03-31');
      expect(interval.startDate).not.toBeNull();
      expect(interval.endDate).not.toBeNull();
      expect(interval.startDate!.getMonth()).toBe(0);
      expect(interval.endDate!.getMonth()).toBe(2);
    });

    it('should return nulls for "all time" or empty range', () => {
      const allTime = SearchEngineService.resolveDateRange('all time');
      expect(allTime.startDate).toBeNull();
      expect(allTime.endDate).toBeNull();
    });
  });

  describe('GeminiCopilotService.localRegulatoryFallback', () => {
    it('should audit promissory language under FINRA Rule 2210 and SEC Rule 206', () => {
      const draft = 'Our proprietary algorithmic system guarantees a net annualized return of 24% without downside market risk for institutional clients.';
      const result = GeminiCopilotService.localRegulatoryFallback(draft, 'High_Growth_Proposal.docx');

      expect(result.audit_breakdown.length).toBeGreaterThanOrEqual(1);
      expect(result.remediated_text).not.toContain('guarantees a net annualized return of 24% without downside market risk');
      expect(result.remediated_text).toContain('targets an annualized return benchmark of 24%');
      expect(result.remediated_text).toContain('loss of principal');
      expect(result.suggested_title).toContain('Compliance Remediated');

      const finraFlag = result.audit_breakdown.find((b: any) => b.rule.includes('FINRA Rule 2210'));
      expect(finraFlag).toBeDefined();
      expect(finraFlag.reason).toBeDefined();
    });

    it('should append mandatory statutory fiduciary risk disclaimers if absent', () => {
      const draft = 'Portfolio recommendation for balanced growth strategy.';
      const result = GeminiCopilotService.localRegulatoryFallback(draft, 'Strategy_Doc.txt');

      expect(result.remediated_text).toContain('Institutional Regulatory Disclosure (FINRA Rule 2210 / SEC Rule 206)');
      expect(result.remediated_text).toContain('loss of principal');
    });
  });

  describe('GrokChatbotService - Scanned Document Findings Grounding', () => {
    it('should ground follow-up queries to the currently scanned draft and list all findings with severity, rules and remediation', async () => {
      jest.spyOn(GrokChatbotService, 'callLlm').mockResolvedValue(null);

      const mockScannedDoc = {
        fileName: 'Institutional_Growth_Strategy_2026.docx',
        summary: 'Audit completed with 2 findings.',
        auditBreakdown: [
          {
            rule: 'FINRA Rule 2210(d)(1)(B)',
            original_passage: 'We guarantee a 15% net return for all clients.',
            issue: 'Promissory return guarantee',
            fixed_passage: 'Our target annualized return benchmark is 15%.',
            reason: 'FINRA Rule 2210 prohibits promissory guarantees.',
            category: 'PROHIBITED_CLAIM',
          },
          {
            rule: 'SEC Rule 206(4)-1',
            original_passage: 'High yield allocation with zero principal loss risk.',
            issue: 'Total omission of downside risk disclosures',
            fixed_passage: 'Investments are subject to market risks, including possible loss of principal.',
            reason: 'Mandatory downside risk disclosure under SEC Rule 206.',
            category: 'MISSING_DISCLOSURE',
          },
        ],
      };

      const res = await GrokChatbotService.processMessage({
        message: 'list all 9 findings with severity, applicable rules and remediation',
        user: { role: 'Advisor', id: 'adv-123' },
        scannedDocument: mockScannedDoc,
      });

      expect(res.intent).toBe('scanned_document_findings');
      expect(res.reply).toContain('FINRA Rule 2210');
      expect(res.reply).toContain('SEC Rule 206');
      expect(res.reply).toContain('HIGH');
      expect(res.reply).toContain('MEDIUM');
      expect(res.reply).toContain('We guarantee a 15% net return');
      expect(res.reply).toContain('Our target annualized return benchmark');
    });
  });
});
