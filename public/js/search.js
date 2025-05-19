// عند تحميل الصفحة، نقوم بتحميل المنتجات المحفوظة في localStorage وعرضها في الجدول
document.addEventListener("DOMContentLoaded", () => {
    loadProductsFromStorage();
});

// زر البحث: البحث في API ثم ملء الحقول
document.getElementById("searchBtn").addEventListener("click", function () {
    const query = document
        .querySelector('input[name="text"]')
        .value.trim()
        .toLowerCase();
    if (!query) return alert("Entrez un nom ou code produit");

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(res => (res.ok ? res.json() : Promise.reject("Non trouvé")))
        .then(products => {
            const p = products[0];
            if (!p) return alert("Produit introuvable");
            document.getElementById("libelle").value = p.LIBELLE;
            document.getElementById("gencode").value = p.GENCOD_P;
            document.getElementById("anpf").value = p.ANPF;
            document.getElementById("fournisseur").value = p.FOURNISSEUR_P;
            document.getElementById("stock").value = p.STOCK;
            document.getElementById("prix").value = p.PV_TTC;
            document.getElementById("productForm").style.display = "block";
        })
        .catch(() => alert("Produit introuvable"));
});

// زر الإضافة: إضافة المنتج إلى الجدول وlocalStorage
document.getElementById("ajouterBtn").addEventListener("click", function () {
    const libelle = document.getElementById("libelle").value.trim();
    // منع إضافة منتجات مكررة بناءً على الاسم (libelle)
    if (
        [...document.querySelectorAll("#produitTable tbody tr")].some(
            row => row.children[0].textContent === libelle
        )
    ) {
        alert("Produit déjà ajouté");
        return;
    }
    const product = {
        libelle,
        gencode: document.getElementById("gencode").value.trim(),
        anpf: document.getElementById("anpf").value.trim(),
        fournisseur: document.getElementById("fournisseur").value.trim(),
        stock: document.getElementById("stock").value.trim(),
        prix: document.getElementById("prix").value.trim(),
        qte: document.getElementById("qte").value.trim() || "0",
        adresse: document.getElementById("adresse").value.trim()
    };

    // إضافة المنتج للجدول
    addProductToTable(product);

    // حفظ المنتج في localStorage
    saveProductToStorage(product);

    // إعادة تعيين النموذج وإخفاؤه
    document.getElementById("productForm").reset();
    document.getElementById("productForm").style.display = "none";
});

// دالة لإضافة صف جديد في الجدول مع إمكانية التعديل (contenteditable)
function addProductToTable(product) {
    const row = document.createElement("tr");
    row.innerHTML = `
    <td>
      <label class="cell-label">Libellé</label>
      <div class="cell-content" contenteditable="true">${product.libelle}</div>
    </td>
    <td>
      <label class="cell-label">Gencode</label>
      <div class="cell-content" contenteditable="true">${product.gencode}</div>
    </td>
    <td>
      <label class="cell-label">ANPF</label>
      <div class="cell-content" contenteditable="true">${product.anpf}</div>
    </td>
    <td>
      <label class="cell-label">Fournisseur</label>
      <div class="cell-content" contenteditable="true">${product.fournisseur}</div>
    </td>
    <td>
      <label class="cell-label">Stock</label>
      <div class="cell-content" contenteditable="true">${product.stock}</div>
    </td>
    <td>
      <label class="cell-label">Prix</label>
      <div class="cell-content" contenteditable="true">${product.prix}</div>
    </td>
    <td>
      <label class="cell-label">Quantité</label>
      <div class="cell-content" contenteditable="true">${product.qte}</div>
    </td>
    <td>
      <label class="cell-label">Adresse</label>
      <div class="cell-content" contenteditable="true">${product.adresse}</div>
    </td>
    <td class="actions" style="text-align:center;">
      <button class="btnRed" onclick="removeProduct(this)" style="cursor:pointer;">
        <i class="fa fa-trash"></i>
      </button>
    </td>
  `;
    document.querySelector("#produitTable tbody").appendChild(row);
}

// دالة لحفظ المنتجات في localStorage (تخزين كمصفوفة JSON)
function saveProductToStorage(product) {
    let products = JSON.parse(localStorage.getItem("produits") || "[]");
    products.push(product);
    localStorage.setItem("produits", JSON.stringify(products));
}

// دالة تحميل المنتجات من localStorage وعرضها في الجدول عند بدء الصفحة
function loadProductsFromStorage() {
    let products = JSON.parse(localStorage.getItem("produits") || "[]");
    products.reverse().forEach(p => addProductToTable(p));
}

// حذف صف المنتج من الجدول ومن localStorage
function removeProduct(button) {
    const row = button.closest("tr");
    const libelle = row.children[0].textContent;
    row.remove();

    let products = JSON.parse(localStorage.getItem("produits") || "[]");
    products = products.filter(p => p.libelle !== libelle);
    localStorage.setItem("produits", JSON.stringify(products));
}

