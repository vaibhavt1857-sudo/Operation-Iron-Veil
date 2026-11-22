@echo off
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
echo Starting Project IGI Tactical Stealth FPS...
start "" "http://localhost:5173/"
npx vite --host 0.0.0.0 --port 5173
pause
