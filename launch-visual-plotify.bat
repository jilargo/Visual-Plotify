@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
echo Starting Visual Plotify...

if exist "backend\.venv\Scripts\activate" (
    start "Visual Plotify Backend" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate && echo Backend starting... && uvicorn app.main:app --host 127.0.0.1 --port 8000"
) else (
    echo WARNING: Backend virtual environment not found at backend\.venv.
    echo Please create it first by running: python -m venv backend\.venv
    echo Then install dependencies with: backend\.venv\Scripts\pip install -r backend\requirements.txt
    pause
)

timeout /t 2 >nul

if exist "frontend\node_modules" (
    start "Visual Plotify Frontend" cmd /k "cd /d "%~dp0frontend" && echo Frontend starting... && npm run dev -- --host 127.0.0.1 --port 5173"
) else (
    echo WARNING: Frontend dependencies not installed.
    echo Run "cd frontend && npm install" first.
    pause
)

timeout /t 4 >nul

start "" "http://localhost:5173"
echo Visual Plotify should now open in your browser.
endlocal
