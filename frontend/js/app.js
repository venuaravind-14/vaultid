/* ===== VaultID — Complete App Controller ===== */

let currentUser = null;
let currentSection = 'cards';
let allCards = [];
let allDocs  = [];
let allFiles = [];
let activeFilter = 'all';

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Handle Google OAuth callback (token in URL)
  const cb = api.handleGoogleCallback();
  if (cb) {
    currentUser = cb.user;
    crypto_vault.setKey('google-oauth-' + currentUser.email);
    sessionStorage.setItem('vaultid_key', crypto_vault._key);
    showApp();
    return;
  }

  const token     = localStorage.getItem('vaultid_token');
  const storedUser = localStorage.getItem('vaultid_user');
  const storedKey = sessionStorage.getItem('vaultid_key');

  if (token && storedUser && storedKey) {
    currentUser        = JSON.parse(storedUser);
    api.token          = token;
    crypto_vault._key  = storedKey;
    showApp();
  } else {
    showPage('auth-page');
  }

  // Wire up dropzones
  setupDropzone('doc-dropzone',  'doc-file-input',  'doc');
  setupDropzone('file-dropzone', 'file-file-input', 'file');

  // Card image preview
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

/* ─────────────────────────────────────────────
   PAGE NAVIGATION
───────────────────────────────────────────── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
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

function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.section === section));
  document.querySelectorAll('.section-view').forEach(v => v.style.display = 'none');
  const view = document.getElementById('view-' + section);
  if (view) view.style.display = 'block';
  if (section === 'cards')     loadCards();
  if (section === 'documents') loadDocuments();
  if (section === 'files')     loadFiles();
}

/* ─────────────────────────────────────────────
   TOAST
───────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const c  = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className   = 'toast ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ─────────────────────────────────────────────
   AUTH
───────────────────────────────────────────── */
function setAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('login-form').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<span class="loader"></span>'; btn.disabled = true;
  try {
    const data  = await api.login(email, password);
    api.token   = data.token;
    currentUser = data.user;
    localStorage.setItem('vaultid_user', JSON.stringify(currentUser));
    sessionStorage.setItem('vaultid_key', password);
    crypto_vault.setKey(password);
    toast('Welcome back, ' + currentUser.name + '!');
    showApp();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.innerHTML = 'Sign In'; btn.disabled = false; }
}

async function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('register-btn');
  btn.innerHTML = '<span class="loader"></span>'; btn.disabled = true;
  try {
    const data  = await api.register(name, email, password);
    api.token   = data.token;
    currentUser = data.user;
    localStorage.setItem('vaultid_user', JSON.stringify(currentUser));
    sessionStorage.setItem('vaultid_key', password);
    crypto_vault.setKey(password);
    toast('Account created! Welcome, ' + name);
    showApp();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.innerHTML = 'Create Account'; btn.disabled = false; }
}

function googleLogin() {
  document.getElementById('google-loading').classList.add('show');
  setTimeout(() => api.loginWithGoogle(), 200);
}

function logout() {
  localStorage.removeItem('vaultid_token');
  localStorage.removeItem('vaultid_user');
  sessionStorage.removeItem('vaultid_key');
  api.token = null; currentUser = null;
  allCards = []; allDocs = []; allFiles = [];
  showPage('auth-page');
  toast('Signed out');
}

/* ─────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────── */
function renderSidebar() {
  const initials = currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('sidebar-initials').textContent = initials;
  document.getElementById('sidebar-name').textContent     = currentUser.name;
  document.getElementById('sidebar-email').textContent    = currentUser.email;
}

/* ─────────────────────────────────────────────
   ID CARDS
───────────────────────────────────────────── */
async function loadCards() {
  try {
    const data = await api.getCards();
    allCards   = data.cards || [];
    renderCards(allCards);
    const el = document.getElementById('card-count-stat');
    if (el) el.textContent = allCards.length;
  } catch (err) { toast('Failed to load cards: ' + err.message, 'error'); }
}

function filterCards(type) {
  activeFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === type));
  renderCards(type === 'all' ? allCards : allCards.filter(c => c.card_type === type));
}

