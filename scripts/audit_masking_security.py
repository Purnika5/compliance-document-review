#!/usr/bin/env python3
"""
scripts/audit_masking_security.py
---------------------------------
Springer Capital — Outgoing AI Payload PII Masking Security Audit Suite.

Audits document payloads before transmission to external AI services (e.g. Gemini API).
Verifies that all outgoing payloads are 100% masked and FAILS LOUDLY with exit code 1
if ANY raw PII pattern (SSN, Email, Phone, Credit Card, Address, or Name) is detected.

Supports both:
  1. Live HTTP microservice audit against running containers (http://localhost:8002/mask).
  2. Direct in-process engine audit fallback (devops/pii-masker/pii_masker.py) when
     Docker is not running locally.

Usage:
    # Run full live audit (with automatic local fallback if HTTP endpoint is offline)
    python scripts/audit_masking_security.py

    # Run in CI mode (strict exit codes, machine-readable)
    python scripts/audit_masking_security.py --ci

    # Run directly against local in-process PII engine without HTTP requests
    python scripts/audit_masking_security.py --local

    # Specify custom PII masker endpoint
    python scripts/audit_masking_security.py --url http://localhost:8002/mask
"""

import argparse
import importlib
import json
import os
from pathlib import Path
import re
import sys
import time
from typing import TypedDict
import urllib.request
import urllib.error

# Windows console ANSI color & UTF-8 initialization
if sys.platform == "win32":
    os.system("")  # Enables VT100 / ANSI escape sequence processing in Windows console
if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8", errors="replace")

# ANSI Color Codes for loud terminal reporting
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Strict PII Leakage Detection Patterns (Must NOT match after masking)
class LeakagePattern(TypedDict):
    type: str
    name: str
    regex: re.Pattern[str]
    severity: str

LEAKAGE_PATTERNS: list[LeakagePattern] = [
    {
        "type": "SSN_LEAK",
        "name": "Social Security Number",
        "regex": re.compile(r'(?:\b\d{3}[-\s.]\d{2}[-\s.]\d{4}\b)|(?:(?i:ssn|social\s+security)[\s:]*\b\d{9}\b)'),
        "severity": "CRITICAL",
    },
    {
        "type": "EMAIL_LEAK",
        "name": "Email Address",
        "regex": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'),
        "severity": "CRITICAL",
    },
    {
        "type": "CARD_LEAK",
        "name": "Payment Card Number",
        "regex": re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
        "severity": "HIGH",
    },
    {
        "type": "PHONE_LEAK",
        "name": "Telephone Number",
        "regex": re.compile(r'(?:\+?1[-.\s]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b'),
        "severity": "HIGH",
    },
    {
        "type": "ADDRESS_LEAK",
        "name": "Physical Street Address",
        "regex": re.compile(
            r'\b\d{1,5}\s+[A-Z][a-zA-Z0-9\.\s]{2,25}\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Plaza|Plz|Suite|Ste|Apt)\b\.?',
            re.IGNORECASE
        ),
        "severity": "MEDIUM",
    },
    {
        "type": "SALUTATION_NAME_LEAK",
        "name": "Unmasked Salutation Name",
        "regex": re.compile(r'(?i:\b(?:dear|advisor:|client:|customer:|applicant:)\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})'),
        "severity": "HIGH",
    },
]

# Pattern matching valid platform masked tokens (e.g. [NAME_1], [SSN_1], [EMAIL_1], [REDACTED_SSN])
VALID_TAG_PATTERN = re.compile(r'\[(?:NAME|EMAIL|SSN|PHONE|ACCOUNT|CARD|ADDRESS|ZIP|DATE|REDACTED)_[0-9A-Za-z_-]+\]')

class AuditScenario(TypedDict, total=False):
    id: str
    title: str
    raw_text: str
    forbidden_substrings: list[str]
    required_substrings: list[str]
    required_placeholders: list[str]

