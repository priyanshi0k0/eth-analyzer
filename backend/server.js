require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(cors());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please wait a moment.' }
});
app.use('/api/', apiLimiter);

// ─── Constants ────────────────────────────────────────────
const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const WEI_TO_ETH = 1e18;
const GWEI_TO_ETH = 1e9;

// ─── Utility Functions ────────────────────────────────────
function weiToEth(wei) {
  return parseFloat(wei) / WEI_TO_ETH;
}

function isValidAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function formatTx(tx, walletAddress) {
  const value = weiToEth(tx.value);
  const gasUsed = parseInt(tx.gasUsed || tx.gas || 0);
  const gasPrice = parseFloat(tx.gasPrice || 0) / GWEI_TO_ETH; // in Gwei
  const gasFeeEth = (gasUsed * parseFloat(tx.gasPrice || 0)) / WEI_TO_ETH;
  const timestamp = new Date(parseInt(tx.timeStamp) * 1000);
  const isOutgoing = tx.from.toLowerCase() === walletAddress.toLowerCase();
  const isError = tx.isError === '1';

  return {
    hash: tx.hash,
    blockNumber: parseInt(tx.blockNumber),
    timestamp: timestamp.toISOString(),
    dateFormatted: timestamp.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    from: tx.from,
    to: tx.to || 'Contract Creation',
    value: value,
    valueFormatted: value.toFixed(6),
    gasUsed,
    gasPrice: gasPrice.toFixed(2),
    gasFeeEth,
    gasFeeFormatted: gasFeeEth.toFixed(8),
    isOutgoing,
    direction: isOutgoing ? 'OUT' : 'IN',
    isError,
    status: isError ? 'Failed' : 'Success',
    methodId: tx.input ? tx.input.slice(0, 10) : '0x',
    isContractCall: tx.input && tx.input !== '0x',
    confirmations: parseInt(tx.confirmations || 0),
    nonce: parseInt(tx.nonce || 0)
  };
}

function computeAnalytics(transactions, walletAddress, ethPrice) {
  const wallet = walletAddress.toLowerCase();
  let totalGasFeeEth = 0;
  let totalSentEth = 0;
  let totalReceivedEth = 0;
  let successCount = 0;
  let failedCount = 0;
  let contractCalls = 0;
  const dailyVolume = {};
  const counterparties = {};

  transactions.forEach(tx => {
    if (!tx.isError) {
      totalGasFeeEth += tx.gasFeeEth;
      if (tx.isOutgoing) {
        totalSentEth += tx.value;
      } else {
        totalReceivedEth += tx.value;
      }
      successCount++;
    } else {
      failedCount++;
      // Gas is still consumed on failed txns
      totalGasFeeEth += tx.gasFeeEth;
    }

    if (tx.isContractCall) contractCalls++;

    // Daily volume aggregation
    const day = tx.timestamp.slice(0, 10);
    if (!dailyVolume[day]) dailyVolume[day] = { sent: 0, received: 0, count: 0 };
    if (tx.isOutgoing) dailyVolume[day].sent += tx.value;
    else dailyVolume[day].received += tx.value;
    dailyVolume[day].count++;

    // Counterparty frequency
    const cp = tx.isOutgoing ? tx.to : tx.from;
    if (cp && cp !== 'Contract Creation') {
      counterparties[cp] = (counterparties[cp] || 0) + 1;
    }
  });

  const netFlowEth = totalReceivedEth - totalSentEth;
  const gasFeeUsd = totalGasFeeEth * ethPrice;
  const sentUsd = totalSentEth * ethPrice;
  const receivedUsd = totalReceivedEth * ethPrice;
  const netFlowUsd = netFlowEth * ethPrice;

  // Top 5 counterparties
  const topCounterparties = Object.entries(counterparties)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([addr, count]) => ({ address: addr, count, shortAddr: addr.slice(0, 8) + '...' + addr.slice(-6) }));

  // Daily volume array sorted by date
  const dailyVolumeArray = Object.entries(dailyVolume)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  const avgGasPerTx = transactions.length > 0 ? totalGasFeeEth / transactions.length : 0;

  return {
    totalTransactions: transactions.length,
    successCount,
    failedCount,
    successRate: transactions.length > 0 ? ((successCount / transactions.length) * 100).toFixed(1) : '0',
    contractCalls,
    totalGasFeeEth: totalGasFeeEth.toFixed(8),
    totalGasFeeUsd: gasFeeUsd.toFixed(2),
    avgGasPerTx: avgGasPerTx.toFixed(8),
    totalSentEth: totalSentEth.toFixed(6),
    totalSentUsd: sentUsd.toFixed(2),
    totalReceivedEth: totalReceivedEth.toFixed(6),
    totalReceivedUsd: receivedUsd.toFixed(2),
    netFlowEth: netFlowEth.toFixed(6),
    netFlowUsd: netFlowUsd.toFixed(2),
    netFlowPositive: netFlowEth >= 0,
    topCounterparties,
    dailyVolume: dailyVolumeArray,
    ethPrice: ethPrice.toFixed(2)
  };
}

