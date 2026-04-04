/* ===== VaultID Main App Controller ===== */

let currentUser = null;
let currentSection = 'cards';
let allCards = [];
let allDocs = [];
let allFiles = [];
let activeFilter = 'all';
let qrInstances = {};

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  // Check for Google OAuth callback
  const googleCallback = api.handleGoogleCallback();
  if (googleCallback) {
    currentUser = googleCallback.user;
    crypto_vault.setKey('google-oauth-' + Date.now()); // Set a temporary key for OAuth users
    sessionStorage.setItem('vaultid_key', crypto_vault.key);
    showApp();
    return;
  }

  // Check stored session
  const token = localStorage.getItem('vaultid_token');
  const storedUser = localStorage.getItem('vaultid_user');
  const storedPw = sessionStorage.getItem('vaultid_key');

  if (token && storedUser && storedPw) {
    currentUser = JSON.parse(storedUser);
    api.token = token;
    crypto_vault.setKey(storedPw);
    showApp();
  } else {
    showPage('auth-page');
  }
});

// ===== Page Navigation =====
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
}

function showApp() {
  if (currentUser.role === 'admin') {
    showPage('admin-page');
    initAdmin();
  } else {
    showPage('app-page');
    renderSidebar();
    navigateTo('cards');
  }
}

// ===== Toast =====
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ===== Auth =====
function setAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
}

function setRole(role) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
  document.getElementById('selected-role').value = role;
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<span class="loader"></span>';
  btn.disabled = true;

  try {
    const data = await api.login(email, password);
    api.token = data.token;
    currentUser = data.user;
    localStorage.setItem('vaultid_user', JSON.stringify(currentUser));
    sessionStorage.setItem('vaultid_key', password);
    crypto_vault.setKey(password);
    toast('Welcome back, ' + currentUser.name + '!');
    showApp();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    btn.innerHTML = 'Sign In';
    btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('register-btn');
  btn.innerHTML = '<span class="loader"></span>';
  btn.disabled = true;

  try {
    const data = await api.register(name, email, password);
    api.token = data.token;
    currentUser = data.user;
    localStorage.setItem('vaultid_user', JSON.stringify(currentUser));
    sessionStorage.setItem('vaultid_key', password);
    crypto_vault.setKey(password);
    toast('Account created! Welcome, ' + name);
    showApp();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    btn.innerHTML = 'Create Account';
    btn.disabled = false;
  }
}

function googleLogin() {
  api.loginWithGoogle();
}

function logout() {
  localStorage.removeItem('vaultid_token');
  localStorage.removeItem('vaultid_user');
  sessionStorage.removeItem('vaultid_key');
  api.token = null;
  currentUser = null;
  allCards = []; allDocs = []; allFiles = [];
  showPage('auth-page');
  toast('Signed out');
}

// ===== Sidebar =====
function renderSidebar() {
  const initials = currentUser.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-email').textContent = currentUser.email;
  document.getElementById('sidebar-initials').textContent = initials;
}

function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.section === section));
  document.querySelectorAll('.section-view').forEach(v => v.style.display = 'none');
  const view = document.getElementById('view-' + section);
  if (view) view.style.display = 'block';

  if (section === 'cards') loadCards();
  if (section === 'documents') loadDocuments();
  if (section === 'files') loadFiles();
  if (section === 'scanner') initScanner();
  if (section === 'security') renderSecurity();
}

// ===== CARDS =====
async function loadCards() {
  try {
    const data = await api.getCards();
    allCards = data.cards || [];
    renderCards(allCards);
    updateStats();
  } catch (e) {
    toast('Failed to load cards: ' + e.message, 'error');
  }
}

function filterCards(type) {
  activeFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === type));
  const filtered = type === 'all' ? allCards : allCards.filter(c => c.card_type === type);
  renderCards(filtered);
}

