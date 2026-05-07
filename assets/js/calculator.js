/**
 * calculator.js — Print cost calculator logic.
 */

const PRINTERS = [
  { name: 'Bambu Lab X1C',            powerKw: 0.35 },
  { name: 'Bambu Lab P1S',            powerKw: 0.32 },
  { name: 'Bambu Lab P1P',            powerKw: 0.28 },
  { name: 'Bambu Lab A1',             powerKw: 0.25 },
  { name: 'Bambu Lab A1 mini',        powerKw: 0.20 },
  { name: 'Prusa MK4',               powerKw: 0.15 },
  { name: 'Prusa MK3S+',             powerKw: 0.12 },
  { name: 'Prusa XL',               powerKw: 0.25 },
  { name: 'Creality Ender 3 V2',      powerKw: 0.07 },
  { name: 'Creality Ender 3 S1 Pro',  powerKw: 0.08 },
  { name: 'Creality K1C',             powerKw: 0.35 },
  { name: 'Creality CR-10 V3',        powerKw: 0.28 },
  { name: 'Voron 2.4',               powerKw: 0.40 },
  { name: 'Anycubic Kobra 2 Pro',     powerKw: 0.20 },
  { name: 'FlashForge Creator Pro',   powerKw: 0.18 },
  { name: 'Vlastní...',              powerKw: null  }
];

