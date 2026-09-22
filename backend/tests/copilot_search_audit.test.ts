import { SearchEngineService } from '../src/services/search-engine.service';
import { GeminiCopilotService } from '../src/services/gemini-copilot.service';

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
});