function renderCards(cards) {
  const grid = document.getElementById('cards-grid');
  if (!cards.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted2)">No cards yet. Click + Add Card to get started.</div>';
    return;
  }

  grid.innerHTML = cards.map(card => {
    const typeClass = { student:'card-student', bus:'card-bus', library:'card-library', employee:'card-employee', custom:'card-custom', uploaded:'card-uploaded' }[card.card_type] || 'card-custom';
    let decrypted = {};
    try { decrypted = crypto_vault.decrypt(card.encrypted_data) || {}; } catch {}

    const imgHtml = card.card_image_path
      ? `<div class="card-img-preview"><img src="${API_BASE.replace('/api', '')}${card.card_image_path}" alt="Card" onerror="this.parentElement.style.display='none'"/></div>`
      : '';

    return `
    <div class="id-card-widget ${typeClass}" onclick="showQR('${card.id}')">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <span class="card-badge">${escapeHtml(card.card_type.toUpperCase())}</span>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="card-icon-btn" onclick="showQR('${card.id}')" title="View QR">
              <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="10" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2.5" y="2.5" width="2" height="2" fill="currentColor"/><rect x="11.5" y="2.5" width="2" height="2" fill="currentColor"/><rect x="2.5" y="11.5" width="2" height="2" fill="currentColor"/><path d="M10 10h2v2M13 10h2v2M10 13v2h2M13 13h2v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            </button>
            <button class="card-icon-btn" onclick="deleteCard(${card.id})" title="Delete" style="background:rgba(240,92,92,0.2)">
              <svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        ${imgHtml}
      </div>
      <div>
        <div class="card-name">${escapeHtml(card.card_name || decrypted.name || 'Card')}</div>
        <div class="card-num">${escapeHtml(card.card_number_preview || '—')}</div>
        <div class="card-status"><div class="dot-green"></div>${escapeHtml(card.org_name || '—')} · ${escapeHtml(card.expiry_date || 'No expiry')}</div>
      </div>
    </div>`;
  }).join('');
}

function updateStats() {
  const el = document.getElementById('card-count-stat');
  if (el) el.textContent = allCards.length;
}

function showAddCardModal() {
  document.getElementById('add-card-modal').classList.add('open');
}

function closeAddCardModal() {
  document.getElementById('add-card-modal').classList.remove('open');
  document.getElementById('add-card-form').reset();
  document.getElementById('card-image-preview').innerHTML = '';
}

// Card image preview
document.addEventListener('DOMContentLoaded', () => {
  const imgInput = document.getElementById('card-image-input');
  if (imgInput) {
    imgInput.addEventListener('change', async () => {
      const file = imgInput.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      document.getElementById('card-image-preview').innerHTML =
        `<img src="${url}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-top:8px"/>`;
    });
  }
});

async function handleAddCard(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('save-card-btn');
  btn.innerHTML = '<span class="loader"></span>';
  btn.disabled = true;

  try {
    const cardData = {
      name: form.querySelector('[name="card_name"]').value,
      id_number: form.querySelector('[name="card_number"]').value,
      org: form.querySelector('[name="org_name"]').value,
      expiry: form.querySelector('[name="expiry_date"]').value,
      notes: form.querySelector('[name="notes"]').value,
    };

    const card_type = form.querySelector('[name="card_type"]').value;
    const expiry_date = form.querySelector('[name="expiry_date"]').value;
    const org_name = form.querySelector('[name="org_name"]').value;
    const encrypted_data = crypto_vault.encrypt(cardData);

    const qr_data = JSON.stringify({
      app: 'VaultID',
      type: card_type,
      name: cardData.name,
      id: cardData.id_number,
      org: org_name,
      expiry: expiry_date,
      verified: true
    });

    const formData = new FormData();
    formData.append('card_type', card_type);
    formData.append('card_name', cardData.name);
    formData.append('card_number_preview', cardData.id_number.slice(0, 4) + '****');
    formData.append('org_name', org_name);
    formData.append('expiry_date', expiry_date);
    formData.append('encrypted_data', encrypted_data);
    formData.append('qr_data', qr_data);

    const imgInput = document.getElementById('card-image-input');
    if (imgInput.files[0]) formData.append('card_image', imgInput.files[0]);

    await api.addCard(formData);
    toast('Card added successfully!');
    closeAddCardModal();
    loadCards();
  } catch (e) {
    toast('Failed to add card: ' + e.message, 'error');
  } finally {
    btn.innerHTML = 'Save Card';
    btn.disabled = false;
  }
}

