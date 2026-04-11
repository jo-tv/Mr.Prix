// 🧩 تعريف المتغيرات العامة قبل الاستخدام
let isScanning = false;
let html5QrCode = null;

const reader = document.getElementById("reader");
const scanBtn = document.querySelector("#scanBtn");
const input = document.getElementById("textSearch");
const searchBtn = document.getElementById("searchBtn");
const nameInput = document.getElementById("nameVendeur");
const inputAdress = document.getElementById("adresse");
const inputCalcul = document.getElementById("calcul");

// 🔉 صوت المسح
const beepSound = new Audio("/sounds/beep.mp3"); // ضع الصوت في مجلدك إن أردت

nameInput.addEventListener("focus", () => {
    nameInput.type = "text";
});

nameInput.addEventListener("blur", () => {
    nameInput.type = "password";
});

// ====================
// عند تحميل الصفحة
// ====================
// عند تغيّر الاسم: تنظيفه ثم حفظه في localStorage
nameInput.addEventListener("input", () => {
    let name = nameInput.value.trim().toLowerCase(); // حذف المسافات وتحويل إلى حروف صغيرة
    if (name) {
        localStorage.setItem("nameVendeur", name);
    } else {
        localStorage.removeItem("nameVendeur");
    }
    localStorage.removeItem(`products_${localStorage.getItem("nameVendeur")}`);
});

inputCalcul.addEventListener("input", () => {
    let name = inputCalcul.value.trim().toLowerCase(); // حذف المسافات وتحويل إلى حروف صغيرة
    if (name) {
        localStorage.setItem("inputCalcul", name);
    } else {
        localStorage.removeItem("inputCalcul");
    }
});

