/* vg-core.js — module dùng chung cho index.html (bản đồ) và battle.html (chiến đấu).
   Không đổi vg-github.js. Dùng chung 1 bản lưu: localStorage 'vg_save_v1'. */
(function (g) {
  var VG = g.VG = g.VG || {}, GM = VG.game = {};
  var KEY = 'vg_save_v1', mem = null;
  GM.MAXR = 48;
  var GR = ['Hoàng Giai', 'Huyền Giai', 'Địa Giai', 'Thiên Giai'], PH = ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ'];
  GM.RK = []; GM.RS = [];
  GR.forEach(function (gr) { PH.forEach(function (p) { GM.RK.push(gr + ' ' + p); GM.RS.push(gr.split(' ')[0] + ' ' + p.split(' ')[0]); }); });
  for (var t = 1; t <= 12; t++) PH.forEach(function (p) { GM.RK.push('Thánh Giai Tầng ' + t + ' ' + p); GM.RS.push('Thánh T' + t + ' ' + p.split(' ')[0]); });
  GM.RK.push('Thần Giai'); GM.RS.push('Thần Giai');
  GM.rankName = function (i) { return GM.RK[i] || ('Cảnh giới ' + i); };
  GM.rankShort = function (i) { return GM.RS[i] || ('Cảnh giới ' + i); };
  GM.need = function (lv) { return 60 + (lv - 12) * 30; };
  GM.rnd = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  GM.ri = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  GM.fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
  GM.defaults = function (zone) {
    var sp = (zone && zone.spawn) || { x: 8, y: 8 };
    return { v: 1,
      p: { lv: 12, xp: 0, hp: 400, max: 400, atk: 40, en: 100, enMax: 100, reg: 8, soul: 100, soulMax: 100, sh: 120, shMax: 120, gear: true, spd: 600 },
      items: { cell: 3, tonic: 3, nano: 3, shcell: 2 },
      stones: { thuong: 0, trung: 0, cao: 0, sieu: 0 },
      auto: true, pos: { x: sp.x, y: sp.y }, zone: zone ? zone.id : '', events: [], day: 1, kills: 0, cleared: 0,
      pending: null, result: null, log: [] };
  };
  function store() { try { var s = g.localStorage; s.setItem('__t', '1'); s.removeItem('__t'); return s; } catch (e) { try { return g.sessionStorage; } catch (e2) { return null; } } }
  GM.load = function (zone) {
    var d = GM.defaults(zone), s = store(), o = null;
    if (g.__VG_EMBED) o = g.__VG_STATE || null; else
    try { var raw = s && s.getItem(KEY); if (raw) o = JSON.parse(raw); } catch (e) {}
    if (!o && mem) o = mem;
    if (!o || typeof o !== 'object') return d;
    ['p', 'items', 'stones', 'pos'].forEach(function (k) { o[k] = Object.assign({}, d[k], o[k] || {}); });
    return Object.assign(d, o);
  };
  /* ===== Lưu bền: localStorage chính + bản dự phòng (trạng thái liền trước) + IndexedDB. Không mất khi cập nhật code/game. ===== */
  var BAK = 'vg_save_bak', IDB = 'vg_db', idbT = 0;
  GM.SV = 2;
  function idb(fn) {
    return new Promise(function (res) {
      try {
        var q = g.indexedDB.open(IDB, 1);
        q.onupgradeneeded = function () { q.result.createObjectStore('s'); };
        q.onerror = function () { res(null); };
        q.onsuccess = function () { var db = q.result; try { fn(db, function (v) { db.close(); res(v); }); } catch (e) { db.close(); res(null); } };
      } catch (e) { res(null); }
    });
  }
  function idbPut(txt) { clearTimeout(idbT); idbT = setTimeout(function () { idb(function (db, done) { var t = db.transaction('s', 'readwrite'); t.objectStore('s').put(txt, KEY); t.oncomplete = function () { done(1); }; t.onerror = function () { done(null); }; }); }, 400); }
  function ok(txt) { try { var o = JSON.parse(txt); return o && typeof o === 'object' && o.p && o.pos ? txt : null; } catch (e) { return null; } }
  GM.save = function (st) {
    mem = st; if (g.__VG_EMBED) { try { g.parent.postMessage({ vgsave: st }, '*'); } catch (e) {} return true; }
    st.sv = GM.SV;
    var s = store();
    try {
      if (s) {
        var cur = JSON.stringify(st), prev = s.getItem(KEY);
        if (prev && prev !== cur && ok(prev)) s.setItem(BAK, prev);
        s.setItem(KEY, cur); idbPut(cur); return true;
      }
    } catch (e) {}
    try { idbPut(JSON.stringify(st)); } catch (e2) {}
    return false;
  };
  /* Gọi 1 lần lúc khởi động (trước GM.load): nếu bản chính mất/hỏng thì khôi phục từ bản dự phòng hoặc IndexedDB. */
  GM.restore = function () {
    if (g.__VG_EMBED) return Promise.resolve('embed');
    try { if (g.navigator && navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    var s = store(); if (!s) return Promise.resolve('nostore');
    var main = null, bak = null;
    try { main = ok(s.getItem(KEY)); bak = ok(s.getItem(BAK)); } catch (e) {}
    if (main) { idbPut(main); return Promise.resolve('main'); }
    if (bak) { try { s.setItem(KEY, bak); } catch (e) {} return Promise.resolve('bak'); }
    return idb(function (db, done) { var r = db.transaction('s').objectStore('s').get(KEY); r.onsuccess = function () { done(r.result || null); }; r.onerror = function () { done(null); }; })
      .then(function (txt) { if (txt && ok(txt)) { try { s.setItem(KEY, txt); } catch (e) {} return 'idb'; } return 'none'; });
  };
  GM.setSave = function (st) { /* nạp bản save từ file */ st.sv = GM.SV; return GM.save(st); };
  GM.reset = function () {
    mem = null; clearTimeout(idbT);
    if (g.__VG_EMBED) { try { g.parent.postMessage({ vgsave: null }, '*'); } catch (e) {} return Promise.resolve(); }
    var s = store(); try { if (s) { s.removeItem(KEY); s.removeItem(BAK); } } catch (e) {}
    return idb(function (db, done) { var t = db.transaction('s', 'readwrite'); t.objectStore('s').delete(KEY); t.oncomplete = function () { done(1); }; t.onerror = function () { done(null); }; });
  };
  /* Dữ liệu: ưu tiên cùng thư mục (Cloudflare/GitHub Pages), sau đó raw GitHub. */
  function getJSON(path) {
    if (g.__VG_DATA && g.__VG_DATA[path]) return Promise.resolve(g.__VG_DATA[path]);
    return fetch(path + '?t=' + Date.now()).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { return VG.fetchJSON ? VG.fetchJSON(path) : null; });
  }
  GM.loadWorld = function () {
    return getJSON('database/world-events.json').then(function (w) {
      if (!w || !w.events || !w.zones || !w.zones.length) throw new Error('Không đọc được database/world-events.json');
      return w;
    });
  };
  GM.loadLib = function () { return getJSON('database/mecha-studio.json').catch(function () { return null; }); };
  /* ===== Quái vật mở rộng (MỚI): database/monsters.json, trộn vào w.monsters theo id (trùng id = ghi đè). =====
     Quái cũ trong world-events.json giữ nguyên. Trường mới: rank 0-48, kind 'monster'|'boss', terrain[], weight, roam, img, bossMap{x,y,roam,respawnDays,respawnKills,tier}. */
  GM.monRank = function (m) { var r = m && (m.rank != null ? m.rank : m.lv); r = +r; return isFinite(r) ? Math.max(0, Math.min(GM.MAXR, Math.round(r))) : 0; };
  GM.monFoot = function (m) { return GM.monRank(m) >= GM.MAXR ? 1 : 0; };            /* bán kính ô: Thần Giai chiếm 3×3 ô */
  GM.monScale = function (m) { var r = GM.monRank(m); return r >= GM.MAXR ? 4 : 0.8 + 0.025 * r; };  /* bậc càng cao càng to */
  /* Angry 0-100: độ hung dữ (di chuyển nhiều hơn, truy đuổi nhanh hơn, tầm phát hiện rộng hơn). */
  GM.monAngry = function (m) { var a = +(m && m.angry); return isFinite(a) ? Math.max(0, Math.min(100, a)) : 0; };
  /* Phạm vi tấn công (ô): m.range nếu có, mặc định theo bậc: Hoàng-Thiên giai 1, Thánh giai 2, Thần giai 5-10 (theo Angry). */
  GM.monRange = function (m) {
    var v = +(m && m.range);
    if (isFinite(v) && v > 0) return Math.max(1, Math.min(20, Math.round(v)));
    var r = GM.monRank(m);
    if (r >= GM.MAXR) return 5 + Math.round(GM.monAngry(m) / 20);
    return r >= 12 ? 2 : 1;
  };
  GM.loadMonsters = function (w) {
    return getJSON('database/monsters.json').catch(function () { return null; }).then(function (j) {
      if (!w) return w;
      w.monsters = w.monsters || [];
      var list = j && Array.isArray(j.monsters) ? j.monsters : [];
      list.forEach(function (m) {
        if (!m || !m.id || !m.name) return;
        if (!(+m.hp > 0) || !(+m.atk > 0) || !(+m.spd > 0)) return;           /* chưa nhập chỉ số cơ bản -> chưa vào game */
        var o = { id: String(m.id), name: String(m.name), shape: m.shape || 'wolf', rank: GM.monRank(m), hp: +m.hp, atk: +m.atk, spd: +m.spd, sh: +m.sh || 0,
          boss: m.kind === 'boss', weight: +m.weight > 0 ? +m.weight : 1, terrain: Array.isArray(m.terrain) ? m.terrain : [], roam: m.roam !== false,
          img: typeof m.img === 'string' && m.img.indexOf('data:image') === 0 ? m.img : '', desc: m.desc || '', xp: +m.xp || 0, angry: GM.monAngry(m), range: +m.range > 0 ? +m.range : 0, bossMap: m.bossMap || null };
        var i = -1; w.monsters.forEach(function (v, k) { if (v.id === o.id) i = k; });
        if (i >= 0) w.monsters[i] = o; else w.monsters.push(o);
      });
      return w;
    });
  };
  GM.nav = function (page) { if (g.__VG_EMBED) g.parent.postMessage({ vggo: page }, '*'); else g.location.href = page; };
})(typeof window != 'undefined' ? window : globalThis);
