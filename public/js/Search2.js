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

    if (!query) {
        showModalMessage("يرجى إدخال اسم أو كود المنتج");
        return;
    }

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(res => (res.ok ? res.json() : Promise.reject("Non trouvé")))
        .then(products => {
            const p = products[0];
            if (!p) return showModalMessage("المنتج غير موجود");

            document.getElementById("libelle").value = p.LIBELLE;
            document.getElementById("gencode").value = p.GENCOD_P;
            document.getElementById("anpf").value = p.ANPF;
            document.getElementById("fournisseur").value = p.FOURNISSEUR_P;
            document.getElementById("stock").value = p.STOCK;
            document.getElementById("prix").value = p.PV_TTC;
            document.getElementById("productForm").style.display = "block";
        })
        .catch(() => showModalMessage("المنتج غير موجود"));
});

function showModalMessage(message) {
    const modal = document.getElementById("confirmModal");
    const msgEl = modal.querySelector(".modal-content p");
    const actions = modal.querySelector(".modal-actions");

    msgEl.textContent = message;
    actions.style.display = "none";
    modal.style.display = "block";

    setTimeout(() => {
        modal.style.display = "none";
        msgEl.textContent = "هل أنت متأكد أنك تريد حذف هذا المنتج؟";
        actions.style.display = "flex";
    }, 2000);
}

// زر الإضافة: إضافة المنتج إلى الجدول وlocalStorage
document.getElementById("ajouterBtn").addEventListener("click", function () {
    const libelle = document.getElementById("libelle").value.trim();
    const gencode = document.getElementById("gencode").value.trim();
    const anpf = document.getElementById("anpf").value.trim();
    const fournisseur = document.getElementById("fournisseur").value.trim();
    const stock = document.getElementById("stock").value.trim();
    const prix = document.getElementById("prix").value.trim();
    const qte = document.getElementById("qte").value.trim() || "0";
    const adresse = document.getElementById("adresse").value.trim();

    if (!libelle) return alert("Champ manquant : Libellé");
    if (!gencode) return alert("Champ manquant : GenCode");
    if (!anpf) return alert("Champ manquant : ANPF");

    const product = {
        id: Date.now(), // معرف فريد لكل منتج
        libelle,
        gencode,
        anpf,
        fournisseur,
        stock,
        prix,
        qte,
        adresse
    };

    const rows = document.querySelectorAll("#produitTable tbody tr");
    let isDuplicate = false;

    rows.forEach(row => {
        const firstCell = row.querySelector("td .cell-content");
        if (firstCell && firstCell.textContent.trim() === libelle) {
            row.classList.add("duplicate");
            isDuplicate = true;
            alert(
                "Attention : produit déjà présent, ajouté de nouveau et marqué."
            );
        }
    });

    addProductToTable(product);
    saveProductToStorage(product);

    document.getElementById("libelle").value = "";
    document.getElementById("gencode").value = "";
    document.getElementById("anpf").value = "";
    document.getElementById("fournisseur").value = "";
    document.getElementById("stock").value = "";
    document.getElementById("prix").value = "";
    document.getElementById("qte").value = "";
    document.getElementById("adresse").value = "";

    document.querySelector(".form-container").style.display = "none";
});

// ========== [إضافة صف جديد في الجدول + تحديد التكرار + حفظ عند التعديل] ==========
function addProductToTable(product) {
    const existingRows = [
        ...document.querySelectorAll("#produitTable tbody tr")
    ];
    let isDuplicate = false;

    existingRows.forEach(row => {
        const libelleCell = row.querySelector("td:first-child .cell-content");
        if (libelleCell && libelleCell.textContent.trim() === product.libelle) {
            row.classList.add("duplicate");
            isDuplicate = true;
        }
    });

    const row = document.createElement("tr");
    row.setAttribute("data-id", product.id); // مهم
    if (isDuplicate) row.classList.add("duplicate");

    row.innerHTML = `
    <td><label class="cell-label">Libellé</label>
        <div class="cell-content" contenteditable="false">${product.libelle}</div></td>
    <td><label class="cell-label">Gencode</label>
        <div class="cell-content" contenteditable="false">${product.gencode}</div></td>
    <td><label class="cell-label">ANPF</label>
        <div class="cell-content" contenteditable="false">${product.anpf}</div></td>
    <td><label class="cell-label">Fournisseur</label>
        <div class="cell-content" contenteditable="false">${product.fournisseur}</div></td>
    <td><label class="cell-label">Prix</label>
        <div class="cell-content" contenteditable="false">${product.prix} <span class="spa">DH/TTC</span></div></td>
    <td><label class="cell-label">Stock Physique</label>
        <div class="cell-content" contenteditable="true">${product.qte}</div></td>
    <td><label class="cell-label">Adresse</label>
        <div class="cell-content" contenteditable="true">${product.adresse}</div></td>
    <td class="actions" style="text-align:center;">
        <button class="btnRed" onclick="removeProduct(this)" style="cursor:pointer;">
            <i class="fa fa-trash"></i>
        </button>
    </td>
    `;

    const updateOnBlur = () => {
        const updatedProduct = {
            id: product.id,
            libelle: row.children[0]
                .querySelector(".cell-content")
                .textContent.trim(),
            gencode: row.children[1]
                .querySelector(".cell-content")
                .textContent.trim(),
            anpf: row.children[2]
                .querySelector(".cell-content")
                .textContent.trim(),
            fournisseur: row.children[3]
                .querySelector(".cell-content")
                .textContent.trim(),
            stock: row.children[4]
                .querySelector(".cell-content")
                .textContent.trim(),
            prix: row.children[5]
                .querySelector(".cell-content")
                .textContent.replace("DH/TTC", "")
                .trim(),
            qte: row.children[6]
                .querySelector(".cell-content")
                .textContent.trim(),
            adresse: row.children[7]
                .querySelector(".cell-content")
                .textContent.trim()
        };

        updateProductInStorage(updatedProduct);
    };

    row.querySelectorAll(".cell-content").forEach(cell => {
        cell.addEventListener("blur", updateOnBlur);
    });

    document.querySelector("#produitTable tbody").appendChild(row);
}

