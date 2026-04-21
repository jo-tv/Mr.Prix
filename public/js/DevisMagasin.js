/* ===================================== */
/*   DEVlS MAGASIN - SYSTEM SCRIPT       */
/* ===================================== */

let produitActuel = null;
let panier = JSON.parse(localStorage.getItem("panier")) || [];
const TAUX_TVA = 20;

let formInfo = document.querySelector(".form-info");

/* ===================================== */
/*  INIT                                 */
/* ===================================== */

document.addEventListener("DOMContentLoaded", function () {
    const btnRecherche = document.getElementById("btnRecherche");
    const btnAjouter = document.querySelector(
        ".article-form .add-btn:last-of-type"
    );
    document.querySelector(".name-client").textContent =
        localStorage.getItem("nameDevies") || "NAME CLIENT";

    if (btnRecherche) {
        btnRecherche.addEventListener("click", getProduit);
    }

    if (btnAjouter) {
        btnAjouter.addEventListener("click", ajouterAuTableau);
    }

    afficherPanier();
});

/* ===================================== */
/*  GET PRODUIT                          */
/* ===================================== */

async function getProduit() {
    const code = document.getElementById("code").value.trim();
    if (!code) return alert("Veuillez entrer un code");

    try {
        const response = await fetch(`/api/produit/${code}`);
        const data = await response.json();

        // التأكد من أن هناك رسالة موجودة في الـ JSON
        const message = data.message || "Une erreur est survenue";

        if (!response.ok) {
            // وضع الرسالة في عنصر .message
            const messageElem = document.querySelector(".message");
            if (messageElem) {
                messageElem.textContent = message;
                document.querySelector(".card").style.display = "block";
            } else {
                alert(message); // احتياطي إذا العنصر غير موجود
            }
            return; // منع استكمال العملية
        }

        // حفظ المنتج الحالي وملء النموذج
        produitActuel = data;
        remplirForm(data);
    } catch (err) {
        alert("Erreur: " + err.message);
    }
}

/* ===================================== */
/*  REMPLIR FORM                         */
/* ===================================== */

function remplirForm(data) {
    let libelleClean = data.libelle.replace(/\s*\[[^\]]*\]\s*/g, "").trim();

    let PrixTotal =
        data.prixPro <= 0 || data.prixPro == "" ? data.prix : data.prixPro;
    document.getElementById("anpf").value = data.anpf || "";
    document.getElementById("libelle").value = libelleClean || "";
    document.getElementById("qte").value = 1;
    document.getElementById("prix").value = PrixTotal || 0;
    document.getElementById("taxe").value = data.taxe || 0;
    formInfo.style.display = "block";
}

/* ===================================== */
/*  AJOUTER AU PANIER                    */
/* ===================================== */

function ajouterAuTableau() {
    if (!produitActuel) {
        return;
    }

    const code = document.getElementById("code").value;
    const anpf = document.getElementById("anpf").value;
    const libelle = document.getElementById("libelle").value;
    const qte = parseFloat(document.getElementById("qte").value);
    const prix = parseFloat(document.getElementById("prix").value);
    const taxe = parseFloat(document.getElementById("taxe").value) || 0;

    if (!qte || qte <= 0) {
        alert("Quantité invalide");
        return;
    }

    const exist = panier.find(p => p.code === code);

    if (exist) {
        exist.qte += qte;
    } else {
        panier.unshift({
            code,
            anpf,
            libelle,
            qte,
            prix,
            taxe
        });
    }
    formInfo.style.display = "none";
    sauvegarder();
    afficherPanier();
    resetForm();
}

/* ===================================== */
/*  AFFICHER PANIER                      */
/* ===================================== */

function afficherPanier() {
    const tbody = document.getElementById("articleTable");
    if (!tbody) return;
    tbody.innerHTML = "";

    panier.forEach((item, index) => {
        const total = item.qte * item.prix;

        tbody.innerHTML += `
            <tr>
                <td>${item.anpf}</td>
                <td class="lible">${item.libelle}</td>
                <td></td>
                <td>${item.qte}</td>
                <td>${item.prix.toFixed(2)}</td>
                <td>${total.toFixed(2)}</td>
                <td id="sup">
                    <button onclick="supprimer(${index})">❌</button>
                </td>
            </tr>
        `;
    });

    calculerTotaux();
}

/* ===================================== */
/*  SUPPRIMER                            */
/* ===================================== */

function supprimer(index) {
    panier.splice(index, 1);
    sauvegarder();
    afficherPanier();
}

/* ===================================== */
/*  CALCULER TOTAUX                      */
/* ===================================== */

