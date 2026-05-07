/**
 * Users.js — Logic for users.html (admin only)
 */

let _usersData = [];
let _currentUser = null;
let _editTargetId = null;

async function initUsers() {
  _currentUser = Auth.getCurrentUser();
  await loadUsers();
  setupAddUserForm();
  setupChangePasswordForm();
}

async function loadUsers() {
  _usersData = await Storage.readJsonFile('users.json', []);
  renderUsersTable();
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  _usersData.forEach(user => {
    const isSelf = _currentUser && user.id === _currentUser.id;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="fw-medium">${escHtmlU(user.name)}</div>
      </td>
      <td><code>${escHtmlU(user.username)}</code></td>
      <td>
        <span class="badge ${user.role === 'admin' ? 'badge-active' : 'bg-secondary'}">
          ${user.role === 'admin' ? 'Administrátor' : 'Uživatel'}
        </span>
      </td>
      <td>
        <span class="badge ${user.active ? 'badge-active' : 'bg-secondary'}">
          ${user.active ? 'Aktivní' : 'Neaktivní'}
        </span>
      </td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-secondary me-1 change-pwd-btn" data-id="${user.id}" data-name="${escHtmlU(user.name)}" title="Změnit heslo">
          <i class="bi bi-key"></i>
        </button>
        <button class="btn btn-sm ${user.active ? 'btn-outline-warning' : 'btn-outline-success'} me-1 toggle-active-btn"
          data-id="${user.id}" data-active="${user.active}" data-name="${escHtmlU(user.name)}"
          ${isSelf ? 'disabled title="Nelze deaktivovat sebe"' : `title="${user.active ? 'Deaktivovat' : 'Aktivovat'}"`}>
          <i class="bi ${user.active ? 'bi-person-x' : 'bi-person-check'}"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary me-1 change-role-btn"
          data-id="${user.id}" data-role="${user.role}" data-name="${escHtmlU(user.name)}"
          ${isSelf ? 'disabled title="Nelze měnit vlastní roli"' : 'title="Změnit roli"'}>
          <i class="bi bi-person-gear"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-user-btn"
          data-id="${user.id}" data-name="${escHtmlU(user.name)}"
          ${isSelf ? 'disabled title="Nelze smazat sebe"' : 'title="Smazat uživatele"'}>
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Change password
  tbody.querySelectorAll('.change-pwd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _editTargetId = btn.dataset.id;
      document.getElementById('changePwdUserName').textContent = btn.dataset.name;
      document.getElementById('changePwdForm').reset();
      document.getElementById('changePwdForm').classList.remove('was-validated');
      const modal = new bootstrap.Modal(document.getElementById('changePwdModal'));
      modal.show();
    });
  });

  // Toggle active
  tbody.querySelectorAll('.toggle-active-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const isActive = btn.dataset.active === 'true';
      const name = btn.dataset.name;

      if (isActive) {
        // Check: not last active admin
        const user = _usersData.find(u => u.id === id);
        if (user && user.role === 'admin') {
          const activeAdmins = _usersData.filter(u => u.role === 'admin' && u.active);
          if (activeAdmins.length <= 1) {
            App.showToast('Nelze deaktivovat posledního aktivního administrátora.', 'warning');
            return;
          }
        }
      }

      const confirmed = confirm(`${isActive ? 'Deaktivovat' : 'Aktivovat'} uživatele "${name}"?`);
      if (!confirmed) return;

      const idx = _usersData.findIndex(u => u.id === id);
      if (idx === -1) return;
      _usersData[idx].active = !isActive;
      _usersData[idx].dateModified = new Date().toISOString();
      await saveUsers(`${isActive ? 'Deaktivován' : 'Aktivován'} uživatel: ${name}`);
    });
  });

  // Change role
  tbody.querySelectorAll('.change-role-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const currentRole = btn.dataset.role;
      const name = btn.dataset.name;
      const newRole = currentRole === 'admin' ? 'user' : 'admin';

      if (currentRole === 'admin') {
        const activeAdmins = _usersData.filter(u => u.role === 'admin' && u.active);
        if (activeAdmins.length <= 1) {
          App.showToast('Nelze odebrat roli poslednímu aktivnímu administrátorovi.', 'warning');
          return;
        }
      }

      if (!confirm(`Změnit roli uživatele "${name}" na "${newRole === 'admin' ? 'Administrátor' : 'Uživatel'}"?`)) return;

      const idx = _usersData.findIndex(u => u.id === id);
      if (idx === -1) return;
      _usersData[idx].role = newRole;
      _usersData[idx].dateModified = new Date().toISOString();
      await saveUsers(`Změněna role uživatele ${name} na ${newRole}`);
    });
  });

  // Delete user
  tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;

      const user = _usersData.find(u => u.id === id);
      if (user && user.role === 'admin') {
        const activeAdmins = _usersData.filter(u => u.role === 'admin' && u.active);
        if (activeAdmins.length <= 1) {
          App.showToast('Nelze smazat posledního aktivního administrátora.', 'warning');
          return;
        }
      }

      if (!confirm(`Opravdu smazat uživatele "${name}"? Tuto akci nelze vrátit.`)) return;

      _usersData = _usersData.filter(u => u.id !== id);
      await saveUsers(`Smazán uživatel: ${name}`);
    });
  });
}

