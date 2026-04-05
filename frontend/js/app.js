/* ===== VaultID Main App Controller ===== */

let currentUser = null;
let currentSection = 'cards';
let allCards = [];
let allDocs = [];
let allFiles = [];
let activeFilter = 'all';

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  const googleCallback = api.handleGoogleCallback();
  if (googleCallback) {
    currentUser = googleCallback.user;
    crypto_vault.setKey('google-oauth-' + currentUser.email);
    sessionStorage.setItem('vaultid_key', crypto_vault._key);
    showApp();
    return;
  }

  const token = localStorage.getItem('vaultid_token');
  const storedUser = localStorage.getItem('vaultid_user');
  const storedPw = sessionStorage.getItem('vaultid_key');

  if (token && storedUser && storedPw) {
    currentUser = JSON.parse(storedUser);
    api.token = token;
    crypto_vault._key = storedPw;
    showApp();
  } else {
    showPage('auth-page');
  }
});

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

function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ===== AUTH =====
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

function googleLogin() { api.loginWithGoogle(); }

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

// ===== SIDEBAR =====
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
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted2)"><div style="font-size:48px;margin-bottom:16px">🪪</div><div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px">No ID Cards Yet</div><div>Upload a photo of your card to get started</div></div>';
    return;
  }

  grid.innerHTML = cards.map(card => {
    const typeClass = { student:'card-student', bus:'card-bus', library:'card-library', employee:'card-employee', custom:'card-custom', uploaded:'card-uploaded' }[card.card_type] || 'card-uploaded';
    const cardId = card._id || card.id;

    return '<div class="id-card-widget ' + typeClass + '">' +
      '<div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
          '<span class="card-badge">' + escapeHtml((card.card_type||'card').toUpperCase()) + '</span>' +
          '<button onclick="deleteCard(\'' + cardId + '\')" title="Delete" style="background:rgba(240,92,92,0.25);border:none;cursor:pointer;width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.9)">' +
            '<svg viewBox="0 0 16 16" fill="none" style="width:13px;height:13px"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</div>' +
        (card.card_image_path
          ? '<div style="position:relative;cursor:pointer;height:70px;border-radius:8px;overflow:hidden;margin-bottom:10px" onclick="promptViewCard(\'' + cardId + '\')">' +
              '<img src="' + API_BASE.replace('/api','') + card.card_image_path + '" alt="Card" id="card-img-' + cardId + '" style="width:100%;height:100%;object-fit:cover;filter:blur(6px)" onerror="this.parentElement.style.display=\'none\'"/>' +
              '<div id="card-overlay-' + cardId + '" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4)">' +
                '<span style="font-size:11px;color:#fff;font-weight:700;letter-spacing:0.06em">🔒 TAP TO VIEW</span>' +
              '</div>' +
            '</div>'
          : '<div style="height:40px;display:flex;align-items:center;margin-bottom:8px;color:rgba(255,255,255,0.4);font-size:12px">No photo uploaded</div>'
        ) +
      '</div>' +
      '<div>' +
        '<div class="card-name">' + escapeHtml(card.card_name || '—') + '</div>' +
        '<div class="card-num">' + escapeHtml(card.card_number_preview || '') + '</div>' +
        '<div class="card-status"><div class="dot-green"></div>' + escapeHtml(card.org_name || '—') + ' · ' + escapeHtml(card.expiry_date || 'No expiry') + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function updateStats() {
  const el = document.getElementById('card-count-stat');
  if (el) el.textContent = allCards.length;
}

// ===== ADD CARD MODAL =====
function showAddCardModal() {
  document.getElementById('add-card-modal').classList.add('open');
}

function closeAddCardModal() {
  document.getElementById('add-card-modal').classList.remove('open');
  document.getElementById('add-card-form').reset();
  document.getElementById('card-image-preview').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const imgInput = document.getElementById('card-image-input');
  if (imgInput) {
    imgInput.addEventListener('change', () => {
      const file = imgInput.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      document.getElementById('card-image-preview').innerHTML =
        '<img src="' + url + '" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-top:8px"/>';
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
    const card_type = form.querySelector('[name="card_type"]').value;
    const card_name = form.querySelector('[name="card_name"]').value;
    const card_number = form.querySelector('[name="card_number"]').value;
    const org_name = form.querySelector('[name="org_name"]').value;
    const expiry_date = form.querySelector('[name="expiry_date"]').value;
    const card_password = form.querySelector('[name="card_password"]').value;

    if (!card_password) throw new Error('Please set a password for this card');

    const cardData = { name: card_name, id_number: card_number, org: org_name, expiry: expiry_date };
    const encrypted_data = CryptoJS.AES.encrypt(JSON.stringify(cardData), CryptoJS.SHA256(card_password).toString()).toString();

    const formData = new FormData();
    formData.append('card_type', card_type);
    formData.append('card_name', card_name);
    formData.append('card_number_preview', card_number ? card_number.slice(0,4) + '****' : '');
    formData.append('org_name', org_name);
    formData.append('expiry_date', expiry_date);
    formData.append('encrypted_data', encrypted_data);
    formData.append('qr_data', '');

    const imgInput = document.getElementById('card-image-input');
    if (imgInput.files[0]) formData.append('card_image', imgInput.files[0]);

    await api.addCard(formData);
    toast('Card added! Use your card password to view it.');
    closeAddCardModal();
    loadCards();
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  } finally {
    btn.innerHTML = 'Save Card';
    btn.disabled = false;
  }
}

// ===== DELETE CARD (fixed: uses _id) =====
async function deleteCard(id) {
  if (!confirm('Delete this card? This cannot be undone.')) return;
  try {
    await api.deleteCard(id);
    toast('Card deleted');
    loadCards();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
}

// ===== VIEW CARD WITH PASSWORD =====
function promptViewCard(cardId) {
  const card = allCards.find(c => (c._id || c.id) == cardId);
  if (!card || !card.card_image_path) return;
  document.getElementById('view-card-id').value = cardId;
  document.getElementById('view-card-password').value = '';
  document.getElementById('view-card-error').textContent = '';
  document.getElementById('view-card-modal').classList.add('open');
  setTimeout(() => document.getElementById('view-card-password').focus(), 100);
}

function closeViewCardModal() {
  document.getElementById('view-card-modal').classList.remove('open');
}

function handleViewCard(e) {
  e.preventDefault();
  const cardId = document.getElementById('view-card-id').value;
  const password = document.getElementById('view-card-password').value;
  const card = allCards.find(c => (c._id || c.id) == cardId);
  if (!card) return;

  try {
    const key = CryptoJS.SHA256(password).toString();
    const bytes = CryptoJS.AES.decrypt(card.encrypted_data, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error('Wrong password');
    JSON.parse(decrypted); // validate it's proper JSON

    const img = document.getElementById('card-img-' + cardId);
    const overlay = document.getElementById('card-overlay-' + cardId);
    if (img) img.style.filter = 'none';
    if (overlay) overlay.style.display = 'none';

    closeViewCardModal();
    toast('Card unlocked for 30 seconds');

    // Re-blur after 30s
    setTimeout(() => {
      if (img) img.style.filter = 'blur(6px)';
      if (overlay) overlay.style.display = 'flex';
    }, 30000);

  } catch (err) {
    document.getElementById('view-card-error').textContent = 'Incorrect password. Try again.';
  }
}

// ===== DOCUMENTS =====
async function loadDocuments() {
  try {
    const data = await api.getDocs();
    allDocs = data.documents || [];
    renderDocs();
  } catch (e) { toast('Failed to load documents: ' + e.message, 'error'); }
}

function renderDocs() {
  const list = document.getElementById('docs-list');
  if (!allDocs.length) { list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted2)">No documents uploaded yet.</div>'; return; }
  list.innerHTML = allDocs.map(doc => renderFileItem(doc, 'doc')).join('');
}

// ===== FILES =====
async function loadFiles() {
  try {
    const data = await api.getFiles();
    allFiles = data.files || [];
    renderFiles();
  } catch (e) { toast('Failed to load files: ' + e.message, 'error'); }
}

function renderFiles() {
  const list = document.getElementById('files-list');
  if (!allFiles.length) { list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted2)">No files uploaded yet.</div>'; return; }
  list.innerHTML = allFiles.map(f => renderFileItem(f, 'file')).join('');
}

function renderFileItem(item, kind) {
  const name = item.doc_name || item.file_name || 'Untitled';
  const mime = item.mime_type || '';
  const size = item.file_size ? formatBytes(item.file_size) : '—';
  const date = new Date(item.created_at).toLocaleDateString();
  const isPDF = mime.includes('pdf');
  const isImg = mime.includes('image');
  const isDoc = mime.includes('word') || mime.includes('doc') || mime.includes('text');
  const iconClass = isPDF ? 'pdf' : isImg ? 'img' : isDoc ? 'doc' : 'other';
  const emoji = isPDF ? '📄' : isImg ? '🖼️' : isDoc ? '📝' : '📁';
  const itemId = item._id || item.id;
  const deleteFunc = kind === 'doc' ? "deleteDoc('" + itemId + "')" : "deleteFile('" + itemId + "')";
  const viewFunc = "viewFile('" + (item.encrypted_data||'') + "', '" + mime + "', '" + escapeHtml(name) + "')";

  return '<div class="file-item">' +
    '<div class="file-icon ' + iconClass + '">' + emoji + '</div>' +
    '<div style="flex:1;min-width:0">' +
      '<div class="file-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(name) + '</div>' +
      '<div class="file-meta">' + size + ' · ' + date + '</div>' +
    '</div>' +
    '<div class="file-actions">' +
      (isImg || isPDF ? '<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="' + viewFunc + '">View</button>' : '') +
      '<button class="btn btn-danger" style="padding:6px 10px;font-size:12px" onclick="' + deleteFunc + '">Delete</button>' +
    '</div>' +
  '</div>';
}

function viewFile(encryptedData, mime, name) {
  try {
    const base64 = crypto_vault.decryptFile(encryptedData);
    const dataUrl = 'data:' + mime + ';base64,' + base64;
    if (mime.includes('image')) {
      const win = window.open('', '_blank');
      win.document.write('<html><body style="margin:0;background:#000"><img src="' + dataUrl + '" style="max-width:100%;display:block;margin:auto"></body></html>');
    } else if (mime.includes('pdf')) {
      const win = window.open('', '_blank');
      win.document.write('<html><body style="margin:0"><embed src="' + dataUrl + '" width="100%" height="100%" type="application/pdf"></body></html>');
    }
  } catch (e) { toast('Cannot decrypt file', 'error'); }
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

async function handleUpload(file, kind) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('File too large (max 5MB)', 'error'); return; }
  try {
    toast('Uploading...');
    const base64 = await fileToBase64(file);
    const encrypted_data = crypto_vault.encryptFile(base64);
    const payload = { encrypted_data, file_size: file.size, mime_type: file.type };
    if (kind === 'doc') {
      payload.doc_name = file.name; payload.doc_type = file.type;
      await api.addDoc(payload); toast('Document uploaded!'); loadDocuments();
    } else {
      payload.file_name = file.name; payload.file_type = file.type;
      await api.addFile(payload); toast('File uploaded!'); loadFiles();
    }
  } catch (e) { toast('Upload failed: ' + e.message, 'error'); }
}

function setupDropzone(zoneId, inputId, kind) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0], kind); });
  input.addEventListener('change', () => { if (input.files[0]) handleUpload(input.files[0], kind); });
}

// ===== ADMIN =====
async function initAdmin() {
  renderAdminSidebar();
  loadAdminStats();
  loadAdminUsers();
  navigateAdmin('overview');
}

function renderAdminSidebar() {
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const el = document.getElementById('admin-initials');
  if (el) el.textContent = initials;
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
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted2);padding:30px">No users found</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u =>
    '<tr>' +
      '<td><strong>' + escapeHtml(u.name) + '</strong></td>' +
      '<td style="color:var(--muted2)">' + escapeHtml(u.email) + '</td>' +
      '<td>' + new Date(u.created_at).toLocaleDateString() + '</td>' +
      '<td style="text-align:center">' + u.stats.cards + '</td>' +
      '<td style="text-align:center">' + u.stats.documents + '</td>' +
      '<td style="color:var(--muted2);font-size:11px">' + (u.last_login ? new Date(u.last_login).toLocaleString() : 'Never') + '</td>' +
    '</tr>'
  ).join('');
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
  if (section === 'users') loadAdminUsers();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    setupDropzone('doc-dropzone', 'doc-file-input', 'doc');
    setupDropzone('file-dropzone', 'file-file-input', 'file');
  }, 500);
});
