/* ==========================================================================
   API — komunikasi ke Google Apps Script (REST, JSON).
   - POST dengan Content-Type text/plain (menghindari preflight CORS yang
     tidak didukung Apps Script).
   - Token sesi dikirim di badan permintaan, tidak pernah di URL.
   - Cache memori untuk bacaan + "stale-while-revalidate" agar terasa instan.
   ========================================================================== */
const API = (function () {
  const TIMEOUT = 40000;
  let token = null;
  let onAuthLost = function () {};
  const mem = new Map();          // key -> {t, v}
  const inflight = new Map();     // key -> Promise (gabungkan permintaan identik)
  let pending = 0;
  let onBusy = function () {};

  function url() { return window.SIAKAD_CONFIG.GAS_URL; }
  function configured() { return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url()) || /^https:\/\/script\.google\.com\/a\/.+\/exec/.test(url()); }

  function busy(d) { pending += d; onBusy(pending > 0); }

  async function once(action, data) {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT);
    try {
      const res = await fetch(url(), {
        method: 'POST', redirect: 'follow', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, data: data || {}, token: token })
      });
      if (!res.ok) throw netErr('Server menjawab ' + res.status + '.');
      let json;
      try { json = await res.json(); } catch (e) { throw netErr('Jawaban server tidak dapat dibaca. Periksa URL Web App.'); }
      return json;
    } catch (e) {
      if (e && e.code) throw e;
      if (e && e.name === 'AbortError') throw netErr('Server terlalu lama menjawab. Coba lagi.');
      throw netErr('Tidak dapat terhubung ke server. Periksa koneksi internet.');
    } finally { clearTimeout(timer); }
  }

  function netErr(msg) { const e = new Error(msg); e.code = 'NETWORK'; return e; }

  /** Panggil API. opt.retry: ulangi bila gagal jaringan (hanya untuk bacaan). */
  async function call(action, data, opt) {
    opt = opt || {};
    if (!configured()) { const e = new Error('Alamat server (GAS_URL) belum diisi di js/config.js.'); e.code = 'CONFIG'; throw e; }
    busy(1);
    try {
      let json;
      try { json = await once(action, data); }
      catch (e) { if (opt.retry && e.code === 'NETWORK') { await new Promise(function (r) { setTimeout(r, 900); }); json = await once(action, data); } else throw e; }
      if (!json.success) {
        const err = new Error(json.message || 'Terjadi kesalahan.'); err.code = json.code || 'SERVER';
        if (err.code === 'AUTH') { token = null; onAuthLost(err.message); }
        throw err;
      }
      return json.data;
    } finally { busy(-1); }
  }

  /** Bacaan ber-cache. Mengembalikan data cache dulu (jika ada) lalu menyegarkan. */
  function read(action, data, opts) {
    opts = opts || {};
    const key = action + '|' + JSON.stringify(data || {});
    const hit = mem.get(key);
    const fresh = hit && (Date.now() - hit.t) < (opts.ttl || 30000);
    if (fresh && !opts.force) return Promise.resolve({ data: hit.v, cached: true, fresh: true, key: key });
    const fetchIt = function () {
      if (inflight.has(key)) return inflight.get(key);
      const p = call(action, data, { retry: true }).then(function (v) { mem.set(key, { t: Date.now(), v: v }); return v; })
        .finally(function () { inflight.delete(key); });
      inflight.set(key, p);
      return p;
    };
    if (hit && opts.swr && !opts.force) {
      // tampilkan cache sekarang, segarkan di belakang layar
      const p = fetchIt().then(function (v) { return { data: v, cached: false, fresh: true, key: key }; });
      return Promise.resolve({ data: hit.v, cached: true, fresh: false, key: key, refresh: p });
    }
    return fetchIt().then(function (v) { return { data: v, cached: false, fresh: true, key: key }; });
  }

  function forget(prefix) { Array.from(mem.keys()).forEach(function (k) { if (!prefix || k.indexOf(prefix) === 0) mem.delete(k); }); }
  function put(action, data, v) { mem.set(action + '|' + JSON.stringify(data || {}), { t: Date.now(), v: v }); }

  return {
    call: call, read: read, forget: forget, put: put, configured: configured,
    setToken: function (t) { token = t; }, getToken: function () { return token; },
    onAuthLost: function (fn) { onAuthLost = fn; }, onBusy: function (fn) { onBusy = fn; },
    prewarm: function () { if (configured()) { try { fetch(url(), { method: 'GET', mode: 'no-cors' }).catch(function () {}); } catch (e) {} } }
  };
})();
