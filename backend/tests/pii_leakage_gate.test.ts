import { PipelineService } from '../src/services/pipeline.service';
import { config } from '../src/config';

describe('Automated PII Leakage CI Security Gate', () => {
  // Save original fetch to restore after tests
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Outbound AI Payload Leakage Verification
  // ---------------------------------------------------------------------------
  it('SECURITY GATE: Outgoing AI payload must contain ZERO unmasked PII entities', async () => {
    let interceptedAiPayload: any = null;

    // Spy on global fetch to capture the exact payload sent to the third-party AI API
    global.fetch = jest.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url;

      // Mock PII Masker service response
      if (url.includes('/mask')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            document_id: 'doc-sec-001',
            version: 1,
            masked_text:
              'Meeting with [NAME_1]. Contact: [EMAIL_1] or [PHONE_1]. ' +
              'SSN is [SSN_1]. Account: [ACCOUNT_1]. Card: [CARD_1]. ' +
              'Residence at [ADDRESS_1]. FINRA Rule 206 disclosure reviewed.',
          }),
        } as any;
      }

      // Intercept outgoing call to third-party AI service
      if (url.includes('/analyze')) {
        interceptedAiPayload = JSON.parse(init?.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            summary: 'Compliance review completed on sanitized text.',
            flags: [],
          }),
        } as any;
      }

      // Mock retrieval endpoint
      if (url.includes('/retrieve')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ retrieved_rules: [], precedents: [] }),
        } as any;
      }

      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const rawPiiContent =
      'Meeting with Dr. Jane Doe. Contact: jane.doe@example.com or 555-123-4567. ' +
      'SSN is 123-45-6789. Account: ACCT-987654321. Card: 4111-2222-3333-4444. ' +
      'Residence at 123 Main Street, Suite 400. FINRA Rule 206 disclosure reviewed.';

    // Execute pipeline masking
    const maskedText = await PipelineService.maskPii('doc-sec-001', 1, rawPiiContent);

    // Dispatch to AI
    await PipelineService.analyzeWithAi('doc-sec-001', 1, maskedText);

    // Assert that the third-party API payload was intercepted
    expect(interceptedAiPayload).not.toBeNull();
    const sentText = interceptedAiPayload.masked_text;

    // Strict assertions: NONE of the raw sensitive values should appear in outgoing payload
    expect(sentText).not.toContain('123-45-6789');
    expect(sentText).not.toContain('jane.doe@example.com');
    expect(sentText).not.toContain('555-123-4567');
    expect(sentText).not.toContain('4111-2222-3333-4444');
    expect(sentText).not.toContain('ACCT-987654321');
    expect(sentText).not.toContain('123 Main Street');

    // Assert that structured, deterministic platform placeholders are present
    expect(sentText).toContain('[NAME_1]');
    expect(sentText).toContain('[SSN_1]');
    expect(sentText).toContain('[EMAIL_1]');
    expect(sentText).toContain('[PHONE_1]');
    expect(sentText).toContain('[CARD_1]');

    // Run programmatic PII leakage detection tool on intercepted payload
    const leakCheck = PipelineService.detectPiiLeakage(sentText);
    expect(leakCheck.hasLeakage).toBe(false);
    expect(leakCheck.detectedEntities).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Assertive Outgoing Gate Blocks Unmasked Payloads
  // ---------------------------------------------------------------------------
  it('SECURITY GATE: Directly blocks transmission and throws error if unmasked PII reaches analyzeWithAi', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;

    const unmaskedPayload =
      'CONFIDENTIAL: Client John Smith, SSN: 987-65-4321, email: jsmith@springercapital.com. ' +
      'Card: 4111-2222-3333-4444.';

    // Attempting to send unmasked text directly to analyzeWithAi MUST fail the security gate
    await expect(
      PipelineService.analyzeWithAi('leak-doc-001', 1, unmaskedPayload)
    ).rejects.toThrow(/SECURITY_GATE_VIOLATION/);

    // Verify that NO outbound HTTP request was ever sent to the third-party AI API
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 3: Microservice Down / Network Outage Fail-Safe Masking
  // ---------------------------------------------------------------------------
  it('SECURITY GATE: Applies in-process fallback sanitizer if remote PII Masker service is offline', async () => {
    let outgoingAiPayload: any = null;

    global.fetch = jest.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url;

      // Simulate PII Masker service connection failure / 500 error
      if (url.includes('/mask')) {
        return {
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        } as any;
      }

      if (url.includes('/analyze')) {
        outgoingAiPayload = JSON.parse(init?.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({ summary: 'Fallback review completed.', flags: [] }),
        } as any;
      }

      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const sensitiveContent =
      'Dear Robert Taylor, please verify SSN 123-45-6789 and email robert@springercapital.com.';

    // Run maskPii during outage
    const masked = await PipelineService.maskPii('outage-doc', 1, sensitiveContent);

    // Fallback sanitizer must have replaced raw PII
    expect(masked).not.toContain('123-45-6789');
    expect(masked).not.toContain('robert@springercapital.com');
    expect(masked).toContain('[SSN_FALLBACK]');
    expect(masked).toContain('[EMAIL_FALLBACK]');

    // Dispatch to AI with fallback-masked text
    await PipelineService.analyzeWithAi('outage-doc', 1, masked);

    expect(outgoingAiPayload).not.toBeNull();
    expect(outgoingAiPayload.masked_text).not.toContain('123-45-6789');
    expect(outgoingAiPayload.masked_text).not.toContain('robert@springercapital.com');

    // Run PII leakage verification on the intercepted payload
    const leakCheck = PipelineService.detectPiiLeakage(outgoingAiPayload.masked_text);
    expect(leakCheck.hasLeakage).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Comprehensive PII Detector Accuracy
  // ---------------------------------------------------------------------------
  it('PII Leakage Detector correctly flags unmasked entities and passes properly masked tokens', () => {
    // 1. Text with raw PII must be flagged
    const dirtyText =
      'Advisor Marcus Vance met with customer. Email is test@example.com, SSN is 000-11-2222, phone is 800-555-0199, card: 4111 2222 3333 4444.';
    const dirtyResult = PipelineService.detectPiiLeakage(dirtyText);
    expect(dirtyResult.hasLeakage).toBe(true);
    expect(dirtyResult.detectedEntities.some((e) => e.startsWith('EMAIL'))).toBe(true);
    expect(dirtyResult.detectedEntities.some((e) => e.startsWith('SSN'))).toBe(true);
    expect(dirtyResult.detectedEntities.some((e) => e.startsWith('CARD'))).toBe(true);
    expect(dirtyResult.detectedEntities.some((e) => e.startsWith('PHONE'))).toBe(true);

    // 2. Properly masked text with placeholders must pass cleanly
    const cleanText =
      'Advisor [NAME_1] met with customer. Email is [EMAIL_1], SSN is [SSN_1], phone is [PHONE_1], card: [CARD_1].';
    const cleanResult = PipelineService.detectPiiLeakage(cleanText);
    expect(cleanResult.hasLeakage).toBe(false);
    expect(cleanResult.detectedEntities).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 5: Outbound Retrieval Service Guard
  // ---------------------------------------------------------------------------
  it('SECURITY GATE: Blocks transmission to retrieval engine if input contains raw PII', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;

    const dirtyQuery = 'Lookup rules for SSN 123-45-6789 and investor@example.com';
    const result = await PipelineService.retrieveRulesAndPrecedents(dirtyQuery);

    expect(result.retrieved_rules).toHaveLength(0);
    expect(result.precedents).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