function renderCards(cards) {
  const grid = document.getElementById('cards-grid');
  if (!cards.length) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted2)">' +
      '<div style="font-size:48px;margin-bottom:16px">🪪</div>' +
      '<div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px">No ID Cards Yet</div>' +
      '<div>Click "Upload Card" to add your first card</div></div>';
    return;
  }

  grid.innerHTML = cards.map(card => {
    const cid = String(card._id || card.id);
    const typeClass = ({
      student:'card-student', bus:'card-bus', library:'card-library',
      employee:'card-employee', custom:'card-custom', uploaded:'card-uploaded'
    })[card.card_type] || 'card-uploaded';

    const imgBlock = card.card_image_path
      ? '<div style="position:relative;cursor:pointer;height:70px;border-radius:8px;' +
        'overflow:hidden;margin-bottom:10px" data-cid="' + cid + '" onclick="promptViewCard(this.dataset.cid)">' +
        '<img id="cimg-' + cid + '" src="' + API_BASE.replace('/api','') + card.card_image_path + '"' +
        ' style="width:100%;height:100%;object-fit:cover;filter:blur(6px)"' +
        ' onerror="this.parentElement.style.display=\'none\'"/>' +
        '<div id="covr-' + cid + '" style="position:absolute;inset:0;display:flex;align-items:center;' +
        'justify-content:center;background:rgba(0,0,0,0.45)">' +
        '<span style="font-size:11px;color:#fff;font-weight:700;letter-spacing:.06em">🔒 TAP TO VIEW</span></div></div>'
      : '<div style="height:36px;display:flex;align-items:center;margin-bottom:8px;' +
        'color:rgba(255,255,255,0.35);font-size:12px">No photo uploaded</div>';

    return '<div class="id-card-widget ' + typeClass + '">' +
      '<div><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
      '<span class="card-badge">' + esc(card.card_type||'card').toUpperCase() + '</span>' +
      '<button data-cid="' + cid + '" onclick="deleteCard(this.dataset.cid)" title="Delete"' +
      ' style="background:rgba(240,92,92,.25);border:none;cursor:pointer;width:28px;height:28px;' +
      'border-radius:7px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.9)">' +
      '<svg viewBox="0 0 16 16" fill="none" style="width:13px;height:13px">' +
      '<path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"' +
      ' stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      imgBlock + '</div>' +
      '<div><div class="card-name">' + esc(card.card_name||'—') + '</div>' +
      '<div class="card-num">'  + esc(card.card_number_preview||'') + '</div>' +
      '<div class="card-status"><div class="dot-green"></div>' +
      esc(card.org_name||'—') + ' · ' + esc(card.expiry_date||'No expiry') + '</div></div></div>';
  }).join('');
}

/* Add card */
function showAddCardModal()  { document.getElementById('add-card-modal').classList.add('open'); }
function closeAddCardModal() {
  document.getElementById('add-card-modal').classList.remove('open');
  document.getElementById('add-card-form').reset();
  document.getElementById('card-image-preview').innerHTML = '';
}

async function handleAddCard(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = document.getElementById('save-card-btn');
  btn.innerHTML = '<span class="loader"></span>'; btn.disabled = true;
  try {
    const card_type     = form.querySelector('[name="card_type"]').value;
    const card_name     = form.querySelector('[name="card_name"]').value;
    const card_number   = form.querySelector('[name="card_number"]').value;
    const org_name      = form.querySelector('[name="org_name"]').value;
    const expiry_date   = form.querySelector('[name="expiry_date"]').value;
    const card_password = form.querySelector('[name="card_password"]').value;

    if (!card_type)     throw new Error('Please select a card type');
    if (!card_password) throw new Error('Please set a password for this card');

    const key = CryptoJS.SHA256(card_password).toString();
    const encrypted_data = CryptoJS.AES.encrypt(
      JSON.stringify({ name: card_name, id_number: card_number, org: org_name, expiry: expiry_date }), key
    ).toString();

    const fd = new FormData();
    fd.append('card_type',           card_type);
    fd.append('card_name',           card_name);
    fd.append('card_number_preview', card_number ? card_number.slice(0,4)+'****' : '');
    fd.append('org_name',            org_name);
    fd.append('expiry_date',         expiry_date);
    fd.append('encrypted_data',      encrypted_data);
    fd.append('qr_data',             '');
    const imgEl = document.getElementById('card-image-input');
    if (imgEl.files[0]) fd.append('card_image', imgEl.files[0]);

    await api.addCard(fd);
    toast('Card saved! Use your card password to view it.');
    closeAddCardModal();
    loadCards();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.innerHTML = 'Save Card'; btn.disabled = false; }
}

/* Delete card */
async function deleteCard(id) {
  if (!confirm('Delete this card? This cannot be undone.')) return;
  try { await api.deleteCard(id); toast('Card deleted'); loadCards(); }
  catch (err) { toast('Delete failed: ' + err.message, 'error'); }
}

