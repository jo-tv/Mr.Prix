// fichier: js/produitCumil.js

// ===========================
// 1. تعريف العناصر والمتغيرات العامة
// ===========================
const tableBody = document.getElementById('produitsTableBody');
const paginationEl = document.getElementById('pagination');
const infoPagination = document.getElementById('infoPagination');
const loadingEl = document.getElementById('topLoad');
const rowsPerPageEl = document.getElementById('rowsPerPage');
const searchInput = document.getElementById('searchInput');
const btnSearch = document.getElementById('btnSearch');
const btnExcel = document.getElementById('btnExcel');

let currentPage = 1;
let totalPages = 1;
const ALL_DATA_LIMIT = 80000; // حد كبير لجلب جميع البيانات للتصدير

// ===========================
// 2. دوال جلب البيانات
// ===========================

// 2.1. جلب بيانات الصفحة من الخادم
async function fetchProducts(page = 1, limit = 10, search = '') {
  try {
    loadingEl.style.display = 'flex';
    const params = new URLSearchParams({ page, limit, search });
    const res = await fetch(`/api/ProduitsTotal?${params.toString()}`);
    if (!res.ok) throw new Error('Erreur serveur');
    const data = await res.json();
    return data;
  } finally {
    loadingEl.style.display = 'none';
  }
}

// ===========================
// 3. دوال معالجة البيانات (دمج + حسابات)
// ===========================

// تنظيف القيم لإنشاء مفتاح دمج موثوق
function cleanKey(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// 3.1. دمج المنتجات وحساب mergeCount وecar
function mergeAndCalculateProducts(produits) {
  const merged = produits.reduce((acc, p) => {
    const key = `${cleanKey(p.anpf)}_${cleanKey(p.gencode)}_${cleanKey(p.libelle)}`;
    const qte = Number(p.qteInven) || 0;
    const stock = Number(p.stock) || 0;

    if (!acc[key]) {
      acc[key] = {
        ...p,
        qteInven: qte,
        stock: stock,
        mergeCount: 1,
        adresseSet: new Set(p.adresse ? [p.adresse] : []),
      };
    } else {
      acc[key].qteInven += qte;
      acc[key].mergeCount += 1;
      acc[key].adresseSet.add(p.adresse || '');
    }

    // تحديث العنوان الموحد بدون تكرار
    acc[key].adresse = [...acc[key].adresseSet].filter(Boolean).join(' | ');

    // حساب الفرق
    acc[key].ecar = acc[key].qteInven - acc[key].stock;

    return acc;
  }, {});

  return Object.values(merged);
}

// ===========================
// 4. عرض الجدول (RenderTable)
// ===========================
// حالة التخزين للترتيب
let sortColumn = null; // اسم العمود
let sortDirection = 'asc'; // asc أو desc

async function renderTable(page = 1) {
  const limit = parseInt(rowsPerPageEl?.value) || 10;
  const search = searchInput?.value.trim() || '';

  try {
    loadingEl.style.display = 'flex';
    loadingEl.querySelector('#loading').textContent = '⏳ Chargement des produits...';

    const data = await fetchProducts(page, limit, search);

    currentPage = data.page || 1;
    totalPages = data.totalPages || 1;

    const produits = Array.isArray(data.produits) ? data.produits : [];

    // --- ترتيب المنتجات إذا تم الضغط على رأس العمود ---
    let sortedProduits = [...produits];
    if (sortColumn) {
      sortedProduits.sort((a, b) => {
        const valA = a[sortColumn] ?? 0;
        const valB = b[sortColumn] ?? 0;
        if (typeof valA === 'string')
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    }

    // --- بناء صفوف الجدول ---
    tableBody.innerHTML = sortedProduits
      .map((p) => {
        const ecar = Number(p.ecar) || 0;
        const cellStyle =
          ecar === 0
            ? 'background-color: #dee2e6; color: #495057;'
            : ecar < 0
            ? 'background-color: #dc3545; color: white; font-weight: bold;'
            : 'background-color: #198754; color: white; font-weight: bold;';

        return `
          <tr>
            <td>${p.libelle || ''}</td>
            <td>${p.gencode || ''} <span class="badge bg-secondary ms-1">(${
              p.mergeCount || 1
            })</span></td>
            <td>${p.anpf || ''}</td>
            <td>${p.fournisseur || ''}</td>
            <td>${p.stock ?? 0}</td>
            <td>${p.qteInven ?? 0}</td>
            <td style="padding:0;">
              <div style="${cellStyle} height:100%; display:flex; align-items:center; justify-content:center; padding:0.5rem 0;">
                ${ecar}
              </div>
            </td>
            <td>${p.adresse || ''}</td>
            <td>${(p.nameVendeur || '').split('@')[0]}</td>
            <td>${p.calcul || ''}</td>
            <td>${p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : ''}</td>
          </tr>`;
      })
      .join('');

    // --- Pagination ---
    renderPagination(currentPage, totalPages, data.total ?? produits.length);

    // --- إضافة أحداث على رؤوس الأعمدة للفلترة ---
    document.querySelectorAll('thead th').forEach((th, index) => {
      th.style.cursor = 'pointer';
      th.onclick = () => {
        const columnMap = {
          0: 'libelle',
          1: 'gencode',
          2: 'anpf',
          3: 'fournisseur',
          4: 'stock',
          5: 'qteInven',
          6: 'ecar',
          7: 'adresse',
          8: 'nameVendeur',
          9: 'calcul',
          10: 'createdAt',
        };
        const col = columnMap[index];
        if (col) {
          if (sortColumn === col) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            sortColumn = col;
            sortDirection = 'asc';
          }
          renderTable(currentPage);
        }
      };
    });
  } catch (err) {
    console.error(err);
    alert('❌ Erreur lors du chargement des produits');
  } finally {
    loadingEl.style.display = 'none';
  }
}

// --- 5. Pagination ---
function renderPagination(current, total, totalItems) {
  const maxButtons = 5;
  let startPage = Math.max(1, current - Math.floor(maxButtons / 2));
  let endPage = Math.min(total, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) startPage = Math.max(1, endPage - maxButtons + 1);

  paginationEl.innerHTML = '';

  // Prev button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${current === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#">‹ Précédent</a>`;
  prevLi.addEventListener('click', (e) => {
    e.preventDefault();
    if (current > 1) renderTable(current - 1);
  });
  paginationEl.appendChild(prevLi);

  // Page buttons
  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === current ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      renderTable(i);
    });
    paginationEl.appendChild(li);
  }

  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${current === total ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#">Suivant ›</a>`;
  nextLi.addEventListener('click', (e) => {
    e.preventDefault();
    if (current < total) renderTable(current + 1);
  });
  paginationEl.appendChild(nextLi);

  // Info
  infoPagination.textContent = `Page ${current} sur ${total} - Total: ${totalItems} produits`;
}