inputAdress.addEventListener("input", () => {
    let adresseInv = inputAdress.value.trim().toUpperCase(); // حذف المسافات وتحويل إلى حروف صغيرة
    if (adresseInv) {
        localStorage.setItem("adresseInv", adresseInv);
    } else {
        localStorage.removeItem("adresseInv");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const savedName = localStorage.getItem("nameVendeur");
    const savedAdress = localStorage.getItem("adresseInv");
    const inputCalcul = localStorage.getItem("inputCalcul");
    if (savedName) {
        document.getElementById("nameVendeur").value =
            savedName.toLowerCase().trim() || "";
        document.getElementById("nomFichier").value =
            savedName.toUpperCase().trim().split("@")[0] || "";
    }
    if (savedAdress) {
        document.getElementById("adresse").value =
            savedAdress.toUpperCase().trim() || "";
    }
    if (inputCalcul) {
        document.getElementById("calcul").value =
            inputCalcul.trim() || "Sélectionnez ce que vous voulez calculer ";
    }
    loadProductsFromDatabase();
    setupEventListeners();
});

// ====================
// تحميل المنتجات من قاعدة البيانات
// ====================
async function loadProductsFromDatabase() {
    const tbody = document.querySelector("#produitTable tbody");
    tbody.innerHTML = "";

    const nameVendeur = localStorage.getItem("nameVendeur");
    if (!nameVendeur) {
        showToast("⚠️ Veuillez saisir le nom du vendeur d'abord", "warning");
        return;
    }

    const cacheKey = `products_${nameVendeur}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(cacheKey + "_time");

    // ✅ استخدم الكاش إن كان صالحًا
    if (
        cached &&
        cacheTime &&
        Date.now() - Number(cacheTime) < 30 * 60 * 1000
    ) {
        const products = JSON.parse(cached);
        products.reverse().forEach(addProductToTable); // ✅ بدون تخريب الكاش
        showToast("✅ Produits chargés depuis le cache", "success");
        return;
    }

    // ✅ طلب من السيرفر فقط عند الحاجة
    try {
        showToast("🔄 Chargement depuis le serveur...", "info");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
            `/api/inventaireProo?nameVendeur=${encodeURIComponent(
                nameVendeur
            )}`,
            { signal: controller.signal }
        );

        clearTimeout(timeout);

        if (!response.ok) throw new Error("HTTP ERROR");

        const products = await response.json();
        if (!Array.isArray(products)) throw new Error("BAD FORMAT");

        // ✅ حفظ الكاش
        localStorage.setItem(cacheKey, JSON.stringify(products));
        localStorage.setItem(cacheKey + "_time", Date.now());

        [...products].reverse().forEach(addProductToTable); // ✅ آمن
        showToast(`✅ ${products.length} produit(s) chargé(s)`, "success");
    } catch (err) {
        console.error(err);
        showToast("❌ Erreur de chargement", "error");
    }
}

// ====================
// إعداد الأحداث
// ====================
function setupEventListeners() {
    document
        .getElementById("searchBtn")
        ?.addEventListener("click", searchProduct);
    document
        .getElementById("ajouterBtn")
        ?.addEventListener("click", addProduct);
    document
        .getElementById("exportBtn")
        ?.addEventListener("click", exportToExcel);
    document
        .getElementById("clearTableBtn")
        ?.addEventListener("click", clearTable);
    document
        .getElementById("plus")
        ?.addEventListener("click", toggleProductForm);
}

// ====================
// البحث عن منتج
// ====================
async function searchProduct() {
    const query = document
        .querySelector('input[name="text"]')
        .value.trim()
        .toLowerCase();

    // إذا لم يُدخل المستخدم شيء
    if (!query) {
        showToast(
            "⛔ Veuillez saisir le nom ou le code du produit. 🛍️",
            "warning"
        );
        return; // الخروج قبل البحث
    }

    try {
        const response = await fetch(
            `/api/search?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) throw new Error("Erreur de recherche");

        const products = await response.json();

        // إذا لم يُعثر على منتج
        if (!products.length) {
            showToast("⁉️ Produit non trouvé. 🛍️", "error");
            document.getElementById("productForm").style.display = "block";
            document.getElementById("libelle").value = "Produit Inexistant ";
            document.getElementById("gencode").value = query;
            document.getElementById("anpf").value = query;
            document.getElementById("fournisseur").value = "Inexistant";
            document.getElementById("stock").value = "Inexistant";
            document.getElementById("prix").value = "Inexistant";
            document.getElementById("nameVendeur").value =
                localStorage.nameVendeur || "";
            document.querySelector(".card").style.display = "block";
            return;
        }

        // إذا تم العثور على منتج
        const p = products[0];
        document.getElementById("libelle").value = p.LIBELLE;
        document.getElementById("gencode").value = p.GENCOD_P;
        document.getElementById("anpf").value = p.ANPF;
        document.getElementById("fournisseur").value = p.FOURNISSEUR_P;
        document.getElementById("stock").value = p.STOCK;
        document.getElementById("prix").value = p.PV_TTC;
        document.getElementById("nameVendeur").value =
            localStorage.nameVendeur || "";
        document.getElementById("productForm").style.display = "block";
        showToast("✅ Produit trouvé et chargé avec succès. 🛍️", "success");
        document.getElementById("qteInven").focus();
    } catch (error) {
        console.error("Erreur lors de la recherche du produit:", error);
        showToast(
            "❌ Une erreur est survenue lors de la recherche. 🛍️",
            "warning"
        );
    }
}

function fermerAffiche() {
    document.querySelector(".card").style.display = "none";
}

// ====================
// إضافة منتج جديد
// ====================