/* View card with password */
function promptViewCard(cid) {
  const card = allCards.find(c => String(c._id||c.id) === String(cid));
  if (!card) return;
  if (!card.card_image_path) { toast('This card has no photo', 'error'); return; }
  document.getElementById('view-card-id').value         = cid;
  document.getElementById('view-card-password').value   = '';
  document.getElementById('view-card-error').textContent = '';
  document.getElementById('view-card-modal').classList.add('open');
  setTimeout(() => document.getElementById('view-card-password').focus(), 100);
}
function closeViewCardModal() { document.getElementById('view-card-modal').classList.remove('open'); }

function handleViewCard(e) {
  e.preventDefault();
  const cid      = document.getElementById('view-card-id').value;
  const password = document.getElementById('view-card-password').value;
  const errEl    = document.getElementById('view-card-error');
  errEl.textContent = '';
  const card = allCards.find(c => String(c._id||c.id) === String(cid));
  if (!card) { errEl.textContent = 'Card not found.'; return; }

  // Cards with no encrypted_data (legacy) — show directly
  if (!card.encrypted_data) {
    revealCard(cid); closeViewCardModal(); toast('Card visible for 30 s');
    autoReblur(cid, 30000); return;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(card.encrypted_data, CryptoJS.SHA256(password).toString());
    const text  = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) throw new Error('bad');
    JSON.parse(text);
    revealCard(cid); closeViewCardModal(); toast('Card visible for 30 s');
    autoReblur(cid, 30000);
  } catch (_) { errEl.textContent = 'Incorrect password. Try again.'; }
}

function revealCard(cid) {
  const img  = document.getElementById('cimg-' + cid);
  const ovr  = document.getElementById('covr-' + cid);
  if (img) img.style.filter      = 'none';
  if (ovr) ovr.style.display     = 'none';
}
function autoReblur(cid, ms) {
  setTimeout(() => {
    const img = document.getElementById('cimg-' + cid);
    const ovr = document.getElementById('covr-' + cid);
    if (img) img.style.filter  = 'blur(6px)';
    if (ovr) ovr.style.display = 'flex';
  }, ms);
}

/* ─────────────────────────────────────────────
   DOCUMENTS
───────────────────────────────────────────── */
async function loadDocuments() {
  try {
    const data = await api.getDocs();
    allDocs = data.documents || [];
    renderList('docs-list', allDocs, 'doc');
  } catch (err) { toast('Failed to load documents: ' + err.message, 'error'); }
}

/* ─────────────────────────────────────────────
   FILES
───────────────────────────────────────────── */
async function loadFiles() {
  try {
    const data = await api.getFiles();
    allFiles = data.files || [];
    renderList('files-list', allFiles, 'file');
  } catch (err) { toast('Failed to load files: ' + err.message, 'error'); }
}

/* ─────────────────────────────────────────────
   SHARED LIST RENDERER (docs + files)
   Uses data-* attrs — NEVER embeds encrypted data in HTML
───────────────────────────────────────────── */
function renderList(containerId, items, kind) {
  const list = document.getElementById(containerId);
  if (!items.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted2)">Nothing uploaded yet.</div>';
    return;
  }
  list.innerHTML = items.map(item => {
    const name  = item.doc_name || item.file_name || 'Untitled';
    const mime  = item.mime_type || '';
    const size  = item.file_size ? formatBytes(item.file_size) : '—';
    const date  = new Date(item.created_at).toLocaleDateString();
    const iid   = String(item._id || item.id);
    const isPDF = mime.includes('pdf');
    const isImg = mime.includes('image');
    const iconClass = isPDF ? 'pdf' : isImg ? 'img' : mime.includes('doc')||mime.includes('word')||mime.includes('text') ? 'doc' : 'other';
    const emoji = isPDF ? '📄' : isImg ? '🖼️' : iconClass === 'doc' ? '📝' : '📁';
    const canView = isPDF || isImg;

    const viewBtn = canView
      ? '<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px"' +
        ' data-iid="' + iid + '" data-kind="' + kind + '"' +
        ' data-mime="' + esc(mime) + '" data-name="' + esc(name) + '"' +
        ' onclick="promptViewFile(this)">View</button>'
      : '';
    const delBtn =
      '<button class="btn btn-danger" style="padding:6px 10px;font-size:12px"' +
      ' data-iid="' + iid + '" data-kind="' + kind + '"' +
      ' onclick="handleDelete(this)">Delete</button>';

    return '<div class="file-item">' +
      '<div class="file-icon ' + iconClass + '">' + emoji + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="file-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(name) + '</div>' +
        '<div class="file-meta">' + size + ' · ' + date + ' · <span style="color:var(--accent3);font-size:10px;font-weight:700">🔒 Password protected</span></div>' +
      '</div>' +
      '<div class="file-actions">' + viewBtn + delBtn + '</div></div>';
  }).join('');
}

