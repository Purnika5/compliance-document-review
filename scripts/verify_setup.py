"""
scripts/verify_setup.py
-----------------------
Springer Capital — Automated Fresh Checkout Verification & Health Suite.

Validates that a fresh clone / checkout of the application has spun up successfully
with all microservices healthy, database seeded, and credentials working.
"""

import json
import sys
import time
import urllib.request
import urllib.error

BACKEND_URL = "http://localhost:5000"
FRONTEND_URL = "http://localhost:3000"
PII_MASKER_URL = "http://localhost:8002"
MOCK_AI_URL = "http://localhost:8001"

passed_checks = 0
failed_checks = 0

def check_step(name, fn):
    global passed_checks, failed_checks
    sys.stdout.write(f"[*] Checking {name}... ")
    sys.stdout.flush()
    start = time.time()
    try:
        ok, msg = fn()
        elapsed = round((time.time() - start) * 1000, 1)
        if ok:
            passed_checks += 1
            print(f"\033[92mPASSED\033[0m ({elapsed}ms) - {msg}")
        else:
            failed_checks += 1
            print(f"\033[91mFAILED\033[0m ({elapsed}ms) - {msg}")
    except Exception as e:
        failed_checks += 1
        elapsed = round((time.time() - start) * 1000, 1)
        print(f"\033[91mERROR\033[0m ({elapsed}ms) - {str(e)}")

def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "VerifySetup/1.0"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return resp.status, resp.read().decode('utf-8')

def http_post(url, data_dict, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    headers["User-Agent"] = "VerifySetup/1.0"
    data = json.dumps(data_dict).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def test_frontend():
    status, body = http_get(FRONTEND_URL)
    if status == 200:
        return True, "Next.js 16 Web App accessible on port 3000"
    return False, f"Unexpected status {status}"

def test_backend_health():
    status, body = http_get(f"{BACKEND_URL}/health")
    parsed = json.loads(body)
    if status == 200 and parsed.get("success") is True:
        db_status = parsed.get("database", "ok")
        return True, f"Express API online on port 5000 (Database: {db_status})"
    return False, f"Backend returned status {status}: {body}"

def test_pii_masker():
    status, body = http_get(f"{PII_MASKER_URL}/health")
    parsed = json.loads(body)
    if status == 200 and parsed.get("status") == "healthy":
        return True, "PII Masking Engine online on port 8002"
    return False, f"PII Masker returned status {status}: {body}"

def test_mock_ai():
    status, body = http_get(f"{MOCK_AI_URL}/health")
    parsed = json.loads(body)
    if status == 200 and parsed.get("status") in ["ok", "healthy"]:
        return True, "Mock AI Engine online on port 8001"
    return False, f"Mock AI returned status {status}: {body}"

def test_advisor_auth():
    status, body = http_post(f"{BACKEND_URL}/auth/login", {
        "email": "advisor1@springer.capital",
        "password": "Password123!"
    })
    if status == 200 and body.get("data", {}).get("token"):
        user = body["data"]["user"]
        return True, f"Seeded Advisor authenticated: {user.get('name')} <{user.get('email')}>"
    return False, f"Failed to login seeded Advisor: {body}"

def test_officer_auth():
    status, body = http_post(f"{BACKEND_URL}/auth/login", {
        "email": "officer1@springer.capital",
        "password": "Password123!"
    })
    if status == 200 and body.get("data", {}).get("token"):
        user = body["data"]["user"]
        return True, f"Seeded Officer authenticated: {user.get('name')} <{user.get('email')}>"
    return False, f"Failed to login seeded Officer: {body}"

def test_officer_queue():
    status, auth_body = http_post(f"{BACKEND_URL}/auth/login", {
        "email": "officer1@springer.capital",
        "password": "Password123!"
    })
    token = auth_body["data"]["token"]
    req = urllib.request.Request(
        f"{BACKEND_URL}/documents/queue",
        headers={"Authorization": f"Bearer {token}", "User-Agent": "VerifySetup/1.0"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        parsed = json.loads(resp.read().decode('utf-8'))
        count = len(parsed.get("data", []))
        return True, f"Compliance triage queue accessible ({count} documents found)"

def test_masking_execution():
    status, body = http_post(f"{PII_MASKER_URL}/mask", {
        "document_id": "test-verify-001",
        "version": 1,
        "text": "Advisor Marcus Vance met with Jane Doe. SSN: 123-45-6789, email: jane@example.com."
    })
    if status == 200 and "masked_text" in body:
        masked = body["masked_text"]
        if "[SSN_1]" in masked and "[EMAIL_1]" in masked:
            return True, "PII Masking round-trip verified (SSN and Email sanitized to deterministic tags)"
    return False, f"Unexpected masking response: {body}"

def test_masking_security_audit():
    import subprocess
    import os
    script_path = os.path.join(os.path.dirname(__file__), "audit_masking_security.py")
    res = subprocess.run([sys.executable, script_path, "--ci"], capture_output=True, text=True)
    if res.returncode == 0:
        return True, "100% Outgoing AI Payload Masking Audit Passed (0 PII Leaks)"
    return False, f"Masking audit failed:\n{res.stdout}"

def test_vector_retrieval():
    import subprocess
    import os
    script_path = os.path.join(os.path.dirname(__file__), "test_vector_retrieval.py")
    res = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
    if res.returncode == 0:
        return True, "PostgreSQL pgvector store returned relevant rules for sample document passage (FINRA-2210 score >= 0.45)"
    return False, f"Vector retrieval check failed:\n{res.stdout}\n{res.stderr}"

def main():
    print("==================================================================")
    print("  SPRINGER CAPITAL -- FRESH CHECKOUT & ENVIRONMENT VERIFICATION    ")
    print("==================================================================")
    print()
    
    check_step("1. Frontend Web App (:3000)", test_frontend)
    check_step("2. Backend REST API & Database (:5000)", test_backend_health)
    check_step("3. PII Masking Engine (:8002)", test_pii_masker)
    check_step("4. Mock AI Compliance Engine (:8001)", test_mock_ai)
    check_step("5. Seeded Advisor Authentication", test_advisor_auth)
    check_step("6. Seeded Officer Authentication", test_officer_auth)
    check_step("7. Compliance Queue Access (RBAC)", test_officer_queue)
    check_step("8. End-to-End PII Sanitization", test_masking_execution)
    check_step("9. Outgoing AI Payload Security Audit", test_masking_security_audit)
    check_step("10. PostgreSQL pgvector & Rule Retrieval", test_vector_retrieval)

    print()
    print("==================================================================")
    print(f"  VERIFICATION RESULTS: {passed_checks}/10 Passed, {failed_checks} Failed")
    print("==================================================================")

    if failed_checks == 0:
        print("\033[92m[SUCCESS] The application is fully operational with zero manual steps required!\033[0m")
        sys.exit(0)
    else:
        print("\033[91m[FAILURE] Some services did not pass health verification. Review output above.\033[0m")
        sys.exit(1)

if __name__ == "__main__":
    main()