async function initCalculator() {
  let _filaments = [];
  let _calcResult = null;

  const filamentSelect   = document.getElementById('calc_filament');
  const gramsInput       = document.getElementById('calc_grams');
  const printerSelect    = document.getElementById('calc_printer');
  const customPowerRow   = document.getElementById('customPowerRow');
  const customPowerInput = document.getElementById('calc_customPower');
  const hoursInput       = document.getElementById('calc_hours');
  const minutesInput     = document.getElementById('calc_minutes');
  const kwhInput         = document.getElementById('calc_kwh');
  const calcBtn          = document.getElementById('calcBtn');
  const saveBtn          = document.getElementById('saveCalcBtn');
  const resultsCard      = document.getElementById('resultsCard');
  const productNameInput = document.getElementById('calc_productName');

  // ── Load filaments ──────────────────────────────────────────────────────────
  _filaments = await Storage.readJsonFile('filaments.json', []);
  const activeFilaments = _filaments.filter(f => f.status !== 'archived');

  filamentSelect.innerHTML = '<option value="">— Vyberte filament —</option>';
  activeFilaments.forEach(f => {
    const priceInfo = f.pricePerSpool > 0 ? ` · ${f.pricePerSpool} Kč` : ' · cena nezadána';
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.name} (${f.material}${priceInfo})`;
    opt.dataset.price = f.pricePerSpool || 0;
    opt.dataset.original = f.originalWeight || 1000;
    filamentSelect.appendChild(opt);
  });

  // ── Populate printers ───────────────────────────────────────────────────────
  printerSelect.innerHTML = '';
  PRINTERS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.powerKw !== null ? p.powerKw : 'custom';
    opt.textContent = p.powerKw !== null
      ? `${p.name} (~${Math.round(p.powerKw * 1000)} W průměrně)`
      : p.name;
    printerSelect.appendChild(opt);
  });

  // ── Printer change: show/hide custom power input ────────────────────────────
  printerSelect.addEventListener('change', () => {
    if (printerSelect.value === 'custom') {
      customPowerRow.classList.remove('d-none');
      customPowerInput.required = true;
    } else {
      customPowerRow.classList.add('d-none');
      customPowerInput.required = false;
    }
    autoCalculate();
  });

  // ── Filament warning if no price ────────────────────────────────────────────
  filamentSelect.addEventListener('change', () => {
    const opt = filamentSelect.options[filamentSelect.selectedIndex];
    const price = parseFloat(opt?.dataset?.price || '0');
    const warnEl = document.getElementById('noPriceWarning');
    if (filamentSelect.value && price === 0) {
      warnEl.classList.remove('d-none');
    } else {
      warnEl.classList.add('d-none');
    }
    autoCalculate();
  });

  // ── Auto-recalculate on any input change ────────────────────────────────────
  [gramsInput, hoursInput, minutesInput, kwhInput, customPowerInput].forEach(el => {
    if (el) el.addEventListener('input', autoCalculate);
  });

  function getPrinterPowerKw() {
    if (printerSelect.value === 'custom') {
      return parseFloat(customPowerInput?.value) / 1000 || 0;
    }
    return parseFloat(printerSelect.value) || 0;
  }

  function getPrinterName() {
    const opt = printerSelect.options[printerSelect.selectedIndex];
    return opt ? opt.textContent.split(' (~')[0] : '';
  }

  function compute() {
    const opt = filamentSelect.options[filamentSelect.selectedIndex];
    const gramsUsed      = parseFloat(gramsInput?.value) || 0;
    const pricePerSpool  = parseFloat(opt?.dataset?.price || '0');
    const originalWeight = parseFloat(opt?.dataset?.original || '1000');
    const printerPowerKw = getPrinterPowerKw();
    const printHours     = (parseFloat(hoursInput?.value) || 0) + (parseFloat(minutesInput?.value) || 0) / 60;
    const kwhPrice       = parseFloat(kwhInput?.value) || 0;

    const pricePerGram  = originalWeight > 0 ? pricePerSpool / originalWeight : 0;
    const materialCost  = Math.round(pricePerGram * gramsUsed * 100) / 100;
    const electricityCost = Math.round(printerPowerKw * printHours * kwhPrice * 100) / 100;
    const totalCost     = Math.round((materialCost + electricityCost) * 100) / 100;

    return {
      filamentId:      filamentSelect.value || null,
      filamentName:    filamentSelect.value ? (opt?.textContent.split(' (')[0] || '') : '',
      gramsUsed,
      pricePerSpool,
      originalWeight,
      pricePerGram,
      materialCost,
      printer:         getPrinterName(),
      printerPowerKw,
      printHoursTotal: printHours,
      kwhPrice,
      electricityCost,
      totalCost
    };
  }

  function renderResults(r) {
    const fmt = (n) => Number(n).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtH = (h) => {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return mm > 0 ? `${hh} h ${mm} min` : `${hh} h`;
    };

    document.getElementById('res_material').textContent = fmt(r.materialCost) + ' Kč';
    document.getElementById('res_electricity').textContent = fmt(r.electricityCost) + ' Kč';
    document.getElementById('res_total').textContent = fmt(r.totalCost) + ' Kč';

    document.getElementById('res_detail_grams').textContent = r.gramsUsed + ' g';
    document.getElementById('res_detail_priceperg').textContent =
      r.pricePerSpool > 0
        ? fmt(r.pricePerGram) + ' Kč/g'
        : 'cena nezadána';
    document.getElementById('res_detail_printer').textContent = r.printer || '—';
    document.getElementById('res_detail_power').textContent = r.printerPowerKw > 0
      ? Math.round(r.printerPowerKw * 1000) + ' W'
      : '—';
    document.getElementById('res_detail_time').textContent = r.printHoursTotal > 0 ? fmtH(r.printHoursTotal) : '—';
    document.getElementById('res_detail_kwh').textContent = fmt(r.kwhPrice) + ' Kč/kWh';

    resultsCard.classList.remove('d-none');
    saveBtn.disabled = false;
  }

  function autoCalculate() {
    if (!filamentSelect.value || !gramsInput?.value) {
      resultsCard.classList.add('d-none');
      saveBtn.disabled = true;
      _calcResult = null;
      return;
    }
    _calcResult = compute();
    renderResults(_calcResult);
  }

  // ── Manual calculate button ─────────────────────────────────────────────────
  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      if (!filamentSelect.value) {
        App.showToast('Vyberte filament.', 'warning');
        return;
      }
      const g = parseFloat(gramsInput?.value);
      if (!g || g <= 0) {
        App.showToast('Zadejte počet gramů.', 'warning');
        return;
      }
      _calcResult = compute();
      renderResults(_calcResult);
    });
  }

  // ── Save to history ─────────────────────────────────────────────────────────
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!_calcResult) return;
      try {
        const user = Auth.getCurrentUser();
        const history = await Storage.readJsonFile('calculations.json', []);
        const record = {
          id:             crypto.randomUUID(),
          date:           new Date().toISOString(),
          name:           productNameInput?.value.trim() || '',
          filamentId:     _calcResult.filamentId,
          filamentName:   _calcResult.filamentName,
          gramsUsed:      _calcResult.gramsUsed,
          pricePerSpool:  _calcResult.pricePerSpool,
          originalWeight: _calcResult.originalWeight,
          materialCost:   _calcResult.materialCost,
          printer:        _calcResult.printer,
          printerPowerKw: _calcResult.printerPowerKw,
          printHours:     _calcResult.printHoursTotal,
          pricePerKwh:    _calcResult.kwhPrice,
          electricityCost:_calcResult.electricityCost,
          totalCost:      _calcResult.totalCost,
          user:           user?.username || 'unknown'
        };
        history.unshift(record);
        if (history.length > 200) history.length = 200;
        await Storage.writeJsonFile('calculations.json', history);
        await Storage.addLog(
          user?.username || 'unknown',
          'calc_print',
          `Kalkulace: ${record.name || record.filamentName} — ${record.gramsUsed} g, celkem ${record.totalCost.toFixed(2)} Kč`
        );
        App.showToast('Kalkulace uložena do historie.', 'success');
        if (productNameInput) productNameInput.value = '';
        await loadHistory();
      } catch (e) {
        App.showToast('Chyba při ukládání: ' + e.message, 'danger');
      }
    });
  }

  // ── History ─────────────────────────────────────────────────────────────────
  async function loadHistory() {
    const history = await Storage.readJsonFile('calculations.json', []);
    const tbody = document.getElementById('historyTableBody');
    const emptyMsg = document.getElementById('historyEmpty');
    const tableWrap = document.getElementById('historyTableWrap');
    const countEl = document.getElementById('historyCount');

    if (!tbody) return;

    if (countEl) countEl.textContent = `(${history.length})`;

    if (history.length === 0) {
      if (emptyMsg) emptyMsg.classList.remove('d-none');
      if (tableWrap) tableWrap.classList.add('d-none');
      return;
    }

    if (emptyMsg) emptyMsg.classList.add('d-none');
    if (tableWrap) tableWrap.classList.remove('d-none');

    const fmt2 = (n) => Number(n).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtH = (h) => {
      if (!h) return '—';
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return mm > 0 ? `${hh} h ${mm} min` : `${hh} h`;
    };

    tbody.innerHTML = '';
    history.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-muted small text-nowrap">${App.formatDate(r.date)}</td>
        <td>${escHtml(r.name || '—')}</td>
        <td>${escHtml(r.filamentName || '—')}</td>
        <td class="text-end">${r.gramsUsed} g</td>
        <td class="text-end">${fmtH(r.printHours)}</td>
        <td class="text-end">${fmt2(r.materialCost)} Kč</td>
        <td class="text-end">${fmt2(r.electricityCost)} Kč</td>
        <td class="text-end fw-semibold">${fmt2(r.totalCost)} Kč</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger del-calc-btn" data-id="${r.id}" title="Smazat záznam">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.del-calc-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Smazat tento záznam z historie?')) return;
        try {
          const h = await Storage.readJsonFile('calculations.json', []);
          const filtered = h.filter(r => r.id !== btn.dataset.id);
          await Storage.writeJsonFile('calculations.json', filtered);
          await loadHistory();
          App.showToast('Záznam smazán.', 'info');
        } catch (e) {
          App.showToast('Chyba: ' + e.message, 'danger');
        }
      });
    });
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  await loadHistory();
}
