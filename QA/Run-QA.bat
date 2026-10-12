@echo off
setlocal
cd /d "%~dp0"

set AGENT=ALL
if not "%~1"=="" set AGENT=%~1

powershell -NoProfile -ExecutionPolicy Bypass -File "Run-QA.ps1" -Agent "%AGENT%"

endlocal
