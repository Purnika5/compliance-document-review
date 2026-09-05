import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { pool, query } from './pool';
import { config } from '../config';

export const seedDatabase = async (): Promise<void> => {
  console.log('[Seed] Starting database seeding...');

  // Ensure uploads directory exists
  if (!fs.existsSync(config.uploads.dir)) {
    fs.mkdirSync(config.uploads.dir, { recursive: true });
  }

  // Create a dummy sample document on disk for seeded records
  const sampleDocPath = path.join(config.uploads.dir, 'sample_compliance_filing.pdf');
  if (!fs.existsSync(sampleDocPath)) {
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n4 0 obj << /Length 40 >> stream\nBT /F1 12 Tf 72 712 Td (Springer Capital Compliance Document) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n303\n%%EOF'
    );
    fs.writeFileSync(sampleDocPath, minimalPdf);
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('Password123!', saltRounds);

  // Seed Institutional Users
  const usersToSeed = [
    { name: 'Marcus Vance', email: 'advisor1@springer.capital', role: 'Advisor' },
    { name: 'Elena Rostova', email: 'officer1@springer.capital', role: 'Officer' },
  ];

  const userIds: Record<string, string> = {};

  for (const user of usersToSeed) {
    const existing = await query('SELECT id FROM users WHERE email = $1', [user.email]);
    if (existing.rows.length === 0) {
      const inserted = await query(
        `INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [user.name, user.email, passwordHash, user.role]
      );
      userIds[user.email] = inserted.rows[0].id;
      console.log(`[Seed] Created user: ${user.name} <${user.email}> (${user.role})`);
    } else {
      userIds[user.email] = existing.rows[0].id;
      await query('UPDATE users SET name = $1, password_hash = $2 WHERE id = $3', [user.name, passwordHash, existing.rows[0].id]);
      console.log(`[Seed] Updated user: ${user.name} <${user.email}> (${user.role})`);
    }
  }

  // Seed Initial Documents for Advisor 1
  const advisorId = userIds['advisor1@springer.capital'];
  if (advisorId) {
    const sampleDocs = [
      {
        title: 'Q3 Institutional Asset Allocation Model',
        description: 'Quarterly portfolio review and strategic allocation model for HNW institutional clients.',
        status: 'Pending',
        file_name: 'Q3_Asset_Allocation_Model.pdf',
      },
      {
        title: 'Private Wealth Portfolio Disclosure Statement',
        description: 'Annual disclosure regarding fiduciary management and risk suitability standards.',
        status: 'Approved',
        file_name: 'Private_Wealth_Disclosure.pdf',
      },
      {
        title: 'Global Equity ESG Strategy Filing',
        description: 'Sustainable equity strategy documentation with carbon metrics and exclusionary screening.',
        status: 'Needs Revision',
        file_name: 'ESG_Strategy_Filing.pdf',
      },
    ];

    for (const doc of sampleDocs) {
      const existingDoc = await query(
        'SELECT id FROM documents WHERE advisor_id = $1 AND title = $2',
        [advisorId, doc.title]
      );

      if (existingDoc.rows.length === 0) {
        await query(
          `INSERT INTO documents 
           (title, description, file_name, file_path, file_size, mime_type, status, advisor_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            doc.title,
            doc.description,
            doc.file_name,
            sampleDocPath,
            fs.statSync(sampleDocPath).size,
            'application/pdf',
            doc.status,
            advisorId,
          ]
        );
        console.log(`[Seed] Created document: "${doc.title}" [Status: ${doc.status}]`);
      }
    }
  }

  console.log('[Seed] Database seeding completed successfully.');
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Seeding error:', err);
      process.exit(1);
    });
}
