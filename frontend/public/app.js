/* ════════════════════════════════════════════════════════
   ETHSCOPE — FRONTEND APPLICATION
   ════════════════════════════════════════════════════════ */

const API_BASE = window.location.origin;

// ─── State ────────────────────────────────────────────────
let currentData     = null;
let currentFilter   = 'all';
let allTransactions = [];

// ─── DOM refs ─────────────────────────────────────────────
const addressInput   = document.getElementById('addressInput');
const analyzeBtn     = document.getElementById('analyzeBtn');
const searchBox      = document.getElementById('searchBox');
const validationHint = document.getElementById('validationHint');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorBanner    = document.getElementById('errorBanner');
const errorMsg       = document.getElementById('errorMsg');
const dashboard      = document.getElementById('dashboard');

// ─── Canvas Background ────────────────────────────────────
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, nodes = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeNode() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5
    };
  }

  function init() {
    resize();
    nodes = Array.from({ length: 80 }, makeNode);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,255,179,0.6)';

    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(0,255,179,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.globalAlpha = 1 - d / 120;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
})();

// ─── ETH Price Live ───────────────────────────────────────
async function fetchEthPrice() {
  try {
    const r = await fetch(`${API_BASE}/api/eth-price`);
    const d = await r.json();
    const el = document.getElementById('liveEthPrice');
    if (el) el.textContent = `$${parseFloat(d.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  } catch (_) {}
}
fetchEthPrice();
setInterval(fetchEthPrice, 60000);

// ─── Address Validation ───────────────────────────────────
function isValidEthAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

addressInput.addEventListener('input', () => {
  const val = addressInput.value.trim();
  if (!val) {
    searchBox.className = 'search-box';
    validationHint.textContent = '';
    validationHint.className = 'hint-text';
    return;
  }
  // Auto-prepend 0x if needed and full address pasted
  const check = val.startsWith('0x') ? val : '0x' + val;
  if (isValidEthAddress(check)) {
    searchBox.className = 'search-box valid';
    validationHint.textContent = '✓ Valid address';
    validationHint.className   = 'hint-text valid';
  } else if (val.length > 3) {
    searchBox.className = 'search-box invalid';
    validationHint.textContent = '✗ Invalid address format';
    validationHint.className   = 'hint-text invalid';
  } else {
    searchBox.className = 'search-box';
    validationHint.textContent = '';
  }
});

addressInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') analyzeAddress();
});

// ─── Demo chips ───────────────────────────────────────────
document.querySelectorAll('.demo-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    addressInput.value = btn.dataset.addr;
    searchBox.className = 'search-box valid';
    validationHint.textContent = '✓ Valid address';
    validationHint.className = 'hint-text valid';
    analyzeAddress();
  });
});

// ─── Filter buttons ───────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    applyFilter();
  });
});

function applyFilter() {
  const rows = document.querySelectorAll('#txBody tr');
  let shown = 0;
  rows.forEach(row => {
    const dir    = row.dataset.dir;
    const failed = row.dataset.failed === 'true';
    let show = false;
    if (currentFilter === 'all')    show = true;
    if (currentFilter === 'in')     show = dir === 'IN';
    if (currentFilter === 'out')    show = dir === 'OUT';
    if (currentFilter === 'failed') show = failed;
    row.classList.toggle('hidden', !show);
    if (show) shown++;
  });
  const footer = document.getElementById('txFooter');
  if (footer) footer.textContent = `Showing ${shown} of ${allTransactions.length} transactions`;
}

// ─── Export CSV ───────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', () => {
  if (!allTransactions.length) return;
  const headers = ['Hash','Date','Direction','From','To','Value (ETH)','Gas Fee (ETH)','Gas Price (Gwei)','Status','Block','Type'];
  const rows    = allTransactions.map(tx => [
    tx.hash, tx.dateFormatted, tx.direction, tx.from, tx.to,
    tx.valueFormatted, tx.gasFeeFormatted, tx.gasPrice,
    tx.status, tx.blockNumber, tx.isContractCall ? 'Contract Call' : 'Transfer'
  ]);
  const csv     = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob    = new Blob([csv], { type: 'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `eth_transactions_${currentData?.address?.slice(0, 10)}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ─── Loading Animation ────────────────────────────────────
function showLoading() {
  loadingOverlay.classList.add('show');
  const steps = ['step1', 'step2', 'step3'];
  steps.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active', 'done'); }
  });

  let i = 0;
  const messages = ['Connecting to Ethereum network...', 'Fetching transaction history...', 'Computing analytics...'];
  const txt = document.getElementById('loadingText');

  function advance() {
    if (i < steps.length) {
      if (i > 0) document.getElementById(steps[i - 1]).classList.replace('active', 'done');
      document.getElementById(steps[i]).classList.add('active');
      if (txt) txt.textContent = messages[i];
      i++;
    }
  }
  advance();
  const t1 = setTimeout(advance, 1200);
  const t2 = setTimeout(advance, 2400);
  return () => { clearTimeout(t1); clearTimeout(t2); };
}

