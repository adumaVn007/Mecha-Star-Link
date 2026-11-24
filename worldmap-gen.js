/* worldmap-gen.js — mô hình dữ liệu + bộ random bản đồ thế giới 300×600 cho Vân Giáp.
   Dùng chung cho worldmap-editor.html và script tạo database/worldmap.json.
   Dữ liệu: tiles = mảng W*H byte (mã địa hình), owner = mảng W*H byte (0 = vô chủ, 1/2/3 = quốc gia). */
(function (g) {
  var WM = g.WM = g.WM || {};
  WM.W = 300; WM.H = 600;
  /* Địa hình: ký tự dùng khi lưu JSON (mỗi hàng là 1 chuỗi dài W ký tự) */
  WM.TERRAIN = [
    { k: 'grass',  c: '.', name: 'Đồng cỏ',   col: '#527e68', block: 0 },
    { k: 'forest', c: 'f', name: 'Rừng',       col: '#315c4c', block: 0 },
    { k: 'water',  c: 'w', name: 'Nước',       col: '#315f76', block: 1 },
    { k: 'rock',   c: 'r', name: 'Núi đá',     col: '#777c78', block: 1 },
    { k: 'sand',   c: 's', name: 'Cát',        col: '#a99a6a', block: 0 },
    { k: 'snow',   c: 'n', name: 'Tuyết',      col: '#c9d8dc', block: 0 },
    { k: 'swamp',  c: 'm', name: 'Đầm lầy',    col: '#46604a', block: 0 },
    { k: 'road',   c: 'd', name: 'Đường',      col: '#9a8660', block: 0 },
    { k: 'ruin',   c: 'u', name: 'Phế tích',   col: '#9a825e', block: 0 },
    { k: 'herb',   c: 'h', name: 'Linh thảo',  col: '#6b9777', block: 0 }
  ];
  WM.COUNTRIES = [
    { id: 1, k: 'hi_thu',   name: 'Hi Thủ Quốc',   color: '#3a8dff', cn: 'Blue' },
    { id: 2, k: 'thien_do', name: 'Thiên Đô Quốc', color: '#f2c230', cn: 'Vàng' },
    { id: 3, k: 'di_luan',  name: 'Di Luân Quốc',  color: '#e0463c', cn: 'Đỏ' }
  ];
  /* Loại địa điểm (hiện chữ nổi trên bản đồ) */
  WM.KINDS = [
    { k: 'capital',  name: 'Kinh thành',  glyph: '👑' },
    { k: 'city',     name: 'Thành phố',   glyph: '🏯' },
    { k: 'fortress', name: 'Thành trì',   glyph: '🛡' },
    { k: 'sect',     name: 'Tông môn',    glyph: '⛩' },
    { k: 'cave',     name: 'Hang động',   glyph: '🕳' },
    { k: 'realm',    name: 'Bí cảnh',     glyph: '🌀' },
    { k: 'village',  name: 'Thôn làng',   glyph: '🏘' },
    { k: 'other',    name: 'Khác',        glyph: '📍' }
  ];
  /* Biểu tượng trang trí 2.5D (vẽ bằng canvas, có thể thay bằng ảnh qua công cụ Đồ họa) */
  WM.DECOS = [
    { k: 'tree',    name: 'Cây' },
    { k: 'pine',    name: 'Tùng' },
    { k: 'peak',    name: 'Đỉnh núi' },
    { k: 'boulder', name: 'Tảng đá' },
    { k: 'crystal', name: 'Linh thạch' },
    { k: 'pagoda',  name: 'Bảo tháp' },
    { k: 'tent',    name: 'Lều trại' },
    { k: 'ruinpil', name: 'Cột đổ' },
    { k: 'chest',   name: 'Rương' },
    { k: 'banner',  name: 'Cờ hiệu' },
    { k: 'lotus',   name: 'Sen' },
    { k: 'spring',  name: 'Linh tuyền' }
  ];
  WM.tIndex = {}; WM.TERRAIN.forEach(function (t, i) { WM.tIndex[t.k] = i; });
  WM.isBlocked = function (code) { return !!(WM.TERRAIN[code] && WM.TERRAIN[code].block); };

  /* RNG có seed (mulberry32) */
  WM.rng = function (seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  function hash(x, y, s) { var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2147483647); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s) { return vnoise(x / 40, y / 40, s) * .5 + vnoise(x / 20, y / 20, s + 1) * .3 + vnoise(x / 9, y / 9, s + 2) * .2; }

  WM.empty = function () {
    var n = WM.W * WM.H;
    return { v: 1, w: WM.W, h: WM.H, tiles: new Uint8Array(n), owner: new Uint8Array(n), places: [], decos: [], countries: WM.COUNTRIES.map(function (c) { return { id: c.id, name: c.name, color: c.color }; }), spawn: { x: 150, y: 300 } };
  };

  /* Rải icon trang trí 2.5D theo địa hình hiện có (không đè lên địa điểm) */
  WM.scatterDecos = function (m, R, seed) {
    var W = m.w, H = m.h, T = WM.tIndex, x, y, i, nd = 0; m.decos = [];
    var taken = {}; m.places.forEach(function (p) { for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) taken[(p.x + a) + ',' + (p.y + b)] = 1; });
    for (var tries = 0; tries < 9000 && nd < 2600; tries++) {
      x = Math.floor(R() * W); y = Math.floor(R() * H); i = y * W + x; var tc = m.tiles[i], dk = null;
      if (tc === T.forest) dk = R() < .5 ? 'tree' : 'pine';
      else if (tc === T.rock) dk = R() < .6 ? 'peak' : 'boulder';
      else if (tc === T.snow) dk = 'pine';
      else if (tc === T.swamp) dk = R() < .5 ? 'lotus' : 'tree';
      else if (tc === T.herb) dk = 'spring';
      else if (tc === T.grass && R() < .08) dk = R() < .5 ? 'tree' : 'crystal';
      else if (tc === T.ruin) dk = 'ruinpil';
      if (!dk || taken[x + ',' + y]) continue;
      taken[x + ',' + y] = 1; m.decos.push({ t: dk, x: x, y: y }); nd++;
    }
  };

  /* Random toàn bản đồ. Giữ nguyên các địa điểm do người dùng đặt nếu opts.keepPlaces. */
  WM.generate = function (seed, opts) {
    opts = opts || {};
    var W = WM.W, H = WM.H, m = WM.empty(), R = WM.rng(seed), T = WM.tIndex, i, x, y;
    var caps = [{ id: 1, x: 70, y: 130 }, { id: 2, x: 150, y: 300 }, { id: 3, x: 230, y: 470 }];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x;
      var edge = Math.min(x, y, W - 1 - x, H - 1 - y), n = fbm(x, y, seed), mo = fbm(x + 500, y + 500, seed + 7), mi = fbm(x + 90, y + 900, seed + 13);
      var t = T.grass;
      if (edge < 4 + Math.floor(hash(x, y, seed) * 3)) t = T.water;
      else if (n < .33) t = T.water;
      else if (n < .37) t = T.sand;
      else if (mo > .70) t = (y < 90 && mo > .72) ? T.snow : T.rock;
      else if (mi > .64 && n < .5) t = T.swamp;
      else if (fbm(x + 300, y + 40, seed + 21) > .60) t = T.forest;
      else if (hash(x, y, seed + 5) < .012) t = T.herb;
      m.tiles[i] = t;
    }
    /* Lãnh thổ: gần kinh thành nhất trong bán kính (méo bằng nhiễu để đường biên tự nhiên) */
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x; if (m.tiles[i] === T.water) continue;
      var best = 0, bd = 1e9;
      caps.forEach(function (c) { var dx = x - c.x, dy = (y - c.y) * .85, d = Math.sqrt(dx * dx + dy * dy) + (vnoise(x / 14, y / 14, seed + 77) - .5) * 26; if (d < bd) { bd = d; best = c.id; } });
      if (bd < 72) m.owner[i] = best;
    }
    function free(px, py, r, avoid) {
      for (var tries = 0; tries < 400; tries++) {
        var ax = Math.round(px + (R() * 2 - 1) * r), ay = Math.round(py + (R() * 2 - 1) * r);
        if (ax < 6 || ay < 6 || ax > W - 7 || ay > H - 7) continue;
        var tt = m.tiles[ay * W + ax]; if (tt === T.water || tt === T.rock || tt === T.snow) continue;
        var ok = true; for (var j = 0; j < m.places.length; j++) if (Math.abs(m.places[j].x - ax) + Math.abs(m.places[j].y - ay) < (avoid || 12)) { ok = false; break; }
        if (ok) return { x: ax, y: ay };
      }
      return null;
    }
    var seq = 0;
    function add(name, kind, pos, country, parent, desc) {
      if (!pos) return null;
      var p = { id: 'pl_' + (++seq), name: name, kind: kind, x: pos.x, y: pos.y, country: country || 0, parent: parent || '', desc: desc || '' };
      m.places.push(p); m.tiles[pos.y * W + pos.x] = (kind === 'cave' || kind === 'realm') ? m.tiles[pos.y * W + pos.x] : T.road; return p;
    }
    var NM = {
      1: { cap: 'Hi Thủ Kinh', city: ['Thanh Lam Thành', 'Bích Thủy Thành', 'Lăng Ba Thành', 'Tuyết Vân Thành'], fort: ['Hàn Phong Trì', 'Thủy Kính Trì', 'Lam Quan Trì', 'Băng Hà Trì'] },
      2: { cap: 'Thiên Đô Kinh', city: ['Kim Dương Thành', 'Hoàng Sa Thành', 'Long Môn Thành', 'Thiên Quang Thành'], fort: ['Kim Giáp Trì', 'Đồng Quan Trì', 'Nhật Chiếu Trì', 'Hổ Phù Trì'] },
      3: { cap: 'Di Luân Kinh', city: ['Xích Viêm Thành', 'Hỏa Vân Thành', 'Huyết Nguyệt Thành', 'Liệt Phong Thành'], fort: ['Hồng Liên Trì', 'Xích Thiết Trì', 'Phần Thiên Trì', 'Chu Tước Trì'] }
    };
    caps.forEach(function (c) {
      var cp = add(NM[c.id].cap, 'capital', { x: c.x, y: c.y }, c.id, '', 'Kinh đô của ' + WM.COUNTRIES[c.id - 1].name + '.');
      if (m.tiles[c.y * W + c.x] === T.water) m.tiles[c.y * W + c.x] = T.road;
      NM[c.id].city.forEach(function (n) { add(n, 'city', free(c.x, c.y, 55, 22), c.id, cp && cp.id); });
      NM[c.id].fort.forEach(function (n) { add(n, 'fortress', free(c.x, c.y, 62, 16), c.id, cp && cp.id); });
      for (var k = 0; k < 2; k++) add('Thôn ' + NM[c.id].city[k].split(' ')[0], 'village', free(c.x, c.y, 50, 8), c.id, cp && cp.id);
    });
    /* Tông môn / hang động / bí cảnh rải khắp bản đồ */
    var sects = ['Vân Tiêu Tông', 'Thái Hư Môn', 'Linh Cơ Các', 'Huyền Thiên Tông', 'Tinh Hà Điện', 'Cửu U Môn'];
    var caves = ['Hắc Phong Động', 'Bạch Cốt Động', 'Xà Mẫu Động', 'Lôi Quang Động', 'Địa Hỏa Động', 'U Minh Động', 'Hàn Băng Động'];
    var realms = ['Vân Mộng Bí Cảnh', 'Tinh Thần Bí Cảnh', 'Cổ Thần Di Tích', 'Hư Không Giới'];
    sects.forEach(function (n) { add(n, 'sect', free(R() * W, R() * H, 1, 30), 0, '', 'Tông môn tu luyện.'); });
    caves.forEach(function (n) { add(n, 'cave', free(R() * W, R() * H, 1, 24), 0, '', 'Hang động ẩn chứa cơ duyên và hiểm nguy.'); });
    realms.forEach(function (n) { add(n, 'realm', free(R() * W, R() * H, 1, 40), 0, '', 'Cổng bí cảnh phát ra ánh sáng xanh ngọc.'); });
    WM.scatterDecos(m, R, seed);
    m.spawn = { x: caps[1].x + 2, y: caps[1].y + 2 };
    m.seed = seed;
    return m;
  };

  /* ===== Lưu / đọc JSON gọn: mỗi hàng là chuỗi ký tự ===== */
  WM.toJSON = function (m) {
    var W = m.w, H = m.h, rows = [], own = [], x, y, ch = WM.TERRAIN.map(function (t) { return t.c; });
    for (y = 0; y < H; y++) {
      var a = '', b = '';
      for (x = 0; x < W; x++) { a += ch[m.tiles[y * W + x]] || '.'; b += m.owner[y * W + x]; }
      rows.push(a); own.push(b);
    }
    return { v: 1, note: 'Bản đồ thế giới 300×600 ô. Tạo/sửa bằng worldmap-editor.html. tiles[y] là hàng y (x chạy 0..299); ký tự địa hình xem terrainLegend; owner[y] là mã quốc gia (0 = vô chủ).',
      w: W, h: H, seed: m.seed || 0, spawn: m.spawn,
      terrainLegend: WM.TERRAIN.reduce(function (o, t) { o[t.c] = t.k; return o; }, {}),
      countries: m.countries, kinds: WM.KINDS.map(function (k) { return k.k; }),
      places: m.places, decos: m.decos.map(function (d) { return [d.t, d.x, d.y]; }),
      tiles: rows, owner: own };
  };
  WM.fromJSON = function (j) {
    if (!j || !j.tiles || !j.tiles.length) throw new Error('File không phải bản đồ hợp lệ');
    var W = j.w || WM.W, H = j.h || WM.H, m = WM.empty(), code = {}, x, y;
    WM.TERRAIN.forEach(function (t, i) { code[t.c] = i; });
    m.w = W; m.h = H; m.tiles = new Uint8Array(W * H); m.owner = new Uint8Array(W * H);
    for (y = 0; y < H; y++) { var a = j.tiles[y] || '', b = (j.owner && j.owner[y]) || ''; for (x = 0; x < W; x++) { m.tiles[y * W + x] = code[a[x]] || 0; m.owner[y * W + x] = +b[x] || 0; } }
    m.places = (j.places || []).map(function (p) { return Object.assign({ parent: '', country: 0, desc: '' }, p); });
    m.decos = (j.decos || []).map(function (d) { return Array.isArray(d) ? { t: d[0], x: d[1], y: d[2] } : d; });
    m.countries = j.countries || m.countries; m.spawn = j.spawn || m.spawn; m.seed = j.seed || 0;
    return m;
  };
})(typeof window != 'undefined' ? window : globalThis);
