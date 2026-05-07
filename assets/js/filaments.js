/**
 * Filaments.js — Logic for filament list, add, and edit pages.
 * Detects current page and calls the appropriate init function.
 */

// ── Shared helpers ────────────────────────────────────────────────────────────

function buildColorDot(colorHex, size) {
  size = size || 24;
  return `<span class="color-dot" style="width:${size}px;height:${size}px;background:${colorHex || '#ccc'};border:2px solid #dee2e6;border-radius:50%;display:inline-block;vertical-align:middle;"></span>`;
}

function buildStatusBadge(status) {
  const cls = Calculations.getStatusBadgeClass(status);
  const label = Calculations.getStatusLabel(status);
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── Filaments List ─────────────────────────────────────────────────────────────

async function initFilamentsList() {
  let allFilaments = [];
  let filtered = [];

  const tableBody = document.getElementById('filamentsTableBody');
  const filterMaterial = document.getElementById('filterMaterial');
  const filterStatus = document.getElementById('filterStatus');
  const filterSearch = document.getElementById('filterSearch');
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  const emptyState = document.getElementById('emptyState');
  const tableWrapper = document.getElementById('tableWrapper');
  const filamentCount = document.getElementById('filamentCount');

  async function loadData() {
    allFilaments = await Storage.readJsonFile('filaments.json', []);
    populateMaterialFilter();
    applyFilters();
  }

  function populateMaterialFilter() {
    if (!filterMaterial) return;
    const materials = [...new Set(allFilaments.map(f => f.material))].sort();
    filterMaterial.innerHTML = '<option value="">Všechny materiály</option>';
    materials.forEach(m => {
      filterMaterial.innerHTML += `<option value="${m}">${m}</option>`;
    });
  }

  function applyFilters() {
    const matVal = filterMaterial ? filterMaterial.value : '';
    const statusVal = filterStatus ? filterStatus.value : '';
    const searchVal = filterSearch ? filterSearch.value.toLowerCase().trim() : '';

    filtered = allFilaments.filter(f => {
      if (matVal && f.material !== matVal) return false;
      if (statusVal && f.status !== statusVal) return false;
      if (searchVal) {
        const haystack = [f.name, f.manufacturer, f.material, f.colorName, f.note].join(' ').toLowerCase();
        if (!haystack.includes(searchVal)) return false;
      }
      return true;
    });

    renderTable();
  }

  function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (filamentCount) filamentCount.textContent = `(${filtered.length})`;

    if (filtered.length === 0) {
      if (emptyState) emptyState.classList.remove('d-none');
      if (tableWrapper) tableWrapper.classList.add('d-none');
      return;
    }

    if (emptyState) emptyState.classList.add('d-none');
    if (tableWrapper) tableWrapper.classList.remove('d-none');

    filtered.forEach(f => {
      const barClass = Calculations.getProgressBarClass(f.remainingPercent);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center">${buildColorDot(f.colorHex)}</td>
        <td>
          <div class="fw-medium">${escHtml(f.name)}</div>
          ${f.note ? `<div class="text-muted small">${escHtml(f.note)}</div>` : ''}
        </td>
        <td><span class="badge bg-secondary">${escHtml(f.material)}</span></td>
        <td>${escHtml(f.manufacturer)}</td>
        <td class="text-end">${App.formatWeight(f.netWeight)}</td>
        <td class="text-end">${App.formatLength(f.lengthMeters)}</td>
        <td style="min-width:120px">
          <div class="d-flex align-items-center gap-2">
            <div class="progress flex-grow-1 ${barClass}" style="height:8px;">
              <div class="progress-bar" style="width:${f.remainingPercent}%"></div>
            </div>
            <small class="text-muted text-nowrap">${App.formatPercent(f.remainingPercent)}</small>
          </div>
        </td>
        <td>${buildStatusBadge(f.status)}</td>
        <td class="text-nowrap">
          <a href="filament-edit.html?id=${f.id}" class="btn btn-sm btn-outline-secondary me-1" title="Upravit">
            <i class="bi bi-pencil"></i>
          </a>
          <button class="btn btn-sm btn-outline-primary qw-btn" data-id="${f.id}" title="Rychlé zvážení">
            <i class="bi bi-speedometer2"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Quick weigh buttons
    tableBody.querySelectorAll('.qw-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const fil = allFilaments.find(f => f.id === id);
        if (!fil) return;
        App.showQuickWeighModal(fil, async () => {
          await loadData();
        });
      });
    });
  }

  if (filterMaterial) filterMaterial.addEventListener('change', applyFilters);
  if (filterStatus) filterStatus.addEventListener('change', applyFilters);
  if (filterSearch) filterSearch.addEventListener('input', applyFilters);
  if (resetFilterBtn) resetFilterBtn.addEventListener('click', () => {
    if (filterMaterial) filterMaterial.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterSearch) filterSearch.value = '';
    applyFilters();
  });

  await loadData();
}

// ── Filament Add ──────────────────────────────────────────────────────────────

async function initFilamentAdd() {
  const settings = await App.getSettings();
  populateMaterialDropdown(settings);
  setupColorSync();
  setupLivePreview(settings);
  setupFormSubmit(settings, null);
}