async function addProduct() {
    // 🔹 منع الضغط المتكرر
    if (ajouterBtn.disabled) return;
    ajouterBtn.disabled = true;
    ajouterBtn.textContent = "Enregistrement...";

    const product = {
        libelle: document.getElementById("libelle").value.trim(),
        gencode: document.getElementById("gencode").value.trim(),
        anpf: document.getElementById("anpf").value.trim(),
        fournisseur: document.getElementById("fournisseur").value.trim(),
        stock: document.getElementById("stock").value.trim(),
        prix: document.getElementById("prix").value.trim(),
        qteInven: document.getElementById("qteInven").value.trim(),
        calcul: document.getElementById("calcul").value.trim(),
        adresse: document.getElementById("adresse").value.trim().toUpperCase(), // الحروف الكبيرة
        nameVendeur: document
            .getElementById("nameVendeur")
            .value.toLowerCase()
            .trim()
    };
    // Regex لاسم المستخدم (غير حساس لحالة الأحرف)
    const usernameRegex = /^[A-Z]\.[a-z]+@[0-9]{4}$/i;
    const adresseRegex = /^[a-z]+\-[a-z0-9]+$/i;

    // التحقق من الحقول
    if (
        !product.libelle ||
        !product.gencode ||
        !product.anpf ||
        !product.adresse ||
        !product.qteInven ||
        !product.calcul ||
        !product.nameVendeur
    ) {
        showToast("⚠️ Tous les champs sont obligatoires 🆔", "warning");
        ajouterBtn.disabled = false;
        ajouterBtn.textContent = "Ajouter le produit";
        return;
    }

    // التحقق من صيغة اسم المستخدم
    if (!usernameRegex.test(product.nameVendeur)) {
        showToast(
            "⚠️ 📢 Nom Vendeur invalide ! Utilisez le format: LettreInitiale.Nom@1234 (ex: Y.Semlali@2025)",
            "warning"
        );
        ajouterBtn.disabled = false;
        ajouterBtn.textContent = "Ajouter le produit";
        return;
    }
    // التحقق من قيمة Adresse
    if (!adresseRegex.test(product.adresse)) {
        showToast("⚠️ 📢 Adresse invalide. Format requis : E-02A ", "warning");
        adresse: document.getElementById("adresse").style.backgroundColor =
            "#d76262a5";
        ajouterBtn.disabled = false;
        ajouterBtn.textContent = "Ajouter le produit";
        return;
    }

    // إذا كل شيء صحيح، يمكن إرسال البيانات

    try {
        const response = await fetch("/api/inventairePro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product)
        });

        if (!response.ok) throw new Error("Échec de l'ajout du produit");

        const addedProduct = await response.json();

        document.getElementById("productForm").style.display = "none";

        // 🔹 إضافة المنتج مباشرة إلى الجدول
        addProductToTable(addedProduct);

        // 🔹 تحديث الكاش محليًا
        const nameVendeur = localStorage.getItem("nameVendeur");
        const cacheKey = `products_${nameVendeur}`;
        const cached = localStorage.getItem(cacheKey);
        let products = cached ? JSON.parse(cached) : [];

        products.push(addedProduct); // إضافة المنتج الجديد
        localStorage.setItem(cacheKey, JSON.stringify(products));
        localStorage.setItem(cacheKey + "_time", Date.now());

        clearForm();

        showToast("✅ Produit 🛍️ ajouté et cache mis à jour", "success");
        document.getElementById("textSearch").focus();
    } catch (error) {
        console.error("Error adding product:", error);
        showToast(
            "❌ Une erreur est survenue lors de l'ajout du produit",
            "error"
        );
    } finally {
        // 🔹 إعادة تفعيل الزر بعد انتهاء العملية
        ajouterBtn.disabled = false;
        ajouterBtn.textContent = "Ajouter le produit";
    }
}

// ====================
// إضافة المنتج إلى الجدول
// ====================
function addProductToTable(product) {
    const row = document.createElement("tr");
    row.dataset.id = product._id || product.id || Date.now();

    row.innerHTML = `
    <td class="name"><i class="fa fa-box-open text-blue"></i> <strong>${
        product.libelle
    }</strong></td>
    <td class="barcode"><i class="fa fa-barcode text-gray"></i> ${
        product.gencode
    }</td>
    <td><i class="fa fa-hashtag text-purple"></i> ${product.anpf}</td>
    <td><i class="fa fa-truck text-orange"></i> ${product.fournisseur}</td>
    <td class="price"><i class="fa fa-tags text-green"></i> <strong>${
        product.prix
    } DH</strong></td>
    <td class="price"><i class="fa fa-tags text-green"></i> <strong>${
        product.calcul
    } </strong></td>
    <td><i class="fa fa-cubes text-teal"></i> ${product.qteInven || "0"}</td>
    <td><i class="fa fa-map-marker-alt text-red"></i> ${
        product.adresse?.toUpperCase() || "!"
    }</td>
    <td class="actions">
      <button id="btnRed" class="btnRed" onclick="removeProduct(this)"><i class="fa fa-trash"></i> Supprimer</button>
      <button id="btnBlue" class="btnBlue" onclick="editProduct(this)"><i class="fa fa-edit"></i> Modifier</button>
    </td>
  `;

    const tbody = document.querySelector("#produitTable tbody");

    // ✅ إدراج الصف في الأعلى بدل الأسفل
    if (tbody.firstChild) {
        tbody.insertBefore(row, tbody.firstChild);
    } else {
        tbody.appendChild(row);
    }
    paginateTable();
}

let currentPage = 1;
let rowsPerPage = 10; // عدد الصفوف في كل صفحة

