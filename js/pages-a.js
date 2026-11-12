/* ==========================================================================
   PAGES A — Widget bersama, Dashboard, Input/Rekap Nilai, Absensi
   Prinsip kecepatan: semua perubahan diterapkan ke layar SEKETIKA (optimistic),
   lalu dikirim ke server dalam satu batch di belakang layar.
   ========================================================================== */
const W = (function () {
  const { esc, icon, $, $$ } = U;
  const KAT = { libur: ['Libur', 'bad'], ujian: ['Ujian', 'warn'], kegiatan: ['Kegiatan', 'pri'], rapat: ['Rapat', 'gray'], rapor: ['Rapor', 'ok'] };

  function eventsOn(events, d) { return events.filter(function (e) { return e.tanggal_mulai <= d && d <= (e.tanggal_selesai || e.tanggal_mulai); }); }

  /** Kalender bulanan interaktif. opts.onPick(dateStr) opsional. */
  function calendar(box, events, opts) {
    opts = opts || {};
    let ym = opts.ym || U.todayStr().slice(0, 7);
    function draw() {
      const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, first = new Date(y, m, 1), start = first.getDay(), days = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
      const today = U.todayStr(); let cells = '';
      ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].forEach(function (d) { cells += '<div class="dw">' + d + '</div>'; });
      for (let i = 0; i < 42; i++) {
        let dnum, out = false, ds;
        if (i < start) { dnum = prevDays - start + i + 1; out = true; ds = U.ymd(new Date(y, m - 1, dnum)); }
        else if (i - start >= days) { dnum = i - start - days + 1; out = true; ds = U.ymd(new Date(y, m + 1, dnum)); }
        else { dnum = i - start + 1; ds = U.ymd(new Date(y, m, dnum)); }
        const ev = eventsOn(events, ds), k = ev.length ? 'k-' + ev[0].kategori : '';
        const cls = ['d', out ? 'out' : '', (i % 7 === 0) ? 'sun' : '', ds === today ? 'today' : '', ev.length ? 'has' : '', !out && ev.length ? k : ''].join(' ');
        cells += '<button class="' + cls + '" data-d="' + ds + '" ' + (ev.length ? 'title="' + esc(ev.map(function (e) { return e.judul; }).join(', ')) + '"' : '') + '>' + dnum + '</button>';
      }
      box.innerHTML = '<div class="cal-h"><button class="icon-btn" data-nv="-1" aria-label="Bulan sebelumnya">' + icon('left') + '</button><b>' + U.fmtMonth(ym) + '</b><button class="icon-btn" data-nv="1" aria-label="Bulan berikutnya">' + icon('right') + '</button></div><div class="cal">' + cells + '</div>' +
        '<div class="legend" style="margin-top:10px"><span><i style="background:var(--bad)"></i>Libur</span><span><i style="background:var(--warn)"></i>Ujian</span><span><i style="background:var(--primary)"></i>Agenda lain</span></div>';
    }
    box.onclick = function (e) {
      const nv = e.target.closest('[data-nv]'); if (nv) { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + (+nv.dataset.nv), 1); ym = U.ymd(d).slice(0, 7); draw(); return; }
      const d = e.target.closest('[data-d]'); if (d && opts.onPick) opts.onPick(d.dataset.d, eventsOn(events, d.dataset.d));
    };
    draw();
    return { setEvents: function (ev) { events = ev; draw(); } };
  }

  function agenda(events, n) {
    const t = U.todayStr();
    const up = events.filter(function (e) { return (e.tanggal_selesai || e.tanggal_mulai) >= t; }).sort(function (a, b) { return a.tanggal_mulai.localeCompare(b.tanggal_mulai); }).slice(0, n || 4);
    if (!up.length) return '<div class="empty small">Belum ada agenda mendatang.</div>';
    return '<div class="agenda">' + up.map(function (e) {
      const d = U.parse(e.tanggal_mulai), diff = U.daysBetween(t, e.tanggal_mulai), k = KAT[e.kategori] || ['', 'gray'];
      const when = diff < 0 ? 'Berlangsung' : diff === 0 ? 'Hari ini' : diff + ' hari lagi';
      return '<div class="ag"><div class="dt">' + U.BLN[d.getMonth()].slice(0, 3).toUpperCase() + '<b>' + d.getDate() + '</b></div><div class="grow"><b>' + esc(e.judul) + '</b>' +
        (e.keterangan ? '<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(e.keterangan) + '</div>' : '') + '</div><div style="text-align:right"><span class="badge ' + k[1] + '">' + esc(k[0]) + '</span><div class="small muted" style="margin-top:2px">' + when + '</div></div></div>';
    }).join('') + '</div>';
  }

  function greeting() { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
  function bar(p, kind) { return '<div class="bar ' + (kind || '') + '"><i style="width:' + Math.max(0, Math.min(100, p || 0)) + '%"></i></div>'; }
  function stat(ic, kind, label, val, sub, extra) {
    return '<div class="card stat"><div class="top"><div class="ico ' + kind + '">' + icon(ic) + '</div>' + (extra || '') + '</div><div class="lbl2">' + esc(label) + '</div><div class="metric">' + val + '</div>' + (sub || '') + '</div>';
  }
  return { calendar: calendar, agenda: agenda, greeting: greeting, bar: bar, stat: stat, KAT: KAT, eventsOn: eventsOn };
})();