function hideLoading() { loadingOverlay.classList.remove('show'); }

// ─── Error ────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.add('show');
  setTimeout(() => errorBanner.classList.remove('show'), 6000);
}

// ─── Main Analyze ─────────────────────────────────────────
analyzeBtn.addEventListener('click', analyzeAddress);

async function analyzeAddress() {
  let addr = addressInput.value.trim();
  if (!addr) { showError('Please enter an Ethereum wallet address.'); return; }
  if (!addr.startsWith('0x')) addr = '0x' + addr;
  if (!isValidEthAddress(addr)) { showError('Invalid Ethereum address format. Must be 0x followed by 40 hex characters.'); return; }

  const limit  = document.getElementById('limitSelect').value;
  const stopLoading = showLoading();
  analyzeBtn.disabled = true;
  dashboard.classList.remove('show');
  errorBanner.classList.remove('show');

  try {
    const res  = await fetch(`${API_BASE}/api/analyze/${addr}?limit=${limit}`);
    const data = await res.json();
    stopLoading();
    hideLoading();

    if (!res.ok || data.error) {
      showError(data.error || 'Analysis failed. Please try again.');
      analyzeBtn.disabled = false;
      return;
    }

    currentData     = data;
    allTransactions = data.transactions;
    renderDashboard(data);
    dashboard.classList.add('show');
    dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    stopLoading();
    hideLoading();
    showError('Network error. Make sure the backend server is running on port 3001.');
    console.error(err);
  }
  analyzeBtn.disabled = false;
}

