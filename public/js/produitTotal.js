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

  async function fetchProducts(page = 1, limit = 50, search = '') {
    try {
      loadingEl.style.display = 'block';
      const params = new URLSearchParams({ page, limit, search });
      const res = await fetch(`/api/ProduitsTotal?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      return data;
    } finally {
      loadingEl.style.display = 'none';
    }
  }

  async function renderTable(page = 1) {
    const limit = parseInt(rowsPerPageEl.value);
    const search = searchInput.value.trim();

    const data = await fetchProducts(page, limit, search);
    currentPage = data.page;
    totalPages = data.totalPages;

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

    // Pagination
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
    infoPagination.textContent = `Page ${currentPage} sur ${totalPages} - Total: ${data.total} produits`;
  }

  // ✅ Event listeners
  if (btnSearch) btnSearch.addEventListener('click', () => renderTable(1));
  if (rowsPerPageEl) rowsPerPageEl.addEventListener('change', () => renderTable(1));

  if (btnExcel) {
    btnExcel.addEventListener('click', async () => {
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

        const toastEl = document.getElementById('excelToast');
        if (toastEl) new bootstrap.Toast(toastEl).show();
      } catch (err) {
        console.error(err);
        alert('❌ Erreur lors de l’export Excel');
      } finally {
        loadingEl.style.display = 'none';
        loadingEl.textContent = '⏳ Chargement des données...';
      }
    });
  }

  // Initial render
  renderTable(1);
});