/* ====================================================================== */
/* DASHBOARD                                                              */
/* ====================================================================== */
App.pages.dashboard = async function (view, q, live) {
  const { esc, icon, $ } = U;
  const s = App.s, role = s.user.role, ev = s.opts.kalender || [];

  async function getDash() {
    if (s.dash) { API.call('dashboard', {}).then(function (d) { if (!live()) return; App.s.dash = d; App.save(); draw(d); }).catch(function () {}); return s.dash; }
    const d = await API.call('dashboard', {}, { retry: true }); App.s.dash = d; App.save(); return d;
  }
  let calCtl = null;
  function draw(d) {
    if (!live()) return;
    view.innerHTML = role === 'siswa' ? siswaView(d) : (App.isLeader() ? leaderView(d) : guruView(d));
    const cb = $('#calBox'); if (cb) calCtl = W.calendar(cb, ev);
    const ag = $('#agBox'); if (ag) ag.innerHTML = W.agenda(ev, 4);
    const pr = $('#bPrint'); if (pr) pr.onclick = function () { window.print(); };
    view.onclick = function (e) {
      const mail = e.target.closest('[data-mail]');
      if (mail) { const em = mail.dataset.mail; if (!em) { U.toast('Email orang tua belum diisi di Data Master.', 'err'); return; } location.href = 'mailto:' + em + '?subject=' + encodeURIComponent('Informasi dari wali kelas — ' + App.namaSekolah()); }
    };
  }

  function sched(jadwal, selesai) {
    const hari = U.hariNama(), blocks = App.blocks(jadwal, hari), now = new Date().getHours() * 60 + new Date().getMinutes(), tgl = U.todayStr();
    if (!blocks.length) return '<div class="empty small">Tidak ada jadwal ' + (role === 'siswa' ? 'pelajaran' : 'mengajar') + ' hari ini (' + hari + ').</div>';
    return '<div class="sched">' + blocks.map(function (b) {
      const done = (selesai || []).indexOf(b.kelas_id + '|' + b.mapel_id) >= 0, nowOn = now >= b.start && now < b.end;
      const badge = done ? '<span class="badge ok">Selesai</span>' : nowOn ? '<span class="badge pri live">Sedang berlangsung</span>' : now < b.start ? '<span class="badge gray">Mendatang</span>' : (role === 'guru' ? '<span class="badge warn">Belum diisi</span>' : '<span class="badge gray">Selesai</span>');
      const act = role === 'guru' && !done && now >= b.start ? '<a class="btn ' + (nowOn ? 'primary' : 'secondary') + ' sm" href="#/absensi?kelas=' + b.kelas_id + '&mapel=' + b.mapel_id + '&jam=' + b.label + '&tanggal=' + tgl + '">' + (nowOn ? 'Buka absensi kelas' : 'Isi presensi') + '</a>' : '';
      return '<div class="sch ' + (nowOn ? 'now' : '') + '"><div class="jp">JP ' + b.label + '</div><div class="grow"><div class="row between wrap"><h4>' + esc(App.mapel(b.mapel_id)) + '</h4>' + badge + '</div>' +
        '<div class="meta"><span class="row" style="gap:4px">' + icon('clock') + App.hm(b.start) + ' – ' + App.hm(b.end) + ' WIB</span><span class="row" style="gap:4px">' + icon('users') + esc(App.kelas(b.kelas_id)) + '</span>' +
        (b.ruang ? '<span class="row" style="gap:4px">' + icon('room') + esc(b.ruang) + '</span>' : '') + (role === 'siswa' ? '<span>' + esc(App.guru(b.guru_id) === '-' ? '' : App.guru(b.guru_id)) + '</span>' : '') + '</div></div>' + act + '</div>';
    }).join('') + '</div>';
  }

  function head(extra) {
    const u = s.user, ta = s.ta;
    return '<div class="card pad row between wrap" style="margin-bottom:var(--gap)"><div><h1 style="font-size:24px;line-height:32px;font-weight:700">' + W.greeting() + ', ' + esc(u.nama) + ' 👋</h1><p class="muted" style="margin-top:4px">' + extra + '</p></div>' +
      '<div class="row wrap"><span class="badge pri">' + icon('cal') + (ta ? esc(ta.semester + ' ' + ta.tahun) : 'Tahun ajaran belum diatur') + '</span><span class="badge ok">Tersambung ke database</span></div></div>';
  }

  function guruView(d) {
    const pen = s.opts.penugasan, mp = {}; pen.forEach(function (p) { mp[p.mapel_id] = 1; });
    const mapelTxt = Object.keys(mp).map(App.mapel).join(', ') || 'belum ada penugasan', wali = s.user.wali || [];
    const blocks = App.blocks(s.opts.jadwal, U.hariNama()), selesaiN = blocks.filter(function (b) { return d.sesi_hari_ini.indexOf(b.kelas_id + '|' + b.mapel_id) >= 0; }).length;
    const jpN = blocks.reduce(function (a, b) { return a + (b.to - b.from + 1); }, 0);
    const bn = d.binaan, nl = d.nilai_lengkap, jr = d.jurnal;
    const noTa = !s.ta ? '<div class="warn-box" style="margin-bottom:var(--gap)">Tahun ajaran aktif belum diatur. Hubungi admin.</div>' : '';
    return head('Guru ' + esc(mapelTxt) + (wali.length ? ' &amp; Wali Kelas ' + esc(wali.map(App.kelas).join(', ')) : '')) + noTa +
      '<div class="card pad row wrap no-print" style="margin-bottom:var(--gap);background:var(--info-tint);border-color:#DBEAFE"><span class="row" style="gap:6px;font-weight:600;color:var(--muted)">' + icon('star') + 'Aksi pintas:</span>' +
      '<a class="btn primary sm" href="#/nilai">' + icon('edit') + 'Input nilai baru</a><a class="btn secondary sm" href="#/absensi">' + icon('usercheck') + 'Catat absensi hari ini</a>' +
      '<a class="btn secondary sm" href="#/jurnal">' + icon('book') + 'Isi jurnal mengajar</a><button class="btn secondary sm" id="bPrint">' + icon('print') + 'Cetak halaman</button></div>' +
      '<div class="grid g4" style="margin-bottom:var(--gap)">' +
      W.stat('cal', '', 'Jadwal mengajar hari ini', blocks.length + ' <small>kelas / ' + jpN + ' JP</small>', '<div class="small muted">' + selesaiN + ' sudah diisi presensinya</div>', '<span class="badge pri">' + U.hariNama() + ', ' + U.fmtShort(U.todayStr()) + '</span>') +
      W.stat('star', 'warn', 'Kelengkapan nilai', nl.pct === null ? '-' : U.num(nl.pct, 0) + '%', W.bar(nl.pct) + '<div class="small muted">' + nl.filled + ' / ' + nl.expected + ' nilai terisi</div>') +
      W.stat('usercheck', 'ok', wali.length ? 'Presensi siswa binaan' : 'Sesi presensi diisi', wali.length ? (bn && bn.pct !== null ? U.num(bn.pct, 1) + '%' : '-') : jr.sesi + ' <small>sesi</small>', wali.length && bn ? '<div class="small muted">Sakit ' + bn.S + ' · Izin ' + bn.I + ' · Alfa ' + bn.A + ' (bulan ini)</div>' : '<div class="small muted">Semester ini</div>') +
      W.stat('book', 'info', 'Jurnal mengajar', jr.final + ' <small>/ ' + jr.sesi + ' sesi</small>', jr.draft ? '<a class="small" href="#/jurnal?status=draft">' + jr.draft + ' jurnal masih draft — lengkapi</a>' : '<div class="small muted">Semua jurnal lengkap</div>') + '</div>' +
      '<div class="grid g-main"><div class="grid">' +
      '<div class="card"><div class="card-h"><div><h3>Jadwal mengajar hari ini</h3><p>' + U.fmtDate(U.todayStr(), true) + '</p></div><a class="small" href="#/jadwal">Lihat seluruh pekan →</a></div><div class="card-b">' + sched(s.opts.jadwal, d.sesi_hari_ini) + '</div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Status penilaian</h3><p>Kelengkapan input per kelas dan mata pelajaran</p></div><a class="small" href="#/nilai">Buka input nilai →</a></div><div class="card-b">' + nilaiStatus(d.nilai_status) + '</div></div>' +
      (wali.length ? '<div class="card"><div class="card-h"><div><h3>Perhatian wali kelas</h3><p>Siswa yang butuh tindak lanjut</p></div></div><div class="card-b">' + perhatian(d.perhatian) + '</div></div>' : '') + '</div>' +
      '<div class="grid"><div class="card pad"><div class="row between" style="margin-bottom:8px"><h3 style="font-size:17px">Kalender akademik</h3></div><div id="calBox"></div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Agenda mendatang</h3></div><a class="small" href="#/kalender">Semua →</a></div><div class="card-b" id="agBox"></div></div></div></div>';
  }

  function nilaiStatus(rows) {
    if (!rows.length) return U.empty('edit', 'Belum ada penugasan', 'Admin perlu menugaskan Anda ke kelas dan mata pelajaran.');
    const lab = { tugas: 'Tugas', harian: 'Harian', praktik: 'Praktik', uts: 'UTS', uas: 'UAS' };
    return '<div class="grid" style="gap:12px">' + rows.map(function (r) {
      const p = r.expected ? Math.round(r.filled / r.expected * 100) : 0;
      return '<a href="#/nilai?kelas=' + r.kelas_id + '&mapel=' + r.mapel_id + '" style="color:inherit"><div class="sch" style="display:block"><div class="row between wrap"><b>' + esc(App.mapel(r.mapel_id)) + ' <span class="muted" style="font-weight:500">· ' + esc(App.kelas(r.kelas_id)) + '</span></b><span class="badge ' + (p >= 100 ? 'ok' : p > 0 ? 'warn' : 'gray') + '">' + p + '%</span></div>' + W.bar(p, p >= 100 ? 'ok' : '') +
        '<div class="row wrap small muted" style="gap:10px;margin-top:8px">' + Object.keys(lab).map(function (k) { return '<span>' + lab[k] + ' <b style="color:var(--text)">' + r.comps[k] + '%</b></span>'; }).join('') + '<span class="grow"></span><span>Rata-rata <b style="color:var(--text)">' + U.num(r.rata, 1) + '</b></span>' + (r.remedial ? '<span class="badge bad">' + r.remedial + ' remedial</span>' : '') + '</div></div></a>';
    }).join('') + '</div>';
  }

  function perhatian(list) {
    if (!list.length) return '<div class="empty small">Tidak ada siswa yang perlu perhatian khusus. 🎉</div>';
    return '<div class="grid" style="gap:10px">' + list.map(function (p) {
      const txt = p.tipe === 'alfa' ? 'Alfa ' + p.alfa + '× — mendekati batas ' + p.batas + '× tanpa keterangan.' : 'Nilai ' + App.mapel(p.low.mapel_id) + ' ' + U.num(p.low.na, 1) + ' di bawah KKM (' + p.low.kkm + ').';
      return '<div class="alert-item ' + (p.tipe === 'alfa' ? '' : 'bad') + '"><div class="row between"><b>' + esc(p.nama) + '</b><span class="badge ' + (p.tipe === 'alfa' ? 'warn' : 'bad') + '">' + (p.tipe === 'alfa' ? p.alfa + ' Alfa' : 'Remedial') + '</span></div><div class="small">' + esc(txt) + '</div>' +
        '<div class="row"><button class="btn ghost sm" data-mail="' + esc(p.email_ortu || '') + '">' + icon('bell') + 'Hubungi orang tua</button>' + (p.tipe === 'nilai' ? '<a class="btn ghost sm" href="#/nilai?kelas=' + p.kelas_id + '&mapel=' + p.low.mapel_id + '">Lihat nilai</a>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  function leaderView(d) {
    const st = d.stat, h = d.hadir_hari_ini, nl = d.nilai_lengkap, jb = d.jurnal_bulan;
    return head(esc(App.ROLE_LABEL[role]) + ' · ' + esc(App.namaSekolah())) +
      '<div class="grid g4" style="margin-bottom:var(--gap)">' + W.stat('users', '', 'Siswa aktif', U.num(st.siswa)) + W.stat('user', 'info', 'Guru aktif', U.num(st.guru)) + W.stat('room', 'warn', 'Rombel / kelas', U.num(st.kelas)) + W.stat('book', 'ok', 'Mata pelajaran', U.num(st.mapel)) + '</div>' +
      '<div class="grid g3 keep" style="margin-bottom:var(--gap)">' +
      W.stat('usercheck', 'ok', 'Kehadiran siswa hari ini', h.pct === null ? '-' : U.num(h.pct, 1) + '%', '<div class="small muted">' + h.sesi + ' sesi presensi tercatat</div>') +
      W.stat('edit', 'warn', 'Kelengkapan input nilai', nl.pct === null ? '-' : U.num(nl.pct, 0) + '%', W.bar(nl.pct) + '<div class="small muted">' + nl.filled + ' / ' + nl.expected + ' nilai</div>', '<a class="small" href="#/monitoring">Detail →</a>') +
      W.stat('book', 'info', 'Jurnal mengajar bulan ini', U.num(jb.total), '<div class="small muted">' + jb.draft + ' masih draft</div>') + '</div>' +
      '<div class="grid g-main"><div class="card"><div class="card-h"><div><h3>Kehadiran per kelas</h3><p>Bulan ' + U.fmtMonth(U.todayStr().slice(0, 7)) + '</p></div><a class="small" href="#/absensi">Rekap absensi →</a></div><div class="card-b">' +
      (d.per_kelas.length ? '<div class="grid" style="gap:14px">' + d.per_kelas.map(function (k) { const p = k.pct; return '<div><div class="row between small" style="margin-bottom:5px"><b>' + esc(k.nama) + '</b><span class="muted">' + (p === null ? 'belum ada presensi' : U.num(p, 1) + '% · ' + k.sesi + ' sesi') + '</span></div>' + W.bar(p, p === null ? '' : p >= (+s.settings.min_kehadiran || 85) ? 'ok' : 'bad') + '</div>'; }).join('') + '</div>' : U.empty('chart', 'Belum ada data kelas', '')) + '</div></div>' +
      '<div class="grid"><div class="card pad"><h3 style="font-size:17px;margin-bottom:8px">Kalender akademik</h3><div id="calBox"></div></div><div class="card"><div class="card-h"><h3>Agenda mendatang</h3><a class="small" href="#/kalender">Semua →</a></div><div class="card-b" id="agBox"></div></div></div></div>';
  }

  function siswaView(d) {
    const kl = App.kelas(d.kelas_id || s.user.kelas_id);
    return head('Siswa · Kelas ' + esc(kl)) +
      '<div class="grid g3 keep" style="margin-bottom:var(--gap)">' + W.stat('room', '', 'Kelas', esc(kl)) +
      W.stat('usercheck', 'ok', 'Kehadiran semester ini', d.hadir === null ? '-' : U.num(d.hadir, 1) + '%', W.bar(d.hadir, d.hadir !== null && d.hadir < (+s.settings.min_kehadiran || 85) ? 'bad' : 'ok')) +
      W.stat('star', 'warn', 'Rata-rata nilai', d.rata === null ? '-' : U.num(d.rata, 1), '<a class="small" href="#/nilai">Lihat rincian →</a>') + '</div>' +
      '<div class="grid g-main"><div class="grid"><div class="card"><div class="card-h"><div><h3>Jadwal pelajaran hari ini</h3><p>' + U.fmtDate(U.todayStr(), true) + '</p></div><a class="small" href="#/jadwal">Seluruh pekan →</a></div><div class="card-b">' + sched(s.opts.jadwal, []) + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Nilai akhir per mata pelajaran</h3></div><div class="card-b">' + (d.nilai.length ? '<div class="grid" style="gap:12px">' + d.nilai.map(function (n) { const low = n.na !== null && n.lengkap && n.na < n.kkm; return '<div><div class="row between small" style="margin-bottom:5px"><b>' + esc(App.mapel(n.mapel_id)) + '</b><span><b class="' + (low ? '' : '') + '">' + U.num(n.na, 1) + '</b> ' + (n.lengkap ? (low ? '<span class="badge bad">Di bawah KKM</span>' : '<span class="badge ok">Tuntas</span>') : '<span class="badge gray">Sementara</span>') + '</span></div>' + W.bar(n.na, low ? 'bad' : 'ok') + '</div>'; }).join('') + '</div>' : U.empty('edit', 'Belum ada nilai', 'Nilai akan muncul setelah guru menginputnya.')) + '</div></div></div>' +
      '<div class="grid"><div class="card pad"><h3 style="font-size:17px;margin-bottom:8px">Kalender akademik</h3><div id="calBox"></div></div><div class="card"><div class="card-h"><h3>Agenda mendatang</h3></div><div class="card-b" id="agBox"></div></div></div></div>';
  }

  const d = await getDash();
  draw(d);
};

/* ====================================================================== */
/* INPUT / REKAP NILAI                                                    */
/* ====================================================================== */
App.pages.nilai = async function (view, q, live) {
  const { esc, icon, $, $$ } = U;
  const s = App.s, role = s.user.role, KOMP = ['tugas', 'harian', 'praktik', 'uts', 'uas'], LAB = { tugas: 'Tugas', harian: 'Harian', praktik: 'Praktik', uts: 'UTS', uas: 'UAS' };

  if (role === 'siswa') return nilaiSiswa();

  // ----- pilihan kelas & mapel dari penugasan -----
  const pen = s.opts.penugasan;
  if (!pen.length) { view.innerHTML = App.head(App.crumb('Penilaian'), 'Manajemen & pengolahan nilai', '') + '<div class="card pad">' + U.empty('edit', 'Belum ada penugasan mengajar', role === 'guru' ? 'Minta admin menugaskan Anda ke kelas dan mata pelajaran di Data Master → Penugasan.' : 'Tambahkan penugasan guru di Data Master → Penugasan.') + '</div>'; return; }
  const kelasIds = []; pen.forEach(function (p) { if (kelasIds.indexOf(p.kelas_id) < 0) kelasIds.push(p.kelas_id); });
  const memo = (function () { try { return JSON.parse(localStorage.getItem('siakad.nilai.sel') || '{}'); } catch (e) { return {}; } })();
  let kelas = q.kelas || memo.kelas, mapel = q.mapel || memo.mapel;
  if (kelasIds.indexOf(kelas) < 0) kelas = kelasIds[0];
  const mapelFor = function (k) { return pen.filter(function (p) { return p.kelas_id === k; }).map(function (p) { return p.mapel_id; }).filter(function (v, i, a) { return a.indexOf(v) === i; }); };
  if (mapelFor(kelas).indexOf(mapel) < 0) mapel = mapelFor(kelas)[0];

  let st = null, dirty = {}, saving = false, saveTimer = null, filter = 'all', lastSaved = '';
  const ta = s.ta;

  view.innerHTML = App.head(App.crumb('Penilaian Kurikulum Merdeka'), role === 'guru' ? 'Manajemen & pengolahan nilai siswa' : 'Rekap nilai siswa', '', '<button class="btn secondary" id="bCsv">' + icon('dl') + 'Unduh Excel (CSV)</button><button class="btn secondary" id="bPrint">' + icon('print') + 'Cetak</button><button class="btn primary" id="bSave">' + icon('save') + 'Simpan perubahan</button>') +
    '<div class="grid g-main" style="margin-bottom:var(--gap)"><div class="card"><div class="filters" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
    '<div class="field"><label>Tahun ajaran & semester</label><select class="select" disabled><option>' + (ta ? esc(ta.tahun + ' ' + ta.semester) : '-') + '</option></select></div>' +
    '<div class="field"><label for="fK">Kelas</label><select class="select" id="fK">' + U.options(kelasIds.map(function (k) { return { id: k, n: App.kelas(k) }; }), kelas, 'id', function (x) { return x.n; }) + '</select></div>' +
    '<div class="field"><label for="fM">Mata pelajaran</label><select class="select" id="fM"></select></div></div>' +
    '<div class="toolbar"><div class="search" style="max-width:300px;flex:none"><span>' + icon('search') + '</span><input id="fQ" placeholder="Saring nama siswa atau NIS…" aria-label="Saring siswa"></div><span class="grow"></span><span class="small muted">Status:</span><div class="seg" id="fS"></div></div></div>' +
    '<div class="card pad" id="param" style="background:var(--primary-tint);border-color:var(--primary-line)"></div></div><div id="matrix"></div><div id="sumRow" class="grid g4" style="margin-top:var(--gap)"></div>';

  function fillMapel() { $('#fM').innerHTML = U.options(mapelFor(kelas).map(function (m) { return { id: m, n: App.mapel(m) }; }), mapel, 'id', function (x) { return x.n; }); }
  fillMapel();

  // ----- perhitungan (cermin backend) -----
  function calc(sid) {
    const r = st.nilai[sid] || {}, b = st.bobot; let sum = 0, w = 0, n = 0;
    KOMP.forEach(function (k) { const v = r[k]; if (v !== '' && v !== undefined && v !== null) { sum += v * b[k]; w += b[k]; n++; } });
    return { na: w > 0 ? Math.round(sum / w * 10) / 10 : null, lengkap: n === KOMP.length, n: n };
  }
  function statusOf(sid) { const c = calc(sid); if (c.n === 0) return 'kosong'; if (!c.lengkap) return 'sementara'; return c.na >= st.bobot.kkm ? 'tuntas' : 'remedial'; }
  const BADGE = { kosong: '<span class="badge gray">Belum diisi</span>', sementara: '<span class="badge pri">Sementara</span>', tuntas: '<span class="badge ok">Tuntas</span>', remedial: '<span class="badge bad">Perlu remedial</span>' };

  function drawParam() {
    const b = st.bobot, canB = st.can_edit || role === 'admin';
    $('#param').innerHTML = '<div class="row between"><span class="small" style="font-weight:700;color:var(--primary-deep);letter-spacing:.06em">● PARAMETER PENILAIAN</span>' + (canB ? '<button class="btn ghost sm" id="bBobot">' + icon('pen') + 'Ubah</button>' : '') + '</div>' +
      '<div style="margin:6px 0 10px">Kriteria ketuntasan minimal: <b class="metric pri" style="font-size:24px">' + U.num(b.kkm, 2) + '</b></div><div class="small muted" style="margin-bottom:6px">Distribusi bobot nilai akhir:</div>' +
      '<div class="row wrap" style="gap:6px">' + KOMP.map(function (k) { return '<div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:5px 10px;text-align:center;min-width:56px"><div class="small muted">' + LAB[k] + '</div><b>' + b[k] + '%</b></div>'; }).join('') + '</div>' +
      (b.custom ? '' : '<div class="small muted" style="margin-top:8px">Memakai bobot bawaan sekolah.</div>');
    const bb = $('#bBobot'); if (bb) bb.onclick = openBobot;
  }

  function openBobot() {
    const b = st.bobot;
    const m = U.modal({ title: 'Ubah bobot & KKM — ' + App.mapel(mapel), body: '<p class="small muted" style="margin-bottom:12px">Total bobot harus tepat 100%. Berlaku untuk semua kelas pada mata pelajaran ini.</p><div class="form-grid">' +
      KOMP.map(function (k) { return '<div class="field"><label>' + LAB[k] + ' (%)</label><input class="input" type="number" min="0" max="100" step="1" name="' + k + '" value="' + b[k] + '"></div>'; }).join('') +
      '<div class="field"><label>KKM</label><input class="input" type="number" min="0" max="100" step="0.5" name="kkm" value="' + b.kkm + '"></div></div><div id="bobErr"></div><div class="small" id="bobSum"></div>',
      foot: '<button class="btn secondary" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>' });
    const sum = function () { let t = 0; KOMP.forEach(function (k) { t += +$('[name=' + k + ']', m.el).value || 0; }); $('#bobSum', m.el).innerHTML = 'Total: <b style="color:' + (Math.abs(t - 100) < .001 ? 'var(--ok-text)' : 'var(--bad)') + '">' + t + '%</b>'; };
    m.el.addEventListener('input', sum); sum();
    $('[data-no]', m.el).onclick = m.close;
    $('[data-ok]', m.el).onclick = async function () {
      const data = { mapel_id: mapel, kkm: +$('[name=kkm]', m.el).value }; KOMP.forEach(function (k) { data[k] = +$('[name=' + k + ']', m.el).value; });
      this.disabled = true;
      try { const r = await API.call('bobot.save', data); st.bobot = r.bobot; API.forget('nilai.get'); m.close(); drawAll(); U.toast('Bobot disimpan.', 'ok'); App.touchDash(); }
      catch (e) { $('#bobErr', m.el).innerHTML = '<div class="err-box">' + esc(e.message) + '</div>'; this.disabled = false; }
    };
  }

  function rowHtml(sw, i) {
    const c = calc(sw.siswa_id), stt = statusOf(sw.siswa_id), r = st.nilai[sw.siswa_id] || {}, ed = st.can_edit;
    const cells = KOMP.map(function (k) {
      const v = r[k], low = v !== '' && v !== undefined && v < st.bobot.kkm, d = dirty[sw.siswa_id + '|' + k] !== undefined;
      return '<td class="num ' + (k === 'praktik' ? 'col-hi' : '') + '"><input class="nilai-in ' + (low ? 'low ' : '') + (d ? 'dirty' : '') + '" inputmode="decimal" autocomplete="off" data-s="' + sw.siswa_id + '" data-k="' + k + '" value="' + (v === '' || v === undefined ? '' : v) + '" ' + (ed ? '' : 'disabled') + ' aria-label="' + LAB[k] + ' ' + esc(sw.nama) + '"></td>';
    }).join('');
    return '<tr data-r="' + sw.siswa_id + '" class="' + (stt === 'remedial' ? 'row-bad' : '') + '">' +
      '<td class="num muted">' + (i + 1) + '</td>' +
      '<td class="stick-1"><div class="nama-col"><b>' + esc(sw.nama) + '</b>' + (stt === 'remedial' ? '<div><span class="st-bad">Perlu remedial</span></div>' : '') + '</div></td>' + cells +
      '<td class="num"><span class="na ' + (stt === 'remedial' ? 'low' : c.lengkap ? '' : 'prov') + '" data-na>' + (c.na === null ? '-' : U.num(c.na, 1)) + '</span></td><td data-st>' + BADGE[stt] + '</td></tr>';
  }

  function drawMatrix() {
    const qv = ($('#fQ').value || '').toLowerCase();
    const list = st.siswa.filter(function (x) { return (filter === 'all' || statusOf(x.siswa_id) === filter) && (!qv || (x.nama + ' ' + x.nis).toLowerCase().indexOf(qv) >= 0); });
    const head = KOMP.map(function (k) { return '<th class="num ' + (k === 'praktik' ? 'col-hi' : '') + '">' + LAB[k] + '<br><span style="font-weight:500">(' + st.bobot[k] + '%)</span></th>'; }).join('');
    $('#matrix').innerHTML = '<div class="card"><div class="card-h"><div><h3>Lembar matriks nilai siswa</h3><p>' + (st.can_edit ? 'Klik kotak angka untuk mengubah. Nilai akhir diperbarui otomatis dan tersimpan sendiri.' : 'Mode lihat saja — Anda tidak mengampu mata pelajaran ini.') + '</p></div><div class="legend"><span><i style="background:var(--ok)"></i>Tuntas (≥ ' + st.bobot.kkm + ')</span><span><i style="background:var(--bad)"></i>Perlu remedial</span></div></div>' +
      '<div class="card-b" style="padding-left:0;padding-right:0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th><th class="stick-1">Nama siswa</th>' + head + '<th class="num">Nilai akhir</th><th>Status</th></tr></thead><tbody>' +
      (list.length ? list.map(function (x) { return rowHtml(x, st.siswa.indexOf(x)); }).join('') : '<tr><td colspan="10">' + U.empty('users', st.siswa.length ? 'Tidak ada siswa yang cocok' : 'Belum ada siswa di kelas ini', st.siswa.length ? '' : 'Tambahkan siswa di Data Master.') + '</td></tr>') + '</tbody></table></div></div>' +
      '<div class="pager no-print" style="border-top:1px solid var(--line)"><span class="small muted row" style="gap:6px">' + icon('alert') + 'Tab / panah ↑↓ / Enter untuk berpindah kolom dan baris.</span><span class="small muted" id="saveLbl"></span></div></div>';
    saveLabel();
  }

  function drawSummary() {
    const nas = st.siswa.map(function (x) { return { x: x, c: calc(x.siswa_id) }; }).filter(function (z) { return z.c.na !== null; });
    const avg = nas.length ? nas.reduce(function (a, z) { return a + z.c.na; }, 0) / nas.length : null;
    const hi = nas.slice().sort(function (a, b) { return b.c.na - a.c.na; })[0], lo = nas.slice().sort(function (a, b) { return a.c.na - b.c.na; })[0];
    const done = nas.filter(function (z) { return z.c.lengkap; }), ok = done.filter(function (z) { return z.c.na >= st.bobot.kkm; }).length;
    $('#sumRow').innerHTML = W.stat('chart', 'info', 'Rata-rata kelas', avg === null ? '-' : U.num(avg, 1)) +
      W.stat('star', 'ok', 'Nilai tertinggi', hi ? U.num(hi.c.na, 1) : '-', hi ? '<div class="small muted">' + esc(hi.x.nama) + '</div>' : '') +
      W.stat('trend', 'bad', 'Nilai terendah', lo ? '<span style="color:var(--bad)">' + U.num(lo.c.na, 1) + '</span>' : '-', lo ? '<div class="small muted">' + esc(lo.x.nama) + '</div>' : '') +
      W.stat('check', '', 'Ketuntasan KKM', done.length ? U.num(ok / done.length * 100, 1) + '%' : '-', W.bar(done.length ? ok / done.length * 100 : 0, 'ok') + '<div class="small muted">' + ok + ' dari ' + done.length + ' siswa (nilai lengkap)</div>');
  }
  function drawFilter() {
    const cnt = { all: st.siswa.length, tuntas: 0, remedial: 0, sementara: 0, kosong: 0 }; st.siswa.forEach(function (x) { cnt[statusOf(x.siswa_id)]++; });
    $('#fS').innerHTML = [['all', 'Semua'], ['tuntas', 'Tuntas'], ['remedial', 'Remedial'], ['sementara', 'Sementara'], ['kosong', 'Kosong']].map(function (f) { return '<button data-f="' + f[0] + '" class="' + (filter === f[0] ? 'on' : '') + '">' + f[1] + ' (' + cnt[f[0]] + ')</button>'; }).join('');
  }
  function drawAll() { drawParam(); drawFilter(); drawMatrix(); drawSummary(); }
  function saveLabel() { const l = $('#saveLbl'), n = Object.keys(dirty).length; if (!l) return; l.innerHTML = saving ? 'Menyimpan…' : n ? '<span style="color:var(--warn-text);font-weight:600">' + n + ' perubahan belum tersimpan</span>' : (lastSaved ? 'Tersimpan otomatis ' + lastSaved + ' WIB' : ''); const b = $('#bSave'); if (b) b.disabled = !n && !saving; }

  // ----- simpan (batch, di belakang layar) -----
  function schedule() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 1400); saveLabel(); }
  async function flush() {
    clearTimeout(saveTimer); if (saving) { saveTimer = setTimeout(flush, 600); return; }
    const keys = Object.keys(dirty); if (!keys.length) return;
    const snapshot = {}, items = keys.map(function (k) { const p = k.split('|'); snapshot[k] = dirty[k]; return { siswa_id: p[0], k: p[1], v: dirty[k] === '' ? null : dirty[k] }; });
    saving = true; saveLabel();
    try {
      const r = await API.call('nilai.save', { kelas_id: kelas, mapel_id: mapel, items: items });
      keys.forEach(function (k) { if (dirty[k] === snapshot[k]) delete dirty[k]; });
      lastSaved = r.at.slice(11, 16).replace(':', '.'); App.touchDash(); API.forget('nilai.get');
      $$('.nilai-in.dirty').forEach(function (i) { if (dirty[i.dataset.s + '|' + i.dataset.k] === undefined) i.classList.remove('dirty'); });
    } catch (e) { U.toast('Gagal menyimpan nilai: ' + e.message, 'err'); }
    saving = false; saveLabel(); drawFilter();
    if (Object.keys(dirty).length && !saveTimer) saveTimer = setTimeout(flush, 2500);
  }
  const warn = function (e) { if (Object.keys(dirty).length) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', warn);
  App.cleanup = function () { window.removeEventListener('beforeunload', warn); if (Object.keys(dirty).length) flush(); };

  // ----- muat data -----
  async function load() {
    const params = { kelas_id: kelas, mapel_id: mapel };
    $('#matrix').innerHTML = '<div class="card pad">' + U.skeleton(4) + '</div>'; $('#sumRow').innerHTML = ''; dirty = {}; lastSaved = '';
    try {
      const r = await API.read('nilai.get', params, { ttl: 20000, swr: true });
      if (!live()) return;
      st = r.data; drawAll();
      if (r.refresh) r.refresh.then(function (x) { if (!live() || Object.keys(dirty).length) return; st = x.data; drawAll(); }).catch(function () {});
    } catch (e) { if (live()) $('#matrix').innerHTML = '<div class="card pad">' + U.empty('alert', 'Gagal memuat nilai', e.message) + '</div>'; }
  }
  function remember() { try { localStorage.setItem('siakad.nilai.sel', JSON.stringify({ kelas: kelas, mapel: mapel })); } catch (e) {} }

  $('#fK').onchange = function () { flush(); kelas = this.value; mapel = mapelFor(kelas)[0]; fillMapel(); remember(); load(); };
  $('#fM').onchange = function () { flush(); mapel = this.value; remember(); load(); };
  $('#fQ').oninput = U.debounce(function () { if (st) drawMatrix(); }, 150);
  $('#fS').onclick = function (e) { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; drawFilter(); drawMatrix(); } };
  $('#bSave').onclick = async function () { await flush(); if (!Object.keys(dirty).length) U.toast('Semua nilai tersimpan.', 'ok'); };
  $('#bPrint').onclick = function () { window.print(); };
  $('#bCsv').onclick = function () {
    if (!st) return;
    const rows = [['No', 'NIS', 'NISN', 'Nama'].concat(KOMP.map(function (k) { return LAB[k] + ' (' + st.bobot[k] + '%)'; }), ['Nilai Akhir', 'Status'])];
    st.siswa.forEach(function (x, i) { const r = st.nilai[x.siswa_id] || {}, c = calc(x.siswa_id); rows.push([i + 1, x.nis, x.nisn, x.nama].concat(KOMP.map(function (k) { return r[k] === undefined ? '' : r[k]; }), [c.na === null ? '' : c.na, statusOf(x.siswa_id)])); });
    U.csv('Nilai_' + App.kelas(kelas) + '_' + App.mapelKode(mapel) + '.csv', rows);
  };
  view.addEventListener('input', function (e) {
    const el = e.target.closest('.nilai-in'); if (!el || !st) return;
    let raw = el.value.replace(',', '.').trim(), v;
    if (raw === '') v = ''; else { v = Number(raw); if (isNaN(v) || v < 0 || v > 100) { el.style.outline = '2px solid var(--bad)'; return; } v = Math.round(v * 100) / 100; }
    el.style.outline = '';
    const sid = el.dataset.s, k = el.dataset.k; (st.nilai[sid] = st.nilai[sid] || {})[k] = v; dirty[sid + '|' + k] = v;
    el.classList.add('dirty'); el.classList.toggle('low', v !== '' && v < st.bobot.kkm);
    const tr = el.closest('tr'), c = calc(sid), stt = statusOf(sid), na = $('[data-na]', tr);
    na.textContent = c.na === null ? '-' : U.num(c.na, 1); na.className = 'na ' + (stt === 'remedial' ? 'low' : c.lengkap ? '' : 'prov');
    $('[data-st]', tr).innerHTML = BADGE[stt]; tr.classList.toggle('row-bad', stt === 'remedial');
    drawSummary(); drawFilter(); schedule();
  });
  view.addEventListener('keydown', function (e) {
    const el = e.target.closest('.nilai-in'); if (!el) return;
    const mv = e.key === 'ArrowDown' || e.key === 'Enter' ? 1 : e.key === 'ArrowUp' ? -1 : 0; if (!mv) return;
    e.preventDefault(); const tr = el.closest('tr'), nx = mv > 0 ? tr.nextElementSibling : tr.previousElementSibling;
    if (nx) { const t = $('[data-k="' + el.dataset.k + '"]', nx); if (t) { t.focus(); t.select(); } }
  });
  view.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('nilai-in')) e.target.select(); });
  view.addEventListener('blur', function (e) { if (e.target.classList && e.target.classList.contains('nilai-in') && Object.keys(dirty).length) flush(); }, true);

  await load();

  // ----- tampilan siswa -----
  async function nilaiSiswa() {
    view.innerHTML = App.head(App.crumb('Nilai saya'), 'Nilai saya', 'Nilai akhir dihitung dari bobot yang ditetapkan guru mata pelajaran.') + '<div class="card pad">' + U.skeleton(3) + '</div>';
    const r = await API.read('nilai.mine', {}, { ttl: 30000, swr: true }); if (!live()) return;
    const draw = function (d) {
      view.innerHTML = App.head(App.crumb('Nilai saya'), 'Nilai saya', 'Nilai akhir dihitung dari bobot yang ditetapkan guru mata pelajaran.') +
        '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mata pelajaran</th>' + KOMP.map(function (k) { return '<th class="num">' + LAB[k] + '</th>'; }).join('') + '<th class="num">Nilai akhir</th><th>Status</th></tr></thead><tbody>' +
        (d.rows.length ? d.rows.map(function (n) { const low = n.lengkap && n.na < n.kkm; return '<tr class="' + (low ? 'row-bad' : '') + '"><td><b>' + esc(App.mapel(n.mapel_id)) + '</b><div class="small muted">KKM ' + n.kkm + '</div></td>' + KOMP.map(function (k) { return '<td class="num">' + (n[k] === '' ? '<span class="muted">-</span>' : U.num(n[k], 1)) + '</td>'; }).join('') + '<td class="num"><span class="na ' + (low ? 'low' : n.lengkap ? '' : 'prov') + '">' + U.num(n.na, 1) + '</span></td><td>' + (n.lengkap ? (low ? '<span class="badge bad">Di bawah KKM</span>' : '<span class="badge ok">Tuntas</span>') : '<span class="badge gray">Sementara</span>') + '</td></tr>'; }).join('') : '<tr><td colspan="8">' + U.empty('edit', 'Belum ada nilai', 'Nilai akan tampil setelah guru menginputnya.') + '</td></tr>') + '</tbody></table></div></div>';
    };
    draw(r.data); if (r.refresh) r.refresh.then(function (x) { if (live()) draw(x.data); }).catch(function () {});
  }
};

