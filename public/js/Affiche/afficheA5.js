const scaner = document.getElementById("scaner");
const readerDiv = document.getElementById("reader");
const btnFermer = document.querySelector(".fermer");
const containerScan = document.querySelector(".container-scan");

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

                            // 🧠 نأخذ آخر بطاقة
                            const cards = document.querySelectorAll(".card");
                            const lastCard = cards[cards.length - 1];

                            if (!lastCard) {
                                alert("⚠️ لا توجد بطاقة لإدخال الرمز");
                                isScanning = false;
                                hideReader();
                                return;
                            }

                            const refInput = lastCard.querySelector(".Ref");

                            // ✨ نضع الكود في آخر كارت
                            refInput.value = decodedText;

                            // 🔥 نشغل نفس سلوك الإدخال اليدوي
                            refInput.focus();

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

// ------------===========================

const container = document.getElementById("cardsContainer");
// 1. وظيفة حفظ البيانات في LocalStorage
function saveToLocal() {
    const cardsData = [];

    const cards = document.querySelectorAll(".card");
    document.querySelector(".item-count").textContent = cards.length;
    cards.forEach(card => {
        const amountEl = card.querySelector(".amount");
        const oldPriceEl = card.querySelector(".old-price");

        let rawPrice = amountEl.textContent.replace(",", ".").trim();
        let oldPrice = oldPriceEl.textContent.replace(",", ".").trim();

        let currentPrice = parseFloat(rawPrice) || 0;
        let previousPrice = parseFloat(oldPrice) || 0;

        // قلب القيم إذا كان هناك خصم
        if (previousPrice > currentPrice && previousPrice > 0) {
            [currentPrice, previousPrice] = [previousPrice, currentPrice];
        }

        cardsData.push({
            title: card.querySelector(".title").textContent,
            amount: currentPrice,
            ref: card.querySelector(".Ref").value,
            sku: card.querySelector(".sku").textContent,
            date: card.querySelector(".date").textContent,
            dateDebut: card.querySelector(".debut").textContent,
            dateFin: card.querySelector(".fin").textContent,
            oldPrice: previousPrice,
            porcent: card.querySelector(".porcent").textContent
        });
    });

    localStorage.setItem("saved_cardsA5", JSON.stringify(cardsData));
}

// 2. وظيفة استعادة البيانات
function loadFromLocal() {
    const data = JSON.parse(localStorage.getItem("saved_cardsA5") || "[]");
    document.querySelector(".item-count").textContent = data.length;
    if (data.length === 0) {
        addCard(); // إضافة بطاقة فارغة إذا كانت الذاكرة فارغة
    } else {
        data.forEach(item => addCard(item));
        document.querySelector(".item-count").textContent = data.length;
    }
}

function updatePromotion(card) {
    const amountEl = card.querySelector(".amount");
    const oldPriceEl = card.querySelector(".old-price");
    const percentEl = card.querySelector(".porcent");
    const promoBox = card.querySelector(".promo-box");
    const prixTest = card.querySelector(".price");
    const dateValable = card.querySelector(".dateValable");

    let rawPrice = amountEl.textContent.replace(",", ".").trim();
    let oldPrice = oldPriceEl.textContent.replace(",", ".").trim();

    let currentPrice = parseFloat(rawPrice) || 0;
    let previousPrice = parseFloat(oldPrice) || 0;

    if (previousPrice > 0) {
        promoBox.style.display = "block";
        dateValable.style.display = "block";
        prixTest.style.top = "69mm";
        // قلب القيم
        [currentPrice, previousPrice] = [previousPrice, currentPrice];

        // تحديث الواجهة
        amountEl.innerHTML = formatPrice(currentPrice);
        oldPriceEl.innerHTML = formatPrice(previousPrice);

        // حساب نسبة الخصم
        let percent = ((previousPrice - currentPrice) / previousPrice) * 100;
        percentEl.textContent = "-" + percent.toFixed(0) + "%";
    } else {
        // إخفاء البوكس إذا لم يوجد خصم
        promoBox.style.display = "none";
        dateValable.style.display = "none";
        percentEl.textContent = "0%";
        prixTest.style.top = "80mm";
    }
}

