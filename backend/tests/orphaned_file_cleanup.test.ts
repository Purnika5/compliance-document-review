import request from 'supertest';
import { app } from '../src/app';
import { pool, query } from '../src/db/pool';
import { runMigrations } from '../src/db/migrate';
import { DocumentService } from '../src/services/document.service';
import path from 'path';
import fs from 'fs';

describe('Automatic Orphaned File Cleanup Verification', () => {
  let advisorToken: string;
  let advisorId: string;
  const testEmail = `cleanup_${Date.now()}@example.com`;

  const dummyFilePath = path.join(__dirname, 'test_cleanup_doc.txt');

  beforeAll(async () => {
    await runMigrations();

    fs.writeFileSync(dummyFilePath, 'Sample disclosure text for orphaned file cleanup testing.');

    const advRes = await request(app).post('/auth/signup').send({
      name: 'Cleanup Advisor',
      email: testEmail,
      password: 'Password123!',
      role: 'Advisor'
    });
    advisorToken = advRes.body.data.token;
    advisorId = advRes.body.data.user.id;
  });

  afterAll(async () => {
    if (fs.existsSync(dummyFilePath)) {
      fs.unlinkSync(dummyFilePath);
    }

    try {
      await query('DELETE FROM users WHERE email = $1', [testEmail]);
    } catch {
      // ignore
    }
    await pool.end();
  });

  it('On database failure during submission, fs.promises.unlink removes uploaded file from disk', async () => {

    const tempUploadPath = path.join(__dirname, '../uploads/documents', `test_orphan_${Date.now()}.txt`);
    fs.mkdirSync(path.dirname(tempUploadPath), { recursive: true });
    fs.writeFileSync(tempUploadPath, 'Orphan file content');

    const fakeFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test_orphan.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: 19,
      destination: path.dirname(tempUploadPath),
      filename: path.basename(tempUploadPath),
      path: tempUploadPath,
      buffer: Buffer.from('Orphan file content'),
      stream: fs.createReadStream(tempUploadPath)
    };

    // Attempt submit with invalid non-existent advisor ID to trigger DB foreign key error
    await expect(
      DocumentService.submitDocument({
        title: 'Test Invalid Submission',
        file: fakeFile,
        advisorId: '00000000-0000-0000-0000-000000000000'
      })
    ).rejects.toThrow();

    // Verify orphaned file was unlinked and does NOT exist on disk
    expect(fs.existsSync(tempUploadPath)).toBe(false);
  });
});
