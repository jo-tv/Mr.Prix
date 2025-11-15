/* =========================
   Helpers & Globals
========================= */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// مراجع عالمية لكل المخططات لتدميرها قبل إعادة الرسم
window._charts = window._charts || {
  countProduct: null,
  rayonChart: null,
  vendeur: null,
  adress: null,
  sharedTable: null,
  sharedTableType: null,
};

// دالة لإظهار/إخفاء رسالة التحميل
function setLoading(isLoading) {
  const loadingEl = document.getElementById('topLoad');
  if (!loadingEl) return;
  loadingEl.style.display = isLoading ? 'block' : 'none';
}

// دالة لتدمير أي مخطط قبل إعادة الرسم
function destroyChart(chartRef) {
  if (chartRef) {
    try {
      chartRef.destroy();
    } catch (e) {
      console.warn('Erreur destruction chart:', e);
    }
  }
}

/* =========================
   الدالة الأساسية initDashboard
========================= */
async function initDashboard() {
  try {
    setLoading(true);

    // --- جلب البيانات ---
    const [resp, response] = await Promise.all([
      fetch('/api/inventaireProo'),
      fetch('/api/Produits'),
    ]);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    if (!response.ok) throw new Error('HTTP ' + response.status);

    const produits = await resp.json();
    const data = await response.json();

    // --- إحصائيات عامة ---
    const vendeursUnique = Array.from(new Set(produits.map((p) => p.nameVendeur).filter(Boolean)));

    const adressesUnique = Array.from(new Set(produits.map((p) => p.adresse).filter(Boolean)));

    document.getElementById('usersCount').textContent = vendeursUnique.length;
    // 🔥 إزالة التكرار حسب ANPF والاحتفاظ بمنتج واحد فقط
    const produitsUniques = Object.values(
      produits.reduce((acc, item) => {
        if (!acc[item.anpf]) acc[item.anpf] = item; // نضيفه فقط أول مرة
        return acc;
      }, {})
    );

    // 🔥 تحديث عدد المنتجات بعد حذف التكرار
    document.getElementById(
      'productsCount'
    ).textContent = `${produitsUniques.length} / ${data.count}`;

    document.getElementById('adressCount').textContent = `${adressesUnique.length} / 738`;

    /* =========================
   🔹 تحميل ملف JSON (مثلاً من نفس المجلد)
========================= */

    async function loadAdressesJSON() {
      try {
        const response = await fetch('adresse.json'); // مسار ملف JSON
        if (!response.ok) throw new Error('Erreur lors du chargement du fichier JSON');
        const jsonData = await response.json();

        return jsonData
          .map((item) => item.ADRESSE) // ← استخدم ADRESSE كما في JSON
          .filter(Boolean); // استخراج العناوين
      } catch (err) {
        console.error(err);
        return [];
      }
    }

    // 🔹 حساب الإحصائيات
    let adressDT; // نجعلها global لكي لا يتم تدميرها كل مرة

    async function showAdressesStats(produits) {
      const jsonAdresses = await loadAdressesJSON(); // نفس دالة JSON
      const extra = getExtraAdresses(produits, jsonAdresses);

      fillExtraAdressTable(extra);
      initExtraAdressTable();

      // 🟢 العناوين المحسوبة فعلاً (casquette أو fondRayon)
      const computedAdresses = Array.from(
        new Set(
          produits
            .filter((p) => (p.calcul || '').trim() !== '')
            .map((p) => p.adresse)
            .filter(Boolean)
        )
      );

      // 🔴 العناوين الموجودة في JSON ولم تُحسب بعد
      const missingInDB = jsonAdresses.filter((a) => !computedAdresses.includes(a));

      // 🟡 العناوين المحسوبة داخل قاعدة البيانات
      const extraInDB = computedAdresses;

      // تحديث الكروت
      document.getElementById('dbAdressesCount').innerText = computedAdresses.length;
      document.getElementById('jsonAdressesCount').innerText = jsonAdresses.length;
      document.getElementById('missingCount').innerText = missingInDB.length;

      document.getElementById('adressCount').onclick = () =>
        openAdressModal(missingInDB, extraInDB);
    }

    function openAdressModal(missingInDB, extraInDB) {
      document.getElementById('adressModal').style.display = 'block';
      document.getElementById('overlay').style.display = 'block';

      fillAdressTable(missingInDB, extraInDB);

      // 🔄 إذا كان الجدول مهيأ مسبقاً، دمره ثم أنشئه مرة أخرى
      if ($.fn.DataTable.isDataTable('#adressTable')) {
        adressDT.destroy();
      }

      adressDT = $('#adressTable').DataTable({
        dom: 'Blfrtip',
        buttons: ['excelHtml5'],
        pageLength: 10,
        lengthMenu: [5, 10, 20, 50, 100],
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json' },
      });

      // ✔️ فلترة حسب data-type (موثوقة 100%)
      document.getElementById('filterAdress').onchange = () => {
        const filter = document.getElementById('filterAdress').value;

        $.fn.dataTable.ext.search = [];
        if (filter !== 'all') {
          $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
            if (settings.nTable.id !== 'adressTable') return true;
            const rowType = settings.aoData[dataIndex].nTr.getAttribute('data-type');
            return rowType === filter;
          });
        }
        adressDT.draw();
      };
    }
    // 🔹 زر إغلاق النافذة
    document.getElementById('closeAdressModal').onclick = () => {
      document.getElementById('adressModal').style.display = 'none';
      document.getElementById('overlay').style.display = 'none';
    };

    function fillAdressTable(missing, extra) {
      const tbody = document.querySelector('#adressTable tbody');

      // مسح الجدول
      tbody.innerHTML = '';

      // 🔴 التعامل مع العناوين غير المحسوبة
      missing.forEach((a) => {
        const tr = document.createElement('tr');
        tr.dataset.type = 'non';
        tr.innerHTML = `
      <td>${a}</td>
      <td><span class="badge bg-danger w-100 p-2">Non comptée</span></td>
    `;
        tbody.appendChild(tr);
      });

      // 🟢 التعامل مع العناوين المحسوبة
      extra.forEach((a) => {
        const tr = document.createElement('tr');
        tr.dataset.type = 'oui';
        tr.innerHTML = `
      <td>${a}</td>
      <td><span class="badge bg-success w-100 p-2">Déjà comptée</span></td>
    `;
        tbody.appendChild(tr);
      });
    }

    // 🔹 مثال استخدام
    showAdressesStats(produits);

    function getExtraAdresses(dbProducts, jsonAdresses) {
      return dbProducts
        .filter((p) => p.adresse && !jsonAdresses.includes(p.adresse))
        .map((p) => ({
          adresse: p.adresse,
          vendeur: p.nameVendeur,
          date: p.createdAt || 'Inconnu',
        }));
    }

    function fillExtraAdressTable(extraList) {
      const tbody = document.querySelector('#extraAdressTable tbody');
      tbody.innerHTML = '';

      document.getElementById('extraCount').innerText = extraList.length;

      extraList.forEach((item) => {
        const d = new Date(item.date);
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
          2,
          '0'
        )}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

        tbody.innerHTML += `
      <tr>
        <td><span class="badge bg-primary p-2 w-100">${item.adresse}</span></td>
        <td><span class="badge bg-success p-2 w-100">${item.vendeur.toUpperCase()}</span></td>
        <td><span class="badge bg-danger p-2 w-100">Adresse inconnue</span></td>
        <td><span class="badge bg-primary p-2 w-100">${formattedDate}</span></td>
      </tr>
    `;
      });
    }

    let extraDT = null;

    function initExtraAdressTable() {
      if ($.fn.DataTable.isDataTable('#extraAdressTable')) {
        extraDT.destroy();
      }

      extraDT = $('#extraAdressTable').DataTable({
        dom: 'Bflrtip',
        buttons: [
          {
            extend: 'excelHtml5',
            text: '📥 Télécharger Excel',
            title: 'Adresses_Inconnues',
          },
          {
            extend: 'print',
            text: '🖨️ Imprimer',
          },
        ],
        pageLength: 10,
        lengthMenu: [
          [5, 10, 20, 50, -1],
          [5, 10, 20, 50, 'Tout'],
        ],
        language: {
          url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json',
        },
      });
    }

    /* =========================
       1️⃣ Doughnut chart produits extraits
    ========================= */
    destroyChart(window._charts.countProduct);
    const ctxB = document.getElementById('countProduct').getContext('2d');
    const dataCount = Math.min(produitsUniques.length, data.count || 0);
    const remainder = (data.count || 0) - dataCount;
    const dataCountPercentage = data.count > 0 ? (dataCount / data.count) * 100 : 0;

    const centerText = {
      id: 'centerText',
      beforeDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        ctx.save();
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 44px Arial';
        ctx.fillStyle = dataCountPercentage >= 100 ? '#FF4D4D' : '#333333';
        ctx.fillText(`${dataCountPercentage.toFixed(2)}%`, centerX, centerY - 10);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Part de produits extraits', centerX, centerY + 24);
        ctx.restore();
      },
    };

    window._charts.countProduct = new Chart(ctxB, {
      type: 'doughnut',
      data: {
        labels: ['Extraits', 'Reste'],
        datasets: [
          {
            data: [dataCount, remainder],
            backgroundColor: ['#FF6384', '#7062da'],
            hoverBackgroundColor: ['#FF6384', '#7062da'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Comparaison produits extraits' },
        },
      },
      plugins: [centerText],
    });

    /* =========================
       2️⃣ Rayon chart
    ========================= */
    destroyChart(window._charts.rayonChart);
    const ctx = document.getElementById('rayonChart').getContext('2d');
    const rayons = {
      Électricité: { regex: /^E-/i, objectif: 105 },
      Sanitaire: { regex: /^S-/i, objectif: 59 },
      Outillage: { regex: /^O-/i, objectif: 81 },
      Quin: { regex: /^Q-/i, objectif: 78 },
      Bois: { regex: /^B-/i, objectif: 11 },
      Jardin: { regex: /^J-/i, objectif: 97 },
      Décorations: { regex: /^D-/i, objectif: 143 },
      Cuisine: { regex: /^C-/i, objectif: 48 },
      TG: { regex: /^TG-/i, objectif: 17 },
      Podiome: { regex: /^P-/i, objectif: 34 },
      Persentoir: { regex: /^PR-/i, objectif: 9 },
      Réserve: { regex: /^R-/i, objectif: 52 },
      TêteCaisse: { regex: /^TC-/i, objectif: 3 },
    };
    // 🔥 إزالة التكرار حسب adresse والاحتفاظ بمنتج واحد فقط لكل adresse
    const produitsParAdresseUnique = Object.values(
      produits.reduce((acc, item) => {
        const adr = item.adresse || '';
        if (!acc[adr]) acc[adr] = item; // نحتفظ بأول منتج فقط لكل adresse
        return acc;
      }, {})
    );

    const rayonNames = Object.keys(rayons);

    const rayonCounts = rayonNames.map(
      (r) =>
        produitsParAdresseUnique.filter((p) => p.adresse && rayons[r].regex.test(p.adresse)).length
    );
    console.log(rayonCounts);
    const rayonObjectifs = rayonNames.map((r) => rayons[r].objectif);

    window._charts.rayonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rayonNames,
        datasets: [
          { label: 'Objectif', data: rayonObjectifs, backgroundColor: '#0ba360' },
          { label: 'Réel', data: rayonCounts, backgroundColor: 'rgba(54, 162, 235, 0.8)' },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Nombre d'adresses" } },
        },
        plugins: {
          title: {
            display: true,
            text: 'Comparaison adresses par rayon',
            font: { size: 18 },
          },
          legend: { position: 'bottom' },
        },
      },
    });

    /* =========================
       3️⃣ Tableau adresses partagées (vendeurs)
    ========================= */
    const groupedByAdresse = {};
    produits.forEach((p) => {
      if (!p.adresse) return;
      if (!groupedByAdresse[p.adresse])
        groupedByAdresse[p.adresse] = { vendeursSet: new Set(), produitsCount: 0 };
      if (p.nameVendeur) groupedByAdresse[p.adresse].vendeursSet.add(p.nameVendeur);
      groupedByAdresse[p.adresse].produitsCount++;
    });
    const sharedEntries = Object.entries(groupedByAdresse)
      .map(([adresse, info]) => ({
        adresse,
        vendeurs: Array.from(info.vendeursSet),
        vendeursCount: info.vendeursSet.size,
        produitsCount: info.produitsCount,
      }))
      .filter((e) => e.vendeursCount > 1)
      .sort((a, b) => b.vendeursCount - a.vendeursCount || b.produitsCount - a.produitsCount);
    document.getElementById('sharedAddresses').textContent = sharedEntries.length;

    const tbody = document.querySelector('#sharedTable tbody');
    tbody.innerHTML = sharedEntries
      .map(
        (r) =>
          `<tr><td class="text-bg-danger">${escapeHtml(
            r.adresse
          )}</td><td class="text-bg-primary">${escapeHtml(
            r.vendeurs.join(' ; ').toUpperCase()
          )}</td><td class="text-bg-danger">${r.vendeursCount}</td></tr>`
      )
      .join('');

    if ($.fn.dataTable && $.fn.dataTable.isDataTable('#sharedTable'))
      $('#sharedTable').DataTable().clear().destroy();
    $('#sharedTable').DataTable({
      pageLength: 5,
      responsive: true,
      lengthMenu: [5, 10, 25],
      language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json' },
    });

    /* =========================
       4️⃣ Tableau casquette/fondRayon
    ========================= */
    const groupedByAdresseA = {};
    produits.forEach((p) => {
      if (!p.adresse) return;
      if (!groupedByAdresseA[p.adresse])
        groupedByAdresseA[p.adresse] = { casquette: 0, fondrayon: 0 };

      const type = (p.calcul?.trim() || p['calcul ']?.trim() || '').toLowerCase();
      if (type === 'casquette') groupedByAdresseA[p.adresse].casquette++;
      else if (type === 'fondrayon') groupedByAdresseA[p.adresse].fondrayon++;
    });

    const sharedEntriese = Object.entries(groupedByAdresseA)
      .map(([adresse, counts]) => ({
        adresse,
        casquette: counts.casquette,
        fondrayon: counts.fondrayon,
      }))
      .filter((e) => e.casquette > 0 || e.fondrayon > 0)
      .sort((a, b) => b.casquette + b.fondrayon - (a.casquette + a.fondrayon));

    const tbodyType = document.querySelector('#sharedTableType tbody');
    tbodyType.innerHTML = sharedEntriese
      .map(
        (r) =>
          `<tr>
        <td>${escapeHtml(r.adresse)}</td>
        <td>${r.casquette}</td>
        <td>${r.fondrayon}</td>
      </tr>`
      )
      .join('');

    // ✅ تدمير الجدول القديم فقط إذا كان موجودًا
    if ($.fn.dataTable.isDataTable('#sharedTableType')) {
      $('#sharedTableType').DataTable().clear().destroy();
    }

    $('#sharedTableType').DataTable({
      pageLength: 5,
      responsive: true,
      lengthMenu: [5, 10, 25, 100],
      language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json' },
      columnDefs: [{ targets: '_all', className: 'text-center' }],
      dom: 'Bflrtip',
      buttons: [
        {
          extend: 'excelHtml5',
          text: '<i class="fa fa-file-excel"></i> Excel',
          className: 'btn btn-success btn-sm',
        },
        {
          extend: 'print',
          text: '<i class="fa fa-print"></i> Imprimer',
          className: 'btn btn-secondary btn-sm',
        },
      ],
    });

    /* =========================
       5️⃣ Top 10 vendeurs chart
    ========================= */
    const vendeursCountMap = {};
    produits.forEach((p) => {
      if (p.nameVendeur)
        vendeursCountMap[p.nameVendeur] = (vendeursCountMap[p.nameVendeur] || 0) + 1;
    });
    const top10 = Object.entries(vendeursCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topLabels = top10.map((v) => v[0]),
      topValues = top10.map((v) => v[1]);

    destroyChart(window._charts.vendeur);
    const ctxV = document.getElementById('vendeurChart')?.getContext('2d');
    if (ctxV) {
      window._charts.vendeur = new Chart(ctxV, {
        type: 'bar',
        data: {
          labels: topLabels,
          datasets: [
            {
              label: 'Nombre de produits',
              data: topValues,
              backgroundColor: [
                '#1abc9c',
                '#3498db',
                '#9b59b6',
                '#e67e22',
                '#e74c3c',
                '#2ecc71',
                '#16a085',
                '#f1c40f',
                '#2980b9',
                '#8e44ad',
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { autoSkip: true, maxRotation: 45, minRotation: 30, font: { size: 12 } },
            },
            y: { beginAtZero: true, ticks: { precision: 0, stepSize: 1 } },
          },
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Top 10 vendeurs (par nombre de produits)' },
            tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} produits` } },
          },
        },
      });
    }

    /* =========================
       6️⃣ Adresses utilisées chart
    ========================= */
    destroyChart(window._charts.adress);
    const ctxA = document.getElementById('adressChart')?.getContext('2d');
    if (ctxA) {
      const totalAdresses = 738;
      const percentageUsed = ((adressesUnique.length / totalAdresses) * 100).toFixed(2);
      window._charts.adress = new Chart(ctxA, {
        type: 'bar',
        data: {
          labels: [' utilisées', ' totale'],
          datasets: [
            {
              label: 'Adresses',
              data: [adressesUnique.length, totalAdresses],
              backgroundColor: ['#2575fc', '#4facfe'],
              borderWidth: 1,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              max: totalAdresses,
              ticks: { stepSize: Math.max(1, Math.ceil(totalAdresses / 7)) },
            },
            y: { grid: { display: false } },
          },
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: `Utilisation des adresses (sur ${totalAdresses}) - ${percentageUsed}% utilisés`,
              font: { size: 24, weight: 'bold' },
              color: '#2575fc',
            },
            tooltip: {
              callbacks: {
                label: (ctx) =>
                  `${ctx.parsed.x} adresses (${((ctx.parsed.x / totalAdresses) * 100).toFixed(
                    2
                  )}%)`,
              },
            },
          },
        },
      });
    }
  } catch (err) {
    console.error('Erreur lors du chargement du dashboard:', err);
    const container = document.querySelector('.container-fluid') || document.body;
    const errEl = document.createElement('div');
    errEl.className = 'alert alert-danger mt-3';
    errEl.textContent = 'Erreur lors du chargement du dashboard. Vérifiez la console.';
    container.prepend(errEl);
  } finally {
    setLoading(false);
  }
}

/* =========================
   دالة إعادة التحميل بدون إعادة تحميل الصفحة
========================= */
async function reloadDashboard() {
  try {
    setLoading(true);
    await initDashboard();
  } catch (err) {
    console.error('Erreur lors de la recharge du dashboard:', err);
    alert('Erreur lors de la recharge des données. Vérifiez la console.');
  } finally {
    setLoading(false);
  }
}

/* =========================
   Event Listeners
========================= */
document.addEventListener('DOMContentLoaded', initDashboard);

// الزر لم يعد يعيد تحميل البيانات، بل يفتح صفحة جديدة
document.getElementById('reloadBtn')?.addEventListener('click', () => {
  window.location.href = '/dashboard'; // أو أي صفحة تريدها
});

// روابط الصفحات
document
  .querySelector('.usersCount')
  ?.addEventListener('click', () => (window.location.href = '/listVendeurs'));
document
  .querySelector('.usersPro')
  ?.addEventListener('click', () => (window.location.href = '/produitTotal'));
document
  .querySelector('.Adresses')
  ?.addEventListener('click', () => (window.location.href = '#sharedTable'));
document
  .querySelector('.refe')
  ?.addEventListener('click', () => (window.location.href = '#extraAdressTable'));
