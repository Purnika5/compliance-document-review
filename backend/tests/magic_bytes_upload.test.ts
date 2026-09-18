import request from 'supertest';
import { app } from '../src/app';
import { pool, query } from '../src/db/pool';
import { runMigrations } from '../src/db/migrate';
import path from 'path';
import fs from 'fs';

describe('Binary Magic Bytes Upload Middleware Verification', () => {
  let advisorToken: string;

  const validPdfPath = path.join(__dirname, 'valid_sample.pdf');
  const spoofedPdfPath = path.join(__dirname, 'spoofed_sample.pdf');
  const validDocxPath = path.join(__dirname, 'valid_sample.docx');
  const spoofedDocxPath = path.join(__dirname, 'spoofed_sample.docx');
  const validXlsxPath = path.join(__dirname, 'valid_sample.xlsx');
  const spoofedXlsxPath = path.join(__dirname, 'spoofed_sample.xlsx');

  const testEmail = `magic_bytes_${Date.now()}@example.com`;

  beforeAll(async () => {
    await runMigrations();

    // Create valid PDF (Starts with %PDF- / 0x25 0x50 0x44 0x46)
    const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a, 0x25, 0xfe, 0xfe]);
    fs.writeFileSync(validPdfPath, validPdfBuffer);

    // Create spoofed PDF (Renamed EXE starting with MZ / 0x4d 0x5a)
    const spoofedPdfBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    fs.writeFileSync(spoofedPdfPath, spoofedPdfBuffer);

    // Create valid DOCX (Zip container starting with PK\x03\x04 / 0x50 0x4b 0x03 0x04)
    const validDocxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    fs.writeFileSync(validDocxPath, validDocxBuffer);

    // Create spoofed DOCX (Plain text without zip magic bytes)
    fs.writeFileSync(spoofedDocxPath, 'This is fake docx content without PK magic header.');

    // Create valid XLSX (Zip container starting with PK\x03\x04 / 0x50 0x4b 0x03 0x04)
    const validXlsxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x08, 0x00]);
    fs.writeFileSync(validXlsxPath, validXlsxBuffer);

    // Create spoofed XLSX (Fake binary)
    const spoofedXlsxBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01]);
    fs.writeFileSync(spoofedXlsxPath, spoofedXlsxBuffer);

    // Register test advisor
    const advRes = await request(app).post('/auth/signup').send({
      name: 'Magic Bytes Advisor',
      email: testEmail,
      password: 'Password123!',
      role: 'Advisor'
    });
    advisorToken = advRes.body.data.token;
  });

  afterAll(async () => {
    // Clean up temporary files
    [validPdfPath, spoofedPdfPath, validDocxPath, spoofedDocxPath, validXlsxPath, spoofedXlsxPath].forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    try {
      await query('DELETE FROM documents WHERE title LIKE $1', ['%Magic Byte Test%']);
      await query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch {
      // ignore cleanup errors
    }
    await pool.end();
  });

  it('Valid PDF upload with %PDF- (0x25 0x50 0x44 0x46) should be accepted (201 Created)', async () => {
    const res = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('title', 'Magic Byte Test Valid PDF')
      .attach('file', validPdfPath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('Spoofed PDF file (MZ header disguised as PDF) should be rejected (400 Bad Request)', async () => {

    const res = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('title', 'Magic Byte Test Spoofed PDF')
      .attach('file', spoofedPdfPath);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILE_SIGNATURE');
    expect(res.body.error.message).toContain('Spoofed file detected');
  });

  it('Valid DOCX upload with PK\\x03\\x04 (0x50 0x4B 0x03 0x04) should be accepted (201 Created)', async () => {
    const res = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('title', 'Magic Byte Test Valid DOCX')
      .attach('file', validDocxPath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('Spoofed DOCX file should be rejected (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('title', 'Magic Byte Test Spoofed DOCX')
      .attach('file', spoofedDocxPath);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILE_SIGNATURE');
  });

  it('Valid XLSX upload with PK\\x03\\x04 (0x50 0x4B 0x03 0x04) should be accepted (201 Created)', async () => {
    const res = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('title', 'Magic Byte Test Valid XLSX')
      .attach('file', validXlsxPath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('Spoofed XLSX file (ELF header disguised as XLSX) should be rejected (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/documents')
      .set('Authorization', `Bearer ${advisorToken}`)
      .field('title', 'Magic Byte Test Spoofed XLSX')
      .attach('file', spoofedXlsxPath);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILE_SIGNATURE');
  });
});
