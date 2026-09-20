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
    "masker_tests": [],
    "auth_tests": []
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

def run_masker_tests():
    print("========================================")
    print("RUNNING PII MASKER PEN-TEST BATTERY")
    print("========================================")
    
    cases = [
        {
            "id": "MASK-01",
            "category": "Baseline Standard PII",
            "description": "Standard formats for Email, SSN, Phone, Card, Address, Prefixed Name",
            "payload": (
                "Advisor Marcus Vance met with Dr. Jane Doe. "
                "Contact: jane.doe@example.com or 555-123-4567. "
                "SSN is 123-45-6789. Card is 4111-2222-3333-4444. "
                "Client lives at 123 Main Street, Suite 400."
            ),
            "evaluate": lambda masked: (
                "[EMAIL_1]" in masked and
                "[SSN_1]" in masked and
                "[PHONE_1]" in masked and
                "[CARD_1]" in masked and
                "[ADDRESS_1]" in masked and
                "123-45-6789" not in masked and
                "jane.doe@example.com" not in masked
            )
        },
        {
            "id": "MASK-02",
            "category": "SSN Delimiter Evasion",
            "description": "SSN separated by spaces, dots, slashes, or preceded by label variations",
            "payload": (
                "Case A: 123 45 6789. "
                "Case B: SSN 987654321. "
                "Case C: social security: 111-22-3333. "
                "Case D: ss# 444556666. "
                "Case E: 999.88.7777."
            ),
            "evaluate": lambda masked: (
                "123 45 6789" not in masked and
                "987654321" not in masked and
                "111-22-3333" not in masked and
                "444556666" not in masked
            )
        },
        {
            "id": "MASK-03",
            "category": "Email Obfuscation & Subdomains",
            "description": "Multi-tier subdomains, plus-tag addressing, and obfuscated bracket forms",
            "payload": (
                "Primary: marcus.vance+compliance-audit@division.sub.springer.capital. "
                "Mailto: mailto:investor_relations@fintech-fund.co.uk. "
                "Obfuscated: target.client [at] protonmail [dot] com."
            ),
            "evaluate": lambda masked: (
                "marcus.vance+compliance-audit@division.sub.springer.capital" not in masked and
                "investor_relations@fintech-fund.co.uk" not in masked
            )
        },
        {
            "id": "MASK-04",
            "category": "Account & Financial Identifiers",
            "description": "Labeled bank account numbers and unhyphenated credit card digits",
            "payload": (
                "Wire transfer info: Account Number: ACCT-987654321, "
                "Routing Number: 021000021, "
                "Acct # 888777666555. "
                "Unspaced Card: 4111222233334444."
            ),
            "evaluate": lambda masked: (
                "ACCT-987654321" not in masked and
                "[ACCOUNT_" in masked
            )
        },
        {
            "id": "MASK-05",
            "category": "Stopword Collision & Financial Preservations",
            "description": "Ensures institutional phrases and regulatory terms are NOT falsely masked as personal names",
            "payload": (
                "According to Springer Capital Compliance Policy and FINRA Rule 206, "
                "the January Investment Fund Report was submitted by Securities Exchange Commission guidelines."
            ),
            "evaluate": lambda masked: (
                "Springer Capital" in masked and
                "FINRA Rule" in masked and
                "Securities Exchange Commission" in masked and
                "[NAME_" not in masked
            )
        },
        {
            "id": "MASK-06",
            "category": "Salutation & Contextual Names",
            "description": "Tests Dear <Name>, Advisor: <Name>, Client: <Name>, and Prefixes",
            "payload": (
                "Dear Robert Oppenheimer, please contact Advisor: Alice Cooper regarding Applicant: David Bowie."
            ),
            "evaluate": lambda masked: (
                "Robert Oppenheimer" not in masked and
                "Alice Cooper" not in masked and
                "David Bowie" not in masked and
                "[NAME_" in masked
            )
        },
        {
            "id": "MASK-07",
            "category": "Idempotency & Re-Masking Injection",
            "description": "Pass pre-existing tokens ([NAME_1], [EMAIL_1]) to ensure they are NOT corrupted or double-masked",
            "payload": (
                "Hello [NAME_1], your email [EMAIL_1] has been verified. "
                "Please don't share [SSN_1] with anyone."
            ),
            "evaluate": lambda masked: (
                masked.strip() == "Hello [NAME_1], your email [EMAIL_1] has been verified. Please don't share [SSN_1] with anyone."
            )
        },
        {
            "id": "MASK-08",
            "category": "Deterministic Identity Mapping",
            "description": "Repeated instances of the exact same PII entity must receive identical index tags",
            "payload": (
                "Meeting with Dr. Jane Doe. Later, Dr. Jane Doe called back. "
                "Sent confirmation to jane.doe@example.com, and CC'd jane.doe@example.com."
            ),
            "evaluate": lambda masked: (
                masked.count("[NAME_1]") >= 2 and
                "[NAME_2]" not in masked and
                masked.count("[EMAIL_1]") == 2 and
                "[EMAIL_2]" not in masked
            )
        },
        {
            "id": "MASK-09",
            "category": "Adversarial Noise & Boundary Fragments",
            "description": "Tests malformed brackets, partial digits, fake SSNs, and punctuation boundaries",
            "payload": (
                "Testing [[NAME_1]], [UNKNOWN_TAG_99], SSN: 12-345-678 (invalid 8 digits), "
                "Phone: 123-45 (too short), Card: 1234-5678 (too short)."
            ),
            "evaluate": lambda masked: (
                "[NAME_1]" in masked and
                "12-345-678" in masked  # Invalid length should NOT be falsely masked as SSN
            )
        },
        {
            "id": "MASK-10",
            "category": "ReDoS & High-Density Payload",
            "description": "1,000 repeated tokens with nested spaces to probe regex backtracking and latency",
            "payload": "Dear John Doe, SSN: 123-45-6789. " * 200,
            "evaluate": lambda masked: (
                "123-45-6789" not in masked and
                "John Doe" not in masked
            )
        }
    ]

    for tc in cases:
        resp = http_request(
            f"{MASKER_URL}/mask",
            method="POST",
            body={"document_id": f"test-{tc['id']}", "version": 1, "text": tc["payload"]}
        )
        
        if resp["status"] == 200 and isinstance(resp["body"], dict) and "masked_text" in resp["body"]:
            masked = resp["body"]["masked_text"]
            passed = tc["evaluate"](masked)
            verdict = "DEFENDED (PASS)" if passed else "PARTIAL / OBSERVATION"
        else:
            masked = str(resp["body"])
            passed = False
            verdict = f"FAILED (HTTP {resp['status']})"
        
        result_entry = {
            "id": tc["id"],
            "category": tc["category"],
            "description": tc["description"],
            "input_sample": tc["payload"][:80] + ("..." if len(tc["payload"]) > 80 else ""),
            "output_sample": masked[:100] + ("..." if len(masked) > 100 else ""),
            "latency_ms": resp["elapsed_ms"],
            "passed": passed,
            "verdict": verdict,
            "notes": "Fast deterministic replacement" if passed else "Regex specificity nuance observed"
        }
        results["masker_tests"].append(result_entry)
        print(f"[{tc['id']}] {tc['category']}: {verdict} ({resp['elapsed_ms']}ms)")
        if not passed:
            print(f"   Input:  {tc['payload']}")
            print(f"   Output: {masked}")