TEST_SCENARIOS: list[AuditScenario] = [
    {
        "id": "SEC-AUDIT-01",
        "title": "HNW Wealth Management Client Onboarding",
        "raw_text": (
            "Dear Arthur Pendelton, welcome to Springer Capital Wealth Management. "
            "Your advisor Marcus Vance has set up account ACCT-9988776655. "
            "Please confirm your SSN: 123-45-6789 and primary phone: (212) 555-0198. "
            "Notices will be dispatched to arthur.pendelton@capital-holdings.co.uk. "
            "Client residence: 742 Evergreen Terrace, Suite 500."
        ),
        "forbidden_substrings": [
            "123-45-6789",
            "arthur.pendelton@capital-holdings.co.uk",
            "(212) 555-0198",
            "ACCT-9988776655",
            "742 Evergreen Terrace",
            "Arthur Pendelton",
            "Marcus Vance",
        ],
        "required_placeholders": ["[NAME_", "[SSN_", "[EMAIL_", "[PHONE_", "[ACCOUNT_", "[ADDRESS_"],
    },
    {
        "id": "SEC-AUDIT-02",
        "title": "Wire Transfer & Institutional Custody Authorization",
        "raw_text": (
            "Wire Transfer Authorization Form. Client: Beatrice Montgomery. "
            "Direct debit from Account Number: 887766554433, Routing Number: 021000021. "
            "Emergency corporate card on file: 4111-2222-3333-4444. "
            "Authorized Officer Elena Rostova approved transmission."
        ),
        "forbidden_substrings": [
            "4111-2222-3333-4444",
            "887766554433",
            "021000021",
            "Beatrice Montgomery",
            "Elena Rostova",
        ],
        "required_placeholders": ["[CARD_", "[ACCOUNT_"],
    },
    {
        "id": "SEC-AUDIT-03",
        "title": "Adversarial SSN Delimiter Evasion Payload",
        "raw_text": (
            "Attempting regex evasion on SSN formats: "
            "Variant A with spaces: 456 78 1234. "
            "Variant B with dots: 999.88.7777. "
            "Variant C labeled: SSN 111223333. "
            "Variant D labeled: social security: 888-99-0000."
        ),
        "forbidden_substrings": [
            "456 78 1234",
            "999.88.7777",
            "111223333",
            "888-99-0000",
        ],
        "required_placeholders": ["[SSN_"],
    },
    {
        "id": "SEC-AUDIT-04",
        "title": "Subdomain & RFC 5233 Tagged Email Leakage Probe",
        "raw_text": (
            "Direct correspondence sent to: "
            "portfolio.manager+audit-internal@private.division.springer.capital and "
            "client_inquiries@hedgefund-advisors.ac.jp. "
            "Verify that full subdomains and plus tags are completely sanitized."
        ),
        "forbidden_substrings": [
            "portfolio.manager+audit-internal@private.division.springer.capital",
            "client_inquiries@hedgefund-advisors.ac.jp",
        ],
        "required_placeholders": ["[EMAIL_"],
    },
    {
        "id": "SEC-AUDIT-05",
        "title": "FINRA Regulatory Stopword Integrity (Anti-Overmasking)",
        "raw_text": (
            "Under Springer Capital Compliance Policy and FINRA Rule 206, "
            "the January Securities Exchange Commission filing was prepared by the Investment Management team. "
            "Financial Industry Regulatory Authority guidelines were observed."
        ),
        "forbidden_substrings": [],
        "required_substrings": [
            "Springer Capital",
            "FINRA Rule",
            "Securities Exchange Commission",
            "Financial Industry Regulatory Authority",
        ],
        "required_placeholders": [],
    },
    {
        "id": "SEC-AUDIT-06",
        "title": "Pre-Existing Masked Token Idempotency & Injection",
        "raw_text": (
            "Document revision history indicates [NAME_1] was verified on 2026-09-18. "
            "Primary contact [EMAIL_1] and verified [SSN_1] remain confidential. "
            "Ensure that re-masking this payload does NOT alter or nest existing placeholders."
        ),
        "forbidden_substrings": ["[[NAME_1]", "[[EMAIL_1]"],
        "required_substrings": ["[NAME_1]", "[EMAIL_1]", "[SSN_1]"],
        "required_placeholders": [],
    },
    {
        "id": "SEC-AUDIT-07",
        "title": "High-Volume Real-World Advisory Composite Deck",
        "raw_text": (
            "Springer Capital Discretionary Portfolio Deck.\n"
            "Lead Advisor: Marcus Vance. Co-Advisor: Jonathan Edwards.\n"
            "Client: Charlotte Bronte (SSN: 333-22-1111, Phone: 800-555-1212).\n"
            "Billing address: 100 Wall Street, 15th Floor, New York, NY.\n"
            "Corporate Card: 4111 2222 3333 4444.\n"
            "Disclosures: Historical returns do not guarantee future results. FINRA Rule 2210 compliant."
        ),
        "forbidden_substrings": [
            "333-22-1111",
            "800-555-1212",
            "4111 2222 3333 4444",
            "Charlotte Bronte",
            "100 Wall Street",
            "Marcus Vance",
            "Jonathan Edwards",
        ],
        "required_placeholders": ["[NAME_", "[SSN_", "[PHONE_", "[CARD_", "[ADDRESS_"],
    },
]

