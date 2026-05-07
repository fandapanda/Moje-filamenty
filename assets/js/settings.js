/**
 * Settings.js — Logic for settings.html
 */

async function initSettings() {
  const settings = await App.getSettings();
  fillForm(settings);
  renderMaterialsTable(settings);
  setupFormSave(settings);
  setupAddMaterial(settings);
}

function fillForm(settings) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };
  set('set_appName', settings.appName);
  set('set_defaultSpoolWeight', settings.defaultSpoolWeight);
  set('set_defaultDiameter', settings.defaultDiameter);
  set('set_lowThreshold', settings.lowFilamentThreshold);
}

function renderMaterialsTable(settings) {
  const tbody = document.getElementById('materialsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const mats = settings.materials || {};
  Object.entries(mats).forEach(([name, mat]) => {
    const tr = document.createElement('tr');
    tr.dataset.material = name;
    tr.innerHTML = `
      <td class="fw-medium">${escHtmlS(name)}</td>
      <td>
        <input type="number" class="form-control form-control-sm mat-density" value="${mat.density}" min="0.1" step="0.01" style="width:90px">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm mat-nozzle" value="${mat.nozzleTemp}" min="0" step="1" style="width:90px">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm mat-bed" value="${mat.bedTemp}" min="0" step="1" style="width:90px">
      </td>
      <td>
        <button class="btn btn-sm btn-outline-danger delete-mat-btn" data-mat="${escHtmlS(name)}" title="Smazat materiál">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Delete buttons
  tbody.querySelectorAll('.delete-mat-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const matName = btn.dataset.mat;
      if (!confirm(`Opravdu smazat materiál "${matName}"?`)) return;
      const currentSettings = await App.getSettings();
      delete currentSettings.materials[matName];
      await App.saveSettings(currentSettings);
      const user = Auth.getCurrentUser();
      await Storage.addLog(user ? user.username : 'unknown', 'delete_material', `Smazán materiál: ${matName}`);
      App.showToast(`Materiál "${matName}" byl smazán.`, 'success');
      renderMaterialsTable(currentSettings);
    });
  });
}

function gatherMaterialsFromTable() {
  const mats = {};
  const rows = document.querySelectorAll('#materialsTableBody tr[data-material]');
  rows.forEach(row => {
    const name = row.dataset.material;
    const density = parseFloat(row.querySelector('.mat-density')?.value || '0');
    const nozzle = parseInt(row.querySelector('.mat-nozzle')?.value || '0');
    const bed = parseInt(row.querySelector('.mat-bed')?.value || '0');
    if (name && density > 0) {
      mats[name] = { density, nozzleTemp: nozzle, bedTemp: bed };
    }
  });
  return mats;
}

function setupFormSave(settings) {
  const form = document.getElementById('settingsForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    const appName = document.getElementById('set_appName')?.value.trim() || 'Moje filamenty';
    const defaultSpoolWeight = parseFloat(document.getElementById('set_defaultSpoolWeight')?.value || '1000');
    const defaultDiameter = parseFloat(document.getElementById('set_defaultDiameter')?.value || '1.75');
    const lowFilamentThreshold = parseFloat(document.getElementById('set_lowThreshold')?.value || '20');

    const newSettings = {
      appName,
      defaultSpoolWeight,
      defaultDiameter,
      lowFilamentThreshold,
      materials: gatherMaterialsFromTable()
    };

    try {
      await App.saveSettings(newSettings);
      const user = Auth.getCurrentUser();
      await Storage.addLog(user ? user.username : 'unknown', 'save_settings', 'Nastavení byla uložena.');
      App.showToast('Nastavení bylo uloženo.', 'success');
    } catch (err) {
      App.showToast('Chyba při ukládání: ' + err.message, 'danger');
    }
  });
}

function setupAddMaterial(settings) {
  const form = document.getElementById('addMaterialForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('newMatName');
    const densityEl = document.getElementById('newMatDensity');
    const nozzleEl = document.getElementById('newMatNozzle');
    const bedEl = document.getElementById('newMatBed');

    const name = nameEl?.value.trim().toUpperCase();
    const density = parseFloat(densityEl?.value || '0');
    const nozzle = parseInt(nozzleEl?.value || '0');
    const bed = parseInt(bedEl?.value || '0');

    if (!name || density <= 0) {
      App.showToast('Vyplňte název a hustotu materiálu.', 'warning');
      return;
    }

    const currentSettings = await App.getSettings();
    if (currentSettings.materials[name]) {
      App.showToast(`Materiál "${name}" již existuje.`, 'warning');
      return;
    }

    currentSettings.materials[name] = { density, nozzleTemp: nozzle, bedTemp: bed };
    await App.saveSettings(currentSettings);

    const user = Auth.getCurrentUser();
    await Storage.addLog(user ? user.username : 'unknown', 'add_material', `Přidán materiál: ${name}`);
    App.showToast(`Materiál "${name}" byl přidán.`, 'success');

    // Reset form
    if (nameEl) nameEl.value = '';
    if (densityEl) densityEl.value = '';
    if (nozzleEl) nozzleEl.value = '';
    if (bedEl) bedEl.value = '';

    renderMaterialsTable(currentSettings);
  });
}

function escHtmlS(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
