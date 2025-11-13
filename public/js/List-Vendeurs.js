
      document.addEventListener('DOMContentLoaded', async () => {
        const container = document.getElementById('vendeursContainer');

        try {
          // 🔹 جلب ملخص البائعين مباشرة من السيرفر
          const res = await fetch('/api/inventairePro');
          const vendeurs = await res.json();

          container.innerHTML = '';

          if (!vendeurs.length) {
            container.innerHTML = `<div class="col-12 text-center text-muted mt-4">
        <i class="fas fa-info-circle"></i> Aucun vendeur trouvé.
      </div>`;
            return;
          }

          // 🔹 إنشاء كروت البائعين
          vendeurs.forEach((data) => {
            const card = document.createElement('div');
            card.className = 'col-md-4 col-sm- cards';

            const imageURL =
              data.lastProduit?.photoVendeur ||
              'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIiT2kxAd1XT1sRmBpF6UkaiTNQFnQ4LJ0-2TnCePddw&amp;s=10';

            card.innerHTML = `
        <div class="card rounded-4 h-100">
          <div class="position-relative">
            <img src="${imageURL}" class="card-img-top rounded-top-4" alt="${
              data.nameVendeur
            }" style="height: 220px; object-fit: cover;">
            <span class="badge bg-primary position-absolute top-0 start-0 m-2 fs-3 shadow-sm">
              <i class="fas fa-user-circle"></i> ${data.nameVendeur.toUpperCase()}
            </span>
          </div>
          <div class="card-body d-flex flex-column justify-content-between">
            <div>
              <p class="card-text mb-2">
                <i class="fas fa-boxes text-success"></i> Produits: <b>${data.count}</b>
              </p>
              <p class="card-text text-muted small mb-0">
                <i class="far fa-clock text-danger-emphasis"></i> Dernier produit: 
                <b>${data.lastProduit?.libelle.split(' ').slice(0, 4).join(' ') || '—'}</b>
              </p>
              <p class="card-text text-muted small mb-0">
                <i class="fa-solid fa-location-dot text-warning"></i> Adresse: 
                <b class="text-primary fs-6">${
                  data.lastProduit?.adresse.split(' ').slice(0, 4).join(' ') || '—'
                }</b>
              </p>
              <p class="card-text text-muted small mb-0">
                <i class="bi bi-2-square-fill"></i> Type: 
                <b class="text-primary fs-6">${
                  data.lastProduit?.calcul.split(' ').slice(0, 4).join(' ') || '—'
                }</b>
              </p>
              <small class="text-secondary-emphasis d-block mt-1">
                <i class="far fa-calendar-alt text-danger"></i> 
                ${
                  data.lastProduit?.createdAt
                    ? new Date(data.lastProduit.createdAt).toLocaleString('fr-FR')
                    : ''
                }
              </small>
            </div>

            <div class="d-flex flex-column flex-sm-row justify-content-between mt-3 gap-2">
              <button class="btn btn-primary btn-sm flex-fill" onclick="showUserProducts('${
                data.nameVendeur
              }')">
                <i class="fas fa-eye"></i> Voir
              </button>
              <button class="btn btn-danger btn-sm flex-fill" onclick="deleteUserProducts('${
                data.nameVendeur
              }')">
                <i class="fas fa-trash"></i> Supprimer
              </button>
            </div>
          </div>
        </div>
      `;

            container.appendChild(card);
          });
        } catch (err) {
          console.error('Erreur:', err);
          container.innerHTML = `<div class="alert alert-danger text-center">Erreur lors du chargement des données</div>`;
        }
      });

      // 🔹 عرض منتجات البائع مع Pagination (50 صف لكل صفحة)
      async function showUserProducts(nameVendeur, page = 1) {
        try {
          const res = await fetch(
            `/api/inventairePro/${encodeURIComponent(nameVendeur)}?page=${page}&limit=50`
          );
          const { produits, total, limit } = await res.json();

          if (!produits.length) {
            showToast(`Aucun produit trouvé pour ${nameVendeur}`, 'info');
            return;
          }

          document.getElementById('modalVendeurName').textContent = nameVendeur;
          document.querySelector('title').textContent = nameVendeur;

          const tbody = $('#modalProductsTable tbody');

          if ($.fn.dataTable.isDataTable('#modalProductsTable')) {
            $('#modalProductsTable').DataTable().clear().destroy();
          }

          tbody.empty();

          produits.forEach((p) => {
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
          <td>${p.libelle.split(' ').slice(0, 4).join(' ')}</td>
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
      async function deleteUserProducts(nameVendeur) {
        // طلب كلمة السر من المستخدم
        const password = prompt(
          `⚠️ Entrez le mot de passe pour supprimer tous les produits de ${nameVendeur} :`
        );

        // التحقق من كلمة السر
        if (password !== '654321') {
          showToast('❌ Mot de passe incorrect', 'error', 4000);
          return;
        }

        // تأكيد الحذف
        if (!confirm(`⚠️ Voulez-vous vraiment supprimer tous les produits de ${nameVendeur} ?`))
          return;

        try {
          const res = await fetch(`/api/inventairePro/${encodeURIComponent(nameVendeur)}`, {
            method: 'DELETE',
          });
          const result = await res.json();

          if (result.success) {
            showToast(
              `✅ Tous les produits de ${nameVendeur} ont été supprimés (${result.deletedCount})`,
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
        }
      }

      // 🔹 حذف جميع المنتجات مع كلمة سر
      async function deleteAllProducts() {
        // طلب كلمة السر من المستخدم
        const password = prompt('⚠️ Entrez le mot de passe pour supprimer toutes les données :');

        // التحقق من كلمة السر
        if (password !== '654321') {
          showToast('❌ Mot de passe incorrect', 'error', 4000);
          return;
        }

        // تأكيد الحذف
        if (!confirm('⚠️ Voulez-vous vraiment supprimer toutes les données de tous les vendeurs ?'))
          return;

        try {
          const res = await fetch('/api/inventairePro', { method: 'DELETE' });
          const result = await res.json();

          if (result.success) {
            showToast(
              result.message || '✅ Toutes les données ont été supprimées',
              'success',
              4000
            );
            location.reload();
          } else {
            showToast('Aucune donnée supprimée', 'warning', 4000);
          }
        } catch (err) {
          console.error(err);
          showToast('❌ Erreur lors de la suppression globale', 'error', 4000);
        }
      }

      // 🔹 دالة البحث عن البائعين
      function filterVendeurs() {
        const input = document.getElementById('searchVendeur').value.toLowerCase().trim();
        const cards = document.querySelectorAll('#vendeursContainer .cards');

        let found = 0;

        cards.forEach((card) => {
          const name = card.querySelector('.badge').textContent.toLowerCase();
          if (name.includes(input)) {
            card.style.display = '';
            found++;
          } else {
            card.style.display = 'none';
          }
        });

        if (input === '') showToast('🔍 Veuillez entrer un nom à rechercher.', 'warning');
        else if (found > 0) showToast(`✅ ${found} vendeur(s) trouvé(s).`, 'success');
        else showToast('❌ Aucun vendeur trouvé.', 'error');
      }

      // 🔹 دالة الرسائل
      function showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => {
          toast.className = `toast ${type}`;
        }, duration);
      }
    