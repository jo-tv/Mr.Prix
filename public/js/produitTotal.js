document.addEventListener('DOMContentLoaded', () => {
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

  // --------------------------
  // 1️⃣ جلب البيانات من السيرفر
  // --------------------------
  async function fetchInventaireRaw(page = 1, limit = 50, search = '') {
    try {
      loadingEl.style.display = 'flex';
      const params = new URLSearchParams({ page, limit, search });
      const res = await fetch(`/api/InventaireRaw?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur serveur');
      return await res.json(); // مصفوفة produits + page, totalPages, total
    } finally {
      loadingEl.style.display = 'none';
    }
  }

  // --------------------------
  // 2️⃣ عرض البيانات في الجدول
  // --------------------------
  async function renderTable(page = 1) {
    const limit = parseInt(rowsPerPageEl.value) || 50;
    const search = searchInput.value.trim();

    try {
      loadingEl.style.display = 'flex';

      const data = await fetchInventaireRaw(page, limit, search);
      const produits = data.produits || [];

      currentPage = data.page;
      totalPages = data.totalPages;

      tableBody.innerHTML = produits
        .map(
          (p) => `
          <tr>
            <td>${p.libelle || ''}</td>
            <td>${p.gencode || ''}</td>
            <td>${p.anpf || ''}</td>
            <td>${p.fournisseur || ''}</td>
            <td>${p.stock || ''}</td>
            <td>${p.prix || ''}</td>
            <td>${p.qteInven || ''}</td>
            <td>${p.adresse || ''}</td>
            <td>${(p.nameVendeur || '').split('@')[0]}</td>
            <td>${p.calcul || ''}</td>
            <td>${p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : ''}</td>
          </tr>
        `
        )
        .join('');

      renderPagination(currentPage, totalPages, data.total);
    } catch (err) {
      console.error(err);
      alert('❌ Erreur lors du chargement des données');
    } finally {
      loadingEl.style.display = 'none';
    }
  }

  // --------------------------
  // 3️⃣ الباجيناشن
  // --------------------------
  function renderPagination(currentPage, totalPages, totalItems) {
    paginationEl.innerHTML = '';
    infoPagination.textContent = `Page ${currentPage} / ${totalPages} — Total: ${totalItems} produits`;

    const createPageItem = (page, label = page, disabled = false, active = false) => {
      const li = document.createElement('li');
      li.className = `page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`;
      const a = document.createElement('a');
      a.className = 'page-link';
      a.href = '#';
      a.textContent = label;
      if (!disabled && !active) {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          renderTable(page);
        });
      }
      li.appendChild(a);
      return li;
    };

    // زر Prev
    paginationEl.appendChild(createPageItem(currentPage - 1, '«', currentPage === 1));

    let startPage = Math.max(currentPage - 2, 1);
    let endPage = Math.min(currentPage + 2, totalPages);

    if (startPage > 1) {
      paginationEl.appendChild(createPageItem(1));
      if (startPage > 2) {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = `<span class="page-link">...</span>`;
        paginationEl.appendChild(li);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationEl.appendChild(createPageItem(i, i, false, i === currentPage));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = `<span class="page-link">...</span>`;
        paginationEl.appendChild(li);
      }
      paginationEl.appendChild(createPageItem(totalPages));
    }

    // زر Next
    paginationEl.appendChild(createPageItem(currentPage + 1, '»', currentPage === totalPages));
  }

  // --------------------------
  // 4️⃣ البحث وعدد الصفوف
  // --------------------------
  if (btnSearch) btnSearch.addEventListener('click', () => renderTable(1));
  if (rowsPerPageEl) rowsPerPageEl.addEventListener('change', () => renderTable(1));

  // --------------------------
  // 5️⃣ تصدير Excel
  // --------------------------
  if (btnExcel) {
    btnExcel.addEventListener('click', async () => {
      try {
        loadingEl.querySelector('#loading').textContent = '⏳ Génération du fichier Excel...';
        loadingEl.style.display = 'flex';

        const search = searchInput.value.trim();
        const limit = 80000; // عدد كبير لجلب كل البيانات
        const res = await fetch(
          `/api/InventaireRaw?page=1&limit=${limit}&search=${encodeURIComponent(search)}`
        );
        if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json();
        const produits = data.produits || [];

        if (typeof XLSX === 'undefined') {
          alert("❌ La bibliothèque XLSX n'est pas chargée.");
          return;
        }

        const exportData = [
          [
            'Adresse',
            'Libellé',
            'Gencode',
            'ANPF',
            'Comptage',
            'Fournisseur',
            'Vendeur',
            'Emplacement',
            'Stock System',
            'Prix',
            'Date Création',
          ],
        ];

        produits.forEach((p) => {
          exportData.push([
            p.adresse || '',
            p.libelle || '',
            p.gencode || '',
            p.anpf || '',
            p.qteInven || 0,
            p.fournisseur || '',
            p.nameVendeur.split('@')[0] || '',
            p.calcul || '',
            p.stock || 0,
            p.prix || 0,
            p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : '',
          ]);
        });
        const now = new Date();

        const date = now.toLocaleDateString('fr-FR'); // 12/12/2025
        const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); // 17:30

        // استبدال الرموز الممنوعة
        const safeDate = date.replace(/\//g, '-'); // 12-12-2025
        const safeTime = time.replace(/:/g, '-'); // 17-30

        const fileName = `Inventaire_${safeDate}_${safeTime}.xlsx`;


        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventaire_Raw');
        XLSX.writeFile(wb, fileName);

        const toastEl = document.getElementById('excelToast');
        if (toastEl) new bootstrap.Toast(toastEl).show();
      } catch (err) {
        console.error(err);
        alert('❌ Erreur lors de l’export Excel');
      } finally {
        loadingEl.style.display = 'none';
        loadingEl.querySelector('#loading').textContent = 'Chargement des données...';
      }
    });
  }

  // --------------------------
  // 6️⃣ تحميل أولي
  // --------------------------
  renderTable(1);

  // 🔄 زر Refresh
  document.getElementById('btnRefresh')?.addEventListener('click', () => {
    renderTable(1);
  });
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


const menuToggle = document.querySelector('.menu-toggle');
const menuRound = document.querySelector('.menu-round');
const menuLines = document.querySelectorAll('.menu-line');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  menuRound.classList.toggle('open');
  menuLines.forEach(line => line.classList.toggle('open'));
});



if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch((err) => console.error('SW registration failed:', err));
}