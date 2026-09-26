@echo off
chcp 65001 >nul
title TIEFER - Kabine 9
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js wurde nicht gefunden.
  echo   Bitte installieren: https://nodejs.org  ^(LTS-Version^)
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\three" (
  echo   Erster Start: Installiere Bestandteile ...
  call npm install --no-fund --no-audit
)

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3033"
node server.js
pause
