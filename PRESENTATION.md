# Springer Capital - Compliance Document Review Platform
## Simple Presentation Deck

---

### Slide 1: Introduction (Project Overview)
**Title:** Springer Capital Compliance Document Review Platform  
**Purpose:** An AI-powered regulatory compliance review platform that bridges Financial Advisors and Compliance Officers.

* **The Problem:**
  * Financial advisory documents must strictly comply with **FINRA Rule 2210** (no promissory/guaranteed claims) and **SEC Rule 206** (mandatory fee & risk disclosures).
  * Manual document reviews are slow, prone to human error, and risk exposing sensitive client PII.
* **Our Solution:**
  * **Automated AI Detection:** Instantly flags non-compliant sentences and verifies them against retrieved regulatory rules.
  * **Neural Copilot Chatbot:** Enables advisors to scan drafts in chat and auto-remediates violating language into compliant fiduciary text with one click.
  * **Supervisory Officer Workspace:** Provides compliance officers with exact verbatim highlighted text and one-click determination workflows.
  * **Zero-Trust Audit Trail:** Logs every decision, scan, and status change into an immutable audit history.

---

### Slide 2: Mentor & Engineering Team

* **Project Mentor:**
  * **Jayanth** – Architectural oversight, compliance governance, and project guidance.

* **Engineering Team:**
  * **Keith Lachica** – *Frontend Engineer & New Team Lead*  
    (Next.js / React UI architecture, review workspace, interactive calendar triage, guided tours, and frontend state management)
  * **Sahil** – *Backend Lead*  
    (REST API architecture, PostgreSQL database design, auth/RBAC middleware, and supervisory decision routes)
  * **Purnika Naga Durga Jyothi** – *AI Engineer*  
    (FastAPI microservice, Gemini LLM prompt engineering, FINRA/SEC rule grounding, and PII masking)
  * **Udhayveer Singh Jamwal** – *Data Engineer*  
    (Audit logging pipeline, regulatory event schemas, and historical data analytics)
  * **Kumkum** – *Backend Engineer*  
    (Document ingestion pipeline, file extraction, status transition workflows, and queue management)

---

### Slide 3: Live Demo Flow

#### 1. Advisor Experience (Submission & In-Chat Remediation)
* Log in as an **Advisor**.
* Navigate to the **Neural Copilot Chatbot** and upload a draft containing prohibited claims (e.g., *"guarantees 24% return"*).
* The chatbot analyzes the file, lists the findings under FINRA Rule 2210 / SEC Rule 206, and generates a **100% remediated, compliant document**.
* Submit the remediated document directly with **1-Click Submit**.

#### 2. Officer Review Workspace (Supervisory Inspection)
* Switch to the **Compliance Officer** role and open the **Review Queue**.
* Select the submitted document:
  * View highlighted verbatim passages grounded directly in the file.
  * Inspect rule citations, risk category ratings, and confidence scores.
* Execute a supervisory determination: **Approve**, **Request Revision**, or **Reject** with mandatory compliance notes.

#### 3. Audit History (Regulatory Verification)
* Open the **Audit Trail**.
* Verify that the entire lifecycle (upload, chatbot remediation, and officer decision) is logged with immutable timestamps and reviewer signatures.
