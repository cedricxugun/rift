@echo off
cd /d "%~dp0"
where bun >nul 2>nul
if not errorlevel 1 (
  bun scripts\open-preview.mjs
  if errorlevel 1 pause
  exit /b
)
where node >nul 2>nul
if not errorlevel 1 (
  node scripts\open-preview.mjs
  if errorlevel 1 pause
  exit /b
)
start "" "%~dp0iPhone-Demo.html"
