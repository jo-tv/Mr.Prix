
      function formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 60) return `${diffSec} sec`; // أقل من دقيقة
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin} min ${diffSec % 60} sec`; // أقل من ساعة
        const diffHrs = Math.floor(diffMin / 60);
        if (diffHrs < 24) return `${diffHrs} h ${diffMin % 60} min`; // أقل من يوم
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays < 7) return `${diffDays} jour${diffDays > 1 ? 's' : ''}`; // أقل من أسبوع
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks < 4) return `${diffWeeks} semaine${diffWeeks > 1 ? 's' : ''}`; // أقل من شهر
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths} mois`; // أقل من سنة
        const diffYears = Math.floor(diffDays / 365);
        return `${diffYears} an${diffYears > 1 ? 's' : ''}`; // سنة أو أكثر
      }

      async function loadPagePasswords() {
        try {
          const res = await fetch('/api/inventaireProo');
          const vendeurs = await res.json();

          // 🔹 Récupérer le dernier createdAt pour chaque vendeur
          const latestBySeller = new Map();

          vendeurs.forEach((item) => {
            const seller = item.nameVendeur;
            const time = new Date(item.createdAt);

            if (!latestBySeller.has(seller) || time > latestBySeller.get(seller).time) {
              latestBySeller.set(seller, { seller, time });
            }
          });

          const filtered = Array.from(latestBySeller.values());
          const now = new Date();

          // 🔹 Compter le nombre des produits par vendeur
          const sellerCount = {};

          vendeurs.forEach((item) => {
            const seller = item.nameVendeur;
            sellerCount[seller] = (sellerCount[seller] || 0) + 1;
          });

          // 🔹 Calculer les informations
          filtered.forEach((s) => {
            s.totalProducts = sellerCount[s.seller];

            const last = new Date(s.time);
            const diffMs = now - last;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);

            if (diffSec <= 30) {
              s.status = 'En ligne';
              s.color = 'green';
            } else if (diffMin >= 10) {
              s.status = 'Hors ligne';
              s.color = 'red';
            } else {
              s.status = 'Actif récemment';
              s.color = 'orange';
            }

            filtered.forEach((s) => {
              s.totalProducts = sellerCount[s.seller];

              // حساب آخر اتصال
              s.timeAgo = formatTimeAgo(s.time);

              // حساب الحالة
              const diffSec = Math.floor((new Date() - new Date(s.time)) / 1000);
              const diffMin = Math.floor(diffSec / 60);

              if (diffSec <= 30) {
                s.status = 'En ligne';
                s.color = 'green';
              } else if (diffMin >= 10) {
                s.status = 'Hors ligne';
                s.color = 'red';
              } else {
                s.status = 'Actif récemment';
                s.color = 'orange';
              }
            });
          });
          console.log(filtered)
          // 🟦 Remplir le tableau
          const tbody = document.querySelector('#sharedTableType tbody');
          tbody.innerHTML = filtered
            .map(
              (r) => `
            <tr>
              <td>${r.seller}</td>
              <td>${r.totalProducts}</td>

              <td>
                <span style="
                    display:inline-flex;
                    align-items:center;
                    gap:6px;
                ">
                  <span style="
                      width:12px;
                      height:12px;
                      border-radius:50%;
                      background:${r.color};
                      display:inline-block;
                  "></span>
                  ${r.status}
                </span>
              </td>

              <td>${r.timeAgo}</td>
            </tr>`
            )
            .join('');

          // 🔹 Reconstruire DataTable
          if ($.fn.dataTable.isDataTable('#sharedTableType')) {
            $('#sharedTableType').DataTable().clear().destroy();
          }

          const table = $('#sharedTableType').DataTable({
            pageLength: 5,
            responsive: true,
            lengthMenu: [5, 10, 25, 50],
            language: {
              url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json',
            },
            columnDefs: [{ targets: '_all', className: 'text-center' }],
            dom: 'Bflrtip',
            buttons: [
              {
                extend: 'print',
                text: '<i class="fa fa-print"></i> Imprimer',
                className: 'btn btn-secondary btn-sm',
              },
            ],
            pagingType: 'full_numbers',
          });

          // 🔍 Recherche partielle par vendeur
          document.querySelector('#searchVendeur').addEventListener('keyup', function () {
            table.search(this.value).draw();
          });
        } catch (error) {
          console.error('❌ Erreur lors du chargement:', error);
        }
      }

      loadPagePasswords();
    