function paginateTable() {
    const table = document.querySelector("#produitTable tbody");
    const rows = table.querySelectorAll("tr");

    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    // إخفاء كل الصفوف
    rows.forEach((row, index) => {
        row.style.display =
            index >= (currentPage - 1) * rowsPerPage &&
            index < currentPage * rowsPerPage
                ? ""
                : "none";
    });

    const pagination = document.getElementById("paginationControls");
    pagination.innerHTML = "";

    // زر Previous
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "◀";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            paginateTable();
        }
    };
    pagination.appendChild(prevBtn);

    // عرض رقم الصفحة
    const pageDisplay = document.createElement("span");
    pageDisplay.innerText = ` Page ${currentPage} / ${totalPages} `;
    pageDisplay.style.fontWeight = "bold";
    pageDisplay.style.margin = "0 10px";
    pagination.appendChild(pageDisplay);

    // زر Next
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "▶";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            paginateTable();
        }
    };
    pagination.appendChild(nextBtn);
}

// ====================
// حذف منتج
// ====================
async function removeProduct(button) {
    const row = button.closest("tr");
    const id = row.dataset.id;
    if (!id) {
        alert("❌ ID غير موجود!");
        return;
    }
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
        console.log("⏳ إرسال طلب حذف إلى السيرفر...");
        const response = await fetch(`/api/InvSmartManager/${id}`, {
            method: "DELETE"
        });
        const data = await response.json();
        if (!response.ok || data.success === false) {
            showToast(
                data.message || "❌ Échec de la suppression du produit",
                "error"
            );
            return;
        }

        row.remove();
        showToast("🗑️ Produit supprimé avec succès", "success");
        localStorage.removeItem(
            `products_${localStorage.getItem("nameVendeur")}`
        );
        window.location.reload();
    } catch (error) {
        console.error("Error deleting product:", error);
        showToast(
            "❌ Une erreur est survenue lors de la suppression du produit",
            "error"
        );
    }
}

// ====================
// تعديل منتج
// ====================
function editProduct(button) {
    const row = button.closest("tr");
    const id = row.dataset.id;

    // تأكد من وجود كل قيمة قبل وضعها (لتفادي undefined)
    const safeText = el => (el ? el.textContent.trim() || "" : "");

    document.getElementById("editId").value = id || "";

    document.getElementById("editName").value = safeText(
        row.querySelector(".name")
    );
    document.getElementById("editBarcode").value = safeText(
        row.querySelector(".barcode")
    );
    document.getElementById("editAnpf").value = safeText(row.children[2]);
    document.getElementById("editFour").value = safeText(row.children[3]);

    // السعر فيه " DH" غالبًا → نحذفها
    const priceText = safeText(row.querySelector(".price strong"))
        .replace(" DH", "")
        .trim();
    document.getElementById("editPrice").value = parseFloat(priceText) || 0;

    document.getElementById("editCalcul").value = safeText(row.children[5]);
    document.getElementById("editQteInven").value = safeText(row.children[6]);
    document.getElementById("editAdresse").value = safeText(row.children[7]);

    document.getElementById("editModal").style.display = "flex";
}

