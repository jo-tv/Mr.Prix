document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('vendeursContainer');
  const paginationContainer = document.getElementById('pagination');
  const searchInput = document.getElementById('searchVendeur');

  let vendeurs = [];
  let filtered = [];

  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;

  try {
    const res = await fetch('/api/inventairePro');
    vendeurs = await res.json();
    filtered = [...vendeurs];

    showToast(`${filtered.length} vendeurs ont été chargés.`, 'info');
    renderPage();
    renderPagination();
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-danger text-center">Erreur lors du chargement</div>`;
  }

  // ===================== 🔍 البحث =====================
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();

    filtered = vendeurs.filter((v) => v.nameVendeur.toLowerCase().includes(q));

    currentPage = 1;
    renderPage();
    renderPagination();
  });

  // ===================== 📄 عرض صفحة =====================
  function renderPage() {
    container.innerHTML = '';

    if (!filtered.length) {
      container.innerHTML = `<div class="col-12 text-center text-muted mt-4">
          Aucun vendeur trouvé.
      </div>`;
      return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, end);

    pageItems.forEach((data) => container.appendChild(createCard(data)));
  }

  // ===================== 🟥 إنشاء بطاقة =====================
  function createCard(data) {
    const card = document.createElement('div');
    card.className = 'col-lg-3 col-md-4 col-sm-6 mb-3';

    const imageURL =
      data.lastProduit?.photoVendeur ||
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIiT2kxAd1XT1sRmBpF6UkaiTNQFnQ4LJ0-2TnCePddw&s=10';

    card.innerHTML = `
      <div class="card rounded-4 h-100 shadow-sm">
        <div class="position-relative">
          <img src="${imageURL}" loading="lazy" class="card-img-top rounded-top-4"
               style="height: 200px; object-fit: cover;">
          <span class="badge bg-primary position-absolute top-0 start-0 m-2 fs-5">
            <i class="fas fa-user-circle"></i> ${data.nameVendeur.toUpperCase().split('@')[0]}
          </span>
        </div>

        <div class="card-body p-2">
          <p class="card-text mb-2 small">
            <i class="fas fa-boxes text-success"></i> Produits: <b class="fs-4
            text-body-emphasis">${data.count}</b>
          </p>

          <p class="card-text text-body-emphasis small mb-2 fs-5">
            <i class="far fa-clock text-danger"></i> 
            ${data.lastProduit?.libelle.split(' ').slice(0, 4).join(' ') || '—'}
          </p>

          <p class="card-text text-body-emphasis small mb-2">
            <i class="fa-solid fa-location-dot text-warning"></i> Adresse :
            ${data.lastProduit?.adresse?.split(' ').slice(0, 4).join(' ') || '—'}
          </p>

          <small class="text-danger-emphasis d-block mb-2">
            <i class="far fa-calendar-alt text-danger"></i>
            ${
              data.lastProduit?.createdAt
                ? new Date(data.lastProduit.createdAt).toLocaleString('fr-FR')
                : ''
            }
          </small>

          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-primary btn-sm flex-fill" onclick="showUserProducts('${
              data.nameVendeur
            }')">
              <i class="fas fa-eye"></i> Voir
            </button>
               <button class="btn btn-danger btn-sm flex-fill" onclick="showDeleteUserOverlay('${
                 data.nameVendeur
               }')">
                 <i class="fas fa-trash"></i> Supprimer
               </button>
          </div>
        </div>
      </div>
    `;

    return card;
  }

  // ===================== 🔢 Pagination =====================
  function renderPagination() {
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    let html = `
      <nav>
        <ul class="pagination justify-content-center">

          <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" data-page="${currentPage - 1}">Précédent</button>
          </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <button class="page-link" data-page="${i}">${i}</button>
        </li>
      `;
    }

    html += `
          <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" data-page="${currentPage + 1}">Suivant</button>
          </li>

        </ul>
      </nav>
    `;

    paginationContainer.innerHTML = html;

    // click events
    paginationContainer.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = Number(btn.getAttribute('data-page'));
        if (!isNaN(page)) {
          currentPage = page;
          renderPage();
          renderPagination();
        }
      });
    });
  }
});

