import request from 'supertest';
import { app } from '../src/app';
import { pool, query } from '../src/db/pool';
import { runMigrations } from '../src/db/migrate';
import path from 'path';
import fs from 'fs';

describe('Week 1 Backend API Integration Tests (Sahil Sonar)', () => {
  let advisorToken: string;
  let advisorId: string;
  let advisor2Token: string;
  let advisor2Id: string;
  let officerToken: string;
  let officerId: string;
  let createdDocId: string;

  const testAdvisorEmail = `advisor_${Date.now()}@example.com`;
  const testAdvisor2Email = `advisor2_${Date.now()}@example.com`;
  const testOfficerEmail = `officer_${Date.now()}@example.com`;

  // Create a temporary dummy file for upload testing
  const dummyFilePath = path.join(__dirname, 'test_compliance_document.txt');

  beforeAll(async () => {
    // Run migrations before tests
    await runMigrations();
    fs.writeFileSync(dummyFilePath, 'This is a sample financial compliance disclosure text for testing.');
  });

  afterAll(async () => {
    if (fs.existsSync(dummyFilePath)) {
      fs.unlinkSync(dummyFilePath);
    }
    // Clean up test data
    try {
      await query('DELETE FROM documents WHERE title LIKE $1', ['%Test%']);
      await query('DELETE FROM users WHERE email LIKE $1 OR email LIKE $2 OR email LIKE $3', [
        'advisor_%@example.com',
        'advisor2_%@example.com',
        'officer_%@example.com'
      ]);
    } catch (e) {
      // ignore
    }
    await pool.end();
  });

  // -------------------------------------------------------------
  // Task 1: Health Check Endpoint & DB Connection
  // -------------------------------------------------------------
  describe('GET /health', () => {
    it('should return 200 OK with healthy status and connected database', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.database).toBe('connected');
      expect(res.body.data.service).toBe('compliance-backend');
    });
  });

  // -------------------------------------------------------------
  // Task 2: Implement Sign-up & Login (Advisor/Officer roles)
  // -------------------------------------------------------------
  describe('Authentication Endpoints (Sign-up & Login)', () => {
    it('should successfully register a new Advisor with fixed role', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Sahil Advisor',
          email: testAdvisorEmail,
          password: 'Password123!',
          role: 'Advisor'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testAdvisorEmail);
      expect(res.body.data.user.role).toBe('Advisor');
      expect(res.body.data.user.password_hash).toBeUndefined(); // ensure password hash not exposed
      expect(res.body.data.token).toBeDefined();

      advisorToken = res.body.data.token;
      advisorId = res.body.data.user.id;
    });

    it('should successfully register a second Advisor for privacy checks', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Jane Advisor',
          email: testAdvisor2Email,
          password: 'Password123!',
          role: 'Advisor'
        });

      expect(res.status).toBe(201);
      advisor2Token = res.body.data.token;
      advisor2Id = res.body.data.user.id;
    });

    it('should successfully register a new Officer with fixed role', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Compliance Officer Alex',
          email: testOfficerEmail,
          password: 'Password123!',
          role: 'Officer'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('Officer');
      expect(res.body.data.token).toBeDefined();

      officerToken = res.body.data.token;
      officerId = res.body.data.user.id;
    });

    it('should reject signup with duplicate email (409 Conflict)', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Duplicate Advisor',
          email: testAdvisorEmail,
          password: 'Password123!',
          role: 'Advisor'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should reject signup with invalid role (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'Password123!',
          role: 'SuperAdmin' // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully log in an Advisor and return valid JWT with role', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testAdvisorEmail,
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('Advisor');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testAdvisorEmail,
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should allow fetching current user via GET /auth/me with JWT', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(advisorId);
      expect(res.body.data.user.role).toBe('Advisor');
    });
  });

  // -------------------------------------------------------------
  // Task 4: CRUD Document Submission Endpoint
  // -------------------------------------------------------------
  describe('POST /documents (Document Submission)', () => {
    it('should allow an Advisor to upload a document and set status to Pending', async () => {
      const res = await request(app)
        .post('/documents')
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('title', 'Test Annual Risk Report 2026')
        .field('description', 'Comprehensive risk overview for Q1 review.')
        .attach('file', dummyFilePath);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Annual Risk Report 2026');
      expect(res.body.data.status).toBe('Pending');
      expect(res.body.data.advisor_id).toBe(advisorId);
      expect(res.body.data.file_name).toBe('test_compliance_document.txt');

      createdDocId = res.body.data.id;
    });

    it('should reject document submission without authentication (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/documents')
        .field('title', 'Unauthenticated doc')
        .attach('file', dummyFilePath);

      expect(res.status).toBe(401);
    });

    it('should reject document submission if called by an Officer (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/documents')
        .set('Authorization', `Bearer ${officerToken}`)
        .field('title', 'Officer attempted upload')
        .attach('file', dummyFilePath);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject submission if file is missing (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/documents')
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('title', 'Missing file doc');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_REQUIRED');
    });
  });

  // -------------------------------------------------------------
  // Task 5: CRUD Document Status Update Endpoint (Officer-only)
  // -------------------------------------------------------------
  describe('PATCH /documents/:id/status (Document Status Update)', () => {
    it('should reject status update if caller is an Advisor (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/documents/${createdDocId}/status`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .send({ status: 'Approved' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow an Officer to change document status to Approved (200 OK)', async () => {
      const res = await request(app)
        .patch(`/documents/${createdDocId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'Approved' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdDocId);
      expect(res.body.data.status).toBe('Approved');
    });

    it('should allow an Officer to change status to Needs Revision', async () => {
      const res = await request(app)
        .patch(`/documents/${createdDocId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'Needs Revision' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Needs Revision');
    });

    it('should reject invalid status values (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/documents/${createdDocId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'RandomInvalidStatus' });

      expect(res.status).toBe(400);
    });

    it('should reject status update with invalid document UUID format (400 Bad Request)', async () => {
      const res = await request(app)
        .patch('/documents/invalid-uuid-format/status')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'Approved' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------
  // Task 6: List / Get Document Endpoints (Role-scoped)
  // -------------------------------------------------------------
  describe('GET /documents and GET /documents/:id (Role Scoping)', () => {
    let advisor2DocId: string;

    beforeAll(async () => {
      // Upload a second document by Advisor 2
      const res = await request(app)
        .post('/documents')
        .set('Authorization', `Bearer ${advisor2Token}`)
        .field('title', 'Test Advisor 2 Private Audit')
        .attach('file', dummyFilePath);
      advisor2DocId = res.body.data.id;
    });

    it('Advisor 1 should ONLY see their own documents in list', async () => {
      const res = await request(app)
        .get('/documents')
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Verify all returned docs belong to Advisor 1
      for (const doc of res.body.data) {
        expect(doc.advisor_id).toBe(advisorId);
      }
      expect(res.body.data.some((d: any) => d.id === createdDocId)).toBe(true);
      expect(res.body.data.some((d: any) => d.id === advisor2DocId)).toBe(false);
    });

    it('Officer should see ALL submitted documents across all Advisors', async () => {
      const res = await request(app)
        .get('/documents')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const docIds = res.body.data.map((d: any) => d.id);
      expect(docIds).toContain(createdDocId);
      expect(docIds).toContain(advisor2DocId);
    });

    it('Officer can filter documents by status', async () => {
      const res = await request(app)
        .get('/documents?status=Needs%20Revision')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((d: any) => d.status === 'Needs Revision')).toBe(true);
    });

    it('Advisor 1 can view their own document details', async () => {
      const res = await request(app)
        .get(`/documents/${createdDocId}`)
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdDocId);
      expect(res.body.data.advisor_name).toBe('Sahil Advisor');
    });

    it('Advisor 1 gets 403 Forbidden when trying to view Advisor 2 document detail', async () => {
      const res = await request(app)
        .get(`/documents/${advisor2DocId}`)
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Officer can view any document detail', async () => {
      const res = await request(app)
        .get(`/documents/${advisor2DocId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(advisor2DocId);
    });

    it('should reject GET /documents/:id with invalid UUID format (400 Bad Request)', async () => {
      const res = await request(app)
        .get('/documents/not-a-valid-uuid')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
