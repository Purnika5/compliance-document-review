# 🚀 Task Specification: Neural Compliance Copilot, Filterable Search & In-Chat Document Remediation (Grok API Integration)

## 🎯 Executive Objective
Build and integrate an enterprise-grade **Filterable Document Search & Analytics Engine** connected to a futuristic, conversational **Neural Compliance Copilot** powered by the **xAI Grok API** (with resilient Gemini/Local fallback). 

In addition to querying repository records by title, status, uploader, date ranges, and version lineages, the Copilot features an interactive **In-Chat File Audit & Auto-Fixing Engine**:
> **Advisors can upload draft files (PDF, DOCX, TXT) directly into the chatbot.** The AI audits the file against strict institutional regulatory rules (FINRA Rule 2210 & SEC Rule 206), explicitly breaks down **what needs to change** (with highlighted violation passages and explanations), and **automatically delivers the already-fixed, compliant file / text** ready for instant download or 1-click submission.

---

## 🏗️ 1. Architecture & Real System Mapping

### Underlying Codebase Context
- **Database Tables**:
  - `documents` (`id`, `title`, `description`, `status`, `version`, `original_document_id`, `advisor_id`, `created_at`, `file_size`)
  - `users` (`id`, `name`, `email`, `role: 'Advisor' | 'Officer'`)
  - `document_analyses` (`document_id`, `version`, `summary`, `flags` [JSONB array])
  - `revision_threads` & `revision_thread_entries` (`root_document_id`, `author_id`, `message`, `entry_type`)
- **Status Domain**: `'Pending'`, `'Approved'`, `'Needs Revision'`, `'Rejected'`
- **Role Security**:
  - **Advisors**: Scoped strictly to their own submissions (`advisor_id = req.user.id`)
  - **Officers**: Enterprise access across all advisory filings and queues

---

## 📋 2. Functional Requirements

### A. Advanced Multi-Dimensional Filter Engine
- **Title Matching**: Partial, case-insensitive fuzzy search (`d.title ILIKE %:query%`).
- **Date Range Resolver**:
  - Parse ISO strings (`2026-01-01` to `2026-03-31`)
  - Parse natural-language shortcuts:
    - `"today"`, `"yesterday"`, `"past 7 days"`, `"this month"`, `"last month"`, `"quarter to date"`, `"2025"`, `"2026"`
- **Uploader / Ownership Scope**:
  - Auto-resolve `"my uploads"`, `"my files"` -> `req.user.id`
  - Officer queries: Filter by specific advisor name, email, or UUID
- **Multi-Select Status**:
  - Single or multi-status array: e.g., `["Approved", "Needs Revision"]`
- **Smart Versioning Resolution**:
  - **Default**: Group by document family (`COALESCE(original_document_id, id)`) and return only the **Latest Active Version**.
  - **`include_all_versions: true`**: Return entire version lineage tree (`v1`, `v2`, `v3...`).
  - Expose lineage metadata: `current_version`, `total_versions`, `has_revisions`, `latest_doc_id`.

### B. High-Density Analytics Aggregator
Return structured real-time metrics with every search:
1. **Total Matches** (count of family groups or documents)
2. **Breakdown by Status**: `{ Pending: n, Approved: n, NeedsRevision: n, Rejected: n }`
3. **Regulatory Risk Summary**: Count of documents with active FINRA 2210 / SEC 206 flags.
4. **Revision Velocity**: Percentage and count of filings requiring versioning (`v2+`).
5. **Temporal Aggregation**: Document volume grouped by week/month for trend telemetry.

### C. In-Chat File Upload, Compliance Audit & Automated Remediation (NEW)
1. **Direct File Drag-and-Drop / Upload in Chat**:
   - Advisors can drop or attach files directly into the chatbot input area (`.pdf`, `.docx`, `.xlsx`, `.txt` up to 25MB).
   - Ingestion uses the backend text-extraction & PII-sanitization pipeline before AI evaluation.
2. **Pre-Submission Compliance & Grammar Audit**:
   - The Copilot inspects the file against:
     - **FINRA Rule 2210**: Identifies promissory phrasing, guaranteed return claims, unbacked performance assertions, and missing risk suitability disclaimers.
     - **SEC Rule 206(4)-1 & Rule 204**: Flags conflict-of-interest ambiguities, unsubstantiated fee structures, and unbalanced testimonials.
     - **Institutional Fiduciary Grammar**: Refines tone from casual sales hype to rigorous fiduciary institutional prose.