// 3. وظيفة إضافة بطاقة (إنشاء الـ DOM)
function addCard(data = null) {
    const card = document.createElement("div");
    card.className = "card";

    // نستخدم الدالة لتنسيق المبلغ سواء كان قادماً من الـ API أو الـ LocalStorage
    const displayAmount = data ? formatPrice(data.amount) : "0";
    card.innerHTML = `
        <div class="remove-btn">X</div>
        <div contenteditable="true" class="title">${data ? data.title : ""}</div>
        <div class="arc">
          <svg viewBox="0 -220 1000 620" preserveAspectRatio="none"
               style="width:100%; height:100%;">
          
              <!-- الشكل الأبيض -->
              <path d="M0,260 C250,-160 750,-160 1000,260 L1000,400 L0,400 Z"
                    fill="transparent"/>
          
              <!-- القوس الأحمر -->
              <path d="M0,260 C250,50 750,50 1000,260"
                    stroke="#a82d29"
                    stroke-width="60"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="promo-box">
          <div class="promo-title">Promotion</div>
          <div class="promo-content">
              <div class="porcent">${data ? data.porcent : ""}</div>
              <div class="old-price">${data ? data.oldPrice : ""}</div>
         </div>
        </div>
        <div class="price">
            <span class="amount" >${displayAmount}</span>
            <span class="unit"> Dh</span>
        </div>
         <div class="small-box"></div>
         <div class="meta">
            <div>Réf : <input type="number" class="Ref"  value="${data ? data.ref : ""}" placeholder="GenCode..">
        </div>
        <div style="margin-top:10px">SKU : <span class="sku">${data ? data.sku : ""}</span>
        </div>
           <div class ="dateValable">
           <div>
             Valable : Du <span class="debut"> ${data ? data.dateDebut : ""}</span >
            </div>
            <div>
            Au <span class="fin">  ${data ? data.dateFin : ""}</span>
            </div >
            </div >
        </div >
    <div class="date">${data ? data.date : getFormattedDate()}</div>
  `;
    updatePromotion(card);
    // --- أحداث الحفظ التلقائي ---
    // عند الكتابة في أي مكان داخل الكارد
    card.addEventListener("input", () => {
        updatePromotion(card);
        saveToLocal();
    });

    // عند خروج المؤشر من حقل السعر (blur)، نعيد تنسيقه فوراً لضمان الشكل الصحيح
    const amountSpan = card.querySelector(".amount");
    amountSpan.addEventListener("blur", () => {
        amountSpan.innerHTML = formatPrice(amountSpan.innerText);
        saveToLocal();
        fetchPriceDynamic(card, input);
    });

    card.querySelector(".remove-btn").onclick = () => {
        card.remove();
        saveToLocal();
    };

    const refInput = card.querySelector(".Ref");
    refInput.addEventListener("change", () =>
        fetchPriceDynamic(card, refInput)
    );

    container.appendChild(card);
}

// 4. معالجة الـ SVG المعقدة (التحويل لـ Image يضمن ظهورها في الـ PDF)
async function prepareSvg(cardElement) {
    const svg = cardElement.querySelector("svg");
    const canvas = document.createElement("canvas");
    if (!svg) return; // 🔥 مهم جداً
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    // ضبط أبعاد الكانفس بناءً على أبعاد الـ SVG في الصفحة
    canvas.width = svg.clientWidth * 2;
    canvas.height = svg.clientHeight * 2;

    const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8"
    });
    const url = URL.createObjectURL(svgBlob);

    await new Promise(resolve => {
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const pngUrl = canvas.toDataURL("image/png");
            const newImg = document.createElement("img");
            newImg.src = pngUrl;
            newImg.style.width = "100%";
            newImg.style.height = "100%";
            svg.replaceWith(newImg);
            URL.revokeObjectURL(url);
            resolve();
        };
        img.src = url;
    });
}

