@echo off
title EthScope - Ethereum Transaction Analyzer
color 0A

echo.
echo  ==========================================
echo   ETHSCOPE - Ethereum Transaction Analyzer
echo  ==========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo         Download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Create .env if it doesn't exist
if not exist "backend\.env" (
    echo [SETUP] Creating .env from template...
    copy "backend\.env.example" "backend\.env" >nul
    echo.
    echo  ============================================================
    echo   ACTION REQUIRED:
    echo   1. Open  backend\.env  in Notepad
    echo   2. Replace  YourEtherscanApiKeyHere  with your API key
    echo   3. Get a free key at: https://etherscan.io/myapikey
    echo   4. Save the file and run this script again
    echo  ============================================================
    echo.
    notepad "backend\.env"
    pause
    exit /b 0
)

REM Install dependencies
echo [INFO] Installing dependencies...
cd backend
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo  [SUCCESS] Starting EthScope server...
echo  [INFO]    Open your browser at: http://localhost:3001
echo.
echo  Press Ctrl+C to stop the server.
echo.

REM Start and open browser
start "" "http://localhost:3001"
npm start
