# Contributing to Compliance Document Review Platform

Welcome to the **Springer Capital Compliance Document Review** engineering team.

To ensure stability, code quality, and smooth multi-track collaboration, all engineers must follow this branching and contribution guide.

---

## 🌳 Branching Strategy

Our repository operates on a strict three-tier branching model:

```
main (Production / Tagged Releases)
  └── staging (Integration Branch)
        ├── backend/<task-name>
        ├── frontend/<task-name>
        ├── ai/<task-name>
        ├── data/<task-name>
        └── devops/<task-name>
```

### Branch Roles
1. **`main`**:
   - **Production-ready code only**.
   - Direct commits and direct pushes are strictly forbidden.
   - Only receives merges from `staging` after thorough end-to-end integration and smoke testing.
2. **`staging`**:
   - **Active integration branch**.
   - All feature and task branches are cut from `staging` and merged back into `staging` via Pull Requests.
   - Serves as the single source of truth for the ongoing development sprint.
3. **Feature / Task Branches**:
   - Must be task-specific, prefixed by track:
     - `backend/<task-name>` (e.g. `backend/auth-roles`, `backend/document-crud`)
     - `frontend/<task-name>` (e.g. `frontend/queue-ui`, `frontend/upload-modal`)
     - `ai/<task-name>` (e.g. `ai/prompt-engineering`, `ai/gemini-service`)
     - `data/<task-name>` (e.g. `data/schema-update`, `data/ingestion-pipeline`)
     - `devops/<task-name>` (e.g. `devops/docker-ci`, `devops/pii-masker`)

---

## 🔄 Development & Pull Request Workflow

### Step 1: Branch Off Staging
Always update your local `staging` before cutting a new branch:
```bash
git checkout staging
git pull origin staging
git checkout -b <track>/<task-name>
```

### Step 2: Develop & Test Locally
Before pushing your changes, run track-specific quality checks:
- **Backend**:
  ```bash
  npm --prefix backend test
  ```
- **Frontend**:
  ```bash
  npm --prefix frontend run build
  ```
- **Python (AI & Data)**:
  ```bash
  python3 -m py_compile <path/to/script.py>
  ```

### Step 3: Open a Pull Request
1. Push your branch to GitHub:
   ```bash
   git push -u origin <track>/<task-name>
   ```
2. Open a Pull Request targeting **`base: staging`** (never `main`).
3. Fill out the PR description with:
   - Summary of changes
   - Linked Jira issue (e.g. `KAN-6`)
   - How the changes were tested
4. Ensure all CI checks (linting, automated role-boundary tests) pass.

### Step 4: Code Review & Merging
- At least one code review is required before merging.
- Merges into `staging` should maintain clean linear or standard merge commits.

---

## 🛡️ Security & Role Boundary Guidelines

1. **Role Enforcement**:
   - Every API endpoint handling sensitive resources must be guarded by `authenticateToken` and `requireRole(['Advisor'] | ['Officer'])`.
   - Never rely solely on client-side route hiding; all authorization boundaries must be validated server-side.
2. **PII Protection**:
   - Do not commit real client data, SSNs, financial statements, or personal identifiers.
   - Raw document files must reside in Git-ignored directories (`uploads/`, `storage/documents/`).
3. **Secrets Management**:
   - Never commit API keys, `.env`, or `.env.local` files. Use `.env.example` to document environment variable requirements.

---

## 🐳 Running with Docker

To run the full stack locally with one command:
```bash
cp .env.example .env
docker compose up --build
```
This spins up:
- **PostgreSQL**: Port `5432`
- **Backend API**: Port `5000`
- **Frontend Web App**: Port `3000`
- **Mock AI API**: Port `8001` (allows 100% offline development without rate limits)
