import request from 'supertest';
import http from 'http';
import { app } from '../src/app';
import { pool, query } from '../src/db/pool';
import { runMigrations } from '../src/db/migrate';
import path from 'path';
import fs from 'fs';

describe('Week 3 Backend Integration Tests: Audit Trail & Notification System', () => {
  let advisor1Token: string;
  let advisor1Id: string;
  let advisor2Token: string;
  let advisor2Id: string;
  let officerToken: string;
  let officerId: string;
  let testDocId: string;
  let notificationId: string;

  const testAdvisor1Email = `w3_advisor1_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@example.com`;
  const testAdvisor2Email = `w3_advisor2_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@example.com`;
  const testOfficerEmail = `w3_officer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@example.com`;

  const dummyFilePath = path.join(__dirname, 'w3_test_document.txt');

  jest.setTimeout(30000);

  beforeAll(async () => {
    // 1. Run migrations to include 003_audit_trail_and_notifications
    await runMigrations();
    fs.writeFileSync(dummyFilePath, 'Week 3 Audit Trail and Notification integration test document.');

    // 2. Register Advisor 1
    const adv1Res = await request(app)
      .post('/auth/signup')
      .send({
        name: 'Advisor One',
        email: testAdvisor1Email,
        password: 'Password123!',
        role: 'Advisor'
      });
    expect(adv1Res.status).toBe(201);
    advisor1Token = adv1Res.body.data.token;
    advisor1Id = adv1Res.body.data.user.id;

    // 3. Register Advisor 2
    const adv2Res = await request(app)
      .post('/auth/signup')
      .send({
        name: 'Advisor Two',
        email: testAdvisor2Email,
        password: 'Password123!',
        role: 'Advisor'
      });
    if (adv2Res.status !== 201) {
      console.log('ADV2 SIGNUP STATUS & BODY:', adv2Res.status, JSON.stringify(adv2Res.body));
    }
    expect(adv2Res.status).toBe(201);
    advisor2Token = adv2Res.body.data.token;
    advisor2Id = adv2Res.body.data.user.id;

    // 4. Register Officer
    const offRes = await request(app)
      .post('/auth/signup')
      .send({
        name: 'Officer Compliance',
        email: testOfficerEmail,
        password: 'Password123!',
        role: 'Officer'
      });
    expect(offRes.status).toBe(201);
    officerToken = offRes.body.data.token;
    officerId = offRes.body.data.user.id;

    // 5. Submit initial document as Advisor 1
    const docRes = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisor1Token}`)
      .field('title', 'W3 Compliance Proposal')
      .field('description', 'Initial submission for audit trail tests')
      .attach('file', dummyFilePath);

    expect(docRes.status).toBe(201);
    testDocId = docRes.body.data.id;
  }, 30000);

  afterAll(async () => {
    if (fs.existsSync(dummyFilePath)) {
      try {
        fs.unlinkSync(dummyFilePath);
      } catch {
        // ignore
      }
    }

    try {
      const userIds = [advisor1Id, advisor2Id, officerId].filter(Boolean);
      if (userIds.length > 0) {
        await query('DELETE FROM notifications WHERE user_id = ANY($1::uuid[]) OR document_id IN (SELECT id FROM documents WHERE advisor_id = ANY($1::uuid[]))', [userIds]);
        await query('DELETE FROM audit_trail WHERE user_id = ANY($1::uuid[]) OR document_id IN (SELECT id FROM documents WHERE advisor_id = ANY($1::uuid[]))', [userIds]);
        await query('DELETE FROM revision_thread_entries WHERE author_id = ANY($1::uuid[]) OR document_id IN (SELECT id FROM documents WHERE advisor_id = ANY($1::uuid[]))', [userIds]);
        await query('DELETE FROM documents WHERE advisor_id = ANY($1::uuid[])', [userIds]);
        await query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
      }
    } catch (e) {
      // ignore cleanup errors
    }

    await pool.end();
  });

  // =========================================================================
  // Task 1: Audit Trail API Tests
  // =========================================================================
  describe('GET /api/documents/:id/audit-trail (Audit Trail API)', () => {
    it('Advisor 1 can view audit trail history for their own document (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/documents/${testDocId}/audit-trail`)
        .set('Authorization', `Bearer ${advisor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const entry = res.body.data[0];
      expect(entry.who).toBeDefined();
      expect(entry.who.userId).toBe(advisor1Id);
      expect(entry.who.user_email).toBe(testAdvisor1Email);
      expect(entry.who.user_role).toBe('ADVISOR');

      expect(entry.what).toBeDefined();
      expect(entry.what.action).toBe('DOCUMENT_SUBMITTED');
      expect(entry.what.details).toBeDefined();
      expect(entry.when).toBeDefined();
    });

    it('Officer can view audit trail history for any document (200 OK)', async () => {
      const res = await request(app)
        .get(`/documents/${testDocId}/audit-trail`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Advisor 2 cannot view audit trail for Advisor 1 document (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/documents/${testDocId}/audit-trail`)
        .set('Authorization', `Bearer ${advisor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Unauthenticated request to audit trail returns 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/documents/${testDocId}/audit-trail`);
      expect(res.status).toBe(401);
    });

    it('Non-existent document UUID returns 404 Not Found', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/documents/${fakeUuid}/audit-trail`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('Immutability check: PUT, PATCH, DELETE operations on audit trail return 405 Method Not Allowed', async () => {
      const putRes = await request(app)
        .put(`/api/documents/${testDocId}/audit-trail`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ action: 'MALICIOUS_OVERWRITE' });

      expect(putRes.status).toBe(405);
      expect(putRes.body.error.code).toBe('METHOD_NOT_ALLOWED');

      const delRes = await request(app)
        .delete(`/api/documents/${testDocId}/audit-trail`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(delRes.status).toBe(405);
    });
  });

  // =========================================================================
  // Task 2: Advisor Notification System Tests
  // =========================================================================
  describe('Automated In-App Notification Triggers & /api/notifications Endpoints', () => {
    it('Officer updates status to Needs Revision with remark, triggering automated notifications', async () => {
      const updateRes = await request(app)
        .patch(`/documents/${testDocId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          status: 'Needs Revision',
          comment: 'Please add financial compliance table on page 3.'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('Needs Revision');
    });

    it('Advisor 1 retrieves notifications list (200 OK)', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${advisor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      notificationId = res.body.data[0].id;
      const types = res.body.data.map((n: any) => n.type);
      expect(types).toContain('STATUS_CHANGE');
    });

    it('Filter notifications with ?unread_only=true', async () => {
      const res = await request(app)
        .get('/api/notifications?unread_only=true')
        .set('Authorization', `Bearer ${advisor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((n: any) => n.isRead === false || n.is_read === false)).toBe(true);
    });

    it('GET /api/notifications/unread-count returns correct badge count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${advisor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.unread_count).toBe('number');
      expect(res.body.data.unread_count).toBeGreaterThan(0);
    });

    it('Advisor 1 marks specific notification as read (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${advisor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead === true || res.body.data.is_read === true).toBe(true);
    });

    it('Advisor 2 cannot mark Advisor 1 notification as read (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${advisor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/notifications/read-all marks all notifications as read for Advisor 1', async () => {
      const readAllRes = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${advisor1Token}`);

      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.success).toBe(true);

      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${advisor1Token}`);

      expect(countRes.status).toBe(200);
      expect(countRes.body.data.unread_count).toBe(0);
    });

    it('GET /api/notifications/stream returns Server-Sent Events (SSE) live stream headers', (done) => {
      const server = app.listen(0, () => {
        const address = server.address() as any;
        const req = http.get(
          `http://127.0.0.1:${address.port}/api/notifications/stream`,
          { headers: { Authorization: `Bearer ${advisor1Token}` } },
          (res) => {
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/event-stream');
            expect(res.headers['cache-control']).toBe('no-cache');
            expect(res.headers['connection']).toBe('keep-alive');
            req.destroy();
            server.close(done);
          }
        );
      });
    });
  });
});
