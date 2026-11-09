/* ==========================================================================
   PAGES B — Jurnal, Jadwal, Kalender, Data Master, Monitoring, Pengguna, Pengaturan
   ========================================================================== */

/* ====================================================================== */
/* JURNAL MENGAJAR                                                        */
/* ====================================================================== */
App.pages.jurnal = async function (view, q, live) {
  const { esc, icon, $ } = U;
  const s = App.s, role = s.user.role, METODE = ['Ceramah', 'Diskusi', 'Tanya Jawab', 'Demonstrasi', 'Praktikum', 'Project Based Learning', 'Problem Based Learning', 'Lainnya'];
  let bulan = /^\d{4}-\d{2}$/.test(q.bulan || '') ? q.bulan : U.todayStr().slice(0, 7), fstatus = q.status || '', fkelas = '', rows = [], page = 1;
  const PAGE = 15, isGuru = role === 'guru';
  const ptn = s.opts.penugasan;

  view.innerHTML = App.head(App.crumb('Jurnal mengajar'), 'Jurnal mengajar', 'Catatan kegiatan belajar mengajar per sesi.',
    '<button class="btn secondary" id="jCsv">' + icon('dl') + 'Unduh Excel (CSV)</button><button class="btn secondary" id="jPrint">' + icon('print') + 'Cetak PDF</button>' + (isGuru ? '<button class="btn primary" id="jAdd">' + icon('plus') + 'Tambah jurnal</button>' : '')) +
    '<div class="card"><div class="filters"><div class="field"><label for="jB">Bulan</label><input class="input" type="month" id="jB" value="' + bulan + '"></div>' +
    '<div class="field"><label for="jK">Kelas</label><select class="select" id="jK"><option value="">Semua kelas</option>' + U.options(s.opts.kelas, '', 'kelas_id', function (k) { return k.nama_kelas; }) + '</select></div>' +
    '<div class="field"><label for="jS">Status</label><select class="select" id="jS"><option value="">Semua</option><option value="final">Lengkap</option><option value="draft">Draft (materi belum diisi)</option></select></div></div>' +
    '<div class="print-only" style="padding:8px 20px"><b>Jurnal mengajar — ' + U.fmtMonth(bulan) + '</b></div><div id="jBody"></div></div>';
  $('#jS').value = fstatus;

  async function load() {
    $('#jBody').innerHTML = '<div class="card-b">' + U.skeleton(4) + '</div>';
    try { const r = await API.read('jurnal.list', { bulan: bulan, kelas_id: fkelas, status: fstatus }, { ttl: 10000, force: true }); if (!live()) return; rows = r.data.rows; page = 1; draw(); }
    catch (e) { if (live()) $('#jBody').innerHTML = U.empty('alert', 'Gagal memuat jurnal', e.message); }
  }
  function draw() {
    const part = rows.slice((page - 1) * PAGE, page * PAGE), showGuru = role !== 'guru';
    $('#jBody').innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>JP</th><th>Kelas</th><th>Mata pelajaran</th>' + (showGuru ? '<th>Guru</th>' : '') + '<th>Materi</th><th>Metode</th><th class="num">Hadir</th><th>Status</th><th class="no-print"></th></tr></thead><tbody>' +
      (part.length ? part.map(function (j) {
        return '<tr data-j="' + j.jurnal_id + '"><td class="mono">' + U.fmtShort(j.tanggal) + '</td><td class="mono">' + esc(j.jam_ke) + '</td><td>' + esc(App.kelas(j.kelas_id)) + '</td><td>' + esc(App.mapel(j.mapel_id)) + '</td>' + (showGuru ? '<td>' + esc(App.guru(j.guru_id)) + '</td>' : '') +
          '<td style="max-width:280px">' + (j.materi ? esc(j.materi) : '<span class="muted">— belum diisi —</span>') + '</td><td>' + esc(j.metode || '-') + '</td><td class="num">' + (j.jumlah_hadir === '' ? '-' : j.jumlah_hadir) + '</td>' +
          '<td>' + (j.status === 'final' ? '<span class="badge ok">Lengkap</span>' : '<span class="badge warn">Draft</span>') + (j.locked ? ' <span class="badge gray">Terkunci</span>' : '') + '</td>' +
          '<td class="no-print right" style="white-space:nowrap">' + (j.can_edit ? '<button class="btn ghost sm" data-e="1" aria-label="Edit jurnal">' + icon('pen') + '</button><button class="btn ghost sm" data-d="1" aria-label="Hapus jurnal">' + icon('trash') + '</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="10">' + U.empty('book', 'Belum ada jurnal pada periode ini', isGuru ? 'Jurnal draft dibuat otomatis saat Anda menyimpan presensi. Anda juga bisa menambahkannya manual.' : '') + '</td></tr>') + '</tbody></table></div>' + U.pager(rows.length, page, PAGE);
  }
  function form(j) {
    const ed = !!j, kl = []; ptn.forEach(function (p) { if (kl.indexOf(p.kelas_id) < 0) kl.push(p.kelas_id); });
    const k0 = ed ? j.kelas_id : kl[0], mapelOf = function (k) { return ptn.filter(function (p) { return p.kelas_id === k; }).map(function (p) { return p.mapel_id; }); };
    const m = U.modal({ title: ed ? 'Ubah jurnal mengajar' : 'Tambah jurnal mengajar', size: 'lg', body: '<form id="jF"><div class="form-grid">' +
      '<div class="field"><label>Tanggal</label><input class="input" type="date" name="tanggal" value="' + (ed ? j.tanggal : U.todayStr()) + '" max="' + U.todayStr() + '" ' + (ed ? 'disabled' : '') + ' required></div>' +
      '<div class="field"><label>Jam pelajaran (JP ke-)</label><input class="input" name="jam_ke" value="' + (ed ? esc(j.jam_ke) : '') + '" placeholder="mis. 1-4" maxlength="5" ' + (ed ? 'disabled' : '') + ' required></div>' +
      '<div class="field"><label>Kelas</label><select class="select" name="kelas_id" ' + (ed ? 'disabled' : '') + '>' + U.options(ed ? [{ id: j.kelas_id }] : kl.map(function (k) { return { id: k }; }), k0, 'id', function (x) { return App.kelas(x.id); }) + '</select></div>' +
      '<div class="field"><label>Mata pelajaran</label><select class="select" name="mapel_id" ' + (ed ? 'disabled' : '') + '>' + U.options((ed ? [j.mapel_id] : mapelOf(k0)).map(function (x) { return { id: x }; }), ed ? j.mapel_id : '', 'id', function (x) { return App.mapel(x.id); }) + '</select></div>' +
      '<div class="field full"><label>Materi / kegiatan pembelajaran</label><textarea class="textarea" name="materi" maxlength="500" placeholder="Contoh: Praktik membuat ERD dan relasi tabel MySQL">' + esc(ed ? j.materi : '') + '</textarea></div>' +
      '<div class="field"><label>Metode</label><select class="select" name="metode"><option value="">— pilih —</option>' + METODE.map(function (x) { return '<option' + (ed && j.metode === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Jumlah siswa hadir</label><input class="input" type="number" min="0" max="100" name="jumlah_hadir" value="' + (ed ? j.jumlah_hadir : '') + '"></div>' +
      '<div class="field full"><label>Catatan</label><textarea class="textarea" name="catatan" maxlength="500" style="min-height:56px">' + esc(ed ? j.catatan : '') + '</textarea></div></div><div id="jErr"></div></form>',
      foot: '<button class="btn secondary" data-no>Batal</button><button class="btn primary" data-ok>Simpan jurnal</button>' });
    const f = $('#jF', m.el);
    if (!ed) { f.elements.kelas_id.onchange = function () { f.elements.mapel_id.innerHTML = U.options(mapelOf(this.value).map(function (x) { return { id: x }; }), '', 'id', function (x) { return App.mapel(x.id); }); }; }
    $('[data-no]', m.el).onclick = m.close;
    $('[data-ok]', m.el).onclick = async function () {
      const b = this, e = f.elements; b.disabled = true;
      const payload = { jurnal_id: ed ? j.jurnal_id : '', tanggal: ed ? j.tanggal : e.tanggal.value, jam_ke: ed ? j.jam_ke : e.jam_ke.value.trim(), kelas_id: ed ? j.kelas_id : e.kelas_id.value, mapel_id: ed ? j.mapel_id : e.mapel_id.value, materi: e.materi.value, metode: e.metode.value, catatan: e.catatan.value, jumlah_hadir: e.jumlah_hadir.value };
      try { await API.call('jurnal.save', payload); m.close(); U.toast('Jurnal tersimpan.', 'ok'); App.touchDash(); load(); }
      catch (err) { $('#jErr', m.el).innerHTML = '<div class="err-box">' + esc(err.message) + '</div>'; b.disabled = false; }
    };
  }

  $('#jB').onchange = function () { if (this.value) { bulan = this.value; load(); } };
  $('#jK').onchange = function () { fkelas = this.value; load(); };
  $('#jS').onchange = function () { fstatus = this.value; load(); };
  if (isGuru) $('#jAdd').onclick = function () { form(null); };
  $('#jPrint').onclick = function () { window.print(); };
  $('#jCsv').onclick = function () {
    const out = [['Tanggal', 'JP', 'Kelas', 'Mata pelajaran', 'Guru', 'Materi', 'Metode', 'Hadir', 'Catatan', 'Status']];
    rows.forEach(function (j) { out.push([j.tanggal, j.jam_ke, App.kelas(j.kelas_id), App.mapel(j.mapel_id), App.guru(j.guru_id) === '-' ? s.user.nama : App.guru(j.guru_id), j.materi, j.metode, j.jumlah_hadir, j.catatan, j.status]); });
    U.csv('Jurnal_Mengajar_' + bulan + '.csv', out);
  };
  $('#jBody').onclick = async function (e) {
    const pg = e.target.closest('[data-pg]'); if (pg) { page = +pg.dataset.pg; draw(); return; }
    const tr = e.target.closest('tr[data-j]'); if (!tr) return; const j = rows.filter(function (x) { return x.jurnal_id === tr.dataset.j; })[0];
    if (e.target.closest('[data-e]')) form(j);
    else if (e.target.closest('[data-d]') && await U.confirm('Hapus jurnal?', 'Jurnal tanggal ' + U.fmtDate(j.tanggal) + ' (' + App.kelas(j.kelas_id) + ') akan dihapus permanen.', 'Hapus', true)) {
      try { await API.call('jurnal.delete', { id: j.jurnal_id }); U.toast('Jurnal dihapus.', 'ok'); App.touchDash(); load(); } catch (err) { U.toast(err.message, 'err'); }
    }
  };
  await load();
};

/* ====================================================================== */
/* JADWAL PELAJARAN (tampilan baca; pengeditan di Data Master)            */
/* ====================================================================== */
App.pages.jadwal = async function (view, q, live) {
  const { esc, icon, $ } = U;
  const s = App.s, role = s.user.role, canEdit = App.can(['admin', 'kurikulum']);
  let mode = App.isLeader() ? (q.guru ? 'guru' : 'kelas') : 'own', kelas = q.kelas || (s.opts.kelas[0] && s.opts.kelas[0].kelas_id) || '', guru = q.guru || (s.opts.guru[0] && s.opts.guru[0].guru_id) || '';
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  view.innerHTML = App.head(App.crumb('Jadwal pelajaran'), 'Jadwal pelajaran', mode === 'own' ? (role === 'guru' ? 'Jadwal mengajar Anda.' : 'Jadwal kelas Anda.') : 'Pilih kelas atau guru untuk melihat jadwalnya.',
    '<button class="btn secondary" id="sPrint">' + icon('print') + 'Cetak</button>' + (canEdit ? '<a class="btn primary" href="#/master?tab=jadwal">' + icon('pen') + 'Atur jadwal</a>' : '')) +
    (mode !== 'own' ? '<div class="card pad row wrap no-print" style="margin-bottom:var(--gap)"><div class="seg" id="sMode"><button data-m="kelas" class="' + (mode === 'kelas' ? 'on' : '') + '">Per kelas</button><button data-m="guru" class="' + (mode === 'guru' ? 'on' : '') + '">Per guru</button></div><select class="select" id="sSel" style="max-width:320px" aria-label="Pilihan"></select></div>' : '') + '<div id="sBody"></div>';
  function fillSel() { const el = $('#sSel'); if (!el) return; el.innerHTML = mode === 'kelas' ? U.options(s.opts.kelas, kelas, 'kelas_id', function (k) { return k.nama_kelas; }) : U.options(s.opts.guru, guru, 'guru_id', function (g) { return g.nama; }); }
  function draw() {
    const src = s.opts.jadwal.filter(function (j) { return mode === 'own' || (mode === 'kelas' ? j.kelas_id === kelas : j.guru_id === guru); });
    const today = U.hariNama();
    $('#sBody').innerHTML = src.length ? '<div class="grid g3" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">' + days.map(function (d) {
      const bl = App.blocks(src, d);
      return '<div class="card"><div class="card-h"><h3>' + d + '</h3>' + (d === today ? '<span class="badge pri">Hari ini</span>' : '') + '</div><div class="card-b">' + (bl.length ? '<div class="sched">' + bl.map(function (b) {
        return '<div class="sch" style="padding:10px"><div class="jp">JP ' + b.label + '</div><div class="grow"><b>' + esc(App.mapel(b.mapel_id)) + '</b><div class="meta"><span>' + App.hm(b.start) + '–' + App.hm(b.end) + '</span><span>' + esc(mode === 'kelas' ? App.guru(b.guru_id) : App.kelas(b.kelas_id)) + '</span>' + (b.ruang ? '<span>' + esc(b.ruang) + '</span>' : '') + '</div></div></div>'; }).join('') + '</div>' : '<div class="small muted">Tidak ada jadwal.</div>') + '</div></div>';
    }).join('') + '</div>' : '<div class="card pad">' + U.empty('clock', 'Jadwal belum tersedia', canEdit ? 'Tambahkan jadwal di Data Master → Jadwal.' : 'Jadwal belum diatur oleh Waka Kurikulum.') + '</div>';
  }
  if (mode !== 'own') {
    fillSel();
    $('#sMode').onclick = function (e) { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m; $('#sMode').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); fillSel(); draw(); };
    $('#sSel').onchange = function () { if (mode === 'kelas') kelas = this.value; else guru = this.value; draw(); };
  }
  $('#sPrint').onclick = function () { window.print(); };
  draw();
};

/* ====================================================================== */
/* KALENDER AKADEMIK                                                      */
/* ====================================================================== */
App.pages.kalender = async function (view, q, live) {
  const { esc, icon, $ } = U;
  const s = App.s, canEdit = App.can(['admin', 'kurikulum']);
  let ev = s.opts.kalender || [], cal;
  view.innerHTML = App.head(App.crumb('Kalender akademik'), 'Kalender akademik', 'Agenda sekolah: libur, ujian, kegiatan, rapat, dan pembagian rapor.', canEdit ? '<button class="btn primary" id="kAdd">' + icon('plus') + 'Tambah agenda</button>' : '') +
    '<div class="grid g-main"><div class="card pad"><div id="calBox"></div></div><div class="card"><div class="card-h"><div><h3 id="kT">Semua agenda</h3><p id="kS"></p></div></div><div class="card-b" id="kList"></div></div></div>';
  let sel = '';
  function list() {
    const items = (sel ? W.eventsOn(ev, sel) : ev.filter(function (e) { return (e.tanggal_selesai || e.tanggal_mulai) >= U.todayStr(); })).slice().sort(function (a, b) { return a.tanggal_mulai.localeCompare(b.tanggal_mulai); });
    $('#kT').textContent = sel ? 'Agenda ' + U.fmtDate(sel, true) : 'Agenda mendatang'; $('#kS').textContent = sel ? 'Klik tanggal lain untuk berganti' : 'Klik tanggal di kalender untuk melihat agenda hari itu';
    $('#kList').innerHTML = items.length ? '<div class="agenda">' + items.map(function (e) {
      const k = W.KAT[e.kategori] || ['', 'gray'];
      return '<div class="ag" data-e="' + e.event_id + '"><div class="dt">' + U.BLN[U.parse(e.tanggal_mulai).getMonth()].slice(0, 3).toUpperCase() + '<b>' + U.parse(e.tanggal_mulai).getDate() + '</b></div><div class="grow"><b>' + esc(e.judul) + '</b><div class="small muted">' + U.fmtDate(e.tanggal_mulai) + (e.tanggal_selesai && e.tanggal_selesai !== e.tanggal_mulai ? ' – ' + U.fmtDate(e.tanggal_selesai) : '') + (e.keterangan ? ' · ' + esc(e.keterangan) : '') + '</div></div>' +
        '<span class="badge ' + k[1] + '">' + esc(k[0]) + '</span>' + (canEdit ? '<button class="btn ghost sm" data-ed="1" aria-label="Ubah">' + icon('pen') + '</button><button class="btn ghost sm" data-del="1" aria-label="Hapus">' + icon('trash') + '</button>' : '') + '</div>'; }).join('') + '</div>' : '<div class="empty small">' + (sel ? 'Tidak ada agenda pada tanggal ini.' : 'Belum ada agenda mendatang.') + '</div>';
  }
  async function refresh() { const r = await API.call('master.list', { entity: 'kalender' }); ev = r.rows; App.patchOpts('kalender', ev); cal.setEvents(ev); list(); }
  function form(e) {
    const m = U.modal({ title: e ? 'Ubah agenda' : 'Tambah agenda', body: '<form id="kF"><div class="form-grid"><div class="field full"><label>Judul agenda</label><input class="input" name="judul" maxlength="120" required value="' + esc(e ? e.judul : '') + '"></div>' +
      '<div class="field"><label>Tanggal mulai</label><input class="input" type="date" name="tanggal_mulai" required value="' + (e ? e.tanggal_mulai : (sel || U.todayStr())) + '"></div><div class="field"><label>Tanggal selesai (opsional)</label><input class="input" type="date" name="tanggal_selesai" value="' + (e ? e.tanggal_selesai : '') + '"></div>' +
      '<div class="field"><label>Kategori</label><select class="select" name="kategori">' + Object.keys(W.KAT).map(function (k) { return '<option value="' + k + '"' + (e && e.kategori === k ? ' selected' : '') + '>' + W.KAT[k][0] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label>Keterangan</label><textarea class="textarea" name="keterangan" maxlength="300" style="min-height:56px">' + esc(e ? e.keterangan : '') + '</textarea></div></div><div id="kErr"></div></form>',
      foot: '<button class="btn secondary" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>' });
    $('[data-no]', m.el).onclick = m.close;
    $('[data-ok]', m.el).onclick = async function () {
      const f = $('#kF', m.el).elements, b = this; b.disabled = true;
      const rec = { judul: f.judul.value, tanggal_mulai: f.tanggal_mulai.value, tanggal_selesai: f.tanggal_selesai.value, kategori: f.kategori.value, keterangan: f.keterangan.value }; if (e) rec.event_id = e.event_id;
      try { await API.call('master.save', { entity: 'kalender', record: rec }); m.close(); await refresh(); U.toast('Agenda tersimpan.', 'ok'); }
      catch (err) { $('#kErr', m.el).innerHTML = '<div class="err-box">' + esc(err.message) + '</div>'; b.disabled = false; }
    };
  }
  cal = W.calendar($('#calBox'), ev, { onPick: function (d) { sel = sel === d ? '' : d; list(); } });
  list();
  if (canEdit) {
    $('#kAdd').onclick = function () { form(null); };
    $('#kList').onclick = async function (x) {
      const row = x.target.closest('[data-e]'); if (!row) return; const e = ev.filter(function (z) { return z.event_id === row.dataset.e; })[0];
      if (x.target.closest('[data-ed]')) form(e);
      else if (x.target.closest('[data-del]') && await U.confirm('Hapus agenda?', '“' + e.judul + '” akan dihapus.', 'Hapus', true)) { try { await API.call('master.delete', { entity: 'kalender', id: e.event_id }); await refresh(); U.toast('Agenda dihapus.', 'ok'); } catch (err) { U.toast(err.message, 'err'); } }
    };
  }
};

/* ====================================================================== */
/* DATA MASTER                                                            */
/* ====================================================================== */
App.pages.master = async function (view, q, live) {
  const { esc, icon, $ } = U;
  const s = App.s, role = s.user.role;
  const taL = function (id) { const t = App.idx.ta[id]; return t ? t.tahun + ' ' + t.semester : '-'; };
  const REF = {
    kelas: function () { return s.opts.kelas.map(function (x) { return { v: x.kelas_id, l: x.nama_kelas }; }); },
    guru: function () { return s.opts.guru.map(function (x) { return { v: x.guru_id, l: x.nama }; }); },
    mapel: function () { return s.opts.mapel.map(function (x) { return { v: x.mapel_id, l: x.nama }; }); },
    ta: function () { return s.opts.ta.map(function (x) { return { v: x.ta_id, l: x.tahun + ' ' + x.semester }; }); }
  };
  const ST = [['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']];
  const ENT = {
    siswa: { label: 'Siswa', write: ['admin'], imp: true, soft: true, cols: [['nis', 'NIS'], ['nama', 'Nama'], ['jenis_kelamin', 'JK'], ['kelas_id', 'Kelas', 'kelas'], ['email_ortu', 'Email orang tua'], ['status', 'Status', 'st']],
      form: [['nis', 'NIS', 'text', 1], ['nisn', 'NISN', 'text'], ['nama', 'Nama lengkap', 'text', 1, 'full'], ['jenis_kelamin', 'Jenis kelamin', 'enum', 1, '', [['L', 'Laki-laki'], ['P', 'Perempuan']]], ['kelas_id', 'Kelas', 'ref', 0, '', 'kelas'], ['email_ortu', 'Email orang tua', 'email', 0, 'full'], ['status', 'Status', 'enum', 0, '', ST]] },
    guru: { label: 'Guru', write: ['admin'], imp: true, soft: true, cols: [['nip', 'NIP'], ['nama', 'Nama'], ['email', 'Email'], ['no_hp', 'No. HP'], ['status', 'Status', 'st']],
      form: [['nip', 'NIP', 'text'], ['nama', 'Nama lengkap', 'text', 1, 'full'], ['email', 'Email', 'email'], ['no_hp', 'No. HP', 'text'], ['status', 'Status', 'enum', 0, '', ST]] },
    kelas: { label: 'Kelas', write: ['admin'], soft: true, cols: [['nama_kelas', 'Kelas'], ['jurusan', 'Jurusan'], ['tingkat', 'Tingkat'], ['wali_kelas_id', 'Wali kelas', 'guru'], ['ta_id', 'Tahun ajaran', 'ta'], ['status', 'Status', 'st']],
      form: [['nama_kelas', 'Nama kelas (mis. XII RPL 1)', 'text', 1, 'full'], ['jurusan', 'Jurusan / konsentrasi', 'text', 0, 'full'], ['tingkat', 'Tingkat', 'enum', 1, '', [['X', 'X'], ['XI', 'XI'], ['XII', 'XII']]], ['wali_kelas_id', 'Wali kelas', 'ref', 0, '', 'guru'], ['ta_id', 'Tahun ajaran', 'ref', 0, '', 'ta'], ['status', 'Status', 'enum', 0, '', ST]] },
    mapel: { label: 'Mata pelajaran', write: ['admin'], soft: true, cols: [['kode', 'Kode'], ['nama', 'Nama'], ['kelompok', 'Kelompok'], ['jam_per_minggu', 'JP/minggu'], ['status', 'Status', 'st']],
      form: [['kode', 'Kode', 'text', 1], ['jam_per_minggu', 'JP per minggu', 'num'], ['nama', 'Nama mata pelajaran', 'text', 1, 'full'], ['kelompok', 'Kelompok', 'text'], ['status', 'Status', 'enum', 0, '', ST]] },
    penugasan: { label: 'Penugasan', write: ['admin', 'kurikulum'], cols: [['guru_id', 'Guru', 'guru'], ['mapel_id', 'Mata pelajaran', 'mapel'], ['kelas_id', 'Kelas', 'kelas'], ['ta_id', 'Tahun ajaran', 'ta']],
      form: [['guru_id', 'Guru', 'ref', 1, 'full', 'guru'], ['mapel_id', 'Mata pelajaran', 'ref', 1, 'full', 'mapel'], ['kelas_id', 'Kelas', 'ref', 1, '', 'kelas'], ['ta_id', 'Tahun ajaran', 'ref', 1, '', 'ta']] },
    jadwal: { label: 'Jadwal', write: ['admin', 'kurikulum'], cols: [['hari', 'Hari'], ['jam_ke', 'JP'], ['kelas_id', 'Kelas', 'kelas'], ['mapel_id', 'Mata pelajaran', 'mapel'], ['guru_id', 'Guru', 'guru'], ['ruang', 'Ruang']],
      form: [['hari', 'Hari', 'enum', 1, '', ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(function (h) { return [h, h]; })], ['jam_ke', 'JP ke-', 'num', 1], ['kelas_id', 'Kelas', 'ref', 1, '', 'kelas'], ['guru_id', 'Guru', 'ref', 1, '', 'guru'], ['mapel_id', 'Mata pelajaran', 'ref', 1, 'full', 'mapel'], ['ruang', 'Ruang', 'text', 0, 'full']] },
    ta: { label: 'Tahun ajaran', write: ['admin'], noDel: true, cols: [['tahun', 'Tahun ajaran'], ['semester', 'Semester'], ['mulai', 'Mulai'], ['selesai', 'Selesai'], ['status_aktif', 'Aktif', 'aktif']],
      form: [['tahun', 'Tahun ajaran (mis. 2026/2027)', 'text', 1], ['semester', 'Semester', 'enum', 1, '', [['Ganjil', 'Ganjil'], ['Genap', 'Genap']]], ['mulai', 'Tanggal mulai', 'date'], ['selesai', 'Tanggal selesai', 'date'], ['status_aktif', 'Jadikan tahun ajaran aktif', 'enum', 0, 'full', [['0', 'Tidak'], ['1', 'Ya — hanya satu yang aktif']]]] }
  };
  const TABS = { admin: ['siswa', 'guru', 'kelas', 'mapel', 'penugasan', 'jadwal', 'ta'], kepsek: ['siswa', 'guru', 'kelas', 'mapel', 'penugasan', 'jadwal', 'ta'], kurikulum: ['penugasan', 'jadwal', 'siswa', 'guru', 'kelas', 'mapel', 'ta'], guru: ['siswa', 'kelas', 'mapel'] }[role] || [];
  if (!TABS.length) { view.innerHTML = '<div class="card pad">' + U.empty('box', 'Tidak ada akses', '') + '</div>'; return; }
  let tab = TABS.indexOf(q.tab) >= 0 ? q.tab : TABS[0], rows = [], page = 1, term = '', PAGE = 12;
  const cfg = function () { return ENT[tab]; }, canW = function () { return cfg().write.indexOf(role) >= 0; };

  view.innerHTML = App.head(App.crumb('Data master'), role === 'guru' ? 'Data siswa' : 'Data master', role === 'guru' ? 'Siswa di kelas yang Anda ampu atau wali.' : 'Kelola data induk sekolah.') +
    '<div class="tabs" id="mT" role="tablist">' + TABS.map(function (t) { return '<button role="tab" data-t="' + t + '" class="' + (t === tab ? 'on' : '') + '">' + ENT[t].label + '</button>'; }).join('') + '</div><div class="card" id="mCard"></div>';

  function cell(c, r) {
    const v = r[c[0]];
    if (c[2] === 'kelas') return esc(App.kelas(v)); if (c[2] === 'guru') return v ? esc(App.guru(v)) : '<span class="muted">-</span>'; if (c[2] === 'mapel') return esc(App.mapel(v)); if (c[2] === 'ta') return esc(taL(v));
    if (c[2] === 'st') return '<span class="badge ' + (v === 'nonaktif' ? 'gray' : 'ok') + '">' + (v === 'nonaktif' ? 'Nonaktif' : 'Aktif') + '</span>';
    if (c[2] === 'aktif') return v === '1' ? '<span class="badge ok">Aktif</span>' : '<span class="badge gray">—</span>';
    return v === '' || v === undefined ? '<span class="muted">-</span>' : esc(v);
  }
  function filtered() {
    let r = rows; const t = term.toLowerCase();
    if (t) r = r.filter(function (x) { return cfg().cols.some(function (c) { const v = c[2] === 'kelas' ? App.kelas(x[c[0]]) : c[2] === 'guru' ? App.guru(x[c[0]]) : c[2] === 'mapel' ? App.mapel(x[c[0]]) : x[c[0]]; return String(v).toLowerCase().indexOf(t) >= 0; }); });
    if (tab === 'jadwal') { const o = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; r = r.slice().sort(function (a, b) { return o.indexOf(a.hari) - o.indexOf(b.hari) || a.jam_ke - b.jam_ke || App.kelas(a.kelas_id).localeCompare(App.kelas(b.kelas_id)); }); }
    else if (tab === 'siswa') r = r.slice().sort(function (a, b) { return App.kelas(a.kelas_id).localeCompare(App.kelas(b.kelas_id)) || a.nama.localeCompare(b.nama); });
    return r;
  }
  function draw() {
    const c = cfg(), list = filtered(), part = list.slice((page - 1) * PAGE, page * PAGE), w = canW();
    $('#mCard').innerHTML = '<div class="toolbar" style="padding-top:16px"><div class="search" style="max-width:320px"><span>' + icon('search') + '</span><input id="mQ" value="' + esc(term) + '" placeholder="Cari ' + esc(c.label.toLowerCase()) + '…" aria-label="Cari"></div><span class="grow"></span>' +
      (w && c.imp ? '<button class="btn secondary" id="mImp">' + icon('ul') + 'Impor CSV</button>' : '') + (w ? '<button class="btn primary" id="mAdd">' + icon('plus') + 'Tambah ' + esc(c.label.toLowerCase()) + '</button>' : '<span class="badge gray">Hanya lihat</span>') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th>' + c.cols.map(function (x) { return '<th>' + x[1] + '</th>'; }).join('') + (w ? '<th></th>' : '') + '</tr></thead><tbody>' +
      (part.length ? part.map(function (r, i) { return '<tr data-id="' + esc(r[Object.keys(r)[0]]) + '"><td class="num muted">' + ((page - 1) * PAGE + i + 1) + '</td>' + c.cols.map(function (x) { return '<td>' + cell(x, r) + '</td>'; }).join('') + (w ? '<td class="right" style="white-space:nowrap"><button class="btn ghost sm" data-e="1" aria-label="Ubah">' + icon('pen') + '</button>' + (c.noDel ? '' : '<button class="btn ghost sm" data-d="1" aria-label="' + (c.soft ? 'Nonaktifkan' : 'Hapus') + '">' + icon('trash') + '</button>') + '</td>' : '') + '</tr>'; }).join('') : '<tr><td colspan="' + (c.cols.length + 2) + '">' + U.empty('box', term ? 'Tidak ada hasil' : 'Belum ada data ' + c.label.toLowerCase(), w && !term ? 'Klik “Tambah” untuk memulai.' : '') + '</td></tr>') + '</tbody></table></div>' + U.pager(list.length, page, PAGE);
    const qi = $('#mQ'); qi.oninput = U.debounce(function () { term = qi.value; page = 1; draw(); const n = $('#mQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200);
    if ($('#mAdd')) $('#mAdd').onclick = function () { form(null); }; if ($('#mImp')) $('#mImp').onclick = importer;
  }
  async function load(force) {
    $('#mCard').innerHTML = '<div class="card-b">' + U.skeleton(4) + '</div>'; const t = tab;
    try { const r = await API.read('master.list', { entity: t }, { ttl: 20000, force: !!force }); if (!live() || t !== tab) return; rows = r.data.rows; page = 1; draw(); }
    catch (e) { if (live()) $('#mCard').innerHTML = U.empty('alert', 'Gagal memuat data', e.message); }
  }
  async function afterChange() { API.forget('master.list'); App.touchDash(); API.forget('nilai.'); API.forget('absensi.'); await load(true); App.refreshBoot().then(function () { }).catch(function () { }); }

  function field(f, val) {
    const name = f[0], lab = f[1], t = f[2], req = f[3], cls = f[4] || '', extra = f[5], id = 'mf_' + name;
    let inp;
    if (t === 'enum') inp = '<select class="select" name="' + name + '" id="' + id + '">' + extra.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    else if (t === 'ref') inp = '<select class="select" name="' + name + '" id="' + id + '"><option value="">' + (req ? '— pilih —' : '— tidak ada —') + '</option>' + REF[extra]().map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(val) === String(o.v) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>';
    else inp = '<input class="input" name="' + name + '" id="' + id + '" type="' + (t === 'num' ? 'number' : t === 'date' ? 'date' : t === 'email' ? 'email' : 'text') + '" value="' + esc(val === undefined ? '' : val) + '"' + (t === 'num' ? ' min="0"' : '') + ' maxlength="120" autocomplete="off">';
    return '<div class="field ' + cls + '"><label for="' + id + '">' + lab + (req ? ' *' : '') + '</label>' + inp + '</div>';
  }
  function form(rec) {
    const c = cfg(), ed = !!rec, idc = Object.keys(rows[0] || rec || { id: 1 })[0];
    const defaults = !ed && tab === 'penugasan' && s.ta ? { ta_id: s.ta.ta_id } : !ed && tab === 'kelas' && s.ta ? { ta_id: s.ta.ta_id } : {};
    const m = U.modal({ title: (ed ? 'Ubah ' : 'Tambah ') + c.label.toLowerCase(), body: '<form id="mF" autocomplete="off"><div class="form-grid">' + c.form.map(function (f) { return field(f, ed ? rec[f[0]] : (defaults[f[0]] !== undefined ? defaults[f[0]] : (f[2] === 'enum' ? f[5][0][0] : ''))); }).join('') + '</div><div id="mErr"></div></form>', foot: '<button class="btn secondary" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>' });
    $('[data-no]', m.el).onclick = m.close;
    const submit = async function () {
      const b = $('[data-ok]', m.el), f = $('#mF', m.el).elements, out = {}; b.disabled = true;
      c.form.forEach(function (x) { out[x[0]] = f[x[0]].value; }); if (ed) out[idc] = rec[idc];
      try { await API.call('master.save', { entity: tab, record: out }); m.close(); U.toast('Data tersimpan.', 'ok'); afterChange(); }
      catch (err) { $('#mErr', m.el).innerHTML = '<div class="err-box">' + esc(err.message) + '</div>'; b.disabled = false; }
    };
    $('[data-ok]', m.el).onclick = submit; $('#mF', m.el).onsubmit = function (e) { e.preventDefault(); submit(); };
  }
  function importer() {
    const siswa = tab === 'siswa', hdr = siswa ? 'nis,nisn,nama,jenis_kelamin,kelas,email_ortu' : 'nip,nama,email,no_hp';
    const m = U.modal({ title: 'Impor ' + cfg().label.toLowerCase() + ' dari CSV', size: 'lg', body: '<div class="info-box" style="margin-bottom:14px"><b>Format:</b> baris pertama adalah judul kolom: <span class="cred">' + hdr + '</span>.' + (siswa ? ' Kolom <b>kelas</b> berisi nama kelas persis seperti di Data Master (mis. “XII RPL 1”); <b>jenis_kelamin</b> diisi L atau P.' : '') + ' Data dengan ' + (siswa ? 'NIS' : 'NIP') + ' yang sudah ada akan diperbarui. Dari Excel: Simpan sebagai → CSV.</div>' +
      '<div class="row wrap" style="margin-bottom:12px"><input type="file" id="iF" accept=".csv,text/csv,.txt"><button class="btn secondary sm" id="iT">' + icon('dl') + 'Unduh templat</button></div><div id="iPrev"></div>', foot: '<button class="btn secondary" data-no>Tutup</button><button class="btn primary" data-ok disabled>Impor sekarang</button>' });
    let data = [];
    $('[data-no]', m.el).onclick = m.close;
    $('#iT', m.el).onclick = function () { U.csv('templat_' + tab + '.csv', [hdr.split(','), siswa ? ['2021.10.001', '0067891234', 'Contoh Siswa', 'L', 'XII RPL 1', 'ortu@email.com'] : ['198501012010011001', 'Contoh Guru, S.Pd', 'guru@email.com', '08123456789']]); };
    const norm = { jk: 'jenis_kelamin', 'jenis kelamin': 'jenis_kelamin', gender: 'jenis_kelamin', 'nama lengkap': 'nama', nama_siswa: 'nama', 'email orang tua': 'email_ortu', hp: 'no_hp', 'no hp': 'no_hp', 'no. hp': 'no_hp' };
    $('#iF', m.el).onchange = function () {
      const f = this.files[0]; if (!f) return; const rd = new FileReader();
      rd.onload = function () {
        const t = U.parseCsv(String(rd.result)); if (t.length < 2) { $('#iPrev', m.el).innerHTML = '<div class="err-box">Berkas kosong atau hanya berisi judul kolom.</div>'; return; }
        const h = t[0].map(function (x) { x = String(x).trim().toLowerCase(); return norm[x] || x; });
        data = t.slice(1).map(function (r) { const o = {}; h.forEach(function (k, i) { o[k] = String(r[i] === undefined ? '' : r[i]).trim(); }); return o; });
        $('#iPrev', m.el).innerHTML = '<p class="small muted" style="margin-bottom:6px"><b>' + data.length + '</b> baris terbaca. Pratinjau 5 baris pertama:</p><div class="tbl-wrap"><table class="tbl"><thead><tr>' + h.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' + data.slice(0, 5).map(function (o) { return '<tr>' + h.map(function (k) { return '<td>' + esc(o[k]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
        $('[data-ok]', m.el).disabled = data.length === 0;
      };
      rd.readAsText(f, 'UTF-8');
    };
    $('[data-ok]', m.el).onclick = async function () {
      const b = this; b.disabled = true; let baru = 0, upd = 0, gagal = 0, errs = [];
      try {
        for (let i = 0; i < data.length; i += 200) {
          b.innerHTML = '<div class="spin sm" style="border-top-color:#fff;border-color:rgba(255,255,255,.4)"></div> ' + Math.min(i + 200, data.length) + ' / ' + data.length;
          const r = await API.call('master.import', { entity: tab, rows: data.slice(i, i + 200) }); baru += r.baru; upd += r.diperbarui; gagal += r.gagal; r.errors.forEach(function (e) { errs.push('Baris ' + (i + e.baris + 1) + ': ' + e.pesan); });
        }
      } catch (e) { errs.push(e.message); }
      $('#iPrev', m.el).innerHTML = '<div class="' + (gagal || errs.length ? 'warn-box' : 'info-box') + '"><b>Selesai.</b> ' + baru + ' data baru, ' + upd + ' diperbarui, ' + gagal + ' gagal.' + (errs.length ? '<ul style="margin:8px 0 0;padding-left:18px">' + errs.slice(0, 20).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      b.remove(); afterChange();
    };
  }

  $('#mT').onclick = function (e) { const b = e.target.closest('[data-t]'); if (!b || b.dataset.t === tab) return; tab = b.dataset.t; term = ''; $('#mT').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); load(); };
  $('#mCard').onclick = async function (e) {
    const pg = e.target.closest('[data-pg]'); if (pg) { page = +pg.dataset.pg; draw(); return; }
    const tr = e.target.closest('tr[data-id]'); if (!tr) return; const idc = Object.keys(rows[0])[0], rec = rows.filter(function (r) { return String(r[idc]) === tr.dataset.id; })[0];
    if (e.target.closest('[data-e]')) form(rec);
    else if (e.target.closest('[data-d]')) {
      const c = cfg(), nm = rec.nama || rec.nama_kelas || rec.judul || '';
      if (await U.confirm(c.soft ? 'Nonaktifkan data?' : 'Hapus data?', c.soft ? '“' + nm + '” dinonaktifkan (riwayat nilai & presensi tetap aman). Akun login terkait ikut dinonaktifkan.' : 'Data ini akan dihapus permanen.', c.soft ? 'Nonaktifkan' : 'Hapus', true)) {
        try { await API.call('master.delete', { entity: tab, id: rec[idc] }); U.toast(c.soft ? 'Data dinonaktifkan.' : 'Data dihapus.', 'ok'); afterChange(); } catch (err) { U.toast(err.message, 'err'); }
      }
    }
  };
  await load();
};

/* ====================================================================== */
/* MONITORING                                                             */
/* ====================================================================== */
App.pages.monitoring = async function (view, q, live) {
  const { esc, icon, $ } = U;
  const s = App.s; let rows = [], fg = '', fk = '', fst = '';
  view.innerHTML = App.head(App.crumb('Monitoring sekolah'), 'Monitoring kelengkapan guru', 'Pengisian nilai, presensi, dan jurnal mengajar (30 hari terakhir).', '<button class="btn secondary" id="mCsv">' + icon('dl') + 'Unduh Excel (CSV)</button><button class="btn secondary" id="mPr">' + icon('print') + 'Cetak</button>') +
    '<div class="card"><div class="filters" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="field"><label>Guru</label><select class="select" id="mG"><option value="">Semua guru</option>' + U.options(s.opts.guru, '', 'guru_id', function (g) { return g.nama; }) + '</select></div>' +
    '<div class="field"><label>Kelas</label><select class="select" id="mK"><option value="">Semua kelas</option>' + U.options(s.opts.kelas, '', 'kelas_id', function (k) { return k.nama_kelas; }) + '</select></div>' +
    '<div class="field"><label>Kelengkapan nilai</label><select class="select" id="mS"><option value="">Semua</option><option value="low">Belum lengkap (&lt; 100%)</option><option value="done">Lengkap (100%)</option><option value="none">Belum ada nilai</option></select></div></div><div id="mBody"><div class="card-b">' + U.skeleton(4) + '</div></div></div>';
  function view_() { return rows.filter(function (r) { return (!fg || r.guru_id === fg) && (!fk || r.kelas_id === fk) && (!fst || (fst === 'low' ? r.nilai_pct < 100 : fst === 'done' ? r.nilai_pct >= 100 : !r.nilai_pct)); }); }
  function draw() {
    const l = view_();
    $('#mBody').innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Guru</th><th>Kelas</th><th>Mata pelajaran</th><th style="min-width:170px">Kelengkapan nilai</th><th class="num">Presensi (30h)</th><th>Presensi terakhir</th><th class="num">Jurnal (30h)</th><th class="num">Draft</th></tr></thead><tbody>' +
      (l.length ? l.map(function (r) { const p = r.nilai_pct || 0; return '<tr><td><div class="person"><span class="avatar sm tint">' + esc(U.initials(App.guru(r.guru_id))) + '</span><b>' + esc(App.guru(r.guru_id)) + '</b></div></td><td>' + esc(App.kelas(r.kelas_id)) + '</td><td>' + esc(App.mapel(r.mapel_id)) + '</td>' +
        '<td><div class="row"><div class="grow">' + W.bar(p, p >= 100 ? 'ok' : p > 0 ? 'warn' : 'bad') + '</div><b class="small">' + U.num(p, 0) + '%</b></div></td><td class="num">' + r.sesi_30h + '</td><td>' + (r.terakhir ? U.fmtShort(r.terakhir) : '<span class="muted">belum pernah</span>') + '</td><td class="num">' + r.jurnal_30h + '</td><td class="num">' + (r.jurnal_draft ? '<span class="badge warn">' + r.jurnal_draft + '</span>' : '0') + '</td></tr>'; }).join('') : '<tr><td colspan="8">' + U.empty('chart', rows.length ? 'Tidak ada data yang cocok' : 'Belum ada penugasan guru', '') + '</td></tr>') + '</tbody></table></div>';
  }
  ['mG', 'mK', 'mS'].forEach(function (id) { $('#' + id).onchange = function () { fg = $('#mG').value; fk = $('#mK').value; fst = $('#mS').value; draw(); }; });
  $('#mPr').onclick = function () { window.print(); };
  $('#mCsv').onclick = function () { const o = [['Guru', 'Kelas', 'Mata pelajaran', 'Kelengkapan nilai %', 'Sesi presensi 30h', 'Presensi terakhir', 'Jurnal 30h', 'Jurnal draft']]; view_().forEach(function (r) { o.push([App.guru(r.guru_id), App.kelas(r.kelas_id), App.mapel(r.mapel_id), r.nilai_pct, r.sesi_30h, r.terakhir, r.jurnal_30h, r.jurnal_draft]); }); U.csv('Monitoring_Guru_' + U.todayStr() + '.csv', o); };
  try { const r = await API.read('monitoring', {}, { ttl: 30000, swr: true }); if (!live()) return; rows = r.data.rows; draw(); if (r.refresh) r.refresh.then(function (x) { if (live()) { rows = x.data.rows; draw(); } }).catch(function () {}); }
  catch (e) { if (live()) $('#mBody').innerHTML = U.empty('alert', 'Gagal memuat monitoring', e.message); }
};

/* ====================================================================== */
/* PENGGUNA (admin)                                                       */
/* ====================================================================== */
App.pages.users = async function (view, q, live) {
  const { esc, icon, $ } = U;
  const s = App.s, RL = App.ROLE_LABEL; let rows = [], term = '', frole = '', page = 1; const PAGE = 15;
  view.innerHTML = App.head(App.crumb('Pengguna'), 'Pengguna & akun login', 'Akun dibuat oleh admin. Password awal wajib diganti saat login pertama.',
    '<button class="btn secondary" id="uGenG">' + icon('users') + 'Buat akun semua guru</button><button class="btn secondary" id="uGenS">' + icon('users') + 'Buat akun semua siswa</button><button class="btn primary" id="uAdd">' + icon('plus') + 'Tambah akun</button>') +
    '<div class="card"><div class="toolbar" style="padding-top:16px"><div class="search" style="max-width:300px"><span>' + icon('search') + '</span><input id="uQ" placeholder="Cari username / nama" aria-label="Cari"></div><select class="select" id="uR" style="width:auto"><option value="">Semua peran</option>' + Object.keys(RL).map(function (k) { return '<option value="' + k + '">' + RL[k] + '</option>'; }).join('') + '</select></div><div id="uBody"><div class="card-b">' + U.skeleton(4) + '</div></div></div>';

  function list() { const t = term.toLowerCase(); return rows.filter(function (u) { return (!frole || u.role === frole) && (!t || (u.username + ' ' + u.nama).toLowerCase().indexOf(t) >= 0); }); }
  function draw() {
    const l = list(), part = l.slice((page - 1) * PAGE, page * PAGE);
    $('#uBody').innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Username</th><th>Nama</th><th>Peran</th><th>Status</th><th>Login terakhir</th><th></th></tr></thead><tbody>' +
      (part.length ? part.map(function (u) { const me = u.user_id === s.user.id; return '<tr data-u="' + u.user_id + '"><td class="mono"><b>' + esc(u.username) + '</b></td><td>' + esc(u.nama) + '</td><td><span class="badge pri">' + esc(RL[u.role] || u.role) + '</span></td><td>' + (u.status === 'aktif' ? '<span class="badge ok">Aktif</span>' : '<span class="badge gray">Nonaktif</span>') + (u.must_change === '1' ? ' <span class="badge warn">Belum ganti password</span>' : '') + '</td><td class="muted small">' + esc(u.last_login || 'belum pernah') + '</td>' +
        '<td class="right" style="white-space:nowrap"><button class="btn ghost sm" data-rs="1" title="Atur ulang password">' + icon('key') + 'Reset</button>' + (me ? '' : '<button class="btn ghost sm" data-tg="1">' + (u.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan') + '</button>') + '</td></tr>'; }).join('') : '<tr><td colspan="6">' + U.empty('users', 'Tidak ada akun', '') + '</td></tr>') + '</tbody></table></div>' + U.pager(l.length, page, PAGE);
  }
  async function load() { try { const r = await API.read('users.list', {}, { force: true }); if (!live()) return; rows = r.data.rows; draw(); } catch (e) { if (live()) $('#uBody').innerHTML = U.empty('alert', 'Gagal memuat akun', e.message); } }
  function credModal(list, title) {
    const m = U.modal({ title: title || 'Kredensial akun', size: 'lg', sticky: true, body: '<div class="warn-box" style="margin-bottom:12px"><b>Catat sekarang.</b> Password hanya ditampilkan sekali dan tidak tersimpan dalam bentuk terbaca. Pengguna wajib menggantinya saat login pertama.</div><div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th>Nama</th><th>Username</th><th>Password awal</th></tr></thead><tbody>' + list.map(function (c) { return '<tr><td>' + esc(c.nama) + '</td><td><span class="cred">' + esc(c.username) + '</span></td><td><span class="cred">' + esc(c.password) + '</span></td></tr>'; }).join('') + '</tbody></table></div>',
      foot: '<button class="btn secondary" id="cCsv">' + icon('dl') + 'Unduh CSV</button><button class="btn primary" data-ok>Sudah saya catat</button>' });
    $('#cCsv', m.el).onclick = function () { U.csv('akun_baru_' + U.todayStr() + '.csv', [['Nama', 'Username', 'Password awal', 'Peran']].concat(list.map(function (c) { return [c.nama, c.username, c.password, RL[c.role] || c.role]; }))); };
    $('[data-ok]', m.el).onclick = m.close;
  }
  async function generate(tipe) {
    if (!(await U.confirm('Buat akun massal ' + tipe + '?', 'Sistem membuat akun untuk semua ' + tipe + ' aktif yang belum punya akun. Username memakai ' + (tipe === 'guru' ? 'NIP' : 'NIS') + '. Proses berjalan bertahap.', 'Buat akun'))) return;
    const t = U.toast('Membuat akun…', 'busy'), all = [];
    try { for (let n = 0; n < 40; n++) { const r = await API.call('users.generate', { tipe: tipe, limit: 40 }); all.push.apply(all, r.created); t.querySelector('span').textContent = 'Membuat akun… ' + all.length + ' selesai'; if (!r.remaining || !r.created.length) break; } }
    catch (e) { U.toast(e.message, 'err'); }
    t.kill(); if (all.length) { credModal(all, all.length + ' akun ' + tipe + ' dibuat'); } else U.toast('Semua ' + tipe + ' aktif sudah memiliki akun.', 'ok'); load();
  }
  async function add() {
    let siswa = [];
    const m = U.modal({ title: 'Tambah akun', body: '<form id="uF" autocomplete="off"><div class="form-grid"><div class="field"><label>Username *</label><input class="input" name="username" maxlength="60" placeholder="huruf kecil, angka, . - _" autocapitalize="none"></div><div class="field"><label>Peran *</label><select class="select" name="role">' + Object.keys(RL).map(function (k) { return '<option value="' + k + '">' + RL[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label>Nama lengkap *</label><input class="input" name="nama" maxlength="100"></div><div class="field full hide" id="uRef"><label id="uRefL">Tautkan ke data</label><select class="select" name="ref_id"></select><span class="small muted">Wajib agar akun terhubung ke data guru/siswa.</span></div></div><div id="uErr"></div></form>', foot: '<button class="btn secondary" data-no>Batal</button><button class="btn primary" data-ok>Buat akun</button>' });
    const f = $('#uF', m.el).elements;
    async function refSel() {
      const r = f.role.value, box = $('#uRef', m.el); box.classList.toggle('hide', r !== 'guru' && r !== 'siswa'); if (r === 'guru') { $('#uRefL', m.el).textContent = 'Tautkan ke guru'; f.ref_id.innerHTML = '<option value="">— pilih guru —</option>' + U.options(s.opts.guru, '', 'guru_id', function (g) { return g.nama; }); }
      if (r === 'siswa') { $('#uRefL', m.el).textContent = 'Tautkan ke siswa'; f.ref_id.innerHTML = '<option value="">memuat…</option>'; if (!siswa.length) { try { siswa = (await API.read('master.list', { entity: 'siswa' }, { ttl: 60000 })).data.rows; } catch (e) {} } f.ref_id.innerHTML = '<option value="">— pilih siswa —</option>' + U.options(siswa, '', 'siswa_id', function (x) { return x.nama + ' (' + App.kelas(x.kelas_id) + ')'; }); }
    }
    f.role.onchange = refSel; $('[data-no]', m.el).onclick = m.close;
    $('[data-ok]', m.el).onclick = async function () {
      const b = this; b.disabled = true;
      try { const r = await API.call('users.create', { username: f.username.value, nama: f.nama.value, role: f.role.value, ref_id: f.ref_id.value }); m.close(); credModal([r], 'Akun berhasil dibuat'); load(); }
      catch (e) { $('#uErr', m.el).innerHTML = '<div class="err-box">' + esc(e.message) + '</div>'; b.disabled = false; }
    };
  }
  $('#uAdd').onclick = add; $('#uGenG').onclick = function () { generate('guru'); }; $('#uGenS').onclick = function () { generate('siswa'); };
  $('#uQ').oninput = U.debounce(function () { term = this.value; page = 1; draw(); }, 200); $('#uR').onchange = function () { frole = this.value; page = 1; draw(); };
  $('#uBody').onclick = async function (e) {
    const pg = e.target.closest('[data-pg]'); if (pg) { page = +pg.dataset.pg; draw(); return; }
    const tr = e.target.closest('tr[data-u]'); if (!tr) return; const u = rows.filter(function (x) { return x.user_id === tr.dataset.u; })[0];
    if (e.target.closest('[data-rs]') && await U.confirm('Reset password?', 'Password baru dibuat untuk ' + u.username + '. Pengguna wajib menggantinya saat login berikutnya.', 'Reset')) { try { const r = await API.call('users.reset', { user_id: u.user_id }); credModal([r], 'Password baru'); load(); } catch (err) { U.toast(err.message, 'err'); } }
    else if (e.target.closest('[data-tg]')) { const to = u.status === 'aktif' ? 'nonaktif' : 'aktif'; if (to === 'nonaktif' && !(await U.confirm('Nonaktifkan akun?', u.username + ' tidak akan bisa login.', 'Nonaktifkan', true))) return; try { await API.call('users.update', { user_id: u.user_id, status: to }); U.toast('Status akun diperbarui.', 'ok'); load(); } catch (err) { U.toast(err.message, 'err'); } }
  };
  await load();
};

/* ====================================================================== */
/* PENGATURAN (admin)                                                     */
/* ====================================================================== */
App.pages.pengaturan = async function (view, q, live) {
  const { esc, icon, $ } = U;
  const s = App.s, st = s.settings;
  const F = function (k, l, hint, type) { return '<div class="field"><label for="st_' + k + '">' + l + '</label><input class="input" id="st_' + k + '" name="' + k + '" value="' + esc(st[k]) + '"' + (type ? ' type="' + type + '"' : '') + ' maxlength="200">' + (hint ? '<span class="small muted">' + hint + '</span>' : '') + '</div>'; };
  view.innerHTML = App.head(App.crumb('Pengaturan'), 'Pengaturan aplikasi', 'Identitas sekolah, aturan penilaian, dan jam pelajaran.', '<button class="btn primary" id="pSave">' + icon('save') + 'Simpan pengaturan</button>') +
    '<form id="pF" class="grid g2" onsubmit="return false" autocomplete="off"><div class="card pad"><h3 style="margin-bottom:12px">Identitas sekolah</h3>' + F('nama_sekolah', 'Nama sekolah') + F('nama_singkat', 'Nama singkat aplikasi', 'Tampil di pojok kiri atas.') + F('kepala_sekolah', 'Kepala sekolah') + F('alamat', 'Alamat') + '</div>' +
    '<div class="card pad"><h3 style="margin-bottom:12px">Aturan akademik</h3><div class="form-grid">' + F('kkm_default', 'KKM bawaan', 'Dipakai jika mapel belum punya KKM sendiri.', 'number') + F('min_kehadiran', 'Batas minimum kehadiran (%)', '', 'number') + F('batas_alfa', 'Batas alfa tanpa keterangan', 'Peringatan muncul 1× sebelum batas.', 'number') + '</div></div>' +
    '<div class="card pad"><h3 style="margin-bottom:12px">Jam pelajaran</h3><div class="form-grid">' + F('jp_mulai', 'Jam mulai JP 1', 'Format HH:MM', 'time') + F('jp_durasi', 'Durasi 1 JP (menit)', '', 'number') + '<div class="full">' + F('jp_istirahat', 'Istirahat', 'Format “JP:menit”, pisahkan koma. Contoh 3:15,6:60 = istirahat 15 menit setelah JP 3 dan 60 menit setelah JP 6.') + '</div></div><div id="jpPrev" class="small muted"></div></div>' +
    '<div class="card pad"><h3 style="margin-bottom:12px">Informasi sistem</h3><div id="sys" class="small muted">Memeriksa server…</div></div></form>' +
    '<div class="card" style="margin-top:var(--gap)"><div class="card-h"><div><h3>Log aktivitas</h3><p>200 aktivitas terakhir</p></div><button class="btn secondary sm" id="lBtn">Tampilkan</button></div><div class="card-b hide" id="lBody" style="padding-left:0;padding-right:0"></div></div>';
  function prev() {
    const tmp = Object.assign({}, App.s.settings, { jp_mulai: $('#st_jp_mulai').value || '07:30', jp_durasi: $('#st_jp_durasi').value || 45, jp_istirahat: $('#st_jp_istirahat').value }), old = App.s.settings; App.s.settings = tmp;
    let t = ''; for (let i = 1; i <= 10; i++) { const x = App.jp(i); t += 'JP ' + i + ': ' + App.hm(x.s) + '–' + App.hm(x.e) + (i < 10 ? ' · ' : ''); } App.s.settings = old; $('#jpPrev').textContent = t;
  }
  prev(); $('#pF').addEventListener('input', U.debounce(prev, 200));
  $('#pSave').onclick = async function () {
    const b = this, f = $('#pF').elements, v = {}; ['nama_sekolah', 'nama_singkat', 'kepala_sekolah', 'alamat', 'kkm_default', 'min_kehadiran', 'batas_alfa', 'jp_mulai', 'jp_durasi', 'jp_istirahat'].forEach(function (k) { v[k] = f[k].value; }); b.disabled = true;
    try { const r = await API.call('settings.save', { values: v }); App.setSettings(r.settings); API.forget('dashboard'); U.toast('Pengaturan disimpan.', 'ok'); const bn = document.querySelector('.brand b'); if (bn) bn.textContent = r.settings.nama_singkat; const bs = document.querySelector('.brand span'); if (bs) bs.textContent = r.settings.nama_sekolah; }
    catch (e) { U.toast(e.message, 'err'); } b.disabled = false;
  };
  $('#lBtn').onclick = async function () {
    const body = $('#lBody'); body.classList.remove('hide'); body.innerHTML = '<div style="padding:16px">' + U.skeleton(3) + '</div>'; this.remove();
    try { const r = await API.call('log.list', {}); body.innerHTML = '<div class="tbl-wrap" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Waktu</th><th>Aksi</th><th>Modul</th><th>Detail</th></tr></thead><tbody>' + r.rows.map(function (l) { return '<tr><td class="mono small">' + esc(l.waktu) + '</td><td>' + esc(l.aksi) + '</td><td>' + esc(l.modul) + '</td><td class="muted small">' + esc(l.detail) + '</td></tr>'; }).join('') + '</tbody></table></div>'; }
    catch (e) { body.innerHTML = U.empty('alert', 'Gagal memuat log', e.message); }
  };
  try { const t0 = performance.now(), r = await API.call('ping', {}); if (live()) $('#sys').innerHTML = '<div class="row between"><span>Versi backend</span><b>' + esc(r.version) + '</b></div><div class="row between"><span>Waktu server</span><b>' + esc(r.time) + '</b></div><div class="row between"><span>Waktu respons</span><b>' + Math.round(performance.now() - t0) + ' ms</b></div><div class="row between"><span>Tahun ajaran aktif</span><b>' + (s.ta ? esc(s.ta.tahun + ' ' + s.ta.semester) : 'belum diatur') + '</b></div>'; }
  catch (e) { if (live()) $('#sys').textContent = 'Tidak dapat terhubung: ' + e.message; }
};