// 5. تحميل الـ PDF
document.getElementById("downloadAll").addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const cards = document.querySelectorAll(".card");

    if (cards.length === 0) return;

    // 🎯 progress UI
    const overlay = document.getElementById("loaderOverlay");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    overlay.style.display = "flex";
    document.body.style.pointerEvents = "none";

    let done = 0;
    const total = cards.length;

    const pdf = new jsPDF("p", "mm", "a5");

    const cardWidth = 148;
    const cardHeight = 210;

    try {
        for (let i = 0; i < cards.length; i++) {
            const clone = cards[i].cloneNode(true);

            const removeBtn = clone.querySelector(".remove-btn");
            clone.querySelector(".arc")?.remove();
            if (removeBtn) removeBtn.remove();
            clone.style.zoom = "1";
            Object.assign(clone.style, {
                position: "fixed",
                left: "-10000px",
                top: "0",
                width: "148mm",
                height: "210mm",
                display: "block",
                background: "#ffffff"
            });

            document.body.appendChild(clone);

            if (typeof prepareSvg === "function") {
                await prepareSvg(clone);
            }

            const canvas = await html2canvas(clone, {
                scale: 1.3,
                useCORS: true,
                backgroundColor: "#ffffff"
            });

            const imgData = canvas.toDataURL("image/jpeg", 1.0);

            pdf.addImage(imgData, "JPEG", 0, 0, cardWidth, cardHeight);

            if (i < cards.length - 1) {
                pdf.addPage("a5", "p");
            }

            document.body.removeChild(clone);

            // 📊 تحديث progress
            done++;
            const percent = Math.round((done / total) * 100);
            progressBar.style.width = percent + "%";
            progressText.innerText = percent + "%";
        }

        pdf.save("AfficheA5.pdf");
        progressText.innerText = "تم الانتهاء ✅";
    } catch (err) {
        console.error(err);
        progressText.innerText = "حدث خطأ ❌";
    } finally {
        setTimeout(() => {
            overlay.style.display = "none";
            document.body.style.pointerEvents = "auto";
        }, 1200);
    }
});
// دوال مساعدة
function getFormattedDate() {
    return new Date().toLocaleDateString("fr-FR");
}

/*--- دالة التنسيق الذكي ---*/
function formatPrice(priceValue) {
    if (priceValue === undefined || priceValue === null || priceValue === "")
        return "0";

    // تنظيف القيمة من أي رموز غير رقمية باستثناء النقطة والفاصلة
    let cleanValue = String(priceValue)
        .replace(/[^\d.,]/g, "")
        .replace(",", ".");
    let parts = cleanValue.split(".");

    let mainPart = parts[0] || "0";
    let centsPart = parts[1] ? parts[1].padEnd(2, "0").substring(0, 2) : "00";

    if (centsPart === "00") {
        return mainPart;
    } else {
        return `${mainPart}<span id="cente">,${centsPart}</span>`;
    }
}

/*--- تحديث دالة جلب البيانات ---*/
function fetchPriceDynamic(card, input) {
    const code = input.value.trim();
    if (!code) return;
    const messageElem = document.querySelector(".message");
    fetch(`/api/produit/${code}`)
        .then(res => res.json())
        .then(data => {
            if (data.message != undefined) {
                messageElem.textContent = data.message;
                document.querySelector(".cardss").style.display = "block";
            }
            if (data) {
                card.querySelector(".title").textContent = data.libelle.replace(
                    /\[.*?\]/g,
                    ""
                );
                card.querySelector(".sku").textContent = data.anpf;
                card.querySelector(".Ref").value = data.genCode;
                card.querySelector(".old-price").textContent = data.prixPro;
                card.querySelector(".debut").textContent = data.dateDebut;
                card.querySelector(".fin").textContent = data.dateFin;
                // هنا التعديل الجوهري
                card.querySelector(".amount").innerHTML = formatPrice(
                    data.prix
                );
                saveToLocal();
                updatePromotion(card);
                newCards();
            }
        });
}

/*  document.getElementById("addCardBtn").onclick = () => addCard();*/
document.getElementById("addCardBtn").addEventListener("click", () => {
    addCard();
    scrollToLastCard();
});

function newCards() {
    setTimeout(() => {
        addCard();
        scrollToLastCard();
    }, 2000);
}

function scrollToLastCard() {
    const cards = document.querySelectorAll(".card");
    const lastCard = cards[cards.length - 1];
    lastCard.querySelector(".Ref").focus();
    lastCard.scrollIntoView({
        behavior: "smooth"
    });
}

document.getElementById("clearStorage").onclick = () => {
    // عبارة تأكيد احترافية بالفرنسية (أو العربية)
    const confirmation = confirm(
        "Êtes-vous sûr de vouloir supprimer toutes les étiquettes ? Cette action est irréversible."
    );

    // إذا ضغط المستخدم على "OK" يتم المسح
    if (confirmation) {
        localStorage.clear();
        location.reload();
    }
    // إذا ضغط على "Annuler" لا يحدث شيء
};

// عند فتح الصفحة

window.onload = function () {
    (loadFromLocal(),
        scaner.addEventListener("click", showReader),
        updatePromotion);
};

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