// ===========================
// 5. Pagination
// ===========================
function renderPagination() {
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) startPage = Math.max(1, endPage - maxButtons + 1);

  paginationEl.innerHTML = '';

  const createButton = (text, pageNum, disabled = false, active = false) => {
    const li = document.createElement('li');
    li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${text}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      if (!disabled && !active) renderTable(pageNum);
    });
    return li;
  };

  paginationEl.appendChild(createButton('‹ Précédent', currentPage - 1, currentPage === 1));

  for (let i = startPage; i <= endPage; i++) {
    paginationEl.appendChild(createButton(i, i, false, i === currentPage));
  }

  paginationEl.appendChild(createButton('Suivant ›', currentPage + 1, currentPage === totalPages));
}

// ===========================
// 6. جلب جميع البيانات للـ Excel (لا حاجة للدمج على العميل)
// ===========================
async function fetchAllProductsForExcel(search = '') {
  loadingEl.style.display = 'flex';
  loadingEl.querySelector('#loading').textContent = "⏳ J'extrait toutes les données...";

  try {
    const params = new URLSearchParams({ page: 1, limit: ALL_DATA_LIMIT, search });
    const res = await fetch(`/api/ProduitsTotal?${params.toString()}`);
    if (!res.ok) throw new Error('Erreur serveur');
    const data = await res.json();
    return data.produits; // البيانات جاهزة مع mergeCount وecar
  } finally {
    loadingEl.style.display = 'none';
    loadingEl.querySelector('#loading').textContent = 'Chargement des données...';
  }
}

// ===========================
// 7. تصدير Excel
// ===========================
async function exportExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      alert("❌ La bibliothèque XLSX n'est pas chargée.");
      return;
    }

    const search = searchInput.value.trim();
    const produits = await fetchAllProductsForExcel(search);

    // إنشاء مصفوفة لتصدير Excel
    const exportData = [
      [
        'Libellé',
        'Gencode',
        'N° Groupe',
        'ANPF',
        'Fournisseur',
        'Stock System',
        'Quantité Réel',
        'Ecar',
        'Adresse',
        'Vendeur',
        'Emplacement',
        'Date Création',
      ],
    ];

    produits.forEach((p) => {
      exportData.push([
        p.libelle || '',
        p.gencode || '',
        p.mergeCount || 1, // mergeCount من السيرفر
        p.anpf || '',
        p.fournisseur || '',
        p.stock || 0,
        p.qteInven || 0,
        p.ecar || 0,
        p.adresse || '',
        (p.nameVendeur || '').split('@')[0],
        p.calcul || '',
        p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : '',
      ]);
    });

    // إنشاء ملف Excel
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire_Merge');
    XLSX.writeFile(wb, 'TotalProduit.xlsx');

    // عرض Toast نجاح
    const toastEl = document.getElementById('excelToast');
    if (toastEl) new bootstrap.Toast(toastEl).show();
  } catch (err) {
    console.error(err);
    alert("❌ Erreur lors de l'export Excel");
  }
}

// ===========================
// 8. Event Listeners
// ===========================
btnSearch?.addEventListener('click', () => renderTable(1));
rowsPerPageEl?.addEventListener('change', () => renderTable(1));
btnExcel?.addEventListener('click', exportExcel);
document.getElementById('btnRefresh')?.addEventListener('click', () => {
    renderTable(1);
  });


// Modal
document
  .getElementById('btnOpen')
  ?.addEventListener(
    'click',
    () => (document.getElementById('adressModal').style.display = 'block')
  );
document
  .getElementById('closeAdressModal')
  ?.addEventListener(
    'click',
    () => (document.getElementById('adressModal').style.display = 'none')
  );

// ===========================
// 9. Initial Render
// ===========================
renderTable(1);


$('.menu-toggle').click(function () {
  $('.menu-toggle').toggleClass('open');
  $('.menu-round').toggleClass('open');
  $('.menu-line').toggleClass('open');
});