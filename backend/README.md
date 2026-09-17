# Compliance Document Review - Backend Service

Production-ready backend API service for the AI-assisted Compliance Document Review application.

---

## 🛠 Tech Stack & Architecture

- **Language & Runtime**: Node.js (v22+) + TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ (`pg` connection pool with automatic migrations)
- **Security & Auth**: `bcrypt` (12 rounds) + `jsonwebtoken` (JWT) + `helmet` + `cors`
- **Validation**: `zod`
- **File Uploads**: `multer` with disk storage and type validation (PDF, DOCX, XLSX, TXT)
- **Testing**: `jest` + `supertest` + `ts-jest`

---

## 📁 Architecture Overview

```
backend/
├── src/
│   ├── config/             # Centralized environment configuration
│   ├── controllers/        # Request handling and HTTP response orchestration
│   ├── db/                 # PostgreSQL pool, query wrapper & migrations
│   │   ├── migrations/     # Versioned SQL migration files
│   │   ├── migrate.ts      # Migration runner
│   │   └── pool.ts         # pg.Pool instance
│   ├── middleware/         # Auth, role guard, file upload, error handling
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── validate.middleware.ts
│   ├── routes/             # Express route definitions
│   │   ├── auth.routes.ts
│   │   ├── document.routes.ts
│   │   ├── health.routes.ts
│   │   └── index.ts
│   ├── services/           # Core domain and business logic
│   │   ├── auth.service.ts
│   │   └── document.service.ts
│   ├── types/              # TypeScript interfaces and model types
│   ├── utils/              # Standardized API response formatters
│   ├── app.ts              # Express application configuration
│   └── server.ts           # Server bootstrap and graceful shutdown
├── tests/                  # End-to-end integration test suite
├── uploads/documents/      # Uploaded files directory
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 20
- PostgreSQL >= 14 (or Docker)

### 2. Environment Setup
```bash
cp .env.example .env
```

Default `.env` configuration:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=compliance_doc_review
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=super-secret-compliance-jwt-key-change-in-production-2026!
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads/documents
MAX_FILE_SIZE_MB=25
CORS_ORIGIN=*
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Migrations & Start Server
```bash
# Run migrations manually (also runs automatically on server start)
npm run migrate

# Start development server with auto-reload
npm run dev

# Run production build
npm run build
npm start
```

---

## 🧪 Testing

Run the full integration test suite covering health checks, auth flows, role enforcement, document submissions, status updates, and privacy scoping:

```bash
npm test
```

---

## 📡 API Reference & Contracts

### 1. Health & System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Returns service & database health status (`200 OK` / `503`) |

**Sample Response (`GET /health`):**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "service": "compliance-backend",
    "timestamp": "2026-09-02T09:30:00.000Z",
    "uptimeSeconds": 120,
    "database": "connected",
    "environment": "development"
  }
}
```

---

### 2. Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | None | Register a new user (`Advisor` or `Officer` role) |
| `POST` | `/auth/login` | None | Authenticate user & return JWT token |
| `GET` | `/auth/me` | Bearer Token | Retrieve authenticated user profile |

#### `POST /auth/signup`
**Request Body:**
```json
{
  "name": "Sahil Sonar",
  "email": "sahil.advisor@example.com",
  "password": "SecurePassword123!",
  "role": "Advisor"
}
```
*Note: `role` must be either `"Advisor"` or `"Officer"`.*

**Success Response (`201 Created`):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "c62bf6a9-8581-4ba2-9214-4a4cb6a8d6e3",
      "name": "Sahil Sonar",
      "email": "sahil.advisor@example.com",
      "role": "Advisor",
      "created_at": "2026-09-02T09:30:00.000Z",
      "updated_at": "2026-09-02T09:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### `POST /auth/login`
**Request Body:**
```json
{
  "email": "sahil.advisor@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "c62bf6a9-8581-4ba2-9214-4a4cb6a8d6e3",
      "name": "Sahil Sonar",
      "email": "sahil.advisor@example.com",
      "role": "Advisor",
      "created_at": "2026-09-02T09:30:00.000Z",
      "updated_at": "2026-09-02T09:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Document Management & Review Flow
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `POST` | `/documents` | **Advisor** | Upload and submit initial document v1 (`multipart/form-data`) |
| `GET` | `/documents/queue` | **Officer** | Officer review queue with status filtering (`All`, `Pending`, etc.) |
| `POST` | `/documents/:id/resubmit` | **Advisor** | Resubmit revised document as a new version (`v2, v3...`) |
| `PATCH` | `/documents/:id/status` | **Officer** | Update document review status with optional audit comment |
| `GET` | `/documents/:id/versions` | Any (Scoped) | Get full document version lineage and revision thread entries |
| `GET` | `/documents` | Any (Scoped) | List documents (Advisor sees own; Officer sees all) |
| `GET` | `/documents/:id` | Any (Scoped) | Get single document detail (Ownership checked) |

#### `GET /documents/queue` (Officer Only)
**Headers:**
`Authorization: Bearer <Officer_token>`

**Query Parameters:**
- `status`: Optional filter (`All`, `Pending`, `Needs Revision`, `Approved`, `Rejected`)

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Officer review queue retrieved successfully",
  "data": [
    {
      "id": "e93fac3a-8d64-40b8-904b-20d1f98cf2ea",
      "title": "Institutional Equity Pitch Deck",
      "status": "Pending",
      "version": 1,
      "original_document_id": null,
      "advisor_name": "Advisor One",
      "advisor_email": "advisor@example.com",
      "created_at": "2026-09-02T09:30:00.000Z"
    }
  ]
}
```

#### `POST /documents/:id/resubmit` (Advisor Only)
**Headers:**
`Authorization: Bearer <Advisor_token>`
`Content-Type: multipart/form-data`

**Form Data:**
- `file`: File upload (`.pdf`, `.docx`, `.xlsx`, `.txt`)
- `title`: String (optional, defaults to original document title)
- `description`: String (optional)
- `notes`: String (optional audit note explaining revisions made)

**Requirements:**
- Document `:id` must currently have status `'Needs Revision'`.
- Only the original submitting advisor can resubmit.
- Creates an incremented version (e.g. `version: 2`) with status reset to `'Pending'` and links `original_document_id` to the root document.

#### `PATCH /documents/:id/status` (Officer Only)
**Headers:**
`Authorization: Bearer <Officer_token>`

**Request Body:**
```json
{
  "status": "Needs Revision",
  "comment": "Please add required FINRA Rule 2111 risk disclosure on slide 8."
}
```
*Allowed statuses: `"Approved"`, `"Needs Revision"`, `"Rejected"`.*

#### `GET /documents/:id/versions`
**Headers:**
`Authorization: Bearer <token>`

**Success Response (`200 OK`):**
Returns `{ versions: [...], thread_entries: [...] }` containing all historical versions of the document lineage and the full revision conversation thread.

#### `GET /documents`
**Headers:**
`Authorization: Bearer <token>`

**Query Parameters (Officer only):**
- `status`: Optional filter (`Pending`, `Approved`, `Needs Revision`, `Rejected`, `all`)
- `advisor_id`: Optional UUID filter

**Behavior:**
- **Advisor**: Always scoped to documents where `advisor_id = req.user.id`.
- **Officer**: Returns all documents across all advisors.

#### `GET /documents/:id`
**Headers:**
`Authorization: Bearer <token>`

**Behavior:**
- **Advisor**: Permitted only if `document.advisor_id === req.user.id`. Otherwise returns `403 Forbidden`.
- **Officer**: Permitted to view any document detail.

