import request from 'supertest';
import { app } from '../src/app';
import { pool, query } from '../src/db/pool';
import { runMigrations } from '../src/db/migrate';
import path from 'path';
import fs from 'fs';

describe('Document Pipeline & Analysis Integration Tests', () => {
  let advisorToken: string;
  let advisorId: string;
  let advisor2Token: string;
  let officerToken: string;
  let docId: string;
  let v2DocId: string;

  const testAdvisorEmail = `advisor_pipe_${Date.now()}@example.com`;
  const testAdvisor2Email = `advisor2_pipe_${Date.now()}@example.com`;
  const testOfficerEmail = `officer_pipe_${Date.now()}@example.com`;

  const dummyFilePath = path.join(__dirname, 'test_pipeline_doc.txt');
  const dummyFileV2Path = path.join(__dirname, 'test_pipeline_doc_v2.txt');

  beforeAll(async () => {
    await runMigrations();

    const sampleContent =
      'Client: John Doe, SSN: 123-45-6789. Contact john@example.com. ' +
      'Historical returns of 12% are guaranteed for all institutional investors.';
    fs.writeFileSync(dummyFilePath, sampleContent);
    fs.writeFileSync(dummyFileV2Path, 'Revised: Investment returns are subject to market risks. FINRA 2111 compliant.');

    // 1. Register Advisor 1
    const advRes = await request(app).post('/auth/signup').send({
      name: 'Pipeline Advisor',
      email: testAdvisorEmail,
      password: 'Password123!',
      role: 'Advisor',
    });
    advisorToken = advRes.body.data.token;
    advisorId = advRes.body.data.user.id;

    // 2. Register Advisor 2
    const adv2Res = await request(app).post('/auth/signup').send({
      name: 'Second Advisor',
      email: testAdvisor2Email,
      password: 'Password123!',
      role: 'Advisor',
    });
    advisor2Token = adv2Res.body.data.token;

    // 3. Register Officer
    const offRes = await request(app).post('/auth/signup').send({
      name: 'Pipeline Officer',
      email: testOfficerEmail,
      password: 'Password123!',
      role: 'Officer',
    });
    officerToken = offRes.body.data.token;
  });

  afterAll(async () => {
    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    if (fs.existsSync(dummyFileV2Path)) fs.unlinkSync(dummyFileV2Path);

    try {
      await query('DELETE FROM documents WHERE title LIKE $1', ['%Pipeline Test%']);
      await query('DELETE FROM users WHERE email LIKE $1 OR email LIKE $2 OR email LIKE $3', [
        'advisor_pipe_%',
        'advisor2_pipe_%',
        'officer_pipe_%',
      ]);
    } catch {
      // ignore cleanup errors
    }
    await pool.end();
  });

  it('POST /documents should successfully upload and trigger analysis record creation', async () => {
    const res = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('title', 'Pipeline Test Investment Deck')
      .field('description', 'Filing with disclosures')
      .attach('file', dummyFilePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.version).toBe(1);
    docId = res.body.data.id;
  });

  it('GET /documents/:id/analysis should return the compliance analysis record', async () => {
    const res = await request(app)
      .get(`/documents/${docId}/analysis`)
      .set('Authorization', `Bearer ${advisorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document_id).toBe(docId);
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.summary).toBeDefined();
    expect(Array.isArray(res.body.data.flags)).toBe(true);
    expect(res.body.data.masked_text).toBeDefined();
  });

  it('GET /documents/:id should include ai_summary and ai_flags in the response', async () => {
    const res = await request(app)
      .get(`/documents/${docId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(docId);
    expect(res.body.data.ai_summary).toBeDefined();
    expect(res.body.data.ai_flags).toBeDefined();
  });

  it('Officer sets status to Needs Revision and Advisor resubmits -> generates v2 analysis', async () => {
    // 1. Officer requests revision
    const patchRes = await request(app)
      .patch(`/documents/${docId}/status`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ status: 'Needs Revision', comment: 'Please revise disclosures.' });

    expect(patchRes.status).toBe(200);

    // 2. Advisor resubmits
    const resubRes = await request(app)
      .post(`/documents/${docId}/resubmit`)
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('notes', 'Revised risk disclaimers attached.')
      .attach('file', dummyFileV2Path);

    expect(resubRes.status).toBe(201);
    expect(resubRes.body.data.version).toBe(2);
    v2DocId = resubRes.body.data.id;

    // 3. Check v2 analysis
    const v2AnalysisRes = await request(app)
      .get(`/documents/${v2DocId}/analysis`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(v2AnalysisRes.status).toBe(200);
    expect(v2AnalysisRes.body.data.document_id).toBe(v2DocId);
    expect(v2AnalysisRes.body.data.version).toBe(2);
  });

  it('Unauthorized advisor should not access another advisor analysis (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/documents/${docId}/analysis`)
      .set('Authorization', `Bearer ${advisor2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Unauthenticated caller should be rejected (401 Unauthorized)', async () => {
    const res = await request(app).get(`/documents/${docId}/analysis`);
    expect(res.status).toBe(401);
  });
});