/* ─────────────────────────────────────────────
   UPLOAD FLOW — ask password BEFORE upload
───────────────────────────────────────────── */
function setupDropzone(zoneId, inputId, kind) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;
  zone.addEventListener('click',    ()  => input.click());
  zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', ev => {
    ev.preventDefault(); zone.classList.remove('dragover');
    if (ev.dataTransfer.files[0]) openUploadModal(ev.dataTransfer.files[0], kind);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) openUploadModal(input.files[0], kind);
    input.value = ''; // reset so same file can be re-selected
  });
}

function openUploadModal(file, kind) {
  if (file.size > 5 * 1024 * 1024) { toast('File too large (max 5MB)', 'error'); return; }
  window._uploadPending = file;
  document.getElementById('upload-file-kind').value         = kind;
  document.getElementById('upload-file-name-lbl').textContent = file.name;
  document.getElementById('upload-file-password').value      = '';
  document.getElementById('upload-file-error').textContent   = '';
  document.getElementById('upload-file-modal').classList.add('open');
  setTimeout(() => document.getElementById('upload-file-password').focus(), 100);
}

function closeUploadFileModal() {
  document.getElementById('upload-file-modal').classList.remove('open');
  window._uploadPending = null;
}

async function handleUploadConfirm(e) {
  e.preventDefault();
  const file     = window._uploadPending;
  const kind     = document.getElementById('upload-file-kind').value;
  const password = document.getElementById('upload-file-password').value;
  const errEl    = document.getElementById('upload-file-error');
  const btn      = document.getElementById('upload-confirm-btn');
  errEl.textContent = '';

  if (!file)     { errEl.textContent = 'No file selected.';     return; }
  if (!password) { errEl.textContent = 'Please enter a password.'; return; }

  btn.innerHTML = '<span class="loader"></span>'; btn.disabled = true;
  try {
    toast('Uploading...');
    const base64 = await fileToBase64(file);
    const key    = CryptoJS.SHA256(password).toString();
    const encrypted_data = CryptoJS.AES.encrypt(base64, key).toString();
    const payload = { encrypted_data, file_size: file.size, mime_type: file.type };

    if (kind === 'doc') {
      payload.doc_name = file.name; payload.doc_type = file.type;
      await api.addDoc(payload);
      toast('Document uploaded! Remember your password to view it.');
      closeUploadFileModal(); loadDocuments();
    } else {
      payload.file_name = file.name; payload.file_type = file.type;
      await api.addFile(payload);
      toast('File uploaded! Remember your password to view it.');
      closeUploadFileModal(); loadFiles();
    }
  } catch (err) { errEl.textContent = 'Upload failed: ' + err.message; }
  finally { btn.innerHTML = 'Upload'; btn.disabled = false; }
}

/* ─────────────────────────────────────────────
   VIEW FILE — ask password, then decrypt & open
───────────────────────────────────────────── */
function promptViewFile(btn) {
  const iid  = btn.dataset.iid;
  const kind = btn.dataset.kind;
  const mime = btn.dataset.mime;
  const name = btn.dataset.name;

  // Verify item exists in our local array
  const item = kind === 'doc'
    ? allDocs.find(d => String(d._id||d.id) === iid)
    : allFiles.find(f => String(f._id||f.id) === iid);
  if (!item) { toast('File not found', 'error'); return; }

  document.getElementById('view-file-id').value         = iid;
  document.getElementById('view-file-kind').value       = kind;
  document.getElementById('view-file-mime').value       = mime;
  document.getElementById('view-file-name-lbl').textContent = name;
  document.getElementById('view-file-password').value   = '';
  document.getElementById('view-file-error').textContent = '';
  document.getElementById('view-file-modal').classList.add('open');
  setTimeout(() => document.getElementById('view-file-password').focus(), 100);
}

function closeViewFileModal() { document.getElementById('view-file-modal').classList.remove('open'); }

function handleViewFile(e) {
  e.preventDefault();
  const iid      = document.getElementById('view-file-id').value;
  const kind     = document.getElementById('view-file-kind').value;
  const mime     = document.getElementById('view-file-mime').value;
  const password = document.getElementById('view-file-password').value;
  const errEl    = document.getElementById('view-file-error');
  errEl.textContent = '';

  const item = kind === 'doc'
    ? allDocs.find(d => String(d._id||d.id) === iid)
    : allFiles.find(f => String(f._id||f.id) === iid);
  if (!item || !item.encrypted_data) { errEl.textContent = 'File data not found.'; return; }

  try {
    const key    = CryptoJS.SHA256(password).toString();
    const bytes  = CryptoJS.AES.decrypt(item.encrypted_data, key);
    const base64 = bytes.toString(CryptoJS.enc.Utf8);
    if (!base64 || base64.length < 20) throw new Error('bad');
    closeViewFileModal();
    openBlob(base64, mime);
  } catch (_) { errEl.textContent = 'Incorrect password. Try again.'; }
}

