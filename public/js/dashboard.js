// مراجع عالمية لكل المخططات لتدميرها قبل إعادة الرسم
window._charts = window._charts || {
    countProduct: null,
    rayonChart: null,
    vendeur: null,
    adress: null,
    sharedTable: null,
    sharedTableType: null
};

// دالة لإظهار/إخفاء رسالة التحميل
function setLoading(isLoading) {
    const loadingEl = document.getElementById("topLoad");
    if (!loadingEl) return;
    loadingEl.style.display = isLoading ? "block" : "none";
}

// دالة لتدمير أي مخطط قبل إعادة الرسم
function destroyChart(chartRef) {
    if (chartRef) {
        try {
            chartRef.destroy();
        } catch (e) {
            console.warn("Erreur destruction chart:", e);
        }
    }
}

/* =========================
   الدالة الأساسية initDashboard
========================= */
async function initDashboard() {
    // ----------------- خيارات الأداء -----------------
    const ENABLE_WORKER = true;
    const WORKER_THRESHOLD = 20000;
    const BATCH_ROWS = 50;
    const CHARTS = window._charts || (window._charts = {});

    // ----------------- Helpers -----------------
    const $ = window.jQuery;
    const q = s => document.querySelector(s);
    const qId = id => document.getElementById(id);
    const safe = v => (v === null || v === undefined ? "" : String(v));
    const esc = s =>
        String(s ?? "").replace(
            /[&<>"'`=\/]/g,
            c =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                    "/": "&#x2F;",
                    "`": "&#x60;",
                    "=": "&#x3D;"
                })[c]
        );
    function destroyChart(chart) {
        try {
            if (chart && chart.destroy) chart.destroy();
        } catch (e) {
            console.warn(e);
        }
    }

    // batch DOM writes
    const domQueue = [];
    function setText(id, text) {
        domQueue.push(() => {
            const el = qId(id);
            if (el) el.textContent = text;
        });
    }
    function applyDomQueue() {
        if (!domQueue.length) return;
        domQueue.forEach(fn => fn());
        domQueue.length = 0;
    }

    // worker factory (embedded)
    function createWorker() {
        const src = `
      self.onmessage = function(e) {
        const produits = e.data.produits || [];
        const result = {
          vendeursUnique: [],
          adressesUnique: [],
          produitsByAnpfCount: 0,
          produitsByAnpfSample: [],
          produitsInexistants: [],
          vendeursCountMap: {},
          sharedAddresses: [],
          addressesType: [],
          produitsParAdresseSample: []
        };

        const vendeursSet = new Set();
        const adressesSet = new Set();
        const anpfMap = Object.create(null);
        const vendeursCountMap = Object.create(null);
        const grouped = Object.create(null);
        const groupedType = Object.create(null);
        const produitsParAdr = Object.create(null);
        const inexistants = [];

        for (let i=0;i<produits.length;i++){
          const p = produits[i];
          if (!p) continue;
          if (p.nameVendeur) { vendeursSet.add(p.nameVendeur); vendeursCountMap[p.nameVendeur] = (vendeursCountMap[p.nameVendeur]||0)+1; }
          if (p.adresse) { adressesSet.add(p.adresse); if (!produitsParAdr[p.adresse]) produitsParAdr[p.adresse]=p; }
          if (p.anpf && !anpfMap[p.anpf]) anpfMap[p.anpf]=p;
          if (typeof p.libelle === 'string' && p.libelle.includes('Produit Inexistant')) inexistants.push(p);
          if (p.adresse) {
            if (!grouped[p.adresse]) grouped[p.adresse] = { vendeursSet: new Set(), produitsCount: 0 };
            if (p.nameVendeur) grouped[p.adresse].vendeursSet.add(p.nameVendeur);
            grouped[p.adresse].produitsCount++;
            if (!groupedType[p.adresse]) groupedType[p.adresse] = { casquette:0, fondrayon:0, reserve:0 };
            const type = (p.calcul || p['calcul '] || '').trim().toLowerCase();
            if (type==='casquette') groupedType[p.adresse].casquette++;
            else if (type==='fondrayon') groupedType[p.adresse].fondrayon++;
            else if (type==='reserve') groupedType[p.adresse].reserve++;
          }
        }

        result.vendeursUnique = Array.from(vendeursSet);
        result.adressesUnique = Array.from(adressesSet);
        result.produitsByAnpfCount = Object.keys(anpfMap).length;
        result.produitsByAnpfSample = Object.values(anpfMap).slice(0,20);
        result.produitsInexistants = inexistants;
        result.vendeursCountMap = vendeursCountMap;

        const shared = [];
        for (const adr in grouped) {
          const info = grouped[adr];
          const vendeurs = Array.from(info.vendeursSet);
          if (vendeurs.length > 1) shared.push({ adresse: adr, vendeurs, vendeursCount: vendeurs.length, produitsCount: info.produitsCount });
        }
        result.sharedAddresses = shared;

        const types = [];
        for (const adr in groupedType) {
          const c = groupedType[adr];
          if (c.casquette>0 || c.fondrayon>0 || c.reserve>0) types.push({ adresse: adr, casquette: c.casquette, fondrayon: c.fondrayon, reserve: c.reserve });
        }
        result.addressesType = types;
        result.produitsParAdresseSample = Object.values(produitsParAdr).slice(0,20);

        self.postMessage({ ok: true, payload: result });
      };
    `;
        const blob = new Blob([src], { type: "application/javascript" });
        return new Worker(URL.createObjectURL(blob));
    }

    // ----------------- Main -----------------
    try {
        setLoading(true);

        const [resp, response] = await Promise.all([
            fetch("/api/inventaireProo"),
            fetch("/api/Produits")
        ]);
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        if (!response.ok) throw new Error("HTTP " + response.status);

        const produits = await resp.json();
        const meta = await response.json();

        if (!Array.isArray(produits))
            throw new Error("Problème: produits ليست مصفوفة");

        // محاولة استخدام Worker إذا مفعل والكم كبير
        let agg = null;
        const tryUseWorker =
            ENABLE_WORKER &&
            window.Worker &&
            produits.length >= WORKER_THRESHOLD;
        if (tryUseWorker) {
            try {
                agg = await new Promise((resolve, reject) => {
                    const w = createWorker();
                    const timer = setTimeout(() => {
                        w.terminate();
                        reject(new Error("Worker timeout"));
                    }, 30000);
                    w.onmessage = e => {
                        clearTimeout(timer);
                        w.terminate();
                        if (e.data && e.data.ok) resolve(e.data.payload);
                        else reject(new Error("Worker error"));
                    };
                    w.onerror = err => {
                        clearTimeout(timer);
                        w.terminate();
                        reject(err || new Error("Worker failed"));
                    };
                    w.postMessage({ produits });
                });
            } catch (err) {
                console.warn("Worker failed, fallback to main thread:", err);
                agg = null;
            }
        }

        if (!agg) {
            // main-thread aggregation
            const vendeursSet = new Set();
            const adressesSet = new Set();
            const anpfMap = Object.create(null);
            const produitsInexistants = [];
            const vendeursCountMap = Object.create(null);
            const grouped = Object.create(null);
            const groupedType = Object.create(null);
            const produitsParAdr = Object.create(null);

            for (let i = 0; i < produits.length; i++) {
                const p = produits[i];
                if (!p) continue;
                if (p.nameVendeur) {
                    vendeursSet.add(p.nameVendeur);
                    vendeursCountMap[p.nameVendeur] =
                        (vendeursCountMap[p.nameVendeur] || 0) + 1;
                }
                if (p.adresse) {
                    adressesSet.add(p.adresse);
                    if (!produitsParAdr[p.adresse])
                        produitsParAdr[p.adresse] = p;
                }
                if (p.anpf && !anpfMap[p.anpf]) anpfMap[p.anpf] = p;
                if (
                    typeof p.libelle === "string" &&
                    p.libelle.includes("Produit Inexistant")
                )
                    produitsInexistants.push(p);

                if (p.adresse) {
                    if (!grouped[p.adresse])
                        grouped[p.adresse] = {
                            vendeursSet: new Set(),
                            produitsCount: 0
                        };
                    if (p.nameVendeur)
                        grouped[p.adresse].vendeursSet.add(p.nameVendeur);
                    grouped[p.adresse].produitsCount++;
                    if (!groupedType[p.adresse])
                        groupedType[p.adresse] = {
                            casquette: 0,
                            fondrayon: 0,
                            reserve: 0
                        };
                    const t = (p.calcul || p["calcul "] || "")
                        .trim()
                        .toLowerCase();
                    if (t === "casquette") groupedType[p.adresse].casquette++;
                    else if (t === "fondrayon")
                        groupedType[p.adresse].fondrayon++;
                    else if (t === "reserve") groupedType[p.adresse].reserve++;
                }
            }

            const shared = [];
            for (const adr in grouped) {
                const info = grouped[adr];
                const vendeurs = Array.from(info.vendeursSet);
                if (vendeurs.length > 1)
                    shared.push({
                        adresse: adr,
                        vendeurs,
                        vendeursCount: vendeurs.length,
                        produitsCount: info.produitsCount
                    });
            }

            const types = [];
            for (const adr in groupedType) {
                const c = groupedType[adr];
                if (c.casquette > 0 || c.fondrayon > 0 || c.reserve > 0)
                    types.push({
                        adresse: adr,
                        casquette: c.casquette,
                        fondrayon: c.fondrayon,
                        reserve: c.reserve
                    });
            }

            agg = {
                vendeursUnique: Array.from(vendeursSet),
                adressesUnique: Array.from(adressesSet),
                produitsByAnpfCount: Object.keys(anpfMap).length,
                produitsByAnpfSample: Object.values(anpfMap).slice(0, 20),
                produitsInexistants,
                vendeursCountMap,
                sharedAddresses: shared,
                addressesType: types,
                produitsParAdresseSample: Object.values(produitsParAdr).slice(
                    0,
                    20
                )
            };
        }

        // quick counters
        setText("usersCount", agg.vendeursUnique.length);
        setText(
            "productsCount",
            `${agg.produitsByAnpfCount} / ${meta.count || 0}`
        );
        setText("adressCount", `${agg.adressesUnique.length} / 741`);
        applyDomQueue();

        // fill produits inexistants (batched)
        (async function fillInexistants() {
            const arr = agg.produitsInexistants || [];
            setText("jsonAdressesCount", arr.length);
            applyDomQueue();
            if (arr.length > 0) q(".totalPro")?.classList.add("jello-vertical");

            const tbody = q("#produitInexistant tbody");
            if (!tbody) return;
            tbody.innerHTML = "";

            let idx = 0;
            function step() {
                const frag = document.createDocumentFragment();
                for (
                    let i = 0;
                    i < BATCH_ROWS && idx < arr.length;
                    i++, idx++
                ) {
                    const prod = arr[idx];
                    const tr = document.createElement("tr");
                    tr.style.padding = "8px";
                    tr.innerHTML =
                        "" +
                        '<td style="padding:8px;background:#dd9261b6 ;">' +
                        esc((prod.nameVendeur || "").split("@")[0] || "-") +
                        "</td>" +
                        '<td style="padding:8px;background:#dd9261b6 ;">' +
                        esc(prod.libelle) +
                        "</td>" +
                        '<td style="padding:8px;background:#dd9261b6 ;">' +
                        esc(prod.gencode) +
                        "</td>" +
                        '<td style="padding:8px;background:#dd9261b6 ;">' +
                        esc(prod.adresse || "-") +
                        "</td>" +
                        '<td style="padding:8px;background:#dd9261b6 ;">' +
                        esc(prod.qteInven) +
                        "</td>" +
                        '<td style="padding:8px;background:#dd9261b6 ;">' +
                        esc(prod.calcul) +
                        "</td>";
                    frag.appendChild(tr);
                }
                tbody.appendChild(frag);
                if (idx < arr.length) requestAnimationFrame(step);
                else {
                    if ($.fn.DataTable.isDataTable("#produitInexistant"))
                        $("#produitInexistant").DataTable().clear().destroy();
                    $("#produitInexistant").DataTable({
                        dom: "Bflrtip",
                        buttons: [
                            {
                                extend: "excelHtml5",
                                text: "📥 Télécharger Excel",
                                title: "Adresses_Inconnues"
                            },
                            { extend: "print", text: "🖨️ Imprimer" }
                        ],
                        pageLength: 10,
                        lengthMenu: [
                            [5, 10, 20, 50, -1],
                            [5, 10, 20, 50, "Tout"]
                        ],
                        language: {
                            url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json"
                        },
                        pagingType: "full_numbers"
                    });
                }
            }
            requestAnimationFrame(step);
        })();

        // load adresse.json and compute stats
        async function loadAdressesJSON() {
            try {
                const r = await fetch("adresse.json");
                if (!r.ok) throw new Error("adresse.json load failed");
                const json = await r.json();
                return (json || []).map(it => it.ADRESSE).filter(Boolean);
            } catch (e) {
                console.warn("adresse.json fail", e);
                return [];
            }
        }

        async function showAdressesStats() {
            const jsonAdrs = await loadAdressesJSON();
            const computed = new Set();
            for (let i = 0; i < produits.length; i++) {
                const p = produits[i];
                if (p && (p.calcul || "").trim() !== "" && p.adresse)
                    computed.add(p.adresse);
            }
            const computedArr = Array.from(computed);
            const missingInDB = jsonAdrs.filter(a => !computed.has(a));
            const extraInDB = computedArr;

            setText("dbAdressesCount", computedArr.length);
            setText("missingCount", missingInDB.length);
            applyDomQueue();

            q(".adressCount")?.addEventListener("click", () =>
                openAdressModal(missingInDB, extraInDB)
            );

            const extra = getExtraAdresses(produits, jsonAdrs);
            fillExtraAdressTable(extra);
            initExtraAdressTable();
        }

        function getExtraAdresses(dbProducts, jsonAddresses) {
            const jsonSet = new Set(jsonAddresses || []);
            const map = Object.create(null);
            for (let i = 0; i < dbProducts.length; i++) {
                const p = dbProducts[i];
                if (!p || !p.adresse || jsonSet.has(p.adresse)) continue;
                const key = `${p.adresse}__${p.nameVendeur}`;
                if (!map[key])
                    map[key] = {
                        adresse: p.adresse,
                        vendeur: p.nameVendeur,
                        count: 0,
                        lastDate: p.createdAt || "Inconnu"
                    };
                map[key].count++;
                if (p.createdAt && p.createdAt > map[key].lastDate)
                    map[key].lastDate = p.createdAt;
            }
            return Object.values(map);
        }

        function fillExtraAdressTable(extraList) {
            const tbody = q("#extraAdressTable tbody");
            if (!tbody) return;
            tbody.innerHTML = "";
            qId("extraCount") &&
                (qId("extraCount").innerText = extraList.length);
            if (extraList.length > 0)
                q(".refe")?.classList.add("jello-vertical");

            let idx = 0;
            function step() {
                const frag = document.createDocumentFragment();
                for (
                    let i = 0;
                    i < BATCH_ROWS && idx < extraList.length;
                    i++, idx++
                ) {
                    const item = extraList[idx];
                    const d = new Date(item.lastDate);
                    const formatted =
                        d.getFullYear() +
                        "-" +
                        String(d.getMonth() + 1).padStart(2, "0") +
                        "-" +
                        String(d.getDate()).padStart(2, "0") +
                        " " +
                        String(d.getHours()).padStart(2, "0") +
                        ":" +
                        String(d.getMinutes()).padStart(2, "0") +
                        ":" +
                        String(d.getSeconds()).padStart(2, "0");
                    const tr = document.createElement("tr");
                    tr.innerHTML =
                        "" +
                        '<td><span class="badge bg-primary p-2 w-100">' +
                        esc(item.adresse) +
                        "</span></td>" +
                        '<td><span class="badge bg-success p-2 w-100">' +
                        esc((item.vendeur || "").toUpperCase().split("@")[0]) +
                        "</span></td>" +
                        '<td><span class="badge bg-danger p-2 w-100">Adresse inconnue</span></td>' +
                        '<td><span class="badge bg-primary p-2 w-100">' +
                        formatted +
                        "</span></td>" +
                        '<td><span class="badge bg-primary p-2 w-100">' +
                        item.count +
                        "</span></td>";
                    frag.appendChild(tr);
                }
                tbody.appendChild(frag);
                if (idx < extraList.length) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        async function initExtraAdressTable(extraList) {
            if (!q("#extraAdressTable")) return;

            // إذا الجدول موجود مسبقًا، احذفه أولًا
            if ($.fn.DataTable.isDataTable("#extraAdressTable")) {
                $("#extraAdressTable").DataTable().clear().destroy();
            }

            // تهيئة DataTable فارغ
            const table = $("#extraAdressTable").DataTable({
                dom: "Bflrtip",
                buttons: [
                    {
                        extend: "excelHtml5",
                        text: "📥 Télécharger Excel",
                        title: "Adresses_Inconnues"
                    },
                    { extend: "print", text: "🖨️ Imprimer" }
                ],
                paging: true,
                pageLength: 10,
                lengthChange: true,
                lengthMenu: [
                    [5, 10, 20, 50, -1],
                    [5, 10, 20, 50, "Tout"]
                ],
                pagingType: "full_numbers",
                language: {
                    url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json"
                }
            });

            // إضافة الصفوف مباشرة للـ DataTable
            extraList.forEach(item => {
                const d = new Date(item.lastDate);
                const formatted =
                    d.getFullYear() +
                    "-" +
                    String(d.getMonth() + 1).padStart(2, "0") +
                    "-" +
                    String(d.getDate()).padStart(2, "0") +
                    " " +
                    String(d.getHours()).padStart(2, "0") +
                    ":" +
                    String(d.getMinutes()).padStart(2, "0") +
                    ":" +
                    String(d.getSeconds()).padStart(2, "0");

                table.row.add([
                    `<span class="badge bg-primary p-2 w-100">${esc(
                        item.adresse
                    )}</span>`,
                    `<span class="badge bg-success p-2 w-100">${esc(
                        (item.vendeur || "").toUpperCase().split("@")[0]
                    )}</span>`,
                    `<span class="badge bg-danger p-2 w-100">Adresse inconnue</span>`,
                    `<span class="badge bg-primary p-2 w-100">${formatted}</span>`,
                    `<span class="badge bg-primary p-2 w-100">${item.count}</span>`
                ]);
            });

            // رسم الصفوف بعد الإضافة
            table.draw();

            // تحديث عدد العناصر في الواجهة
            qId("extraCount") &&
                (qId("extraCount").innerText = extraList.length);

            // إضافة تأثير إذا هناك بيانات
            if (extraList.length > 0)
                q(".refe")?.classList.add("jello-vertical");
        }

        // openAdressModal + fillAdressTableAsync
        let AdressDT = null;
        function openAdressModal(missingInDB, extraInDB) {
            const modal = qId("adressModal");
            const overlay = qId("overlay");
            const loader = qId("adressLoading");
            const table = qId("adressTable");
            if (!modal || !overlay || !loader || !table) return;
            modal.style.display = "block";
            overlay.style.display = "block";
            loader.style.display = "block";
            table.style.display = "none";

            if ($.fn.DataTable.isDataTable("#adressTable")) {
                AdressDT?.destroy();
            }

            fillAdressTableAsync(missingInDB, extraInDB, () => {
                setTimeout(() => {
                    AdressDT = $("#adressTable").DataTable({
                        dom: "Blfrtip",
                        buttons: ["excelHtml5"],
                        pageLength: 10,
                        lengthMenu: [5, 10, 20, 50, 100],
                        language: {
                            url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json"
                        },
                        pagingType: "full_numbers",
                        columnDefs: [
                            { targets: 2, visible: false, searchable: true }
                        ]
                    });
                    loader.style.display = "none";
                    table.style.display = "table";
                }, 50);
            });

            const filterEl = qId("filterAdress");
            if (filterEl) {
                filterEl.onchange = () => {
                    const filter = filterEl.value;
                    $.fn.dataTable.ext.search =
                        $.fn.dataTable.ext.search.filter(
                            f => f._isAdressFilter !== true
                        );
                    if (filter !== "all") {
                        const filterFn = function (settings, data) {
                            if (settings.nTable.id !== "adressTable")
                                return true;
                            return data[2] === filter;
                        };
                        filterFn._isAdressFilter = true;
                        $.fn.dataTable.ext.search.push(filterFn);
                    }
                    AdressDT.draw();
                };
            }
        }

        qId("closeAdressModal")?.addEventListener("click", () => {
            qId("adressModal").style.display = "none";
            qId("overlay").style.display = "none";
            window.location.href = "/dashboard";
        });

        function fillAdressTableAsync(missing, extra, cb) {
            const tbody = q("#adressTable tbody");
            if (!tbody) return cb?.();
            tbody.innerHTML = "";
            const all = [];
            missing.forEach(a => all.push({ addr: a, type: "non" }));
            extra.forEach(a => all.push({ addr: a, type: "oui" }));
            let i = 0;
            function batch() {
                const frag = document.createDocumentFragment();
                for (let k = 0; k < BATCH_ROWS && i < all.length; k++, i++) {
                    const it = all[i];
                    const tr = document.createElement("tr");
                    const td1 = document.createElement("td");
                    td1.textContent = it.addr;
                    const td2 = document.createElement("td");
                    td2.innerHTML =
                        it.type === "non"
                            ? '<span class="badge bg-danger w-100 p-2">Non comptée</span>'
                            : '<span class="badge bg-success w-100 p-2">Déjà comptée</span>';
                    const td3 = document.createElement("td");
                    td3.textContent = it.type;
                    tr.appendChild(td1);
                    tr.appendChild(td2);
                    tr.appendChild(td3);
                    frag.appendChild(tr);
                }
                tbody.appendChild(frag);
                if (i < all.length) requestAnimationFrame(batch);
                else cb?.();
            }
            requestAnimationFrame(batch);
        }

        // fill shared addresses table
        (function fillShared() {
            const rows = agg.sharedAddresses || [];
            qId("sharedAddresses") &&
                (qId("sharedAddresses").textContent = rows.length);
            if (rows.length > 0)
                q(".Adresses")?.classList.add("jello-vertical");
            const tbody = q("#sharedTable tbody");
            if (!tbody) return;
            tbody.innerHTML = rows
                .map(
                    r =>
                        '<tr><td class="text-bg-danger">' +
                        esc(r.adresse) +
                        '</td><td class="text-bg-primary">' +
                        esc(
                            r.vendeurs
                                .map(v => v.split("@")[0])
                                .join(" ; ")
                                .toUpperCase()
                        ) +
                        '</td><td class="text-bg-danger">' +
                        r.vendeursCount +
                        "</td></tr>"
                )
                .join("");
            if ($.fn.dataTable && $.fn.dataTable.isDataTable("#sharedTable"))
                $("#sharedTable").DataTable().clear().destroy();
            $(document).ready(function () {
    const table = $("#sharedTable").DataTable({
        dom: "Bflrtip", // ✅ هذا ضروري لعرض الأزرار

        buttons: [
            {
                extend: "excelHtml5",
                text: "📥 Télécharger Excel",
                title: "Shared_Table"
            },
            {
                extend: "print",
                text: "🖨️ Imprimer"
            }
        ],

        pageLength: 5,
        responsive: true,

        lengthMenu: [5, 10, 25],

        pagingType: "full_numbers",

        language: {
            url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json"
        }
    });

    // ✅ أحيانًا ضروري لإظهار الأزرار في المكان الصحيح
    table.buttons().container().appendTo('#sharedTable_wrapper .col-md-6:eq(0)');
});
        })();

        // fill shared type table
        (function fillSharedType() {
            const rows = agg.addressesType || [];
            const tbody = q("#sharedTableType tbody");
            if (!tbody) return;
            tbody.innerHTML = rows
                .map(
                    r =>
                        "<tr><td>" +
                        esc(r.adresse) +
                        "</td><td>" +
                        r.casquette +
                        "</td><td>" +
                        r.fondrayon +
                        "</td><td>" +
                        r.reserve +
                        "</td></tr>"
                )
                .join("");
            if ($.fn.dataTable.isDataTable("#sharedTableType"))
                $("#sharedTableType").DataTable().clear().destroy();
            $("#sharedTableType").DataTable({
                pageLength: 5,
                responsive: true,
                lengthMenu: [5, 10, 25, 100],
                language: {
                    url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json"
                },
                columnDefs: [{ targets: "_all", className: "text-center" }],
                dom: "Bflrtip",
                buttons: [
                    {
                        extend: "excelHtml5",
                        text: '<i class="fa fa-file-excel"></i> Excel',
                        className: "btn btn-success btn-sm"
                    },
                    {
                        extend: "print",
                        text: '<i class="fa fa-print"></i> Imprimer',
                        className: "btn btn-secondary btn-sm"
                    }
                ],
                pagingType: "full_numbers"
            });
        })();

        // Charts
        try {
            destroyChart(CHARTS.countProduct);
            const ctx = qId("countProduct")?.getContext("2d");
            if (ctx) {
                const dataCount = Math.min(
                    agg.produitsByAnpfCount,
                    meta.count || 0
                );
                const remainder = (meta.count || 0) - dataCount;
                const pct = meta.count > 0 ? (dataCount / meta.count) * 100 : 0;

                const centerText = {
                    id: "centerText",
                    beforeDraw: chart => {
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return;
                        ctx.save();
                        const cx = (chartArea.left + chartArea.right) / 2;
                        const cy = (chartArea.top + chartArea.bottom) / 2;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.font = "bold 44px Arial";
                        ctx.fillStyle = pct >= 100 ? "#FF4D4D" : "#333";
                        ctx.fillText(pct.toFixed(2) + "%", cx, cy - 10);
                        ctx.font = "16px Arial";
                        ctx.fillStyle = "#666";
                        ctx.fillText("Part de produits extraits", cx, cy + 24);
                        ctx.restore();
                    }
                };

                CHARTS.countProduct = new Chart(ctx, {
                    type: "doughnut",
                    data: {
                        labels: ["Extraits", "Reste"],
                        datasets: [
                            {
                                data: [dataCount, remainder],
                                backgroundColor: ["#FF6384", "#7062da"],
                                hoverBackgroundColor: ["#FF6384", "#7062da"],
                                borderWidth: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        cutout: "68%",
                        plugins: {
                            legend: { position: "bottom" },
                            title: {
                                display: true,
                                text: "Comparaison produits extraits"
                            }
                        }
                    },
                    plugins: [centerText]
                });
            }
        } catch (e) {
            console.warn("countProduct chart error", e);
        }

        try {
            destroyChart(CHARTS.rayonChart);
            const ctxR = qId("rayonChart")?.getContext("2d");
            if (ctxR) {
                const rayons = {
                    Électricité: { regex: /^E-/i, objectif: 105 },
                    Sanitaire: { regex: /^S-/i, objectif: 59 },
                    Outillage: { regex: /^O-/i, objectif: 81 },
                    Quin: { regex: /^Q-/i, objectif: 78 },
                    Bois: { regex: /^B-/i, objectif: 11 },
                    Jardin: { regex: /^J-/i, objectif: 97 },
                    Décorations: { regex: /^D-/i, objectif: 147 },
                    Cuisine: { regex: /^C-/i, objectif: 48 },
                    TG: { regex: /^TG-/i, objectif: 18 },
                    Podiome: { regex: /^P-/i, objectif: 33 },
                    Persentoir: { regex: /^PR-/i, objectif: 9 },
                    Réserve: { regex: /^R-/i, objectif: 52 },
                    TêteCaisse: { regex: /^TC-/i, objectif: 3 }
                };

                const sample = agg.produitsParAdresseSample || [];
                const names = Object.keys(rayons);
                const counts = names.map(
                    n =>
                        sample.filter(
                            p => p.adresse && rayons[n].regex.test(p.adresse)
                        ).length
                );
                const objectifs = names.map(n => rayons[n].objectif);

                CHARTS.rayonChart = new Chart(ctxR, {
                    type: "bar",
                    data: {
                        labels: names,
                        datasets: [
                            {
                                label: "Objectif",
                                data: objectifs,
                                backgroundColor: "#0ba360"
                            },
                            {
                                label: "Réel",
                                data: counts,
                                backgroundColor: "rgba(54,162,235,0.8)"
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: "Nombre d'adresses"
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: "Comparaison adresses par rayon",
                                font: { size: 18 }
                            },
                            legend: { position: "bottom" }
                        }
                    }
                });
            }
        } catch (e) {
            console.warn("rayonChart err", e);
        }

        try {
            destroyChart(CHARTS.vendeur);
            const ctxV = qId("vendeurChart")?.getContext("2d");
            if (ctxV) {
                const vc = agg.vendeursCountMap || {};
                const top10 = Object.entries(vc)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                const labels = top10.map(v => v[0].replace(/@.*/, "").trim());
                const vals = top10.map(v => v[1]);

                CHARTS.vendeur = new Chart(ctxV, {
                    type: "bar",
                    data: {
                        labels,
                        datasets: [
                            {
                                label: "Nombre de produits",
                                data: vals,
                                backgroundColor: [
                                    "#1abc9c",
                                    "#3498db",
                                    "#9b59b6",
                                    "#e67e22",
                                    "#e74c3c",
                                    "#2ecc71",
                                    "#16a085",
                                    "#f1c40f",
                                    "#2980b9",
                                    "#8e44ad"
                                ],
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                ticks: {
                                    autoSkip: true,
                                    maxRotation: 45,
                                    minRotation: 30,
                                    font: { size: 12 }
                                }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { precision: 0, stepSize: 1 }
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: "Top 10 vendeurs (par nombre de produits)"
                            },
                            tooltip: {
                                callbacks: {
                                    label: ctx => ctx.parsed.y + " produits"
                                }
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.warn("vendeur chart err", e);
        }

        try {
            destroyChart(CHARTS.adress);
            const ctxA = qId("adressChart")?.getContext("2d");
            if (ctxA) {
                const total = 741;
                const used = agg.adressesUnique.length || 0;
                const pctUsed = ((used / total) * 100).toFixed(2);
                CHARTS.adress = new Chart(ctxA, {
                    type: "bar",
                    data: {
                        labels: [" utilisées", " totale"],
                        datasets: [
                            {
                                label: "Adresses",
                                data: [used, total],
                                backgroundColor: ["#2575fc", "#4facfe"],
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                beginAtZero: true,
                                max: total,
                                ticks: {
                                    stepSize: Math.max(1, Math.ceil(total / 7))
                                }
                            },
                            y: { grid: { display: false } }
                        },
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text:
                                    "Utilisation des adresses (sur " +
                                    total +
                                    ") - " +
                                    pctUsed +
                                    "% utilisés",
                                font: { size: 24, weight: "bold" },
                                color: "#2575fc"
                            },
                            tooltip: {
                                callbacks: {
                                    label: ctx =>
                                        ctx.parsed.x +
                                        " adresses (" +
                                        ((ctx.parsed.x / total) * 100).toFixed(
                                            2
                                        ) +
                                        "%)"
                                }
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.warn("adressChart err", e);
        }

        // addresses stats & extra table
        await (async function showAdressesStats() {
            const jsonAdrs = await loadAdressesJSON();
            const computed = new Set();
            for (let i = 0; i < produits.length; i++) {
                const p = produits[i];
                if (p && (p.calcul || "").trim() !== "" && p.adresse)
                    computed.add(p.adresse);
            }
            const computedArr = Array.from(computed);
            const missingInDB = jsonAdrs.filter(a => !computed.has(a));
            const extraInDB = computedArr;

            setText("dbAdressesCount", computedArr.length);
            setText("missingCount", missingInDB.length);
            applyDomQueue();

            q(".adressCount")?.addEventListener("click", () =>
                openAdressModal(missingInDB, extraInDB)
            );

            const extra = getExtraAdresses(produits, jsonAdrs);
            initExtraAdressTable(extra); // كل شيء يعمل مباشرة
        })();

        function getExtraAdresses(dbProducts, jsonAddresses) {
            const jsonSet = new Set(jsonAddresses || []);
            const map = Object.create(null);
            for (let i = 0; i < dbProducts.length; i++) {
                const p = dbProducts[i];
                if (!p || !p.adresse || jsonSet.has(p.adresse)) continue;
                const key = p.adresse + "__" + (p.nameVendeur || "");
                if (!map[key])
                    map[key] = {
                        adresse: p.adresse,
                        vendeur: p.nameVendeur,
                        count: 0,
                        lastDate: p.createdAt || "Inconnu"
                    };
                map[key].count++;
                if (p.createdAt && p.createdAt > map[key].lastDate)
                    map[key].lastDate = p.createdAt;
            }
            return Object.values(map);
        }

        // (تم تعريف fillExtraAdressTable و initExtraAdressTable و openAdressModal و fillAdressTableAsync أعلاه)
    } catch (err) {
        console.error("Erreur dashboard:", err);
        const container =
            document.querySelector(".container-fluid") || document.body;
        const el = document.createElement("div");
        el.className = "alert alert-danger mt-3";
        el.textContent =
            "Erreur lors du chargement du dashboard. Vérifiez la console.";
        container.prepend(el);
    } finally {
        setLoading(false);
    }
}

/* =========================
   Event Listeners
========================= */
document.addEventListener("DOMContentLoaded", initDashboard);

// الزر لم يعد يعيد تحميل البيانات، بل يفتح صفحة جديدة
document.getElementById("reloadBtn")?.addEventListener("click", () => {
    window.location.href = "/dashboard"; // أو أي صفحة تريدها
});

// روابط الصفحات
document
    .querySelector(".usersCount")
    ?.addEventListener("click", () => (window.location.href = "/listVendeurs"));
document
    .querySelector(".usersPro")
    ?.addEventListener("click", () => (window.location.href = "/produitTotal"));
document
    .querySelector(".TotalPro")
    ?.addEventListener("click", () => (window.location.href = "/totalProduit"));
document
    .querySelector(".Adresses")
    ?.addEventListener("click", () => (window.location.href = "#sharedTable"));
document
    .querySelector(".refe")
    ?.addEventListener(
        "click",
        () => (window.location.href = "#extraAdressTable")
    );
document
    .querySelector(".totalPro")
    ?.addEventListener(
        "click",
        () => (window.location.href = "#produitInexistant")
    );
const menuToggle = document.querySelector(".menu-toggle");
const menuRound = document.querySelector(".menu-round");
const menuLines = document.querySelectorAll(".menu-line");

menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("open");
    menuRound.classList.toggle("open");
    menuLines.forEach(line => line.classList.toggle("open"));
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/service-worker.js")
        .then(() => console.log("Service Worker registered"))
        .catch(err => console.error("SW registration failed:", err));
}