const scanBtn = document.getElementById("scanBtn");
const reader = document.getElementById("reader");
let html5QrCode;
let isScanning = false;

scanBtn.addEventListener("click", () => {
    if (isScanning) {
        // إذا الماسح يعمل، نوقفه ونخفي العرض
        html5QrCode
            .stop()
            .then(() => {
                reader.style.display = "none";
                isScanning = false;
                scanBtn.textContent = "Scanner";
            })
            .catch(err => {
                console.error("Error stopping scanner:", err);
            });
    } else {
        // نبدأ تشغيل الماسح
        reader.style.display = "block";
        html5QrCode = new Html5Qrcode("reader");

        Html5Qrcode.getCameras()
            .then(cameras => {
                const backCam =
                    cameras.find(cam =>
                        cam.label.toLowerCase().includes("back")
                    ) || cameras[0];
                if (!backCam) {
                    alert("Caméra non trouvée");
                    return;
                }
                html5QrCode
                    .start(
                        { deviceId: { exact: backCam.id } },
                        { fps: 10, qrbox: 250 },
                        decodedText => {
                            // وضع النص الممسوح في حقل البحث بدلاً من alert
                            document.getElementById("textSearch").value =
                                decodedText;
                            // بعد المسح، نوقف الماسح ونخفيه تلقائيًا
                            html5QrCode.stop().then(() => {
                                reader.style.display = "none";
                                isScanning = false;
                                scanBtn.textContent = "Scanner";
                            });
                        },
                        errorMessage => {
                            // يمكن تجاهل أو طباعة الأخطاء الصغيرة هنا
                            // console.warn(`Scan error: ${errorMessage}`);
                        }
                    )
                    .then(() => {
                        isScanning = true;
                        scanBtn.textContent = "Arrêter le scanner";
                    })
                    .catch(err => {
                        alert("خطأ في تشغيل الكاميرا: " + err);
                    });
            })
            .catch(err => {
                alert("خطأ في الحصول على الكاميرات: " + err);
            });
    }
});

function exportToExcel() {
    const nom = document.getElementById("nomFichier").value.trim();
    if (!nom) return alert("Nom de fichier requis");

    // جلب بيانات من localStorage (مثال على اسم المفتاح "products")
    const dataJSON = localStorage.getItem("products");
    if (!dataJSON) return alert("Aucune donnée dans localStorage");

    const data = JSON.parse(dataJSON);

    // تحويل البيانات إلى ورقة عمل Excel
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Produits");

    // توليد ملف Excel وبدء التنزيل
    XLSX.writeFile(workbook, nom + ".xlsx");
}

function exportToExcel() {
    const nom = document.getElementById("nomFichier").value.trim();
    if (!nom) {
        alert("Nom de fichier requis");
        return;
    }

    const produitsJSON = localStorage.getItem("produits");
    if (!produitsJSON) {
        alert("Aucune donnée dans localStorage");
        return;
    }

    const produits = JSON.parse(produitsJSON);
    if (produits.length === 0) {
        alert("Aucune donnée dans localStorage");
        return;
    }

    // تحويل بيانات JSON إلى مصفوفة صفوف مع رؤوس الأعمدة
    const header = Object.keys(produits[0]);
    const data = [header];

    produits.forEach(prod => {
        const row = header.map(h => prod[h]);
        data.push(row);
    });

    // إنشاء ورقة عمل (worksheet) من البيانات
    const ws = XLSX.utils.aoa_to_sheet(data);

    // إضافة تنسيقات: لون رأس الجدول وخط عريض
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F81BD" } }, // لون أزرق جذاب
            alignment: { horizontal: "center", vertical: "center" }
        };
    }

    // ضبط عرض الأعمدة تلقائياً
    const colWidths = header.map(h => ({
        wch: Math.max(10, h.length + 5)
    }));
    ws["!cols"] = colWidths;

    // إنشاء مصنف جديد (workbook) وإضافة الورقة
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");

    // إعداد خيارات الكتابة لتحسين التنسيق
    const wbout = XLSX.write(wb, {
        bookType: "xlsx",
        type: "binary",
        cellStyles: true
    });

    // تحويل البيانات الثنائية إلى Blob
    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
    }

    const blob = new Blob([s2ab(wbout)], {
        type: "application/octet-stream"
    });

    // إنشاء رابط تحميل وتحفيز التنزيل
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nom + ".xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function clearTable() {
    if (confirm("هل أنت متأكد من مسح جميع بيانات المنتجات؟")) {
        // مسح محتوى الجدول
        document.querySelector("#produitTable tbody").innerHTML = "";
        // مسح البيانات من localStorage
        localStorage.removeItem("produits");
        alert("تم مسح جميع البيانات بنجاح.");
    }
}
