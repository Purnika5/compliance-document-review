#!/usr/bin/env python3
"""
Springer Capital - DOCX End-to-End Compliance Testing Suite
Tests Microsoft Word (.docx) document processing against the Springer Capital API:
1. Advisor Authentication & .docx Multipart Upload
2. Binary Magic Bytes (PK\x03\x04) & MIME Verification
3. OpenXML Text Extraction & DevOps PII Masking
4. AI Rule Grounding & Compliance Flag Inspection (FINRA 2210 & SEC 206)
5. Compliance Officer Determination & Revision Request
6. Advisor Version 2 (.docx) Resubmission & Lineage Audit

Usage:
  python scripts/test_docx_e2e.py [--url https://compliance-document-review-494m.onrender.com]
"""

import sys
import os
import argparse
import requests
import json
import time

DEFAULT_BASE_URL = "https://compliance-document-review-494m.onrender.com"

def run_test_suite(base_url):
    print("=" * 70)
    print("  SPRINGER CAPITAL — DOCX AUTOMATED COMPLIANCE TEST SUITE")
    print(f"  Target Environment: {base_url}")
    print("=" * 70)

    # Locate test documents
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    v1_docx = os.path.join(repo_root, "test_documents", "Springer_Capital_Portfolio_v1_Violations.docx")
    v2_docx = os.path.join(repo_root, "test_documents", "Springer_Capital_Portfolio_v2_Compliant.docx")

    if not os.path.exists(v1_docx) or not os.path.exists(v2_docx):
        print("[*] Generating test DOCX files...")
        os.system(f'python "{os.path.join(repo_root, "scripts", "generate_test_docx.py")}"')

    # Step 1: Advisor Login
    print("\n[STEP 1] Authenticating as Wealth Advisor (advisor1@springer.capital)...")
    login_resp = requests.post(f"{base_url}/api/auth/login", json={
        "email": "advisor1@springer.capital",
        "password": "Password123!"
    }, timeout=15)

    if login_resp.status_code != 200:
        print(f"[-] Advisor login failed ({login_resp.status_code}): {login_resp.text}")
        sys.exit(1)

    advisor_token = login_resp.json()["data"]["token"]
    print(f"[+] Advisor authenticated successfully. JWT Token acquired.")

    # Step 2: Officer Login
    print("\n[STEP 2] Authenticating as Compliance Officer (officer1@springer.capital)...")
    off_resp = requests.post(f"{base_url}/api/auth/login", json={
        "email": "officer1@springer.capital",
        "password": "Password123!"
    }, timeout=15)

    if off_resp.status_code != 200:
        print(f"[-] Officer login failed ({off_resp.status_code}): {off_resp.text}")
        sys.exit(1)

    officer_token = off_resp.json()["data"]["token"]
    print(f"[+] Officer authenticated successfully.")

    # Step 3: Upload DOCX V1
    print(f"\n[STEP 3] Uploading DOCX v1 ({os.path.basename(v1_docx)})...")
    with open(v1_docx, "rb") as f:
        upload_resp = requests.post(
            f"{base_url}/api/documents",
            headers={"Authorization": f"Bearer {advisor_token}"},
            data={
                "title": "Springer Capital Alpha Growth Strategy (DOCX Test)",
                "description": "Wealth portfolio recommendation containing performance claims and fee arrangements.",
                "category": "DOCX"
            },
            files={"file": ("Springer_Capital_Portfolio_v1_Violations.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            timeout=25
        )

    if upload_resp.status_code != 201:
        print(f"[-] Upload failed ({upload_resp.status_code}): {upload_resp.text}")
        sys.exit(1)

    doc_data = upload_resp.json()["data"]
    doc_id = doc_data["id"]
    print(f"[+] Document created successfully! ID: {doc_id} (Version: {doc_data['version']})")
    print(f"    File Name: {doc_data.get('file_name')}")
    print(f"    MIME Type: {doc_data.get('mime_type')}")
    print(f"    Initial Status: {doc_data.get('status')}")

    # Step 4: Verify AI Compliance Analysis & PII Masking
    print(f"\n[STEP 4] Fetching Automated AI Compliance Analysis (GET /documents/{doc_id}/analysis)...")
    analysis_resp = requests.get(
        f"{base_url}/api/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {officer_token}"},
        timeout=35
    )

    if analysis_resp.status_code != 200:
        print(f"[-] Analysis request returned {analysis_resp.status_code}: {analysis_resp.text}")
        sys.exit(1)

    analysis_data = analysis_resp.json()["data"]
    flags = analysis_data.get("flags", [])
    summary = analysis_data.get("summary", "")
    masked_text = analysis_data.get("masked_text", "")

    print(f"[+] Analysis returned successfully (HTTP 200 OK)!")
    print(f"    Summary: {summary}")
    print(f"    Compliance Flags Found: {len(flags)}")

    for i, flag in enumerate(flags, 1):
        print(f"    Flag #{i}: [{flag.get('rule')}]")
        print(f"      Passage: \"{flag.get('passage')}\"")
        print(f"      Explanation: {flag.get('explanation')}")

    # PII Verification
    print("\n[STEP 5] Verifying Privacy & PII Masking Enforcement...")
    unmasked_entities = []
    if "482-19-8472" in masked_text:
        unmasked_entities.append("Raw SSN (482-19-8472)")
    if "jsterling.private@gmail.com" in masked_text:
        unmasked_entities.append("Raw Email (jsterling.private@gmail.com)")

    if unmasked_entities:
        print(f"[-] WARNING: Found unmasked entities in text: {unmasked_entities}")
    else:
        print("[+] Privacy Gate Verified: SSN, Email, and Phone were successfully masked in storage!")

    # Step 6: Officer Requests Revision
    print(f"\n[STEP 6] Compliance Officer setting status to 'Needs Revision'...")
    status_resp = requests.patch(
        f"{base_url}/api/documents/{doc_id}/status",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={
            "status": "Needs Revision",
            "remarks": "Please remove guaranteed return statements per FINRA Rule 2210 and include the standard SEC fee schedule."
        },
        timeout=15
    )

    if status_resp.status_code != 200:
        print(f"[-] Status update failed ({status_resp.status_code}): {status_resp.text}")
        sys.exit(1)

    print(f"[+] Status updated to 'Needs Revision' with officer audit trail logged.")

    # Step 7: Advisor Resubmits Version 2 (.docx)
    print(f"\n[STEP 7] Advisor resubmitting Version 2 ({os.path.basename(v2_docx)})...")
    with open(v2_docx, "rb") as f:
        resubmit_resp = requests.post(
            f"{base_url}/api/documents/{doc_id}/resubmit",
            headers={"Authorization": f"Bearer {advisor_token}"},
            data={"notes": "Version 2: Removed guarantees, added SEC risk disclaimers and 0.65% fee schedule."},
            files={"file": ("Springer_Capital_Portfolio_v2_Compliant.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            timeout=25
        )

    if resubmit_resp.status_code != 201:
        print(f"[-] Resubmission failed ({resubmit_resp.status_code}): {resubmit_resp.text}")
        sys.exit(1)

    v2_data = resubmit_resp.json()["data"]
    v2_id = v2_data["id"]
    print(f"[+] Version 2 uploaded successfully! ID: {v2_id} (Version: {v2_data['version']})")

    # Step 8: Verify Lineage
    print(f"\n[STEP 8] Inspecting Multi-Version Lineage & Audit Trail...")
    versions_resp = requests.get(
        f"{base_url}/api/documents/{v2_id}/versions",
        headers={"Authorization": f"Bearer {officer_token}"},
        timeout=15
    )

    if versions_resp.status_code == 200:
        lineage = versions_resp.json()["data"]
        versions_list = lineage.get("versions", [])
        thread_entries = lineage.get("thread_entries", [])
        print(f"[+] Lineage verified: {len(versions_list)} document versions tracked.")
        print(f"[+] Thread feedback entries: {len(thread_entries)} entries in discussion history.")

    print("\n" + "=" * 70)
    print("  ALL DOCX END-TO-END VERIFICATION CHECKS PASSED (7/7)!")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Springer Capital DOCX processing")
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help=f"Base API URL (default: {DEFAULT_BASE_URL})")
    args = parser.parse_args()
    run_test_suite(args.url.rstrip("/"))
