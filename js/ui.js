/* ==========================================================================
   UI helpers — escape HTML, ikon SVG, toast, modal, tanggal, ekspor CSV
   ========================================================================== */
const U = (function () {
  const ICONS = {
    cap: '<path d="M12 3l10 5-10 5L2 8z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
    dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    edit: '<path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    usercheck: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6 1.5 0 2.8.3 4 .9"/><path d="M16 19l2 2 4-4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.8c2.5.6 4 2.2 4 5.2"/>',
    book: '<path d="M2 5a2 2 0 012-2h6v18H4a2 2 0 01-2-2z"/><path d="M22 5a2 2 0 00-2-2h-6v18h6a2 2 0 002-2z"/>',
    cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/>',
    chev: '<path d="M6 9l6 6 6-6"/>', left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>', check: '<path d="M20 6L9 17l-5-5"/>',
    checks: '<path d="M2 12l5 5L18 6M11 17l1 1L22 8"/>',
    save: '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    dl: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    ul: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>', trash: '<path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
    pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L21 2M16 7l3 3"/>',
    cloud: '<path d="M18 10a6 6 0 00-11.7-1.7A4.5 4.5 0 007 18h11a4 4 0 000-8z"/><path d="M9 14l2 2 4-4"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', room: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"/>',
    star: '<path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5L9 8.9z"/>',
    chart: '<path d="M3 3v18h18M7 14l4-4 3 3 6-7"/>', health: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>', file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 14h6M9 18h6"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>', refresh: '<path d="M21 12a9 9 0 01-15.5 6.2L3 16M3 12a9 9 0 0115.5-6.2L21 8M21 3v5h-5M3 21v-5h5"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', shield: '<path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z"/><path d="M9 12l2 2 4-4"/>', trend: '<path d="M3 17l6-6 4 4 8-8M21 7v6h-6"/>',
    tool: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4L14.5 12 12 9.5z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    sparkle: '<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    link: '<path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"/>'
  };
  function icon(n, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>'; }

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }

  // ---- tanggal ----
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return ymd(new Date()); }
  function parse(s) { const p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(s, withDay) { if (!s) return '-'; const d = parse(s); return (withDay ? HARI[d.getDay()] + ', ' : '') + d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtShort(s) { if (!s) return '-'; const d = parse(s); return d.getDate() + ' ' + BLN3[d.getMonth()]; }
  function fmtMonth(ym) { const p = ym.split('-'); return BLN[+p[1] - 1] + ' ' + p[0]; }
  function nowHM() { const d = new Date(); return pad(d.getHours()) + '.' + pad(d.getMinutes()); }
  function hariNama(d) { return HARI[(d || new Date()).getDay()]; }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

  // ---- angka ----
  function num(v, dp) { if (v === null || v === undefined || v === '') return '-'; return Number(v).toLocaleString('id-ID', { minimumFractionDigits: dp === undefined ? 0 : dp, maximumFractionDigits: dp === undefined ? 1 : dp }); }
  function pct(v) { return v === null || v === undefined ? '-' : num(v, 1) + '%'; }
  function initials(n) { const p = String(n || '?').replace(/[,.].*$/, '').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }

  // ---- toast ----
  function toast(msg, kind, ms) {
    const box = document.getElementById('toasts'); if (!box) return null;
    const el = document.createElement('div'); el.className = 'toast ' + (kind || '');
    el.innerHTML = (kind === 'busy' ? '<div class="spin sm"></div>' : kind === 'err' ? icon('alert') : kind === 'ok' ? icon('check') : '') + '<span>' + esc(msg) + '</span>';
    box.appendChild(el);
    const kill = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    if (kind !== 'busy') setTimeout(kill, ms || (kind === 'err' ? 5200 : 2600));
    el.kill = kill; return el;
  }

  // ---- modal ----
  let modalStack = [];
  function modal(opt) {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = '<div class="modal ' + (opt.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opt.title) + '">' +
      '<div class="modal-h"><h3>' + esc(opt.title) + '</h3><button class="icon-btn" data-x aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="modal-b">' + opt.body + '</div>' + (opt.foot === false ? '' : '<div class="modal-f">' + (opt.foot || '') + '</div>') + '</div>';
    document.body.appendChild(ov);
    const api = { el: ov, close: function () { if (ov.parentNode) ov.parentNode.removeChild(ov); modalStack = modalStack.filter(function (m) { return m !== api; }); if (opt.onClose) opt.onClose(); } };
    ov.addEventListener('mousedown', function (e) { if (e.target === ov && !opt.sticky) api.close(); });
    $('[data-x]', ov).addEventListener('click', api.close);
    modalStack.push(api);
    const first = $('input:not([type=hidden]),select,textarea', ov); if (first && opt.focus !== false) setTimeout(function () { first.focus(); }, 30);
    return api;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1].close(); });

  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (res) {
      const m = modal({
        title: title, body: '<p>' + esc(text) + '</p>', size: '', sticky: false, onClose: function () { res(false); },
        foot: '<button class="btn secondary" data-no>Batal</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-yes>' + esc(okLabel || 'Ya, lanjutkan') + '</button>'
      });
      $('[data-no]', m.el).onclick = function () { m.close(); };
      $('[data-yes]', m.el).onclick = function () { res(true); m.el.remove(); modalStack = modalStack.filter(function (x) { return x !== m; }); };
    });
  }

  // ---- ekspor ----
  function csv(filename, rows) {
    const body = rows.map(function (r) { return r.map(function (c) { c = c === null || c === undefined ? '' : String(c); return /[",;\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
    const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });   // BOM agar Excel membaca UTF-8
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  /** Parser CSV sederhana (mendukung kutip & pemisah , ; tab). */
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.indexOf('\t') >= 0 ? '\t' : ',');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
  }

  function pager(total, page, size) {
    const pages = Math.max(1, Math.ceil(total / size));
    const from = total ? (page - 1) * size + 1 : 0, to = Math.min(total, page * size);
    let nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    let btns = '', last = 0;
    nums.forEach(function (i) { if (i - last > 1) btns += '<button disabled>…</button>'; btns += '<button data-pg="' + i + '" class="' + (i === page ? 'on' : '') + '">' + i + '</button>'; last = i; });
    return '<div class="pager no-print"><span class="muted small">Menampilkan ' + from + '–' + to + ' dari ' + total + ' data</span><div class="pg">' +
      '<button data-pg="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">' + icon('left') + '</button>' + btns +
      '<button data-pg="' + (page + 1) + '" ' + (page >= pages ? 'disabled' : '') + ' aria-label="Berikutnya">' + icon('right') + '</button></div></div>';
  }

  function empty(ic, title, text) { return '<div class="empty"><div class="ico">' + icon(ic) + '</div><b>' + esc(title) + '</b>' + (text ? '<span>' + esc(text) + '</span>' : '') + '</div>'; }
  function skeleton(n) { let s = ''; for (let i = 0; i < (n || 4); i++) s += '<div class="skel" style="height:' + (i ? 54 : 90) + 'px;margin-bottom:12px"></div>'; return s; }
  function options(list, sel, valueKey, labelFn, blank) {
    return (blank !== undefined ? '<option value="">' + esc(blank) + '</option>' : '') + list.map(function (x) { const v = x[valueKey]; return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(labelFn(x)) + '</option>'; }).join('');
  }
  function download(name, text, type) { const b = new Blob([text], { type: type || 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 500); }

  return { icon: icon, esc: esc, $: $, $$: $$, debounce: debounce, toast: toast, modal: modal, confirm: confirmBox, csv: csv, parseCsv: parseCsv, pager: pager, empty: empty, skeleton: skeleton, options: options, download: download,
    BLN: BLN, HARI: HARI, ymd: ymd, todayStr: todayStr, parse: parse, fmtDate: fmtDate, fmtShort: fmtShort, fmtMonth: fmtMonth, nowHM: nowHM, hariNama: hariNama, addDays: addDays, daysBetween: daysBetween, num: num, pct: pct, initials: initials, pad: pad };
})();
