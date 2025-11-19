document.addEventListener('DOMContentLoaded', () => {
  // --- 1. تعريف العناصر الأساسية والمتغيرات العامة ---
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
  const ALL_DATA_LIMIT = 999999; // حد كبير لجلب جميع البيانات للتصدير

  // --- 2. دوال جلب البيانات ومعالجتها (Core Logic) ---

  // 2.1. دالة جلب البيانات من الخادم
  async function fetchProducts(page = 1, limit = 50, search = '') {
    try {
      loadingEl.style.display = 'block';
      const params = new URLSearchParams({ page, limit, search });
      const res = await fetch(`/api/ProduitsTotal?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      return data;
    } finally {
      // إخفاء التحميل مؤقتاً أثناء معالجة البيانات
      loadingEl.style.display = 'none';
    }
  }

  // 2.2. دالة معالجة البيانات (الدمج، جمع الكميات، حساب ecar، وحساب mergeCount)
  function mergeAndCalculateProducts(produits) {
    return Object.values(
      produits.reduce((acc, product) => {
        const key = product.anpf && product.anpf.trim() !== '' ? product.anpf : product._id;
        const qte = Number(product.qteInven) || 0;
        const stockValue = Number(product.stock) || 0;

        if (!acc[key]) {
          // تهيئة المنتج المدمج الجديد
          acc[key] = { ...product, qteInven: qte, stock: stockValue, mergeCount: 1 };
        } else {
          // جمع الكمية وزيادة عداد الدمج
          acc[key].qteInven += qte;
          acc[key].mergeCount += 1;
        }

        acc[key].ecar = acc[key].qteInven - acc[key].stock;

        return acc;
      }, {})
    );
  }

  // 2.3. دالة جلب ومعالجة جميع البيانات (للتصدير)
  async function fetchAllAndMergeProducts(search = '') {
    loadingEl.textContent = '⏳ جلب جميع البيانات من الخادم...';
    const params = new URLSearchParams({ page: 1, limit: ALL_DATA_LIMIT, search });
    const res = await fetch(`/api/ProduitsTotal?${params.toString()}`);
    if (!res.ok) throw new Error('Erreur serveur');
    const data = await res.json();
    loadingEl.textContent = '⏳ معالجة ودمج البيانات...';
    return mergeAndCalculateProducts(data.produits);
  }

  // --- 3. دالة عرض الجدول (RenderTable) ---
  async function renderTable(page = 1) {
    const limit = parseInt(rowsPerPageEl.value);
    const search = searchInput.value.trim();

    const data = await fetchProducts(page, limit, search);
    currentPage = data.page;
    totalPages = data.totalPages;

    // معالجة البيانات للعرض في الجدول
    const mergedProducts = mergeAndCalculateProducts(data.produits);

    // بناء صفوف الجدول (تضمين التلوين الشرطي لـ ecar)
    tableBody.innerHTML = mergedProducts
      .map((p) => {
        // منطق التلوين الشرطي لـ ecar
        const ecarValue = Number(p.ecar);
        let cellStyle;

        if (ecarValue === 0) {
          cellStyle = 'background-color: #dee2e6; color: #495057;';
        } else if (ecarValue < 0) {
          cellStyle = 'background-color: #dc3545; color: white; font-weight: bold;';
        } else {
          cellStyle = 'background-color: #198754; color: white; font-weight: bold;';
        }

        return `
            <tr>
                <td>${p.libelle || ''}</td>          
                <td>
                    ${p.gencode || ''} 
                    <span class="badge bg-secondary ms-1">(${p.mergeCount || 1})</span> 
                </td>          
                <td>${p.anpf || ''}</td>             
                <td>${p.fournisseur || ''}</td>      
                <td>${p.stock || 0}</td>             
                <td>${p.qteInven || 0}</td>          
                <td style="padding: 0;">
                  <div style="${cellStyle} height: 100%; display: flex; align-items: center; justify-content: center; padding: 0.5rem 0;">
                    ${p.ecar || 0}
                  </div>
                </td>              
                <td>${p.adresse || ''}</td>          
                <td>${p.nameVendeur.split('@')[0] || ''}</td>      
                <td>${p.calcul || ''}</td>      
                <td>${p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : ''}</td>
            </tr>`;
      })
      .join('');

    // منطق Pagination
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    paginationEl.innerHTML = '';

    // Prev button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">‹ Précédent</a>`;
    prevLi.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage > 1) renderTable(currentPage - 1);
    });
    paginationEl.appendChild(prevLi);

    // Page buttons
    for (let i = startPage; i <= endPage; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === currentPage ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', (e) => {
        e.preventDefault();
        renderTable(i);
      });
      paginationEl.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Suivant ›</a>`;
    nextLi.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage < totalPages) renderTable(currentPage + 1);
    });
    paginationEl.appendChild(nextLi);

    // Page info
    infoPagination.textContent = `Page ${currentPage} sur ${totalPages} - Total: ${data.total} منتجات`;
  }

  // --- 4. معالجات الأحداث (Event Listeners) ---

  if (btnSearch) btnSearch.addEventListener('click', () => renderTable(1));
  if (rowsPerPageEl) rowsPerPageEl.addEventListener('change', () => renderTable(1));

  if (btnExcel) {
    btnExcel.addEventListener('click', async () => {
      try {
        // التحقق من تحميل مكتبة XLSX (ضروري للتصدير)
        if (typeof XLSX === 'undefined') {
          loadingEl.style.display = 'none';
          alert('❌ المكتبة XLSX غير محملة! يرجى التأكد من إضافة وسم <script> للمكتبة.');
          return;
        }

        const search = searchInput.value.trim();
        const mergedData = await fetchAllAndMergeProducts(search);

        // 1. تعريف المتغير محليًا
        const exportData = [];

        // 2. إضافة رؤوس الأعمدة (12 عمودًا)
        exportData.push([
          'Libellé',
          'Gencode',
          'عدد الدمج',
          'ANPF',
          'Fournisseur',
          'Stock System',
          'Quantité Réيل',
          'Ecar',
          'Adresse',
          'Vendeur',
          "L'emplacement",
          'Date Création',
        ]);

        // 3. إضافة الصفوف
        mergedData.forEach((p) => {
          exportData.push([
            p.libelle || '',
            p.gencode || '',
            p.mergeCount || 1,
            p.anpf || '',
            p.fournisseur || '',
            p.stock || 0,
            p.qteInven || 0,
            p.ecar || 0,
            p.adresse || '',
            p.nameVendeur || '',
            '', // L'emplacement
            p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : '',
          ]);
        });

        // 4. إنشاء ورقة عمل (Worksheet) وملف (Workbook)
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventaire_Mدمج');

        // 5. كتابة الملف وتنزيله
        XLSX.writeFile(wb, 'TotalProduit.xlsx');

        const toastEl = document.getElementById('excelToast');
        if (toastEl) new bootstrap.Toast(toastEl).show();
      } catch (err) {
        console.error(err);
        alert('❌ خطأ أثناء تصدير ملف XLSX');
      } finally {
        loadingEl.style.display = 'none';
        loadingEl.textContent = '⏳ Chargement des données...';
      }
    });
  }

  // --- 5. التشغيل الأولي ---
  renderTable(1);
});
document.getElementById('btnRefresh')?.addEventListener('click', () => {
  window.location.href = '/totalProduit'; // أو أي صفحة تريدها
});
