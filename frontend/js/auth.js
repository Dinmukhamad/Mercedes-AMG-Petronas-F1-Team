/**
 * auth.js — авторизация, JWT, состояние пользователя
 */

const AuthState = {
  getToken: ()  => localStorage.getItem('f1_token'),
  getUser:  ()  => {
    const raw = localStorage.getItem('f1_user');
    return raw ? JSON.parse(raw) : null;
  },
  isLoggedIn: () => !!localStorage.getItem('f1_token'),
  isAdmin: () => {
    const user = AuthState.getUser();
    return user && user.role === 'admin';
  },
  save: (token, user) => {
    localStorage.setItem('f1_token', token);
    localStorage.setItem('f1_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('f1_token');
    localStorage.removeItem('f1_user');
  },
};

// ============================================
// LOGIN PAGE
// ============================================

function initLoginPage() {
  if (AuthState.isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }

  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const email    = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      showFormError(form, 'Заполните все поля');
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    setButtonLoading(btn, true);

    try {
      const data = await Auth.login({ email, password });
      localStorage.setItem('f1_token', data.access_token);
      const user = await Auth.me();
      AuthState.save(data.access_token, user);
      showToast('Добро пожаловать, ' + user.username + '!', 'success');
      setTimeout(() => { window.location.href = '/index.html'; }, 600);
    } catch (err) {
      showFormError(form, err.message || 'Неверный email или пароль');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ============================================
// REGISTER PAGE
// ============================================

function initRegisterPage() {
  if (AuthState.isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }

  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const username  = form.username.value.trim();
    const email     = form.email.value.trim();
    const password  = form.password.value;
    const confirm   = form.password_confirmation.value;

    if (!username || !email || !password || !confirm) {
      showFormError(form, 'Заполните все поля');
      return;
    }

    if (password.length < 6) {
      showFormError(form, 'Пароль должен быть не менее 6 символов');
      return;
    }

    if (password !== confirm) {
      showFormError(form, 'Пароли не совпадают');
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    setButtonLoading(btn, true);

    try {
      await Auth.register({ username, email, password, password_confirmation: confirm });
      // Auto-login after register
      const tokenData = await Auth.login({ email, password });
      localStorage.setItem('f1_token', tokenData.access_token);
      const user = await Auth.me();
      AuthState.save(tokenData.access_token, user);
      showToast('Аккаунт создан!', 'success');
      setTimeout(() => { window.location.href = '/index.html'; }, 600);
    } catch (err) {
      showFormError(form, err.message || 'Ошибка регистрации');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ============================================
// NAVBAR AUTH STATE
// ============================================

function updateNavAuth() {
  const user = AuthState.getUser();
  const actionsEl = document.getElementById('navbar-auth');
  if (!actionsEl) return;

  if (user) {
    actionsEl.innerHTML = `
      <a href="/profile.html" class="btn btn-ghost btn-sm">
        <span>👤</span> ${escapeHtml(user.username)}
      </a>
      ${user.role === 'admin' ? `<a href="/admin.html" class="btn btn-ghost btn-sm">Админ</a>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="handleLogout()">Выйти</button>
    `;
  } else {
    actionsEl.innerHTML = `
      <a href="/login.html"    class="btn btn-ghost btn-sm">Войти</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Регистрация</a>
    `;
  }
}

async function handleLogout() {
  try { await Auth.logout(); } catch (_) {}
  AuthState.clear();
  showToast('Вы вышли из аккаунта', 'success');
  setTimeout(() => { window.location.href = '/index.html'; }, 500);
}

// ============================================
// HELPERS
// ============================================

function showFormError(form, message) {
  let errEl = form.querySelector('.form-error-global');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error form-error-global';
    form.prepend(errEl);
  }
  errEl.textContent = message;
}

function clearFormErrors(form) {
  form.querySelectorAll('.form-error-global').forEach(el => el.remove());
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Загрузка...' : btn.dataset.originalText;
}

// Guard для страниц, требующих авторизации
function requireAuth() {
  if (!AuthState.isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Guard для страниц, требующих роли admin
function requireAdmin() {
  if (!AuthState.isAdmin()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}