/* ====================================================================== */
/* ABSENSI / PRESENSI                                                     */
/* ====================================================================== */
App.pages.absensi = async function (view, q, live) {
  const { esc, icon, $, $$ } = U;
  const s = App.s, role = s.user.role, PAGE = 10;
  if (role === 'siswa') return absensiSiswa();

  const pen = s.opts.penugasan;
  if (!pen.length) { view.innerHTML = App.head(App.crumb('Kehadiran harian'), 'Presensi & kehadiran siswa', '') + '<div class="card pad">' + U.empty('usercheck', 'Belum ada penugasan mengajar', 'Admin perlu menugaskan guru ke kelas dan mata pelajaran terlebih dahulu.') + '</div>'; return; }
  const kelasIds = []; pen.forEach(function (p) { if (kelasIds.indexOf(p.kelas_id) < 0) kelasIds.push(p.kelas_id); });
  const mapelFor = function (k) { return pen.filter(function (p) { return p.kelas_id === k; }).map(function (p) { return p.mapel_id; }).filter(function (v, i, a) { return a.indexOf(v) === i; }); };
  let kelas = q.kelas, mapel = q.mapel, tanggal = /^\d{4}-\d{2}-\d{2}$/.test(q.tanggal || '') ? q.tanggal : U.todayStr(), jam = q.jam || '';
  if (kelasIds.indexOf(kelas) < 0) kelas = kelasIds[0];
  if (mapelFor(kelas).indexOf(mapel) < 0) mapel = mapelFor(kelas)[0];

  let data = null, state = {}, page = 1, fstatus = 'all', dirty = false, note = '', tren = null;

  view.innerHTML = App.head(App.crumb('Kehadiran harian'), 'Presensi & kehadiran siswa', 'Pencatatan kehadiran harian per mata pelajaran dan jam ke-', '<div id="kpiTop"></div>') +
    '<div class="card" style="margin-bottom:var(--gap)"><div class="filters"><div class="field"><label for="aT">Tanggal pertemuan</label><input class="input" type="date" id="aT" value="' + tanggal + '" max="' + U.todayStr() + '"></div>' +
    '<div class="field"><label for="aK">Rombongan belajar / kelas</label><select class="select" id="aK">' + U.options(kelasIds.map(function (k) { return { id: k, n: App.kelas(k) }; }), kelas, 'id', function (x) { return x.n; }) + '</select></div>' +
    '<div class="field"><label for="aM">Mata pelajaran</label><select class="select" id="aM"></select></div>' +
    '<div class="field"><label for="aJ">Jam pelajaran (JP ke-)</label><input class="input" id="aJ" list="jpList" placeholder="mis. 1-4" value="' + esc(jam) + '" maxlength="5" autocomplete="off"><datalist id="jpList"></datalist></div></div>' +
    '<div class="toolbar"><button class="btn soft" id="aAll">' + icon('checks') + 'Tandai semua hadir</button><div class="row" style="gap:6px"><span class="small muted">Tampilkan:</span><select class="select" id="aF" style="width:auto;height:36px"><option value="all">Semua status</option><option value="H">Hadir</option><option value="S">Sakit</option><option value="I">Izin</option><option value="A">Alfa</option></select></div>' +
    '<div class="search" style="max-width:240px;flex:none"><span>' + icon('search') + '</span><input id="aQ" placeholder="Cari nama / NIS" aria-label="Cari siswa"></div>' +
    '<button class="btn secondary" id="aRekap">' + icon('dl') + 'Unduh rekap bulanan</button><span class="grow"></span><span id="dirtyLbl"></span><button class="btn primary" id="aSave">' + icon('save') + 'Simpan presensi</button></div></div>' +
    '<div class="mini-stats" id="aStats"></div><div class="grid g-main"><div class="card" id="aTable"></div><div class="grid"><div class="card pad" id="aTren"></div><div class="card pad" id="aWatch"></div><div class="card pad"><h3 style="font-size:17px">Catatan jurnal KBM</h3><p class="small muted" style="margin:2px 0 10px">Ringkasan jalannya sesi, ikut tersimpan ke Jurnal Mengajar.</p><textarea class="textarea" id="aNote" maxlength="500" placeholder="Contoh: Praktik ERD berjalan tertib. Aisyah sakit flu."></textarea></div></div></div>';

  function fillMapel() { $('#aM').innerHTML = U.options(mapelFor(kelas).map(function (m) { return { id: m, n: App.mapel(m) }; }), mapel, 'id', function (x) { return x.n; }); }
  fillMapel();
  function suggestJam() {
    const hari = U.hariNama(U.parse(tanggal)), bl = App.blocks(s.opts.jadwal, hari).filter(function (b) { return b.kelas_id === kelas && b.mapel_id === mapel; });
    $('#jpList').innerHTML = bl.map(function (b) { return '<option value="' + b.label + '">JP ' + b.label + ' (' + App.hm(b.start) + '–' + App.hm(b.end) + ')</option>'; }).join('');
    if (!$('#aJ').value && bl.length) { $('#aJ').value = bl[0].label; jam = bl[0].label; }
  }
  suggestJam();

  function counts() { const c = { H: 0, S: 0, I: 0, A: 0 }; data.siswa.forEach(function (x) { c[(state[x.siswa_id] || { status: 'H' }).status]++; }); return c; }
  function drawStats() {
    const c = counts(), t = data.siswa.length, p = t ? c.H / t * 100 : 0;
    $('#aStats').innerHTML = [['users', '', 'Total siswa', t, ''], ['check', 'ok', 'Hadir (H)', c.H, 'Siswa'], ['health', 'warn', 'Sakit (S)', c.S, ''], ['file', 'info', 'Izin (I)', c.I, ''], ['alert', 'bad', 'Alfa (A)', c.A, 'Nihil'], ['trend', '', 'Kehadiran sesi', U.num(p, 1) + '%', '']]
      .map(function (m) { return '<div class="mini"><div class="ico ' + m[1] + '">' + icon(m[0]) + '</div><div><div class="small muted">' + m[2] + '</div><b>' + m[3] + '</b></div></div>'; }).join('');
    $('#kpiTop').innerHTML = '<div class="card pad row" style="gap:14px;padding:10px 16px"><div><div class="small muted">Kehadiran sesi ini</div><span class="metric ' + (p >= (+s.settings.min_kehadiran || 85) ? 'ok' : 'bad') + '" style="font-size:24px">' + U.num(p, 1) + '%</span> <span class="small muted">(' + c.H + '/' + t + ' siswa)</span></div></div>';
  }
  function dirtyLabel() { $('#dirtyLbl').innerHTML = dirty ? '<span class="badge warn">Belum disimpan</span>' : (data && data.saved ? '<span class="badge ok">Tersimpan</span>' : ''); }

  function drawTable() {
    const qv = ($('#aQ').value || '').toLowerCase();
    const list = data.siswa.filter(function (x) { return (fstatus === 'all' || state[x.siswa_id].status === fstatus) && (!qv || (x.nama + ' ' + x.nis).toLowerCase().indexOf(qv) >= 0); });
    const pages = Math.max(1, Math.ceil(list.length / PAGE)); if (page > pages) page = pages;
    const rows = list.slice((page - 1) * PAGE, page * PAGE), ed = data.can_edit;
    $('#aTable').innerHTML = '<div class="card-h"><div><h3>Daftar presensi siswa <span class="badge pri" style="margin-left:6px">' + data.siswa.length + ' peserta</span></h3></div><span class="small muted row" style="gap:5px">' + icon('star') + 'Klik huruf status untuk mengubah</span></div>' +
      '<div class="card-b" style="padding-left:0;padding-right:0"><div class="tbl-wrap"><table class="tbl tbl-absensi"><thead><tr><th class="num" style="width:36px">No</th><th>Nama siswa</th><th style="width:138px;text-align:center">Presensi</th><th>Keterangan</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (x) {
        const st = state[x.siswa_id], i = data.siswa.indexOf(x) + 1;
        const stBadge = st.status === 'S' ? '<span class="st-warn" style="font-size:11px;font-weight:600">Sakit</span>' : st.status === 'I' ? '<span class="st-warn" style="font-size:11px;font-weight:600">Izin</span>' : st.status === 'A' ? '<span class="st-bad" style="font-size:11px;font-weight:600">Alfa</span>' : '';
        return '<tr data-r="' + x.siswa_id + '" class="' + (st.status === 'A' ? 'row-bad' : st.status !== 'H' ? 'row-warn' : '') + '">' +
          '<td class="num muted">' + i + '</td>' +
          '<td><div class="nama-col"><b>' + esc(x.nama) + '</b>' + (stBadge ? '<div>' + stBadge + '</div>' : '') + '</div></td>' +
          '<td style="text-align:center"><div class="hsia ' + (ed ? '' : 'ro') + '" role="group" aria-label="Status ' + esc(x.nama) + '">' + ['H', 'S', 'I', 'A'].map(function (k) { return '<button data-s="' + k + '" class="' + (st.status === k ? 'on' : '') + '" aria-pressed="' + (st.status === k) + '">' + k + '</button>'; }).join('') + '</div></td>' +
          '<td>' + (st.status === 'H' ? '<span class="muted small">-</span>' : '<input class="ket" maxlength="120" placeholder="Keterangan…" value="' + esc(st.keterangan) + '" ' + (ed ? '' : 'disabled') + ' aria-label="Keterangan ' + esc(x.nama) + '">') + '</td></tr>';
      }).join('') : '<tr><td colspan="4">' + U.empty('users', data.siswa.length ? 'Tidak ada siswa yang cocok' : 'Belum ada siswa di kelas ini', data.siswa.length ? '' : 'Tambahkan siswa di Data Master.') + '</td></tr>') + '</tbody></table></div></div>' + U.pager(list.length, page, PAGE);
    $('#aSave').disabled = !ed; $('#aAll').disabled = !ed;
  }

  function drawSide() {
    const t = tren, max = 100;
    $('#aTren').innerHTML = '<div class="row between"><div><h3 style="font-size:17px">Tren presensi bulanan</h3><p class="small muted">Kelas ' + esc(App.kelas(kelas)) + '</p></div>' + (t && t.rata !== null ? '<span class="badge ' + (t.rata >= (+s.settings.min_kehadiran || 85) ? 'ok' : 'bad') + '">' + (t.rata >= (+s.settings.min_kehadiran || 85) ? 'Baik' : 'Rendah') + '</span>' : '') + '</div>' +
      (t ? '<div class="bars" style="margin:12px 0">' + t.bulan.map(function (b, i) { return '<div class="b ' + (i === t.bulan.length - 1 ? 'cur' : '') + '"><em>' + (b.pct === null ? '' : Math.round(b.pct) + '%') + '</em><i style="height:' + (b.pct === null ? 3 : Math.max(4, b.pct / max * 100)) + '%"></i>' + U.BLN[+b.bulan.slice(5) - 1].slice(0, 3) + '</div>'; }).join('') + '</div>' +
        '<div class="row between small"><span>Rata-rata kehadiran siswa</span><b>' + (t.rata === null ? '-' : U.num(t.rata, 1) + '%') + '</b></div>' + W.bar(t.rata, t.rata !== null && t.rata < (+s.settings.min_kehadiran || 85) ? 'bad' : 'ok') +
        '<div class="row between small muted" style="margin-top:8px"><span>Batas minimum kehadiran</span><span>' + (+s.settings.min_kehadiran || 85) + '%</span></div>' : '<div class="skel" style="height:170px;margin-top:10px"></div>');
    const w = (s.dash && s.dash.perhatian ? s.dash.perhatian : []).filter(function (p) { return p.kelas_id === kelas && p.tipe === 'alfa'; });
    $('#aWatch').innerHTML = '<div class="row" style="gap:10px"><div class="ico warn">' + icon('bell') + '</div><div><h3 style="font-size:17px">Perhatian wali kelas</h3><p class="small muted">Peringatan ambang alfa semester</p></div></div>' +
      (w.length ? '<div class="grid" style="gap:8px;margin-top:12px">' + w.map(function (p) { return '<div class="alert-item"><div class="row between"><b>' + esc(p.nama) + '</b><span class="badge bad">' + p.alfa + ' Alfa</span></div><div class="small">Mendekati batas maksimal ' + p.batas + '× tanpa keterangan.</div>' + (p.email_ortu ? '<a class="small" href="mailto:' + esc(p.email_ortu) + '">Hubungi orang tua</a>' : '') + '</div>'; }).join('') + '</div>' : '<div class="small muted" style="margin-top:10px">Tidak ada siswa yang mendekati batas alfa.</div>');
  }

  async function load() {
    if (dirty && !(await U.confirm('Perubahan belum disimpan', 'Presensi yang Anda ubah belum disimpan. Tetap pindah dan buang perubahan?', 'Buang perubahan', true))) return false;
    jam = $('#aJ').value.trim();
    if (!/^\d{1,2}(-\d{1,2})?$/.test(jam)) { $('#aTable').innerHTML = U.empty('clock', 'Isi jam pelajaran', 'Masukkan JP ke- (contoh: 1 atau 1-4) pada kolom “Jam pelajaran”.'); $('#aStats').innerHTML = ''; return; }
    $('#aTable').innerHTML = '<div class="card-b">' + U.skeleton(5) + '</div>'; dirty = false; page = 1;
    try {
      const r = await API.read('absensi.get', { tanggal: tanggal, kelas_id: kelas, mapel_id: mapel, jam_ke: jam }, { ttl: 10000, force: true });
      if (!live()) return; data = r.data; state = {};
      data.siswa.forEach(function (x) { const it = data.items[x.siswa_id]; state[x.siswa_id] = { status: it ? it.status : 'H', keterangan: it ? it.keterangan : '' }; });
      note = data.note || ''; $('#aNote').value = note; drawStats(); drawTable(); dirtyLabel();
    } catch (e) { if (live()) $('#aTable').innerHTML = U.empty('alert', 'Gagal memuat presensi', e.message); }
    loadTren();
  }
  async function loadTren() {
    try { const r = await API.read('absensi.tren', { kelas_id: kelas }, { ttl: 60000, swr: true }); if (!live()) return; tren = r.data; drawSide(); if (r.refresh) r.refresh.then(function (x) { if (live()) { tren = x.data; drawSide(); } }); } catch (e) { tren = null; }
    drawSide();
  }

  const mark = function () { dirty = true; dirtyLabel(); };
  $('#aT').onchange = function () { tanggal = this.value || U.todayStr(); $('#aJ').value = ''; suggestJam(); load(); };
  $('#aK').onchange = function () { kelas = this.value; mapel = mapelFor(kelas)[0]; fillMapel(); $('#aJ').value = ''; suggestJam(); tren = null; drawSide(); load(); };
  $('#aM').onchange = function () { mapel = this.value; $('#aJ').value = ''; suggestJam(); load(); };
  $('#aJ').onchange = load;
  $('#aF').onchange = function () { fstatus = this.value; page = 1; if (data) drawTable(); };
  $('#aQ').oninput = U.debounce(function () { page = 1; if (data) drawTable(); }, 150);
  $('#aNote').oninput = function () { note = this.value; mark(); };
  $('#aAll').onclick = function () { if (!data) return; data.siswa.forEach(function (x) { state[x.siswa_id] = { status: 'H', keterangan: '' }; }); mark(); drawStats(); drawTable(); };
  $('#aTable').onclick = function (e) {
    const pg = e.target.closest('[data-pg]'); if (pg) { page = +pg.dataset.pg; drawTable(); return; }
    const b = e.target.closest('.hsia button'); if (!b || !data.can_edit) return;
    const sid = b.closest('tr').dataset.r; state[sid] = { status: b.dataset.s, keterangan: b.dataset.s === 'H' ? '' : state[sid].keterangan };
    mark(); drawStats(); drawTable();
    if (b.dataset.s !== 'H') { const k = $('tr[data-r="' + sid + '"] .ket'); if (k) k.focus(); }
  };
  $('#aTable').oninput = function (e) { const k = e.target.closest('.ket'); if (k) { state[k.closest('tr').dataset.r].keterangan = k.value; mark(); } };
  $('#aSave').onclick = async function () {
    if (!data) return; const b = this; b.disabled = true; b.innerHTML = '<div class="spin sm" style="border-top-color:#fff;border-color:rgba(255,255,255,.4)"></div> Menyimpan…';
    const items = data.siswa.filter(function (x) { return state[x.siswa_id].status !== 'H'; }).map(function (x) { return { siswa_id: x.siswa_id, status: state[x.siswa_id].status, keterangan: state[x.siswa_id].keterangan }; });
    try {
      const r = await API.call('absensi.save', { tanggal: tanggal, kelas_id: kelas, mapel_id: mapel, jam_ke: jam, items: items, note: note });
      dirty = false; data.saved = true; U.toast('Presensi tersimpan — Hadir ' + r.hadir + ' · Sakit ' + r.sakit + ' · Izin ' + r.izin + ' · Alfa ' + r.alfa, 'ok');
      App.touchDash(); API.forget('absensi.'); loadTren(); dirtyLabel();
    } catch (e) { U.toast('Gagal menyimpan: ' + e.message, 'err'); }
    b.disabled = false; b.innerHTML = icon('save') + 'Simpan presensi';
  };
  $('#aRekap').onclick = async function () {
    const bulan = tanggal.slice(0, 7), b = this; b.disabled = true;
    try {
      const r = await API.call('absensi.rekap', { kelas_id: kelas, bulan: bulan });
      const rows = [['Rekap kehadiran ' + App.kelas(kelas) + ' — ' + U.fmtMonth(bulan)], ['Jumlah sesi presensi', r.sesi], [], ['No', 'NIS', 'Nama', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Persentase']];
      r.rows.forEach(function (x, i) { rows.push([i + 1, x.nis, x.nama, x.H, x.S, x.I, x.A, x.pct === null ? '' : x.pct + '%']); });
      U.csv('Rekap_Absensi_' + App.kelas(kelas) + '_' + bulan + '.csv', rows);
    } catch (e) { U.toast(e.message, 'err'); }
    b.disabled = false;
  };
  const warn = function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', warn); App.cleanup = function () { window.removeEventListener('beforeunload', warn); };

  drawSide(); await load();

  async function absensiSiswa() {
    view.innerHTML = App.head(App.crumb('Kehadiran saya'), 'Kehadiran saya', 'Rekap ketidakhadiran Anda pada semester berjalan.') + '<div class="card pad">' + U.skeleton(3) + '</div>';
    const r = await API.read('absensi.mine', {}, { ttl: 30000, swr: true }); if (!live()) return;
    const draw = function (d) {
      const min = +s.settings.min_kehadiran || 85;
      view.innerHTML = App.head(App.crumb('Kehadiran saya'), 'Kehadiran saya', 'Rekap ketidakhadiran Anda pada semester berjalan.') +
        '<div class="grid g4" style="margin-bottom:var(--gap)">' + W.stat('usercheck', d.pct !== null && d.pct < min ? 'bad' : 'ok', 'Persentase kehadiran', d.pct === null ? '-' : U.num(d.pct, 1) + '%', W.bar(d.pct, d.pct !== null && d.pct < min ? 'bad' : 'ok') + '<div class="small muted">Minimum ' + min + '% · ' + d.sesi + ' sesi tercatat</div>') +
        W.stat('health', 'warn', 'Sakit', d.S) + W.stat('file', 'info', 'Izin', d.I) + W.stat('alert', 'bad', 'Alfa', d.A) + '</div>' +
        '<div class="card"><div class="card-h"><h3>Riwayat ketidakhadiran terbaru</h3></div><div class="card-b" style="padding-left:0;padding-right:0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Mata pelajaran</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>' +
        (d.recent.length ? d.recent.map(function (x) { return '<tr><td>' + U.fmtDate(x.tanggal, true) + '</td><td>' + esc(App.mapel(x.mapel_id)) + '</td><td><span class="badge ' + (x.status === 'A' ? 'bad' : 'warn') + '">' + ({ S: 'Sakit', I: 'Izin', A: 'Alfa' }[x.status]) + '</span></td><td class="muted">' + esc(x.keterangan || '-') + '</td></tr>'; }).join('') : '<tr><td colspan="4">' + U.empty('check', 'Tidak ada catatan ketidakhadiran', 'Pertahankan kehadiran Anda!') + '</td></tr>') + '</tbody></table></div></div></div>';
    };
    draw(r.data); if (r.refresh) r.refresh.then(function (x) { if (live()) draw(x.data); }).catch(function () {});
  }
};
