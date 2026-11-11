/* Service worker: cache aset statis agar aplikasi terbuka hampir instan.
   NAIK-kan angka VERSI setiap kali Anda mengunggah perubahan file frontend. */
const VERSI = 'siakad-v3';
const INTI = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/api.js', 'js/ui.js', 'js/app.js', 'js/pages-a.js', 'js/pages-b.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(INTI.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  const r = e.request;
  if (r.method !== 'GET') return;                                   // POST ke Apps Script tidak pernah di-cache
  const u = new URL(r.url);
  const font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin !== location.origin && !font) return;
  if (font) {                                                       // font: cache dulu
    e.respondWith(caches.open(VERSI).then(function (c) { return c.match(r).then(function (hit) {
      return hit || fetch(r).then(function (res) { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; });
    }); }));
    return;
  }
  // aset aplikasi: tampilkan cache seketika, segarkan di belakang layar
  e.respondWith(caches.open(VERSI).then(function (c) { return c.match(r, { ignoreSearch: true }).then(function (hit) {
    const net = fetch(r).then(function (res) { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(function () { return hit; });
    return hit || net;
  }); }));
});
