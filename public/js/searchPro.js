// 🧩 تعريف المتغيرات العامة قبل الاستخدام
let isScanning = false;
let html5QrCode = null;

const reader = document.getElementById('reader');
const scanBtn = document.querySelector('#scanBtn');
const input = document.getElementById('textSearch');
const searchBtn = document.getElementById('searchBtn');

// 🔉 صوت المسح
const beepSound = new Audio('/sounds/beep.mp3'); // ضع الصوت في مجلدك إن أردت

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  const savedName = localStorage.getItem('nameVendeur');
  if (savedName) {
    document.getElementById('nameVendeur').value = savedName;
    document.getElementById('nomFichier').value = savedName.toLowerCase().trim();
  }
  loadProductsFromDatabase();
  setupEventListeners();
});

// 🧩 عند تغيّر الاسم: حفظه في localStorage
const nameInput = document.getElementById('nameVendeur');

// عند تغيّر الاسم: تنظيفه ثم حفظه في localStorage
nameInput.addEventListener('input', () => {
  let name = nameInput.value.trim().toLowerCase(); // حذف المسافات وتحويل إلى حروف صغيرة
  if (name) {
    localStorage.setItem('nameVendeur', name);
  } else {
    localStorage.removeItem('nameVendeur');
  }
});
// ====================
// تحميل المنتجات من قاعدة البيانات
// ====================
async function loadProductsFromDatabase() {
  try {
    // جلب اسم البائع من localStorage
    const nameVendeur = localStorage.getItem('nameVendeur');
    if (!nameVendeur) {
      showModalMessage('⚠️ المرجو إدخال اسم البائع أولاً');
      return;
    }

    // إرسال الاسم إلى الـ API كـ query parameter
    const response = await fetch(
      `/api/inventairePro?nameVendeur=${encodeURIComponent(nameVendeur)}`
    );
    if (!response.ok) throw new Error('فشل في تحميل البيانات');

    const products = await response.json();

    const tbody = document.querySelector('#produitTable tbody');
    tbody.innerHTML = '';
    products.forEach(addProductToTable);
  } catch (error) {
    console.error('Error loading products:', error);
    showModalMessage('❌ حدث خطأ في تحميل البيانات من قاعدة البيانات');
  }
}

// ====================
// إعداد الأحداث
// ====================
function setupEventListeners() {
  document.getElementById('searchBtn')?.addEventListener('click', searchProduct);
  document.getElementById('ajouterBtn')?.addEventListener('click', addProduct);
  document.getElementById('exportBtn')?.addEventListener('click', exportToExcel);
  document.getElementById('clearTableBtn')?.addEventListener('click', clearTable);
  document.getElementById('plus')?.addEventListener('click', toggleProductForm);
}

// ====================
// البحث عن منتج في قاعدة البيانات
// ====================
const nameVendeur = localStorage.getItem('nameVendeur');
async function searchProduct() {
  const query = document.querySelector('input[name="text"]').value.trim().toLowerCase();
  if (!query) return showModalMessage('⚠️ يرجى إدخال اسم أو كود المنتج');

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('فشل في البحث');
    const products = await response.json();
    if (!products.length) return showModalMessage('❌ المنتج غير موجود');

    const p = products[0];
    document.getElementById('libelle').value = p.LIBELLE;
    document.getElementById('gencode').value = p.GENCOD_P;
    document.getElementById('anpf').value = p.ANPF;
    document.getElementById('fournisseur').value = p.FOURNISSEUR_P;
    document.getElementById('stock').value = p.STOCK;
    document.getElementById('prix').value = p.PV_TTC;

    document.getElementById('nameVendeur').value = nameVendeur;
    document.getElementById('productForm').style.display = 'block';
  } catch (error) {
    console.error('Error searching product:', error);
    showModalMessage('❌ حدث خطأ في البحث عن المنتج');
  }
}

