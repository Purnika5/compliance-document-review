-- Track applied migrations in schema_migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (migration_name) VALUES ('001_initial_schema.sql') ON CONFLICT (migration_name) DO NOTHING;
INSERT INTO schema_migrations (migration_name) VALUES ('002_versioning_and_revisions.sql') ON CONFLICT (migration_name) DO NOTHING;
INSERT INTO schema_migrations (migration_name) VALUES ('003_audit_trail_and_notifications.sql') ON CONFLICT (migration_name) DO NOTHING;
INSERT INTO schema_migrations (migration_name) VALUES ('004_document_analysis.sql') ON CONFLICT (migration_name) DO NOTHING;
INSERT INTO schema_migrations (migration_name) VALUES ('005_user_quotas.sql') ON CONFLICT (migration_name) DO NOTHING;

-- Seed Institutional Users (Password: Password123!)
INSERT INTO users (id, name, email, password_hash, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Marcus Vance', 'advisor1@springer.capital', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Advisor'),
    ('00000000-0000-0000-0000-000000000002', 'Elena Rostova', 'officer1@springer.capital', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Officer'),
    ('00000000-0000-0000-0000-000000000003', 'Sarah Jenkins', 'sarah.j@springercapital.com', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Advisor'),
    ('00000000-0000-0000-0000-000000000004', 'Alex Smith', 'alex.smith@springercapital.com', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Officer'),
    ('0678188c-93ba-419e-973a-a8d6a9f7bc35', 'Active Investment Advisor', 'active.advisor@springercapital.com', '$2b$10$/UpxEjU71reH2KMmsTPSXOMSIqT0LUFfwviBLbHn92FGZI7E1YwOe', 'Advisor')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash;

-- Seed Sample Documents for Advisors
INSERT INTO documents (id, title, description, file_name, file_path, file_size, mime_type, status, advisor_id)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Q3 Institutional Asset Allocation Model', 'Quarterly portfolio review and strategic allocation model for HNW institutional clients.', 'Q3_Asset_Allocation_Model.pdf', 'uploads/documents/sample_compliance_filing.pdf', 1024, 'application/pdf', 'Pending', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000002', 'Private Wealth Portfolio Disclosure Statement', 'Annual disclosure regarding fiduciary management and risk suitability standards.', 'Private_Wealth_Disclosure.pdf', 'uploads/documents/sample_compliance_filing.pdf', 1024, 'application/pdf', 'Approved', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000003', 'Global Equity ESG Strategy Filing', 'Sustainable equity strategy documentation with carbon metrics and exclusionary screening.', 'ESG_Strategy_Filing.pdf', 'uploads/documents/sample_compliance_filing.pdf', 1024, 'application/pdf', 'Needs Revision', '00000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000004', 'Institutional Portfolio Strategy & Risk Brief', 'Institutional strategy deck with multi-asset performance projections and standard disclosures.', 'sample_compliance_filing.docx', 'uploads/documents/sample_compliance_filing.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Pending', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;
