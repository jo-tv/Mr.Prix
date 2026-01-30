const scaner = document.getElementById("scaner");
const readerDiv = document.getElementById("reader");
const btnFermer = document.querySelector(".fermer");

let html5QrCode = null;
let isScanning = false;

function showReader() {

  const readerDiv = document.getElementById("reader");
  const btnFermer = document.querySelector(".fermer");
  const beepSound = new Audio("/sounds/beep.mp3");

  readerDiv.style.display = "block";
  btnFermer.style.display = "block";

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
        alert(
          "🚫 لا توجد كاميرات متاحة. تأكد من منح الإذن!"
        );
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

      html5QrCode.start(
        { deviceId: { exact: backCamera.id } },
        config,
        (decodedText) => {
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
}

btnFermer.addEventListener("click", stopReader);


// ------------===========================

const container = document.getElementById("cardsContainer");
// 1. وظيفة حفظ البيانات في LocalStorage
function saveToLocal() {
  const cardsData = [];
  document.querySelectorAll(".card").forEach(card => {
    // نأخذ innerText لتجاهل الـ <span> والحصول على الرقم فقط (مثل 139,90)
    let rawPrice = card.querySelector(".amount").innerText;

    cardsData.push({
      title: card.querySelector(".title").textContent,
      amount: rawPrice.replace(",", ".").trim(), // نحول الفاصلة لنقطة للتخزين البرمجي
      ref: card.querySelector(".Ref").value,
      sku: card.querySelector(".sku").textContent,
      date: card.querySelector(".date").textContent
    });
  });
  localStorage.setItem("saved_cardsA6", JSON.stringify(cardsData));
}

// 2. وظيفة استعادة البيانات
function loadFromLocal() {
  const data = JSON.parse(
    localStorage.getItem("saved_cardsA6") || "[]"
  );
  if (data.length === 0) {
    addCard(); // إضافة بطاقة فارغة إذا كانت الذاكرة فارغة
  } else {
    data.forEach(item => addCard(item));
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
        <div class="title" contenteditable="true">${data ? data.title : ""
    }</div>
        <div class="arc">
            <svg viewBox="0 0 1000 300" preserveAspectRatio="none" style="width: 100%; height: 100%">
                <path d="M0,200 C200,60 800,60 1000,200 L1000,300 L0,300 Z" fill="#fff"/>
                <path d="M0,210 C200,80 800,80 1000,210" stroke="#a82d29" stroke-width="60" fill="none" />
            </svg>
        </div>
        <div class="price">
            <span class="amount" contenteditable="true">${displayAmount}</span>
            <span class="unit"> Dh</span>
        </div>
        <div class="small-box"></div>
        <div class="meta">
            <div>Réf : <input type="number" class="Ref"  value="${data ? data.ref : ""
    }" placeholder="GenCode.."></div>
            <div style="margin-top:10px">SKU : <span class="sku">${data ? data.sku : ""
    }</span></div>
        </div>
        <div class="date">${data ? data.date : getFormattedDate()}</div>
    `;

  // --- أحداث الحفظ التلقائي ---

  // عند الكتابة في أي مكان داخل الكارد
  card.addEventListener("input", () => {
    saveToLocal();
  });

  // عند خروج المؤشر من حقل السعر (blur)، نعيد تنسيقه فوراً لضمان الشكل الصحيح
  const amountSpan = card.querySelector(".amount");
  amountSpan.addEventListener("blur", () => {
    amountSpan.innerHTML = formatPrice(amountSpan.innerText);
    saveToLocal();
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
            document
                .getElementById("downloadAll")
                .addEventListener("click", async () => {
                    const { jsPDF } = window.jspdf;
                    const cards = document.querySelectorAll(".card");
                    const pdf = new jsPDF("p", "mm", "a4");

                    for (let i = 0; i < cards.length; i++) {
                        const clone = cards[i].cloneNode(true);
                        // إخفاء زر الحذف في النسخة
                        clone.querySelector(".remove-btn").remove();

                        Object.assign(clone.style, {
                            position: "fixed",
                            left: "-10000px",
                            top: "0",
                            width: "105mm",
                            height: "148mm"
                        });
                        document.body.appendChild(clone);

                        // حل مشكلة الـ SVG
                        await prepareSvg(clone);

                        const canvas = await html2canvas(clone, {
                            scale: 2,
                            useCORS: true
                        });
                        const imgData = canvas.toDataURL("image/jpeg", 1.0);

                        const x = (i % 2) * 105;
                        const y = (Math.floor(i / 2) % 2) * 148;

                        pdf.addImage(imgData, "JPEG", x, y, 105, 148);

                        if ((i + 1) % 4 === 0 && i + 1 < cards.length)
                            pdf.addPage();

                        document.body.removeChild(clone);
                    }
                    pdf.save("AfficheA6.pdf");
                });
// دوال مساعدة
function getFormattedDate() {
  return new Date().toLocaleDateString("fr-FR");
}

/*--- دالة التنسيق الذكي ---*/
function formatPrice(priceValue) {
  if (
    priceValue === undefined ||
    priceValue === null ||
    priceValue === ""
  )
    return "0";

  // تنظيف القيمة من أي رموز غير رقمية باستثناء النقطة والفاصلة
  let cleanValue = String(priceValue)
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  let parts = cleanValue.split(".");

  let mainPart = parts[0] || "0";
  let centsPart = parts[1]
    ? parts[1].padEnd(2, "0").substring(0, 2)
    : "00";

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

  fetch(`/api/produit/${code}`)
    .then(res => res.json())
    .then(data => {
      if (data) {
        card.querySelector(".title").textContent =
          data.libelle.replace(/\[.*?\]/g, "");
        card.querySelector(".sku").textContent = data.anpf;
        // هنا التعديل الجوهري
        card.querySelector(".amount").innerHTML =
          formatPrice(data.prix);
        saveToLocal();
      }
    });
}

/*  document.getElementById("addCardBtn").onclick = () => addCard();*/
document
  .getElementById("addCardBtn")
  .addEventListener("click", () => {
    addCard();
    scrollToLastCard();
  });

function scrollToLastCard() {
  const cards = document.querySelectorAll(".card");
  const lastCard = cards[cards.length - 1];

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
  loadFromLocal(), scaner.addEventListener("click", showReader)
};

const menuToggle = document.querySelector('.menu-toggle');
const menuRound = document.querySelector('.menu-round');
const menuLines = document.querySelectorAll('.menu-line');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  menuRound.classList.toggle('open');
  menuLines.forEach(line => line.classList.toggle('open'));
});