// ── Filament Edit ──────────────────────────────────────────────────────────────

async function initFilamentEdit() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    App.showToast('Chybí ID filamentu.', 'danger');
    setTimeout(() => window.location.href = 'filaments.html', 1500);
    return;
  }

  const filaments = await Storage.readJsonFile('filaments.json', []);
  const filament = filaments.find(f => f.id === id);
  if (!filament) {
    App.showToast('Filament nenalezen.', 'danger');
    setTimeout(() => window.location.href = 'filaments.html', 1500);
    return;
  }

  const settings = await App.getSettings();
  populateMaterialDropdown(settings, filament.material);

  // Pre-fill form
  const fields = ['name', 'manufacturer', 'material', 'colorName', 'colorHex', 'originalWeight', 'currentTotalWeight', 'emptySpoolWeight', 'diameter', 'pricePerSpool', 'note'];
  fields.forEach(field => {
    const el = document.getElementById('field_' + field);
    if (el && filament[field] !== undefined) el.value = filament[field];
  });

  // Update color preview
  const colorPicker = document.getElementById('colorPicker');
  const colorHexInput = document.getElementById('field_colorHex');
  if (colorPicker && filament.colorHex) colorPicker.value = filament.colorHex;

  // Update page title
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = 'Upravit: ' + filament.name;

  setupColorSync();
  setupLivePreview(settings);
  setupFormSubmit(settings, filament);

  // Archive button
  const archiveBtn = document.getElementById('archiveBtn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', async () => {
      if (!confirm(`Opravdu archivovat filament "${filament.name}"?`)) return;
      try {
        const fils = await Storage.readJsonFile('filaments.json', []);
        const idx = fils.findIndex(f => f.id === id);
        if (idx !== -1) {
          fils[idx].status = 'archived';
          fils[idx].dateModified = new Date().toISOString();
          await Storage.writeJsonFile('filaments.json', fils);
          const user = Auth.getCurrentUser();
          await Storage.addLog(user ? user.username : 'unknown', 'archive_filament', `Archivován filament: ${filament.name}`);
          App.showToast('Filament byl archivován.', 'success');
          setTimeout(() => window.location.href = 'filaments.html', 1200);
        }
      } catch (e) {
        App.showToast('Chyba: ' + e.message, 'danger');
      }
    });
  }

  // Delete button
  const deleteBtn = document.getElementById('deleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (deleteBtn && confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      try {
        const fils = await Storage.readJsonFile('filaments.json', []);
        const newFils = fils.filter(f => f.id !== id);
        await Storage.writeJsonFile('filaments.json', newFils);
        const user = Auth.getCurrentUser();
        await Storage.addLog(user ? user.username : 'unknown', 'delete_filament', `Smazán filament: ${filament.name}`);
        App.showToast('Filament byl smazán.', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        if (modal) modal.hide();
        setTimeout(() => window.location.href = 'filaments.html', 1200);
      } catch (e) {
        App.showToast('Chyba: ' + e.message, 'danger');
      }
    });
  }
}

// ── Shared form helpers ───────────────────────────────────────────────────────

function populateMaterialDropdown(settings, selected) {
  const select = document.getElementById('field_material');
  if (!select) return;
  const materials = settings && settings.materials ? Object.keys(settings.materials) : ['PLA', 'ABS', 'PETG', 'TPU'];
  select.innerHTML = '<option value="">Vyberte materiál...</option>';
  materials.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    if (selected && m === selected) opt.selected = true;
    select.appendChild(opt);
  });

  // Density hint
  select.addEventListener('change', () => showDensityHint(settings, select.value));
  if (selected) showDensityHint(settings, selected);
}

function showDensityHint(settings, material) {
  const hint = document.getElementById('densityHint');
  if (!hint) return;
  if (!material || !settings || !settings.materials || !settings.materials[material]) {
    hint.classList.add('d-none');
    return;
  }
  const mat = settings.materials[material];
  hint.textContent = `Hustota: ${mat.density} g/cm³ | Tryska: ${mat.nozzleTemp}°C | Podložka: ${mat.bedTemp}°C`;
  hint.classList.remove('d-none');
}

function setupColorSync() {
  const picker = document.getElementById('colorPicker');
  const hexInput = document.getElementById('field_colorHex');
  if (!picker || !hexInput) return;

  picker.addEventListener('input', () => {
    hexInput.value = picker.value;
    triggerPreviewUpdate();
  });
  hexInput.addEventListener('input', () => {
    const v = hexInput.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) picker.value = v;
    triggerPreviewUpdate();
  });
}

let _previewDebounce = null;
function triggerPreviewUpdate() {
  clearTimeout(_previewDebounce);
  _previewDebounce = setTimeout(doPreviewUpdate, 150);
}

let _previewSettings = null;
function setupLivePreview(settings) {
  _previewSettings = settings;
  ['field_currentTotalWeight', 'field_emptySpoolWeight', 'field_originalWeight', 'field_material', 'field_diameter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', triggerPreviewUpdate);
    if (el) el.addEventListener('change', triggerPreviewUpdate);
  });
  doPreviewUpdate();
}

