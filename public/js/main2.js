$('.menu-toggle').click(function () {
  $('.menu-toggle').toggleClass('open');
  $('.menu-round').toggleClass('open');
  $('.menu-line').toggleClass('open');
});

let PASSWORDS = {};
let PROTECTED_PAGES = {};
const MAX_ATTEMPTS = 3;
const LOCK_TIME = 5 * 60 * 1000; // 5 دقائق بالمللي ثانية

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// === تخزين جلسة الدخول في كوكيز ===
function setCookie(name, value, days = 1) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split(';').map((c) => c.trim());
  for (let c of cookies) {
    if (c.startsWith(name + '=')) return c.split('=')[1];
  }
  return null;
}

function getCookie(name) {
  const cookies = document.cookie.split(';').map((c) => c.trim());
  for (let c of cookies) {
    if (c.startsWith(name + '=')) return c.split('=')[1];
  }
  return null;
}

async function loadPagePasswords() {
  try {
    const res = await fetch('/get-passwords');
    const data = await res.json();
    // تخزين كل كلمات السر في كائن واحد
    PASSWORDS = {
      pasPageUploade: data.pasPageUploade,
      pasPageInventaire: data.pasPageInventaire,
      passDeletAllVendeur: data.passDeletAllVendeur,
      PanneauMots: data.PanneauMotss,
    };

    // الصفحات المحمية
    PROTECTED_PAGES = {
      '/upload': PASSWORDS.pasPageUploade,
      '/InvSmartManager': PASSWORDS.pasPageInventaire,
      '/infoPassPage': PASSWORDS.PanneauMots,
      '/pageUser': PASSWORDS.PanneauMots,
    };

    // حماية الصفحة الحالية
    protectPage(window.location.pathname);
  } catch (error) {
    console.error('❌ فشل في جلب كلمات السر:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadPagePasswords);

async function protectPage(path) {
  const pagePassword = PROTECTED_PAGES[path];

  if (!pagePassword) return; // الصفحة غير محمية

  const sessionKey = `auth_${path}`;
  const savedHash = getCookie(sessionKey);

  // حساب هاش كلمة السر الحالية من قاعدة البيانات
  const currentHash = await hashText(pagePassword);

  // إذا كان الهاش مطابقًا → الجلسة لا تزال صالحة
  if (savedHash && savedHash === currentHash) {
    return; // لا نطلب كلمة مرور
  }

  // غير مطابق → كلمة السر تغيّرت أو لا توجد جلسة
  // → نطلب كلمة المرور من المستخدم
  document.getElementById('passwordOverlay').style.display = 'flex';

  // حفظ معلومات لاستخدامها عند الإدخال
  window.currentProtectedPassword = pagePassword;
  window.currentSessionKey = sessionKey;
  window.currentHash = currentHash;
}

// === معالجة زر إدخال كلمة المرور ===
async function submitPassword() {
  const input = document.getElementById('passwordInput').value;
  const msg = document.getElementById('errorMsg');

  const attemptsCookie = getCookie('pw_attempts') || '0';
  const attempts = parseInt(attemptsCookie);

  const lockTimeCookie = getCookie('pw_lock_time');
  const now = Date.now();

  // التحقق من وجود قفل
  if (lockTimeCookie && now < parseInt(lockTimeCookie)) {
    const remaining = Math.ceil((parseInt(lockTimeCookie) - now) / 1000);
    msg.innerText = `❌ Trop de tentatives. Réessayez dans ${remaining} secondes.`;
    return;
  }

  if (input === window.currentProtectedPassword) {
    const hash = window.currentHash;
    setCookie(window.currentSessionKey, hash, 7);

    // إعادة تعيين العداد بعد الدخول الصحيح
    setCookie('pw_attempts', 0, 1);
    setCookie('pw_lock_time', 0, 1);

    document.getElementById('passwordOverlay').style.display = 'none';
    msg.innerText = '';
    showToast('✔ Accès autorisé.');
  } else {
    const newAttempts = attempts + 1;
    setCookie('pw_attempts', newAttempts, 1);

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockUntil = now + LOCK_TIME;
      setCookie('pw_lock_time', lockUntil, 1);
      msg.innerText = `❌ Trop de tentatives. Essayez à nouveau après 5 minutes.`;
      document.getElementById('passwordInput').disabled = true;

      // إعادة تفعيل الـ input بعد انتهاء القفل
      setTimeout(() => {
        document.getElementById('passwordInput').disabled = false;
        document.getElementById('errorMsg').innerText = '';
        setCookie('pw_attempts', 0, 1);
        setCookie('pw_lock_time', 0, 1);
      }, LOCK_TIME);
    } else {
      msg.innerText = `❌ Mot de passe incorrect. Tentatives restantes: ${
        MAX_ATTEMPTS - newAttempts
      }`;
    }
  }
}

function showCharge() {
  setTimeout(() => {
    document.getElementById('topLoad').style.display = 'none';
  }, 1500);
}

document.addEventListener('DOMContentLoaded', loadPagePasswords, showCharge());

// 🔹 دالة الرسائل
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = `toast ${type}`;
  }, duration);
}
