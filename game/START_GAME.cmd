@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  pause
  exit /b 1
)
echo Sixth Dawn - Local Game
echo Open http://127.0.0.1:4176 in your browser.
echo Keep this window open while playing. Ctrl+C stops the server.
node server.mjs
pause
