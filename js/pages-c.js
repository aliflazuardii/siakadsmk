/* ==========================================================================
   Administrasi guru & Materi pelajaran
   - Guru (dan pimpinan yang mengajar): simpan perangkat ajar berupa berkas / tautan
   - Pimpinan & admin: pantau kelengkapan perangkat ajar tiap guru
   - Siswa: halaman "Materi Pelajaran" (berkas yang dibagikan guru ke kelasnya)
   ========================================================================== */
(function () {
  const { esc, icon, $ } = U;

  function fmtSize(b) { b = Number(b) || 0; return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function ext(n) { const m = /\.([A-Za-z0-9]+)$/.exec(n || ''); return m ? m[1].toLowerCase() : ''; }
  function tile(r) {
    const e = ext(r.file_nama), map = { pdf: ['PDF', 'bad'], doc: ['DOC', 'info'], docx: ['DOC', 'info'], xls: ['XLS', 'ok'], xlsx: ['XLS', 'ok'], csv: ['CSV', 'ok'], ppt: ['PPT', 'warn'], pptx: ['PPT', 'warn'], jpg: ['IMG', 'pri'], jpeg: ['IMG', 'pri'], png: ['IMG', 'pri'], txt: ['TXT', 'gray'] };
    const t = r.ada_file ? (map[e] || [e.toUpperCase().slice(0, 4) || 'FILE', 'gray']) : ['LINK', 'pri'];
    return '<div class="ftile ' + t[1] + '">' + esc(t[0]) + '</div>';
  }
  function ymd(r) { return U.fmtDate(String(r.diubah || r.dibuat || '').slice(0, 10)); }

  /** Unduh berkas: isi diambil dari server (hak akses diperiksa di sana) lalu disimpan lewat browser. */
  async function unduh(r) {
    const t = U.toast('Menyiapkan berkas…', 'busy');
    try {
      const f = await API.call('adm.file', { id: r.adm_id });
      const bin = atob(f.base64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: f.tipe || 'application/octet-stream' }));
      const a = document.createElement('a'); a.href = url; a.download = f.nama || 'berkas'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    } catch (e) { U.toast(e.message, 'err'); } finally { if (t) t.kill(); }
  }
  function toBase64(file) {
    return new Promise(function (res, rej) {
      const fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(',')[1] || ''); };
      fr.onerror = function () { rej(new Error('Berkas tidak dapat dibaca.')); };
      fr.readAsDataURL(file);
    });
  }

  function card(r, opt) {
    const mk = r.mapel_id ? App.mapel(r.mapel_id) : '', kl = r.kelas_id ? App.kelas(r.kelas_id) : '';
    return '<div class="adm-card" data-a="' + esc(r.adm_id) + '">' +
      '<div class="adm-top">' + tile(r) + '<div class="grow"><b class="adm-title">' + esc(r.judul) + '</b><div class="small muted">' + esc(r.kategori) + (mk ? ' · ' + esc(mk) : '') + (kl ? ' · ' + esc(kl) : '') + '</div></div></div>' +
      (r.deskripsi ? '<p class="small adm-desc">' + esc(r.deskripsi) + '</p>' : '') +
      '<div class="adm-meta small muted">' + (r.ada_file ? esc(r.file_nama) + ' · ' + fmtSize(r.file_ukuran) + ' · ' : '') + (opt.guru ? esc(App.guru(r.guru_id)) + ' · ' : '') + ymd(r) + '</div>' +
      '<div class="row wrap adm-act">' +
        (String(r.bagikan) === '1' && opt.badge ? '<span class="badge ok">Dibagikan ke siswa</span>' : '') +
        '<span class="grow"></span>' +
        (r.ada_file ? '<button class="btn secondary sm" data-dl>' + icon('dl') + 'Unduh</button>' : '') +
        (r.link ? '<a class="btn secondary sm" href="' + esc(r.link) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + 'Buka tautan</a>' : '') +
        (r.can_edit ? '<button class="btn ghost sm" data-ed aria-label="Ubah">' + icon('pen') + '</button><button class="btn ghost sm" data-del aria-label="Hapus">' + icon('trash') + '</button>' : '') +
      '</div></div>';
  }

  /* ---------------- Guru / pimpinan yang mengajar: berkas saya ---------------- */
  async function berkasSaya(box, live, onChanged) {
    const s = App.s, role = s.user.role, leader = App.isLeader();
    const seen = {}, ptn = s.opts.penugasan.filter(function (p) { return role === 'guru' || p.guru_id === s.user.ref_id; }).filter(function (p) { const k = p.mapel_id + '|' + p.kelas_id; if (seen[k]) return false; seen[k] = 1; return true; });
    let data = null, fk = '', fm = '', fq = '';
    box.innerHTML = '<div id="aCheck"></div><div class="card"><div class="filters"><div class="field"><label for="aK">Kategori</label><select class="select" id="aK"><option value="">Semua kategori</option></select></div>' +
      '<div class="field"><label for="aM">Mata pelajaran</label><select class="select" id="aM"><option value="">Semua</option>' + U.options(Object.keys(ptn.reduce(function (o, p) { o[p.mapel_id] = 1; return o; }, {})).map(function (id) { return { id: id }; }), '', 'id', function (x) { return App.mapel(x.id); }) + '</select></div>' +
      '<div class="field" style="grid-column:span 2"><label for="aQ">Cari</label><input class="input" id="aQ" placeholder="Cari judul atau nama berkas…"></div></div><div class="card-b" id="aList">' + U.skeleton(2) + '</div></div>';

    async function load() {
      try {
        const r = await API.call('adm.list', { saya: leader, kategori: fk, mapel_id: fm, q: fq });
        if (!live()) return; data = r;
        if (!$('#aK').dataset.f) { $('#aK').innerHTML = '<option value="">Semua kategori</option>' + r.kategori.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join(''); $('#aK').dataset.f = '1'; $('#aK').value = fk; }
        drawCheck(); drawList();
      } catch (e) { if (live()) $('#aList').innerHTML = U.empty('alert', 'Gagal memuat', e.message); }
    }
    function drawCheck() {
      const c = data.lengkap; if (!c) { $('#aCheck').innerHTML = ''; return; }
      $('#aCheck').innerHTML = '<div class="card pad adm-check"><div class="row between wrap"><div><b>Kelengkapan perangkat ajar semester ini</b><div class="small muted">' + c.ada + ' dari ' + c.total + ' perangkat inti sudah diunggah</div></div><span class="badge ' + (c.persen === 100 ? 'ok' : c.persen >= 60 ? 'warn' : 'bad') + '">' + c.persen + '%</span></div>' +
        '<div class="bar ' + (c.persen === 100 ? 'ok' : c.persen >= 60 ? 'warn' : 'bad') + '" style="margin:10px 0"><i style="width:' + c.persen + '%"></i></div>' +
        '<div class="row wrap" style="gap:6px">' + data.wajib.map(function (k) { const n = c.per_kategori[k] || 0; return '<button class="chip ' + (n ? 'ok' : '') + '" data-k="' + esc(k) + '">' + (n ? icon('check') : icon('plus')) + esc(k) + (n ? ' (' + n + ')' : '') + '</button>'; }).join('') + '</div></div>';
    }
    function drawList() {
      $('#aList').innerHTML = data.rows.length ? '<div class="adm-grid">' + data.rows.map(function (r) { return card(r, { badge: true }); }).join('') + '</div>' :
        U.empty('file', 'Belum ada berkas', 'Klik "Tambah berkas" untuk menyimpan modul ajar, materi, soal, dan perangkat ajar lainnya.');
    }
    function form(r, kat) {
      const ed = !!r, cur = ed ? (r.mapel_id + '|' + r.kelas_id) : '|';
      const m = U.modal({ title: ed ? 'Ubah berkas' : 'Tambah berkas', size: 'lg', body: '<form id="aF"><div class="form-grid">' +
        '<div class="field"><label>Kategori</label><select class="select" name="kategori">' + data.kategori.map(function (k) { return '<option' + ((ed ? r.kategori : kat) === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Judul</label><input class="input" name="judul" maxlength="120" value="' + esc(ed ? r.judul : '') + '" placeholder="Contoh: Modul Ajar Bab 1 — Basis Data" required></div>' +
        '<div class="field full"><label>Mata pelajaran & kelas <span class="muted">(opsional)</span></label><select class="select" name="mk"><option value="|">— Umum / tidak terkait kelas —</option>' + ptn.map(function (p) { const v = p.mapel_id + '|' + p.kelas_id; return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(App.mapel(p.mapel_id) + ' — ' + App.kelas(p.kelas_id)) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field full"><label>Keterangan <span class="muted">(opsional)</span></label><textarea class="textarea" name="deskripsi" maxlength="500" style="min-height:56px">' + esc(ed ? r.deskripsi : '') + '</textarea></div>' +
        '<div class="field full"><label>Berkas <span class="muted">(maks. ' + data.max_mb + ' MB: ' + data.ext.join(', ') + ')</span></label>' + (ed && r.ada_file ? '<div class="info-box small" style="margin-bottom:6px">Berkas saat ini: <b>' + esc(r.file_nama) + '</b> (' + fmtSize(r.file_ukuran) + '). Pilih berkas baru untuk menggantinya.<label class="remember-me" style="margin-top:6px"><input type="checkbox" name="hapus_file"> Hapus berkas ini</label></div>' : '') + '<input class="input" type="file" name="berkas" accept=".' + data.ext.join(',.') + '" style="height:auto;padding:8px"></div>' +
        '<div class="field full"><label>atau Tautan <span class="muted">(Google Drive / YouTube untuk berkas besar)</span></label><input class="input" name="link" type="url" maxlength="500" value="' + esc(ed ? r.link : '') + '" placeholder="https://…"></div>' +
        '<div class="field full"><label class="remember-me"><input type="checkbox" name="bagikan"' + (ed && String(r.bagikan) === '1' ? ' checked' : '') + '><span>Bagikan ke siswa kelas ini sebagai <b>Materi Pelajaran</b> (wajib pilih mapel & kelas)</span></label></div>' +
        '</div><div id="aErr"></div></form>', foot: '<button class="btn secondary" data-no>Batal</button><button class="btn primary" data-ok>' + icon('save') + 'Simpan</button>' });
      const f = $('#aF', m.el);
      $('[data-no]', m.el).onclick = m.close;
      $('[data-ok]', m.el).onclick = async function () {
        const b = this, e = f.elements, err = $('#aErr', m.el); err.innerHTML = '';
        const file = e.berkas.files[0], mk = e.mk.value.split('|');
        if (file && file.size > data.max_mb * 1048576) { err.innerHTML = '<div class="err-box">Ukuran berkas maksimal ' + data.max_mb + ' MB. Untuk berkas besar, unggah ke Google Drive lalu tempel tautannya.</div>'; return; }
        b.disabled = true; const old = b.innerHTML; b.innerHTML = '<div class="spin sm" style="border-top-color:#fff;border-color:rgba(255,255,255,.4)"></div> ' + (file ? 'Mengunggah…' : 'Menyimpan…');
        try {
          const payload = { adm_id: ed ? r.adm_id : '', kategori: e.kategori.value, judul: e.judul.value, deskripsi: e.deskripsi.value, mapel_id: mk[0], kelas_id: mk[1], link: e.link.value.trim(), bagikan: e.bagikan.checked, hapus_file: !!(e.hapus_file && e.hapus_file.checked) };
          if (file) payload.file = { nama: file.name, base64: await toBase64(file) };
          await API.call('adm.save', payload); m.close(); U.toast('Berkas tersimpan.', 'ok'); load(); if (onChanged) onChanged();
        } catch (x) { err.innerHTML = '<div class="err-box">' + esc(x.message) + '</div>'; b.disabled = false; b.innerHTML = old; }
      };
    }
    box.onclick = async function (e) {
      const chip = e.target.closest('[data-k]'); if (chip) { const has = chip.classList.contains('ok'); if (has) { fk = chip.dataset.k; $('#aK').value = fk; load(); } else form(null, chip.dataset.k); return; }
      const c = e.target.closest('.adm-card'); if (!c) return;
      const r = data.rows.filter(function (x) { return x.adm_id === c.dataset.a; })[0]; if (!r) return;
      if (e.target.closest('[data-dl]')) unduh(r);
      else if (e.target.closest('[data-ed]')) form(r);
      else if (e.target.closest('[data-del]') && await U.confirm('Hapus berkas?', '"' + r.judul + '" akan dihapus permanen, termasuk dari Materi Pelajaran siswa.', 'Hapus', true)) {
        try { await API.call('adm.delete', { id: r.adm_id }); U.toast('Berkas dihapus.', 'ok'); load(); if (onChanged) onChanged(); } catch (x) { U.toast(x.message, 'err'); }
      }
    };
    $('#aK').onchange = function () { fk = this.value; load(); };
    $('#aM').onchange = function () { fm = this.value; load(); };
    $('#aQ').oninput = U.debounce(function () { fq = this.value.trim(); load(); }, 300);
    await load();
    return { add: function () { if (data) form(null, ''); } };
  }

  /* ---------------- Pimpinan / admin: kelengkapan semua guru ---------------- */
  async function pantau(box, live) {
    box.innerHTML = U.skeleton(3);
    const r = await API.call('adm.checklist', {}); if (!live()) return;
    const belum = r.rows.filter(function (x) { return x.persen < 100; }).length;
    box.innerHTML = '<div class="mini-stats m3">' +
      '<div class="mini"><div class="ico">' + icon('chart') + '</div><div><b>' + r.rata + '%</b><span class="small muted">Rata-rata kelengkapan</span></div></div>' +
      '<div class="mini"><div class="ico ok">' + icon('checks') + '</div><div><b>' + r.lengkap + '</b><span class="small muted">Guru lengkap</span></div></div>' +
      '<div class="mini"><div class="ico warn">' + icon('alert') + '</div><div><b>' + belum + '</b><span class="small muted">Belum lengkap</span></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Kelengkapan perangkat ajar per guru</h3><p>Perangkat inti: ' + esc(r.wajib.join(', ')) + '. Diurutkan dari yang paling belum lengkap.</p></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Guru</th><th>Perangkat inti</th><th>Kelengkapan</th><th>Berkas</th><th>Terakhir</th><th></th></tr></thead><tbody>' +
      (r.rows.length ? r.rows.map(function (g) {
        return '<tr data-g="' + esc(g.guru_id) + '"><td><b>' + esc(g.nama) + '</b></td><td><div class="row wrap" style="gap:4px">' + r.wajib.map(function (k) { return '<span class="badge ' + (g.per_kategori[k] ? 'ok' : 'gray') + '" title="' + esc(k) + '">' + esc(k) + '</span>'; }).join('') + '</div></td>' +
          '<td style="min-width:120px"><div class="row" style="gap:8px"><div class="bar grow ' + (g.persen === 100 ? 'ok' : g.persen >= 60 ? 'warn' : 'bad') + '"><i style="width:' + g.persen + '%"></i></div><b class="mono">' + g.persen + '%</b></div></td>' +
          '<td class="num">' + g.jumlah + '</td><td class="small muted">' + (g.terakhir ? U.fmtDate(g.terakhir.slice(0, 10)) : '-') + '</td><td class="right"><button class="btn secondary sm" data-lihat>' + icon('eye') + 'Lihat</button></td></tr>';
      }).join('') : '<tr><td colspan="6">' + U.empty('users', 'Belum ada guru dengan penugasan', 'Atur penugasan guru di Data Master.') + '</td></tr>') + '</tbody></table></div></div>';
    box.onclick = async function (e) {
      const tr = e.target.closest('tr[data-g]'); if (!tr || !e.target.closest('[data-lihat]')) return;
      const g = r.rows.filter(function (x) { return x.guru_id === tr.dataset.g; })[0];
      const m = U.modal({ title: 'Berkas — ' + g.nama, size: 'lg', body: '<div id="gB">' + U.skeleton(2) + '</div>', foot: '<button class="btn secondary" data-no>Tutup</button>' });
      $('[data-no]', m.el).onclick = m.close;
      try {
        const d = await API.call('adm.list', { guru_id: g.guru_id });
        $('#gB', m.el).innerHTML = d.rows.length ? '<div class="adm-grid">' + d.rows.map(function (x) { return card(x, {}); }).join('') + '</div>' : U.empty('file', 'Belum ada berkas', g.nama + ' belum mengunggah perangkat ajar.');
        $('#gB', m.el).onclick = function (ev) { const c = ev.target.closest('.adm-card'); if (c && ev.target.closest('[data-dl]')) unduh(d.rows.filter(function (x) { return x.adm_id === c.dataset.a; })[0]); };
      } catch (x) { $('#gB', m.el).innerHTML = U.empty('alert', 'Gagal memuat', x.message); }
    };
  }

  App.pages.administrasi = async function (view, q, live) {
    const s = App.s, leader = App.isLeader(), hasOwn = !!s.user.ref_id && s.user.role !== 'admin';
    const mode = { v: (leader && !hasOwn) ? 'pantau' : 'saya' };
    const showTabs = leader && hasOwn;
    view.innerHTML = App.head(App.crumb('Administrasi'), leader && !hasOwn ? 'Administrasi guru' : 'Administrasi guru', leader && !hasOwn ? 'Pantau kelengkapan perangkat ajar setiap guru.' : 'Simpan perangkat ajar dan materi pelajaran dengan rapi.',
      '<button class="btn primary" id="aAdd" ' + (mode.v === 'pantau' ? 'style="display:none"' : '') + '>' + icon('plus') + 'Tambah berkas</button>') +
      (showTabs ? '<div class="tabs"><button class="on" data-t="saya">Berkas saya</button><button data-t="pantau">Kelengkapan semua guru</button></div>' : '') + '<div id="aBox"></div>';
    let api = null;
    async function show() {
      $('#aAdd').style.display = mode.v === 'saya' ? '' : 'none';
      try { if (mode.v === 'saya') api = await berkasSaya($('#aBox'), live); else await pantau($('#aBox'), live); }
      catch (e) { if (live()) $('#aBox').innerHTML = '<div class="card pad">' + U.empty('alert', 'Gagal memuat', e.message) + '</div>'; }
    }
    $('#aAdd').onclick = function () { if (api) api.add(); };
    const tabs = $('.tabs', view); if (tabs) tabs.onclick = function (e) { const b = e.target.closest('[data-t]'); if (!b) return; mode.v = b.dataset.t; U.$$('button', tabs).forEach(function (x) { x.classList.toggle('on', x === b); }); show(); };
    await show();
  };

  /* ---------------- Siswa: Materi Pelajaran ---------------- */
  App.pages.materi = async function (view, q, live) {
    view.innerHTML = App.head(App.crumb('Materi'), 'Materi pelajaran', 'Berkas dan tautan yang dibagikan guru untuk kelas Anda.',
      '') + '<div class="card"><div class="filters"><div class="field"><label for="mM">Mata pelajaran</label><select class="select" id="mM"><option value="">Semua</option></select></div><div class="field" style="grid-column:span 2"><label for="mQ">Cari</label><input class="input" id="mQ" placeholder="Cari judul materi…"></div></div><div class="card-b" id="mList">' + U.skeleton(2) + '</div></div>';
    let rows = [], fm = '', fq = '';
    function draw() {
      const part = rows.filter(function (r) { return (!fm || r.mapel_id === fm) && (!fq || (r.judul + ' ' + r.deskripsi).toLowerCase().indexOf(fq) >= 0); });
      $('#mList').innerHTML = part.length ? '<div class="adm-grid">' + part.map(function (r) { return card(r, { guru: true }); }).join('') + '</div>' : U.empty('book', rows.length ? 'Tidak ada hasil' : 'Belum ada materi', rows.length ? 'Coba ubah filter pencarian.' : 'Guru belum membagikan materi untuk kelas Anda.');
    }
    try {
      const r = await API.call('adm.list', {}); if (!live()) return; rows = r.rows;
      const ids = []; rows.forEach(function (x) { if (x.mapel_id && ids.indexOf(x.mapel_id) < 0) ids.push(x.mapel_id); });
      $('#mM').innerHTML = '<option value="">Semua</option>' + ids.map(function (id) { return '<option value="' + esc(id) + '">' + esc(App.mapel(id)) + '</option>'; }).join('');
      draw();
    } catch (e) { $('#mList').innerHTML = U.empty('alert', 'Gagal memuat materi', e.message); }
    $('#mM').onchange = function () { fm = this.value; draw(); };
    $('#mQ').oninput = U.debounce(function () { fq = this.value.trim().toLowerCase(); draw(); }, 200);
    $('#mList').onclick = function (e) { const c = e.target.closest('.adm-card'); if (c && e.target.closest('[data-dl]')) unduh(rows.filter(function (x) { return x.adm_id === c.dataset.a; })[0]); };
  };
})();
