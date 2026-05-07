/**
 * Auth.js — Authentication helpers for Moje filamenty
 * Uses Web Crypto API for SHA-256 password hashing.
 * Session stored in sessionStorage.
 */
const Auth = {
  /**
   * Hash a password using SHA-256 via Web Crypto API.
   * @param {string} password
   * @returns {Promise<string>} hex string
   */
  async hashPassword(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Verify a password against a stored SHA-256 hash.
   * @param {string} password
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async verifyPassword(password, hash) {
    const computed = await this.hashPassword(password);
    return computed === hash;
  },

  async loginServer(username, passwordHash) {
    try {
      const res = await fetch('api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, passwordHash })
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.user) return null;
      this.setCurrentUser(data.user);
      return data.user;
    } catch (e) {
      return null;
    }
  },

  async checkServerSession() {
    try {
      const res = await fetch('api.php?action=check');
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.loggedIn) return null;
      this.setCurrentUser(data.user);
      return data.user;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get the current logged-in user from sessionStorage.
   * @returns {object|null}
   */
  getCurrentUser() {
    try {
      const raw = sessionStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Store user object in sessionStorage (without passwordHash).
   * @param {object} user
   */
  setCurrentUser(user) {
    const safe = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    };
    sessionStorage.setItem('currentUser', JSON.stringify(safe));
  },

  /**
   * Log out: clear session and redirect to login.html.
   */
  async logout() {
    if (typeof Storage !== 'undefined' && Storage.isServerMode()) {
      try { await fetch('api.php?action=logout'); } catch (e) { /* ignore */ }
    }
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  },

  /**
   * Require authentication. If not logged in, redirect to login.html.
   * @returns {object|null} user or null
   */
  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  },

  /**
   * Require admin role. If not logged in or not admin, redirect.
   * @returns {object|null} user or null
   */
  requireAdmin() {
    const user = this.requireAuth();
    if (!user) return null;
    if (user.role !== 'admin') {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  }
};