function openBlob(base64, mime) {
  const url = 'data:' + mime + ';base64,' + base64;
  if (mime.includes('image')) {
    const w = window.open('', '_blank');
    w.document.write('<html><body style="margin:0;background:#000"><img src="' + url + '" style="max-width:100%;display:block;margin:auto"></body></html>');
    w.document.close();
  } else if (mime.includes('pdf')) {
    const w = window.open('', '_blank');
    w.document.write('<html><body style="margin:0;height:100vh"><embed src="' + url + '" width="100%" height="100%" type="application/pdf"></body></html>');
    w.document.close();
  } else {
    toast('File type cannot be previewed', 'error');
  }
}

/* ─────────────────────────────────────────────
   DELETE
───────────────────────────────────────────── */
function handleDelete(btn) {
  const iid  = btn.dataset.iid;
  const kind = btn.dataset.kind;
  if (kind === 'doc') deleteDoc(iid);
  else deleteFile(iid);
}

async function deleteDoc(id) {
  if (!confirm('Delete this document?')) return;
  try { await api.deleteDoc(id); toast('Document deleted'); loadDocuments(); }
  catch (err) { toast(err.message, 'error'); }
}

async function deleteFile(id) {
  if (!confirm('Delete this file?')) return;
  try { await api.deleteFile(id); toast('File deleted'); loadFiles(); }
  catch (err) { toast(err.message, 'error'); }
}

/* ─────────────────────────────────────────────
   ADMIN
───────────────────────────────────────────── */
function navigateAdmin(section) {
  document.querySelectorAll('.admin-nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.section === section));
  document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
  const view = document.getElementById('admin-view-' + section);
  if (view) view.style.display = 'block';
  if (section === 'users') loadAdminUsers();
}

async function initAdmin() {
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const el = document.getElementById('admin-initials');
  if (el) el.textContent = initials;
  document.getElementById('admin-name').textContent  = currentUser.name;
  document.getElementById('admin-email').textContent = currentUser.email;
  navigateAdmin('overview');
  loadAdminStats();
  loadAdminUsers();
}

async function loadAdminStats() {
  try {
    const { stats: s } = await api.adminStats();
    document.getElementById('stat-users').textContent = s.total_users;
    document.getElementById('stat-cards').textContent = s.total_cards;
    document.getElementById('stat-docs').textContent  = s.total_documents;
    document.getElementById('stat-scans').textContent = s.scans_today;
  } catch (err) { toast('Stats error', 'error'); }
}

async function loadAdminUsers() {
  try {
    const { users } = await api.adminUsers();
    const tbody = document.getElementById('admin-user-table');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted2);padding:30px">No users found</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u =>
      '<tr>' +
      '<td><strong>' + esc(u.name) + '</strong></td>' +
      '<td style="color:var(--muted2)">' + esc(u.email) + '</td>' +
      '<td>' + new Date(u.created_at).toLocaleDateString() + '</td>' +
      '<td style="text-align:center">' + u.stats.cards + '</td>' +
      '<td style="text-align:center">' + u.stats.documents + '</td>' +
      '<td style="color:var(--muted2);font-size:11px">' +
        (u.last_login ? new Date(u.last_login).toLocaleString() : 'Never') + '</td></tr>'
    ).join('');
  } catch (err) { toast('Failed to load users', 'error'); }
}

async function adminSearch() {
  const q = document.getElementById('admin-search').value.trim();
  if (!q) { loadAdminUsers(); return; }
  try {
    const { users } = await api.adminSearch(q);
    const tbody = document.getElementById('admin-user-table');
    tbody.innerHTML = users.length
      ? users.map(u =>
          '<tr><td><strong>' + esc(u.name) + '</strong></td>' +
          '<td style="color:var(--muted2)">' + esc(u.email) + '</td>' +
          '<td>' + new Date(u.created_at).toLocaleDateString() + '</td>' +
          '<td style="text-align:center">—</td><td style="text-align:center">—</td>' +
          '<td style="color:var(--muted2)">—</td></tr>').join('')
      : '<tr><td colspan="6" style="text-align:center;color:var(--muted2);padding:20px">No results</td></tr>';
  } catch (err) { toast('Search failed', 'error'); }
}

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// alias used in renderCards
const escapeHtml = esc;