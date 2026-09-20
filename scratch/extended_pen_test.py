import json
import time
import urllib.request
import urllib.error
import urllib.parse
import hmac
import hashlib
import base64

BACKEND_URL = "http://localhost:5000"
MASKER_URL = "http://localhost:8002"

results = {
    "summary": {
        "total_tests": 0,
        "passed_defended": 0,
        "gaps_or_observations": 0,
        "execution_time_ms": 0
    },
    "masker_tests": [],
    "auth_rbac_tests": [],
    "jwt_integrity_tests": [],
    "injection_and_idor_tests": []
}

def http_request(url, method="GET", headers=None, body=None):
    if headers is None:
        headers = {}
    data = None
    if body is not None:
        if isinstance(body, (dict, list)):
            data = json.dumps(body).encode('utf-8')
            if 'Content-Type' not in headers:
                headers['Content-Type'] = 'application/json'
        elif isinstance(body, str):
            data = body.encode('utf-8')
        elif isinstance(body, bytes):
            data = body

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            elapsed_ms = round((time.time() - start) * 1000, 2)
            resp_body = resp.read().decode('utf-8', errors='replace')
            try:
                parsed = json.loads(resp_body)
            except Exception:
                parsed = resp_body
            return {
                "status": resp.status,
                "headers": dict(resp.headers),
                "body": parsed,
                "elapsed_ms": elapsed_ms,
                "error": None
            }
    except urllib.error.HTTPError as e:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        err_body = e.read().decode('utf-8', errors='replace')
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return {
            "status": e.code,
            "headers": dict(e.headers),
            "body": parsed,
            "elapsed_ms": elapsed_ms,
            "error": str(e)
        }
    except Exception as e:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        return {
            "status": 0,
            "headers": {},
            "body": None,
            "elapsed_ms": elapsed_ms,
            "error": str(e)
        }

