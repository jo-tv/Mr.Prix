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
    "/img/back.png"
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