// ====================
// إضافة منتج جديد
// ====================
async function addProduct() {
  const product = {
    libelle: document.getElementById('libelle').value.trim(),
    gencode: document.getElementById('gencode').value.trim(),
    anpf: document.getElementById('anpf').value.trim(),
    fournisseur: document.getElementById('fournisseur').value.trim(),
    stock: document.getElementById('stock').value.trim(),
    prix: document.getElementById('prix').value.trim(),
    qteInven: document.getElementById('qteInven').value.trim(),
    adresse: document.getElementById('adresse').value.trim(),
    nameVendeur:
    document.getElementById('nameVendeur').value.toLowerCase().trim(),
  };

  if (!product.libelle || !product.gencode || !product.anpf || !product.nameVendeur)
    return showModalMessage('⚠️ جميع الحقول مطلوبة');

  try {
    const response = await fetch('/api/inventairePro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });

    if (!response.ok) throw new Error('فشل في إضافة المنتج');
    const addedProduct = await response.json();

    addProductToTable(addedProduct);
    resetProductForm();
    showModalMessage('✅ تم إضافة المنتج بنجاح');
  } catch (error) {
    console.error('Error adding product:', error);
    showModalMessage('❌ حدث خطأ أثناء إضافة المنتج');
  }
}

// ====================
// إضافة المنتج إلى الجدول
// ====================
function addProductToTable(product) {
  const row = document.createElement('tr');
  row.dataset.id = product._id || product.id || Date.now();

  row.innerHTML = `
  <td class="name">
    <i class="fa fa-box-open text-blue"></i> 
    <strong>${product.libelle}</strong>
  </td>
  <td class="barcode">
    <i class="fa fa-barcode text-gray"></i> 
    ${product.gencode}
  </td>
  <td>
    <i class="fa fa-hashtag text-purple"></i> 
    ${product.anpf}
  </td>
  <td>
    <i class="fa fa-truck text-orange"></i> 
    ${product.fournisseur}
  </td>
  <td class="price">
    <i class="fa fa-tags text-green"></i> 
    <strong>${product.prix} DH</strong>
  </td>
  <td>
    <i class="fa fa-cubes text-teal"></i> 
    ${product.qteInven || '0'}
  </td>
  <td>
    <i class="fa fa-map-marker-alt text-red"></i> 
    ${product.adresse || '----'}
  </td>
  <td class="actions">
    <button class="btnRed" title="Supprimer le produit" onclick="removeProduct(this)">
      <i class="fa fa-trash"></i> Supprimer
    </button>
    <button class="btnBlue" title="Modifier le produit" onclick="editProduct(this)">
      <i class="fa fa-edit"></i> Modifier
    </button>
  </td>
`;
  document.querySelector('#produitTable tbody').appendChild(row);
}

// ====================
// حذف منتج
// ====================
async function removeProduct(button) {
  const row = button.closest('tr');
  const id = row.dataset.id;

  const confirmDelete = confirm('هل أنت متأكد من حذف هذا المنتج؟');
  if (!confirmDelete) return;

  try {
    const response = await fetch(`/api/inventairePro/${id}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok || data.success === false)
      throw new Error(data.message || 'فشل في حذف المنتج');

    row.remove();
    showModalMessage('🗑️ تم حذف المنتج بنجاح');
  } catch (error) {
    console.error('Error deleting product:', error);
    showModalMessage('❌ حدث خطأ أثناء حذف المنتج');
  }
}

// ====================
// تعديل منتج
// ====================
// 🧩 عند الضغط على زر تعديل
function editProduct(button) {
  const row = button.closest('tr');
  const id = row.dataset.id;

  document.getElementById('editId').value = id;
  document.getElementById('editName').value = row.children[0].textContent.trim();
  document.getElementById('editBarcode').value = row.children[1].textContent.trim();
  document.getElementById('editAnpf').value = row.children[2].textContent.trim();
  document.getElementById('editPrice').value = parseFloat(row.children[4].textContent);
  document.getElementById('editQteInven').value = row.children[5].textContent.trim();
  document.getElementById('editAdresse').value = row.children[6].textContent.trim();

  document.getElementById('editModal').style.display = 'flex';
}

// 🧩 حفظ التعديلات
async function saveProductChanges() {
  const id = document.getElementById('editId').value;
  const qteInven = document.getElementById('editQteInven').value.trim();
  const adresse = document.getElementById('editAdresse').value.trim();

  try {
    const response = await fetch(`/api/inventairePro/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qteInven, adresse }),
    });

    if (!response.ok) throw new Error('فشل في تحديث المنتج');

    const updated = await response.json();

    // تحديث الصف في الجدول
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) {
      row.children[5].textContent = updated.qteInven || '0';
      row.children[6].textContent = updated.adresse || '';
    }

    showModalMessage('✅ تم تعديل المنتج بنجاح');
    closeEditModal();
  } catch (error) {
    console.error('Error updating product:', error);
    showModalMessage('❌ حدث خطأ أثناء تعديل المنتج');
  }
}

// 🧩 إغلاق المودال
function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

