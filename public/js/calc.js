function getDateTimeNow() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} | ${hour}:${minute}`;
}

function calculate() {
  const seller = document.getElementById('seller').value.trim();
  const code = document.getElementById('code').value.trim();
  const length = parseFloat(document.getElementById('length').value);
  const width = parseFloat(document.getElementById('width').value);
  const price = parseFloat(document.getElementById('price').value);

  if (!seller) {
    alert('يرجى إدخال اسم البائع  👤 .');
    return;
  }

  if (code.length < 6) {
    alert(' يرجى تحقق من كود المنتج  🛍️');
    return;
  }

  if (
    isNaN(length) ||
    isNaN(width) ||
    isNaN(price) ||
    isNaN(code) ||
    length <= 0 ||
    width <= 0 ||
    price <= 0
  ) {
    alert('يرجى إدخال قيم صحيحة .  ⛔⛔⛔⛔');
    return;
  }

  const area = (length * width).toFixed(2);
  const total = (area * price).toFixed(2);

  document.getElementById('inv-seller').textContent = seller;
  document.getElementById('inv-length').textContent = length.toFixed(2);
  document.getElementById('inv-width').textContent = width.toFixed(2);
  document.getElementById('inv-area').textContent = area;
  document.getElementById('inv-code').textContent = code;

  document.getElementById('inv-price').textContent = price.toFixed(2);
  document.getElementById('inv-total').textContent = total + ' DH';

  document.getElementById('invoice-datetime').textContent = getDateTimeNow();
  document.getElementById('invoice').style.display = 'block';
}

function downloadPDF() {
  const seller = document.getElementById('seller').value.trim();
  const invoice = document.getElementById('invoice');

  if (!seller || invoice.style.display === 'none') {
    alert('يرجى إدخال اسم البائع وحساب الفاتورة أولاً.');
    return;
  }

  // نسخة مؤقتة مضبوطة بدقة A4
  const clone = invoice.cloneNode(true);
  clone.style.display = 'block';
  clone.style.width = '794px'; // A4 العرض بدقة شاشة 96dpi
  clone.style.height = '1113px'; // A4 الطول
  clone.style.padding = '20px';
  clone.style.boxSizing = 'border-box';
  clone.style.margin = 'auto';
  clone.style.background = '#fff';

  // حاوية مؤقتة
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.justifyContent = 'center';
  wrapper.style.alignItems = 'center';
  wrapper.style.background = '#fff';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  const opt = {
    margin: 0,
    filename: `فاتورة_${seller.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
  };

  html2pdf()
    .set(opt)
    .from(clone)
    .save()
    .then(() => {
      document.body.removeChild(wrapper);
    });
}

const menuToggle = document.querySelector('.menu-toggle');
const menuRound = document.querySelector('.menu-round');
const menuLines = document.querySelectorAll('.menu-line');

const btnApp = document.querySelectorAll(".btn-app");
menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  menuRound.classList.toggle('open');
  menuLines.forEach(line => line.classList.toggle('open')
  );

  btnApp.forEach(e => {
    e.classList.toggle("active");
  });
});


if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch((err) => console.error('SW registration failed:', err));
}