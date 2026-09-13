import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'compliance_doc_review',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-compliance-jwt-key-change-in-production-2026!',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  uploads: {
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads/documents'),
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain'
    ]
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },

  services: {
    piiMaskerUrl: process.env.PII_MASKER_URL || (process.env.NODE_ENV === 'production' ? 'http://pii-masker:8002' : 'http://localhost:8002'),
    aiServiceUrl: process.env.AI_SERVICE_URL || (process.env.NODE_ENV === 'production' ? 'http://ai-service:8000' : 'http://localhost:8000'),
  }
};