async function saveProductChanges() {
  const id = document.getElementById('editId').value;
  const name = document.getElementById('editName').value.trim();
  const barcode = document.getElementById('editBarcode').value.trim();
  const price = parseFloat(document.getElementById('editPrice').value);
  const qteInven = document.getElementById('editQteInven').value.trim();
  const adresse = document.getElementById('editAdresse').value.trim();

  try {
    const response = await fetch(`/api/inventairePro/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, barcode, price, qteInven, adresse }),
    });

    if (!response.ok) throw new Error('فشل في تحديث المنتج');
    const updatedProduct = await response.json();

    const row = document.querySelector(`tr[data-id="${id}"]`);
    row.querySelector('.name').textContent = updatedProduct.name;
    row.querySelector('.barcode').textContent = updatedProduct.barcode;
    row.querySelector('.price').textContent = `${updatedProduct.price} DH`;
    row.children[5].textContent = updatedProduct.qteInven || '0';
    row.children[6].textContent = updatedProduct.adresse || '';

    document.getElementById('editModal').style.display = 'none';
    showModalMessage('✅ تم تعديل المنتج بنجاح');
  } catch (error) {
    console.error('Error updating product:', error);
    showModalMessage('❌ حدث خطأ أثناء تعديل المنتج');
  }
}

// ====================
// مسح كل المنتجات
// ====================
async function clearTable() {
  const confirmClear = confirm('هل تريد مسح جميع المنتجات؟');
  if (!confirmClear) return;

  try {
    const response = await fetch('/api/inventairePro', { method: 'DELETE' });
    if (!response.ok) throw new Error('فشل في مسح المنتجات');

    document.querySelector('#produitTable tbody').innerHTML = '';
    showModalMessage('🧹 تم مسح جميع المنتجات بنجاح');
  } catch (error) {
    console.error('Error clearing products:', error);
    showModalMessage('❌ حدث خطأ أثناء مسح جميع المنتجات');
  }
}

// ====================
// تصدير إلى Excel
// ====================
async function exportToExcel() {
  try {
    const response = await fetch('/api/inventairePro');
    const produits = await response.json();
    if (produits.length === 0) return showModalMessage('⚠️ لا توجد بيانات لتصديرها');

    const header = Object.keys(produits[0]);
    const data = produits.map((prod) => header.map((h) => prod[h]));
    data.unshift(header);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produits');

    XLSX.writeFile(wb, document.getElementById('nomFichier').value + '.xlsx');
    showModalMessage('📦 تم تصدير الملف بنجاح');
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    showModalMessage('❌ حدث خطأ أثناء تصدير البيانات إلى Excel');
  }
}

// ====================
// دوال مساعدة
// ====================
function toggleProductForm() {
  const form = document.getElementById('productForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function resetProductForm() {
  document.querySelectorAll('#productForm input').forEach((input) => (input.value = ''));
}

function showModalMessage(message) {
  const msgBox = document.getElementById('msgBox');
  if (!msgBox) {
    alert(message);
    return;
  }
  msgBox.textContent = message;
  msgBox.style.display = 'block';
  setTimeout(() => (msgBox.style.display = 'none'), 3000);
}

scanBtn.addEventListener('click', async () => {
  if (isScanning) {
    await html5QrCode.stop();
    await html5QrCode.clear();
    reader.style.display = 'none';
    scanBtn.innerHTML = '<i class="fa fa-qrcode"></i> Scanner';
    isScanning = false;
  } else {
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error('لا توجد كاميرات متاحة');

      const camera = cameras.find((cam) => cam.label.toLowerCase().includes('back')) || cameras[0];

      reader.style.display = 'block';

      // أنشئ فقط إذا لم يكن موجودًا
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode('reader');
      }

      await html5QrCode.start(
        { deviceId: { exact: camera.id } },
        { fps: 7, qrbox: 280 },
        (decodedText) => {
          // ✅ تشغيل صوت المسح
          beepSound.play();

          input.value = decodedText;
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
            reader.style.display = 'none';
            scanBtn.innerHTML = '<i class="fa fa-qrcode"></i> Scanner';
            isScanning = false;
            searchBtn.click();
          });
        },
        (error) => {
          // تجاهل أخطاء القراءة اللحظية
        }
      );

      scanBtn.innerHTML = '<i class="fa fa-stop"></i> Arrêter le scanner';
      isScanning = true;
    } catch (err) {
      alert('خطأ في تشغيل الكاميرا: ' + err.message);
      reader.style.display = 'none';
      isScanning = false;
    }
  }
});

function clearTableVendeur() {
  alert('هل انت متاكد من مسح جميع بيانات');
  window.localStorage.clear();
}
