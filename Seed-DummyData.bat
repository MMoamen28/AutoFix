@echo off
setlocal
echo ============================================================
echo  AutoFix - Seed Dummy Data
echo ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0QA\Seed-DummyData.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Seeding failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
echo [SUCCESS] Dummy data seeded and baseline snapshot created.
endlocal