// ========== [تخزين منتج جديد في localStorage] ==========
function saveProductToStorage(product) {
    let products = JSON.parse(localStorage.getItem("produits") || "[]");
    products.unshift(product); // إضافة في أول القائمة
    localStorage.setItem("produits", JSON.stringify(products));
}

// ========== [تحديث منتج موجود في localStorage عند التعديل] ==========
function updateProductInStorage(updatedProduct) {
    let products = JSON.parse(localStorage.getItem("produits") || "[]");

    const index = products.findIndex(p => p.id === updatedProduct.id);

    if (index !== -1) {
        products[index] = updatedProduct;
        localStorage.setItem("produits", JSON.stringify(products));
    }
}

// دالة تحميل المنتجات من localStorage وعرضها في الجدول عند بدء الصفحة
function loadProductsFromStorage() {
    let products = JSON.parse(localStorage.getItem("produits") || "[]");
    products.forEach(p => addProductToTable(p));
}

// حذف صف المنتج من الجدول ومن localStorage
function removeProduct(button) {
    const row = button.closest("tr");
    const id = row.dataset.id;

    const modal = document.getElementById("confirmModal");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    modal.style.display = "block";

    yesBtn.onclick = () => {
        let products = JSON.parse(localStorage.getItem("produits") || "[]");

        products = products.filter(p => String(p.id) !== String(id));

        localStorage.setItem("produits", JSON.stringify(products));

        modal.style.display = "none";
        row.remove(); // حذف الصف مباشرة دون reload
    };

    noBtn.onclick = () => {
        modal.style.display = "none";
    };
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

function showModalMessage(message) {
    const modal = document.getElementById("confirmModal");
    const msgEl = modal.querySelector(".modal-content p");
    const actions = modal.querySelector(".modal-actions");

    msgEl.textContent = message;
    actions.style.display = "none";
    modal.style.display = "block";

    setTimeout(() => {
        modal.style.display = "none";
        msgEl.textContent = "هل أنت متأكد أنك تريد حذف هذا المنتج؟";
        actions.style.display = "flex";
    }, 3000);
}

function exportToExcel() {
    const nom = document.getElementById("nomFichier").value.trim();
    if (!nom) {
        showModalMessage("اسم الملف مطلوب");
        return;
    }

    const produitsJSON = localStorage.getItem("produits");
    if (!produitsJSON) {
        showModalMessage("لا توجد بيانات في التخزين المحلي");
        return;
    }

    const produits = JSON.parse(produitsJSON);
    if (produits.length === 0) {
        showModalMessage("لا توجد بيانات في التخزين المحلي");
        return;
    }

    const header = Object.keys(produits[0]);
    const data = [header];

    produits.forEach(prod => {
        const row = header.map(h => prod[h]);
        data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F81BD" } },
            alignment: { horizontal: "center", vertical: "center" }
        };
    }

    const colWidths = header.map(h => ({
        wch: Math.max(10, h.length + 5)
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");

    const wbout = XLSX.write(wb, {
        bookType: "xlsx",
        type: "binary",
        cellStyles: true
    });

    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
    }

    const blob = new Blob([s2ab(wbout)], {
        type: "application/octet-stream"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nom + ".xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clearTable() {
    const modal = document.getElementById("confirmModal");
    const message = modal.querySelector(".modal-content p");
    const actions = modal.querySelector(".modal-actions");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    // عرض رسالة التأكيد لمسح الكل
    message.textContent = "هل أنت متأكد من مسح جميع بيانات المنتجات؟";
    actions.style.display = "flex";
    modal.style.display = "block";

    // إزالة أي مستمعات قديمة
    const newYes = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);

    // عند الضغط على "نعم"
    newYes.addEventListener("click", () => {
        document.querySelector("#produitTable tbody").innerHTML = "";
        localStorage.removeItem("produits");

        // عرض رسالة النجاح
        message.textContent = "تم مسح جميع البيانات بنجاح.";
        actions.style.display = "none";

        setTimeout(() => {
            modal.style.display = "none";
            message.textContent = "هل أنت متأكد أنك تريد حذف هذا المنتج؟";
            actions.style.display = "flex";
        }, 2000);
    });

    // إلغاء
    noBtn.onclick = () => {
        modal.style.display = "none";
    };
}

document.querySelector("#plus").addEventListener("click", () => {
    document.querySelector(".form-container").style.display = "block";
});

self.addEventListener("install", event => {
    console.log("Service Worker installing.");
});

self.addEventListener("fetch", event => {
    // هنا يمكن وضع كود الكاش لتحميل الموقع بدون إنترنت
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker Registered"))
        .catch(err =>
            console.error("Service Worker registration failed:", err)
        );
}
