/* ===== VaultID API Client ===== */
const API_BASE = 'http://localhost:3001/api';

class VaultAPI {
  constructor() {
    this._token = localStorage.getItem('vaultid_token');
  }

  get token() { return this._token; }
  set token(t) { this._token = t; if (t) localStorage.setItem('vaultid_token', t); else localStorage.removeItem('vaultid_token'); }

  headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra
    };
  }

  async request(method, path, body, isFormData = false) {
    const opts = { method, headers: isFormData ? { Authorization: `Bearer ${this.token}` } : this.headers() };
    if (body && !isFormData) opts.body = JSON.stringify(body);
    if (body && isFormData) opts.body = body;

    try {
      const res = await fetch(API_BASE + path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (e) {
      if (e.message.includes('Failed to fetch')) throw new Error('Cannot connect to server. Make sure the backend is running on port 3001.');
      throw e;
    }
  }

  // Auth
  register(name, email, password) { return this.request('POST', '/auth/register', { name, email, password }); }
  login(email, password) { return this.request('POST', '/auth/login', { email, password }); }
  me() { return this.request('GET', '/auth/me'); }

  // Cards
  getCards() { return this.request('GET', '/cards'); }
  addCard(formData) { return this.request('POST', '/cards', formData, true); }
  deleteCard(id) { return this.request('DELETE', `/cards/${id}`); }

  // Documents
  getDocs() { return this.request('GET', '/documents'); }
  addDoc(data) { return this.request('POST', '/documents', data); }
  deleteDoc(id) { return this.request('DELETE', `/documents/${id}`); }

  // Files
  getFiles() { return this.request('GET', '/files'); }
  addFile(data) { return this.request('POST', '/files', data); }
  deleteFile(id) { return this.request('DELETE', `/files/${id}`); }

  // Admin
  adminUsers() { return this.request('GET', '/admin/users'); }
  adminStats() { return this.request('GET', '/admin/stats'); }
  adminSearch(q) { return this.request('GET', `/admin/search?q=${encodeURIComponent(q)}`); }
  adminScanLogs() { return this.request('GET', '/admin/scan-logs'); }
  logScan(card_id, scan_result, location) { return this.request('POST', '/admin/scan-log', { card_id, scan_result, location }); }
}

const api = new VaultAPI();
