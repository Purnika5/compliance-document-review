"""
scripts/scan_secrets.py
-----------------------
Springer Capital — Secret Detection and Pre-Commit Audit Tool.

Scans git commit history and current working directory for:
- Google Gemini / Cloud API keys (AIzaSy...)
- GitHub tokens (ghp_, gho_, github_pat_...)
- OpenAI keys (sk-...)
- Anthropic keys (sk-ant-...)
- AWS Access Keys (AKIA...)
- Private cryptographic keys (BEGIN PRIVATE KEY...)
- Slack & Stripe production secrets
- Unmasked credentials in configuration files
"""

import os
import re
import subprocess
import sys

PATTERNS = [
    (r'AIzaSy[A-Za-z0-9_-]{33}', 'Google / Gemini API Key'),
    (r'(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}', 'GitHub Personal Access Token'),
    (r'github_pat_[A-Za-z0-9_]{82}', 'GitHub Fine-Grained Token'),
    (r'sk-[A-Za-z0-9]{48}', 'OpenAI API Key'),
    (r'sk-ant-[A-Za-z0-9_-]{80,}', 'Anthropic API Key'),
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID'),
    (r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----', 'Private Cryptographic Key'),
    (r'xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*', 'Slack Token'),
    (r'(?:sk|rk)_live_[0-9a-zA-Z]{24}', 'Stripe Secret Key'),
]

IGNORE_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.docx', '.xlsx',
    '.woff', '.woff2', '.ttf', '.eot', '.lock'
}

IGNORE_DIRS = {
    '.git', 'node_modules', '.next', 'dist', 'build', '__pycache__', '.venv', 'env'
}

def scan_string(content, filename="<unknown>"):
    findings = []
    lines = content.split('\n')
    for line_idx, line in enumerate(lines, 1):
        # Skip comment headers or placeholders
        if 'your_gemini_free_tier_api_key_here' in line or 'test-ci-secret-key' in line:
            continue
        for regex, desc in PATTERNS:
            matches = re.finditer(regex, line)
            for m in matches:
                secret_snippet = m.group(0)
                masked_secret = secret_snippet[:4] + '...' + secret_snippet[-4:]
                findings.append({
                    "file": filename,
                    "line": line_idx,
                    "description": desc,
                    "snippet": masked_secret
                })
    return findings

def scan_working_tree():
    print("[*] Scanning current working directory...")
    findings = []
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in IGNORE_EXTENSIONS:
                continue
            filepath = os.path.join(root, f)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as handle:
                    content = handle.read()
                    f_res = scan_string(content, filepath)
                    findings.extend(f_res)
            except Exception:
                pass
    return findings

def scan_git_history(commits_to_check=200):
    print(f"[*] Scanning recent {commits_to_check} git commits for historical secrets...")
    findings = []
    try:
        log_proc = subprocess.run(
            ['git', 'log', f'-n', str(commits_to_check), '--pretty=format:%H'],
            capture_output=True,
            text=True,
            check=True
        )
        commit_hashes = [h.strip() for h in log_proc.stdout.split('\n') if h.strip()]
        
        for chash in commit_hashes:
            diff_proc = subprocess.run(
                ['git', 'show', chash],
                capture_output=True,
                text=True,
                errors='ignore'
            )
            # Scan added lines in diff (+...)
            added_lines = [
                line[1:] for line in diff_proc.stdout.split('\n')
                if line.startswith('+') and not line.startswith('+++')
            ]
            commit_content = '\n'.join(added_lines)
            f_res = scan_string(commit_content, f"commit {chash[:8]}")
            findings.extend(f_res)
    except Exception as e:
        print(f"[!] Warning: Git history scan encountered an error: {e}")
    return findings

def scan_staged_changes():
    print("[*] Scanning staged git changes (Pre-Commit Mode)...")
    findings = []
    try:
        proc = subprocess.run(
            ['git', 'diff', '--cached'],
            capture_output=True,
            text=True,
            errors='ignore'
        )
        added_lines = [
            line[1:] for line in proc.stdout.split('\n')
            if line.startswith('+') and not line.startswith('+++')
        ]
        content = '\n'.join(added_lines)
        findings = scan_string(content, "staged diff")
    except Exception as e:
        print(f"[!] Warning: Git diff scan error: {e}")
    return findings

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
    findings = []

    if mode == 'staged':
        findings = scan_staged_changes()
    elif mode == 'history':
        findings = scan_git_history()
    elif mode == 'working-tree':
        findings = scan_working_tree()
    else: # 'all'
        findings.extend(scan_working_tree())
        findings.extend(scan_git_history())

    print()
    print("==================================================================")
    print(f"  SECRETS SWEEP RESULTS: {len(findings)} Potential Secrets Detected")
    print("==================================================================")

    if findings:
        print("\033[91m[FAILURE] Secrets detected:\033[0m")
        for item in findings:
            print(f"  - [{item['description']}] in {item['file']}: {item['snippet']}")
        sys.exit(1)
    else:
        print("\033[92m[SUCCESS] Zero API keys, private keys, or credentials found.\033[0m")
        sys.exit(0)

if __name__ == '__main__':
    main()
