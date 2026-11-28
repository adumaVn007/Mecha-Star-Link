/* vg-combat-scene.js — nền chiến đấu theo địa hình cho Vân Giáp (dùng chung battle.html và EditPlayoutCombat.html).
   Chỉ tạo chuỗi SVG nền (400×210), không đụng dữ liệu game. Cấu hình ghi đè lưu ở database/combat-ui.json:
   { v:1, scenes:{ <khóa địa hình>:{name,style,tone,sky1,sky2,mt1,mt2,ground,glow,img} } }.
   Khóa địa hình = mã địa hình của worldmap (grass forest water rock sand snow swamp road ruin herb wall) + 'city' (gần thành trì). */
(function (g) {
  var VG = g.VG = g.VG || {}, CS = VG.combatScene = {};
  CS.STYLES = [['hills', 'Đồi thấp'], ['mountains', 'Núi đá'], ['snowpeaks', 'Núi tuyết'], ['forest', 'Rừng'], ['sea', 'Mặt nước / bãi biển'], ['dunes', 'Cồn cát'], ['swamp', 'Đầm lầy'], ['ruins', 'Phế tích'], ['walls', 'Tường thành'], ['city', 'Thành trì'], ['none', 'Chỉ nền (không cảnh xa)']];
  CS.TONES = [['light', 'Nền sáng (mecha/dị thú màu tối)'], ['dark', 'Nền tối (mecha/dị thú màu sáng)']];
  CS.ORDER = ['grass', 'forest', 'water', 'rock', 'sand', 'snow', 'swamp', 'road', 'ruin', 'herb', 'wall', 'city'];
  function D(name, style, tone, sky1, sky2, mt1, mt2, ground, glow) { return { name: name, style: style, tone: tone, sky1: sky1, sky2: sky2, mt1: mt1, mt2: mt2, ground: ground, glow: glow || '', img: '' }; }
  CS.DEFAULTS = {
    grass: D('Đồng bằng', 'hills', 'light', '#eef0e4', '#cdd9d0', '#a9bdb0', '#86a295', '#7fa27f'),
    forest: D('Rừng', 'forest', 'light', '#e1ebdd', '#bcd0bf', '#7ba58b', '#4f7f64', '#4b7357'),
    water: D('Mặt nước', 'sea', 'light', '#e6f1f5', '#bcd8e2', '#86b8cc', '#5f9bb4', '#6aa5bb'),
    rock: D('Núi đá', 'mountains', 'light', '#e6e7e1', '#c4c7c3', '#a0a5a0', '#7a7f7a', '#6f746f'),
    sand: D('Bãi biển / cát', 'sea', 'light', '#f6efd6', '#d4e6e6', '#8dc0d0', '#68a4bc', '#dcc995'),
    snow: D('Tuyết sơn', 'snowpeaks', 'light', '#ecf2f6', '#d0dee8', '#b6c9d6', '#93aebf', '#eef4f7'),
    swamp: D('Đầm lầy', 'swamp', 'dark', '#3b4a43', '#263530', '#46604f', '#33493b', '#2c3f33'),
    road: D('Đường mòn', 'hills', 'light', '#f0ead8', '#d3d9c9', '#b2bda5', '#92a284', '#b49e72'),
    ruin: D('Phế tích', 'ruins', 'light', '#eee5d0', '#d4c6a6', '#b9a984', '#9a8960', '#8a7a55'),
    herb: D('Linh thảo', 'hills', 'light', '#e8f4ec', '#bfe1cc', '#8cc4a4', '#69a984', '#5f9a74', '#b6ffe0'),
    wall: D('Tường thành', 'walls', 'light', '#e8e5dc', '#cbc6b6', '#a59c84', '#8a7f62', '#7d7459'),
    city: D('Thành trì', 'city', 'light', '#f3ead4', '#dccca8', '#bba27c', '#9a7d52', '#8d7752')
  };
  var COL = /^#[0-9a-fA-F]{6}$/;
  function sh(hex, k) { var n = parseInt(hex.slice(1), 16), f = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); }; return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return ('0' + f(v).toString(16)).slice(-2); }).join(''); }
  function P(pts, fill, ex) { return '<polygon points="' + pts + '" fill="' + fill + '"' + (ex || '') + '/>'; }
  function PA(d, fill, ex) { return '<path d="' + d + '" fill="' + fill + '"' + (ex || '') + '/>'; }
  function R(x, y, w, h, fill) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>'; }
  var STYLE = {
    none: function () { return ''; },
    hills: function (c) { return PA('M0 130 Q60 92 130 118 T260 110 T400 104 V210 H0Z', c.mt1) + PA('M0 156 Q80 122 170 146 T320 138 T400 134 V210 H0Z', c.mt2); },
    mountains: function (c) { return P('0,120 50,70 95,105 150,55 215,110 270,60 330,100 400,65 400,210 0,210', c.mt1) + P('0,150 60,110 120,140 190,100 260,145 330,115 400,140 400,210 0,210', c.mt2); },
    snowpeaks: function (c) {
      var s = P('0,125 45,55 85,100 140,35 200,110 260,45 320,95 365,60 400,100 400,210 0,210', c.mt1);
      [[45, 55], [140, 35], [260, 45], [365, 60]].forEach(function (p) { s += P((p[0] - 11) + ',' + (p[1] + 16) + ' ' + p[0] + ',' + p[1] + ' ' + (p[0] + 11) + ',' + (p[1] + 16) + ' ' + (p[0] + 5) + ',' + (p[1] + 12) + ' ' + p[0] + ',' + (p[1] + 18) + ' ' + (p[0] - 5) + ',' + (p[1] + 12), '#ffffff', ' opacity=".9"'); });
      return s + P('0,158 70,108 130,142 200,112 270,150 340,114 400,146 400,210 0,210', c.mt2);
    },
    forest: function (c) {
      var s = PA('M0 138 Q100 120 200 134 T400 128 V210 H0Z', c.mt1), i, x, h, d = sh(c.mt1, .85);
      for (i = 0; i < 19; i++) { x = i * 22 + 6; h = 24 + (i * 37) % 12; s += P((x - 9) + ',136 ' + x + ',' + (136 - h) + ' ' + (x + 9) + ',136', d); }
      s += PA('M0 160 Q120 148 240 158 T400 154 V210 H0Z', c.mt2);
      for (i = 0; i < 14; i++) { x = i * 31 + 4; h = 34 + (i * 53) % 16; s += P((x - 13) + ',160 ' + x + ',' + (160 - h) + ' ' + (x + 13) + ',160', c.mt2) + P((x - 9) + ',' + (160 - h * .45) + ' ' + x + ',' + (160 - h - 8) + ' ' + (x + 9) + ',' + (160 - h * .45), sh(c.mt2, .85)); }
      return s;
    },
    sea: function (c) {
      var s = R(0, 118, 400, 92, c.mt1), y, k, w;
      [128, 140, 153].forEach(function (y0) { w = 'M0 ' + y0; for (k = 0; k < 16; k++) w += (k ? ' t25 0' : ' q12.5 -4 25 0'); s += PA(w, 'none', ' stroke="' + c.mt2 + '" stroke-width="1.6" opacity=".85"'); });
      s += P('240,118 275,98 318,118', c.mt2, ' opacity=".55"') + R(0, 150, 400, 60, sh(c.mt2, 1)).replace('/>', ' opacity=".4"/>');
      return s;
    },
    dunes: function (c) { return PA('M0 136 Q70 96 150 126 T300 116 T400 121 V210 H0Z', c.mt1) + PA('M0 160 Q90 122 190 152 T400 142 V210 H0Z', c.mt2); },
    swamp: function (c) {
      var s = PA('M0 138 Q90 122 180 136 T400 130 V210 H0Z', c.mt1) + PA('M0 160 Q100 148 210 158 T400 152 V210 H0Z', c.mt2), i, x, h, d = sh(c.mt2, .65);
      for (i = 0; i < 14; i++) { x = 14 + i * 29; h = 14 + (i * 7) % 10; s += '<path d="M' + x + ' 168 L' + (x + 2) + ' ' + (168 - h) + '" stroke="' + d + '" stroke-width="2" fill="none"/><ellipse cx="' + (x + 2) + '" cy="' + (166 - h) + '" rx="2.2" ry="5" fill="' + d + '"/>'; }
      return s + '<ellipse cx="120" cy="150" rx="110" ry="9" fill="' + c.sky1 + '" opacity=".3"/><ellipse cx="300" cy="158" rx="100" ry="8" fill="' + c.sky1 + '" opacity=".3"/>';
    },
    ruins: function (c) {
      var s = PA('M0 140 Q100 124 200 138 T400 132 V210 H0Z', c.mt1), d = sh(c.mt1, .82), d2 = sh(c.mt2, .8), t;
      [60, 150, 250, 340].forEach(function (x) { t = 96 + (x * 7) % 24; s += P((x - 6) + ',146 ' + (x - 6) + ',' + (t + 8) + ' ' + (x - 1) + ',' + t + ' ' + (x + 2) + ',' + (t + 6) + ' ' + (x + 6) + ',' + (t + 2) + ' ' + (x + 6) + ',146', d); });
      s += PA('M0 160 Q110 146 220 158 T400 152 V210 H0Z', c.mt2);
      [95, 305].forEach(function (x) { t = 118 + (x % 9); s += P((x - 9) + ',164 ' + (x - 9) + ',' + (t + 10) + ' ' + (x - 2) + ',' + t + ' ' + (x + 3) + ',' + (t + 8) + ' ' + (x + 9) + ',' + (t + 3) + ' ' + (x + 9) + ',164', d2); });
      return s + R(188, 158, 26, 8, d2);
    },
    walls: function (c) {
      var s = R(0, 106, 400, 44, c.mt1), i, d = sh(c.mt1, .9);
      for (i = 0; i < 20; i++) s += R(i * 20 + 3, 99, 12, 8, c.mt1);
      [62, 338].forEach(function (x) { s += R(x - 18, 78, 36, 72, d) + P((x - 24) + ',80 ' + x + ',58 ' + (x + 24) + ',80', sh(c.mt1, .7)) + R(x - 3, 94, 6, 12, sh(c.mt1, .5)); });
      s += R(0, 138, 400, 34, c.mt2);
      for (i = 0; i < 14; i++) s += R(i * 30 + 6, 130, 18, 9, c.mt2);
      return s + PA('M178 172 V150 Q200 128 222 150 V172Z', sh(c.mt2, .45));
    },
    city: function (c) {
      function pag(x, b, w, col) { var s = '', k, wk, yk; for (k = 0; k < 3; k++) { wk = w - k * 10; yk = b - k * 20; s += R(x - wk / 2 + 3, yk - 18, wk - 6, 18, col) + P((x - wk / 2 - 5) + ',' + (yk - 16) + ' ' + x + ',' + (yk - 28) + ' ' + (x + wk / 2 + 5) + ',' + (yk - 16), sh(col, .78)); } return s + R(x - 1, b - 72, 2, 12, col); }
      var s = R(0, 140, 400, 22, c.mt1), i, x, h;
      [[55, 146, 44], [175, 146, 52], [290, 146, 40], [365, 146, 34]].forEach(function (p) { s += pag(p[0], p[1], p[2], c.mt1); });
      s += R(0, 160, 400, 12, c.mt2);
      for (i = 0; i < 9; i++) { x = i * 46 - 4; h = 16 + (i * 13) % 12; s += R(x, 164 - h, 34, h, c.mt2) + P(x - 4 + ',' + (164 - h) + ' ' + (x + 17) + ',' + (164 - h - 12) + ' ' + (x + 38) + ',' + (164 - h), sh(c.mt2, .75)); }
      return s;
    }
  };
  /* Chuỗi SVG nền (không có mecha/dị thú). id: tiền tố id gradient (cần khác nhau nếu nhiều nền cùng trang). */
  CS.svg = function (c, id) {
    c = c || CS.DEFAULTS.grass; id = String(id || 'cs').replace(/[^\w-]/g, '');
    var s = '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.sky1 + '"/><stop offset="1" stop-color="' + c.sky2 + '"/></linearGradient>' +
      (c.glow ? '<radialGradient id="' + id + 'r"><stop offset="0" stop-color="' + c.glow + '" stop-opacity=".85"/><stop offset="1" stop-color="' + c.glow + '" stop-opacity="0"/></radialGradient>' : '') + '</defs>';
    s += '<rect width="400" height="210" fill="url(#' + id + 'g)"/>';
    if (c.glow) s += '<circle cx="290" cy="95" r="90" fill="url(#' + id + 'r)"/>';
    s += (STYLE[c.style] || STYLE.hills)(c);
    s += '<ellipse cx="200" cy="150" rx="230" ry="18" fill="' + c.sky1 + '" opacity=".5"/>';
    s += '<rect y="168" width="400" height="42" fill="' + c.ground + '"/><rect y="168" width="400" height="3" fill="' + sh(c.ground, .8) + '" opacity=".6"/>';
    if (c.img) s += '<image href="' + c.img + '" x="0" y="0" width="400" height="210" preserveAspectRatio="xMidYMid slice"/>';
    return s;
  };
  /* Làm sạch 1 cảnh (dữ liệu thiếu/lỗi → dùng mặc định) */
  CS.clean = function (o, base) {
    var r = Object.assign({}, base); o = (o && typeof o === 'object') ? o : {};
    ['sky1', 'sky2', 'mt1', 'mt2', 'ground'].forEach(function (k) { if (COL.test(o[k])) r[k] = o[k]; });
    if ('glow' in o) r.glow = COL.test(o.glow) ? o.glow : '';
    if (typeof o.name === 'string' && o.name.trim()) r.name = o.name.trim().slice(0, 40);
    if (CS.STYLES.some(function (x) { return x[0] === o.style; })) r.style = o.style;
    if (o.tone === 'light' || o.tone === 'dark') r.tone = o.tone;
    r.img = (typeof o.img === 'string' && o.img.indexOf('data:image/') === 0 && !/["'<>\s]/.test(o.img)) ? o.img : (('img' in o) ? '' : base.img || '');
    return r;
  };
  /* Trộn dữ liệu database/combat-ui.json (có thể null) lên mặc định → đủ mọi khóa địa hình */
  CS.merge = function (j) {
    var out = {}, s = j && typeof j === 'object' && j.scenes && typeof j.scenes === 'object' ? j.scenes : {};
    CS.ORDER.forEach(function (k) { out[k] = CS.clean(s[k], CS.DEFAULTS[k]); });
    return out;
  };
  CS.toJSON = function (map) {
    return { v: 1, note: 'Nền giao diện chiến đấu theo địa hình. Chỉnh bằng EditPlayoutCombat.html. Thiếu khóa thì dùng mặc định trong vg-combat-scene.js.', scenes: map };
  };
  /* Mecha + dị thú mẫu để xem thử trong trình chỉnh sửa (giống hình trong battle.html) */
  CS.figures = function () {
    return '<g transform="translate(50 62)"><rect x="22" y="80" width="14" height="42" rx="3" fill="var(--m2)"/><rect x="46" y="80" width="14" height="42" rx="3" fill="var(--m2)"/><polygon points="14,40 68,40 62,84 20,84" fill="var(--m1)"/><rect x="30" y="14" width="22" height="22" rx="4" fill="var(--m1)"/><rect x="34" y="22" width="14" height="5" fill="var(--acc)"/><polygon points="41,2 34,16 48,16" fill="var(--acc)"/><rect x="2" y="38" width="16" height="16" rx="2" fill="var(--m2)"/><rect x="64" y="38" width="16" height="16" rx="2" fill="var(--m2)"/><line x1="90" y1="26" x2="90" y2="110" stroke="var(--acc)" stroke-width="4" stroke-linecap="round"/><circle cx="41" cy="60" r="6" fill="var(--acc)"/></g>' +
      '<g transform="translate(262 78)"><path d="M6 54 Q-14 42 -8 26" stroke="var(--b2)" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="46" cy="56" rx="40" ry="22" fill="var(--b1)"/><polygon points="78,40 108,50 98,68 72,64" fill="var(--b1)"/><circle cx="96" cy="52" r="3.5" fill="var(--acc)"/><rect x="20" y="70" width="8" height="34" fill="var(--b2)"/><rect x="34" y="72" width="8" height="32" fill="var(--b2)"/><rect x="58" y="72" width="8" height="32" fill="var(--b2)"/><rect x="70" y="70" width="8" height="34" fill="var(--b2)"/><polygon points="22,40 32,16 40,38" fill="var(--b2)"/><polygon points="42,36 54,12 60,36" fill="var(--b2)"/></g>';
  };
  /* Màu mecha/dị thú theo tông nền (dùng cho thuộc tính data-tone) */
  CS.TONE_CSS = '[data-tone=light]{--m1:#3a3f46;--m2:#23272d;--acc:#c0392b;--b1:#4a5a55;--b2:#2f3b38}[data-tone=dark]{--m1:#c9ced6;--m2:#8c93a0;--acc:#ff7a6b;--b1:#9fb3ab;--b2:#6b7e77}';
})(typeof window != 'undefined' ? window : globalThis);