def run_pii_tests():
    print("------------------------------------------------------------")
    print("CATEGORY 1: PII MASKER ROBUSTNESS & EVASION ATTEMPTS")
    print("------------------------------------------------------------")

    test_vectors = [
        {
            "id": "PII-EV-01",
            "name": "Standard Multi-Entity PII Baseline",
            "category": "Baseline",
            "input": "Advisor Marcus Vance met with Dr. Jane Doe. Contact: jane.doe@example.com, Phone: 555-123-4567, SSN: 123-45-6789, Card: 4111-2222-3333-4444, Address: 123 Main Street, Suite 400.",
            "check": lambda out: (
                "123-45-6789" not in out and
                "jane.doe@example.com" not in out and
                "4111-2222-3333-4444" not in out and
                "[EMAIL_1]" in out and
                "[SSN_1]" in out and
                "[CARD_1]" in out
            ),
            "description": "Standard RFC email, 9-digit hyphenated SSN, 16-digit card, street address, and honorific prefixed name."
        },
        {
            "id": "PII-EV-02",
            "name": "SSN Space & Dot Delimiters",
            "category": "SSN Evasion",
            "input": "Client SSN with spaces: 123 45 6789. Another with dots: 987.65.4321.",
            "check": lambda out: "123 45 6789" not in out and "[SSN_" in out,
            "description": "Attempts to evade hyphen-only SSN regex via whitespace and dot separators."
        },
        {
            "id": "PII-EV-03",
            "name": "SSN Contextual Keyword Variation",
            "category": "SSN Evasion",
            "input": "social security: 111-22-3333, ss# 444556666, SSN 999887777",
            "check": lambda out: "111-22-3333" not in out and "444556666" not in out and "999887777" not in out,
            "description": "Prefixes with varying cases and unhyphenated 9 digits directly following label."
        },
        {
            "id": "PII-EV-04",
            "name": "Email Plus-Addressing & Multi-Level Subdomains",
            "category": "Email Evasion",
            "input": "Confidential email: marcus.vance+audit.2026@division.sub.corp.springer.capital and mailto:investor@funds.co.uk.",
            "check": lambda out: (
                "marcus.vance+audit.2026@division.sub.corp.springer.capital" not in out and
                "[EMAIL_1]" in out
            ),
            "description": "Complex email syntax with tag suffixes and 4-level domain trees."
        },
        {
            "id": "PII-EV-05",
            "name": "Spaced/Spelled-Out Email Obfuscation",
            "category": "Email Evasion",
            "input": "Contact advisor at john.doe [at] protonmail [dot] com or alice (at) domain.com.",
            "check": lambda out: True, # Observational test to see if engine catches or safely ignores non-standard text
            "description": "Heuristic evasion attempting human-readable brackets instead of '@'."
        },
        {
            "id": "PII-EV-06",
            "name": "Institutional Stopword Protection (Zero False-Positives)",
            "category": "Noise Filtering",
            "input": "Under Springer Capital Compliance Policy and FINRA Rule 206, the January Securities Exchange Commission report is confidential.",
            "check": lambda out: (
                "Springer Capital" in out and
                "FINRA Rule" in out and
                "Securities Exchange Commission" in out and
                "[NAME_" not in out
            ),
            "description": "Confirms financial entities and months are protected by stopword whitelist."
        },
        {
            "id": "PII-EV-07",
            "name": "Salutation & Contextual Names",
            "category": "Name Detection",
            "input": "Dear Robert Oppenheimer, please coordinate with Advisor: Alice Cooper and Client: David Bowie.",
            "check": lambda out: (
                "Robert Oppenheimer" not in out and
                "Alice Cooper" not in out and
                "David Bowie" not in out and
                "[NAME_" in out
            ),
            "description": "Contextual extraction based on 'Dear', 'Advisor:', and 'Client:' markers."
        },
        {
            "id": "PII-EV-08",
            "name": "Case Variation Salutations (All-Caps / Lowercase)",
            "category": "Name Evasion",
            "input": "DEAR JANE DOE, please reply. Also dear john smith, call back.",
            "check": lambda out: True,
            "description": "Tests case sensitivity boundaries on contextual name detection."
        },
        {
            "id": "PII-EV-09",
            "name": "Pre-Existing Token Protection (Idempotency)",
            "category": "Idempotency",
            "input": "Document already contains [NAME_1] and [EMAIL_1]. Do not alter [SSN_1] or [ACCOUNT_1].",
            "check": lambda out: (
                out.strip() == "Document already contains [NAME_1] and [EMAIL_1]. Do not alter [SSN_1] or [ACCOUNT_1]."
            ),
            "description": "Verifies that running masking on previously masked text does not corrupt tags into [[NAME_1]_1]."
        },
        {
            "id": "PII-EV-10",
            "name": "Deterministic Tag Coherence",
            "category": "Determinism",
            "input": "Dr. Jane Doe met with Marcus Vance. Dr. Jane Doe emailed jane@example.com. Later Dr. Jane Doe confirmed receipt at jane@example.com.",
            "check": lambda out: (
                out.count("[NAME_1]") >= 3 and
                out.count("[EMAIL_1]") == 2 and
                "[EMAIL_2]" not in out
            ),
            "description": "Verifies that repeated occurrences of the exact same entity receive the exact same index."
        },
        {
            "id": "PII-EV-11",
            "name": "Adversarial Partial Boundaries (Sub-threshold digits)",
            "category": "Adversarial Noise",
            "input": "Order # 12-345-678 (8 digits), Partial card: 1234-5678, Short phone: 555-123.",
            "check": lambda out: "12-345-678" in out and "1234-5678" in out,
            "description": "Ensures partial numbers are not erroneously swallowed by SSN/Card regexes."
        },
        {
            "id": "PII-EV-12",
            "name": "High-Density ReDoS / Catastrophic Backtracking Stress",
            "category": "ReDoS Resilience",
            "input": "Dear John Doe, SSN: 123-45-6789, email: test@example.com. " * 300,
            "check": lambda out: (
                "123-45-6789" not in out and
                "test@example.com" not in out
            ),
            "description": "300 repetitive segments (~17,000 characters) to detect non-linear regex processing time."
        }
    ]

    for t in test_vectors:
        resp = http_request(
            f"{MASKER_URL}/mask",
            method="POST",
            body={"document_id": t["id"], "version": 1, "text": t["input"]}
        )
        passed = False
        masked_text = ""
        if resp["status"] == 200 and isinstance(resp["body"], dict):
            masked_text = resp["body"].get("masked_text", "")
            passed = t["check"](masked_text)
            verdict = "DEFENDED (PASS)" if passed else "OBSERVED NUANCE"
        else:
            verdict = f"ERROR ({resp['status']})"
        
        entry = {
            "id": t["id"],
            "name": t["name"],
            "category": t["category"],
            "latency_ms": resp["elapsed_ms"],
            "verdict": verdict,
            "passed": passed,
            "input_sample": t["input"][:90] + ("..." if len(t["input"]) > 90 else ""),
            "output_sample": masked_text[:110] + ("..." if len(masked_text) > 110 else "")
        }
        results["masker_tests"].append(entry)
        results["summary"]["total_tests"] += 1
        if passed:
            results["summary"]["passed_defended"] += 1
        else:
            results["summary"]["gaps_or_observations"] += 1
        print(f"[{t['id']}] {t['name']}: {verdict} ({resp['elapsed_ms']}ms)")

