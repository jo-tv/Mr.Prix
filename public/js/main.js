const icon = document.querySelector(".icon");
const readerDiv = document.getElementById("reader");
const input = document.querySelector(".input");
const ticket = document.querySelector(".ticket");
const btnFermer = document.querySelector(".fermer");
let html5QrCode = null;

function showReader() {
    readerDiv.style.display = "block";
    btnFermer.style.display = "block";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    if (!html5QrCode._isScanning) {
        html5QrCode
            .start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                qrCodeMessage => {
                    input.value = qrCodeMessage;
                    stopReader();
                },
                errorMessage => {
                    // تجاهل الأخطاء المؤقتة
                }
            )
            .catch(err => {
                console.error("فشل بدء الكاميرا:", err);
                hideReader();
            });
    }
}

function stopReader() {
    if (html5QrCode && html5QrCode._isScanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
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

self.addEventListener("install", function (event) {
                event.waitUntil(
                    caches.open("v1").then(function (cache) {
                        return Promise.all(
                            urlsToCache.map(url =>
                                fetch(url)
                                    .then(response => {
                                        if (!response.ok)
                                            throw new Error(
                                                "Failed to fetch " + url
                                            );
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
