const icon = document.querySelector(".icon");
const readerDiv = document.getElementById("reader");
const input = document.querySelector(".input");
const ticket = document.querySelector(".ticket");
const btnFermer = document.querySelector(".fermer");


let html5QrCode = null;
let isScanning = false;

function showReader() {
    readerDiv.style.display = "block";
    btnFermer.style.display = "block";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    if (isScanning) return; // لا تعيد التشغيل إذا كان يعمل

    isScanning = true;

    Html5Qrcode.getCameras()
        .then(devices => {
            if (devices && devices.length) {
                const backCamera =
                    devices.find(device =>
                        device.label.toLowerCase().includes("back")
                    ) || devices[0];

                html5QrCode
                    .start(
                        { deviceId: { exact: backCamera.id } },
                        { fps: 3, qrbox: 300 },
                        qrCodeMessage => {
                            html5QrCode.stop().then(() => {
                                html5QrCode.clear();
                                input.value = qrCodeMessage;
                                isScanning = false;
                                hideReader();

                                const searchButton =
                                    document.querySelector(".Subscribe-btn");
                                if (searchButton) searchButton.click();
                            });
                        },
                        errorMessage => {
                            // تجاهل الأخطاء المؤقتة
                        }
                    )
                    .catch(err => {
                        console.error("فشل بدء الكاميرا:", err);
                        isScanning = false;
                        hideReader();
                    });
            } else {
                console.error("لا توجد كاميرات متاحة.");
                isScanning = false;
                hideReader();
            }
        })
        .catch(err => {
            console.error("خطأ في الحصول على الكاميرات:", err);
            isScanning = false;
            hideReader();
        });
}

function stopReader() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            isScanning = false;
            hideReader();
        }).catch(err => {
            console.warn("تعذر إيقاف الماسح:", err);
            isScanning = false;
            hideReader();
        });
    } else {
        hideReader();
    }
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
    <h4><span>LIBELLE :</span> ${product.LIBELLE}</h4>
    <div class="date">Date : ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}</div>
    <div class="items">
      <div><span class="i1">GenCode</span><span class="i2"><i class="fa-solid fa-barcode"></i></span><span class="i3">${
          product.GENCOD_P
      }</span></div>
      <div><span class="i1">ANPF</span><span class="i2"><i class="fa-solid fa-qrcode"></i></span><span class="i3">${
          product.ANPF
      }</span></div>
      <div><span class="i1">Fourni</span><span class="i2"><i class="fa-solid fa-user-tie"></i></span><span class="i3">${
          product.FOURNISSEUR_P
      }</span></div>
      <div><span class="i1">Stock</span><span class="i2"><i class="fa-solid
      fa-boxes-stacked"></i></span><span id="stk" class="i3">${
          product.STOCK
      }</span></div>
      <div><span class="i1">Status</span><span class="i2"><i class="fas fa-exclamation-triangle"></i></span><span class="i3" id="etatProduit" ></span></div>
    </div>
    <div class="total">
      <span class="i1">prix</span><span class="i3 i4">${
          product.PV_TTC
      } DH</span>
    </div>
    <div class="footer">Merci de votre visite !</div>
`;
            const etatElement = document.getElementById("etatProduit");
            if (product.LIBELLE.trim().startsWith("[S]")) {
                etatElement.textContent = "Produit Désactivé";
                etatElement.style.setProperty(
                    "background-color",
                    "orange",
                    "important"
                );
                etatElement.style.setProperty("font-size", "16px", "important");
                etatElement.style.setProperty("color", "red", "important");
            } else {
                etatElement.textContent = "Produit Active";
                etatElement.style.setProperty(
                    "background-color",
                    "#fff",
                    "important"
                );
                etatElement.style.setProperty("font-size", "16px", "important");
                etatElement.style.setProperty("color", "green", "important");
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

// Service Worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then(registration => {
                console.log(
                    "Service Worker registered with scope:",
                    registration.scope
                );
            })
            .catch(error => {
                console.error("Service Worker registration failed:", error);
            });
    });
}

// كود تخزين بيانات الموقع داخل كاش

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open("v1").then(function (cache) {
            return Promise.all(
                urlsToCache.map(url =>
                    fetch(url)
                        .then(response => {
                            if (!response.ok)
                                throw new Error("Failed to fetch " + url);
                            return cache.put(url, response.clone());
                        })
                        .catch(err => {
                            console.warn("لم يتم تخزين:", url, err);
                        })
                )
            );
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // إذا وجدنا الملف في الكاش نرجعه
            if (response) {
                return response;
            }

            // إذا لم نجده نحاول تحميله من الشبكة
            return fetch(event.request).catch(() => {
                // في حال فشل الاتصال بالشبكة (مثلاً بدون إنترنت)، نظهر صفحة offline إن كانت موجودة
                if (event.request.mode === "navigate") {
                    return caches.match("/offline.html");
                }
            });
        })
    );
});
