#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "=================================================================="
echo "  SPRINGER CAPITAL -- COMPLIANCE DOCUMENT REVIEW PLATFORM"
echo "  One-Click Automated Environment Startup"
echo "=================================================================="
echo ""

# 1. Ensure .env exists
if [ ! -f ".env" ]; then
    echo "[*] Creating .env from .env.example..."
    cp .env.example .env
    echo "[+] Created .env successfully."
else
    echo "[+] Existing .env found."
fi

# 2. Check Docker
if ! command -v docker &> /dev/null; then
    echo "[!] ERROR: Docker is not installed or not in PATH."
    exit 1
fi

# 3. Spin up services
echo "[*] Launching all microservices via Docker Compose..."
docker compose up -d --build

echo ""
echo "[*] Waiting 5 seconds for services to initialize..."
sleep 5

# 4. Verify setup
if command -v python3 &> /dev/null; then
    echo "[*] Running automated environment verification..."
    python3 scripts/verify_setup.py
elif command -v python &> /dev/null; then
    echo "[*] Running automated environment verification..."
    python scripts/verify_setup.py
fi

echo ""
echo "=================================================================="
echo "  PLATFORM READY FOR REVIEW & TESTING"
echo "=================================================================="
echo "  Frontend Web App:  http://localhost:3000"
echo "  Backend REST API:  http://localhost:5000"
echo "  PII Masker Service: http://localhost:8002"
echo "  Mock AI API:       http://localhost:8001"
echo ""
echo "  Demo Accounts:"
echo "    - Advisor: advisor1@springer.capital / Password123!"
echo "    - Officer: officer1@springer.capital / Password123!"
echo "=================================================================="
