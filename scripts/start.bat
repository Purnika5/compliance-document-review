@echo off
setlocal enabledelayedexpansion

echo ==================================================================
echo   SPRINGER CAPITAL -- COMPLIANCE DOCUMENT REVIEW PLATFORM
echo   One-Click Automated Environment Startup
echo ==================================================================
echo.

cd /d "%~dp0\.."

:: 1. Check for .env file; create from .env.example if missing
if not exist ".env" (
    echo [*] Creating .env from .env.example template...
    copy ".env.example" ".env" >nul
    echo [+] Created .env successfully.
) else (
    echo [+] Existing .env found.
)

:: 2. Check Docker availability
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] ERROR: Docker is not installed or not in PATH.
    echo Please install Docker Desktop and start it before running this script.
    exit /b 1
)

:: 3. Spin up containers with Docker Compose
echo [*] Launching all microservices via Docker Compose...
docker compose up -d --build

if %ERRORLEVEL% neq 0 (
    echo [!] ERROR: Docker Compose failed to start services.
    exit /b %ERRORLEVEL%
)

echo.
echo [*] Waiting 5 seconds for services to initialize...
timeout /t 5 /nobreak >nul

:: 4. Run automated verification check
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [*] Running automated environment verification...
    python scripts\verify_setup.py
) else (
    echo [+] Services started! You can access the web app at http://localhost:3000
)

echo.
echo ==================================================================
echo   PLATFORM READY FOR REVIEW & TESTING
echo ==================================================================
echo   Frontend Web App:  http://localhost:3000
echo   Backend REST API:  http://localhost:5000
echo   PII Masker Service: http://localhost:8002
echo   Mock AI API:       http://localhost:8001
echo.
echo   Demo Accounts:
echo     - Advisor: advisor1@springer.capital / Password123!
echo     - Officer: officer1@springer.capital / Password123!
echo ==================================================================
