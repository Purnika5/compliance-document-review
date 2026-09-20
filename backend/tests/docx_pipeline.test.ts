import request from 'supertest';
import { app } from '../src/app';
import { runMigrations } from '../src/db/migrate';
import { pool } from '../src/db/pool';
import { PipelineService } from '../src/services/pipeline.service';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';

describe('DOCX End-to-End Pipeline & Analysis Tests', () => {
  let advisorToken: string;
  let officerToken: string;
  let docId: string;
  let v2DocId: string;

  const testAdvisorEmail = `docx_advisor_${Date.now()}@example.com`;
  const testOfficerEmail = `docx_officer_${Date.now()}@example.com`;

  const testDocxV1Path = path.join(__dirname, 'test_sample_v1.docx');
  const testDocxV2Path = path.join(__dirname, 'test_sample_v2.docx');

  /**
   * Helper to create a genuine OpenXML .docx file for testing.
   */
  const createMockDocx = (filePath: string, textContent: string) => {
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>
  </w:body>
</w:document>`;

    const zipBuffer = createZipArchive([
      { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
      { name: '_rels/.rels', data: Buffer.from(relsXml, 'utf8') },
      { name: 'word/document.xml', data: Buffer.from(documentXml, 'utf8') },
    ]);

    fs.writeFileSync(filePath, zipBuffer);
  };

  /**
   * Pure Node.js ZIP generator (Store mode 0 / Deflate mode 8) without external packages.
   */
  function createZipArchive(files: { name: string; data: Buffer }[]): Buffer {
    const records: { header: Buffer; data: Buffer; name: string }[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBuf = Buffer.from(file.name, 'utf8');
      const compressed = zlib.deflateRawSync(file.data);

      const header = Buffer.alloc(30);
      header.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
      header.writeUInt16LE(20, 4);        // Version needed
      header.writeUInt16LE(0, 6);         // Flags
      header.writeUInt16LE(8, 8);         // Deflate compression
      header.writeUInt16LE(0, 10);        // Mod time
      header.writeUInt16LE(0, 12);        // Mod date
      header.writeUInt32LE(0, 14);        // CRC-32 (0 for mock test)
      header.writeUInt32LE(compressed.length, 18);
      header.writeUInt32LE(file.data.length, 22);
      header.writeUInt16LE(nameBuf.length, 26);
      header.writeUInt16LE(0, 28);        // Extra field length

      records.push({
        header: Buffer.concat([header, nameBuf]),
        data: compressed,
        name: file.name,
      });
      offset += 30 + nameBuf.length + compressed.length;
    }

    // Central Directory
    const cdEntries: Buffer[] = [];
    let cdOffset = 0;
    let localOffset = 0;

    for (const r of records) {
      const nameBuf = Buffer.from(r.name, 'utf8');
      const cd = Buffer.alloc(46);
      cd.writeUInt32LE(0x02014b50, 0);   // PK\x01\x02
      cd.writeUInt16LE(20, 4);
      cd.writeUInt16LE(20, 6);
      cd.writeUInt16LE(0, 8);
      cd.writeUInt16LE(8, 10);            // Deflate
      cd.writeUInt16LE(0, 12);
      cd.writeUInt16LE(0, 14);
      cd.writeUInt32LE(0, 16);
      cd.writeUInt32LE(r.data.length, 20);
      cd.writeUInt32LE(r.data.length, 24);
      cd.writeUInt16LE(nameBuf.length, 28);
      cd.writeUInt16LE(0, 30);
      cd.writeUInt16LE(0, 32);
      cd.writeUInt16LE(0, 34);
      cd.writeUInt16LE(0, 36);
      cd.writeUInt32LE(0, 38);
      cd.writeUInt32LE(localOffset, 42);

      cdEntries.push(Buffer.concat([cd, nameBuf]));
      localOffset += r.header.length + r.data.length;
      cdOffset += 46 + nameBuf.length;
    }

    // End of Central Directory Record
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);   // PK\x05\x06
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(records.length, 8);
    eocd.writeUInt16LE(records.length, 10);
    eocd.writeUInt32LE(cdOffset, 12);
    eocd.writeUInt32LE(localOffset, 16);
    eocd.writeUInt16LE(0, 20);

    const bodyParts: Buffer[] = [];
    for (const r of records) {
      bodyParts.push(r.header, r.data);
    }
    return Buffer.concat([...bodyParts, ...cdEntries, eocd]);
  }

  beforeAll(async () => {
    await runMigrations();

    // Generate V1 test .docx with PII and regulatory claims
    const v1Content =
      'Client Profile: Marcus Sterling, SSN: 394-82-1984, Email: marcus.sterling@wealth.com, Phone: 415-555-8920. ' +
      'Springer Capital guarantees an annualized return of 25% without downside risk. ' +
      'Advisor receives undisclosed sponsor compensation.';
    createMockDocx(testDocxV1Path, v1Content);

    // Generate V2 compliant test .docx
    const v2Content =
      'Client Profile: Marcus Sterling. Account: SC-9824. ' +
      'Past performance is no guarantee of future returns. Investments involve risk of loss. ' +
      'Advisory fee: 0.65% AUM billed quarterly in full compliance with SEC Section 206.';
    createMockDocx(testDocxV2Path, v2Content);

    // Register Advisor
    const advRes = await request(app).post('/api/auth/signup').send({
      name: 'Docx Test Advisor',
      email: testAdvisorEmail,
      password: 'Password123!',
      role: 'Advisor',
    });
    advisorToken = advRes.body.data.token;

    // Register Compliance Officer
    const offRes = await request(app).post('/api/auth/signup').send({
      name: 'Docx Test Officer',
      email: testOfficerEmail,
      password: 'Password123!',
      role: 'Officer',
    });
    officerToken = offRes.body.data.token;
  });

  afterAll(async () => {
    [testDocxV1Path, testDocxV2Path].forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    try {
      await pool.end();
    } catch {
      // ignore
    }
  });

  describe('1. OpenXML DOCX Text Extraction Unit Verification', () => {
    it('should extract text directly from OpenXML word/document.xml', () => {
      const extracted = PipelineService.extractDocxText(testDocxV1Path);
      expect(extracted).toBeTruthy();
      expect(extracted).toContain('Marcus Sterling');
      expect(extracted).toContain('394-82-1984');
      expect(extracted).toContain('marcus.sterling@wealth.com');
      expect(extracted).toContain('guarantees an annualized return of 25%');
    });
  });

  describe('2. DOCX Multipart File Upload', () => {
    it('should successfully upload a .docx document and enforce mime validation', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('title', 'Q3 DOCX Allocation Strategy')
        .field('description', 'Institutional Word document strategy test')
        .field('category', 'DOCX')
        .attach('file', testDocxV1Path);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.file_name).toContain('.docx');

      docId = res.body.data.id;
    });

    it('should allow Compliance Officer to download uploaded DOCX file', async () => {
      const res = await request(app)
        .get(`/api/documents/${docId}/file`)
        .set('Authorization', `Bearer ${officerToken}`)
        .buffer()
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('wordprocessingml.document');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      // Verify ZIP magic bytes PK\x03\x04
      expect(res.body[0]).toBe(0x50);
      expect(res.body[1]).toBe(0x4b);
    });
  });

  describe('3. Automated AI Analysis & PII Masking on DOCX Document', () => {
    it('should retrieve automated compliance analysis for the DOCX document with 200 OK', async () => {
      const res = await request(app)
        .get(`/api/documents/${docId}/analysis`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.document_id).toBe(docId);
      expect(res.body.data.version).toBe(1);

      // Verify that PII in the text was masked
      const maskedText = res.body.data.masked_text;
      expect(maskedText).toBeDefined();
      expect(maskedText).not.toContain('394-82-1984'); // SSN must be masked
      expect(maskedText).not.toContain('marcus.sterling@wealth.com'); // Email must be masked

      // Verify compliance summary & flags
      expect(res.body.data.summary).toBeTruthy();
      expect(Array.isArray(res.body.data.flags)).toBe(true);
    });
  });

  describe('4. DOCX Versioning & Resubmission Workflow', () => {
    it('should allow officer to request revision with feedback remarks', async () => {
      const res = await request(app)
        .patch(`/api/documents/${docId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          status: 'Needs Revision',
          remarks: 'Please remove guaranteed return language and provide SEC fee schedule.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Needs Revision');
    });

    it('should allow advisor to upload Version 2 (.docx) resubmission', async () => {
      const res = await request(app)
        .post(`/api/documents/${docId}/resubmit`)
        .set('Authorization', `Bearer ${advisorToken}`)
        .field('notes', 'Version 2: Removed guarantees, added SEC disclosures and fee schedule.')
        .attach('file', testDocxV2Path);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.original_document_id).toBe(docId);
      v2DocId = res.body.data.id;
    });

    it('should return complete document lineage entries across versions', async () => {
      const res = await request(app)
        .get(`/api/documents/${v2DocId}/versions`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.versions).toHaveLength(2);
      expect(res.body.data.thread_entries.length).toBeGreaterThan(0);
    });
  });
});
