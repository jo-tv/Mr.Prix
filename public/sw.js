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
    "https://unpkg.com/html5-qrcode"
];

// عند التثبيت - cache الملفات المهمة
self.addEventListener("install", event => {
    console.log("Service Worker installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

// عند التفعيل - تنظيف الكاشات القديمة
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// عند كل طلب - جلب من الكاش أولاً ثم الشبكة، مع fallback لصفحة offline عند فقدان الانترنت
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return (
                response ||
                fetch(event.request).catch(() => caches.match("/offline.html"))
            );
        })
    );
});
