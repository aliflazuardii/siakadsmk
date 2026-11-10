/* ==========================================================================
   APP — sesi, login, kerangka (sidebar/topbar), router hash, navigasi per peran
   Kecepatan: data awal datang dari SATU panggilan login/bootstrap, disimpan
   lokal, sehingga membuka ulang aplikasi langsung tampil (lalu disegarkan).
   ========================================================================== */
const App = (function () {
  const { esc, $, $$, icon } = U;
  const STORE = 'siakad.session.v1';
  const IDLE_MS = 60 * 60 * 1000;
  const ROLE_LABEL = { admin: 'Super Admin', kepsek: 'Kepala Sekolah', kurikulum: 'Waka Kurikulum', guru: 'Guru Mapel', siswa: 'Siswa' };
  const LEADERS = ['admin', 'kepsek', 'kurikulum'];

  const A = { s: null, pages: {}, route: { name: '', q: {} }, nav: [], navToken: 0, cleanup: null, idx: {} };

  // ---------- penyimpanan sesi lokal ----------
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ token: API.getToken(), s: A.s, t: Date.now() })); } catch (e) { /* mode privat */ }
  }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!o || !o.token || !o.s || Date.now() - o.t > IDLE_MS) return null;
      return o;
    } catch (e) { return null; }
  }
  function wipe() { try { localStorage.removeItem(STORE); } catch (e) {} API.forget(); A.s = null; API.setToken(null); }

  // ---------- indeks pencarian cepat ----------
  function reindex() {
    const o = A.s.opts, m = function (arr, k) { const r = {}; (arr || []).forEach(function (x) { r[x[k]] = x; }); return r; };
    A.idx = { kelas: m(o.kelas, 'kelas_id'), mapel: m(o.mapel, 'mapel_id'), guru: m(o.guru, 'guru_id'), ta: m(o.ta, 'ta_id') };
  }
  A.kelas = function (id) { const k = A.idx.kelas[id]; return k ? k.nama_kelas : '-'; };
  A.mapel = function (id) { const k = A.idx.mapel[id]; return k ? k.nama : '-'; };
  A.mapelKode = function (id) { const k = A.idx.mapel[id]; return k ? k.kode : '-'; };
  A.guru = function (id) { const k = A.idx.guru[id]; return k ? k.nama : '-'; };
  A.role = function () { return A.s.user.role; };
  A.isLeader = function () { return LEADERS.indexOf(A.s.user.role) >= 0; };
  A.can = function (list) { return list.indexOf(A.s.user.role) >= 0; };
  A.namaSekolah = function () { return (A.s && A.s.settings && A.s.settings.nama_sekolah) || 'Sekolah'; };

  // ---------- jam pelajaran ----------
  A.jp = function (n, hari) {
    const st = A.s.settings, tb = String((hari === 'Jumat' ? st.jp_tabel_jumat : st.jp_tabel_reguler) || '').split(',')[n - 1];
    const mt = tb && /^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(tb.trim());
    if (mt) return { s: +mt[1] * 60 + +mt[2], e: +mt[3] * 60 + +mt[4] };
    return A.jpHitung(n);
  };
  A.jpHitung = function (n) {
    const st = A.s.settings, mp = String(st.jp_mulai || '07:30').split(':'), dur = Number(st.jp_durasi) || 45;
    const brk = {}; String(st.jp_istirahat || '').split(',').forEach(function (x) { const p = x.split(':'); if (p.length === 2) brk[+p[0]] = +p[1]; });
    let t = (+mp[0]) * 60 + (+mp[1]), s = t, e = t;
    for (let i = 1; i <= n; i++) { s = t; e = t + dur; t = e + (brk[i] || 0); }
    return { s: s, e: e };
  };
  A.hm = function (min) { return U.pad(Math.floor(min / 60)) + '.' + U.pad(min % 60); };
  /** Kelompokkan JP berurutan (kelas+mapel sama) menjadi satu blok pelajaran. */
  A.blocks = function (jadwal, hari) {
    const rows = jadwal.filter(function (j) { return j.hari === hari; }).sort(function (a, b) { return a.jam_ke - b.jam_ke; });
    const out = [];
    rows.forEach(function (j) {
      const l = out[out.length - 1];
      if (l && l.kelas_id === j.kelas_id && l.mapel_id === j.mapel_id && l.guru_id === j.guru_id && l.to === j.jam_ke - 1) { l.to = j.jam_ke; }
      else out.push({ kelas_id: j.kelas_id, mapel_id: j.mapel_id, guru_id: j.guru_id, ruang: j.ruang, from: j.jam_ke, to: j.jam_ke });
    });
    out.forEach(function (b) { b.start = A.jp(b.from, hari).s; b.end = A.jp(b.to, hari).e; b.label = b.from === b.to ? String(b.from) : b.from + '-' + b.to; });
    return out;
  };

  // ---------- navigasi per peran ----------
  const NAV = {
    dashboard: ['Dashboard', 'dash'], nilai: ['Input Nilai', 'edit'], absensi: ['Absensi Siswa', 'usercheck'], jurnal: ['Jurnal Mengajar', 'book'],
    jadwal: ['Jadwal Pelajaran', 'clock'], kalender: ['Kalender Akademik', 'cal'], master: ['Data Master', 'box'], monitoring: ['Monitoring', 'chart'],
    users: ['Pengguna', 'users'], pengaturan: ['Pengaturan', 'sliders']
  };
  function navFor(role) {
    const base = {
      admin: ['dashboard', 'absensi', 'nilai', 'jurnal', 'jadwal', 'kalender', 'master', 'monitoring', 'users', 'pengaturan'],
      kepsek: ['dashboard', 'monitoring', 'nilai', 'absensi', 'jurnal', 'jadwal', 'kalender', 'master'],
      kurikulum: ['dashboard', 'monitoring', 'jadwal', 'nilai', 'absensi', 'jurnal', 'kalender', 'master'],
      guru: ['dashboard', 'nilai', 'absensi', 'jurnal', 'jadwal', 'kalender', 'master'],
      siswa: ['dashboard', 'nilai', 'absensi', 'jadwal', 'kalender']
    }[role] || ['dashboard'];
    return base.map(function (k) {
      let label = NAV[k][0];
      if (role === 'siswa' && k === 'nilai') label = 'Nilai Saya';
      if (role === 'siswa' && k === 'absensi') label = 'Kehadiran Saya';
      if (role === 'guru' && k === 'master') label = 'Data Siswa';
      if (k === 'nilai' && A.isLeaderRole(role)) label = 'Rekap Nilai';
      if (k === 'absensi' && A.isLeaderRole(role)) label = 'Rekap Absensi';
      return { key: k, label: label, ic: NAV[k][1] };
    });
  }
  A.isLeaderRole = function (r) { return LEADERS.indexOf(r) >= 0; };

  // ---------- tampilan: login & bantuan ----------
  const ROLE_HINTS = {
    all: {
      hint: 'Gunakan akun resmi (NISN, NIP, atau Username) yang diberikan oleh pihak sekolah.',
      placeholder: 'NISN / NIP / Username Akun'
    },
    siswa: {
      hint: '<b>Akun Siswa:</b> Masuk dengan <b>NIS</b> atau <b>NISN</b>. Password awal dibagikan oleh Wali Kelas Anda.',
      placeholder: 'Masukkan NIS atau NISN Siswa'
    },
    guru: {
      hint: '<b>Akun Guru & Tendik:</b> Masuk dengan <b>NIP</b> atau <b>Username</b> dari kurikulum/admin.',
      placeholder: 'Masukkan NIP atau Username Guru'
    },
    admin: {
      hint: '<b>Admin & Pimpinan:</b> Akses khusus Administrator, Kepala Sekolah, dan Waka Kurikulum.',
      placeholder: 'Masukkan Username Admin'
    }
  };

  function openLoginHelp() {
    U.modal({
      title: 'Panduan Akun & Bantuan Login SIAKAD',
      body:
        '<div class="grid" style="gap:10px">' +
          '<div class="guide-card">' +
            '<div class="guide-card-icon" style="background:#EFF6FF;color:#2563EB">' + icon('user') + '</div>' +
            '<div><div style="font-size:13.5px;font-weight:700;color:#0F172A">Akun Siswa</div>' +
            '<div style="font-size:12px;line-height:17px;color:#475569;margin-top:2px">' +
              'Username adalah <b>NIS</b> atau <b>NISN</b>. Bila lupa password atau belum menerima akun, silakan hubungi <b>Wali Kelas</b> Anda untuk reset.' +
            '</div></div>' +
          '</div>' +
          '<div class="guide-card">' +
            '<div class="guide-card-icon" style="background:#FFF7ED;color:#EA580C">' + icon('edit') + '</div>' +
            '<div><div style="font-size:13.5px;font-weight:700;color:#0F172A">Akun Guru & Tenaga Kependidikan</div>' +
            '<div style="font-size:12px;line-height:17px;color:#475569;margin-top:2px">' +
              'Username berupa <b>NIP</b> atau <b>Username</b> khusus yang didaftarkan. Untuk kendala akun, silakan hubungi <b>Waka Kurikulum</b> atau Administrator.' +
            '</div></div>' +
          '</div>' +
          '<div class="guide-card">' +
            '<div class="guide-card-icon" style="background:#F0FDF4;color:#16A34A">' + icon('shield') + '</div>' +
            '<div><div style="font-size:13.5px;font-weight:700;color:#0F172A">Akun Administrator & Pimpinan</div>' +
            '<div style="font-size:12px;line-height:17px;color:#475569;margin-top:2px">' +
              'Username bawaan: <code>admin</code>. Bila password admin lupa, buka editor Apps Script dan jalankan fungsi <code>resetAdminPassword</code>.' +
            '</div></div>' +
          '</div>' +
          '<div class="info-box" style="font-size:12px;line-height:18px">' +
            '<b>Catatan Keamanan:</b> Akun dengan password bawaan sekolah wajib membuat password baru saat login pertama demi menjaga kerahasiaan data nilai dan rapor.' +
          '</div>' +
        '</div>',
      foot: '<button class="btn primary block" data-x>Saya Mengerti</button>'
    });
  }

  function viewLogin(msg) {
    const name = window.SIAKAD_CONFIG.APP_NAME || 'SIAKAD SMK';
    const rememberedUser = (function () { try { return localStorage.getItem('siakad.remember_user') || ''; } catch (e) { return ''; } })();

    const featCards =
      '<div class="feat-card">' +
        '<div class="feat-icon">' + icon('edit') + '</div>' +
        '<div><div class="feat-title">E-Rapor & Penilaian</div><div class="feat-desc">Hitung otomatis formatif, sumatif, bobot akhir & cetak rapor instan.</div></div>' +
      '</div>' +
      '<div class="feat-card">' +
        '<div class="feat-icon">' + icon('usercheck') + '</div>' +
        '<div><div class="feat-title">Presensi Kelas Per JP</div><div class="feat-desc">Presensi cepat hitungan detik dengan rekap kehadiran otomatis.</div></div>' +
      '</div>' +
      '<div class="feat-card">' +
        '<div class="feat-icon">' + icon('book') + '</div>' +
        '<div><div class="feat-title">Jadwal & Jurnal Guru</div><div class="feat-desc">Monitoring ketercapaian materi terintegrasi kalender akademik.</div></div>' +
      '</div>' +
      '<div class="feat-card">' +
        '<div class="feat-icon">' + icon('cloud') + '</div>' +
        '<div><div class="feat-title">Database Cloud Aman</div><div class="feat-desc">Tersimpan aman di Google Cloud Sheets sekolah tanpa server lokal.</div></div>' +
      '</div>';

    $('#app').innerHTML =
      '<div class="login-wrap">' +
        '<!-- Hero / Showcase Kiri -->' +
        '<div class="login-hero">' +
          '<div class="login-orb orb-1"></div>' +
          '<div class="login-orb orb-2"></div>' +
          '<div class="hero-top">' +
            '<div class="hero-brand">' +
              '<div class="hero-brand-logo">' + icon('cap') + '</div>' +
              '<div class="hero-brand-text"><b>' + esc(name) + '</b><span>Portal Akademik Digital</span></div>' +
            '</div>' +
            '<div class="status-pill"><span class="status-dot"></span><span>Sistem Cloud Aktif</span></div>' +
          '</div>' +
          '<div class="hero-body">' +
            '<div class="hero-tag">' + icon('sparkle') + '<span>PLATFORM AKADEMIK TERPADU</span></div>' +
            '<h1>Administrasi Akademik SMK, Lebih Cerdas & Terstruktur.</h1>' +
            '<p>Kelola penilaian Kurikulum Merdeka, presensi siswa per jam pelajaran, jadwal otomatis, dan jurnal mengajar guru dalam satu platform yang ringan dan responsif.</p>' +
            '<div class="hero-features">' + featCards + '</div>' +
          '</div>' +
          '<div class="hero-foot">' +
            '<div class="hero-pills">' +
              '<span class="hero-pill">⚡ Super Cepat & Ringan</span>' +
              '<span class="hero-pill">📱 Multi-Device (HP & PC)</span>' +
              '<span class="hero-pill">🔒 Akses Berbasis Peran</span>' +
            '</div>' +
            '<div class="hero-note">' + icon('cloud') + '<span>Data tersimpan aman & tersinkronisasi langsung dengan Google Cloud sekolah.</span></div>' +
          '</div>' +
        '</div>' +

        '<!-- Form Login Kanan -->' +
        '<div class="login-form">' +
          '<!-- Brand Header Mobile -->' +
          '<div class="mobile-brand">' +
            '<div class="hero-brand-logo">' + icon('cap') + '</div>' +
            '<h2>' + esc(name) + '</h2>' +
            '<p>Portal Sistem Informasi Akademik SMK</p>' +
          '</div>' +

          '<form class="login-card" id="fLogin" autocomplete="on" novalidate>' +
            '<div class="card-header-badge">' + icon('lock') + '<span>Portal Masuk</span></div>' +
            '<h2>Masuk ke Akun</h2>' +
            '<p class="sub">Silakan pilih peran Anda atau masukkan kredensial akun akademik.</p>' +

            '<!-- Selector Peran Akun -->' +
            '<div class="role-pill-tabs" role="tablist" aria-label="Pilih jenis akun">' +
              '<button type="button" class="role-pill active" data-role="all">Semua</button>' +
              '<button type="button" class="role-pill" data-role="siswa">Siswa</button>' +
              '<button type="button" class="role-pill" data-role="guru">Guru</button>' +
              '<button type="button" class="role-pill" data-role="admin">Admin</button>' +
            '</div>' +
            '<div class="role-hint" id="roleHintBox">' + icon('info') + '<span id="roleHintText">' + ROLE_HINTS.all.hint + '</span></div>' +

            (msg ? '<div class="err-box" role="alert">' + esc(msg) + '</div>' : '') +
            '<div id="loginErr"></div>' +

            '<div class="field">' +
              '<label for="lu">Username / NISN / NIP</label>' +
              '<div class="input-with-icon">' +
                '<span class="input-icon">' + icon('user') + '</span>' +
                '<input class="input" id="lu" name="username" value="' + esc(rememberedUser) + '" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="' + esc(ROLE_HINTS.all.placeholder) + '" required>' +
              '</div>' +
            '</div>' +

            '<div class="field">' +
              '<label for="lp">Password</label>' +
              '<div class="input-with-icon pw">' +
                '<span class="input-icon">' + icon('lock') + '</span>' +
                '<input class="input" id="lp" name="password" type="password" autocomplete="current-password" placeholder="Masukkan password Anda" required>' +
                '<button type="button" class="eye" id="eye" aria-label="Tampilkan password">' + icon('eye') + '</button>' +
              '</div>' +
            '</div>' +

            '<div class="login-opts">' +
              '<label class="remember-me"><input type="checkbox" id="remUser"' + (rememberedUser ? ' checked' : '') + '><span>Ingat Saya</span></label>' +
              '<button type="button" class="forgot-btn" id="bForgot">Lupa password?</button>' +
            '</div>' +

            '<button class="login-submit-btn" id="bLogin" type="submit">' +
              '<span>Masuk ke Sistem</span>' + icon('arrowRight') +
            '</button>' +

            '<button type="button" class="login-help-btn" id="bHelpGuide">' +
              icon('help') + '<span>Panduan Format Akun & Bantuan Login</span>' +
            '</button>' +

            '<div class="login-footer-sec">' +
              '<span class="security-note">' + icon('shield') + 'Akses dilindungi standar keamanan sekolah</span>' +
            '</div>' +
          '</form>' +

          '<!-- Fitur Kolapsibel Khusus Mobile -->' +
          '<div class="mobile-features-sec">' +
            '<button type="button" class="mobile-feat-toggle" id="bToggleFeat">' +
              '<span class="row" style="gap:8px">' + icon('sparkle') + '<span>Keunggulan Layanan SIAKAD</span></span>' +
              icon('chev', 'chev') +
            '</button>' +
            '<div class="mobile-feat-content" id="mobileFeatBox">' + featCards + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Event Listeners
    $('#eye').onclick = function () {
      const p = $('#lp');
      p.type = p.type === 'password' ? 'text' : 'password';
    };

    $$('.role-pill').forEach(function (btn) {
      btn.onclick = function () {
        $$('.role-pill').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const role = btn.dataset.role || 'all';
        const info = ROLE_HINTS[role] || ROLE_HINTS.all;
        $('#roleHintText').innerHTML = info.hint;
        const inp = $('#lu');
        inp.placeholder = info.placeholder;
        inp.focus();
      };
    });

    $('#bForgot').onclick = openLoginHelp;
    $('#bHelpGuide').onclick = openLoginHelp;

    const bToggle = $('#bToggleFeat');
    if (bToggle) {
      bToggle.onclick = function () {
        bToggle.classList.toggle('open');
        $('#mobileFeatBox').classList.toggle('show');
      };
    }

    $('#fLogin').onsubmit = async function (e) {
      e.preventDefault();
      const u = $('#lu').value.trim(), p = $('#lp').value, b = $('#bLogin'), box = $('#loginErr');
      box.innerHTML = '';
      if (!u || !p) {
        box.innerHTML = '<div class="err-box" role="alert">Username dan password wajib diisi.</div>';
        return;
      }

      // Simpan preferensi "Ingat Saya"
      const rem = $('#remUser');
      try {
        if (rem && rem.checked) {
          localStorage.setItem('siakad.remember_user', u);
        } else {
          localStorage.removeItem('siakad.remember_user');
        }
      } catch (err) {}

      b.disabled = true;
      b.innerHTML = '<div class="spin sm" style="border-top-color:#fff;border-color:rgba(255,255,255,.4)"></div> Memverifikasi kredensial…';
      try {
        const r = await API.call('login', { username: u, password: p });
        API.setToken(r.token);
        if (r.must_change) {
          A.s = { user: r.user };
          viewForceChange(r.user);
          return;
        }
        A.s = r.boot;
        reindex();
        save();
        enter();
      } catch (err) {
        box.innerHTML = '<div class="err-box" role="alert">' + esc(err.message) + '</div>';
        b.disabled = false;
        b.innerHTML = '<span>Masuk ke Sistem</span>' + icon('arrowRight');
        $('#lp').select();
      }
    };

    hideSplash();
    setTimeout(function () {
      const f = $('#lu');
      if (f) {
        if (f.value) {
          const p = $('#lp');
          if (p) p.focus();
        } else {
          f.focus();
        }
      }
    }, 50);
  }

  function viewForceChange(user) {
    $('#app').innerHTML =
      '<div class="login-wrap" style="grid-template-columns:1fr;background:#FAFBFD">' +
        '<div class="login-form">' +
          '<form class="login-card" id="fPw" style="max-width:440px">' +
            '<div class="card-header-badge">' + icon('shield') + '<span>Pembaruan Keamanan</span></div>' +
            '<div class="row" style="gap:12px;margin-bottom:12px">' +
              '<div class="hero-brand-logo" style="width:42px;height:42px">' + icon('key') + '</div>' +
              '<div><h2 style="font-size:20px;line-height:24px">Buat Password Baru</h2><span class="small muted">Wajib untuk login perdana</span></div>' +
            '</div>' +
            '<p class="sub">Halo, <b>' + esc(user.nama) + '</b>. Demi keamanan akun Anda, silakan ganti password awal sebelum melanjutkan ke sistem.</p>' +
            '<div id="pwErr"></div>' +
            pwFields() +
            '<button class="login-submit-btn" id="bPw" type="submit" style="margin-top:16px">' +
              '<span>Simpan Password & Masuk</span>' + icon('arrowRight') +
            '</button>' +
            '<button class="btn ghost block" type="button" id="bOut" style="margin-top:8px">Batal & Keluar</button>' +
          '</form>' +
        '</div>' +
      '</div>';

    $('#bOut').onclick = logout;
    $('#fPw').onsubmit = async function (e) {
      e.preventDefault();
      const b = $('#bPw');
      b.disabled = true;
      b.innerHTML = '<div class="spin sm" style="border-top-color:#fff;border-color:rgba(255,255,255,.4)"></div> Menyimpan…';
      try {
        const r = await submitPw($('#fPw'));
        A.s = r.boot;
        reindex();
        save();
        enter();
      } catch (err) {
        $('#pwErr').innerHTML = '<div class="err-box" role="alert">' + esc(err.message) + '</div>';
        b.disabled = false;
        b.innerHTML = '<span>Simpan Password & Masuk</span>' + icon('arrowRight');
      }
    };
  }

  A.togglePw = function (btn) {
    const inp = btn.parentElement ? btn.parentElement.querySelector('input') : null;
    if (inp) {
      inp.type = inp.type === 'password' ? 'text' : 'password';
    }
  };

  function pwFields() {
    return '<div class="field"><label>Password lama (awal)</label><div class="input-with-icon pw"><span class="input-icon">' + icon('key') + '</span><input class="input" name="old" type="password" autocomplete="current-password" placeholder="Password lama Anda" required><button type="button" class="eye" onclick="App.togglePw(this)" aria-label="Tampilkan password">' + icon('eye') + '</button></div></div>' +
      '<div class="field"><label>Password baru</label><div class="input-with-icon pw"><span class="input-icon">' + icon('lock') + '</span><input class="input" name="n1" type="password" autocomplete="new-password" minlength="8" placeholder="Minimal 8 karakter" required><button type="button" class="eye" onclick="App.togglePw(this)" aria-label="Tampilkan password">' + icon('eye') + '</button></div><span class="small muted" style="margin-top:2px">Minimal 8 karakter, kombinasi huruf dan angka.</span></div>' +
      '<div class="field"><label>Ulangi password baru</label><div class="input-with-icon pw"><span class="input-icon">' + icon('lock') + '</span><input class="input" name="n2" type="password" autocomplete="new-password" placeholder="Ulangi password baru" required><button type="button" class="eye" onclick="App.togglePw(this)" aria-label="Tampilkan password">' + icon('eye') + '</button></div></div>';
  }
  async function submitPw(form) {
    const f = form.elements, n1 = f.n1.value;
    if (n1 !== f.n2.value) throw new Error('Pengulangan password tidak sama.');
    return API.call('changePassword', { old: f.old.value, new: n1 });
  }
  function openChangePw() {
    const m = U.modal({ title: 'Ganti password', body: '<form id="fPw2" class="" autocomplete="off"><div id="pwErr2"></div>' + pwFields() + '</form>', foot: '<button class="btn secondary" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>' });
    $('[data-no]', m.el).onclick = m.close;
    $('[data-ok]', m.el).onclick = async function () {
      const b = this; b.disabled = true;
      try { const r = await submitPw($('#fPw2', m.el)); A.s = r.boot; reindex(); save(); m.close(); U.toast('Password berhasil diganti.', 'ok'); }
      catch (err) { $('#pwErr2', m.el).innerHTML = '<div class="err-box" role="alert">' + esc(err.message) + '</div>'; b.disabled = false; }
    };
  }

  async function logout() {
    try { if (API.getToken()) API.call('logout', {}).catch(function () {}); } catch (e) {}
    wipe(); location.hash = ''; viewLogin();
  }

  // ---------- tampilan: kerangka ----------
  function enter() {
    A.nav = navFor(A.s.user.role);
    document.title = (A.s.settings.nama_singkat || 'SIAKAD') + ' — ' + A.namaSekolah();
    shell();
    window.removeEventListener('hashchange', onHash); window.addEventListener('hashchange', onHash);
    if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/dashboard'; else onHash();
    hideSplash();
  }

  function shell() {
    const u = A.s.user, st = A.s.settings, ta = A.s.ta;
    const nav = A.nav.map(function (n) { return '<a href="#/' + n.key + '" data-nav="' + n.key + '">' + icon(n.ic) + '<span>' + esc(n.label) + '</span></a>'; }).join('');
    const bottom = A.nav.slice(0, 4).map(function (n) { return '<a href="#/' + n.key + '" data-nav="' + n.key + '">' + icon(n.ic) + '<span>' + esc(n.label.split(' ')[0]) + '</span></a>'; }).join('') +
      '<button id="bMenu">' + icon('menu') + '<span>Menu</span></button>';
    $('#app').innerHTML =
      '<aside class="sidebar" id="side"><div class="brand"><div class="logo-mark">' + icon('cap') + '</div><div><b>' + esc(st.nama_singkat || 'SIAKAD') + '</b><span>' + esc(st.nama_sekolah) + '</span></div></div>' +
      '<div class="sem-chip"><span>Semester</span><b>' + (ta ? esc(ta.tahun + ' ' + ta.semester) : 'Belum diatur') + '</b></div>' +
      '<nav class="nav" aria-label="Menu utama">' + nav + '</nav>' +
      '<div class="side-foot"><div class="sync" id="sync">' + icon('cloud') + '<div><div style="font-weight:600">Sync Cloud</div><div class="st" id="syncSt">Terhubung aktif</div></div></div></div></aside>' +
      '<div class="scrim" id="scrim"></div>' +
      '<div class="main"><div id="offline" class="offline-bar hide">Anda sedang offline. Perubahan akan gagal disimpan sampai koneksi kembali.</div>' +
      '<header class="topbar"><button class="icon-btn hamb" id="hamb" aria-label="Buka menu">' + icon('menu') + '</button>' +
      '<div class="search"><span aria-hidden="true">' + icon('search') + '</span><input id="gs" type="search" placeholder="Cari siswa, kelas, atau menu…" autocomplete="off" aria-label="Pencarian"><div class="search-res hide" id="gsRes"></div></div><div class="grow"></div>' +
      '<span class="role-chip">' + esc(ROLE_LABEL[u.role] || u.role) + '</span>' +
      '<div style="position:relative"><button class="user-btn" id="uBtn" aria-haspopup="true"><span class="avatar">' + esc(U.initials(u.nama)) + '</span><span class="who"><b style="display:block;font-size:13px;line-height:16px">' + esc(u.nama) + '</b><span class="small muted">' + esc(u.username) + '</span></span>' + icon('chev') + '</button>' +
      '<div class="menu-pop hide" id="uMenu"><button data-m="pw">' + icon('key') + 'Ganti password</button><button data-m="out">' + icon('out') + 'Keluar</button></div></div></header>' +
      '<main class="content" id="view" tabindex="-1"></main></div><nav class="bottom-bar" aria-label="Menu cepat">' + bottom + '</nav>';

    $('#hamb').onclick = function () { document.body.classList.add('drawer'); };
    $('#bMenu').onclick = function () { document.body.classList.add('drawer'); };
    $('#scrim').onclick = function () { document.body.classList.remove('drawer'); };
    $$('.sidebar a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('drawer'); }); });
    $('#uBtn').onclick = function (e) { e.stopPropagation(); $('#uMenu').classList.toggle('hide'); };
    document.addEventListener('click', function (e) { const m = $('#uMenu'); if (m && !m.contains(e.target)) m.classList.add('hide'); const r = $('#gsRes'); if (r && !e.target.closest('.search')) r.classList.add('hide'); });
    $('#uMenu').onclick = function (e) { const b = e.target.closest('[data-m]'); if (!b) return; $('#uMenu').classList.add('hide'); if (b.dataset.m === 'out') logout(); else openChangePw(); };
    bindSearch();
    window.addEventListener('online', netState); window.addEventListener('offline', netState); netState();
  }
  function netState() { const o = $('#offline'); if (o) o.classList.toggle('hide', navigator.onLine !== false); const s = $('#sync'); if (s) { s.classList.toggle('off', navigator.onLine === false); $('#syncSt').textContent = navigator.onLine === false ? 'Offline' : 'Terhubung aktif'; } }

  // ---------- pencarian global ----------
  function bindSearch() {
    const inp = $('#gs'), res = $('#gsRes'); let siswa = null, loading = false;
    async function ensureSiswa() {
      if (siswa || loading || !A.can(['admin', 'kepsek', 'kurikulum', 'guru'])) return;
      loading = true; try { const r = await API.read('master.list', { entity: 'siswa' }, { ttl: 120000 }); siswa = r.data.rows; } catch (e) { siswa = []; } loading = false;
    }
    inp.addEventListener('focus', ensureSiswa);
    inp.addEventListener('input', U.debounce(function () {
      const q = inp.value.trim().toLowerCase(); if (q.length < 2) { res.classList.add('hide'); return; }
      const out = [];
      A.nav.forEach(function (n) { if (n.label.toLowerCase().indexOf(q) >= 0) out.push({ t: 'Menu', l: n.label, go: '#/' + n.key }); });
      (A.s.opts.kelas || []).forEach(function (k) { if (k.nama_kelas.toLowerCase().indexOf(q) >= 0) out.push({ t: 'Kelas', l: k.nama_kelas, go: '#/absensi?kelas=' + k.kelas_id }); });
      (A.s.opts.mapel || []).forEach(function (m) { if ((m.nama + ' ' + m.kode).toLowerCase().indexOf(q) >= 0) out.push({ t: 'Mapel', l: m.nama, go: '#/nilai?mapel=' + m.mapel_id }); });
      (siswa || []).forEach(function (s) { if (out.length < 14 && (s.nama + ' ' + s.nis + ' ' + s.nisn).toLowerCase().indexOf(q) >= 0) out.push({ t: 'Siswa', l: s.nama + ' — ' + s.nis, sub: A.kelas(s.kelas_id), go: '#/nilai?kelas=' + s.kelas_id }); });
      res.innerHTML = out.length ? out.slice(0, 12).map(function (o, i) { return '<button data-i="' + i + '"><b>' + esc(o.l) + '</b> <span class="small muted">' + esc(o.t) + (o.sub ? ' · ' + esc(o.sub) : '') + '</span></button>'; }).join('') : '<div class="empty small">Tidak ada hasil untuk “' + esc(q) + '”.</div>';
      res.classList.remove('hide'); res._out = out;
    }, 180));
    res.addEventListener('click', function (e) { const b = e.target.closest('button'); if (!b) return; const o = res._out[+b.dataset.i]; res.classList.add('hide'); inp.value = ''; location.hash = o.go; });
  }

  // ---------- router ----------
  function parseHash() {
    const h = (location.hash || '#/dashboard').slice(2), i = h.indexOf('?'), name = (i < 0 ? h : h.slice(0, i)) || 'dashboard', q = {};
    if (i >= 0) h.slice(i + 1).split('&').forEach(function (p) { const kv = p.split('='); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); });
    return { name: name, q: q };
  }
  function onHash() {
    if (!A.s || !A.s.opts) return;
    const r = parseHash();
    if (!A.nav.some(function (n) { return n.key === r.name; })) { location.hash = '#/dashboard'; return; }
    A.route = r; A.navToken++;
    if (typeof A.cleanup === 'function') { try { A.cleanup(); } catch (e) {} } A.cleanup = null;
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === r.name); });
    const view = $('#view'); if (!view) return;
    view.innerHTML = '<div class="grid" style="gap:12px">' + U.skeleton(3) + '</div>';
    window.scrollTo(0, 0);
    const page = A.pages[r.name];
    if (!page) { view.innerHTML = U.empty('tool', 'Halaman belum tersedia', ''); return; }
    const tok = A.navToken;
    try {
      const out = page(view, r.q, function () { return tok === A.navToken; });
      if (out && typeof out.then === 'function') out.catch(function (e) { if (tok === A.navToken) view.innerHTML = '<div class="card pad">' + U.empty('alert', 'Gagal memuat halaman', e.message) + '<div class="center"><button class="btn secondary" onclick="location.reload()">Muat ulang</button></div></div>'; });
      else if (typeof out === 'function') A.cleanup = out;
    } catch (e) { view.innerHTML = '<div class="card pad">' + U.empty('alert', 'Terjadi kesalahan', e.message) + '</div>'; }
  }
  A.go = function (hash) { if (location.hash === hash) onHash(); else location.hash = hash; };
  A.reload = function () { onHash(); };

  // ---------- data & status ----------
  A.touchDash = function () { if (A.s) { A.s.dash = null; save(); } API.forget('dashboard'); };
  A.setSettings = function (s) { A.s.settings = s; save(); };
  A.patchOpts = function (key, rows) { A.s.opts[key] = rows; reindex(); save(); };
  A.refreshBoot = async function () {
    const b = await API.call('bootstrap', {}); A.s = b; reindex(); save(); return b;
  };
  A.head = function (crumb, title, sub, actions) {
    return '<div class="page-head"><div><div class="crumb">' + crumb + '</div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' + (actions ? '<div class="row wrap no-print">' + actions + '</div>' : '') + '</div>';
  };
  A.crumb = function (cur) { return 'Akademik / <b>' + esc(cur) + '</b>'; };

  function hideSplash() { const s = $('#splash'); if (s) { s.classList.add('gone'); setTimeout(function () { s.remove(); }, 300); } }

  // ---------- mulai ----------
  A.start = function () {
    API.onAuthLost(function (m) { wipe(); viewLogin(m || 'Sesi berakhir. Silakan login kembali.'); });
    API.onBusy(function (b) {
      const s = $('#sync'), t = $('#syncSt'); if (!s || !t || navigator.onLine === false) return;
      s.classList.toggle('busy', b); t.textContent = b ? 'Menyinkronkan…' : 'Terhubung aktif';
    });
    if (!API.configured()) {
      $('#app').innerHTML = '<div class="login-form" style="min-height:100vh"><div class="login-card"><div class="logo-mark" style="margin-bottom:16px">' + icon('tool') + '</div><h2>Konfigurasi belum lengkap</h2>' +
        '<p class="sub">Alamat server belum diisi. Buka berkas <b>js/config.js</b>, lalu tempel URL Web App Google Apps Script (berakhiran <span class="cred">/exec</span>) pada <span class="cred">GAS_URL</span>.</p><p class="small muted">Panduan lengkap ada di PANDUAN-INSTALASI.md.</p></div></div>';
      hideSplash(); return;
    }
    API.prewarm();
    const o = load();
    if (o) {
      // tampil instan dari data tersimpan, lalu segarkan di belakang layar
      API.setToken(o.token); A.s = o.s; if (!A.s.opts) { wipe(); viewLogin(); return; }
      reindex(); enter();
      API.call('bootstrap', {}).then(function (b) { A.s = b; reindex(); save(); const wasDash = A.route.name === 'dashboard'; if (wasDash) onHash(); }).catch(function () {});
    } else viewLogin();
  };
  A.logout = logout; A.save = save; A.ROLE_LABEL = ROLE_LABEL;
  return A;
})();
