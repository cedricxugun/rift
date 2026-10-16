@echo off
cd /d "%~dp0"
echo Keep this window open. Open the displayed iPhone URL in Safari on the same Wi-Fi.
bun scripts/serve.mjs --lan
pause