// 🔹 عرض منتجات البائع مع Pagination (50 صف لكل صفحة)
async function showUserProducts(nameVendeur, page = 1) {
  try {
    const res = await fetch(`/api/inventairePro/${encodeURIComponent(nameVendeur)}`);

    const { produits } = await res.json();

    if (!produits.length) {
      showToast(`Aucun produit trouvé pour ${nameVendeur}`, 'info');
      return;
    }

    document.getElementById('modalVendeurName').textContent = nameVendeur.split('@')[0];
    document.querySelector('title').textContent = nameVendeur.split('@')[0];

    const tbody = $('#modalProductsTable tbody');

    if ($.fn.dataTable.isDataTable('#modalProductsTable')) {
      $('#modalProductsTable').DataTable().clear().destroy();
    }

    tbody.empty();
    // 🔥 1) تجميع المنتجات حسب anpf + calcul + adresse
    const mergedProduits = Object.values(
      produits.reduce((acc, item) => {
        const key = `${item.anpf}-${item.calcul}-${item.adresse}`;

        if (!acc[key]) {
          acc[key] = {
            ...item,
            qteInven: 0,
            mergedCount: 0, // 👈 عداد عدد العناصر المدمجة
          };
        }

        acc[key].qteInven += parseFloat(item.qteInven) || 0;
        acc[key].mergedCount += 1; // 👈 كل منتج يدخل يزيد العداد

        return acc;
      }, {})
    );

    mergedProduits.forEach((p) => {
      const stock = parseFloat(p.stock) || 0;
      const qteInven = parseFloat(p.qteInven) || 0;
      const ecart = qteInven - stock;

      let bgColor =
        ecart < 0
          ? 'background-color:#dc3545;color:white;'
          : ecart === 0
          ? 'background-color:#f8f9fa;'
          : 'background-color:#198754;color:white;';

      tbody.append(`
            <tr>
              <td>
                ${p.libelle.split(' ').slice(0, 4).join(' ')}
                <br>
                <small class="text-danger">
                (${p.mergedCount} groupés)
                </small>
              </td>
              <td>${p.gencode}</td>
              <td>${p.anpf}</td>
              <td>${p.prix || '—'}</td>
              <td>${stock}</td>
              <td>${qteInven}</td>
              <td style="${bgColor}">${ecart}</td>
              <td>${p.fournisseur || '—'}</td>
              <td>${p.adresse || '—'}</td>
              <td>${p.calcul || '—'}</td>
              <td>${p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : ''}</td>
            </tr>
          `);
    });

    const table = $('#modalProductsTable').DataTable({
      paging: true,
      pageLength: 10,
      lengthMenu: [5, 10, 25, 50, 100],
      searching: true,
      ordering: true,
      info: true,
      responsive: true,
      dom: 'Blfrtip',
      buttons: [
        {
          extend: 'excelHtml5',
          text: '<i class="fas fa-file-excel"></i> Excel',
          className: 'btn btn-success btn-sm',
          action: () => {
            window.location.href = `/api/exportExcel/${encodeURIComponent(nameVendeur)}`;
          },
        },
        {
          extend: 'print',
          text: '<i class="fas fa-print"></i> Imprimer',
          className: 'btn btn-secondary btn-sm',
        },
        {
          extend: 'csvHtml5',
          text: '<i class="fas fa-file-csv"></i> CSV',
          className: 'btn btn-info btn-sm',
        },
      ],
      columnDefs: [{ targets: '_all', className: 'text-center' }],
    });

    // ✅ بعد إنشاء الجدول — نربط checkboxes للتحكم في الأعمدة:
    $('.column-toggle')
      .off('change')
      .on('change', function () {
        const column = table.column($(this).data('column'));
        column.visible(this.checked);
      });

    const modal = new bootstrap.Modal(document.getElementById('productsModal'));
    modal.show();
  } catch (err) {
    console.error(err);
    showToast('Erreur lors du chargement des produits', 'error');
  }
}

//// 🔹 حذف جميع منتجات بائع محدد مع كلمة سر
let currentVendeur = ''; // لتخزين اسم البائع الذي سيتم حذفه

// عرض Overlay
function showDeleteUserOverlay(nameVendeur) {
  currentVendeur = nameVendeur;
  document.getElementById('deleteUserPasswordInput').value = '';
  document.getElementById('deleteUserErrorMsg').innerText = '';
  document.getElementById(
    'deleteUserMsg'
  ).innerText = `Entrez le mot de passe pour supprimer tous les produits de ${
    nameVendeur.split('@')[0]
  } :`;
  document.getElementById('deleteUserOverlay').style.display = 'flex';
}

// إغلاق Overlay
function closeDeleteUserOverlay() {
  document.getElementById('deleteUserOverlay').style.display = 'none';
}

