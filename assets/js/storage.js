/**
 * Storage.js — File System Access API + IndexedDB persistence
 * Handles all data file I/O for Moje filamenty.
 * Exported as global Storage IIFE.
 */
const Storage = (() => {
  const IDB_NAME = 'MojeFilamentyDB';
  const IDB_VERSION = 1;
  const IDB_STORE = 'handles';
  const DIR_KEY = 'dataDirectory';

  let _dirHandle = null;

  // ── IndexedDB helpers ────────────────────────────────────────────────────────

  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function idbPut(key, value) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function idbGet(key) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ── SHA-256 helper (no Auth dependency) ──────────────────────────────────────

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Sample filament calculation helpers ──────────────────────────────────────

  function calcFilamentData(current, spool, original, density, diameter) {
    const net = Math.max(0, current - spool);
    const pct = Math.min(100, Math.round((net / original) * 1000) / 10);
    const radiusCm = (diameter / 10) / 2;
    const areaCm2 = Math.PI * radiusCm * radiusCm;
    const volumeCm3 = net / density;
    const meters = Math.round((volumeCm3 / areaCm2 / 100) * 10) / 10;
    let status;
    if (net === 0) status = 'empty';
    else if (pct <= 20) status = 'low';
    else status = 'active';
    return { net, pct, meters, status };
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  function isSupported() {
    return 'showDirectoryPicker' in window;
  }

  async function selectDataFolder() {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await idbPut(DIR_KEY, handle);
    _dirHandle = handle;
    return handle;
  }

  async function tryRestoreFolder() {
    try {
      const stored = await idbGet(DIR_KEY);
      if (!stored) return 'not-set';
      const perm = await stored.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        _dirHandle = stored;
        return 'granted';
      }
      return 'needs-permission';
    } catch (e) {
      console.warn('tryRestoreFolder error:', e);
      return 'not-set';
    }
  }

  async function requestStoredPermission() {
    try {
      const stored = await idbGet(DIR_KEY);
      if (!stored) return false;
      const perm = await stored.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        _dirHandle = stored;
        return true;
      }
      return false;
    } catch (e) {
      console.warn('requestStoredPermission error:', e);
      return false;
    }
  }

  function isReady() {
    return _dirHandle !== null;
  }

  async function readJsonFile(fileName, defaultData) {
    if (!_dirHandle) return defaultData;
    try {
      const fileHandle = await _dirHandle.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (e) {
      return defaultData;
    }
  }

  async function writeJsonFile(fileName, data) {
    if (!_dirHandle) throw new Error('Data folder not set');
    const fileHandle = await _dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }

  async function fileExists(fileName) {
    if (!_dirHandle) return false;
    try {
      await _dirHandle.getFileHandle(fileName, { create: false });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function initializeDataFiles() {
    const now = new Date().toISOString();
    const adminHash = await sha256('admin123');

    // ── users.json ───────────────────────────────────────────────────────────
    if (!(await fileExists('users.json'))) {
      const users = [{
        id: crypto.randomUUID(),
        name: 'Administrátor',
        username: 'admin',
        passwordHash: adminHash,
        role: 'admin',
        active: true,
        dateCreated: now,
        dateModified: now
      }];
      await writeJsonFile('users.json', users);
    }

    // ── settings.json ────────────────────────────────────────────────────────
    if (!(await fileExists('settings.json'))) {
      const settings = {
        appName: 'Moje filamenty',
        defaultSpoolWeight: 1000,
        defaultDiameter: 1.75,
        lowFilamentThreshold: 20,
        materials: {
          PLA:  { density: 1.24, nozzleTemp: 200, bedTemp: 60 },
          ABS:  { density: 1.04, nozzleTemp: 240, bedTemp: 100 },
          PETG: { density: 1.27, nozzleTemp: 235, bedTemp: 80 },
          TPU:  { density: 1.20, nozzleTemp: 220, bedTemp: 50 }
        }
      };
      await writeJsonFile('settings.json', settings);
    }

    // ── filaments.json ───────────────────────────────────────────────────────
    if (!(await fileExists('filaments.json'))) {
      // Sample filaments with hardcoded densities
      // PLA=1.24, ABS=1.04, PETG=1.27, TPU=1.20, d=1.75mm
      const d = 1.75;
      const s1 = calcFilamentData(1050, 180, 1000, 1.24, d);
      const s2 = calcFilamentData(750, 180, 1000, 1.24, d);
      const s3 = calcFilamentData(920, 200, 1000, 1.27, d);
      const s4 = calcFilamentData(350, 220, 1000, 1.04, d);
      const s5 = calcFilamentData(95, 150, 500, 1.20, d);

      const filaments = [
        {
          id: crypto.randomUUID(),
          name: 'PLA Černá',
          manufacturer: 'Prusament',
          material: 'PLA',
          colorName: 'Černá',
          colorHex: '#1a1a1a',
          originalWeight: 1000,
          currentTotalWeight: 1050,
          emptySpoolWeight: 180,
          netWeight: s1.net,
          diameter: d,
          lengthMeters: s1.meters,
          remainingPercent: s1.pct,
          note: 'Základní černá PLA pro každodenní tisk.',
          dateAdded: now,
          dateModified: now,
          status: s1.status
        },
        {
          id: crypto.randomUUID(),
          name: 'PLA Bílá',
          manufacturer: 'Fillamentum',
          material: 'PLA',
          colorName: 'Bílá',
          colorHex: '#f5f5f5',
          originalWeight: 1000,
          currentTotalWeight: 750,
          emptySpoolWeight: 180,
          netWeight: s2.net,
          diameter: d,
          lengthMeters: s2.meters,
          remainingPercent: s2.pct,
          note: '',
          dateAdded: now,
          dateModified: now,
          status: s2.status
        },
        {
          id: crypto.randomUUID(),
          name: 'PETG Transparentní',
          manufacturer: 'Prusament',
          material: 'PETG',
          colorName: 'Transparentní',
          colorHex: '#c8e6f5',
          originalWeight: 1000,
          currentTotalWeight: 920,
          emptySpoolWeight: 200,
          netWeight: s3.net,
          diameter: d,
          lengthMeters: s3.meters,
          remainingPercent: s3.pct,
          note: '',
          dateAdded: now,
          dateModified: now,
          status: s3.status
        },
        {
          id: crypto.randomUUID(),
          name: 'ABS Červená',
          manufacturer: 'eSUN',
          material: 'ABS',
          colorName: 'Červená',
          colorHex: '#cc2200',
          originalWeight: 1000,
          currentTotalWeight: 350,
          emptySpoolWeight: 220,
          netWeight: s4.net,
          diameter: d,
          lengthMeters: s4.meters,
          remainingPercent: s4.pct,
          note: 'Pozor – dochází!',
          dateAdded: now,
          dateModified: now,
          status: s4.status
        },
        {
          id: crypto.randomUUID(),
          name: 'TPU Modrá',
          manufacturer: 'Polymaker',
          material: 'TPU',
          colorName: 'Modrá',
          colorHex: '#2255cc',
          originalWeight: 500,
          currentTotalWeight: 95,
          emptySpoolWeight: 150,
          netWeight: s5.net,
          diameter: d,
          lengthMeters: s5.meters,
          remainingPercent: s5.pct,
          note: '',
          dateAdded: now,
          dateModified: now,
          status: s5.status
        }
      ];
      await writeJsonFile('filaments.json', filaments);
    }

    // ── calculations.json ────────────────────────────────────────────────────
    if (!(await fileExists('calculations.json'))) {
      await writeJsonFile('calculations.json', []);
    }

    // ── logs.json ────────────────────────────────────────────────────────────
    if (!(await fileExists('logs.json'))) {
      const logs = [{
        date: now,
        user: 'system',
        type: 'init',
        description: 'Aplikace byla inicializována s ukázkovými daty.'
      }];
      await writeJsonFile('logs.json', logs);
    }

    // ── app-state.json — always write ───────────────────────────────────────
    await writeJsonFile('app-state.json', {
      lastOpened: now,
      appVersion: '1.0.0',
      firstSetupDone: true
    });
  }

  async function addLog(user, type, description) {
    const logs = await readJsonFile('logs.json', []);
    logs.unshift({
      date: new Date().toISOString(),
      user: user || 'system',
      type: type || 'info',
      description: description || ''
    });
    // Keep max 500 entries
    if (logs.length > 500) logs.splice(500);
    await writeJsonFile('logs.json', logs);
  }

  async function backupAllData() {
    const backup = {};
    const files = ['filaments.json', 'settings.json', 'users.json', 'app-state.json', 'logs.json', 'calculations.json'];
    for (const f of files) {
      backup[f] = await readJsonFile(f, null);
    }
    return backup;
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function importFromFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { resolve(null); return; }
        try {
          const text = await file.text();
          resolve(JSON.parse(text));
        } catch (err) {
          resolve(null);
        }
      };
      input.click();
    });
  }

  async function restoreFromBackup(backup) {
    const allowedFiles = ['filaments.json', 'settings.json', 'users.json', 'app-state.json', 'logs.json', 'calculations.json'];
    for (const key of allowedFiles) {
      if (backup[key] !== undefined && backup[key] !== null) {
        await writeJsonFile(key, backup[key]);
      }
    }
  }

  async function getDirName() {
    if (!_dirHandle) return null;
    return _dirHandle.name;
  }

  return {
    isSupported,
    selectDataFolder,
    tryRestoreFolder,
    requestStoredPermission,
    isReady,
    readJsonFile,
    writeJsonFile,
    fileExists,
    initializeDataFiles,
    addLog,
    backupAllData,
    downloadJson,
    importFromFile,
    restoreFromBackup,
    getDirName
  };
})();