function calculerTotaux() {
    let totalTTC = 0;
    let totalHT = 0;
    let totalTVA = 0;

    panier.forEach(item => {
        const qte = Number(item.qte) || 0;
        const prixTTC = Number(item.prix) || 0;

        const ligneTTC = qte * prixTTC;
        const ligneHT = ligneTTC / (1 + TAUX_TVA / 100);
        const ligneTVA = ligneTTC - ligneHT;

        totalTTC += ligneTTC;
        totalHT += ligneHT;
        totalTVA += ligneTVA;
    });

    document.getElementById("montantHT").textContent = totalHT.toFixed(3);
    document.getElementById("montantTVA").textContent = totalTVA.toFixed(3);
    document.getElementById("totalTTC").textContent = totalTTC.toFixed(3);
    document.getElementById("totalHT2").textContent = totalHT.toFixed(3);
    document.getElementById("tauxTVA").textContent = TAUX_TVA.toFixed(2);
}

/* ===================================== */
/*  RESET FORM                           */
/* ===================================== */

function resetForm() {
    document.getElementById("code").value = "";
    document.getElementById("anpf").value = "";
    document.getElementById("libelle").value = "";
    document.getElementById("qte").value = "";
    document.getElementById("prix").value = "";
    document.getElementById("taxe").value = "";
    produitActuel = null;
}

/* ===================================== */
/* function date                  */
/* ===================================== */
function getFormattedDate() {
    return new Date().toLocaleDateString("fr-FR");
}

document.getElementById("date").innerHTML = getFormattedDate();

/* ===================================== */
/*  SAVE LOCAL STORAGE                   */
/* ===================================== */

function sauvegarder() {
    localStorage.setItem("panier", JSON.stringify(panier));
    localStorage.setItem(
        "nameDevies",
        document.querySelector(".name-client").textContent.trim()
    );
}

/* ===================================== */
/* ACTION BUTTONS                        */
/* ===================================== */

document.addEventListener("DOMContentLoaded", function () {
    const btnPrint = document.getElementById("btnPrint");
    const btnPDF = document.getElementById("btnPDF");
    const btnScan = document.getElementById("btnScan");
    const btnClear = document.getElementById("btnClear");

    if (btnPrint) {
        btnPrint.addEventListener("click", () => window.print());
    }

    if (btnPDF) {
        btnPDF.addEventListener("click", downloadPDF);
    }

    if (btnScan) {
        btnScan.addEventListener("click", showReader);
    }

    if (btnClear) {
        btnClear.addEventListener("click", viderPanier);
    }
});

/* ===================================== */
/*  downloadPDF                      */
/* ===================================== */

async function downloadPDF() {
    // 1️⃣ إخفاء الأزرار
    const deleteButtons = document.querySelectorAll("#sup");
    const th = document.querySelectorAll("th");
    const td = document.querySelectorAll("td");
    th.forEach(btn => (btn.style.fontSize = "14px"));
    td.forEach(btn => (btn.style.fontSize = "14px"));
    deleteButtons.forEach(btn => (btn.style.display = "none"));

    const htmlFooter = document.querySelector(".footer");
    if (htmlFooter) htmlFooter.style.display = "none";

    const devis = document.getElementById("devisContent");
    if (!devis) {
        alert("Contenu Devis introuvable");
        return;
    }

    // 🟢 حفظ الحالة الأصلية
    const originalWidth = devis.style.width;
    const originalTransform = devis.style.transform;

    // 🟢 توحيد العرض (مهم للجودة)
    devis.style.width = "1000px";
    devis.style.transform = "scale(1)";

    // 🟢 إعدادات عالية الجودة
    const canvas = await html2canvas(devis, {
        scale: 2, // 🔥 جودة عالية
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#fff",
        scrollY: -window.scrollY,
        windowWidth: 1200
    });

    // 🟢 تحويل الصورة (أفضل من PNG)
    const imgData = canvas.toDataURL("image/jpeg", 1.0);

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 10;
    const footerHeight = 15;

    const imgWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2 - footerHeight;

    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // 🟢 Footer لكل صفحة
    const addFooter = () => {
        pdf.setFontSize(8);

        const footerLines = [
            "Magasin Mr. Bricolage Lot 15-16-17. Parc D’activité Marjane. Av Abdelkrim Khattabi. Marrakech",
            "TEL: 0525-060-240/241 - Fax: 05-24-29-18-87",
            "PATENTE: 47924641 / RC: 129997 / IF: 2202961 / CNSS: 6728458 / ICE: 001525045000091"
        ];

        let y = pageHeight - 12;

        footerLines.forEach(line => {
            pdf.text(line, pageWidth / 2, y, { align: "center" });
            y += 4;
        });
    };

    // 2️⃣ الصفحة الأولى
    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
    addFooter();

    heightLeft -= usableHeight;

    // 3️⃣ الصفحات الأخرى
    while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);

        pdf.addPage();

        pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);

        addFooter();

        heightLeft -= usableHeight;
    }

    // 4️⃣ حفظ الملف
    const nameDevis = document.querySelector(".name-client").textContent.trim();

    pdf.save(`${nameDevis.substring(0, 15) + "...." || "NAME CLIENT"}.pdf`);

    // 🟢 استرجاع الحالة
    devis.style.width = originalWidth;
    devis.style.transform = originalTransform;

    deleteButtons.forEach(btn => (btn.style.display = "inline-block"));
    if (htmlFooter) htmlFooter.style.display = "block";
    
}
/* ===================================== */
/*  viderPanier                      */
/* ===================================== */
function viderPanier() {
    if (!confirm("Voulez-vous vraiment vider le panier ?")) return;

    localStorage.removeItem("panier");
    localStorage.removeItem("nameDevies");
    panier = [];
    afficherPanier();
}