async function saveProductChanges() {
    const id = document.getElementById("editId").value;

    // 🧩 نفس الأسماء المستعملة في قاعدة البيانات وواجهة الجدول
    const updated = {
        libelle: document.getElementById("editName").value.trim(),
        gencode: document.getElementById("editBarcode").value.trim(),
        anpf: document.getElementById("editAnpf").value.trim(),
        fournisseur: document.getElementById("editFour").value.trim(),
        prix: parseFloat(document.getElementById("editPrice").value) || 0,
        calcul: document.getElementById("editCalcul").value.trim(),
        qteInven: document.getElementById("editQteInven").value.trim(),
        adresse: document
            .getElementById("editAdresse")
            .value.trim()
            .toUpperCase()
    };

    try {
        const response = await fetch(`/api/inventairePro/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated)
        });

        if (!response.ok) throw new Error("فشل في تحديث المنتج");
        const updatedProduct = await response.json();

        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) {
            // ✅ إعادة بناء الصف بنفس شكل الإدراج الأصلي
            row.innerHTML = `
        <td class="name">
          <i class="fa fa-box-open text-blue"></i> 
          <strong>${updatedProduct.libelle || ""}</strong>
        </td>
        <td class="barcode">
          <i class="fa fa-barcode text-gray"></i> ${
              updatedProduct.gencode || ""
          }
        </td>
        <td>
          <i class="fa fa-hashtag text-purple"></i> ${updatedProduct.anpf || ""}
        </td>
        <td>
          <i class="fa fa-truck text-orange"></i> ${
              updatedProduct.fournisseur || ""
          }
        </td>
        <td class="price">
          <i class="fa fa-tags text-green"></i> 
          <strong>${
              updatedProduct.prix ? updatedProduct.prix + " DH" : "0 DH"
          }</strong>
        </td>
        <td>
          <i class="fa fa-cubes text-teal"></i> ${updatedProduct.calcul || ""}
        </td>
        <td>
          <i class="fa fa-cubes text-teal"></i> ${
              updatedProduct.qteInven || "0"
          }
        </td>
        <td>
          <i class="fa fa-map-marker-alt text-red"></i> ${
              updatedProduct.adresse || "!"
          }
        </td>
        <td class="actions">
          <button class="btnRed" onclick="removeProduct(this)">
            <i class="fa fa-trash"></i> Supprimer
          </button>
          <button class="btnBlue" onclick="editProduct(this)">
            <i class="fa fa-edit"></i> Modifier
          </button>
        </td>
      `;
        }

        closeEditModal();
        showToast("✅ Produit 🛍️ modifié avec succès", "success");
        localStorage.removeItem(
            `products_${localStorage.getItem("nameVendeur")}`
        );
        window.location.reload();
    } catch (error) {
        console.error("Error updating product:", error);
        showToast("❌ error updating product", "error");
    }
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

// ====================
// مسح كل المنتجات
// ====================
async function clearTable() {
    if (!confirm("هل تريد مسح جميع المنتجات؟")) return;

    try {
        const response = await fetch("/api/inventairePro", {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("فشل في مسح المنتجات");

        document.querySelector("#produitTable tbody").innerHTML = "";
        showToast("🧹 تم مسح جميع المنتجات بنجاح");

        localStorage.removeItem(
            `products_${localStorage.getItem("nameVendeur")}`
        );
    } catch (error) {
        console.error("Error clearing products:", error);
        showToast("❌ حدث خطأ أثناء مسح جميع المنتجات");
    }
}

// ====================
// تصدير إلى Excel
// ====================
async function exportToExcel() {
    const nameVendeur = document.getElementById("nameVendeur").value.trim();

    // 🔹 تحقق من اسم البائع
    if (!nameVendeur) {
        showToast(
            "⚠️ Veuillez saisir le nom du vendeur avant d’exporter. 🛍️",
            "warning"
        );
        return;
    }

    try {
        const response = await fetch(
            `/api/inventaireProoo?nameVendeur=${encodeURIComponent(
                nameVendeur
            )}`
        );
        if (!response.ok)
            throw new Error("Erreur lors du chargement des produits");

        const produits = await response.json();

        // 🔹 تحقق من وجود بيانات
        if (produits.length === 0) {
            showToast(
                "⚠️ Aucun produit à exporter pour ce vendeur. 📦",
                "info"
            );
            return;
        }

        // 🔹 إنشاء Excel
        const header = Object.keys(produits[0]);
        const data = produits.map(prod => header.map(h => prod[h]));
        data.unshift(header);

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Produits");

        const fileName =
            document.getElementById("nomFichier").value.trim() || "export";
        XLSX.writeFile(wb, fileName + ".xlsx");

        showToast("📦 Fichier exporté avec succès !", "success");
    } catch (error) {
        console.error("Erreur lors de l’export:", error);
        showToast("❌ Une erreur est survenue lors de l’export. ⚠️", "danger");
    }
}

// ====================
// دوال مساعدة
// ====================
function toggleProductForm() {
    const form = document.getElementById("productForm");
    form.style.display = form.style.display === "none" ? "block" : "none";
}

function resetProductForm() {
    document
        .querySelectorAll("#productForm input")
        .forEach(input => (input.value = ""));
}

// ====================
// ماسح QR Code
// ====================
scanBtn.addEventListener("click", async () => {
    if (isScanning) {
        await html5QrCode.stop();
        await html5QrCode.clear();
        reader.style.display = "none";
        scanBtn.innerHTML = '<i class="fa fa-qrcode"></i> Scanner';
        isScanning = false;
        return;
    }

    try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) throw new Error("لا توجد كاميرات متاحة");
        const camera =
            cameras.find(cam => cam.label.toLowerCase().includes("back")) ||
            cameras[0];
        reader.style.display = "block";

        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");

        const config = {
            fps: 15, // رفع عدد الإطارات يجعل المسح أسلس وأسرع
            qrbox: { width: 380, height: 380 }, // تحديد أبعاد دقيقة للصندوق
            aspectRatio: 1.0, // الحفاظ على نسبة عرض لارتفاع ثابتة يساعد في التركيز
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true // استخدام تسريع العتاد إذا كان متاحاً في المتصفح
            }
        };

        await html5QrCode
            .start(
                { deviceId: { exact: camera.id } },
                config,
                decodedText => {
                    // بمجرد العثور على الكود، نوقف المسح فوراً لمنع التكرار
                    html5QrCode
                        .stop()
                        .then(() => {
                            beepSound.play();
                            input.value = decodedText;
                            html5QrCode.clear();

                            reader.style.display = "none";
                            scanBtn.innerHTML =
                                '<i class="fa fa-qrcode"></i> Scanner';
                            isScanning = false;

                            // تنفيذ البحث تلقائياً
                            searchBtn.click();
                        })
                        .catch(err => {
                            console.error("خطأ أثناء إيقاف الكاميرا:", err);
                        });
                },
                errorMessage => {
                    // هذا الجزء اختياري: يُنفذ عند عدم وجود كود في الإطار (لا تضع تنبيهات هنا)
                }
            )
            .catch(err => {
                console.error("فشل بدء الكاميرا:", err);
            });

        scanBtn.innerHTML = '<i class="fa fa-stop"></i> Arrêter le scanner';
        isScanning = true;
    } catch (err) {
        alert("خطأ في تشغيل الكاميرا: " + err.message);
        reader.style.display = "none";
        isScanning = false;
    }
});

// ====================
// تنظيف بيانات البائع من LocalStorage
// ====================
function clearTableVendeur() {
    if (confirm("هل أنت متأكد من مسح جميع البيانات؟")) {
        localStorage.clear();
        showToast("🧹 Données effacées avec succès", "success");
        localStorage.removeItem(
            `products_${localStorage.getItem("nameVendeur")}`
        );
        window.location.reload();
    }
}
// 🧠 وظيفة البحث المحلي
document.getElementById("searchLocal").addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase().trim();
    const rows = document.querySelectorAll("table tbody tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const gencode = row.children[1]?.textContent.toLowerCase() || "";
        const anpf = row.children[2]?.textContent.toLowerCase() || "";
        const fournisseur = row.children[3]?.textContent.toLowerCase() || "";
        const adresse = row.children[7]?.textContent.toLowerCase() || "";

        const match =
            gencode.includes(searchTerm) ||
            anpf.includes(searchTerm) ||
            fournisseur.includes(searchTerm) ||
            adresse.includes(searchTerm);

        row.style.display = match ? "" : "none";

        if (match) visibleCount++;
    });

    if (!searchTerm) {
        showToast("🔍 Veuillez saisir un mot-clé pour la recherche", "info");
    } else if (visibleCount === 0) {
        showToast("❌ Aucun résultat trouvé", "warning");
    } else {
        showToast(`✅ ${visibleCount} résultat(s) trouvé(s)`, "success");
    }
});

function clearForm() {
    document.getElementById("textSearch").value = "";
    document.getElementById("libelle").value = "";
    document.getElementById("gencode").value = "";
    document.getElementById("anpf").value = "";
    document.getElementById("fournisseur").value = "";
    document.getElementById("stock").value = "";
    document.getElementById("prix").value = "";
    document.getElementById("qteInven").value = "";
}

// دالة عرض الرسالة
function showToast(message, type = "", duration = 3000) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.className = `toast ${type}`;
    }, duration);
}

// استبدلها بـ:
showToast("🗑️ تم حذف المنتج بنجاح", "success");
showToast("❌ حدث خطأ أثناء حذف المنتج", "error");
showToast("⚠️ المرجو إدخال اسم البائع أولاً", "warning");
showToast("ℹ️ جارٍ تحميل المنتجات...", "info");

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/service-worker.js")
        .then(() => console.log("Service Worker registered"))
        .catch(err => console.error("SW registration failed:", err));
}

const menuToggle = document.querySelector(".menu-toggle");
const menuRound = document.querySelector(".menu-round");
const menuLines = document.querySelectorAll(".menu-line");
const btnApp = document.querySelectorAll(".btn-app");
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("open");
    menuRound.classList.toggle("open");
    menuLines.forEach(line => line.classList.toggle("open"));

    btnApp.forEach(e => {
        e.classList.toggle("active");
    });
});
}