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
    document.getElementById("Anpf").value = data.anpf || "";
    document.getElementById("title").value = libelleClean || "";
    document.getElementById("barcode").value = data.genCode;
    document.getElementById("price").value = PrixTotal || 0;
}

/* render */
function renderCards() {
    const container = document.getElementById("cards");
    container.innerHTML = "";

    cards.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <div class="actionss">
                <button onclick="deleteCard(${i})">❌</button>
            </div>

            <div class="top">
                <div class="title">${card.title}</div>

                <div class="row">
                    <div id="data">${card.code}</div>
                    <svg class="barcode"></svg>
                </div>

                <div class="row">
                    <div id="data">${card.date}</div>
                    <div class="barcode2">${card.barcode}</div>
                </div>
            </div>

            <div class="bottom">${card.price}.00 DH</div>
        `;

        container.appendChild(div);
    });

    generateBarcodes();
}
function getFormattedDate() {
    return new Date().toLocaleDateString("fr-FR");
}

/* add / update */
function addCard() {
    const newCard = {
        title: title.value,
        code: Anpf.value,
        barcode: barcode.value,
        price: price.value,
        date: getFormattedDate()
    };

    if (editIndex === -1) {
        cards.push(newCard);
    } else {
        cards[editIndex] = newCard;
        editIndex = -1;
    }

    localStorage.setItem("cards", JSON.stringify(cards));
    renderCards();
    document.querySelector(".form-info").style.display = "none";
}

/* delete */
function deleteCard(i) {
    if (confirm("حذف؟")) {
        cards.splice(i, 1);
        localStorage.setItem("cards", JSON.stringify(cards));
        renderCards();
    }
}

/* clear */
function clearCards() {
    localStorage.removeItem("cards");
    cards = [];
    renderCards();
}

/* scanner */
function startScanner() {
    const scanner = new Html5Qrcode("reader");

    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 200 },
        code => {
            document.getElementById("barcode").value = code;
            scanner.stop();
        }
    );
}

/* PDF */
async function downloadPDF() {
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF("landscape", "in", [1.97, 1.37]);

    const cardsElements = document.querySelectorAll(".card");

    document.querySelector(".cards").style.zoom = " 1";

    const cardsAll = document.querySelectorAll(".card");

    cardsAll.forEach(e => {
        //e.style.transform = " rotate(180deg)";
        e.style.border = " none";
        e.querySelector(".actionss").style.display = " none";
    });

    for (let i = 0; i < cardsElements.length; i++) {
        const canvas = await html2canvas(cardsElements[i], {
            scale: 1,
            useCORS: true
        });

        const imgData = canvas.toDataURL("image/png");

        if (i !== 0) {
            pdf.addPage([1.97, 1.37], "landscape");
        }

        pdf.addImage(imgData, "PNG", 0, 0, 1.97, 1.37);
    }

    pdf.save("balisage.pdf");
    setTimeout(() => {
        window.location.reload();
    }, 3000);
}

function generateBarcodes() {
    const svgElements = document.querySelectorAll(".barcode");

    svgElements.forEach((svg, i) => {
        JsBarcode(svg, cards[i].barcode, {
            format: "CODE128",
            width: 1.2,
            height: 30,
            displayValue: false,
            margin: 0
        });
    });
}

renderCards();
