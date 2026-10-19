@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js 18 or newer from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
start "MASKARIA Demo Server" cmd /k "node serve.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5188/"
