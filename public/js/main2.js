// ==================== MENU ====================
const menuToggle = document.querySelector('.menu-toggle');
const menuRound = document.querySelector('.menu-round');
const menuLines = document.querySelectorAll('.menu-line');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  menuRound.classList.toggle('open');
  menuLines.forEach(line => line.classList.toggle('open'));
});


// ==================== GLOBALS ====================
let PASSWORDS = {};
let PROTECTED_PAGES = {};
const MAX_ATTEMPTS = 3;
const LOCK_TIME = 5 * 60 * 1000;
const SESSION_DURATION = 4 * 60 * 60 * 1000; // أربع ساعات
// ==================== HASH FUNCTION ====================
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function startSessionTimer(sessionKey, duration = SESSION_DURATION) {
  // عند انتهاء الوقت: حذف الكوكي + إعادة تحميل الصفحة
  setTimeout(() => {
    deleteCookie(sessionKey);
    console.log('⏳ انتهت الجلسة، سيتم إعادة تحميل الصفحة...');
    window.location.reload();
  }, duration);
}

// ==================== COOKIES ====================
function setCookie(name, value, minutes = 1) {
  const d = new Date();
  d.setTime(d.getTime() + minutes * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const cookies = document.cookie.split(';').map((c) => c.trim());
  for (let c of cookies) {
    if (c.startsWith(name + '=')) return c.split('=')[1];
  }
  return null;
}

// ==================== LOAD PASSWORDS ====================
async function loadPagePasswords() {
  try {
    const res = await fetch('/get-passwords');
    const data = await res.json();

    PASSWORDS = {
      pasPageUploade: data.pasPageUploade,
      pasPageInventaire: data.pasPageInventaire,
      passDeletAllVendeur: data.passDeletAllVendeur,
      PanneauMots: data.PanneauMotss,
    };

    PROTECTED_PAGES = {
      '/upload': PASSWORDS.pasPageUploade,
      '/InvSmartManager': PASSWORDS.pasPageInventaire,
      '/infoPassPage': PASSWORDS.PanneauMots,
      '/pageUser': PASSWORDS.PanneauMots,
      '/editProduitInv': PASSWORDS.PanneauMots,
    };

    protectPage(window.location.pathname);
  } catch (err) {
    console.error('❌ فشل في جلب كلمات السر:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadPagePasswords);

// ==================== PROTECT PAGE ====================
async function protectPage(path) {
  const pagePassword = PROTECTED_PAGES[path];
  if (!pagePassword) return;

  const sessionKey = `auth_${path}`;
  const sessionHash = getCookie(sessionKey);
  const sessionStart = getCookie(`${sessionKey}_exp`);

  // لا توجد جلسة
  if (!sessionHash || !sessionStart) {
    return showPasswordPrompt(pagePassword, sessionKey);
  }

  const now = Date.now();
  const age = now - parseInt(sessionStart);

  // الجلسة منتهية
  if (age > SESSION_DURATION) {
    deleteCookie(sessionKey);
    deleteCookie(`${sessionKey}_exp`);
    return showPasswordPrompt(pagePassword, sessionKey);
  }

  // تحقق تطابق كلمة السر
  const currentHash = await hashText(pagePassword);

  if (sessionHash !== currentHash) {
    deleteCookie(sessionKey);
    deleteCookie(`${sessionKey}_exp`);
    return showPasswordPrompt(pagePassword, sessionKey);
  }
}

// ==================== SHOW PASSWORD OVERLAY ====================
function showPasswordPrompt(pagePassword, sessionKey) {
  document.getElementById('passwordOverlay').style.display = 'flex';

  window.currentProtectedPassword = pagePassword;
  window.currentSessionKey = sessionKey;
}

// ==================== SUBMIT PASSWORD ====================
async function submitPassword() {
  const input = document.getElementById('passwordInput').value;
  const msg = document.getElementById('errorMsg');

  const attempts = parseInt(getCookie('pw_attempts') || '0');
  const lock = getCookie('pw_lock_time');
  const now = Date.now();

  // قفل نشط
  if (lock && now < parseInt(lock)) {
    const remaining = Math.ceil((parseInt(lock) - now) / 1000);
    msg.innerText = `❌ Trop de tentatives. Réessayez dans ${remaining} secondes.`;
    return;
  }

  // نجاح الدخول
  if (input === window.currentProtectedPassword) {
    const hash = await hashText(window.currentProtectedPassword);

    setCookie(window.currentSessionKey, hash, 1);
    startSessionTimer(window.currentSessionKey);
    setCookie(`${window.currentSessionKey}_exp`, Date.now(), 1);

    setCookie('pw_attempts', 0, 1);

    msg.innerText = '';
    document.getElementById('passwordOverlay').style.display = 'none';
    showToast('✔ Accès autorisé.');
    return;
  }

  // كلمة سر خاطئة
  const newAttempts = attempts + 1;
  setCookie('pw_attempts', newAttempts, 1);

  if (newAttempts >= MAX_ATTEMPTS) {
    const lockUntil = now + LOCK_TIME;
    setCookie('pw_lock_time', lockUntil, 1);

    msg.innerText = `❌ Trop de tentatives. Essayez après 5 minutes.`;
    return;
  }

  msg.innerText = `❌ Mot de passe incorrect. Tentatives restantes: ${MAX_ATTEMPTS - newAttempts}`;
}

// ==================== TOAST ====================
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = `toast ${type}`;
  }, duration);
}

// ==================== LOADER ====================
let topLoad = document.getElementById('topLoad');
function showCharge() {
  if (topLoad) {
    setTimeout(() => {
      topLoad.style.display = 'none';
    }, 1500);
  }
}
showCharge();

// ==================== SERVICE WORKER ====================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .catch((err) => console.error('SW registration failed:', err));
}