def run_auth_and_role_tests():
    print("\n========================================")
    print("RUNNING ROLE BOUNDARY & AUTH PEN-TEST")
    print("========================================")
    
    # 1. Authenticate as Advisor (Marcus Vance)
    adv_login = http_request(
        f"{BACKEND_URL}/auth/login",
        method="POST",
        body={"email": "advisor1@springer.capital", "password": "Password123!"}
    )
    if adv_login["status"] != 200 or not adv_login["body"].get("data", {}).get("token"):
        print(f"[-] Failed to login as Advisor: {adv_login}")
        return
    advisor_token = adv_login["body"]["data"]["token"]
    advisor_user = adv_login["body"]["data"]["user"]
    print(f"[+] Authenticated as Advisor: {advisor_user['email']} (ID: {advisor_user['id']})")

    # 2. Authenticate as Officer (Elena Rostova)
    off_login = http_request(
        f"{BACKEND_URL}/auth/login",
        method="POST",
        body={"email": "officer1@springer.capital", "password": "Password123!"}
    )
    if off_login["status"] != 200 or not off_login["body"].get("data", {}).get("token"):
        print(f"[-] Failed to login as Officer: {off_login}")
        return
    officer_token = off_login["body"]["data"]["token"]
    officer_user = off_login["body"]["data"]["user"]
    print(f"[+] Authenticated as Officer: {officer_user['email']} (ID: {officer_user['id']})")

    # Target Document IDs from postgres:
    # Marcus Vance doc: f02fb93e-4224-45bc-92ae-21128c0f6605 (Pending)
    # Another Advisor's doc: 5d7894e4-88bb-44aa-a814-614c813ab51b (Needs Revision, owned by 6b1cb48d...)
    my_doc_id = "f02fb93e-4224-45bc-92ae-21128c0f6605"
    foreign_doc_id = "5d7894e4-88bb-44aa-a814-614c813ab51b"

    auth_cases = [
        # Test 1: Anonymous Access to Protected Route
        {
            "id": "AUTH-01",
            "category": "Missing Authentication Token",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {},
            "body": None,
            "expected_status": 401,
            "expected_code": "UNAUTHORIZED",
            "desc": "Unauthenticated client requests Officer queue"
        },
        # Test 2: Forged Token with 'alg: none'
        {
            "id": "AUTH-02",
            "category": "JWT Alg: None Signature Bypass",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {
                # Header: {"alg":"none","typ":"JWT"} -> eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
                # Payload: {"id":"e470bd9c-009e-40e9-89da-aea880ebf7a9","email":"officer1@springer.capital","role":"Officer"}
                "Authorization": "Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6ImU0NzBiZDljLTAwOWUtNDBlOS04OWRhLWFlYTg4MGViZjdhOSIsImVtYWlsIjoib2ZmaWNlcjFAc3ByaW5nZXIuY2FwaXRhbCIsInJvbGUiOiJPZmZpY2VyIn0."
            },
            "body": None,
            "expected_status": 401,
            "expected_code": "INVALID_TOKEN",
            "desc": "Unsigned JWT with alg:none claiming Officer role"
        },
        # Test 3: Forged Token with Arbitrary HMAC Secret
        {
            "id": "AUTH-03",
            "category": "JWT False Secret Forgery",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {
                # Signed with fake key 'wrongsecret123'
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU0NzBiZDljLTAwOWUtNDBlOS04OWRhLWFlYTg4MGViZjdhOSIsImVtYWlsIjoib2ZmaWNlcjFAc3ByaW5nZXIuY2FwaXRhbCIsInJvbGUiOiJPZmZpY2VyIiwiaWF0IjoxNzI2Nzg4MDAwfQ.g8aL_w5o26i9Z9FjUvQ3v_49Fw8_8y7T_FAKE_SIG"
            },
            "body": None,
            "expected_status": 401,
            "expected_code": "INVALID_TOKEN",
            "desc": "Officer token forged using illegitimate symmetric secret"
        },
        # Test 4: Vertical Privilege Escalation - Advisor -> Officer Queue
        {
            "id": "AUTH-04",
            "category": "Vertical Privilege Escalation",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 403,
            "expected_code": "FORBIDDEN",
            "desc": "Advisor attempting to access Officer review queue"
        },
        # Test 5: Vertical Privilege Escalation - Advisor -> Approve Document Status
        {
            "id": "AUTH-05",
            "category": "Vertical Privilege Escalation",
            "method": "PATCH",
            "url": f"{BACKEND_URL}/documents/{my_doc_id}/status",
            "headers": {
                "Authorization": f"Bearer {advisor_token}",
                "Content-Type": "application/json"
            },
            "body": {"status": "Approved", "comment": "Self-approved by malicious advisor"},
            "expected_status": 403,
            "expected_code": "FORBIDDEN",
            "desc": "Advisor attempting to self-approve document via PATCH /status"
        },
        # Test 6: Horizontal Privilege Escalation / IDOR - Advisor A accessing Advisor B's document
        {
            "id": "AUTH-06",
            "category": "Horizontal IDOR Traversal",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/{foreign_doc_id}",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 403,
            "expected_code": "FORBIDDEN",
            "desc": "Advisor Marcus Vance accessing Advisor Qwewqe's confidential document"
        },
        # Test 7: Horizontal IDOR - Advisor A accessing Advisor B's version lineage
        {
            "id": "AUTH-07",
            "category": "Horizontal IDOR Traversal",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/{foreign_doc_id}/versions",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 403,
            "expected_code": "FORBIDDEN",
            "desc": "Advisor Marcus Vance attempting to read Advisor Qwewqe's revision thread"
        },
        # Test 8: Horizontal IDOR - Advisor A resubmitting Advisor B's document
        {
            "id": "AUTH-08",
            "category": "Cross-User Resubmission Tampering",
            "method": "POST",
            "url": f"{BACKEND_URL}/documents/{foreign_doc_id}/resubmit",
            "headers": {
                "Authorization": f"Bearer {advisor_token}",
                "Content-Type": "application/json"
            },
            "body": {"notes": "Tampered resubmission"},
            "expected_status": [403, 400], # Multer or ownership validation
            "expected_code": ["FORBIDDEN", "VALIDATION_ERROR"],
            "desc": "Advisor Marcus Vance attempting to hijack another advisor's revision workflow"
        },
        # Test 9: State Machine Violation - Resubmitting a 'Pending' Document
        {
            "id": "AUTH-09",
            "category": "Workflow State Machine Integrity",
            "method": "POST",
            "url": f"{BACKEND_URL}/documents/{my_doc_id}/resubmit",
            "headers": {
                "Authorization": f"Bearer {advisor_token}",
                "Content-Type": "application/json"
            },
            "body": {"notes": "Premature resubmission before review"},
            "expected_status": [400, 403],
            "expected_code": ["CANNOT_RESUBMIT", "VALIDATION_ERROR"],
            "desc": "Advisor resubmitting document when status is Pending (must be 'Needs Revision')"
        },
        # Test 10: Inverse Role Boundary - Officer attempting Advisor Document Submission
        {
            "id": "AUTH-10",
            "category": "Inverse Role Separation",
            "method": "POST",
            "url": f"{BACKEND_URL}/documents",
            "headers": {
                "Authorization": f"Bearer {officer_token}",
                "Content-Type": "application/json"
            },
            "body": {"title": "Officer Unauthorized Submission"},
            "expected_status": 403,
            "expected_code": "FORBIDDEN",
            "desc": "Compliance Officer attempting to submit a new advisory document directly"
        },
        # Test 11: Authorized Baseline - Officer legitimately accessing review queue
        {
            "id": "AUTH-11",
            "category": "Legitimate Officer Action",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/queue",
            "headers": {"Authorization": f"Bearer {officer_token}"},
            "body": None,
            "expected_status": 200,
            "expected_code": None,
            "desc": "Authorized Officer Elena Rostova accessing the compliance queue"
        },
        # Test 12: Authorized Baseline - Advisor viewing own document
        {
            "id": "AUTH-12",
            "category": "Legitimate Advisor Action",
            "method": "GET",
            "url": f"{BACKEND_URL}/documents/{my_doc_id}",
            "headers": {"Authorization": f"Bearer {advisor_token}"},
            "body": None,
            "expected_status": 200,
            "expected_code": None,
            "desc": "Advisor Marcus Vance legitimately accessing his own document"
        }
    ]

    for ac in auth_cases:
        resp = http_request(
            ac["url"],
            method=ac["method"],
            headers=ac["headers"],
            body=ac["body"]
        )
        
        expected_status = ac["expected_status"]
        if isinstance(expected_status, list):
            status_match = resp["status"] in expected_status
        else:
            status_match = resp["status"] == expected_status
            
        passed = status_match
        verdict = "DEFENDED (BLOCKED)" if (resp["status"] in [400, 401, 403] and passed) else ("AUTHORIZED (ALLOWED)" if (resp["status"] == 200 and passed) else f"ANOMALY (HTTP {resp['status']})")
        
        auth_entry = {
            "id": ac["id"],
            "category": ac["category"],
            "description": ac["desc"],
            "method": ac["method"],
            "endpoint": ac["url"].replace(BACKEND_URL, ""),
            "http_status": resp["status"],
            "passed": passed,
            "verdict": verdict,
            "response_snippet": str(resp["body"])[:140]
        }
        results["auth_tests"].append(auth_entry)
        print(f"[{ac['id']}] {ac['category']}: {verdict} (HTTP {resp['status']})")
        if not passed:
            print(f"   Expected: {expected_status}, Got: {resp['status']}")
            print(f"   Body: {resp['body']}")

if __name__ == "__main__":
    run_masker_tests()
    run_auth_and_role_tests()
    
    with open("pen_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\n[+] Pen-test suite completed. Results saved to pen_test_results.json")
