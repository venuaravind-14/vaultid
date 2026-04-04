/* ===== VaultID Crypto Service ===== */

class CryptoVault {
  constructor() {
    this._key = null;
  }

  setKey(key) {
    this._key = key;
  }

  get key() {
    return this._key;
  }

  // Encrypt data using AES
  encrypt(data) {
    if (!this._key) throw new Error('Encryption key not set');
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), this._key).toString();
      return encrypted;
    } catch (e) {
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data using AES
  decrypt(encryptedData) {
    if (!this._key) throw new Error('Decryption key not set');
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this._key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch (e) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
  }

  // Generate a random key
  generateKey(length = 32) {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  // Hash a password (for additional security)
  hashPassword(password) {
    return CryptoJS.SHA256(password).toString();
  }
}

export const crypto_vault = new CryptoVault();