async function deleteCard(id) {
  if (!confirm('Delete this card? This cannot be undone.')) return;
  try {
    await api.deleteCard(id);
    toast('Card deleted');
    loadCards();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function showQR(cardId) {
  const card = allCards.find(c => c.id == cardId);
  if (!card) return;

  let decrypted = {};
  try { decrypted = crypto_vault.decrypt(card.encrypted_data) || {}; } catch {}

  document.getElementById('qr-card-name').textContent = card.card_name || decrypted.name || 'Card';
  document.getElementById('qr-card-id').textContent = card.card_number_preview || '';
  document.getElementById('qr-card-org').textContent = card.org_name || '';
  document.getElementById('qr-card-expiry').textContent = card.expiry_date ? 'Expires: ' + card.expiry_date : '';

  const qrContainer = document.getElementById('qr-display');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: card.qr_data || JSON.stringify({ id: cardId, name: card.card_name }),
    width: 180, height: 180,
    colorDark: '#000000', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  document.getElementById('download-qr-btn').onclick = () => downloadQR(cardId, card.card_name);
  document.getElementById('qr-modal').classList.add('open');
}

function closeQRModal() {
  document.getElementById('qr-modal').classList.remove('open');
}

function downloadQR(cardId, cardName) {
  const canvas = document.querySelector('#qr-display canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `vaultid-qr-${(cardName||'card').replace(/\s+/g,'-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('QR downloaded!');
}

// ===== DOCUMENTS =====
async function loadDocuments() {
  try {
    const data = await api.getDocs();
    allDocs = data.documents || [];
    renderDocs();
  } catch (e) {
    toast('Failed to load documents: ' + e.message, 'error');
  }
}

function renderDocs() {
  const list = document.getElementById('docs-list');
  if (!allDocs.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted2)">No documents uploaded yet.</div>';
    return;
  }
  list.innerHTML = allDocs.map(doc => renderFileItem(doc, 'doc')).join('');
}

// ===== FILES =====
async function loadFiles() {
  try {
    const data = await api.getFiles();
    allFiles = data.files || [];
    renderFiles();
  } catch (e) {
    toast('Failed to load files: ' + e.message, 'error');
  }
}

function renderFiles() {
  const list = document.getElementById('files-list');
  if (!allFiles.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted2)">No files uploaded yet.</div>';
    return;
  }
  list.innerHTML = allFiles.map(f => renderFileItem(f, 'file')).join('');
}

function renderFileItem(item, kind) {
  const name = item.doc_name || item.file_name;
  const mime = item.mime_type || '';
  const size = item.file_size ? formatBytes(item.file_size) : '—';
  const date = new Date(item.created_at).toLocaleDateString();
  const isPDF = mime.includes('pdf');
  const isImg = mime.includes('image');
  const isDoc = mime.includes('word') || mime.includes('doc') || mime.includes('text');
  const iconClass = isPDF ? 'pdf' : isImg ? 'img' : isDoc ? 'doc' : 'other';
  const emoji = isPDF ? '📄' : isImg ? '🖼️' : isDoc ? '📝' : '📁';
  const deleteFunc = kind === 'doc' ? `deleteDoc(${item.id})` : `deleteFile(${item.id})`;
  const viewFunc = `viewFile('${item.encrypted_data}', '${mime}', '${escapeHtml(name)}')`;

  return `<div class="file-item">
    <div class="file-icon ${iconClass}">${emoji}</div>
    <div style="flex:1;min-width:0">
      <div class="file-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(name)}</div>
      <div class="file-meta">${size} · ${date} · <span class="enc-badge" style="font-size:10px;padding:1px 6px">🔒 Encrypted</span></div>
    </div>
    <div class="file-actions">
      ${isImg || isPDF ? `<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="${viewFunc}">View</button>` : ''}
      <button class="btn btn-danger" style="padding:6px 10px;font-size:12px" onclick="${deleteFunc}">Delete</button>
    </div>
  </div>`;
}

function viewFile(encryptedData, mime, name) {
  try {
    const base64 = crypto_vault.decryptFile(encryptedData);
    const dataUrl = `data:${mime};base64,${base64}`;
    if (mime.includes('image')) {
      const win = window.open('', '_blank');
      win.document.write(`<html><body style="margin:0;background:#000"><img src="${dataUrl}" style="max-width:100%;display:block;margin:auto"></body></html>`);
    } else if (mime.includes('pdf')) {
      const win = window.open('', '_blank');
      win.document.write(`<html><body style="margin:0"><embed src="${dataUrl}" width="100%" height="100%" type="application/pdf"></body></html>`);
    }
  } catch (e) {
    toast('Cannot decrypt file', 'error');
  }
}

async function deleteDoc(id) {
  if (!confirm('Delete document?')) return;
  try { await api.deleteDoc(id); toast('Document deleted'); loadDocuments(); }
  catch (e) { toast(e.message, 'error'); }
}

async function deleteFile(id) {
  if (!confirm('Delete file?')) return;
  try { await api.deleteFile(id); toast('File deleted'); loadFiles(); }
  catch (e) { toast(e.message, 'error'); }
}

// Upload handler (shared for docs and files)
async function handleUpload(file, kind) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('File too large (max 5MB)', 'error'); return; }

  try {
    toast('Encrypting and uploading...');
    const base64 = await fileToBase64(file);
    const encrypted_data = crypto_vault.encryptFile(base64);

    const payload = {
      encrypted_data,
      file_size: file.size,
      mime_type: file.type
    };

    if (kind === 'doc') {
      payload.doc_name = file.name;
      payload.doc_type = file.type;
      await api.addDoc(payload);
      toast('Document uploaded (encrypted)!');
      loadDocuments();
    } else {
      payload.file_name = file.name;
      payload.file_type = file.type;
      await api.addFile(payload);
      toast('File uploaded (encrypted)!');
      loadFiles();
    }
  } catch (e) {
    toast('Upload failed: ' + e.message, 'error');
  }
}

