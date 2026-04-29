#!/bin/bash
echo ""
echo "  =========================================="
echo "   EthScope - Ethereum Transaction Analyzer"
echo "  =========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "        Download from: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "[INFO] Node.js $(node --version) found."

# Create .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "[SETUP] Creating .env from template..."
    cp backend/.env.example backend/.env
    echo ""
    echo "  ============================================================"
    echo "   ACTION REQUIRED:"
    echo "   1. Open  backend/.env  in any text editor"
    echo "   2. Replace  YourEtherscanApiKeyHere  with your API key"
    echo "   3. Get a free key at: https://etherscan.io/myapikey"
    echo "   4. Save the file and run this script again"
    echo "  ============================================================"
    echo ""
    # Try to open in default editor
    if command -v nano &> /dev/null; then
        nano backend/.env
    elif command -v vi &> /dev/null; then
        vi backend/.env
    fi
    exit 0
fi

# Install dependencies
echo "[INFO] Installing dependencies..."
cd backend
npm install --silent 2>&1
if [ $? -ne 0 ]; then
    echo "[ERROR] npm install failed. Check your internet connection."
    exit 1
fi

echo ""
echo "[SUCCESS] Starting EthScope server..."
echo "[INFO]    Open your browser at: https://ethscope.onrender.com"
echo ""
echo "  Press Ctrl+C to stop the server."
echo ""

# Try to open browser
sleep 1
if command -v open &> /dev/null; then
    open "https://ethscope.onrender.com"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://ethscope.onrender.com"
fi

npm start
