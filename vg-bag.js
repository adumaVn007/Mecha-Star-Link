/* vg-bag.js — Túi đồ & Trang bị cho Vân Giáp (giao diện mẫu A: tiên hiệp, vàng kim, nền giấy sáng).
   Nguồn định nghĩa vật phẩm: database/mecha-studio.json (equips / items / materials) — chỉ ĐỌC, không ghi.
   Dữ liệu người chơi nằm trong save riêng (cùng bản lưu vg_save_v1 của vg-core.js), thêm 4 khóa tùy chọn:
     ST.inv    = { <id database>: số lượng }      túi chính (vật phẩm cũ cell/tonic/nano/shcell vẫn nằm ở ST.items)
     ST.eq     = { <slot>: <id trang bị> }        đang mặc
     ST.petBag = { <id>: số lượng }               túi của Pet (nhận đồ khi túi chính đầy)
     ST.eqB    = { max, atk, spd, sh }            tổng chỉ số cộng thêm từ trang bị (battle.html đọc để cộng vào trận)
   Save cũ không có các khóa này vẫn chạy bình thường (khởi tạo rỗng khi mở). */
(function (g) {
  var VG = g.VG = g.VG || {}, GM = VG.game, BG = VG.bag = {};
  BG.CAP = 200; BG.COLS = 10; BG.PETCAP = 20;
  var SL = [['head', 'Đầu', '⛑'], ['body', 'Thân', '🧥'], ['shoulder', 'Vai', '🦾'], ['arm', 'Tay', '💪'], ['glove', 'Găng', '🧤'], ['leg', 'Chân', '🦿'],
    ['boot', 'Giày', '👢'], ['weapon', 'Vũ khí', '⚔'], ['backpack', 'Ba lô', '🎒'], ['wing', 'Cánh', '🕊'], ['pet', 'Pet', '🐾'], ['drone', 'Drone', '🛸']], SLM = {};
  SL.forEach(function (s) { SLM[s[0]] = s; });
  var LEFT = ['head', 'body', 'shoulder', 'arm', 'glove', 'leg'], RIGHT = ['boot', 'weapon', 'backpack', 'wing', 'pet', 'drone'], NEEDBP = { wing: 1, drone: 1, pet: 1 };
  var RN = ['', 'Phổ thông', 'Tốt', 'Hiếm', 'Sử thi', 'Truyền thuyết', 'Thần thoại'], RC = ['', '#a89f8d', '#4fa86a', '#3d7fd6', '#8c52d6', '#d9a21b', '#d6453d'];
  var KIC = { cell: '🔋', tonic: '💧', nano: '🧪', shcell: '🔰', monster: '🦴', herb: '🌿', pill: '💊', method: '📜', skill: '✨' };
  var LEG = {}, LIB = null, C = {}, libP = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { v = +v; return isFinite(v) ? v : 0; };
  var rar = function (d) { var r = Math.round(num(d && d.rarity)); return r >= 1 && r <= 6 ? r : 1; };
  var fmt = function (n) { return GM && GM.fmt ? GM.fmt(n) : String(Math.round(n)); };

  /* ===== Dữ liệu ===== */
  BG.setLegacy = function (IT) { LEG = IT || {}; };
  BG.setLib = function (lib) { LIB = lib || null; C = {}; if (lib) [['equips', 'e'], ['items', 'i'], ['materials', 'm']].forEach(function (p) { (lib[p[0]] || []).forEach(function (d) { if (d && d.id) C[d.id] = { k: p[1], d: d }; }); }); };
  BG.init = function (ST) {
    ['inv', 'eq', 'petBag', 'eqB'].forEach(function (k) { if (!ST[k] || typeof ST[k] !== 'object' || Array.isArray(ST[k])) ST[k] = {}; });
    if (!ST.items || typeof ST.items !== 'object') ST.items = {};
    return ST;
  };
  function cnt(m) { return Object.keys(m || {}).filter(function (k) { return num(m[k]) > 0; }).length; }
  BG.used = function (ST) { BG.init(ST); return cnt(ST.inv) + Object.keys(LEG).filter(function (k) { return num(ST.items[k]) > 0; }).length; };
  BG.eff = function (ST) { var p = ST.p, b = ST.eqB || {}; return { max: p.max + num(b.max), atk: p.atk + num(b.atk), spd: p.spd + num(b.spd), sh: p.gear ? p.shMax + num(b.sh) : 0, b: b }; };
  BG.calc = function (ST) {
    var b = { max: 0, atk: 0, spd: 0, sh: 0 };
    Object.keys(ST.eq || {}).forEach(function (s) {
      var c = C[ST.eq[s]]; if (!c || c.k !== 'e' || s === 'pet' || s === 'drone') return; /* HP của Pet/Drone là HP riêng của nó */
      b.max += num(c.d.hp); b.atk += num(c.d.atk); b.spd += num(c.d.spd); b.sh += num(c.d.shield);
    });
    return b;
  };
  function nm(id) { return LEG[id] ? LEG[id][0] : (C[id] ? C[id].d.name : 'Vật phẩm'); }
  /* Thêm vật phẩm vào túi. Trả {ok, where:'bag'|'pet'|'none', msg}. Túi đầy → túi Pet (cần Ba lô + Pet), không thì báo không nhặt được. */
  BG.add = function (ST, id, q, o) {
    o = o || {}; BG.init(ST); q = Math.max(1, Math.floor(num(q) || 1));
    var map = LEG[id] ? ST.items : ST.inv;
    if (num(map[id]) > 0) { map[id] = num(map[id]) + q; return { ok: true, where: 'bag' }; }
    if (BG.used(ST) < BG.CAP) { map[id] = q; return { ok: true, where: 'bag' }; }
    var hasPet = ST.eq.pet && ST.eq.backpack;
    if (!o.noPet && hasPet) {
      var pb = ST.petBag;
      if (num(pb[id]) > 0 || cnt(pb) < BG.PETCAP) { pb[id] = num(pb[id]) + q; return { ok: true, where: 'pet', msg: 'Túi đầy! "' + nm(id) + '" được cất vào túi của Pet.' }; }
      return { ok: false, where: 'none', msg: 'Túi đầy và túi Pet cũng đầy! Không thể nhặt "' + nm(id) + '".' };
    }
    return { ok: false, where: 'none', msg: 'Túi đầy! Không còn chỗ cho "' + nm(id) + '"' + (o.noPet ? '.' : ' (trang bị Ba lô + Pet để có thêm túi Pet).') };
  };
  function entries(ST, map, legacy) {
    var out = [];
    if (legacy) Object.keys(LEG).forEach(function (k) { var q = num(ST.items[k]); if (q > 0) out.push({ id: k, k: 'c', d: { name: LEG[k][0], desc: LEG[k][1] }, q: q, r: 1 }); });
    Object.keys(map).forEach(function (id) {
      var q = num(map[id]); if (q <= 0) return; var c = C[id];
      out.push(c ? { id: id, k: c.k, d: c.d, q: q, r: rar(c.d) } : { id: id, k: 'x', d: { name: 'Vật phẩm không rõ', desc: 'Không có trong database hiện tại (ID ' + id + '). Vẫn được giữ trong túi.' }, q: q, r: 1 });
    });
    return out;
  }
  var KORD = { e: 0, i: 1, c: 1, m: 2, x: 3 };
  function sortList(L, mode) {
    var a = L.slice(), cmp = { rar: function (x, y) { return y.r - x.r || x.d.name.localeCompare(y.d.name, 'vi'); }, name: function (x, y) { return String(x.d.name).localeCompare(String(y.d.name), 'vi'); },
      type: function (x, y) { return KORD[x.k] - KORD[y.k] || y.r - x.r; }, qty: function (x, y) { return y.q - x.q; } }[mode];
    return cmp ? a.sort(cmp) : a;
  }

  /* ===== Giao diện ===== */
  var X = null, S = null, root = null, css = null, tmr = 0;
  var CSS = '#vgb{position:fixed;inset:0;z-index:60;display:flex;justify-content:center;background:rgba(20,14,6,.72);font:14px/1.4 system-ui,-apple-system,sans-serif;color:#3b2a14}' +
    '#vgb .bx{width:100%;max-width:560px;height:100%;display:flex;flex-direction:column;background:radial-gradient(circle at 20% 0,#fff6dc,#f1e2bd 55%,#e6d2a2);border:2px solid #c9a24a;box-shadow:0 0 0 3px #7a5a22 inset,0 0 24px #000a;position:relative}' +
    '#vgb header{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 12px 6px}#vgb header .t{flex:1;text-align:center;line-height:1.1}#vgb header b{font:italic bold 20px Georgia,serif;color:#2a4d86;letter-spacing:.3px}#vgb header small{display:block;font-size:12px;color:#5b4520;letter-spacing:2px}' +
    '#vgb .x{width:42px;height:42px;border-radius:50%;border:2px solid #c9a24a;background:#3a3340;color:#f6dc9a;font-size:18px;cursor:pointer}#vgb .orn{width:42px;text-align:center;color:#b88a2e;font-size:22px}' +
    '#vgb .tabs{display:flex;gap:8px;padding:2px 12px 8px}#vgb .tabs button{flex:1;min-height:44px;border-radius:10px;border:1px solid #8a7a58;background:linear-gradient(#4b4650,#2c2832);color:#e6d9b8;font:bold 14px system-ui;cursor:pointer}#vgb .tabs button.on{background:linear-gradient(#ffd96a,#e0a82e);color:#2d2008;border-color:#b98a22}' +
    '#vgb .bd{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 12px 10px}' +
    '#vgb .stage{display:grid;grid-template-columns:58px 1fr 58px;gap:6px;align-items:stretch}#vgb .col{display:grid;grid-auto-rows:minmax(46px,1fr);gap:5px}' +
    '#vgb .sl{position:relative;border-radius:8px;border:2px solid #b89556;background:linear-gradient(#34303c,#201d27);color:#f4e7c4;cursor:pointer;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:46px;overflow:hidden;font:inherit}' +
    '#vgb .sl .ic{font-size:20px;line-height:1}#vgb .sl img{width:30px;height:30px;object-fit:contain}#vgb .sl em{font:bold 10px system-ui;font-style:normal;margin-top:1px}#vgb .sl.em{opacity:.65;border-style:dashed}#vgb .sl.on{box-shadow:0 0 0 2px #fff3 inset,0 0 8px #ffd96a;border-color:#ffd96a}' +
    '#vgb .art{border-radius:12px;border:1px solid #c9a24a88;background:radial-gradient(ellipse at 50% 70%,#fffbe8,#ecd9a8 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;padding:6px;text-align:center}#vgb .art img{max-width:100%;max-height:230px;object-fit:contain}#vgb .art .big{font-size:78px;line-height:1}#vgb .art b{color:#7a5a22;font-size:13px}#vgb .art small{color:#5b4520;font-size:11px}' +
    '#vgb .st{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;margin:8px 0;padding:8px 12px;border-radius:18px;border:1px solid #b89556;background:linear-gradient(#fff7de,#ecdcae);font:bold 13px system-ui}#vgb .st i{font-style:normal;color:#2e8a4a;font-size:11px;margin-left:3px}' +
    '#vgb .bh{display:flex;align-items:center;gap:6px;margin:10px 0 6px}#vgb .bh b{flex:1;font-size:15px}#vgb select{min-height:36px;border-radius:9px;border:1px solid #8a7a58;background:linear-gradient(#5a5560,#35313b);color:#f1e5c5;font:bold 12px system-ui;padding:0 6px;max-width:42%}' +
    '#vgb .sub{display:flex;gap:6px;margin-bottom:6px}#vgb .sub button{flex:1;min-height:38px;border-radius:8px;border:1px solid #8a7a58;background:#d8c595;color:#3b2a14;font:bold 13px system-ui;cursor:pointer}#vgb .sub button.on{background:#3a3340;color:#ffd96a}' +
    '#vgb .grid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px}#vgb .c{position:relative;aspect-ratio:1;min-height:32px;border-radius:6px;border:2px solid var(--rc,#8a7a58);background:linear-gradient(#3a3640,#25222c);padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#f4e7c4;font-size:16px}' +
    '#vgb .c img{width:84%;height:84%;object-fit:contain}#vgb .c b{position:absolute;right:1px;bottom:0;font:bold 9px system-ui;color:#fff;text-shadow:0 0 2px #000,0 0 2px #000}#vgb .c.e{border:1px dashed #b7a67c;background:#e2d3a8aa;cursor:default}#vgb .c.on{box-shadow:0 0 0 2px #ffd96a,0 0 8px #ffd96a}' +
    '#vgb .chip{display:inline-block;margin:0 0 6px;padding:5px 10px;border-radius:14px;background:#3a3340;color:#ffd96a;font:bold 12px system-ui;border:0;cursor:pointer}#vgb .ban{margin:6px 0;padding:8px 10px;border-radius:8px;border:1px dashed #a0782a;background:#fff3cf;font-size:12px}#vgb .nil{padding:14px;text-align:center;color:#6d5a37;font-size:13px}' +
    '#vgb .dt{border-top:2px solid #c9a24a;background:linear-gradient(#2f2b38,#1d1a24);color:#f4e7c4;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));max-height:42%;overflow-y:auto;display:grid;grid-template-columns:54px 1fr 108px;gap:8px}' +
    '#vgb .dt .th{width:54px;height:54px;border-radius:8px;border:2px solid var(--rc,#8a7a58);background:#14121a;display:flex;align-items:center;justify-content:center;font-size:26px}#vgb .dt .th img{width:90%;height:90%;object-fit:contain}' +
    '#vgb .dt h4{margin:0;font-size:14px;color:#ffd96a}#vgb .dt .tg{display:inline-block;margin-left:5px;padding:0 7px;border-radius:9px;font:bold 10px system-ui;color:#fff;background:var(--rc,#777);vertical-align:1px}#vgb .dt p{margin:3px 0 0;font-size:12px;color:#cbbd98}#vgb .dt .ln{font:bold 12px system-ui;margin-top:2px}.up{color:#6fe08e}.dn{color:#ff8c7a}' +
    '#vgb .ab{display:flex;flex-direction:column;gap:6px}#vgb .ab button{min-height:40px;border-radius:8px;border:1px solid #b98a22;background:linear-gradient(#ffd96a,#d9a02a);color:#2d2008;font:bold 13px system-ui;cursor:pointer}#vgb .ab button.s{background:linear-gradient(#4aa0e6,#1f6db8);color:#fff;border-color:#1a5a9a}#vgb .ab button:disabled{opacity:.45}' +
    '#vgb .tt{position:absolute;left:12px;right:12px;top:calc(60px + env(safe-area-inset-top,0px));z-index:3;padding:10px 12px;border-radius:10px;background:#2b2530f2;border:1px solid #ffd96a;color:#ffe9a8;font:bold 13px system-ui;box-shadow:0 4px 14px #000a}' +
    '@media(max-height:430px){#vgb .col{grid-auto-rows:minmax(38px,1fr)}#vgb .sl{min-height:38px}#vgb .art{min-height:120px}#vgb .art .big{font-size:50px}#vgb .dt{max-height:55%}}';

  function say(m, bad) {
    if (!root) return; var t = root.querySelector('.tt'); if (!t) { t = document.createElement('div'); t.className = 'tt'; root.querySelector('.bx').appendChild(t); }
    t.textContent = m; t.style.display = 'block'; clearTimeout(tmr); tmr = setTimeout(function () { t.style.display = 'none'; }, 3600);
    try { X.toast && X.toast(m); } catch (e) {}
  }
  function icon(it) {
    var d = it.d;
    if (d.img && String(d.img).indexOf('data:image') === 0) return '<img alt="" src="' + esc(d.img) + '">';
    if (it.k === 'e') return SLM[d.slot] ? SLM[d.slot][2] : '⚙';
    return KIC[it.k === 'c' ? it.id : (it.k === 'i' ? d.type : d.branch)] || '📦';
  }
  function statLines(it, cmpTo) {
    var d = it.d, out = [];
    if (it.k === 'e') {
      var pd = d.slot === 'pet' || d.slot === 'drone', L = pd ? [['hp', 'HP'], ['dmg', 'Dmg'], ['mpAtk', 'MP/đòn'], ['acc', 'Acc']] : [['atk', 'ATK'], ['hp', 'HP'], ['spd', 'SPD'], ['shield', 'Giáp']];
      L.forEach(function (s) {
        var v = num(d[s[0]]); if (!v && !(cmpTo && !pd)) return;
        var h = s[1] + ' ' + (v > 0 && !pd ? '+' : '') + fmt(v);
        if (cmpTo && !pd) { var o = num(cmpTo[s[0]]), df = v - o; h += ' <span class="' + (df > 0 ? 'up' : df < 0 ? 'dn' : '') + '">(' + (df > 0 ? '▲ +' : df < 0 ? '▼ ' : '= ') + (df ? fmt(df) : '0') + ')</span>'; }
        out.push('<div class="ln">' + h + '</div>');
      });
      out.unshift('<div class="ln" style="color:#cbbd98">Vị trí: ' + esc(SLM[d.slot] ? SLM[d.slot][1] : (d.slot || '—')) + '</div>');
    } else if (it.k === 'i') out.push('<div class="ln">Hiệu ứng: ' + esc({ cell: 'Năng lượng', tonic: 'Hồn lực', nano: 'HP (theo %)', shcell: 'Lá chắn (chỉ dùng khi chiến đấu)' }[d.type] || d.type || '—') + (d.val ? ' · ' + fmt(num(d.val)) + (d.type === 'nano' ? '%' : '') : '') + '</div>');
    else if (it.k === 'm') out.push('<div class="ln" style="color:#cbbd98">Nguyên liệu: ' + esc({ monster: 'Tài liệu từ quái vật', herb: 'Linh dược / quả kì bí', pill: 'Đan dược', method: 'Công pháp', skill: 'Skill' }[d.branch] || '—') + '</div>');
    return out.join('');
  }
  function selItem(ST) {
    var s = S.sel; if (!s) return null;
    if (s.src === 'slot') return { slot: s.slot, empty: true };
    if (s.src === 'eq') { var id = ST.eq[s.slot]; if (!id) return { slot: s.slot, empty: true }; var c = C[id]; return { slot: s.slot, eqd: true, it: c ? { id: id, k: c.k, d: c.d, q: 1, r: rar(c.d) } : { id: id, k: 'x', d: { name: 'Trang bị không rõ', desc: 'Không có trong database hiện tại (ID ' + id + ').' }, q: 1, r: 1 } }; }
    var map = s.src === 'pet' ? ST.petBag : ST.inv, q = LEG[s.id] && s.src === 'bag' ? num(ST.items[s.id]) : num(map[s.id]);
    if (q <= 0) return null; var cc = C[s.id];
    if (LEG[s.id] && s.src === 'bag') return { it: { id: s.id, k: 'c', d: { name: LEG[s.id][0], desc: LEG[s.id][1] }, q: q, r: 1 }, src: s.src };
    return { it: cc ? { id: s.id, k: cc.k, d: cc.d, q: q, r: rar(cc.d) } : { id: s.id, k: 'x', d: { name: 'Vật phẩm không rõ', desc: 'Không có trong database hiện tại (ID ' + s.id + '). Vẫn được giữ.' }, q: q, r: 1 }, src: s.src };
  }
  function render() {
    if (!root) return; var ST = BG.init(X.get()), p = ST.p, e = BG.eff(ST), body = root.querySelector('.bd'), top = body ? body.scrollTop : 0;
    var h = '<div class="bx"><header><span class="orn">✦</span><div class="t"><b>Mecha Star Link</b><small>— Vân Giáp —</small></div><button class="x" data-b="close" aria-label="Đóng">✕</button></header>' +
      '<nav class="tabs"><button data-b="tab" data-v="equip" class="' + (S.tab === 'equip' ? 'on' : '') + '">⛑ TRANG BỊ</button><button data-b="tab" data-v="bag" class="' + (S.tab === 'bag' ? 'on' : '') + '">🎒 TÚI ĐỒ</button></nav><div class="bd">';
    if (!LIB) h += '<div class="ban">' + (libP ? 'Đang đọc database/mecha-studio.json…' : 'Không đọc được database/mecha-studio.json (mất mạng hoặc chưa có). Vật phẩm database hiển thị theo ID và chưa thể mặc; dữ liệu trong túi vẫn được giữ nguyên.') + '</div>';
    if (S.tab === 'equip') {
      var sl = function (s) {
        var id = ST.eq[s], c = id && C[id], it = id ? (c ? { k: 'e', d: c.d } : { k: 'x', d: {} }) : null;
        return '<button class="sl' + (id ? '' : ' em') + (S.sel && S.sel.slot === s && S.sel.src !== 'bag' && S.sel.src !== 'pet' ? ' on' : '') + '" data-b="slot" data-v="' + s + '"' + (id && c ? ' style="border-color:' + RC[rar(c.d)] + '"' : '') + '><span class="ic">' + (it ? icon({ k: it.k, d: it.d, id: id }) || '⚙' : SLM[s][2]) + '</span><em>' + SLM[s][1] + '</em></button>';
      };
      var hm = LIB && LIB.humans && LIB.humans[0], av = hm && typeof hm.img === 'string' && hm.img.indexOf('data:image') === 0;
      h += '<div class="stage"><div class="col">' + LEFT.map(sl).join('') + '</div><div class="art">' + (av ? '<img alt="" src="' + esc(hm.img) + '">' : '<span class="big">🤖</span>') +
        '<b>' + esc((ST.char && ST.char.name) || 'Vân Giáp') + '</b><small>' + esc(GM.rankName(p.lv)) + '</small></div><div class="col">' + RIGHT.map(sl).join('') + '</div></div>';
      var sp = function (k, v, b) { return '<span>' + k + ' ' + fmt(v) + (b ? '<i>+' + fmt(b) + '</i>' : '') + '</span>'; };
      h += '<div class="st">' + sp('❤ HP', e.max, num(e.b.max)) + sp('⚔ ATK', e.atk, num(e.b.atk)) + sp('⚡ SPD', e.spd, num(e.b.spd)) + sp('🛡 Giáp', e.sh, p.gear ? num(e.b.sh) : 0) + '</div>';
    }
    var pet = S.sub === 'pet' && S.tab === 'bag', ent = pet ? entries(ST, ST.petBag, false) : entries(ST, ST.inv, true);
    if (S.fRar) ent = ent.filter(function (x) { return x.r === S.fRar; });
    if (S.fSlot && !pet) ent = ent.filter(function (x) { return x.k === 'e' && x.d.slot === S.fSlot; });
    ent = sortList(ent, S.sort);
    var cap = pet ? BG.PETCAP : BG.CAP, used = pet ? cnt(ST.petBag) : BG.used(ST), filt = S.fRar || (S.fSlot && !pet);
    if (S.tab === 'bag') h += '<div class="sub"><button data-b="sub" data-v="main" class="' + (pet ? '' : 'on') + '">Túi chính ' + BG.used(ST) + '/' + BG.CAP + '</button><button data-b="sub" data-v="pet" class="' + (pet ? 'on' : '') + '">Túi Pet ' + cnt(ST.petBag) + '/' + BG.PETCAP + '</button></div>';
    h += '<div class="bh"><b>' + (pet ? 'Túi Pet' : 'Túi đồ') + ' (' + used + '/' + cap + ')</b><select data-b="frar" aria-label="Phẩm chất"><option value="0">Phẩm chất ▾</option>' +
      [1, 2, 3, 4, 5, 6].map(function (i) { return '<option value="' + i + '"' + (S.fRar === i ? ' selected' : '') + '>' + RN[i] + '</option>'; }).join('') + '</select><select data-b="sort" aria-label="Sắp xếp">' +
      [['def', 'Sắp xếp ▾'], ['rar', 'Theo phẩm chất'], ['name', 'Theo tên'], ['type', 'Theo loại'], ['qty', 'Theo số lượng']].map(function (o) { return '<option value="' + o[0] + '"' + (S.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    if (S.fSlot && !pet) h += '<button class="chip" data-b="clrslot">Đang lọc ô: ' + esc(SLM[S.fSlot][1]) + ' ✕</button>';
    var cells = ent.map(function (x) {
      var on = S.sel && S.sel.id === x.id && S.sel.src === (pet ? 'pet' : 'bag');
      return '<button class="c' + (on ? ' on' : '') + '" style="--rc:' + RC[x.r] + '" data-b="sel" data-src="' + (pet ? 'pet' : 'bag') + '" data-id="' + esc(x.id) + '" aria-label="' + esc(x.d.name) + '">' + icon(x) + (x.q > 1 ? '<b>' + fmt(x.q) + '</b>' : '') + '</button>';
    });
    if (!filt) for (var i = ent.length; i < cap; i++) cells.push('<i class="c e"></i>');
    h += ent.length || !filt ? '<div class="grid">' + cells.join('') + '</div>' : '<div class="nil">Không có vật phẩm phù hợp bộ lọc.</div>';
    if (!ent.length && !filt) h += '<div class="nil">Túi trống. Vật phẩm sẽ xuất hiện khi bạn nhận được.</div>';
    h += '</div>';
    var sel = selItem(ST);
    if (sel) {
      var it = sel.it, sd = sel.slot ? SLM[sel.slot] : null;
      if (sel.empty) h += '<div class="dt" style="grid-template-columns:54px 1fr"><div class="th">' + sd[2] + '</div><div><h4>Ô ' + esc(sd[1]) + ' (trống)</h4><p>Chọn trang bị phù hợp trong túi bên dưới để mặc' + (NEEDBP[sel.slot] && !ST.eq.backpack ? ' — cần mặc Ba lô trước.' : '.') + '</p></div></div>';
      else {
        var cmpTo = null, isE = it.k === 'e';
        if (S.cmp && isE && !sel.eqd) { var cur = ST.eq[it.d.slot], cc = cur && C[cur]; cmpTo = cc ? cc.d : {}; }
        var inLib = !!C[it.id], btns = '';
        if (sel.eqd) btns = '<button data-b="unequip" data-v="' + sel.slot + '">THÁO</button>';
        else if (sel.src === 'pet') btns = '<button data-b="frompet">CHUYỂN VỀ TÚI</button>';
        else if (isE && inLib) btns = '<button data-b="equip">TRANG BỊ</button><button class="s" data-b="cmp">' + (S.cmp ? 'ẨN SO SÁNH' : 'SO SÁNH') + '</button>';
        else if (it.k === 'c' || it.k === 'i') btns = '<button data-b="use"' + (it.k === 'c' ? (it.id === 'shcell' ? ' disabled' : '') : (it.d.type === 'shcell' || !inLib ? ' disabled' : '')) + '>DÙNG</button>';
        h += '<div class="dt" style="--rc:' + RC[it.r] + '"><div class="th">' + icon(it) + '</div><div><h4>' + esc(it.d.name) + '<span class="tg">' + RN[it.r] + '</span></h4>' + statLines(it, cmpTo) +
          (cmpTo && !it.d.slot ? '' : '') + (S.cmp && isE && !sel.eqd && !ST.eq[it.d.slot] ? '<div class="ln" style="color:#cbbd98">Ô đang trống: so với 0.</div>' : '') +
          (it.d.desc ? '<p>' + esc(it.d.desc) + '</p>' : '') + (it.q > 1 ? '<p>Số lượng: ' + fmt(it.q) + '</p>' : '') + '</div><div class="ab">' + btns + '</div></div>';
      }
    }
    h += '</div>';
    root.innerHTML = h; var nb = root.querySelector('.bd'); if (nb) nb.scrollTop = top;
  }
  function sync(ST) {
    if (LIB) ST.eqB = BG.calc(ST);
    var e = BG.eff(ST); if (ST.p.hp > e.max) ST.p.hp = e.max;
  }
  function done() { X.persist(); try { X.after && X.after(); } catch (e) {} render(); }
  function doEquip() {
    var ST = BG.init(X.get()), id = S.sel && S.sel.id, c = C[id];
    if (!c || c.k !== 'e' || !SLM[c.d.slot]) return say('Trang bị này chưa có vị trí hợp lệ trong database.');
    var s = c.d.slot; if (NEEDBP[s] && !ST.eq.backpack) return say('Cần mặc Ba lô trước khi gắn ' + SLM[s][1] + '.');
    if (S.sel.src === 'pet') return;
    if (num(ST.inv[id]) < 1) return;
    ST.inv[id] = num(ST.inv[id]) - 1; if (ST.inv[id] <= 0) delete ST.inv[id];
    var old = ST.eq[s];
    if (old) { var r = BG.add(ST, old, 1, { noPet: true }); if (!r.ok) { ST.inv[id] = num(ST.inv[id]) + 1; return say('Túi đầy, không thể cất trang bị cũ để thay: ' + r.msg); } }
    ST.eq[s] = id; sync(ST); S.sel = { src: 'eq', slot: s }; S.cmp = false; S.fSlot = ''; say('Đã mặc: ' + c.d.name); done();
  }
  function doUnequip(s) {
    var ST = BG.init(X.get()), id = ST.eq[s]; if (!id) return;
    if (s === 'backpack' && (ST.eq.wing || ST.eq.drone || ST.eq.pet)) return say('Hãy tháo Cánh / Drone / Pet trước khi tháo Ba lô.');
    if (s === 'pet' && cnt(ST.petBag)) return say('Túi Pet còn vật phẩm: hãy chuyển về túi chính trước khi tháo Pet.');
    var r = BG.add(ST, id, 1, { noPet: true }); if (!r.ok) return say('Không thể tháo: ' + r.msg);
    delete ST.eq[s]; sync(ST); S.sel = { src: 'slot', slot: s }; say('Đã tháo: ' + nm(id)); done();
  }
  function doFromPet() {
    var ST = BG.init(X.get()), id = S.sel && S.sel.id, q = num(ST.petBag[id]); if (q <= 0) return;
    delete ST.petBag[id]; var r = BG.add(ST, id, q, { noPet: true });
    if (!r.ok) { ST.petBag[id] = q; return say(r.msg); }
    S.sel = null; say('Đã chuyển "' + nm(id) + '" về túi chính.'); done();
  }
  function doUse() {
    var ST = BG.init(X.get()), id = S.sel && S.sel.id;
    if (LEG[id]) { X.useLegacy(id); render(); return; }
    var c = C[id]; if (!c || c.k !== 'i') return;
    var d = c.d, v = num(d.val), p = ST.p, e = BG.eff(ST);
    if (d.type === 'shcell') return say('Pin lá chắn chỉ dùng khi chiến đấu.');
    if (num(ST.inv[id]) < 1) return;
    if (d.type === 'cell') p.en = Math.min(p.enMax, p.en + v); else if (d.type === 'tonic') p.soul = Math.min(p.soulMax, p.soul + v);
    else if (d.type === 'nano') p.hp = Math.min(e.max, p.hp + Math.round(e.max * v / 100)); else return say('Loại vật phẩm này chưa được hỗ trợ.');
    ST.inv[id] = num(ST.inv[id]) - 1; if (ST.inv[id] <= 0) { delete ST.inv[id]; S.sel = null; }
    say('Đã dùng: ' + d.name); done();
  }
  function onClick(ev) {
    var b = ev.target.closest('[data-b]'); if (!b || b.tagName === 'SELECT') return; var a = b.dataset.b;
    if (a === 'close') return BG.close();
    if (a === 'tab') { S.tab = b.dataset.v; S.sel = null; S.cmp = false; S.fSlot = ''; S.sub = 'main'; }
    else if (a === 'sub') { S.sub = b.dataset.v; S.sel = null; S.fSlot = ''; }
    else if (a === 'slot') { var s = b.dataset.v, ST = BG.init(X.get()); S.sel = { src: ST.eq[s] ? 'eq' : 'slot', slot: s }; S.fSlot = s; S.cmp = false; S.sub = 'main'; }
    else if (a === 'sel') { S.sel = { src: b.dataset.src, id: b.dataset.id }; S.cmp = false; }
    else if (a === 'clrslot') S.fSlot = '';
    else if (a === 'cmp') S.cmp = !S.cmp;
    else if (a === 'equip') return doEquip();
    else if (a === 'unequip') return doUnequip(b.dataset.v);
    else if (a === 'frompet') return doFromPet();
    else if (a === 'use') return doUse();
    render();
  }
  function onChange(ev) {
    var t = ev.target; if (t.dataset.b === 'frar') S.fRar = +t.value || 0; else if (t.dataset.b === 'sort') S.sort = t.value; else return; render();
  }
  BG.close = function () {
    if (!root) return; clearTimeout(tmr); document.removeEventListener('keydown', onKey); root.remove(); root = null; if (css) { css.remove(); css = null; }
    var f = X && X.onClose; if (f) f();
  };
  function onKey(e) { if (e.key === 'Escape') BG.close(); }
  /* ctx: { get:()=>ST, persist:fn, toast:fn, loadLib:()=>Promise<lib>, useLegacy:fn(id), after:fn, onClose:fn }  tab: 'equip' | 'bag' */
  BG.open = function (ctx, tab) {
    X = ctx; if (ctx.IT) BG.setLegacy(ctx.IT);
    if (root) { S.tab = tab === 'equip' ? 'equip' : 'bag'; render(); return; }
    S = { tab: tab === 'equip' ? 'equip' : 'bag', sub: 'main', fRar: 0, sort: 'def', fSlot: '', sel: null, cmp: false };
    css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    root = document.createElement('div'); root.id = 'vgb'; document.body.appendChild(root);
    root.addEventListener('click', onClick); root.addEventListener('change', onChange); document.addEventListener('keydown', onKey);
    root.addEventListener('click', function (e) { if (e.target === root) BG.close(); });
    render();
    if (!LIB && ctx.loadLib && !libP) {
      libP = ctx.loadLib().then(function (l) { if (l) { BG.setLib(l); var ST = BG.init(X.get()); if (Object.keys(ST.eq).length) sync(ST), X.persist(); } }).catch(function () {}).then(function () { libP = null; render(); });
    } else if (LIB) { var ST0 = BG.init(X.get()); if (Object.keys(ST0.eq).length) { sync(ST0); X.persist(); } }
  };
})(typeof window != 'undefined' ? window : globalThis);
