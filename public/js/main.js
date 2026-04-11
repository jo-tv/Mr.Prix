const icon = document.querySelector(".icon");
const readerDiv = document.getElementById("reader");
const input = document.querySelector(".input");
const ticket = document.querySelector(".ticket");
const btnFermer = document.querySelector(".fermer");
let html5QrCode = null;
let isScanning = false;

function showReader() {
    const readerDiv = document.getElementById("reader");
    const btnFermer = document.querySelector(".fermer");
    const input = document.querySelector(".input");
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
                    (decodedText, decodedResult) => {
                        beepSound.play();

                        html5QrCode.stop().then(() => {
                            html5QrCode.clear();
                            input.value = decodedText;
                            isScanning = false;
                            hideReader();

                            const searchButton =
                                document.querySelector(".Subscribe-btn");
                            if (searchButton) searchButton.click();
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

window.onload = function () {
    icon.addEventListener("click", showReader);
};

btnFermer.addEventListener("click", stopReader);

document.querySelector(".Subscribe-btn").addEventListener("click", () => {
    if (input.value === "") {
        hideReader();
    }
});

input.addEventListener("focus", hideReader);

document.querySelector(".Subscribe-btn").addEventListener("click", function () {
    const searchText = document
        .querySelector('input[name="text"]')
        .value.trim()
        .toLowerCase();

    if (!searchText) {
        showModalMessage("🛍️ من فضلك أدخل اسم المنتج أو رمزه قبل المتابعة!");
        return;
    }

    fetch(`/api/search?q=${encodeURIComponent(searchText)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("لم يتم العثور على المنتج");
            }
            document.querySelector(".ticket").style.display = "block";
            document.querySelector("input").value = "";
            return response.json();
        })
        .then(products => {
            if (!products || products.length === 0) {
                throw new Error("لم يتم العثور على المنتج");
            }
            const product = products[0];
            const ticketDiv = document.querySelector(".ticket");
            ticketDiv.innerHTML = `
       <div class="imgPromo">

    </div>
       <div class="imgFinSirie">
      <img
        src="../img/finSerie.png"
        alt="promo"
      />
    </div>
    <div class="libelle">
    <span class="i1">LIBELLE : </span> <span class="i3 lib">${product.LIBELLE}</span>
    </div>
    <div class="items">
      <div><span class="i1">GenCode</span><span class="i2"><i class="fa-solid fa-barcode"></i></span><span class="i3">${
          product.GENCOD_P || "❌"
      }</span></div>
      <div><span class="i1">ANPF</span><span class="i2"><i class="fa-solid fa-qrcode"></i></span><span class="i3">${
          product.ANPF || "❌"
      }</span></div>
      <div><span class="i1">Fourni</span><span class="i2"><i class="fa-solid fa-user-tie"></i></span><span class="i3">${
          product.FOURNISSEUR_P || "❌"
      }</span></div>
      <div><span class="i1">ReF-Four</span><span class="i2"><i class="fa-solid fa-users-gear"></i></span><span class="i3">${
          product.REFFOUR_P || "❌"
      }</span></div>
      <div><span class="i1">Stock</span><span class="i2"><i class="fa-solid
      fa-boxes-stacked"></i></span><span id="stk" class="i3">${
          product.STOCK || "-"
      }</span></div>
      <div><span class="i1">SOUS SOLUTION</span><span class="i2"><i class="fa-solid fa-map-pin"></i></span><span id="stk" class="i3" style="color:#8147ed;font-weight: 900;background: #dfd59d;">${
          product.SOUS_SOLUTION || "❌"
      }</span></div>
    </div>
    <div class="total">
      <span class="i1">prix</span><span class="i3 i4"id="prixTotal">${
          product.PV_TTC || 0
      } DH</span>
    </div>
    <div class="PrixPromo">
      <span  id="promo"> ${product.PRIXVT || 0} DH</span>
    </div>
    <div class="footer">Dernière mise à jour il y a <span> ${timeSince(
        product.createdAt || ""
    )}</span>${formatDate(product.createdAt || "")}</div>
`;

            let divPromo = document.querySelector(".PrixPromo");
            let prixPromo = document.querySelector("#promo");
            let prixTotal = document.querySelector("#prixTotal");
            let imgFinSirie = document.querySelector(".imgFinSirie");
            let footer = document.querySelector(".footer");

            function formatDate2(date) {
                const d = new Date(date);
                const day = String(d.getDate()).padStart(2, "0");
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const year = d.getFullYear();

                return `${day}/${month}/${year}`;
            }

            if (parseInt(prixPromo.textContent) !== 0) {
                divPromo.style.setProperty("display", "block", "important");
                prixTotal.style.setProperty("font-size", "30px", "important");
                prixTotal.classList.add("activePromo");
                footer.innerHTML = `
        Valable : Du  <span> ${formatDate2(
            product.DATEDEBUT
        )}</span>  Au <span>${formatDate2(product.DATEFIN)}</span>
        `;
            }
            function timeSince(dateString) {
                const now = new Date();
                const past = new Date(dateString);
                const diffMs = now - past; // الفرق بالملي ثانية

                const seconds = Math.floor(diffMs / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                const weeks = Math.floor(days / 7);
                const months = Math.floor(days / 30);
                const years = Math.floor(days / 365);

                if (years > 0) return `${years} an${years > 1 ? "s" : ""}`;
                if (months > 0) return `${months} mois`;
                if (weeks > 0) return `${weeks} semaine${weeks > 1 ? "s" : ""}`;
                if (days > 0) return `${days} jour${days > 1 ? "s" : ""}`;
                if (hours > 0) return `${hours} h ${minutes % 60} min`;
                if (minutes > 0) return `${minutes} min ${seconds % 60} s`;
                return `${seconds} sec`;
            }

            function formatDate(dateString) {
                const date = new Date(dateString);

                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();

                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");

                return `${day}/${month}/${year} ${hours}:${minutes}`;
            }

            const etatElement = document.querySelector(".lib");
            const libelle = product?.LIBELLE?.trim();

            if (etatElement && libelle) {
                if (/\[\s*GA\s*\]$/.test(libelle)) {
                    etatElement.style.setProperty(
                        "background-color",
                        "red",
                        "important"
                    );
                    etatElement.style.setProperty(
                        "font-size",
                        "16px",
                        "important"
                    );
                    etatElement.style.setProperty("color", "#fff", "important");
                    imgFinSirie.style.display = "block";
                } else if (/\[\s*A\s*\]$/.test(libelle)) {
                    etatElement.style.setProperty("color", "#fff", "important");
                    etatElement.style.setProperty(
                        "font-size",
                        "16px",
                        "important"
                    );
                    etatElement.style.setProperty(
                        "background-color",
                        "green",
                        "important"
                    );
                    imgFinSirie.style.display = "none";
                }
            }

            const stockValue = parseInt(product.STOCK);
            const stockElement = document.getElementById("stk");

            if (stockValue <= 0) {
                stockElement.style.setProperty(
                    "background-color",
                    "red",
                    "important"
                );
                stockElement.style.setProperty("color", "white", "important");
            } else if (stockValue > 0 && stockValue <= 20) {
                stockElement.style.setProperty(
                    "background-color",
                    "orange",
                    "important"
                );
                stockElement.style.setProperty("color", "white", "important");
            } else if (stockValue > 20) {
                stockElement.style.setProperty(
                    "background-color",
                    "green",
                    "important"
                );
                stockElement.style.setProperty("color", "white", "important");
            }
        })
        .catch(err => {
            showModalMessage("🔍 لم نجد أي منتج مطابق لـ: " + searchText);
            console.error("Erreur:", err);
        });
});

function showModalMessage(msg) {
    const modal = document.getElementById("modalMessage");
    const modalText = document.getElementById("modalText");
    modalText.textContent = msg;
    modal.style.display = "flex";

    // زر الإغلاق
    const closeBtn = document.getElementById("modalCloseBtn");
    closeBtn.onclick = () => {
        modal.style.display = "none";
        window.location.reload();
    };

    // إغلاق عند الضغط خارج المودال
    window.onclick = event => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };
}

// عندما تكتمل الصفحة وكل العناصر
window.addEventListener("load", function () {
    const loader = document.getElementById("wifi-loader");

    // إخفاء الـ Loader
    loader.style.display = "none";
});


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

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/service-worker.js")
        .then(() => console.log("Service Worker registered"))
        .catch(err => console.error("SW registration failed:", err));
}
