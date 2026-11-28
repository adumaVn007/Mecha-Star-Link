/* vg-element.js — Hệ nguyên tố (12 hệ, 24 hiệu ứng) cho Vân Giáp. MODULE DÙNG CHUNG: EditTypeGame.html, combat, UI game.
   Nguồn dữ liệu DUY NHẤT: database/elements.json (định nghĩa + ma trận) và database/equip-elements.json (gắn hệ lên trang bị).
   Hệ số khắc chế, mũi tên sơ đồ, audit đều tính từ cùng một ma trận VG.element.D.matrix.strong — không vẽ/hardcode riêng.
   Chưa nối vào battle.html: hàm VG.element.calc() là điểm vào để combat gọi sau khi chủ dự án duyệt ma trận. */
(function (g) {
  var VG = g.VG = g.VG || {}, E = VG.element = { D: null, T: { v: 1, tags: {} }, by: {}, fx: {} };
  E.PATH = { el: 'database/elements.json', eq: 'database/equip-elements.json' };
  var num = function (v, d) { v = +v; return isFinite(v) ? v : (d || 0); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  E.esc = esc;
  /* Đọc cùng thư mục trước, sau đó raw GitHub (giống các module khác) */
  function J(p) {
    return fetch(p + '?t=' + Date.now()).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return VG.fetchJSON ? VG.fetchJSON(p).catch(function () { return null; }) : null; });
  }
  E.J = J;
  E.index = function () {
    E.by = {}; E.fx = {};
    if (!E.D) return;
    (E.D.elements || []).forEach(function (e) { E.by[e.id] = e; });
    (E.D.effects || []).forEach(function (f) { E.fx[f.id] = f; });
  };
  E.setData = function (d) { E.D = d; E.index(); return d; };
  E.setTags = function (t) { E.T = (t && typeof t === 'object' && t.tags && typeof t.tags === 'object') ? t : { v: 1, tags: {} }; return E.T; };
  E.load = function () {
    return Promise.all([J(E.PATH.el), J(E.PATH.eq)]).then(function (a) {
      if (!a[0] || !Array.isArray(a[0].elements)) throw new Error('Không đọc được ' + E.PATH.el);
      E.setData(a[0]); E.setTags(a[1]); return E.D;
    });
  };
  E.ids = function () { return (E.D && E.D.order && E.D.order.length ? E.D.order : (E.D ? E.D.elements.map(function (e) { return e.id; }) : [])); };
  E.el = function (id) { return E.by[id] || null; };
  E.color = function (id) { return E.by[id] ? E.by[id].color : '#8a7a58'; };
  E.name = function (id) { return E.by[id] ? E.by[id].name : (id || 'Non type'); };
  E.effectsOf = function (id) { return (E.D ? E.D.effects : []).filter(function (f) { return f.element === id; }); };

  /* ===== Ma trận: một danh sách "strong" duy nhất; "bị khắc chế" được SUY RA nên luôn đối xứng ===== */
  E.M = function () { return (E.D && E.D.matrix && E.D.matrix.strong) || {}; };
  E.beats = function (a, S) { return ((S || E.M())[a] || []).slice(); };
  E.beatenBy = function (a, S) { S = S || E.M(); return E.ids().filter(function (x) { return (S[x] || []).indexOf(a) >= 0; }); };
  E.rule = function () { var m = (E.D && E.D.rules && E.D.rules.mult) || {}; return { strong: num(m.strong, 1.5), normal: num(m.normal, 1), weak: num(m.weak, .75) }; };
  /* Hệ số theo ĐÚNG hướng tấn công. Cùng hệ hoặc không hệ (null/'') = ×1.0 */
  E.mult = function (att, def, S) {
    var r = E.rule(); if (!att || !def || att === def) return r.normal; S = S || E.M();
    if ((S[att] || []).indexOf(def) >= 0) return r.strong;
    if ((S[def] || []).indexOf(att) >= 0) return r.weak;
    return r.normal;
  };
  /* Audit: mỗi hệ đúng 2 khắc/2 bị khắc, không tự khắc mình, không khắc lẫn nhau; nếu có `declared` (cột "bị khắc chế" của bảng) thì so khớp. */
  E.audit = function (S, declared) {
    var ids = E.ids(), issues = [], per = {}, mutual = [], diff = [], bad = false;
    ids.forEach(function (a) { (S[a] || []).forEach(function (b) {
      if (ids.indexOf(b) < 0) { issues.push('Hệ không tồn tại: ' + a + ' → ' + b); bad = true; }
      if (a === b) { issues.push(E.name(a) + ' tự khắc chế chính mình'); bad = true; }
      if ((S[b] || []).indexOf(a) >= 0 && a < b) { mutual.push([a, b]); issues.push(E.name(a) + ' ⇄ ' + E.name(b) + ': khắc chế lẫn nhau (mâu thuẫn)'); bad = true; } }); });
    ids.forEach(function (a) {
      var o = (S[a] || []).length, i = E.beatenBy(a, S).length; per[a] = { out: o, inn: i };
      if (o !== 2) { issues.push(E.name(a) + ' khắc chế ' + o + ' hệ (cần đúng 2)'); bad = true; }
      if (i !== 2) { issues.push(E.name(a) + ' bị ' + i + ' hệ khắc chế (cần đúng 2)'); bad = true; }
      if (declared && declared[a]) {
        var d = E.beatenBy(a, S), dec = declared[a], miss = dec.filter(function (x) { return d.indexOf(x) < 0; }), extra = d.filter(function (x) { return dec.indexOf(x) < 0; });
        if (miss.length || extra.length) diff.push({ el: a, declared: dec, derived: d });
      } });
    return { ok: !bad, issues: issues, per: per, mutual: mutual, diff: diff };
  };

  /* ===== Tính sát thương (MỘT lần, không nhân hệ số lặp) =====
     att: {el, el2, ratio (% hệ chính, 1-100), bonus (%), pen (%)}   def: {el, resist:{hệ:%}}
     Trả {dmg, mult, resist}. Hệ phụ: trộn tuyến tính theo ratio rồi áp 1 lần. */
  E.calc = function (base, att, def, S) {
    att = att || {}; def = def || {}; var cap = num(E.D && E.D.rules && E.D.rules.resistCap, 75), lo = num(E.D && E.D.rules && E.D.rules.resistMin, -50);
    var r = att.el2 ? Math.max(1, Math.min(100, num(att.ratio, 100))) / 100 : 1;
    var m = r * E.mult(att.el, def.el, S) + (att.el2 ? (1 - r) * E.mult(att.el2, def.el, S) : 0);
    var res = function (el) { return el ? Math.max(lo, Math.min(cap, num((def.resist || {})[el]) - num(att.pen))) : 0; };
    var rs = r * res(att.el) + (att.el2 ? (1 - r) * res(att.el2) : 0);
    return { dmg: Math.max(0, Math.round(num(base) * (1 + num(att.bonus) / 100) * m * (1 - rs / 100))), mult: m, resist: rs };
  };

  /* ===== Trang bị: vai trò & kiểm tra ===== */
  E.role = function (slot) { return slot === 'weapon' ? 'weapon' : (slot === 'pet' || slot === 'drone') ? 'pet' : 'part'; };
  E.tag = function (id) { return (E.T.tags || {})[id] || null; };
  E.checkTag = function (t) {
    var er = []; if (!t) return er;
    if (t.el && !E.by[t.el]) er.push('Hệ chính không tồn tại: ' + t.el);
    if (t.el2 && !E.by[t.el2]) er.push('Hệ phụ không tồn tại: ' + t.el2);
    if (t.el2 && t.el2 === t.el) er.push('Hệ phụ phải khác hệ chính');
    if (t.el2 && !t.el) er.push('Có hệ phụ thì phải có hệ chính');
    (t.fx || []).forEach(function (f) { var d = E.fx[f]; if (!d) er.push('Hiệu ứng không tồn tại: ' + f); else if (d.element !== t.el && d.element !== t.el2) er.push('Hiệu ứng ' + d.name + ' không thuộc hệ đã gắn'); });
    return er;
  };
  E.chipHtml = function (id) { var e = E.by[id]; return e ? '<span class="echip" style="--ec:' + esc(e.color) + '">' + esc(e.icon) + ' ' + esc(e.name) + '</span>' : ''; };
  E.fmtFx = function (f) {
    var a = []; if (f.duration) a.push('Thời hạn ' + f.duration + ' lượt'); if (f.chance) a.push('Xác suất ' + f.chance + '%'); if (f.stackLimit > 1) a.push('Cộng dồn tối đa ' + f.stackLimit + ' tầng');
    if (f.value) a.push(f.value + ' ' + (f.unit || '')); return a.join(' · ');
  };

  /* ===== Sơ đồ khắc chế (SVG) vẽ TỪ ma trận. sel = id hệ đang chọn.
     Không chọn: 24 mũi tên xanh (A khắc B). Có chọn: xanh (khắc mạnh ×1.5), đỏ (bị khắc ×0.75), xanh dương (bình thường ×1.0) — tính theo hướng tấn công từ hệ chọn. ===== */
  E.wheelSVG = function (o) {
    o = o || {}; var ids = E.ids(), S = o.strong || E.M(), sel = o.sel || '', W = 600, C = W / 2, R = 232, NR = 33, P = {};
    ids.forEach(function (id, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / ids.length; P[id] = { x: C + R * Math.cos(a), y: C + R * Math.sin(a) }; });
    var COL = { g: '#3df06a', b: '#4aa8ff', r: '#ff6a4a' }, lines = '', k;
    function arrow(a, b, c, w, op) {
      var A = P[a], B = P[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L;
      var x1 = A.x + ux * (NR + 3), y1 = A.y + uy * (NR + 3), x2 = B.x - ux * (NR + 7), y2 = B.y - uy * (NR + 7);
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, cx = mx + (C - mx) * .28, cy = my + (C - my) * .28;
      return '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" fill="none" stroke="' + COL[c] + '" stroke-width="' + w + '" stroke-opacity="' + op + '" marker-end="url(#ah' + c + ')" data-a="' + a + '" data-b="' + b + '"/>';
    }
    if (sel && E.by[sel]) {
      ids.forEach(function (x) { if (x === sel) return; var m = E.mult(sel, x, S), r = E.rule(); lines += arrow(sel, x, m === r.strong ? 'g' : m === r.weak ? 'r' : 'b', m === r.normal ? 1.4 : 3.2, m === r.normal ? .45 : .95); });
    } else ids.forEach(function (a) { (S[a] || []).forEach(function (b) { if (P[b]) lines += arrow(a, b, 'g', 2, .8); }); });
    var nodes = ids.map(function (id) {
      var e = E.by[id], p = P[id], on = id === sel;
      return '<g class="wn" data-el="' + id + '" style="cursor:pointer"><circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (NR + (on ? 5 : 0)) + '" fill="#0c1424" stroke="' + e.color + '" stroke-width="' + (on ? 5 : 3) + '"/>' +
        '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (NR - 5) + '" fill="' + e.color + '" fill-opacity=".18"/>' +
        '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + 7).toFixed(1) + '" text-anchor="middle" font-size="24">' + esc(e.icon) + '</text>' +
        '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + NR + 15).toFixed(1) + '" text-anchor="middle" font-size="13" font-weight="bold" fill="#f3e7c9" stroke="#0a1117" stroke-width="3" paint-order="stroke">' + esc(e.name) + '</text></g>';
    }).join('');
    var defs = '<defs>' + ['g', 'b', 'r'].map(function (c) { return '<marker id="ah' + c + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="' + COL[c] + '"/></marker>'; }).join('') + '<radialGradient id="wbg"><stop offset="0" stop-color="#1c2f66"/><stop offset="1" stop-color="#070b18"/></radialGradient></defs>';
    return '<svg viewBox="0 0 ' + W + ' ' + W + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sơ đồ khắc chế 12 hệ" style="width:100%;height:auto;display:block;border-radius:12px">' + defs +
      '<rect width="' + W + '" height="' + W + '" fill="url(#wbg)"/><circle cx="' + C + '" cy="' + C + '" r="' + (R + 6) + '" fill="none" stroke="#3a5cc0" stroke-opacity=".5" stroke-dasharray="3 6"/>' + lines + nodes + '</svg>';
  };
})(typeof window != 'undefined' ? window : globalThis);