// تأكيد الحذف بعد إدخال كلمة السر
async function confirmDeleteUser() {
  const msg = document.getElementById('deleteUserErrorMsg');
  const input = document.getElementById('deleteUserPasswordInput').value.trim();

  try {
    // جلب كلمات السر من قاعدة البيانات مباشرة
    const resPasswords = await fetch('/get-passwords');
    const data = await resPasswords.json();

    // تحديث المتغيرات العالمية
    passDeletOneVendeur = data.passDeletOneVendeur;
    passDeletAllVendeur = data.passDeletAllVendeur;
  } catch (err) {
    console.error('❌ فشل في جلب كلمات السر:', err);
    msg.innerText = '⚠️ Erreur serveur, veuillez réessayer';
    return;
  }

  // التحقق من كلمة السر
  if (input !== passDeletOneVendeur) {
    msg.innerText = '❌ Mot de passe incorrect';
    return;
  }

  // تأكيد الحذف
  if (!confirm(`⚠️ Voulez-vous vraiment supprimer tous les produits de ${currentVendeur} ?`))
    return;

  try {
    const res = await fetch(`/api/inventairePro/${encodeURIComponent(currentVendeur)}`, {
      method: 'DELETE',
    });
    const result = await res.json();

    if (result.success) {
      showToast(
        `✅ Tous les produits de ${currentVendeur} ont été supprimés (${result.deletedCount})`,
        'success',
        4000
      );
      location.reload();
    } else {
      showToast('Aucune donnée supprimée', 'warning', 4000);
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Erreur lors de la suppression des produits', 'error', 4000);
  } finally {
    closeDeleteUserOverlay();
  }
}

// 🔹 حذف جميع المنتجات مع كلمة سر
// عرض Overlay
function showDeleteOverlay() {
  document.getElementById('deletePasswordInput').value = '';
  document.getElementById('deleteErrorMsg').innerText = '';
  document.getElementById('deleteOverlay').style.display = 'flex';
}
// تأكيد الحذف بعد إدخال كلمة السر
async function confirmDeleteUser() {
  const msg = document.getElementById('deleteUserErrorMsg');
  const input = document.getElementById('deleteUserPasswordInput').value.trim();

  try {
    // جلب كلمات السر من قاعدة البيانات مباشرة
    const resPasswords = await fetch('/get-passwords');
    const data = await resPasswords.json();

    // تحديث المتغيرات العالمية
    passDeletOneVendeur = data.passDeletOneVendeur;
    passDeletAllVendeur = data.passDeletAllVendeur;
  } catch (err) {
    console.error('❌ فشل في جلب كلمات السر:', err);
    msg.innerText = '⚠️ Erreur serveur, veuillez réessayer';
    return;
  }

  // التحقق من كلمة السر
  if (input !== passDeletOneVendeur) {
    msg.innerText = '❌ Mot de passe incorrect';
    return;
  }

  // تأكيد الحذف
  if (
    !confirm(`⚠️ Voulez-vous vraiment supprimer tous les produits de
  ${currentVendeur.split('@')[0]} ?`)
  )
    return;

  try {
    const res = await fetch(`/api/inventairePro/${encodeURIComponent(currentVendeur)}`, {
      method: 'DELETE',
    });
    const result = await res.json();

    if (result.success) {
      showToast(
        `✅ Tous les produits de ${currentVendeur} ont été supprimés (${result.deletedCount})`,
        'success',
        4000
      );
      location.reload();
    } else {
      showToast('Aucune donnée supprimée', 'warning', 4000);
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Erreur lors de la suppression des produits', 'error', 4000);
  } finally {
    closeDeleteUserOverlay();
  }
}

// إغلاق Overlay
function closeDeleteOverlay() {
  document.getElementById('deleteOverlay').style.display = 'none';
}

const deleteAll = document.querySelector('#deleteAll');
const deleteOverlay = document.querySelector('#deleteOverlay');

deleteAll.onclick = () => {
  deleteOverlay.style.display = 'block';
};

// دالة تأكيد الحذف بعد إدخال كلمة السر
async function confirmDeleteAll() {
  const input = document.getElementById('deletePasswordInput').value.trim();
  const msg = document.getElementById('deleteErrorMsg');

  if (input !== passDeletAllVendeur) {
    msg.innerText = '❌ Mot de passe incorrect';
    return;
  }

  // تأكيد نهائي
  if (!confirm('⚠️ Voulez-vous vraiment supprimer toutes les données de tous les vendeurs ?')) {
    return;
  }

  try {
    const res = await fetch('/api/inventairePro', { method: 'DELETE' });
    const result = await res.json();

    if (result.success) {
      showToast(result.message || '✅ Toutes les données ont été supprimées', 'success', 4000);
      location.reload();
    } else {
      showToast('Aucune donnée supprimée', 'warning', 4000);
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Erreur lors de la suppression globale', 'error', 4000);
  } finally {
    closeDeleteOverlay();
  }
}
$('.menu-toggle').click(function () {
  $('.menu-toggle').toggleClass('open');
  $('.menu-round').toggleClass('open');
  $('.menu-line').toggleClass('open');
});

// 🔹 دالة الرسائل
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = `toast ${type}`;
  }, duration);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch(err => console.error('SW registration failed:', err));
}