function setupAddUserForm() {
  const form = document.getElementById('addUserForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const name = document.getElementById('newUserName')?.value.trim();
    const username = document.getElementById('newUserUsername')?.value.trim().toLowerCase();
    const password = document.getElementById('newUserPassword')?.value;
    const role = document.getElementById('newUserRole')?.value || 'user';

    if (!name || !username || !password) {
      App.showToast('Vyplňte všechna povinná pole.', 'warning');
      return;
    }

    // Check duplicate username
    if (_usersData.some(u => u.username === username)) {
      App.showToast(`Uživatelské jméno "${username}" již existuje.`, 'warning');
      return;
    }

    const hash = await Auth.hashPassword(password);
    const now = new Date().toISOString();
    const newUser = {
      id: crypto.randomUUID(),
      name,
      username,
      passwordHash: hash,
      role,
      active: true,
      dateCreated: now,
      dateModified: now
    };

    _usersData.push(newUser);
    await saveUsers(`Přidán uživatel: ${name} (${username})`);
    form.reset();
    form.classList.remove('was-validated');

    // Close modal if it's in a modal
    const modalEl = document.getElementById('addUserModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
  });
}

function setupChangePasswordForm() {
  const form = document.getElementById('changePwdForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const newPwd = document.getElementById('changePwdNew')?.value;
    const confirmPwd = document.getElementById('changePwdConfirm')?.value;

    if (newPwd !== confirmPwd) {
      App.showToast('Hesla se neshodují.', 'warning');
      return;
    }
    if (newPwd.length < 4) {
      App.showToast('Heslo musí mít alespoň 4 znaky.', 'warning');
      return;
    }

    const idx = _usersData.findIndex(u => u.id === _editTargetId);
    if (idx === -1) {
      App.showToast('Uživatel nenalezen.', 'danger');
      return;
    }

    _usersData[idx].passwordHash = await Auth.hashPassword(newPwd);
    _usersData[idx].dateModified = new Date().toISOString();
    await saveUsers(`Změněno heslo uživatele: ${_usersData[idx].name}`);

    const modal = bootstrap.Modal.getInstance(document.getElementById('changePwdModal'));
    if (modal) modal.hide();
    form.reset();
  });
}

async function saveUsers(logDescription) {
  try {
    await Storage.writeJsonFile('users.json', _usersData);
    const user = Auth.getCurrentUser();
    await Storage.addLog(user ? user.username : 'unknown', 'user_management', logDescription);
    App.showToast('Změny uloženy.', 'success');
    renderUsersTable();
  } catch (err) {
    App.showToast('Chyba při ukládání: ' + err.message, 'danger');
  }
}

function escHtmlU(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
