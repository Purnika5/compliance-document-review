import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { pool, query, isMemFallbackActive } from './pool';
import { runMigrations, isSupabaseDatabase } from './migrate';
import { config } from '../config';

/**
 * Determines whether database seeding should be skipped.
 */
export const shouldSkipSeeding = async (): Promise<{ skip: boolean; reason?: string }> => {
  // 1. Explicit skip flags
  if (
    process.env.SKIP_SEEDING === 'true' ||
    process.env.SEED_DATABASE === 'false' ||
    process.env.DISABLE_SEEDING === 'true' ||
    process.env.SUPABASE_EXISTING_DB === 'true'
  ) {
    return {
      skip: true,
      reason: 'Database seeding skipped via configuration flag (SKIP_SEEDING=true / SEED_DATABASE=false / SUPABASE_EXISTING_DB=true).'
    };
  }

  // 2. Force override flag allows explicit seeding on Supabase if desired
  if (process.env.FORCE_SEED === 'true') {
    return { skip: false };
  }

  // 3. Protect Supabase database from mock seed overwrite
  if (isSupabaseDatabase()) {
    return {
      skip: true,
      reason: 'Supabase database detected. Automated mock seeding is disabled to protect existing production data (set FORCE_SEED=true to override).'
    };
  }

  // 4. Unit testing and in-memory DB fallback
  if (process.env.NODE_ENV === 'test' || isMemFallbackActive()) {
    return { skip: false };
  }

  return { skip: false };
};