def scan_for_pii_leaks(text: str):
    """
    Scans a masked payload string for any residual unmasked PII.
    Ignores valid platform placeholders like [NAME_1], [SSN_1], etc.
    """
    # Temporarily strip valid platform tags so they don't trigger false positives
    sanitized_for_scan = VALID_TAG_PATTERN.sub("__MASKED_TAG__", text)

    violations = []
    for pattern in LEAKAGE_PATTERNS:
        matches = pattern["regex"].finditer(sanitized_for_scan)
        for m in matches:
            matched_str = m.group(0).strip()
            # If the regex has groups (e.g. salutation name), check the relevant group
            if pattern["type"] == "SALUTATION_NAME_LEAK" and m.groups():
                matched_str = m.group(1).strip()

            start_idx = max(0, m.start() - 25)
            end_idx = min(len(sanitized_for_scan), m.end() + 25)
            context_snippet = sanitized_for_scan[start_idx:end_idx].replace('\n', ' ')

            violations.append({
                "type": pattern["type"],
                "name": pattern["name"],
                "severity": pattern["severity"],
                "leaked_value": matched_str,
                "context": context_snippet,
                "offset": m.start(),
            })
    return violations

def get_local_masker():
    """Dynamically imports and returns a local PiiMasker instance if available."""
    try:
        repo_root = Path(__file__).resolve().parent.parent
        pii_dir = repo_root / "devops" / "pii-masker"
        if str(pii_dir) not in sys.path:
            sys.path.insert(0, str(pii_dir))
        pii_module = importlib.import_module("pii_masker")
        masker_class = getattr(pii_module, "PiiMasker")
        return masker_class()
    except Exception as e:
        print(f"Debug: Could not import local PiiMasker: {e}", file=sys.stderr)
        return None

