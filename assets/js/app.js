/**
 * App.js — Core application logic for Moje filamenty
 * Handles overlay, nav injection, toast notifications, quick weigh modal.
 */
const App = (() => {
  let _settings = null;
  let _toastEl = null;
  let _quickWeighCallback = null;
  let _quickWeighFilamentId = null;

  // ── Settings cache ─────────────────────────────────────────────────────────

  async function getSettings() {
    if (_settings) return _settings;
    const defaults = {
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
    if (Storage.isReady()) {
      _settings = await Storage.readJsonFile('settings.json', defaults);
    } else {
      _settings = defaults;
    }
    return _settings;
  }

  async function saveSettings(s) {
    _settings = null;
    await Storage.writeJsonFile('settings.json', s);
  }

  // ── Overlay helpers ────────────────────────────────────────────────────────

  function getOverlay() {
    return document.getElementById('appOverlay');
  }

  function setOverlayContent(html) {
    const overlay = getOverlay();
    if (overlay) overlay.innerHTML = html;
  }

  function showOverlaySpinner(message) {
    setOverlayContent(`
      <div class="setup-box">
        <div class="setup-logo"><img src="assets/img/logo.svg" alt="Moje filamenty"></div>
        <h2 class="fw-bold" style="color: var(--color-primary-dark)">Moje filamenty</h2>
        <div class="spinner-border text-primary mt-3" role="status" aria-hidden="true"></div>
        <p class="mt-2 text-muted">${message || 'Načítání...'}</p>
      </div>
    `);
  }

  function showOverlaySetup(onFolderSelected) {
    setOverlayContent(`
      <div class="setup-box">
        <div class="setup-logo"><img src="assets/img/logo.svg" alt="Moje filamenty"></div>
        <h2 class="fw-bold" style="color:var(--color-primary-dark)">Moje filamenty</h2>
        <p class="text-muted mb-1">Evidence filamentů pro 3D tisk</p>
        <hr>
        <p class="mb-3">Pro ukládání dat vyberte složku ve vašem počítači.<br>
        Data budou uložena jako JSON soubory přímo ve vybrané složce.</p>
        <button id="selectFolderBtn" class="btn btn-primary btn-lg px-4">
          <i class="bi bi-folder2-open me-2"></i>Vybrat datovou složku
        </button>
        <p class="mt-3 text-muted small">Složku stačí vybrat jen jednou – prohlížeč si ji zapamatuje.<br>
        Pro přístup z více počítačů použijte složku v OneDrive, Dropboxu nebo Google Drive.</p>
      </div>
    `);
    document.getElementById('selectFolderBtn').addEventListener('click', async () => {
      try {
        showOverlaySpinner('Výběr složky...');
        await Storage.selectDataFolder();
        showOverlaySpinner('Inicializace dat...');
        await Storage.initializeDataFiles();
        if (onFolderSelected) await onFolderSelected();
      } catch (e) {
        if (e.name === 'AbortError') {
          showOverlaySetup(onFolderSelected);
        } else {
          console.error('Folder selection error:', e);
          showOverlaySetup(onFolderSelected);
        }
      }
    });
  }

  function showOverlayChooseStorage(onSelected) {
    const fsaSupported = Storage.isSupported();
    setOverlayContent(`
      <div class="setup-box">
        <div class="setup-logo"><img src="assets/img/logo.svg" alt="Moje filamenty"></div>
        <h2 class="fw-bold" style="color:var(--color-primary-dark)">Moje filamenty</h2>
        <p class="text-muted mb-1">Evidence filamentů pro 3D tisk</p>
        <hr>
        ${fsaSupported
          ? '<p class="mb-4 fw-medium">Kde chcete ukládat data?</p>'
          : '<p class="mb-3 fw-medium">Kde chcete ukládat data?</p><div class="alert alert-info py-2 px-3 small text-start mb-3"><i class="bi bi-info-circle me-1"></i>Váš prohlížeč nepodporuje ukládání do lokální složky. Použijte Server (PHP) nebo Chrome / Edge.</div>'
        }
        <div class="d-flex flex-column gap-3" style="max-width:340px;margin:0 auto">
          ${fsaSupported ? `
          <button id="chooseLocalBtn" class="btn btn-primary btn-lg text-start px-4">
            <i class="bi bi-folder2-open me-2"></i>Lokální složka
            <div class="small fw-normal opacity-75 mt-1">Data na tomto počítači nebo v OneDrive/Dropboxu.</div>
          </button>` : ''}
          <button id="chooseServerBtn" class="btn ${fsaSupported ? 'btn-outline-primary' : 'btn-primary'} btn-lg text-start px-4">
            <i class="bi bi-hdd-rack me-2"></i>Server (PHP)
            <div class="small fw-normal opacity-75 mt-1">Data uložena na hostingu – přístupná odkudkoli.</div>
          </button>
        </div>
      </div>
    `);

    if (fsaSupported) {
      document.getElementById('chooseLocalBtn').addEventListener('click', async () => {
        try {
          showOverlaySpinner('Výběr složky...');
          await Storage.selectDataFolder();
          showOverlaySpinner('Inicializace dat...');
          await Storage.initializeDataFiles();
          if (onSelected) await onSelected();
        } catch (e) {
          if (e.name !== 'AbortError') console.error('FSA setup error:', e);
          showOverlayChooseStorage(onSelected);
        }
      });
    }

    document.getElementById('chooseServerBtn').addEventListener('click', async () => {
      showOverlaySpinner('Připojování k serveru...');
      try {
        Storage.setServerMode();
        await Storage.serverSetup();
        if (onSelected) await onSelected();
      } catch (e) {
        console.error('Server setup error:', e);
        Storage.clearServerMode();
        showOverlayChooseStorage(onSelected);
        showToast('Chyba: api.php není dostupný nebo server nepodporuje PHP sessions.', 'danger');
      }
    });
  }

  function showOverlayPermission(onGranted) {
    setOverlayContent(`
      <div class="setup-box">
        <div class="setup-logo"><img src="assets/img/logo.svg" alt="Moje filamenty"></div>
        <h2 class="fw-bold" style="color: var(--color-primary-dark)">Moje filamenty</h2>
        <hr>
        <p class="mb-3">Aplikace potřebuje přístup k datové složce.<br>
        Klikněte na tlačítko níže pro povolení přístupu.</p>
        <button id="grantPermBtn" class="btn btn-primary btn-lg px-4">
          <i class="bi bi-shield-lock me-2"></i>Povolit přístup ke složce
        </button>
        <p class="mt-3 text-muted small">Složku si volíte vy – data zůstávají jen na vašem počítači.</p>
      </div>
    `);
    document.getElementById('grantPermBtn').addEventListener('click', async () => {
      showOverlaySpinner('Žádám o přístup...');
      const granted = await Storage.requestStoredPermission();
      if (granted) {
        if (onGranted) await onGranted();
      } else {
        showOverlayPermission(onGranted);
      }
    });
  }

  function showOverlayNoSupport() {
    setOverlayContent(`
      <div class="setup-box">
        <div class="setup-logo"><img src="assets/img/logo.svg" alt="Moje filamenty"></div>
        <h2 class="fw-bold" style="color: var(--color-primary-dark)">Moje filamenty</h2>
        <hr>
        <div class="alert alert-warning text-start" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Nepodporovaný prohlížeč</strong><br>
          Váš prohlížeč nepodporuje File System Access API.<br>
          Pro plnou funkcionalitu použijte <strong>Chrome</strong> nebo <strong>Edge</strong> verze 86+.
        </div>
        <p class="text-muted small mt-2 mb-3">V omezeném režimu můžete exportovat a importovat data ručně pomocí JSON souborů.</p>
        <button id="continueNoSupportBtn" class="btn btn-outline-secondary">
          <i class="bi bi-arrow-right me-1"></i>Pokračovat v omezeném režimu
        </button>
      </div>
    `);
    document.getElementById('continueNoSupportBtn').addEventListener('click', () => {
      hideOverlay();
    });
  }

  function hideOverlay() {
    const overlay = getOverlay();
    if (overlay) {
      overlay.style.transition = 'opacity 0.3s';
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
  }

  // ── Nav injection ──────────────────────────────────────────────────────────

  function renderNav(user) {
    const navEl = document.getElementById('mainNav');
    if (!navEl) return;
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const isActive = (href) => (page === href || (href === 'index.html' && page === '')) ? 'active' : '';

    const adminLinks = user && user.role === 'admin' ? `
      <li class="nav-item">
        <a class="nav-link ${isActive('users.html')}" href="users.html">
          <i class="bi bi-people me-1"></i>Uživatelé
        </a>
      </li>
    ` : '';

    navEl.innerHTML = `
      <div class="container-fluid">
        <a class="navbar-brand d-flex align-items-center gap-2" href="index.html"><img src="assets/img/logo.svg" alt="">Moje filamenty</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent" aria-controls="navContent" aria-expanded="false">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navContent">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <a class="nav-link ${isActive('index.html')}" href="index.html">
                <i class="bi bi-speedometer2 me-1"></i>Dashboard
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${isActive('filaments.html')}" href="filaments.html">
                <i class="bi bi-list-ul me-1"></i>Filamenty
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${isActive('filament-add.html')}" href="filament-add.html">
                <i class="bi bi-plus-circle me-1"></i>Přidat filament
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${isActive('calculator.html')}" href="calculator.html">
                <i class="bi bi-calculator me-1"></i>Kalkulačka
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${isActive('settings.html')}" href="settings.html">
                <i class="bi bi-gear me-1"></i>Nastavení
              </a>
            </li>
            ${adminLinks}
            <li class="nav-item">
              <a class="nav-link ${isActive('backup.html')}" href="backup.html">
                <i class="bi bi-cloud-arrow-down me-1"></i>Záloha
              </a>
            </li>
          </ul>
          <div class="d-flex align-items-center gap-3">
            <span class="text-white-50 small">
              <i class="bi bi-person-circle me-1"></i>${user ? user.name : ''}
            </span>
            <a href="#" class="btn btn-outline-light btn-sm" id="logoutLink">
              <i class="bi bi-box-arrow-right me-1"></i>Odhlásit
            </a>
          </div>
        </div>
      </div>
    `;

    document.getElementById('logoutLink').addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }

  // ── Toast notifications ────────────────────────────────────────────────────

  function ensureToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.id = 'toastContainer';
      container.style.zIndex = '11000';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type) {
    type = type || 'info';
    const container = ensureToastContainer();

    const iconMap = {
      success: 'bi-check-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      danger: 'bi-x-circle-fill',
      info: 'bi-info-circle-fill'
    };
    const colorMap = {
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
      info: 'text-primary'
    };

    const id = 'toast-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'toast align-items-center show border-0 shadow';
    div.setAttribute('role', 'alert');
    div.setAttribute('aria-live', 'assertive');
    div.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${iconMap[type] || 'bi-info-circle-fill'} ${colorMap[type] || 'text-primary'}"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    container.appendChild(div);

    const bsToast = new bootstrap.Toast(div, { delay: 4000 });
    bsToast.show();
    div.addEventListener('hidden.bs.toast', () => div.remove());
  }

  // ── Quick Weigh Modal ──────────────────────────────────────────────────────

  function ensureQuickWeighModal() {
    if (document.getElementById('quickWeighModal')) return;
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="quickWeighModal" tabindex="-1" aria-labelledby="quickWeighModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header" style="background: var(--color-primary-dark)">
              <h5 class="modal-title text-white" id="quickWeighModalLabel">
                <i class="bi bi-speedometer2 me-2"></i>Rychlé zvážení
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Zavřít"></button>
            </div>
            <div class="modal-body">
              <p id="qwFilamentName" class="fw-bold mb-1 fs-5"></p>
              <p class="text-muted small mb-3">
                Materiál: <span id="qwMaterial"></span> &bull;
                Aktuálně evidováno: <span id="qwCurrentWeight" class="fw-medium"></span> g
              </p>
              <div class="mb-3">
                <label for="qwNewWeight" class="form-label fw-medium">Nová celková hmotnost cívky (g)</label>
                <input type="number" class="form-control form-control-lg" id="qwNewWeight" min="0" step="1" placeholder="0">
                <div class="form-text">Zadejte hmotnost cívky i s filamentem dohromady.</div>
              </div>
              <div id="qwPreview" class="preview-box d-none">
                <div class="row text-center">
                  <div class="col-4">
                    <div class="preview-label">Čistá hmotnost</div>
                    <div class="preview-value" id="qwNetW">-</div>
                  </div>
                  <div class="col-4">
                    <div class="preview-label">Zbývá</div>
                    <div class="preview-value" id="qwPct">-</div>
                  </div>
                  <div class="col-4">
                    <div class="preview-label">Odhadované metry</div>
                    <div class="preview-value" id="qwMeters">-</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Zrušit</button>
              <button type="button" class="btn btn-primary" id="qwSaveBtn">
                <i class="bi bi-save me-1"></i>Uložit
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div.firstElementChild);

    // Live preview on input change
    document.getElementById('qwNewWeight').addEventListener('input', async () => {
      await updateQwPreview();
    });

    document.getElementById('qwSaveBtn').addEventListener('click', async () => {
      await saveQuickWeigh();
    });
  }

  async function updateQwPreview() {
    const newWeightVal = parseFloat(document.getElementById('qwNewWeight').value);
    const previewEl = document.getElementById('qwPreview');
    if (isNaN(newWeightVal) || newWeightVal < 0) {
      previewEl.classList.add('d-none');
      return;
    }

    if (!_quickWeighFilamentId) return;
    const filaments = await Storage.readJsonFile('filaments.json', []);
    const filament = filaments.find(f => f.id === _quickWeighFilamentId);
    if (!filament) return;

    const settings = await getSettings();
    const tempFilament = Object.assign({}, filament, { currentTotalWeight: newWeightVal });
    const stats = Calculations.calculateFilamentStats(tempFilament, settings);

    document.getElementById('qwNetW').textContent = formatWeight(stats.netWeight);
    document.getElementById('qwPct').textContent = formatPercent(stats.remainingPercent);
    document.getElementById('qwMeters').textContent = formatLength(stats.lengthMeters);
    previewEl.classList.remove('d-none');
  }

  async function saveQuickWeigh() {
    const newWeightVal = parseFloat(document.getElementById('qwNewWeight').value);
    if (isNaN(newWeightVal) || newWeightVal < 0) {
      showToast('Zadejte platnou hmotnost.', 'warning');
      return;
    }

    try {
      const filaments = await Storage.readJsonFile('filaments.json', []);
      const idx = filaments.findIndex(f => f.id === _quickWeighFilamentId);
      if (idx === -1) {
        showToast('Filament nenalezen.', 'danger');
        return;
      }

      const settings = await getSettings();
      filaments[idx].currentTotalWeight = newWeightVal;
      const stats = Calculations.calculateFilamentStats(filaments[idx], settings);
      filaments[idx].netWeight = stats.netWeight;
      filaments[idx].remainingPercent = stats.remainingPercent;
      filaments[idx].lengthMeters = stats.lengthMeters;
      if (filaments[idx].status !== 'archived') {
        filaments[idx].status = stats.status;
      }
      filaments[idx].dateModified = new Date().toISOString();

      await Storage.writeJsonFile('filaments.json', filaments);

      const user = Auth.getCurrentUser();
      await Storage.addLog(
        user ? user.username : 'unknown',
        'quick_weigh',
        `Rychlé zvážení: ${filaments[idx].name} — nová hmotnost ${newWeightVal} g, zbývá ${stats.remainingPercent} %`
      );

      const modal = bootstrap.Modal.getInstance(document.getElementById('quickWeighModal'));
      if (modal) modal.hide();

      showToast(`${filaments[idx].name}: uložena nová hmotnost ${newWeightVal} g.`, 'success');

      if (_quickWeighCallback) {
        _quickWeighCallback(filaments[idx]);
      }
    } catch (e) {
      console.error('Quick weigh save error:', e);
      showToast('Chyba při ukládání: ' + e.message, 'danger');
    }
  }

  function showQuickWeighModal(filament, onSave) {
    ensureQuickWeighModal();
    _quickWeighFilamentId = filament.id;
    _quickWeighCallback = onSave || null;

    document.getElementById('qwFilamentName').textContent = filament.name;
    document.getElementById('qwMaterial').textContent = filament.material || '';
    document.getElementById('qwCurrentWeight').textContent = filament.currentTotalWeight;
    document.getElementById('qwNewWeight').value = filament.currentTotalWeight;
    document.getElementById('qwPreview').classList.add('d-none');

    const modal = new bootstrap.Modal(document.getElementById('quickWeighModal'));
    modal.show();
    // Trigger preview immediately
    setTimeout(() => updateQwPreview(), 100);
  }

  // ── Formatting helpers ─────────────────────────────────────────────────────

  function formatWeight(g) {
    return Number(g).toLocaleString('cs-CZ') + ' g';
  }

  function formatLength(m) {
    return Number(m).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' m';
  }

  function formatPercent(p) {
    return Number(p).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('cs-CZ');
  }

  // ── Default password check ─────────────────────────────────────────────────

  async function checkDefaultPassword(user) {
    if (!user || user.role !== 'admin') return;
    if (!Storage.isReady()) return;
    try {
      const users = await Storage.readJsonFile('users.json', []);
      const adminUser = users.find(u => u.username === user.username);
      if (!adminUser) return;
      const isDefault = await Auth.verifyPassword('admin123', adminUser.passwordHash);
      if (isDefault) {
        const alertEl = document.getElementById('defaultPasswordAlert');
        if (alertEl) alertEl.classList.remove('d-none');
      }
    } catch (e) {
      console.warn('Default password check failed:', e);
    }
  }

  // ── No-support fallback banner ─────────────────────────────────────────────

  function showNoSupportBanner() {
    const existing = document.getElementById('noSupportBanner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'noSupportBanner';
    banner.className = 'alert alert-warning m-3 mb-0';
    banner.innerHTML = `
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      <strong>Omezený režim:</strong> Váš prohlížeč nepodporuje File System Access API.
      Data nelze ukládat automaticky. Použijte sekci <a href="backup.html">Záloha</a> pro ruční export/import.
      Pro plnou funkcionalitu použijte Chrome nebo Edge.
    `;
    const main = document.querySelector('main') || document.body;
    main.parentNode.insertBefore(banner, main);
  }

  // ── Main init ──────────────────────────────────────────────────────────────

  async function init() {
    showOverlaySpinner('Načítání...');

    // ── Server mode ───────────────────────────────────────────────────────────
    if (Storage.isServerMode()) {
      const user = await Auth.checkServerSession();
      if (!user) {
        window.location.href = 'login.html';
        return;
      }
      await checkDefaultPassword(user);
      renderNav(user);
      try {
        const state = await Storage.readJsonFile('app-state.json', {});
        state.lastOpened = new Date().toISOString();
        await Storage.writeJsonFile('app-state.json', state);
      } catch (e) { /* non-critical */ }
      hideOverlay();
      return;
    }

    if (!Storage.isSupported()) {
      // FSA není k dispozici (Safari, Firefox, Brave iOS) → přesměruj na login
      // kde si uživatel zvolí Server (PHP) režim
      window.location.href = 'login.html';
      return;
    }

    const storageStatus = await Storage.tryRestoreStorage();

    if (storageStatus === 'not-set') {
      await new Promise(resolve => showOverlaySetup(resolve));
    } else if (storageStatus === 'needs-permission') {
      await new Promise(resolve => showOverlayPermission(resolve));
    }
    // 'granted' falls through

    const user = Auth.requireAuth();
    if (!user) return;

    await checkDefaultPassword(user);
    renderNav(user);

    // Update lastOpened
    try {
      const state = await Storage.readJsonFile('app-state.json', {});
      state.lastOpened = new Date().toISOString();
      await Storage.writeJsonFile('app-state.json', state);
    } catch (e) { /* non-critical */ }

    hideOverlay();
  }

  async function initLogin() {
    showOverlaySpinner('Načítání...');

    // ── Server mode ───────────────────────────────────────────────────────────
    if (Storage.isServerMode()) {
      const user = await Auth.checkServerSession();
      if (user) {
        window.location.href = 'index.html';
        return;
      }
      hideOverlay();
      return;
    }

    // Pokud FSA není podporováno (Safari, Firefox, Brave iOS), přejdeme rovnou
    // na výběr úložiště – chooser sám skryje tlačítko lokální složky
    const storageStatus = Storage.isSupported()
      ? await Storage.tryRestoreStorage()
      : 'not-set';

    if (storageStatus === 'not-set') {
      await new Promise(resolve => showOverlayChooseStorage(resolve));
    } else if (storageStatus === 'needs-permission') {
      await new Promise(resolve => showOverlayPermission(resolve));
    }

    // If already logged in, go to dashboard
    const user = Auth.getCurrentUser();
    if (user) {
      window.location.href = 'index.html';
      return;
    }

    hideOverlay();
  }

  return {
    getSettings,
    saveSettings,
    init,
    initLogin,
    showToast,
    showQuickWeighModal,
    formatWeight,
    formatLength,
    formatPercent,
    formatDate
  };
})();