// Setup drag and drop
function setupDropzone(zoneId, inputId, kind) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file, kind);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) handleUpload(input.files[0], kind);
  });
}

// ===== QR SCANNER =====
let scannerStream = null;
let scannerInterval = null;

function initScanner() {
  // jsQR scanner setup
}

async function startScanner() {
  const video = document.getElementById('scanner-video');
  const canvas = document.getElementById('scanner-canvas');
  const btn = document.getElementById('start-scan-btn');
  btn.textContent = 'Stop Scanner';
  btn.onclick = stopScanner;

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = scannerStream;
    video.play();

    const ctx = canvas.getContext('2d');
    scannerInterval = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code) {
          processScanResult(code.data);
        }
      }
    }, 300);
  } catch (e) {
    toast('Camera access denied or not available', 'error');
    btn.textContent = 'Start Scanner';
    btn.onclick = startScanner;
  }
}

function stopScanner() {
  if (scannerStream) { scannerStream.getTracks().forEach(t => t.stop()); scannerStream = null; }
  if (scannerInterval) { clearInterval(scannerInterval); scannerInterval = null; }
  const btn = document.getElementById('start-scan-btn');
  btn.textContent = 'Start Scanner';
  btn.onclick = startScanner;
}

function processScanResult(data) {
  stopScanner();
  let parsed = {};
  try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }

  const result = document.getElementById('scan-result');
  result.classList.add('show');
  document.getElementById('scan-name').textContent = parsed.name || 'Unknown';
  document.getElementById('scan-id').textContent = parsed.id || '—';
  document.getElementById('scan-type').textContent = parsed.type || '—';
  document.getElementById('scan-org').textContent = parsed.org || '—';
  document.getElementById('scan-expiry').textContent = parsed.expiry || '—';
  document.getElementById('scan-time').textContent = new Date().toLocaleString();
  toast('QR Code verified!');
}

// ===== SECURITY =====
function renderSecurity() {
  document.getElementById('sec-email').textContent = currentUser.email;
  document.getElementById('sec-name').textContent = currentUser.name;
  document.getElementById('sec-role').textContent = currentUser.role;
}