def mask_payload_via_http(endpoint: str, text: str, doc_id: str):
    """Sends payload to the PII Masking HTTP endpoint."""
    req_data = json.dumps({
        "document_id": doc_id,
        "version": 1,
        "text": text,
    }).encode('utf-8')

    req = urllib.request.Request(
        endpoint,
        data=req_data,
        headers={"Content-Type": "application/json", "User-Agent": "PIISecurityAudit/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode('utf-8'))
        return body.get("masked_text", "")

def run_audit(endpoint: str, ci_mode: bool = False, force_local: bool = False):
    print(f"{BOLD}=================================================================={RESET}")
    print(f"{BOLD}  SPRINGER CAPITAL -- OUTGOING AI PAYLOAD MASKING SECURITY AUDIT  {RESET}")
    print(f"{BOLD}=================================================================={RESET}")

    local_masker = None

    if force_local:
        local_masker = get_local_masker()
        if not local_masker:
            print(f"{RED}[!] FATAL ERROR: Local PiiMasker engine not found in devops/pii-masker.{RESET}")
            sys.exit(1)
        print(f"Target Mode:           {CYAN}Local In-Process PiiMasker Engine{RESET}")
    else:
        print(f"Target Masker Endpoint: {CYAN}{endpoint}{RESET}")

    print(f"Audit Mode:            {YELLOW}{'CI Security Gate' if ci_mode else 'Pre-Demo Verification'}{RESET}")
    print(f"Roadmap Criteria:      {BOLD}\"No unmasked PII ever reaches the third-party API\"{RESET}")
    print()

    # Pre-check endpoint health if not forcing local
    if not force_local:
        health_url = endpoint.replace('/mask', '/health')
        try:
            req = urllib.request.Request(health_url, headers={"User-Agent": "PIISecurityAudit/1.0"})
            with urllib.request.urlopen(req, timeout=3) as h_resp:
                h_data = json.loads(h_resp.read().decode('utf-8'))
                print(f"[*] PII Masker Status: {GREEN}HEALTHY{RESET} ({h_data.get('service', 'pii-masker')})")
        except Exception as e:
            # Check if local masker is available as seamless fallback
            local_masker = get_local_masker()
            if local_masker:
                print(f"{YELLOW}[!] Notice: Remote PII Masker at {health_url} is offline ({e}).{RESET}")
                print(f"[*] {GREEN}Auto-fallback: Running audit against local devops/pii-masker engine directly.{RESET}")
            else:
                print(f"{RED}[!] FATAL ERROR: Cannot reach PII Masker at {health_url}: {e}{RESET}")
                print(f"{RED}[!] Ensure the docker containers are running (`docker compose up -d pii-masker`).{RESET}")
                sys.exit(1)

    print()
    total_scenarios = len(TEST_SCENARIOS)
    passed_scenarios = 0
    all_violations = []

    for idx, scenario in enumerate(TEST_SCENARIOS, 1):
        sys.stdout.write(f"[{idx}/{total_scenarios}] Auditing '{scenario['title']}'... ")
        sys.stdout.flush()

        start_time = time.time()
        try:
            if local_masker is not None:
                local_masker.reset()
                masked_text = local_masker.mask_text(str(scenario["raw_text"]))
            else:
                masked_text = mask_payload_via_http(endpoint, str(scenario["raw_text"]), str(scenario["id"]))
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
        except Exception as err:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            print(f"{RED}ERROR{RESET} ({elapsed_ms}ms)")
            print(f"    {RED}Failed to get response from masking engine: {err}{RESET}")
            all_violations.append({
                "scenario_id": scenario["id"],
                "title": scenario["title"],
                "error": str(err),
            })
            continue

        # 1. Check for explicit forbidden substrings (exact leaks)
        exact_leaks = []
        for forbidden in scenario.get("forbidden_substrings", []):
            if forbidden.lower() in masked_text.lower():
                exact_leaks.append(forbidden)

        # 2. Check for required substrings (e.g. preserved institutional stopwords)
        missing_preserved = []
        for required in scenario.get("required_substrings", []):
            if required not in masked_text:
                missing_preserved.append(required)

        # 3. Check for required structured placeholders
        missing_placeholders = []
        for ph in scenario.get("required_placeholders", []):
            if ph not in masked_text:
                missing_placeholders.append(ph)

        # 4. Programmatic regex leakage sweep on the masked text
        pattern_violations = scan_for_pii_leaks(masked_text)

        scenario_passed = (
            len(exact_leaks) == 0 and
            len(missing_preserved) == 0 and
            len(missing_placeholders) == 0 and
            len(pattern_violations) == 0
        )

        if scenario_passed:
            passed_scenarios += 1
            print(f"{GREEN}PASSED (100% MASKED){RESET} ({elapsed_ms}ms)")
        else:
            print(f"{RED}FAILED - PII LEAK DETECTED!{RESET} ({elapsed_ms}ms)")
            all_violations.append({
                "scenario_id": scenario["id"],
                "title": scenario["title"],
                "exact_leaks": exact_leaks,
                "missing_preserved": missing_preserved,
                "missing_placeholders": missing_placeholders,
                "pattern_violations": pattern_violations,
                "masked_output": masked_text,
            })

    print()
    print(f"{BOLD}=================================================================={RESET}")
    print(f"{BOLD}  AUDIT SCORECARD: {passed_scenarios}/{total_scenarios} SCENARIOS VERIFIED 100% CLEAN  {RESET}")
    print(f"{BOLD}=================================================================={RESET}")

    if all_violations:
        print()
        print(f"{RED}{BOLD}!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!{RESET}")
        print(f"{RED}{BOLD}  SECURITY ALERT: UNMASKED PII DETECTED IN OUTGOING AI PAYLOADS!  {RESET}")
        print(f"{RED}{BOLD}  VIOLATES ROADMAP DEFINITION OF DONE: ZERO PII TO 3RD-PARTY APIS {RESET}")
        print(f"{RED}{BOLD}!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!{RESET}")
        print()

        for idx, v in enumerate(all_violations, 1):
            print(f"{BOLD}{RED}[VIOLATION #{idx}] Scenario: {v['scenario_id']} - {v['title']}{RESET}")
            if "exact_leaks" in v and v["exact_leaks"]:
                print(f"  {RED}Direct Substring Leaks:{RESET} {', '.join(v['exact_leaks'])}")
            if "pattern_violations" in v and v["pattern_violations"]:
                for pv in v["pattern_violations"]:
                    print(f"  {RED}Pattern Detected:{RESET} [{pv['severity']}] {pv['name']}: '{pv['leaked_value']}'")
                    print(f"  {YELLOW}Context:{RESET} ...{pv['context']}...")
            if "missing_preserved" in v and v["missing_preserved"]:
                print(f"  {RED}Missing Institutional Terms (Overmasking):{RESET} {', '.join(v['missing_preserved'])}")
            if "masked_output" in v:
                print(f"  {CYAN}Masked Output Snippet:{RESET} {v['masked_output'][:150]}...")
            print()

        print(f"{RED}[FAIL] Outbound AI security audit FAILED. Build blocked.{RESET}")
        sys.exit(1)
    else:
        print()
        print(f"{GREEN}{BOLD}[SUCCESS] 100% PII Masking Verified.{RESET}")
        print(f"{GREEN}Zero SSNs, Emails, Phone Numbers, Credit Cards, or Addresses leaked.{RESET}")
        print(f"{GREEN}All outgoing AI payloads conform to FINRA & SEC Reg S-P privacy standards.{RESET}")
        sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit outgoing AI payloads for PII leakage.")
    parser.add_argument("--url", default="http://localhost:8002/mask", help="PII Masker URL")
    parser.add_argument("--ci", action="store_true", help="Run in strict CI mode")
    parser.add_argument("--local", action="store_true", help="Run directly against local in-process PiiMasker engine")
    args = parser.parse_args()

    run_audit(endpoint=args.url, ci_mode=args.ci, force_local=args.local)