3. **Detailed "What Needs to Change" Diagnostic Display**:
   - Displays clear, expandable change cards inside the chat stream:
     - **Original Problematic Passage** (highlighted in red).
     - **Regulatory Rule & Infraction Reason**.
     - **Prescribed Amendment** (why the change is required under compliance standards).
4. **Already-Fixed File Delivery (Automated Remediation)**:
   - The Copilot produces the **fully rewritten, compliant version** of the file/text.
   - Provides immediate interactive output actions:
     - `[ 📋 Copy Remediated Text ]` (instant copy to clipboard).
     - `[ 📥 Download Fixed File (.docx) ]` (client-ready compliant document with institutional styling).
     - `[ 🚀 Submit Directly as Proposal ]` (1-click trigger that pre-fills and opens the submission modal or creates a new filing directly).

---

## 🤖 3. Futuristic Conversational AI Layer (xAI Grok API)

### A. Persona & Tone: "Springer Neural Copilot"
- **Identity**: Elite Wall Street compliance intelligence analyst and fiduciary drafting specialist.
- **Tone**: Ultra-modern, sharp, conversational, polite, and confident (e.g., *"Greetings Keith! I analyzed your uploaded portfolio deck. I found 2 high-risk promissory statements under FINRA Rule 2210. I've broken down what needed changing and generated your already-fixed compliant version below."*).
- **Zero Hallucination Guarantee**: Ground all audit flags and search counts strictly in the verified document text and database records. Never fabricate data.
- **Conversational Memory & Refinement**:
  - Support natural conversational follow-ups:
    - User: *"Show me my submissions from last month."*
    - Copilot: *"You have 14 filings from August—10 Approved, 3 Pending, and 1 Needs Revision."*
    - User: *"Fix the one that needs revision."*
    - Copilot: *(Pulls the flagged document, isolates the issue, and generates the corrected version directly in the chat)*.

### B. Grok API Integration Contract
- **Client**: Call `https://api.x.ai/v1/chat/completions` using `XAI_API_KEY` (OpenAI-compatible payload).
- **Target Model**: `grok-beta` or `grok-2`.
- **System Prompt for Remediation & Audit**:
  ```text
  You are Springer Capital's Neural Compliance Copilot.
  You are an expert Wall Street compliance officer and fiduciary editor.
  
  When an Advisor uploads a document or draft:
  1. AUDIT: Identify every passage violating FINRA Rule 2210 (promissory language, guaranteed returns, unbalanced risks) or SEC Rule 206 (fiduciary disclosures).
  2. BREAKDOWN: Clearly state WHAT needs to change, QUOTING the exact offending passage and citing the regulatory rule.
  3. REMEDIATE: Provide the COMPLETE, FIXED, and COMPLIANT text. Rewrite promissory claims into balanced fiduciary language with proper risk disclosures.
  4. TONE: Professional, futuristic, crisp, and constructive.
  ```

### C. Graceful Degradation & Resilience
- **Dual-Tier Fallback Strategy**:
  1. If `Grok API` is rate-limited or times out (>8s) ➔ Fall back to internal `Gemini 2.5/1.5 Flash` service (`ai/app/main.py`).
  2. If all AI services are offline ➔ Generate rule-grounded heuristic compliance flags and templated fixes.
  3. Raw data and remediated text MUST NEVER fail; always return valid structured output even during partial network latency.

---

## 🎨 4. Futuristic Chatbot UI/UX Enhancements (`chatbot-widget.tsx`)

1. **Cyber-Institutional Aesthetics**:
   - Palette: Deep Forest `#183028`, High-Contrast Neon Accent `#C5E86C`, Translucent Emerald glassmorphism (`backdrop-blur-md bg-[#183028]/95`).
   - Glowing pulsating neural status dot: `"Grok Neural Engine: Active"`.
   - File attachment clip `[ 📎 ]` and drag-and-drop overlay in chat window with upload progress animation.