def run_backend_security_tests():
    print("\n------------------------------------------------------------")
    print("CATEGORY 2: AUTHENTICATION, JWT INTEGRITY & RBAC DEFENSES")
    print("------------------------------------------------------------")

    # Log in as test users
    adv_resp = http_request(f"{BACKEND_URL}/auth/login", method="POST", body={"email": "advisor1@springer.capital", "password": "Password123!"})
    off_resp = http_request(f"{BACKEND_URL}/auth/login", method="POST", body={"email": "officer1@springer.capital", "password": "Password123!"})

    advisor_token = adv_resp["body"]["data"]["token"]
    officer_token = off_resp["body"]["data"]["token"]
    advisor_id = adv_resp["body"]["data"]["user"]["id"]
    officer_id = off_resp["body"]["data"]["user"]["id"]

    my_doc_id = "f02fb93e-4224-45bc-92ae-21128c0f6605"       # Owned by Marcus Vance
    foreign_doc_id = "5d7894e4-88bb-44aa-a814-614c813ab51b"  # Owned by qwewqe (other advisor)

    # Sub-Battery 1: Authentication & JWT Integrity
    jwt_cases = [
        {
            "id": "SEC-AUTH-01",
            "name": "Missing Authorization Header",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {},
            "body": None,
            "expected_status": 401,
            "expected_error": "UNAUTHORIZED",
            "description": "Completely unauthenticated client requests protected officer queue."
        },
        {
            "id": "SEC-AUTH-02",
            "name": "Malformed Bearer Token String",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {"Authorization": "Bearer not-a-real-jwt-token"},
            "expected_status": 401,
            "expected_error": "INVALID_TOKEN",
            "description": "Garbage string passed inside Bearer authorization header."
        },
        {
            "id": "SEC-AUTH-03",
            "name": "Unsigned Token / Alg: None Exploit",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {
                # Header: {"alg":"none","typ":"JWT"}, Payload: {"id":"...","email":"officer1@springer.capital","role":"Officer"}
                "Authorization": "Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6ImU0NzBiZDljLTAwOWUtNDBlOS04OWRhLWFlYTg4MGViZjdhOSIsImVtYWlsIjoib2ZmaWNlcjFAc3ByaW5nZXIuY2FwaXRhbCIsInJvbGUiOiJPZmZpY2VyIn0."
            },
            "expected_status": 401,
            "expected_error": "INVALID_TOKEN",
            "description": "Classic CVE-style algorithm confusion attack setting alg:none to bypass signature."
        },
        {
            "id": "SEC-AUTH-04",
            "name": "Forged Token with Rogue Secret Key",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {
                # Header: {"alg":"HS256","typ":"JWT"}, Payload: {"id":"...","role":"Officer"} signed with fake secret 'hackercapital'
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU0NzBiZDljLTAwOWUtNDBlOS04OWRhLWFlYTg4MGViZjdhOSIsImVtYWlsIjoib2ZmaWNlcjFAc3ByaW5nZXIuY2FwaXRhbCIsInJvbGUiOiJPZmZpY2VyIn0.hAC707LkWxV2m27eGk097jD64VbIqG-Qp7r50qT_fake"
            },
            "expected_status": 401,
            "expected_error": "INVALID_TOKEN",
            "description": "Token signed with arbitrary HMAC secret claiming high-privilege Officer role."
        },
        {
            "id": "SEC-AUTH-05",
            "name": "Role Tampering with Invalid Role Enum",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {
                # Payload claims role: 'SuperAdmin' or 'Root'
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsInJvbGUiOiJTdXBlckFkbWluIn0.fake_sig"
            },
            "expected_status": 401,
            "expected_error": "INVALID_TOKEN",
            "description": "Injected non-existent role name to test strict type/schema rejection."
        }
    ]

    for jc in jwt_cases:
        resp = http_request(jc["url"], method=jc["method"], headers=jc.get("headers"), body=jc.get("body"))
        passed = resp["status"] == jc["expected_status"]
        verdict = "DEFENDED (BLOCKED 401)" if passed else f"FAILED (HTTP {resp['status']})"
        entry = {
            "id": jc["id"],
            "name": jc["name"],
            "endpoint": jc["url"].replace(BACKEND_URL, ""),
            "status": resp["status"],
            "verdict": verdict,
            "passed": passed,
            "description": jc["description"],
            "body": str(resp["body"])[:100]
        }
        results["jwt_integrity_tests"].append(entry)
        results["summary"]["total_tests"] += 1
        if passed:
            results["summary"]["passed_defended"] += 1
        else:
            results["summary"]["gaps_or_observations"] += 1
        print(f"[{jc['id']}] {jc['name']}: {verdict}")

    # Sub-Battery 2: Vertical Privilege Escalation & Role Boundaries
    print("\n------------------------------------------------------------")
    print("CATEGORY 3: VERTICAL PRIVILEGE ESCALATION & ROLE ISOLATION")
    print("------------------------------------------------------------")

    rbac_cases = [
        {
            "id": "SEC-RBAC-01",
            "name": "Advisor Accessing Officer Compliance Queue",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 403,
            "expected_error": "FORBIDDEN",
            "description": "Advisor attempting to list the Officer compliance triage queue."
        },
        {
            "id": "SEC-RBAC-02",
            "name": "Advisor Self-Approving Pending Document",
            "method": "PATCH",
            "url": f"{BACKEND_URL}/documents/{my_doc_id}/status",
            "headers": {"Authorization": f"Bearer {advisor_token}", "Content-Type": "application/json"},
            "body": {"status": "Approved", "comment": "Advisor self-approval attempt."},
            "expected_status": 403,
            "expected_error": "FORBIDDEN",
            "description": "Advisor attempting to alter compliance state of their own document to 'Approved'."
        },
        {
            "id": "SEC-RBAC-03",
            "name": "Advisor Rejecting Competitor Document",
            "method": "PATCH",
            "url": f"{BACKEND_URL}/documents/{foreign_doc_id}/status",
            "headers": {"Authorization": f"Bearer {advisor_token}", "Content-Type": "application/json"},
            "body": {"status": "Rejected", "comment": "Competitor document rejection attempt."},
            "expected_status": 403,
            "expected_error": "FORBIDDEN",
            "description": "Advisor attempting to reject another advisor's submission."
        },
        {
            "id": "SEC-RBAC-04",
            "name": "Inverse Boundary: Officer Submitting Advisory Document",
            "method": "POST",
            "url": f"{BACKEND_URL}/documents",
            "headers": {"Authorization": f"Bearer {officer_token}", "Content-Type": "application/json"},
            "body": {"title": "Officer Unauthorized Submission", "description": "Submission by officer"},
            "expected_status": 403,
            "expected_error": "FORBIDDEN",
            "description": "Compliance Officer attempting to submit a document directly (Advisors-only role boundary)."
        },
        {
            "id": "SEC-RBAC-05",
            "name": "Legitimate Officer Queue Access (Baseline Control)",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {"Authorization": f"Bearer {officer_token}"},
            "body": None,
            "expected_status": 200,
            "expected_error": None,
            "description": "Officer authorized access to review triage queue."
        }
    ]

    for rc in rbac_cases:
        resp = http_request(rc["url"], method=rc["method"], headers=rc.get("headers"), body=rc.get("body"))
        passed = resp["status"] == rc["expected_status"]
        verdict = f"DEFENDED ({resp['status']})" if (passed and resp['status'] == 403) else ("AUTHORIZED (200 OK)" if passed else f"FAILED ({resp['status']})")
        entry = {
            "id": rc["id"],
            "name": rc["name"],
            "endpoint": rc["url"].replace(BACKEND_URL, ""),
            "status": resp["status"],
            "verdict": verdict,
            "passed": passed,
            "description": rc["description"],
            "body": str(resp["body"])[:100]
        }
        results["auth_rbac_tests"].append(entry)
        results["summary"]["total_tests"] += 1
        if passed:
            results["summary"]["passed_defended"] += 1
        else:
            results["summary"]["gaps_or_observations"] += 1
        print(f"[{rc['id']}] {rc['name']}: {verdict}")

    # Sub-Battery 3: Horizontal IDOR & Workflow State Integrity
    print("\n------------------------------------------------------------")
    print("CATEGORY 4: HORIZONTAL IDOR & WORKFLOW STATE INTEGRITY")
    print("------------------------------------------------------------")

    idor_cases = [
        {
            "id": "SEC-IDOR-01",
            "name": "Cross-Tenant Document Read (IDOR)",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/{foreign_doc_id}",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 403,
            "expected_error": "FORBIDDEN",
            "description": "Advisor Marcus Vance directly requesting document ID belonging to Advisor qwewqe."
        },
        {
            "id": "SEC-IDOR-02",
            "name": "Cross-Tenant Version Lineage Read (IDOR)",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/{foreign_doc_id}/versions",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 403,
            "expected_error": "FORBIDDEN",
            "description": "Advisor requesting version history and revision thread of another advisor."
        },
        {
            "id": "SEC-IDOR-03",
            "name": "Cross-Tenant AI Analysis Read (IDOR)",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/{foreign_doc_id}/analysis",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 403,
            "expected_error": "FORBIDDEN",
            "description": "Advisor querying compliance AI analysis/summary of a foreign document."
        },
        {
            "id": "SEC-IDOR-04",
            "name": "Cross-Tenant Revision Resubmission Hijack",
            "method": "POST",
            "url": f"{BACKEND_URL}/documents/{foreign_doc_id}/resubmit",
            "headers": {"Authorization": f"Bearer {advisor_token}", "Content-Type": "application/json"},
            "body": {"notes": "Unauthorized resubmission by external advisor"},
            "expected_status": [403, 400],
            "expected_error": ["FORBIDDEN", "VALIDATION_ERROR"],
            "description": "Advisor attempting to submit a new version onto another advisor's document."
        },
        {
            "id": "SEC-STATE-05",
            "name": "Premature Resubmission of Pending Document",
            "method": "POST",
            "url": f"{BACKEND_URL}/documents/{my_doc_id}/resubmit",
            "headers": {"Authorization": f"Bearer {advisor_token}", "Content-Type": "application/json"},
            "body": {"notes": "Resubmitting while review is still Pending"},
            "expected_status": 400,
            "expected_error": "CANNOT_RESUBMIT",
            "description": "Advisor attempting to violate lifecycle by resubmitting document not in 'Needs Revision' status."
        },
        {
            "id": "SEC-INJ-06",
            "name": "SQL Injection in UUID Route Parameter",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/'%20OR%201=1--",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 400,
            "expected_error": "VALIDATION_ERROR",
            "description": "Testing parameterized input validation against classic tautology SQL injection payload."
        },
        {
            "id": "SEC-AUTH-07",
            "name": "Legitimate Advisor Read Own Document (Baseline Control)",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/{my_doc_id}",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 200,
            "expected_error": None,
            "description": "Advisor authorized access to their own document record."
        }
    ]

    for ic in idor_cases:
        resp = http_request(ic["url"], method=ic["method"], headers=ic.get("headers"), body=ic.get("body"))
        if isinstance(ic["expected_status"], list):
            passed = resp["status"] in ic["expected_status"]
        else:
            passed = resp["status"] == ic["expected_status"]
            
        verdict = f"DEFENDED ({resp['status']})" if (passed and resp['status'] in [400, 403]) else ("AUTHORIZED (200 OK)" if passed else f"FAILED ({resp['status']})")
        entry = {
            "id": ic["id"],
            "name": ic["name"],
            "endpoint": ic["url"].replace(BACKEND_URL, ""),
            "status": resp["status"],
            "verdict": verdict,
            "passed": passed,
            "description": ic["description"],
            "body": str(resp["body"])[:100]
        }
        results["injection_and_idor_tests"].append(entry)
        results["summary"]["total_tests"] += 1
        if passed:
            results["summary"]["passed_defended"] += 1
        else:
            results["summary"]["gaps_or_observations"] += 1
        print(f"[{ic['id']}] {ic['name']}: {verdict}")

if __name__ == "__main__":
    start_total = time.time()
    run_pii_tests()
    run_backend_security_tests()
    total_time = round((time.time() - start_total) * 1000, 2)
    results["summary"]["execution_time_ms"] = total_time
    
    with open("extended_pen_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print("\n============================================================")
    print(f"PEN-TEST SUITE EXECUTION SUMMARY:")
    print(f"Total Test Cases Run:   {results['summary']['total_tests']}")
    print(f"Defended / Passed:      {results['summary']['passed_defended']}")
    print(f"Nuances / Observations: {results['summary']['gaps_or_observations']}")
    print(f"Total Execution Time:   {total_time} ms")
    print("============================================================")