/* ===================================== */
/*  code scripte scanner code-bare     */
/* ===================================== */

const scaner = document.getElementById("scan-btn");
const readerDiv = document.getElementById("reader");
const btnFermer = document.querySelector(".fermer");
const containerScan = document.querySelector(".container-scan");
const refInput = document.querySelector(".Ref");

let html5QrCode = null;
let isScanning = false;

function showReader() {
    const readerDiv = document.getElementById("reader");
    const btnFermer = document.querySelector(".fermer");
    const beepSound = new Audio("/sounds/beep.mp3");

    readerDiv.style.display = "block";
    btnFermer.style.display = "block";
    containerScan.style.zIndex = "9999999";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader", {
            verbose: false
        });
    }

    if (isScanning) return;
    isScanning = true;

    Html5Qrcode.getCameras()
        .then(devices => {
            if (!devices || devices.length === 0) {
                alert("🚫 لا توجد كاميرات متاحة. تأكد من منح الإذن!");
                isScanning = false;
                hideReader();
                return;
            }

            const backCamera =
                devices.find(device =>
                    device.label.toLowerCase().includes("back")
                ) || devices[0];

            const config = {
                fps: 10,
                qrbox: { width: 350, height: 350 },
                aspectRatio: 1.7778, // 16:9 مثالي للآيفون
                facingMode: { exact: "environment" }
            };

            html5QrCode
                .start(
                    { deviceId: { exact: backCamera.id } },
                    config,
                    decodedText => {
                        beepSound.play();

                        html5QrCode.stop().then(() => {
                            html5QrCode.clear();

                            if (!code) {
                                alert("⚠️ لا توجد بطاقة لإدخال الرمز");
                                isScanning = false;
                                hideReader();
                                return;
                            }

                            // ✨ نضع الكود في آخر كارت
                            refInput.value = decodedText;

                            const btnRecherche =
                                document.getElementById("btnRecherche");

                            if (btnRecherche) btnRecherche.click();

                            // محاكاة الضغط على زر Enter
                            refInput.dispatchEvent(
                                new KeyboardEvent("keydown", {
                                    key: "Enter",
                                    code: "Enter",
                                    which: 13,
                                    keyCode: 13,
                                    bubbles: true
                                })
                            );

                            // كذلك نطلق change كضمان إضافي
                            refInput.dispatchEvent(new Event("change"));

                            isScanning = false;
                            hideReader();
                        });
                    },
                    errorMessage => {
                        // يمكن تجاهل أخطاء القراءة المؤقتة
                    }
                )
                .catch(err => {
                    console.error("📷 فشل بدء الكاميرا:", err);
                    alert(
                        "📵 تعذر فتح الكاميرا. تأكد من منح الصلاحيات أو استخدام متصفح يدعم الكاميرا."
                    );
                    isScanning = false;
                    hideReader();
                });
        })
        .catch(err => {
            console.error("⚠️ خطأ في الحصول على الكاميرات:", err);
            alert(
                "⚠️ تعذر الوصول إلى الكاميرات. قد تحتاج إلى تغيير المتصفح أو السماح بالوصول."
            );
            isScanning = false;
            hideReader();
        });
}

function stopReader() {
    const instance = window._qrCodeInstance;
    if (instance && instance._isScanning) {
        instance.stop().then(() => {
            instance.clear();
            delete window._qrCodeInstance;
            hideReader();
        });
    } else {
        hideReader();
    }
}

function hideReader() {
    readerDiv.style.display = "none";
    btnFermer.style.display = "none";
    containerScan.style.zIndex = "-9999999";
}

btnFermer.addEventListener("click", stopReader);

/* ===================================== */
/*  code script menu toggel     */
/* ===================================== */

const menuToggle = document.querySelector(".menu-toggle");
const menuRound = document.querySelector(".menu-round");
const menuLines = document.querySelectorAll(".menu-line");

const btnApp = document.querySelectorAll(".btn-app");
menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("open");
    menuRound.classList.toggle("open");
    menuLines.forEach(line => line.classList.toggle("open"));

    btnApp.forEach(e => {
        e.classList.toggle("active");
    });
});
