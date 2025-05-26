const CACHE_NAME = "my-cache-v1";
const urlsToCache = [
    "/",
    "/prix",
    "/login",
    "/upload",
    "/cmd",
    "/prixVen",
    "/inventaire",
    "/offline.html",
    "/css/login.css",
    "/css/search.css",
    "/css/style.css",
    "/css/upload.css",
    "/js/main.js",
    "/js/search.js",
    "/js/codebar.min.js",
    "/img/back.png",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js",
];

// تثبيت Service Worker وتخزين الملفات
self.addEventListener("install", event => {
    console.log("Service Worker installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting(); // لتفعيله مباشرة
});

// تفعيل Service Worker وتنظيف الكاشات القديمة
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim(); // لتفعيل الخدمة على جميع الصفحات
});

// التعامل مع الطلبات
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // إذا وجد في الكاش، يتم إرجاعه
            if (response) return response;

            // إذا لم يوجد، نحاول تحميله من الشبكة
            return fetch(event.request).catch(err => {
                // إذا كان الطلب من نوع "navigate" (طلب صفحة HTML)
                if (event.request.mode === "navigate") {
                    return caches.match("/offline.html");
                }
            });
        })
    );
});