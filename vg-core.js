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
      auto: false, pos: { x: sp.x, y: sp.y }, zone: zone ? zone.id : '', events: [], day: 1, kills: 0, cleared: 0,
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
  GM.save = function (st) {
    mem = st; if (g.__VG_EMBED) { try { g.parent.postMessage({ vgsave: st }, '*'); } catch (e) {} return true; }
    var s = store();
    try { if (s) { s.setItem(KEY, JSON.stringify(st)); return true; } } catch (e) {}
    return false;
  };
  GM.reset = function () { mem = null; if (g.__VG_EMBED) { try { g.parent.postMessage({ vgsave: null }, '*'); } catch (e) {} return; } var s = store(); try { if (s) s.removeItem(KEY); } catch (e) {} };
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
  GM.nav = function (page) { if (g.__VG_EMBED) g.parent.postMessage({ vggo: page }, '*'); else g.location.href = page; };
})(typeof window != 'undefined' ? window : globalThis);