// ===== ADMIN =====
async function initAdmin() {
  renderAdminSidebar();
  loadAdminStats();
  loadAdminUsers();
}

function renderAdminSidebar() {
  document.getElementById('admin-name').textContent = currentUser.name;
  document.getElementById('admin-email').textContent = currentUser.email;
}

async function loadAdminStats() {
  try {
    const data = await api.adminStats();
    const s = data.stats;
    document.getElementById('stat-users').textContent = s.total_users;
    document.getElementById('stat-cards').textContent = s.total_cards;
    document.getElementById('stat-docs').textContent = s.total_documents;
    document.getElementById('stat-scans').textContent = s.scans_today;
  } catch (e) { toast('Stats error: ' + e.message, 'error'); }
}

async function loadAdminUsers() {
  try {
    const data = await api.adminUsers();
    renderAdminTable(data.users);
  } catch (e) { toast('Failed to load users: ' + e.message, 'error'); }
}

function renderAdminTable(users) {
  const tbody = document.getElementById('admin-user-table');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted2);padding:30px">No users found</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td style="color:var(--muted2)">${escapeHtml(u.email)}</td>
      <td>${new Date(u.created_at).toLocaleDateString()}</td>
      <td style="text-align:center">${u.stats.cards}</td>
      <td style="text-align:center">${u.stats.documents}</td>
      <td><span class="lock-badge">🔒 Private</span></td>
      <td style="color:var(--muted2);font-size:11px">${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
    </tr>
  `).join('');
}

async function adminSearch() {
  const q = document.getElementById('admin-search').value.trim();
  if (!q) { loadAdminUsers(); return; }
  try {
    const data = await api.adminSearch(q);
    renderAdminTable(data.users.map(u => ({ ...u, stats: { cards: '?', documents: '?' }, last_login: null })));
  } catch (e) { toast('Search failed', 'error'); }
}

function navigateAdmin(section) {
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.toggle('active', n.dataset.section === section));
  document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
  const view = document.getElementById('admin-view-' + section);
  if (view) view.style.display = 'block';
  if (section === 'scanner') initAdminScanner();
}

// Admin QR scanner
let adminScannerStream = null;
let adminScannerInterval = null;

async function initAdminScanner() {}

async function startAdminScanner() {
  const video = document.getElementById('admin-scanner-video');
  const canvas = document.getElementById('admin-scanner-canvas');
  const btn = document.getElementById('admin-scan-btn');
  btn.textContent = 'Stop';
  btn.onclick = stopAdminScanner;

  try {
    adminScannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = adminScannerStream;
    video.play();

    const ctx = canvas.getContext('2d');
    adminScannerInterval = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code) processAdminScan(code.data);
      }
    }, 300);
  } catch (e) {
    toast('Camera not available', 'error');
    btn.textContent = 'Start Scanner';
    btn.onclick = startAdminScanner;
  }
}

function stopAdminScanner() {
  if (adminScannerStream) { adminScannerStream.getTracks().forEach(t => t.stop()); adminScannerStream = null; }
  if (adminScannerInterval) { clearInterval(adminScannerInterval); adminScannerInterval = null; }
  const btn = document.getElementById('admin-scan-btn');
  btn.textContent = 'Start Scanner';
  btn.onclick = startAdminScanner;
}

function processAdminScan(data) {
  stopAdminScanner();
  let parsed = {};
  try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
  const r = document.getElementById('admin-scan-result');
  r.classList.add('show');
  document.getElementById('ascan-name').textContent = parsed.name || '—';
  document.getElementById('ascan-id').textContent = parsed.id || '—';
  document.getElementById('ascan-type').textContent = parsed.type || '—';
  document.getElementById('ascan-org').textContent = parsed.org || '—';
  document.getElementById('ascan-time').textContent = new Date().toLocaleString();
  toast('Identity verified via QR');
}

// ===== Utils =====
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Setup dropzones after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    setupDropzone('doc-dropzone', 'doc-file-input', 'doc');
    setupDropzone('file-dropzone', 'file-file-input', 'file');
  }, 500);
});