export const seedDatabase = async (): Promise<void> => {
  const skipCheck = await shouldSkipSeeding();
  if (skipCheck.skip) {
    console.log(`[Seed] ${skipCheck.reason}`);
    return;
  }

  console.log('[Seed] Starting database seeding...');
  await runMigrations();

  // Ensure uploads directory exists
  if (!fs.existsSync(config.uploads.dir)) {
    fs.mkdirSync(config.uploads.dir, { recursive: true });
  }

  // Create dummy sample documents (PDF and DOCX) on disk for seeded records
  const sampleDocPath = path.join(config.uploads.dir, 'sample_compliance_filing.pdf');
  if (!fs.existsSync(sampleDocPath)) {
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n4 0 obj << /Length 40 >> stream\nBT /F1 12 Tf 72 712 Td (Springer Capital Compliance Document) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n303\n%%EOF'
    );
    fs.writeFileSync(sampleDocPath, minimalPdf);
  }

  const sampleDocxPath = path.join(config.uploads.dir, 'sample_compliance_filing.docx');
  if (!fs.existsSync(sampleDocxPath)) {
    const minimalDocxBase64 =
      "UEsDBBQAAAAIAAAAIQCS74NsbwEAAFoDAAATAAAAW2NvbnRlbnRfVHlwZXNdLnhtbKyTT0/C" +
      "MAzF70j8DlrurQNhCSG2Ew4mHiTqgTvg15a2tGvXDvLtzaYLxIQ/wNte+vzyevW+vj42LlgP" +
      "1rmU5yKNIsCora+tLfLL+ml5ikIErcHajDnJEZydlTfX9bZ7xZgmbvA5SYW4xJCS71hLgbf9" +
      "1QZ8w111h/x8ZzP4x+E1O3v+w0+jR+790e0c1fJEp3tFz2bWoxK8D6eFkU08yAUpYV1T8T13" +
      "WlsrY28gTlh7m10L01wBwZ1wP31QfBspCqIe7kH689a+A1BLAQIUABQAAAAIAAAAIQCS74Ns" +
      "bwEAAFoDAAATAAAAAAAAAAAAAAAAAAAAAABbY29udGVudF9UeXBlc10ueG1sUEsBAhQA" +
      "FAAAAAgAAAAhAG+VbI85AQAAaQIAAAsAAAAAAAAAAAAAAAAAWQEAAF9yZWxzLy5yZWxz" +
      "UEsBAhQAFAAAAAgAAAAhAHQ3/gBmAQAAoAIAABEAAAAAAAAAAAAAAAAA6AIAAHdvcmQv" +
      "ZG9jdW1lbnQueG1sUEsFBgAAAAADAAMArgEAAJ4DAAAAAA==";
    fs.writeFileSync(sampleDocxPath, Buffer.from(minimalDocxBase64, 'base64'));
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('Password123!', saltRounds);

  // Seed Institutional Users with deterministic fixed UUIDs
  const usersToSeed = [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Marcus Vance', email: 'advisor1@springer.capital', role: 'Advisor' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Elena Rostova', email: 'officer1@springer.capital', role: 'Officer' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Sarah Jenkins', email: 'sarah.j@springercapital.com', role: 'Advisor' },
    { id: '00000000-0000-0000-0000-000000000004', name: 'Alex Smith', email: 'alex.smith@springercapital.com', role: 'Officer' },
    { id: '0678188c-93ba-419e-973a-a8d6a9f7bc35', name: 'Active Investment Advisor', email: 'active.advisor@springercapital.com', role: 'Advisor' },
  ];

  const userIds: Record<string, string> = {};

  for (const user of usersToSeed) {
    const existing = await query('SELECT id FROM users WHERE email = $1 OR id = $2', [user.email, user.id]);
    if (existing.rows.length === 0) {
      const inserted = await query(
        `INSERT INTO users (id, name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
         RETURNING id`,
        [user.id, user.name, user.email, passwordHash, user.role]
      );
      userIds[user.email] = inserted.rows[0].id;
      console.log(`[Seed] Created user: ${user.name} <${user.email}> (${user.role})`);
    } else {
      userIds[user.email] = existing.rows[0].id;
      await query('UPDATE users SET name = $1, password_hash = $2 WHERE id = $3', [user.name, passwordHash, existing.rows[0].id]);
      console.log(`[Seed] Updated user: ${user.name} <${user.email}> (${user.role})`);
    }
  }

  // Seed Initial Documents for Advisors
  const advisorEmails = ['advisor1@springer.capital', 'sarah.j@springercapital.com'];
  for (const advEmail of advisorEmails) {
    const advisorId = userIds[advEmail];
    if (advisorId) {
      const sampleDocs = [
        {
          title: 'Q3 Institutional Asset Allocation Model',
          description: 'Quarterly portfolio review and strategic allocation model for HNW institutional clients.',
          status: 'Pending',
          file_name: 'Q3_Asset_Allocation_Model.pdf',
          file_path: sampleDocPath,
          mime_type: 'application/pdf',
        },
        {
          title: 'Private Wealth Portfolio Disclosure Statement',
          description: 'Annual disclosure regarding fiduciary management and risk suitability standards.',
          status: 'Approved',
          file_name: 'Private_Wealth_Disclosure.pdf',
          file_path: sampleDocPath,
          mime_type: 'application/pdf',
        },
        {
          title: 'Global Equity ESG Strategy Filing',
          description: 'Sustainable equity strategy documentation with carbon metrics and exclusionary screening.',
          status: 'Needs Revision',
          file_name: 'ESG_Strategy_Filing.pdf',
          file_path: sampleDocPath,
          mime_type: 'application/pdf',
        },
        {
          title: 'Institutional Portfolio Strategy & Risk Brief',
          description: 'Institutional strategy deck with multi-asset performance projections and standard disclosures.',
          status: 'Pending',
          file_name: 'sample_compliance_filing.docx',
          file_path: sampleDocxPath,
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
              doc.file_path,
              fs.existsSync(doc.file_path) ? fs.statSync(doc.file_path).size : 1024,
              doc.mime_type,
              doc.status,
              advisorId,
            ]
          );
          console.log(`[Seed] Created document: "${doc.title}" [Status: ${doc.status}] for ${advEmail}`);
        }
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
