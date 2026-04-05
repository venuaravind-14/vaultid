/* ===== VaultID AES-256 Encryption Module =====
   Uses CryptoJS.AES with user's password as key.
   Admins CANNOT decrypt content — only the user who knows their password can.
*/

class VaultCrypto {
  constructor() {
    this._key = null;
  }

  setKey(password) {
    // Derive key from password — never store the raw password
    this._key = CryptoJS.SHA256(password).toString();
  }

  get hasKey() { return !!this._key; }

  encrypt(data) {
    if (!this._key) throw new Error('Encryption key not set — user must be logged in');
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(str, this._key).toString();
  }

  decrypt(ciphertext) {
    if (!this._key) throw new Error('Encryption key not set');
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this._key);
      const str = bytes.toString(CryptoJS.enc.Utf8);
      if (!str) throw new Error('Decryption failed — wrong key or corrupted data');
      try { return JSON.parse(str); } catch { return str; }
    } catch (e) {
      console.error('Decryption error:', e);
      return null;
    }
  }

  // Encrypt a file (ArrayBuffer or base64 string)
  encryptFile(base64String) {
    if (!this._key) throw new Error('Encryption key not set');
    return CryptoJS.AES.encrypt(base64String, this._key).toString();
  }

  decryptFile(encrypted) {
    if (!this._key) throw new Error('Encryption key not set');
    const bytes = CryptoJS.AES.decrypt(encrypted, this._key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

const crypto_vault = new VaultCrypto();

// Helper: file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper: file to data URL (for previews)
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