// ─── Routes ──────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get ETH price
app.get('/api/eth-price', async (req, res) => {
  try {
    const { data } = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: { ids: 'ethereum', vs_currencies: 'usd' },
      timeout: 8000
    });
    res.json({ price: data.ethereum.usd });
  } catch (err) {
    // Fallback price if CoinGecko is unavailable
    res.json({ price: 3000, fallback: true });
  }
});

// Validate address
app.get('/api/validate/:address', (req, res) => {
  const { address } = req.params;
  res.json({ valid: isValidAddress(address) });
});

// Get wallet balance
app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;
  if (!isValidAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address format.' });
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey || apiKey === 'YourEtherscanApiKeyHere') {
    return res.status(500).json({ error: 'Etherscan API key not configured. Please set ETHERSCAN_API_KEY in your .env file.' });
  }

  try {
    const { data } = await axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'account', action: 'balance', address, tag: 'latest', apikey: apiKey },
      timeout: 10000
    });

    if (data.status !== '1') {
      return res.status(400).json({ error: data.message || 'Failed to fetch balance.' });
    }

    const balanceEth = weiToEth(data.result);
    res.json({ balance: balanceEth.toFixed(6), balanceWei: data.result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wallet balance. Check your API key and network.' });
  }
});

// Main analysis endpoint
app.get('/api/analyze/:address', async (req, res) => {
  const { address } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  if (!isValidAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address format. Must start with 0x followed by 40 hex characters.' });
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey || apiKey === 'YourEtherscanApiKeyHere') {
    return res.status(500).json({
      error: 'Etherscan API key not configured.',
      details: 'Copy backend/.env.example to backend/.env and add your free Etherscan API key from https://etherscan.io/myapikey'
    });
  }

  try {
    // Fetch transactions and balance in parallel
    const [txResponse, balResponse, ethPriceResponse] = await Promise.allSettled([
      axios.get(ETHERSCAN_BASE, {
        params: {
          chainid: 1, module: 'account', action: 'txlist', address,
          startblock: 0, endblock: 99999999,
          page: 1, offset: limit,
          sort: 'desc', apikey: apiKey
        },
        timeout: 15000
      }),
      axios.get(ETHERSCAN_BASE, {
        params: { chainid: 1, module: 'account', action: 'balance', address, tag: 'latest', apikey: apiKey },
        timeout: 10000
      }),
      axios.get(`${COINGECKO_BASE}/simple/price`, {
        params: { ids: 'ethereum', vs_currencies: 'usd' },
        timeout: 8000
      })
    ]);

    // Handle transactions
    if (txResponse.status === 'rejected') {
      return res.status(500).json({ error: 'Network error fetching transactions. Try again.' });
    }
    const txData = txResponse.value.data;
    if (txData.status === '0' && txData.message !== 'No transactions found') {
      return res.status(400).json({ error: txData.message || 'API error. Check your API key.' });
    }

    const rawTxs = txData.result || [];
    const ethPrice = ethPriceResponse.status === 'fulfilled'
      ? ethPriceResponse.value.data.ethereum.usd
      : 3000;
    const balanceWei = balResponse.status === 'fulfilled' ? balResponse.value.data.result : '0';
    const balanceEth = weiToEth(balanceWei);

    const transactions = rawTxs.map(tx => formatTx(tx, address));
    const analytics = computeAnalytics(transactions, address, ethPrice);

    res.json({
      address,
      shortAddress: address.slice(0, 8) + '...' + address.slice(-6),
      balance: balanceEth.toFixed(6),
      balanceUsd: (balanceEth * ethPrice).toFixed(2),
      transactions,
      analytics,
      fetchedCount: transactions.length,
      requestedLimit: limit,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: 'Server error during analysis. Please try again.' });
  }
});

// Serve frontend for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Ethereum Transaction Analyzer running!`);
  console.log(`   Backend API: http://localhost:${PORT}/api/health`);
  console.log(`   Frontend:    http://localhost:${PORT}`);
  console.log(`\n   ✅ Open http://localhost:${PORT} in your browser\n`);
});
