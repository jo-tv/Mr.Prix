let cards = JSON.parse(localStorage.getItem("cards") || "[]");
let editIndex = -1;

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
                document.querySelector(".card-alert").style.display = "block";
            } else {
                alert(message); // احتياطي إذا العنصر غير موجود
            }
            return; // منع استكمال العملية
        }

        // حفظ المنتج الحالي وملء النموذج
        produitActuel = data;
        remplirForm(data);
        document.getElementById("code").value = "";
        document.querySelector(".form-info").style.display = "block";
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
    let promotion;
    data.prixPro <= 0 || data.prixPro == ""
        ? (promotion = "")
        : (promotion = "promotion");
    document.getElementById("promo").value = promotion || "";
    document.getElementById("Anpf").value = data.anpf || "";
    document.getElementById("title").value = libelleClean || "";
    document.getElementById("barcode").value = data.genCode;
    document.getElementById("price").value = (Number(PrixTotal) || 0).toFixed(
        2
    );
}

/* render */
let currentPage = 1;
const cardsPerPage = 80;
function renderCards() {
    const container = document.getElementById("cards");
    container.innerHTML = "";

    const start = (currentPage - 1) * cardsPerPage;
    const end = start + cardsPerPage;

    const paginatedCards = cards.slice(start, end);

    paginatedCards.forEach((card, i) => {
        const realIndex = start + i;

        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <div class="actionss">
                <button onclick="deleteCard(${realIndex})">❌</button>
            </div>

            <div class="top">
                <div class="title">${card.title}</div>
                <div class="promo">${card.promotion}</div>
                <div class="row">
                    <div id="data">${card.code}</div>
                    <svg class="barcode"></svg>
                </div>

                <div class="row">
                    <div id="data">${card.date}</div>
                    <div class="barcode2">${card.barcode}</div>
                </div>
            </div>

            <div class="bottom">${card.price} DH</div>
        `;

        container.appendChild(div);
        document.querySelector(".item-count").textContent = cards.length || 0;
    });

    generateBarcodes();
    renderPagination();
}
function nextPage() {
    if (currentPage * cardsPerPage < cards.length) {
        currentPage++;
        renderCards();
    }
}
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCards();
    }
}
function renderPagination() {
    const totalPages = Math.ceil(cards.length / cardsPerPage);
    document.getElementById("pageInfo").innerText =
        `صفحة ${currentPage} من ${totalPages}`;
}

/* add / update */
function getFormattedDate() {
    return new Date().toLocaleDateString("fr-FR");
}
function addCard() {
    const repetition = document.getElementById("repetition").value; // عدد المرات

    const newCard = {
        title: title.value,
        code: Anpf.value,
        barcode: barcode.value,
        price: price.value,
        promotion: promo.value,
        date: getFormattedDate()
    };

    if (editIndex === -1) {
        for (let i = 0; i < repetition; i++) {
            cards.unshift({ ...newCard }); // مهم copy باش ما يكونوش نفس المرجع
        }
    } else {
        cards[editIndex] = newCard;
        editIndex = -1;
    }

    localStorage.setItem("cards", JSON.stringify(cards));
    renderCards();
    document.querySelector("#repetition").value = "1";
    document.querySelector(".form-info").style.display = "none";
}

/* delete */
function deleteCard(i) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette étiquette ? ✅ 🚮")) {
        cards.splice(i, 1);
        localStorage.setItem("cards", JSON.stringify(cards));
        renderCards();
        document.querySelector(".item-count").textContent = cards.length || 0;
    }
}

/* clear */
function clearCards() {
    const confirmation = confirm(
        "Êtes-vous sûr de vouloir supprimer toutes les étiquettes 🚮? Cette action est irréversible. ⚠️"
    );

    // إذا ضغط المستخدم على "OK" يتم المسح
    if (confirmation) {
        localStorage.removeItem("cards");
        cards = [];
        renderCards();
        document.querySelector(".item-count").textContent = cards.length || 0;
        window.location.reload();
    }
}

/* PDF */
async function downloadPDF() {
    const { jsPDF } = window.jspdf;

    const W = 2.02;
    const H = 1.26;

    const pdf = new jsPDF("landscape", "in", [W, H]);
    const cards = document.querySelectorAll(".card");

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (i !== 0) pdf.addPage([W, H], "landscape");

        const title = card.querySelector(".title")?.innerText || "";
        const maxLength = 20;
        const shortTitle =
            title.length > maxLength
                ? title.substring(0, maxLength) + "..."
                : title;
        const title2 = ".";

        const code = card.querySelectorAll("#data")[0]?.innerText || "";
        const promo = card.querySelectorAll(".promo")[0]?.innerText || "";
        const date = card.querySelectorAll("#data")[1]?.innerText || "";
        const barcodeText = card.querySelector(".barcode2")?.innerText || "";
        const price = card.querySelector(".bottom")?.innerText || "";
        const svg = card.querySelector(".barcode");

        // --- رسم العناصر مقلوبة 180 درجة ---
        const maxLength2 = 20;
        const shortTitle2 =
            title2.length > maxLength2
                ? title2.substring(0, maxLength2) + "....................."
                : title2;
        pdf.setTextColor(201, 197, 202);
        pdf.text(shortTitle2, W - 0, H - 0.07, { angle: 180 });
        pdf.text(shortTitle2, W - 1.95, H - 0.07, { angle: 180 });
        pdf.text(shortTitle2, W - 0, H - 1.22, { angle: 180 });
        pdf.text(shortTitle2, W - 1.95, H - 1.22, { angle: 180 });
        // 1. العنوان (Title)
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(10);
        // x_new = W - 0.1 | y_new = H - 0.3
        pdf.text(shortTitle, W - 0.05, H - 0.24, { angle: 180 });

        // 2. الكود (Code)
        pdf.setFontSize(9);
        pdf.text(promo, W - 0.1, H - 0.4, { angle: 180 });
        pdf.setFontSize(6);
        pdf.text(code, W - 0.1, H - 0.55, { angle: 180 });
        // 3. التاريخ (Date)
        pdf.text(date, W - 0.1, H - 0.7, { angle: 180 });

        // 4. نص الباركود
        pdf.setFontSize(8);
        pdf.text(barcodeText, W - 0.94, H - 0.73, { angle: 180 });

        // 5. السعر (Price)
        pdf.setFontSize(19);
        // السعر في المنتصف العرضي (W/2 يبقى كما هو) ولكن يقلب عمودياً
        pdf.text(price, W / 0.95, H - 1.15, { align: "center", angle: 180 });

        // 6. الباركود (SVG)
        if (svg) {
            const clonedSVG = svg.cloneNode(true);
            const svgW = 1;
            const svgH = 1.2;
            const svgX = 0.89;
            const svgY = -0.12;

            await pdf.svg(clonedSVG, {
                // لحساب موقع الـ SVG المقلوب: نطرح الإحداثي الأصلي ونطرح حجم العنصر نفسه
                x: W - svgX - svgW,
                y: H - svgY - svgH,
                width: svgW,
                height: svgH
                // معظم مكتبات الـ SVG في jsPDF تقبل الدوران
            });
        }

        pdf.setTextColor(0, 0, 0);
    }

    pdf.save(`balisage le ${getFormattedDate()}.pdf`);
}

function generateBarcodes() {
    const containers = document.querySelectorAll(".card");

    containers.forEach(card => {
        const svg = card.querySelector(".barcode");
        const text = card.querySelector(".barcode2");

        if (!svg || !text) return;

        const value = text.textContent.trim();

        if (!value) return;

        JsBarcode(svg, value, {
            format: "CODE128",
            width: 4, // 🔥 مهم بزاف
            height: 120, // 🔥 مهم للطباعة
            displayValue: false,
            margin: 0
        });
    });
}

renderCards();

/* scanner */

const scaner = document.getElementById("scaner");
const readerDiv = document.getElementById("reader");
const btnFermer = document.querySelector(".fermer");
const containerScan = document.querySelector(".container-scan");

let html5QrCode = null;
let isScanning = false;

window.onload = function () {
    scaner.addEventListener("click", showReader);

    document.querySelector(".item-count").textContent = cards.length;
};

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
                fps: 30,
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

                            const refInput = document.querySelector(".Ref");
                            const refBtn = document.querySelector("#refBtn");

                            // ✨ نضع الكود في آخر كارت
                            refInput.value = decodedText;

                            // محاكاة الضغط على زر Enter
                            refBtn.dispatchEvent(
                                new KeyboardEvent("keydown", {
                                    key: "Enter",
                                    code: "Enter",
                                    which: 13,
                                    keyCode: 13,
                                    bubbles: true
                                })
                            );

                            // كذلك نطلق change كضمان إضافي
                            refBtn.dispatchEvent(new Event("change"));
                            refBtn.click();

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
