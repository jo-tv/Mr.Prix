
      const tableBody = document.getElementById('produitsTableBody');
      const paginationEl = document.getElementById('pagination');
      const infoPagination = document.getElementById('infoPagination');
      const loadingEl = document.getElementById('topLoad');

      let currentPage = 1;
      let totalPages = 1;

      // ✅ دالة لجلب البيانات
      async function fetchProducts(page = 1, limit = 50, search = '') {
        try {
          loadingEl.style.display = 'block';
          const url = `/api/ProduitsTotal?page=${page}&limit=${limit}&search=${encodeURIComponent(
            search
          )}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Erreur serveur');
          const data = await res.json();
          return data;
        } finally {
          loadingEl.style.display = 'none';
        }
      }

      // ✅ دالة عرض البيانات
      async function renderTable(page = 1) {
        const limit = parseInt(document.getElementById('rowsPerPage').value);
        const search = document.getElementById('searchInput').value.trim();

        // جلب البيانات
        const data = await fetchProducts(page, limit, search);
        currentPage = data.page;
        totalPages = data.totalPages;

        // عرض بيانات الجدول
        tableBody.innerHTML = data.produits
          .map(
            (p) => `
      <tr>
        <td>${p.libelle || ''}</td>
        <td>${p.gencode || ''}</td>
        <td>${p.anpf || ''}</td>
        <td>${p.fournisseur || ''}</td>
        <td>${p.qteInven || ''}</td>
        <td>${p.adresse || ''}</td>
        <td>${p.nameVendeur || ''}</td>
        <td>${p.calcul || ''}</td>
        <td>${p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : ''}</td>
      </tr>`
          )
          .join('');

        // تحديث Pagination: 5 أزرار حول الصفحة الحالية
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        // ضبط البداية إذا تجاوزت النهاية
        if (endPage - startPage + 1 < maxButtons) {
          startPage = Math.max(1, endPage - maxButtons + 1);
        }

        paginationEl.innerHTML = '';

        // زر السابق
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#">‹ Précédent</a>`;
        prevLi.addEventListener('click', (e) => {
          e.preventDefault();
          if (currentPage > 1) renderTable(currentPage - 1);
        });
        paginationEl.appendChild(prevLi);

        // أزرار الصفحات
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

        // زر التالي
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#">Suivant ›</a>`;
        nextLi.addEventListener('click', (e) => {
          e.preventDefault();
          if (currentPage < totalPages) renderTable(currentPage + 1);
        });
        paginationEl.appendChild(nextLi);

        // تحديث معلومات الصفحة
        infoPagination.textContent = `Page ${currentPage} sur ${totalPages} - Total: ${data.total} produits`;
      }

      // ✅ Event listeners pour recherche et rowsPerPage
      document.getElementById('searchInput').addEventListener('input', () => renderTable(1));
      document.getElementById('rowsPerPage').addEventListener('change', () => renderTable(1));
      document
        .getElementById('btnRefresh')
        .addEventListener('click', () => renderTable(currentPage));

      // ✅ Initialisation
      document.addEventListener('DOMContentLoaded', () => renderTable(1));

      document.getElementById('btnExcel').addEventListener('click', async () => {
        try {
          loadingEl.textContent = '⏳ Génération du fichier Excel...';
          loadingEl.style.display = 'block';

          const res = await fetch('/api/exportExcel');
          if (!res.ok) throw new Error('Erreur serveur');

          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = 'Inventaire_Complet.xlsx';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);

          const toast = new bootstrap.Toast(document.getElementById('excelToast'));
          toast.show();
        } catch (err) {
          console.error(err);
          alert('❌ Erreur lors de l’export Excel');
        } finally {
          loadingEl.style.display = 'none';
          loadingEl.textContent = '⏳ Chargement des données...';
        }
      });
    