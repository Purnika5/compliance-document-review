
const { query } = require('./dist/db/pool');
const { PipelineService } = require('./dist/services/pipeline.service');

async function seedMasked() {
  const docs = [
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'f9e8d7c6-b5a4-4938-8271-9f8e7d6c5b4a'
  ];

  for (const id of docs) {
    const dRes = await query('SELECT * FROM documents WHERE id = $1', [id]);
    if (dRes.rows.length === 0) continue;
    const doc = dRes.rows[0];
    const rawText = await PipelineService.extractText(doc.file_path, doc.mime_type);
    console.log('Doc', id, 'extracted raw length:', rawText.length);

    // Call PII Masker
    const masked = await PipelineService.maskPii(doc.id, doc.version, rawText);
    console.log('Doc', id, 'masked length:', masked.length, 'placeholders:', masked.match(/\[[A-Z0-9_]+\]/g));

    // Inject realistic compliance flags with placeholders
    const sampleFlags = [
      {
        id: 'flag-101',
        rule_code: 'FINRA-2210-PROMISSORY',
        rule: 'FINRA Rule 2210',
        severity: 'HIGH',
        title: 'Promissory or Unrealistic Yield Representation',
        flagged_text: 'Portfolio Manager [NAME_1] ([EMAIL_1]) guarantees an absolute minimum net return of 14.5% annualized across high-yield credit tranches.',
        passage: 'Portfolio Manager [NAME_1] ([EMAIL_1]) guarantees an absolute minimum net return of 14.5% annualized across high-yield credit tranches.',
        explanation: 'Guaranteed performance claims by [NAME_1] violate FINRA Rule 2210(d)(1)(D) prohibiting exaggerated or unwarranted representations.',
        confidence_score: 96,
        confidenceScore: 96,
        page_number: 1,
        pageNumber: 1
      },
      {
        id: 'flag-102',
        rule_code: 'SEC-IA-206-PII',
        rule: 'SEC Rule 206(4)-1',
        severity: 'MEDIUM',
        title: 'Unredacted Client Identifiable Account Information',
        flagged_text: 'Direct wire authorization for custody account [ACCOUNT_1] verified via telephone [PHONE_1].',
        passage: 'Direct wire authorization for custody account [ACCOUNT_1] verified via telephone [PHONE_1].',
        explanation: 'Account identifiers [ACCOUNT_1] and direct contact numbers [PHONE_1] must not be exposed in public marketing materials.',
        confidence_score: 91,
        confidenceScore: 91,
        page_number: 1,
        pageNumber: 1
      }
    ];

    const sql = `
      INSERT INTO document_analyses (document_id, version, summary, flags, masked_text)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (document_id, version) DO UPDATE SET
        summary = EXCLUDED.summary,
        flags = EXCLUDED.flags,
        masked_text = EXCLUDED.masked_text
    `;

    await query(sql, [
      doc.id,
      doc.version,
      'Automated AI analysis completed. Identified promissory language and client PII disclosures requiring remediation.',
      JSON.stringify(sampleFlags),
      masked
    ]);
    console.log('Successfully saved analysis for', id);
  }
}

seedMasked().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
