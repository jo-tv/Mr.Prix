// ====================================================
// 🧱 CONFIGURATION DU SERVICE WORKER
// ====================================================
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `my-site-cache-${CACHE_VERSION}`;

// الملفات الثابتة التي سيتم تخزينها عند التثبيت
const urlsToCache = [
  '/css/style.css',
  '/css/dashboard.css',
  '/css/navb.css',
  '/css/searchPro.css',
  '/css/List-Vendeurs.css',
  '/js/dashboard.js',
  '/js/List-Vendeurs.js',
  '/js/main.js',
  '/js/main2.js',
  '/js/produitCumil.js',
  '/js/produitTotal.js',
  '/js/searchPro.js',
  // أضف ملفات أخرى حسب مشروعك
];

// ====================================================
// 🟢 INSTALL — تخزين الملفات الثابتة
// ====================================================
self.addEventListener('install', (event) => {
  console.log(`🟢 SW Installed: ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ====================================================
// 🔄 ACTIVATE — حذف الكاش القديم
// ====================================================
self.addEventListener('activate', (event) => {
  console.log(`✅ SW Activated: ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`🧹 Deleting old cache: ${key}`);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ====================================================
// ⚙️ FETCH — التعامل مع الطلبات
// ====================================================
self.addEventListener('install', (event) => {
  console.log(`🟢 SW Installed: ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of urlsToCache) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
            console.log(`✅ Cached: ${url}`);
          } else {
            console.warn(`⚠️ File not found, skipped: ${url}`);
          }
        } catch (err) {
          console.warn(`⚠️ Failed to cache ${url}:`, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// ====================================================
// 🔔 MESSAGE — تحديث SW يدويًا
// ====================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ Activating new Service Worker...');
    self.skipWaiting();
  }
});
