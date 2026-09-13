import request from 'supertest';
import { app } from '../src/app';
import { pool, query } from '../src/db/pool';
import { runMigrations } from '../src/db/migrate';
import path from 'path';
import fs from 'fs';

describe('Document Review & Resubmission Integration Tests', () => {
  let advisorToken: string;
  let advisorId: string;
  let advisor2Token: string;
  let advisor2Id: string;
  let officerToken: string;
  let officerId: string;
  let v1DocId: string;
  let v2DocId: string;

  const testAdvisorEmail = `advisor_w2_${Date.now()}@example.com`;
  const testAdvisor2Email = `advisor2_w2_${Date.now()}@example.com`;
  const testOfficerEmail = `officer_w2_${Date.now()}@example.com`;

  const dummyFilePathV1 = path.join(__dirname, 'test_week2_doc_v1.txt');
  const dummyFilePathV2 = path.join(__dirname, 'test_week2_doc_v2.txt');

  beforeAll(async () => {
    await runMigrations();
    fs.writeFileSync(dummyFilePathV1, 'Version 1 content: Initial compliance submission without disclosures.');
    fs.writeFileSync(dummyFilePathV2, 'Version 2 content: Revised compliance submission with audited disclosures.');

    // Register Advisor 1
    const advRes = await request(app)
      .post('/auth/signup')
      .send({
        name: 'Advisor One',
        email: testAdvisorEmail,
        password: 'Password123!',
        role: 'Advisor'
      });
    advisorToken = advRes.body.data.token;
    advisorId = advRes.body.data.user.id;

    // Register Advisor 2
    const adv2Res = await request(app)
      .post('/auth/signup')
      .send({
        name: 'Advisor Two',
        email: testAdvisor2Email,
        password: 'Password123!',
        role: 'Advisor'
      });
    advisor2Token = adv2Res.body.data.token;
    advisor2Id = adv2Res.body.data.user.id;

    // Register Officer
    const offRes = await request(app)
      .post('/auth/signup')
      .send({
        name: 'Compliance Officer',
        email: testOfficerEmail,
        password: 'Password123!',
        role: 'Officer'
      });
    officerToken = offRes.body.data.token;
    officerId = offRes.body.data.user.id;

    // Advisor 1 submits initial v1 document
    const submitRes = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('title', 'Institutional Equity Pitch Deck')
      .field('description', 'Q3 investor presentation')
      .attach('file', dummyFilePathV1);

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.version).toBe(1);
    expect(submitRes.body.data.original_document_id).toBeNull();
    v1DocId = submitRes.body.data.id;
  });

  afterAll(async () => {
    if (fs.existsSync(dummyFilePathV1)) fs.unlinkSync(dummyFilePathV1);
    if (fs.existsSync(dummyFilePathV2)) fs.unlinkSync(dummyFilePathV2);

    try {
      await query('DELETE FROM documents WHERE title LIKE $1', ['%Institutional Equity%']);
      await query('DELETE FROM users WHERE email LIKE $1 OR email LIKE $2 OR email LIKE $3', [
        'advisor_w2_%',
        'advisor2_w2_%',
        'officer_w2_%'
      ]);
    } catch (e) {
      // ignore cleanup errors
    }
    await pool.end();
  });

  describe('GET /documents/queue (Officer Queue)', () => {
    it('Officer should successfully retrieve the review queue (200 OK)', async () => {
      const res = await request(app)
        .get('/documents/queue')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      const found = res.body.data.find((d: any) => d.id === v1DocId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Institutional Equity Pitch Deck');
      expect(found.status).toBe('Pending');
      expect(found.version).toBe(1);
      expect(found.advisor_name).toBe('Advisor One');
      expect(found.advisor_email).toBe(testAdvisorEmail);
    });

    it('Officer should filter the queue by status: Pending (200 OK)', async () => {
      const res = await request(app)
        .get('/documents/queue?status=Pending')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((d: any) => d.status === 'Pending')).toBe(true);
    });

    it('Officer should support ?status=All query parameter (200 OK)', async () => {
      const res = await request(app)
        .get('/documents/queue?status=All')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Officer filtering by Approved should not include pending document (200 OK)', async () => {
      const res = await request(app)
        .get('/documents/queue?status=Approved')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find((d: any) => d.id === v1DocId);
      expect(found).toBeUndefined();
    });

    it('Advisor calling GET /documents/queue should be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/documents/queue')
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Unauthenticated caller GET /documents/queue should be rejected (401 Unauthorized)', async () => {
      const res = await request(app)
        .get('/documents/queue');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /documents/:id/status (Needs Revision Flow)', () => {
    it('Advisor cannot change status to Needs Revision (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/documents/${v1DocId}/status`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .send({
          status: 'Needs Revision',
          comment: 'Self revision attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Officer sets status to Needs Revision with regulatory remarks (200 OK)', async () => {
      const remark = 'Missing FINRA Rule 2111 risk disclosure on slide 8. Please revise.';
      const res = await request(app)
        .patch(`/documents/${v1DocId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          status: 'Needs Revision',
          comment: remark
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Needs Revision');
    });

    it('Queue filtering by Needs Revision should now include v1 document', async () => {
      const res = await request(app)
        .get('/documents/queue?status=Needs Revision')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find((d: any) => d.id === v1DocId);
      expect(found).toBeDefined();
      expect(found.status).toBe('Needs Revision');
    });
  });

  describe('POST /documents/:id/resubmit (Document Resubmission)', () => {
    it('Another advisor (Advisor 2) cannot resubmit Advisor 1 document (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/documents/${v1DocId}/resubmit`)
        .set('Authorization', `Bearer ${advisor2Token}`)
        .field('notes', 'Unauthorized resubmission attempt')
        .attach('file', dummyFilePathV2);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Officer cannot resubmit a document (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/documents/${v1DocId}/resubmit`)
        .set('Authorization', `Bearer ${officerToken}`)
        .field('notes', 'Officer resubmission attempt')
        .attach('file', dummyFilePathV2);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Should reject resubmission if file is missing (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/documents/${v1DocId}/resubmit`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('notes', 'No file attached');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_REQUIRED');
    });

    it('Original Advisor successfully resubmits document in Needs Revision (201 Created)', async () => {
      const res = await request(app)
        .post(`/documents/${v1DocId}/resubmit`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('notes', 'Added FINRA Rule 2111 disclosures on page 8.')
        .attach('file', dummyFilePathV2);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).not.toBe(v1DocId); // Must be a new row
      expect(res.body.data.version).toBe(2);       // Must be version 2
      expect(res.body.data.original_document_id).toBe(v1DocId); // Linked to original
      expect(res.body.data.status).toBe('Pending'); // Reset to Pending
      v2DocId = res.body.data.id;
    });

    it('Original v1 document row must remain intact with status Needs Revision (immutability check)', async () => {
      const res = await request(app)
        .get(`/documents/${v1DocId}`)
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(v1DocId);
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.status).toBe('Needs Revision');
    });

    it('Should reject concurrent resubmission while a revision is already Pending (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/documents/${v1DocId}/resubmit`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('notes', 'Duplicate concurrent resubmission')
        .attach('file', dummyFilePathV2);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RESUBMISSION_PENDING');
    });

    it('Should reject resubmission if document is in Pending status (400 Bad Request)', async () => {
      // v2 is currently Pending, try resubmitting v2
      const res = await request(app)
        .post(`/documents/${v2DocId}/resubmit`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('notes', 'Resubmitting pending doc')
        .attach('file', dummyFilePathV2);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_RESUBMIT');
    });

    it('Officer approves v2, and subsequent resubmission is rejected (400 Bad Request)', async () => {
      // Officer approves v2
      await request(app)
        .patch(`/documents/${v2DocId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'Approved', comment: 'Compliant and approved.' });

      // Advisor tries to resubmit approved v2
      const res = await request(app)
        .post(`/documents/${v2DocId}/resubmit`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('notes', 'Resubmitting approved doc')
        .attach('file', dummyFilePathV2);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_RESUBMIT');
    });
  });

  describe('GET /documents/:id/versions (Version Lineage)', () => {
    it('Officer can retrieve full version history and conversation entries (200 OK)', async () => {
      const res = await request(app)
        .get(`/documents/${v1DocId}/versions`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.versions.length).toBe(2);

      // Verify v1 & v2 ordering
      const [first, second] = res.body.data.versions;
      expect(first.version).toBe(1);
      expect(first.id).toBe(v1DocId);
      expect(second.version).toBe(2);
      expect(second.id).toBe(v2DocId);
      expect(second.original_document_id).toBe(v1DocId);

      // Verify revision thread entries
      expect(res.body.data.thread_entries.length).toBeGreaterThanOrEqual(3);
      const entries = res.body.data.thread_entries;
      expect(entries.some((e: any) => e.entry_type === 'submission' && e.document_id === v1DocId)).toBe(true);
      expect(entries.some((e: any) => e.entry_type === 'decision' && e.author_role === 'Officer')).toBe(true);
      expect(entries.some((e: any) => e.entry_type === 'submission' && e.document_id === v2DocId)).toBe(true);
    });

    it('Advisor can retrieve version history for their own document (200 OK)', async () => {
      const res = await request(app)
        .get(`/documents/${v2DocId}/versions`)
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.versions.length).toBe(2);
    });

    it('Advisor 2 cannot retrieve version history for Advisor 1 document (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/documents/${v1DocId}/versions`)
        .set('Authorization', `Bearer ${advisor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Should reject version history for non-existent document UUID (404 Not Found)', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/documents/${fakeUuid}/versions`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });
});
