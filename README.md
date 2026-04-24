# 🔷 EthScope — Ethereum Transaction Analyzer

> A full-stack blockchain forensics web application built with Node.js, Express, and Vanilla JS.  
> CGC Jhanjheri · CSE Project 2025–26 · Priyanshi · Rakhi Chauhan · Taniya

---

## 🚀 Quick Start (3 Steps)

### Step 1 — Install Node.js
Download and install Node.js (v16+) from: https://nodejs.org/

### Step 2 — Get a FREE Etherscan API Key
1. Go to https://etherscan.io/register and create a free account
2. Go to https://etherscan.io/myapikey
3. Click "Add" → name it anything → copy the key

### Step 3 — Run the Project

**On Windows:**
```
Double-click  start.bat
```

**On Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Manual (any OS):**
```bash
cd backend
copy .env.example .env       # Windows
# OR: cp .env.example .env   # Mac/Linux

# Open .env in any text editor and replace:
#   YourEtherscanApiKeyHere
# with your actual API key from Step 2

npm install
npm start
```

Then open your browser at: **http://localhost:3001**

---

## 📁 Project Structure

```
eth-analyzer/
├── backend/
│   ├── server.js          ← Node.js + Express REST API
│   ├── package.json       ← Dependencies
│   ├── .env.example       ← Environment template
│   └── .env               ← Your config (create from .env.example)
├── frontend/
│   └── public/
│       ├── index.html     ← Main HTML page
│       ├── style.css      ← Styling (dark cyberpunk theme)
│       └── app.js         ← Frontend logic
├── start.bat              ← Windows one-click launcher
├── start.sh               ← Mac/Linux one-click launcher
└── README.md              ← This file
```

---

## 🔌 API Endpoints

| Method | Endpoint                     | Description                          |
|--------|------------------------------|--------------------------------------|
| GET    | `/api/health`                | Server health check                  |
| GET    | `/api/eth-price`             | Live ETH/USD price (CoinGecko)       |
| GET    | `/api/validate/:address`     | Validate an Ethereum address         |
| GET    | `/api/balance/:address`      | Get wallet ETH balance               |
| GET    | `/api/analyze/:address`      | Full analysis (transactions + stats) |

**Query params for `/api/analyze/:address`:**
- `limit` — number of transactions (25, 50, 100). Default: 50

**Example:**
```
http://localhost:3001/api/analyze/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?limit=50
```

---

## 🧰 Tech Stack

| Layer     | Technology        | Purpose                            |
|-----------|-------------------|------------------------------------|
| Frontend  | HTML5, CSS3, JS   | Responsive UI, charts, animations  |
| Backend   | Node.js + Express | REST API server                    |
| Blockchain| Etherscan API V2  | Transaction data without full node |
| Pricing   | CoinGecko API     | Real-time ETH/USD price            |
| Dev Tools | dotenv, cors, axios, express-rate-limit | Server utilities |

---

## ✨ Features

- 🔍 **Wallet Analysis** — Analyze any Ethereum address instantly
- 📊 **KPI Dashboard** — Total transactions, gas fees, sent/received, success rate
- 💸 **USD Conversion** — All ETH values converted at live market price
- 📈 **Activity Chart** — Daily transaction volume bar chart (last 30 days)
- 🔄 **Fund Flow** — Visual comparison of sent vs received ETH
- 👥 **Top Counterparties** — Most frequent interaction addresses
- 📋 **Transaction Table** — Full history with filtering (All/In/Out/Failed)
- 📤 **CSV Export** — Download complete transaction log
- 🖥️ **Fully Responsive** — Works on mobile, tablet, and desktop
- 🎨 **Dark Cyberpunk UI** — Animated particle network background

---

## 🔐 Security Notes

- The `.env` file is **never** committed to git (add to `.gitignore`)
- The API is **read-only** — no transactions are ever sent
- Rate limiting is applied: 30 requests/minute per IP
- No user wallets or private keys are stored anywhere

---

## 🐛 Troubleshooting

**"Etherscan API key not configured"**  
→ Make sure you created `.env` from `.env.example` and added your API key.

**"CORS error" in browser**  
→ Access via `http://localhost:3001` (not via file://)

**"Cannot connect to server"**  
→ Make sure the backend is running (`npm start` in `/backend` folder)

**Etherscan returns "No transactions found"**  
→ The address may have 0 transactions, or a very new wallet.

**CoinGecko rate limit**  
→ A fallback price of $3000 will be used automatically.

---

## 📚 References

- [Etherscan API Docs](https://docs.etherscan.io/)
- [Web3.py Documentation](https://web3py.readthedocs.io/)
- [Ethereum Whitepaper](https://ethereum.org/en/whitepaper/)
- [Mastering Ethereum](https://github.com/ethereumbook/ethereumbook)

---

*Built for academic purposes. Not financial advice.*
