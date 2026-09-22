# 🤖 Neural Compliance Copilot — Chat Examples & Test Guide

This document contains interactive prompts and sample dialogue transcripts for testing the **Neural Compliance Copilot** in Springer Capital.

---

## 🎯 Quick Start
1. Log in to the application as an **Advisor** or **Compliance Officer**.
2. Click the floating green/dark badge in the bottom-right corner:  
   `[ 🟢 Neural Copilot | Gemini 2.5 ]`
3. Try any of the example prompts or file uploads below.

---

## 📁 1. File Upload, Regulatory Audit & Auto-Remediation

### How to test:
- Click the paperclip button **`[ 📎 ]`** inside the chatbot or **drag and drop** a document file (`.docx`, `.pdf`, `.txt`) into the chat window.

### Sample text to test (save as `draft_proposal.txt` or paste directly):
```text
Our proprietary algorithmic trading strategy guarantees an annualized net return of 24% without downside market risk. Capital allocations are 100% safe from volatility and loss of capital.
```

### Expected Copilot Dialogue & Output:
```text
User: 📎 Uploaded draft file: draft_proposal.txt (1 KB) for institutional compliance audit & auto-remediation.

Springer Neural Copilot:
I completed an institutional compliance audit on your draft. 2 high-risk promissory statements were identified under FINRA Rule 2210 and SEC Rule 206. I have remediated all passages into compliant fiduciary language and generated your ready-to-submit file below.
```

#### Interactive Cards Displayed in Chat:
- **Badge**: `[ 🛡️ 100% Compliant Fiduciary Remediated ]`
- **Infraction Diagnostic**:
  - **Rule**: `FINRA Rule 2210 - Communications with the Public`
  - **Original Passage**: `"Our proprietary algorithmic trading strategy guarantees an annualized net return of 24% without downside market risk."`
  - **Remediated Passage**: `"Our proprietary algorithmic strategy targets an annualized return benchmark of 24%. Capital allocations remain subject to market fluctuation and risk of loss of principal."`
  - **Rationale**: Replaced absolute return guarantee with benchmark objective and inserted statutory risk warning.
- **Action Triggers**:
  - `[ 📋 Copy Text ]` — Copies remediated text to clipboard.
  - `[ 📥 Download Fixed ]` — Downloads compliant document.
  - `[ 🚀 Submit Proposal ]` — Submits proposal directly to review queue with 1 click.

---

## 🔍 2. Natural Language Document Search & Analytics

Try typing these exact queries into the chatbot:

### Query A: Date-Filtered Submissions
```text
Show my submissions from this month
```
**Expected Dialogue:**
```text
User: Show my submissions from this month

Springer Neural Copilot:
I located 6 filings for this month. Status distribution: 4 Approved, 1 Pending, and 1 Needs Revision. All matches comply with baseline regulatory standards.
```
*Live Telemetry Card appears with status badges and quick action chips: `[ 📄 Open File ]`, `[ 🛡️ Audit Trail ]`, `[ 🔄 Lineage ]`.*

---

### Query B: Flagged / Action-Required Filings
```text
Show filings that need revision
```
**Expected Dialogue:**
```text
User: Show filings that need revision

Springer Neural Copilot:
I located 1 filing requiring revision. 1 document has active compliance risk flags under FINRA 2210 / SEC 206.
```
*Suggestion pill appears: `↳ Fix document needing revision`.*

---

### Query C: Approved Filings
```text
Show all approved documents
```

---

### Query D: Keyword / Proposal Title Search
```text
Find Tech Growth proposal
```
```text
Search for Alpha Fund
```

---

### Query E: Temporal Range Queries
```text
Show filings from the past 7 days
```
```text
Show submissions from last month
```
```text
Show filings from 2026
```

---

## ✍️ 3. Fiduciary Grammar & Policy Memo Enhancement

### Grammar Check (`check grammar:`)
```text
check grammar: our firm are committed to provide high returns to all client with zero fees
```
**Expected Dialogue:**
```text
Springer Neural Copilot:
I corrected 3 grammatical and style concerns.

Corrected Version:
"Our firm is committed to providing competitive returns to all clients with transparent fee schedules."
```

---

### Institutional Memo Formatter (`enhance:`)
```text
enhance: approved investment proposal v2 after advisor removed guaranteed return claims per finra 2210
```
**Expected Dialogue:**
```text
Springer Neural Copilot:
Institutional Determination Record:

[DETERMINATION RECORD: APPROVAL]
DOCUMENT: Investment Proposal v2
REGULATORY CRITERIA: FINRA Rule 2210 / SEC Rule 206
SUMMARY: Advisor has amended promotional language, eliminated promissory return guarantees, and inserted required risk suitability disclaimers. Fiduciary standard satisfied.
```

---

## 🏛️ 4. Institutional Platform FAQ & Guidelines

### Regulation Inquiry:
```text
What regulations are enforced on Springer Capital?
```
**Expected Dialogue:**
```text
Springer Neural Copilot:
Springer Capital enforces:
1. FINRA Rule 2210: Fair, balanced communications with required risk disclosures and zero promissory claims.
2. SEC Rule 206(4)-1 & Rule 204: Substantiation of performance claims, clear fee schedules, and disclosure of conflicts of interest.
3. FINRA Rule 2111: Suitability standards tailored to client risk profiles.
```

---

### Workflow Inquiry:
```text
How does document versioning and revision work for advisors?
```
**Expected Dialogue:**
```text
Springer Neural Copilot:
When a compliance officer marks a document as 'Needs Revision', the advisor receives a notification and can upload Version 2 (v2) from My Submissions. The platform maintains the full lineage tree (v1, v2, v3...) with an immutable audit trail and historical reviewer comments.
```

---

### Privacy Inquiry:
```text
How does PII masking protect sensitive data?
```
**Expected Dialogue:**
```text
Springer Neural Copilot:
All documents pass through an automated PII sanitization pipeline before AI processing. Personal data including SSNs, credit card numbers, personal emails, and phone numbers are replaced with [REDACTED_*] tokens. Officers can toggle unmasked views in the Review Workspace under strict audit logging.
```