2. **Interactive Live Data Cards inside Chat**:
   - **File Audit & Remediation Card**:
     - **Before vs After Diff Viewer**: Red/Green side-by-side or stacked diff showing exact changes made.
     - **Compliance Score Gauge**: Visual pill showing compliance readiness (`e.g., "Remediated to 100% Compliant"`).
     - **Action Triggers**:
       - `[ 📥 Download Fixed File ]`
       - `[ 📋 Copy Fixed Text ]`
       - `[ 🚀 Submit Directly as Version 2 / New Proposal ]`
   - **Repository Search Telemetry Cards**:
     - **Status Badge Chips**: `Approved` (green), `Needs Revision` (amber), `Pending` (blue).
     - **Quick-Action Chips**:
       - `[ 📄 Open Document ]` ➔ navigates to `/documents/{id}`
       - `[ 🔄 View Lineage (v1-v{n}) ]` ➔ opens version comparison modal
       - `[ 🛡️ Audit Trail ]` ➔ navigates to `/documents/{id}/audit-trail`
3. **Dynamic Contextual Suggestion Bubbles**:
   - `[ Fix another file ]`
   - `[ Show high-risk flags ]`
   - `[ Submit remediated version as revision ]`

---

## 📦 5. API Endpoints & Contract

### 1. `POST /api/documents/search` (Filterable Repository Search)
**Headers**: `Authorization: Bearer <JWT>`  
**Request Body**:
```json
{
  "query": "alpha fund",
  "status": ["Pending", "Needs Revision"],
  "date_range": "past 30 days",
  "uploaded_by": "my uploads",
  "include_all_versions": false,
  "conversation_history": [
    { "role": "user", "content": "Show me my files from last month" }
  ]
}
```

---

### 2. `POST /api/chat/audit-and-fix` (In-Chat File Audit & Auto-Remediation)
**Headers**: `Authorization: Bearer <JWT>`, `Content-Type: multipart/form-data`  
**Payload**:
- `file`: Uploaded file binary (PDF, DOCX, TXT)
- `target_document_id`: Optional (if fixing a specific existing document revision)
- `instructions`: Optional advisor notes (e.g., *"Make tone appropriate for institutional pension clients"*)

**Response Payload**:
```json
{
  "success": true,
  "file_meta": {
    "original_filename": "Q3_Tech_Growth_Proposal_v1.docx",
    "file_size": 184520,
    "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  },
  "conversational_summary": "I reviewed your draft deck. 2 passages contained promissory return guarantees that violate FINRA Rule 2210. I have amended both sections into balanced fiduciary language and generated your ready-to-submit compliant file below.",
  "audit_breakdown": [
    {
      "rule": "FINRA Rule 2210 - Communications with the Public",
      "original_passage": "Our proprietary AI hedge algorithm guarantees a net annualized return of 24% without downside market risk.",
      "issue": "Promissory performance guarantee and total risk omission.",
      "fixed_passage": "Our proprietary algorithmic strategy targets a 24% annualized return benchmark. Capital allocations remain subject to market risk and loss of principal.",
      "reason": "Replaced absolute return guarantee with benchmark target and inserted required downside risk disclaimers."
    }
  ],
  "remediated_content": {
    "text": "Full remediated document text ready for preview or copying...",
    "download_url": "/api/documents/download-remediated?token=tmp_rem_8f9a2",
    "suggested_title": "Q3 Tech Growth Proposal (Compliance Remediated)"
  },
  "one_click_actions": {
    "can_submit_as_new": true,
    "can_submit_as_revision": true,
    "target_document_id": null
  }
}
```

---

## ✅ Acceptance Criteria
1. **File Upload & Ingestion in Chat**: Advisors can upload `.pdf`, `.docx`, and `.txt` files directly into the chatbot without page reload.
2. **Accurate Infraction Breakdown**: The AI clearly identifies offending phrases, explains the specific regulatory rule (FINRA 2210 / SEC 206), and highlights what must change.
3. **Automated Remediated Output**: The AI produces the complete, already-fixed text and provides an instant download button for the remediated file.
4. **1-Click Workflow Bridge**: Advisors can click a button inside the chat to submit the remediated document directly as a new filing or resubmission.
5. **Dual Engine Resilience**: If Grok API is slow or offline, the system falls back to Gemini or heuristic rule engines with zero downtime or broken chat states.
6. **Security & Ownership**: Advisors cannot view or fix documents belonging to other advisors.
