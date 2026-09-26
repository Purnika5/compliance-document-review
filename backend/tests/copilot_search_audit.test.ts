import { SearchEngineService } from '../src/services/search-engine.service';
import { GeminiCopilotService } from '../src/services/gemini-copilot.service';
import { GrokChatbotService } from '../src/services/grok-chatbot.service';
import { PipelineService } from '../src/services/pipeline.service';

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

  describe('PipelineService.auditDocumentRules', () => {
    it('should extract authentic full sentences and NEVER output placeholder strings', () => {
      const sampleDocText = `
        Ms. Whitfield can expect a guaranteed return of 18% annualized on this structured credit sleeve regardless of market downturns.
        We have achieved an audited 45% return year-to-date across all discretionary managed portfolios.
        Client testimonials consistently praise our risk-free execution.
      `;

      const { flags, summary, remediatedText } = PipelineService.auditDocumentRules(sampleDocText);
      expect(flags.length).toBeGreaterThanOrEqual(3);
      expect(summary).toBeDefined();
      expect(remediatedText).toBeDefined();

      for (const flag of flags) {
        expect(flag.passage).not.toContain('[Promissory statement detected');
        expect(flag.passage).not.toContain('[Client testimonial');
        expect(flag.passage).not.toContain('[Performance claim');
        expect(flag.passage.length).toBeGreaterThan(15);
      }

      // Check that the guaranteed return sentence preserved the honorific "Ms. Whitfield"
      const promissoryFlag = flags.find((f: any) => f.passage.includes('guaranteed return'));
      expect(promissoryFlag).toBeDefined();
      expect(promissoryFlag!.passage).toContain('Ms. Whitfield');
      expect(promissoryFlag!.passage).toContain('regardless of market downturns');
      expect(promissoryFlag!.rule).toContain('FINRA Rule 2210');
      expect(promissoryFlag!.severity).toBe('HIGH');
      expect(promissoryFlag!.fixed_passage).toBeDefined();
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

  describe('PipelineService.extractText - PDF and TXT Support', () => {
    it('should successfully extract text from plain text buffer with or without path', async () => {
      const txtContent = 'Client proposal: We target 8% annualized yield under strict risk controls.';
      const buf = Buffer.from(txtContent, 'utf-8');

      const extracted1 = await PipelineService.extractText('sample_proposal.txt', 'text/plain', buf);
      expect(extracted1).toBe(txtContent);

      const extracted2 = await PipelineService.extractText('', 'text/plain; charset=utf-8', buf);
      expect(extracted2).toBe(txtContent);

      const extracted3 = await PipelineService.extractText('notes.txt', 'application/octet-stream', buf);
      expect(extracted3).toBe(txtContent);
    });

    it('should extract text from PDF streams and objects using fallback parser', async () => {
      // Minimal valid PDF text stream
      const mockPdfContent = '%PDF-1.4\n1 0 obj\n<< /Length 50 >>\nstream\nBT /F1 12 Tf (Institutional Investment Plan with 15% return) Tj ET\nendstream\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n100\n%%EOF';
      const pdfBuf = Buffer.from(mockPdfContent, 'latin1');

      const rawExtracted = PipelineService.extractRawPdfText(pdfBuf);
      expect(rawExtracted).toContain('Institutional Investment Plan with 15% return');

      const extracted = await PipelineService.extractText('Client_Plan.pdf', 'application/pdf', pdfBuf);
      expect(extracted).toContain('Institutional Investment Plan with 15% return');
    });
  });

  describe('PipelineService.cleanRemediatedDocumentForDownload', () => {
    it('should remove all findings, severity ratings, and issues from downloaded remediated documents', () => {
      const sampleAuditReport = `
MERIDIAN OAK WEALTH ADVISORS, LLC
COMPLIANCE AUDIT REPORT
Report Date: September 23, 2026
Audit Status: Findings identified — see Section 2

1. Executive Summary
This report documents a compliance and suitability review. The review identified nine findings spanning suitability analysis, disclosure completeness, sales practice, and data handling. Five findings are rated High severity and warrant remediation and supervisory review before the recommendation is executed or, if already executed, before further client transactions proceed. The findings are summarized in Section 2 and detailed individually in Section 3.
Findings should be routed to qualified compliance and legal counsel for a formal suitability and regulatory determination.

2. Summary of Findings
Ref.
Finding
Section Referenced
Severity
F-1
Liquidity need inconsistent with product surrender terms
Section 2 (Current Situation); Section 3 (Recommendation)
High
F-2
Potentially misleading guarantee and return language
Section 3 (Recommendation)
High

3. Detailed Findings
F-1 — Liquidity need inconsistent with product surrender terms
Severity: High
Section(s) Referenced: Section 2 (Current Situation); Section 3 (Recommendation)
The client profile states a need for partial access to funds in approximately five years.

4. Recommendations
Route this file to supervisory/principal review before the transfer paperwork is executed.
Request the carrier's current product illustration and disclosure document.

5. Scope and Limitations
This review was limited to the four corners of the single recommendation letter provided.
      `;

      const cleaned = PipelineService.cleanRemediatedDocumentForDownload(sampleAuditReport);

      // Verify all finding markers and severity ratings are completely absent
      expect(cleaned).not.toContain('Severity: High');
      expect(cleaned).not.toContain('Findings identified — see Section 2');
      expect(cleaned).not.toContain('Summary of Findings');
      expect(cleaned).not.toContain('Detailed Findings');
      expect(cleaned).not.toContain('F-1');
      expect(cleaned).not.toContain('Five findings are rated High severity');

      // Verify compliant institutional remediation language is present
      expect(cleaned).toContain('Audit Status: Verified & Compliant');
      expect(cleaned).toContain('2. Remediation & Fiduciary Standards Summary');
      expect(cleaned).toContain('3. Supervisory Approval & Regulatory Attestation');
      expect(cleaned).toContain('Scope and Limitations');
    });
  });
});