// ─── Render Dashboard ─────────────────────────────────────
function renderDashboard(data) {
  const { address, shortAddress, balance, balanceUsd, transactions, analytics } = data;

  // Wallet header
  document.getElementById('walletAddressFull').textContent  = address;
  document.getElementById('walletAddressShort').textContent = shortAddress;
  document.getElementById('balanceEth').textContent  = `${parseFloat(balance).toFixed(4)} ETH`;
  document.getElementById('balanceUsd').textContent  = `≈ $${parseFloat(balanceUsd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  document.getElementById('etherscanLink').href = `https://etherscan.io/address/${address}`;

  // Avatar gradient from address
  const avatar = document.getElementById('walletAvatar');
  const hue1 = parseInt(address.slice(2, 5), 16) % 360;
  const hue2 = parseInt(address.slice(5, 8), 16) % 360;
  avatar.style.background = `linear-gradient(135deg, hsl(${hue1},70%,50%), hsl(${hue2},70%,60%))`;

  // KPIs
  document.getElementById('kpiTxValue').textContent = analytics.totalTransactions;
  document.getElementById('kpiTxSub').textContent   = `${analytics.successCount} success · ${analytics.failedCount} failed`;

  document.getElementById('kpiGasValue').textContent = `${parseFloat(analytics.totalGasFeeEth).toFixed(5)} ETH`;
  document.getElementById('kpiGasSub').textContent   = `≈ $${parseFloat(analytics.totalGasFeeUsd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  document.getElementById('kpiSentValue').textContent = `${parseFloat(analytics.totalSentEth).toFixed(4)} ETH`;
  document.getElementById('kpiSentSub').textContent   = `≈ $${parseFloat(analytics.totalSentUsd).toLocaleString()}`;

  document.getElementById('kpiReceivedValue').textContent = `${parseFloat(analytics.totalReceivedEth).toFixed(4)} ETH`;
  document.getElementById('kpiReceivedSub').textContent   = `≈ $${parseFloat(analytics.totalReceivedUsd).toLocaleString()}`;

  const netEth = parseFloat(analytics.netFlowEth);
  const netEl  = document.getElementById('kpiFlowValue');
  const netIcon = document.getElementById('kpiFlowIcon');
  netEl.textContent = `${netEth >= 0 ? '+' : ''}${netEth.toFixed(4)} ETH`;
  netEl.style.color = netEth >= 0 ? 'var(--green)' : 'var(--red)';
  netIcon.textContent = netEth >= 0 ? '↑' : '↓';
  document.getElementById('kpiFlowSub').textContent = `≈ $${parseFloat(analytics.netFlowUsd).toFixed(2)}`;

  document.getElementById('kpiRateValue').textContent = `${analytics.successRate}%`;
  document.getElementById('kpiRateSub').textContent   = `${analytics.contractCalls} contract calls`;

  // Flow Visual
  renderFlowVisual(analytics);

  // Bar Chart
  renderBarChart(analytics.dailyVolume);

  // Counterparties
  renderCounterparties(analytics.topCounterparties);

  // Transaction table
  renderTransactionTable(transactions, address);

  // Footer
  document.getElementById('txFooter').textContent = `Showing ${transactions.length} of ${transactions.length} transactions · ETH price $${parseFloat(analytics.ethPrice).toLocaleString()}`;

  // Reset filter
  currentFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
}

function renderFlowVisual(a) {
  const sent     = parseFloat(a.totalSentEth);
  const received = parseFloat(a.totalReceivedEth);
  const max      = Math.max(sent, received, 0.0001);
  const netEth   = parseFloat(a.netFlowEth);

  document.getElementById('flowVisual').innerHTML = `
    <div class="flow-row">
      <div class="flow-label"><span>Sent</span><span>${sent.toFixed(4)} ETH</span></div>
      <div class="flow-bar-bg"><div class="flow-bar-fill sent" style="width:${(sent/max*100).toFixed(1)}%"></div></div>
    </div>
    <div class="flow-row">
      <div class="flow-label"><span>Received</span><span>${received.toFixed(4)} ETH</span></div>
      <div class="flow-bar-bg"><div class="flow-bar-fill received" style="width:${(received/max*100).toFixed(1)}%"></div></div>
    </div>
    <div class="flow-net">
      Net Flow &nbsp; <strong class="${netEth >= 0 ? 'positive' : 'negative'}">${netEth >= 0 ? '+' : ''}${netEth.toFixed(6)} ETH</strong>
    </div>
  `;
}

function renderBarChart(dailyVolume) {
  const container = document.getElementById('barChart');
  if (!dailyVolume || dailyVolume.length === 0) {
    container.innerHTML = '<div class="bar-empty">No volume data</div>';
    return;
  }
  // Last 30 days only
  const recent = dailyVolume.slice(-30);
  const maxVol = Math.max(...recent.map(d => d.sent + d.received), 0.0001);

  container.innerHTML = recent.map(d => {
    const total  = d.sent + d.received;
    const pct    = Math.max((total / maxVol) * 100, 1).toFixed(1);
    const mo     = d.date.slice(5); // MM-DD
    return `
      <div class="bar-col" title="${d.date}: ${total.toFixed(4)} ETH (${d.count} txs)">
        <div class="bar-col-inner" style="height:${pct}%"></div>
        <span class="bar-date">${mo}</span>
      </div>`;
  }).join('');
}

function renderCounterparties(cps) {
  const section = document.getElementById('counterpartiesSection');
  const list    = document.getElementById('cpList');
  if (!cps || cps.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';
  const maxCount = cps[0].count;
  list.innerHTML = cps.map((cp, i) => `
    <div class="cp-row">
      <span class="cp-rank">#${i + 1}</span>
      <a class="cp-addr" href="https://etherscan.io/address/${cp.address}" target="_blank" rel="noopener">${cp.shortAddr}</a>
      <div class="cp-bar-bg"><div class="cp-bar-fill" style="width:${(cp.count / maxCount * 100).toFixed(0)}%"></div></div>
      <span class="cp-count">${cp.count} tx${cp.count !== 1 ? 's' : ''}</span>
    </div>
  `).join('');
}

function renderTransactionTable(transactions, walletAddress) {
  const tbody = document.getElementById('txBody');
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:2rem;font-family:var(--font-mono)">No transactions found for this address.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(tx => {
    const statusBadge = tx.isError
      ? `<span class="badge-status badge-failed">✗ Failed</span>`
      : `<span class="badge-status badge-success">✓ OK</span>`;

    const dirBadge = tx.isOutgoing
      ? `<span class="badge-dir badge-out">↑ OUT</span>`
      : `<span class="badge-dir badge-in">↓ IN</span>`;

    const fromTo = tx.isOutgoing
      ? `<span class="addr-pill" title="${tx.to}">${tx.to === 'Contract Creation' ? '📜 Contract' : shortenAddr(tx.to)}</span>`
      : `<span class="addr-pill" title="${tx.from}">${shortenAddr(tx.from)}</span>`;

    const valClass = tx.value === 0 ? 'value-zero' : tx.isOutgoing ? 'value-negative' : 'value-positive';
    const valSign  = tx.value === 0 ? '' : tx.isOutgoing ? '−' : '+';

    const typeBadge = tx.isContractCall
      ? `<span class="type-contract">Contract</span>`
      : `<span class="type-transfer">Transfer</span>`;

    return `
      <tr data-dir="${tx.direction}" data-failed="${tx.isError}">
        <td>${statusBadge}</td>
        <td><a class="tx-hash" href="https://etherscan.io/tx/${tx.hash}" target="_blank" rel="noopener" title="${tx.hash}">${tx.hash.slice(0, 10)}…</a></td>
        <td style="color:var(--text2);font-size:0.72rem">${tx.dateFormatted}</td>
        <td>${dirBadge}</td>
        <td>${fromTo}</td>
        <td class="num-col ${valClass}">${valSign}${parseFloat(tx.valueFormatted).toFixed(5)}</td>
        <td class="num-col" style="color:var(--text3)">${parseFloat(tx.gasFeeFormatted).toFixed(6)}</td>
        <td>${typeBadge}</td>
      </tr>`;
  }).join('');
}

function shortenAddr(addr) {
  if (!addr || addr === 'Contract Creation') return addr;
  return addr.slice(0, 7) + '…' + addr.slice(-5);
}
