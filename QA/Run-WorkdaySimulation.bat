@echo off
setlocal
echo ============================================================
echo  AutoFix - Run Workday Simulation
echo ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Run-WorkdaySimulation.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Workday simulation exited with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
endlocal
