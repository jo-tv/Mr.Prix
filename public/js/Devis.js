// تحويل نص إلى رقم (يدعم الفاصلة والنقطة)
function toNumber(val) {
  if (!val) return 0;
  val = val.toString().replace(/\s/g, '').replace(/,/g, '.');
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// تحديث سطر واحد
function updateRow(row) {
  const qte = toNumber(row.querySelector('.qte').value);
  const pu = toNumber(row.querySelector('.prixProduit').value);
  const total = qte * pu;
  row.querySelector('.total').textContent = total > 0 ? total.toFixed(2) : '';
  return total;
}

// تحديث المجموع الكلي
function updateTotals() {
  let net = 0;

  // جمع قيمة كل الأسطر
  document.querySelectorAll('#devisTable tbody tr').forEach((row) => {
    net += updateRow(row);
  });

  if (net > 0) {
    // حساب HT و TVA من net (TTC)
    const htValue = net / 1.2;
    const tvaValue = net - htValue;

    // عرض النتائج
    document.getElementById('net').textContent = net.toFixed(2) ;

    document.getElementById('ht').textContent = htValue.toFixed(2);

    document.getElementById('tva').textContent = tvaValue.toFixed(2);
  } else {
    document.getElementById('net').textContent = '';
    document.getElementById('ht').textContent = '';
    document.getElementById('tva').textContent = '';
  }

  saveToLocalStorage(); // 🟢 حفظ عند كل تحديث
}

// حفظ البيانات في localStorage
function saveToLocalStorage() {
  const rowsData = [];
  document.querySelectorAll('#devisTable tbody tr').forEach((row) => {
    rowsData.push({
      code: row.querySelector('.codeProduit').value,
      qte: row.querySelector('.qte').value,
      prix: row.querySelector('.prixProduit').value,
    });
  });
  localStorage.setItem('devisData', JSON.stringify(rowsData));
}

// تحميل البيانات من localStorage (بدون مسح الجدول)
function loadFromLocalStorage() {
  const saved = JSON.parse(localStorage.getItem('devisData') || '[]');
  const rows = document.querySelectorAll('#devisTable tbody tr');

  if (saved.length === 0) {
    attachListeners();
    updateTotals();
    return;
  }

  rows.forEach((row, i) => {
    if (saved[i]) {
      row.querySelector('.codeProduit').value = saved[i].code || '';
      row.querySelector('.qte').value = saved[i].qte || '';
      row.querySelector('.prixProduit').value = saved[i].prix || '';
    }
  });

  attachListeners();
  updateTotals();
}

// عند إدخال الكود → جلب السعر تلقائياً
async function fetchPrice(input) {
  const code = input.value.trim();
  const row = input.closest('tr');
  const prixInput = row.querySelector('.prixProduit');

  if (!code) {
    prixInput.value = '';
    updateTotals();
    return;
  }

  try {
    const response = await fetch(`/api/produit/${code}`);
    if (!response.ok) {
      prixInput.value = '';
      updateTotals();
      return;
    }

    const data = await response.json();
    prixInput.value = data.prix;
    updateTotals();
  } catch (err) {
    console.error(err);
    prixInput.value = '';
    updateTotals();
  }
}

// ربط الأحداث
function attachListeners() {
  document.querySelectorAll('.codeProduit').forEach((input) => {
    input.addEventListener('input', function () {
      fetchPrice(this);
    });
  });

  document.querySelectorAll('.qte, .prixProduit').forEach((input) => {
    input.addEventListener('input', updateTotals);
  });
}

// تحميل PDF
function downloadPDF() {
  const buttons = document.querySelectorAll('button, .no-print, .containeer');
  buttons.forEach((btn) => (btn.style.display = 'none'));

  const element = document.body;

  const opt = {
    margin: 0.5,
    filename: 'devis.pdf',
    image: { type: 'png', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
  };

  // 🟢 انتظر حتى يتحمل اللوجو
  const logo = document.querySelector('.logo');
  if (logo && !logo.complete) {
    logo.onload = () => generatePDF(element, opt, buttons);
  } else {
    generatePDF(element, opt, buttons);
  }
}

function generatePDF(element, opt, buttons) {
  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      buttons.forEach((btn) => (btn.style.display = 'inline-block'));
    });
}

// 🟢 زر لمسح البيانات
function clearLocalStorage() {
  if (confirm('هل أنت متأكد أنك تريد مسح جميع البيانات؟')) {
    localStorage.removeItem('devisData');
    location.reload(); // إعادة تحميل الصفحة
  }
}

// عند تحميل الصفحة → استرجاع البيانات
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
});

// دالة استخراج تاريخ اليوم
function getFormattedDate() {
  const today = new Date();

  const day = String(today.getDate()).padStart(2, '0'); // 25
  const month = String(today.getMonth() + 1).padStart(2, '0'); // 08 (الأشهر تبدأ من 0)
  const year = today.getFullYear(); // 2025

  return `${day}/${month}/${year}`;
}

// مثال استخدام
document.querySelector('#date').textContent = 'MARRAKECH LE : ' + getFormattedDate();

$('.menu-toggle').click(function () {
  $('.menu-toggle').toggleClass('open');
  $('.menu-round').toggleClass('open');
  $('.menu-line').toggleClass('open');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch((err) => console.error('SW registration failed:', err));
}