function doPreviewUpdate() {
  const get = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const currentTotal = parseFloat(get('field_currentTotalWeight'));
  const emptyW = parseFloat(get('field_emptySpoolWeight'));
  const originalW = parseFloat(get('field_originalWeight'));
  const material = get('field_material');
  const diameter = parseFloat(get('field_diameter')) || 1.75;

  const previewBox = document.getElementById('livePreview');
  if (!previewBox) return;

  if (isNaN(currentTotal) || isNaN(emptyW) || isNaN(originalW) || !material) {
    previewBox.classList.add('d-none');
    return;
  }

  const tempFilament = {
    currentTotalWeight: currentTotal,
    emptySpoolWeight: emptyW,
    originalWeight: originalW,
    material: material,
    diameter: diameter,
    status: 'active'
  };

  const stats = Calculations.calculateFilamentStats(tempFilament, _previewSettings);
  const barClass = Calculations.getProgressBarClass(stats.remainingPercent);

  previewBox.classList.remove('d-none');
  const netEl = document.getElementById('previewNet');
  const pctEl = document.getElementById('previewPct');
  const mEl = document.getElementById('previewMeters');
  const statusEl = document.getElementById('previewStatus');
  const barEl = document.getElementById('previewBar');
  const barWrapper = document.getElementById('previewBarWrapper');

  if (netEl) netEl.textContent = App.formatWeight(stats.netWeight);
  if (pctEl) pctEl.textContent = App.formatPercent(stats.remainingPercent);
  if (mEl) mEl.textContent = App.formatLength(stats.lengthMeters);
  if (statusEl) {
    statusEl.textContent = Calculations.getStatusLabel(stats.status);
    statusEl.className = 'badge ' + Calculations.getStatusBadgeClass(stats.status);
  }
  if (barEl) barEl.style.width = stats.remainingPercent + '%';
  if (barWrapper) {
    barWrapper.className = 'progress ' + barClass;
    barWrapper.style.height = '10px';
  }
}

function setupFormSubmit(settings, existingFilament) {
  const form = document.getElementById('filamentForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const get = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };
    const getNum = (id) => parseFloat(document.getElementById(id)?.value || '0');

    // Validate color hex
    const colorHex = get('field_colorHex');
    if (!/^#[0-9a-fA-F]{6}$/.test(colorHex)) {
      App.showToast('Barva musí být ve formátu #rrggbb (např. #ff0000).', 'warning');
      return;
    }

    const originalWeight = getNum('field_originalWeight');
    const currentTotalWeight = getNum('field_currentTotalWeight');
    const emptySpoolWeight = getNum('field_emptySpoolWeight');
    const diameter = getNum('field_diameter');
    const material = get('field_material');

    if (originalWeight <= 0 || emptySpoolWeight < 0 || currentTotalWeight < 0 || diameter <= 0) {
      App.showToast('Zkontrolujte číselné hodnoty.', 'warning');
      return;
    }

    const tempFilament = {
      currentTotalWeight,
      emptySpoolWeight,
      originalWeight,
      material,
      diameter,
      status: existingFilament ? existingFilament.status : 'active'
    };
    const stats = Calculations.calculateFilamentStats(tempFilament, settings);

    const pricePerSpool = parseFloat(document.getElementById('field_pricePerSpool')?.value) || 0;
    const now = new Date().toISOString();
    const filamentData = {
      id: existingFilament ? existingFilament.id : crypto.randomUUID(),
      name: get('field_name'),
      manufacturer: get('field_manufacturer'),
      material,
      colorName: get('field_colorName'),
      colorHex,
      originalWeight,
      currentTotalWeight,
      emptySpoolWeight,
      netWeight: stats.netWeight,
      diameter,
      lengthMeters: stats.lengthMeters,
      remainingPercent: stats.remainingPercent,
      pricePerSpool,
      note: get('field_note'),
      dateAdded: existingFilament ? existingFilament.dateAdded : now,
      dateModified: now,
      status: stats.status
    };

    try {
      const filaments = await Storage.readJsonFile('filaments.json', []);
      if (existingFilament) {
        const idx = filaments.findIndex(f => f.id === existingFilament.id);
        if (idx !== -1) filaments[idx] = filamentData;
        else filaments.push(filamentData);
      } else {
        filaments.push(filamentData);
      }
      await Storage.writeJsonFile('filaments.json', filaments);

      const user = Auth.getCurrentUser();
      const logType = existingFilament ? 'edit_filament' : 'add_filament';
      const logDesc = existingFilament
        ? `Upraven filament: ${filamentData.name} (${filamentData.material})`
        : `Přidán filament: ${filamentData.name} (${filamentData.material})`;
      await Storage.addLog(user ? user.username : 'unknown', logType, logDesc);

      App.showToast(existingFilament ? 'Filament upraven.' : 'Filament přidán.', 'success');
      setTimeout(() => window.location.href = 'filaments.html', 1000);
    } catch (err) {
      App.showToast('Chyba při ukládání: ' + err.message, 'danger');
    }
  });
}

// ── HTML escaping ─────────────────────────────────────────────────────────────

function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
