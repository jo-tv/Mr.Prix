// قاعدة بيانات المنتجات
const produitsDB = {
  200000534234: { prix: 120 },
  20000854213: { prix: 30 },
  300000111222: { prix: 95 },
};

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
  document.querySelectorAll('#devisTable tbody tr').forEach((row) => {
    net += updateRow(row);
  });
  document.getElementById('net').textContent =
    net > 0 ? 'Net à payer TTC : ' + net.toFixed(2) + ' DH' : 'Net à payer TTC : __________';
}

// عند إدخال الكود → جلب السعر تلقائياً
document.querySelectorAll('.codeProduit').forEach((input) => {
  input.addEventListener('input', async function () {
    const code = this.value.trim();
    const row = this.closest('tr');
    const prixInput = row.querySelector('.prixProduit');

    if (!code) {
      prixInput.value = '';
      updateTotals();
      return;
    }

    try {
      const response = await fetch(`/api/produit/${code}`); // لاحظ الأحرف الصغيرة
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
  });
});

// عند إدخال كمية أو سعر → تحديث المجموع
document.querySelectorAll('.qte, .prixProduit').forEach((input) => {
  input.addEventListener('input', updateTotals);
});

// تحديث أولي
updateTotals();

// تحميل PDF
function downloadPDF() {
  const buttons = document.querySelectorAll('button, .no-print');
  buttons.forEach((btn) => (btn.style.display = 'none'));

  const element = document.body;
  const opt = {
    margin: 0.5,
    filename: 'devis.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
  };

  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      buttons.forEach((btn) => (btn.style.display = 'inline-block'));
    });
}
