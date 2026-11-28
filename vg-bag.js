/* vg-bag.js — Hệ thống Trang bị & Túi đồ Hợp nhất (Split-View + Modular Mecha Renderer).
   Giữ nguyên toàn bộ API công khai VG.bag (setLegacy, init, setLib, add, eff, calc, used, CAP, nameOf, grantStarter, open, close).
   Nguồn dữ liệu: database/mecha-studio.json (+ bổ sung từ mecha-studio.json), database/city-items.json, và legacy IT.
   Dữ liệu người chơi lưu trong ST (vg_save_v1): ST.inv, ST.eq, ST.petBag, ST.eqB, ST.items. */
(function (g) {
  'use strict';
  var VG = g.VG = g.VG || {}, GM = VG.game, BG = VG.bag = {};
  BG.CAP = 200; BG.COLS = 10; BG.PETCAP = 20;

  var SL = [
    ['head', 'Giáp đầu', '⛑'], ['body', 'Giáp thân', '🛡'], ['shoulder', 'Giáp vai', '🦾'],
    ['arm', 'Giáp tay', '💪'], ['glove', 'Găng tay', '🧤'], ['leg', 'Giáp chân', '🦿'],
    ['boot', 'Giày', '👢'], ['weapon', 'Vũ khí', '⚔'], ['backpack', 'Ba lô', '🎒'],
    ['wing', 'Cánh', '🕊'], ['pet', 'Pet', '🐾'], ['drone', 'Drone', '🛸']
  ], SLM = {};
  SL.forEach(function (s) { SLM[s[0]] = s; });

  var LEFT = ['head', 'body', 'shoulder', 'arm', 'glove'];
  var RIGHT = ['leg', 'boot', 'weapon', 'backpack', 'wing'];
  var COMP = ['pet', 'drone'];
  var NEEDBP = { wing: 1, pet: 1, drone: 1 };

  var RN = ['', 'Phổ thông', 'Tốt', 'Hiếm', 'Sử thi', 'Truyền thuyết'];
  var RC = ['', '#a89f8d', '#4fa86a', '#3d7fd6', '#8c52d6', '#d9a21b'];
  var KIC = {
    cell: '🔋', tonic: '💧', nano: '🧪', shcell: '🔰',
    monster: '🦴', herb: '🌿', pill: '💊', artifact: '⚔️',
    talisman: '📜', ore: '💎', method: '📜', skill: '✨'
  };
  var BRANCH_NAMES = {
    monster: 'Quái vật', herb: 'Linh dược', pill: 'Đan dược',
    artifact: 'Pháp khí', talisman: 'Phù chú', ore: 'Khoáng liệu',
    method: 'Công pháp', skill: 'Skill'
  };

  /* Bảng tọa độ neo (%) và thứ tự Z-index (9 tầng: 0 nền -> 8 pet/drone) cho Modular Mecha Renderer */
  BG.ANCHORS = {
    wing:     { x: 50, y: 31, w: 68, h: 32, z: 1, flipX: false, dotX: 70, dotY: 31 },
    backpack: { x: 50, y: 36, w: 34, h: 24, z: 2, flipX: false, dotX: 55, dotY: 36 },
    body:     { x: 50, y: 37, w: 32, h: 24, z: 3, flipX: false, dotX: 46, dotY: 37 },
    leg:      { x: 50, y: 63, w: 36, h: 28, z: 4, flipX: false, dotX: 58, dotY: 63 },
    boot:     { x: 50, y: 80, w: 38, h: 18, z: 4, flipX: false, dotX: 60, dotY: 80 },
    shoulder: { x: 50, y: 31, w: 54, h: 20, z: 5, flipX: false, dotX: 33, dotY: 31 },
    arm:      { x: 50, y: 42, w: 54, h: 20, z: 5, flipX: false, dotX: 30, dotY: 42 },
    glove:    { x: 50, y: 53, w: 56, h: 16, z: 5, flipX: false, dotX: 28, dotY: 53 },
    head:     { x: 50, y: 17, w: 24, h: 18, z: 6, flipX: false, dotX: 50, dotY: 17 },
    weapon:   { x: 78, y: 48, w: 34, h: 42, z: 7, flipX: false, dotX: 77, dotY: 48 },
    pet:      { x: 16, y: 78, w: 26, h: 20, z: 8, flipX: false, dotX: 18, dotY: 78 },
    drone:    { x: 84, y: 18, w: 24, h: 18, z: 8, flipX: false, dotX: 82, dotY: 18 }
  };

  var LEG = {}, LIB = null, C = {}, EXTRA = {}, libP = null;
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var num = function (v) { v = +v; return isFinite(v) ? v : 0; };
  var rar = function (d) { var r = Math.round(num(d && d.rarity)); return r >= 1 ? Math.min(5, r) : 1; };
  var fmt = function (n) { return GM && GM.fmt ? GM.fmt(n) : String(Math.round(n)); };
  var fold = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  };
  var isImgSrc = function (v) {
    if (typeof v !== 'string' || !v) return false;
    return v.indexOf('data:image') === 0 || v.indexOf('https://') === 0 || v.indexOf('http://') === 0 || v.indexOf('assets/') === 0;
  };

  /* ===== Hợp đồng dữ liệu & Tra cứu thống nhất ===== */
  BG.setLegacy = function (IT) { LEG = IT || {}; };

  BG.setLib = function (lib) {
    LIB = lib || null;
    C = {};
    EXTRA = {};
    if (!lib) return;
    [['equips', 'e'], ['items', 'i'], ['materials', 'm']].forEach(function (p) {
      (lib[p[0]] || []).forEach(function (d) {
        if (d && d.id && !C[d.id]) C[d.id] = { k: p[1], d: d };
      });
    });
    ['humans', 'mechas', 'recipes'].forEach(function (k) {
      (lib[k] || []).forEach(function (d) {
        var id = d && (d.id || d.out);
        if (id && !EXTRA[id]) EXTRA[id] = { k: k, d: d };
      });
    });
  };

  /* Phân giải vật phẩm thống nhất: mecha-studio -> city-items (chuẩn hóa cty_ không trùng tiền tố) -> Legacy IT */
  BG.findItem = function (id) {
    if (!id) return null;
    var sid = String(id);
    var c = C[sid];
    if (!c) {
      var alt = sid.indexOf('cty_') === 0 ? sid.slice(4) : ('cty_' + sid);
      if (C[alt]) c = C[alt];
    }
    if (c) return { id: c.d.id || sid, k: c.k, d: c.d, r: rar(c.d) };
    if (LEG[sid]) return { id: sid, k: 'c', d: { id: sid, name: LEG[sid][0], desc: LEG[sid][1], rarity: 1 }, r: 1 };
    if (EXTRA[sid]) return { id: sid, k: EXTRA[sid].k, d: EXTRA[sid].d, r: rar(EXTRA[sid].d) };
    return null;
  };

  BG.nameOf = function (id) {
    var it = BG.findItem(id);
    return it && it.d ? (it.d.name || null) : null;
  };

  BG.init = function (ST) {
    ['inv', 'eq', 'petBag', 'eqB'].forEach(function (k) {
      if (!ST[k] || typeof ST[k] !== 'object' || Array.isArray(ST[k])) ST[k] = {};
    });
    if (!ST.items || typeof ST.items !== 'object') ST.items = {};
    return ST;
  };

  BG.STARTER = SL.map(function (s) { return 'utopia_' + s[0]; });
  BG.grantStarter = function (ST) {
    BG.init(ST);
    if (ST.starter) return 0;
    var n = 0, fail = false;
    BG.STARTER.forEach(function (id) {
      if (ST.eq[id.slice(7)] === id || num(ST.inv[id]) > 0) return;
      var r = BG.add(ST, id, 1, { noPet: true });
      if (r.ok) n++; else fail = true;
    });
    if (!fail) ST.starter = 1;
    return n;
  };

  function cnt(m) {
    return Object.keys(m || {}).filter(function (k) { return num(m[k]) > 0; }).length;
  }

  BG.used = function (ST) {
    BG.init(ST);
    return cnt(ST.inv) + Object.keys(LEG).filter(function (k) { return num(ST.items[k]) > 0; }).length;
  };

  function bagFree(ST) {
    return Math.max(0, BG.CAP - BG.used(ST));
  }

  BG.eff = function (ST) {
    var p = ST.p, b = ST.eqB || {};
    return {
      max: p.max + num(b.max),
      atk: p.atk + num(b.atk),
      spd: p.spd + num(b.spd),
      sh: p.gear ? p.shMax + num(b.sh) : 0,
      b: b
    };
  };

  BG.calc = function (ST) {
    var b = { max: 0, atk: 0, spd: 0, sh: 0 }, eq = (ST && ST.eq) || {};
    Object.keys(eq).forEach(function (s) {
      if (NEEDBP[s] && !eq.backpack) return; /* Bỏ qua wing/pet/drone nếu chưa mặc Backpack */
      if (s === 'pet' || s === 'drone') return; /* HP/DMG của Pet/Drone là chỉ số riêng */
      var it = BG.findItem(eq[s]);
      if (!it || it.k !== 'e') return;
      b.max += num(it.d.hp);
      b.atk += num(it.d.atk);
      b.spd += num(it.d.spd);
      b.sh += num(it.d.shield);
    });
    if (VG.skill && LIB) {
      var bs = { max: ST.p.max, atk: ST.p.atk, spd: ST.p.spd, sh: ST.p.gear ? ST.p.shMax : 0 };
      VG.skill.collect(ST, LIB).forEach(function (sk) {
        if (NEEDBP[sk.slot] && !eq.backpack) return;
        if (sk.type === 3 && bs[sk.stat] != null) b[sk.stat] += Math.round(bs[sk.stat] * num(sk.pct) / 100);
      });
    }
    return b;
  };

  function nm(id) {
    return BG.nameOf(id) || 'Vật phẩm';
  }

  BG.add = function (ST, id, q, o) {
    o = o || {};
    BG.init(ST);
    q = Math.max(1, Math.floor(num(q) || 1));
    var map = LEG[id] ? ST.items : ST.inv;
    if (num(map[id]) > 0) { map[id] = num(map[id]) + q; return { ok: true, where: 'bag' }; }
    if (BG.used(ST) < BG.CAP) { map[id] = q; return { ok: true, where: 'bag' }; }
    var hasPet = ST.eq.pet && ST.eq.backpack;
    if (!o.noPet && hasPet) {
      var pb = ST.petBag;
      if (num(pb[id]) > 0 || cnt(pb) < BG.PETCAP) {
        pb[id] = num(pb[id]) + q;
        return { ok: true, where: 'pet', msg: 'Túi đầy! "' + nm(id) + '" được cất vào túi của Pet.' };
      }
      return { ok: false, where: 'none', msg: 'Túi đầy và túi Pet cũng đầy! Không thể nhặt "' + nm(id) + '".' };
    }
    return {
      ok: false,
      where: 'none',
      msg: 'Túi đầy! Không còn chỗ cho "' + nm(id) + '"' + (o.noPet ? '.' : ' (trang bị Ba lô + Pet để có thêm túi Pet).')
    };
  };

  /* Tính chỉ số Pet / Drone sau khi cộng nguyên liệu chế tạo (recipe + fx*) */
  function fxv(m, key) {
    if (!m) return 0;
    var map = { hp: 'fxHp', mpAtk: 'fxMp', dmg: 'fxDmg', acc: 'fxAcc', dur: 'fxDur' };
    return num((m.fx && m.fx[key]) || m[map[key]]);
  }

  function calcPdStats(d) {
    var add = { hp: 0, mpAtk: 0, dmg: 0, acc: 0, dur: 0 }, out = {};
    (d.recipe || []).forEach(function (x) {
      var mat = BG.findItem(x && x.m);
      if (!mat) return;
      var q = num(x.q) || 1;
      Object.keys(add).forEach(function (k) { add[k] += fxv(mat.d, k) * q; });
    });
    Object.keys(add).forEach(function (k) {
      add[k] = Math.round(add[k] * 100) / 100;
      out[k] = Math.max(0, Math.round((num(d[k]) + add[k]) * 100) / 100);
    });
    return { v: out, add: add };
  }

  function equippedSetMap(ST) {
    var m = {}, eq = (ST && ST.eq) || {};
    Object.keys(eq).forEach(function (s) {
      if (eq[s]) m[eq[s]] = s;
    });
    return m;
  }

  function entries(ST, map, legacy) {
    var out = [];
    if (legacy) {
      Object.keys(LEG).forEach(function (k) {
        var q = num(ST.items[k]);
        if (q > 0) out.push({ id: k, k: 'c', d: { id: k, name: LEG[k][0], desc: LEG[k][1], rarity: 1 }, q: q, r: 1 });
      });
    }
    Object.keys(map || {}).forEach(function (id) {
      var q = num(map[id]);
      if (q <= 0) return;
      var it = BG.findItem(id);
      if (it && (it.k === 'e' || it.k === 'i' || it.k === 'm')) {
        out.push({ id: id, k: it.k, d: it.d, q: q, r: it.r });
      } else {
        out.push({
          id: id,
          k: 'x',
          d: { id: id, name: 'Vật phẩm không rõ', desc: 'Không có trong database hiện tại (ID ' + id + '). Vẫn được giữ trong túi.' },
          q: q,
          r: 1
        });
      }
    });
    return out;
  }

  var KORD = { e: 0, i: 1, c: 1, m: 2, x: 3 };
  function sortList(L, mode) {
    var a = L.slice();
    var cmp = {
      rar: function (x, y) { return y.r - x.r || String(x.d.name).localeCompare(String(y.d.name), 'vi'); },
      name: function (x, y) { return String(x.d.name).localeCompare(String(y.d.name), 'vi'); },
      type: function (x, y) { return KORD[x.k] - KORD[y.k] || y.r - x.r; },
      qty: function (x, y) { return y.q - x.q; }
    }[mode];
    return cmp ? a.sort(cmp) : a;
  }

  /* ===== Bộ Render Mecha Modular (9 Layer Z-Index + Fallback 3 tầng) ===== */
  function baseMechaSvg(eq, findFn, flashSlot) {
    var slotStyle = function (slot, dPath) {
      var id = eq[slot];
      var locked = NEEDBP[slot] && !eq.backpack;
      if (locked || !id) {
        return 'class="mm-wire' + (flashSlot === slot ? ' mm-flash' : '') + '" d="' + dPath + '"';
      }
      var it = findFn(id);
      var col = it ? RC[it.r] : '#e07a6a';
      return 'class="mm-plate' + (flashSlot === slot ? ' mm-flash' : '') + '" style="--sc:' + col + '" d="' + dPath + '"';
    };
    return '<svg class="mm-svg" viewBox="0 0 220 300" aria-hidden="true">' +
      '<defs>' +
      '<radialGradient id="mmFloor" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#35e0f6" stop-opacity="0.45"/><stop offset="65%" stop-color="#198ca8" stop-opacity="0.16"/><stop offset="100%" stop-color="#0b1822" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="mmMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#dce7f2"/><stop offset="55%" stop-color="#90a5b8"/><stop offset="100%" stop-color="#4e6173"/></linearGradient>' +
      '<linearGradient id="mmDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a4c5e"/><stop offset="100%" stop-color="#1c2733"/></linearGradient>' +
      '</defs>' +
      /* Layer 0: Nền & Bệ đứng */
      '<ellipse cx="110" cy="264" rx="84" ry="18" fill="url(#mmFloor)"/>' +
      '<ellipse cx="110" cy="264" rx="68" ry="12" fill="none" stroke="#3be2f7" stroke-opacity="0.6" stroke-width="1.5"/>' +
      '<ellipse cx="110" cy="264" rx="48" ry="8" fill="none" stroke="#3be2f7" stroke-opacity="0.35" stroke-dasharray="4 3" stroke-width="1"/>' +
      /* Layer 1: Wing silhouette */
      '<g data-layer="wing"><path ' + slotStyle('wing', 'M84 96 L34 62 L24 94 L68 120 Z M136 96 L186 62 L196 94 L152 120 Z') + '/></g>' +
      /* Layer 2: Backpack silhouette */
      '<g data-layer="backpack"><path ' + slotStyle('backpack', 'M86 82 L134 82 L138 134 L82 134 Z') + '/></g>' +
      /* Layer 3: Khung sườn + Body */
      '<g data-layer="frame">' +
      '<rect x="98" y="68" width="24" height="16" rx="4" fill="url(#mmDark)"/>' +
      '<rect x="92" y="136" width="36" height="22" rx="5" fill="url(#mmDark)"/>' +
      '<rect x="64" y="106" width="12" height="44" rx="4" fill="url(#mmDark)"/>' +
      '<rect x="144" y="106" width="12" height="44" rx="4" fill="url(#mmDark)"/>' +
      '<rect x="86" y="156" width="18" height="72" rx="5" fill="url(#mmDark)"/>' +
      '<rect x="116" y="156" width="18" height="72" rx="5" fill="url(#mmDark)"/>' +
      '</g>' +
      '<g data-layer="body"><path ' + slotStyle('body', 'M82 84 L138 84 L132 138 L88 138 Z') + '/>' +
      '<polygon points="110,98 118,108 110,118 102,108" fill="#3be2f7" opacity="0.88"/></g>' +
      /* Layer 4: Leg & Boot */
      '<g data-layer="leg"><path ' + slotStyle('leg', 'M82 154 L104 154 L102 222 L80 222 Z M116 154 L138 154 L140 222 L118 222 Z') + '/></g>' +
      '<g data-layer="boot"><path ' + slotStyle('boot', 'M76 224 L104 224 L106 254 L70 254 Z M116 224 L144 224 L150 254 L114 254 Z') + '/></g>' +
      /* Layer 5: Shoulder, Arm, Glove */
      '<g data-layer="shoulder"><path ' + slotStyle('shoulder', 'M60 80 L84 82 L82 106 L54 102 Z M136 82 L160 80 L166 102 L138 106 Z') + '/></g>' +
      '<g data-layer="arm"><path ' + slotStyle('arm', 'M58 106 L76 108 L74 146 L54 144 Z M144 108 L162 106 L166 144 L146 146 Z') + '/></g>' +
      '<g data-layer="glove"><path ' + slotStyle('glove', 'M52 146 L74 146 L72 172 L50 168 Z M146 146 L168 146 L170 168 L148 172 Z') + '/></g>' +
      /* Layer 6: Head */
      '<g data-layer="head"><path ' + slotStyle('head', 'M95 40 L110 30 L125 40 L122 68 L98 68 Z') + '/>' +
      '<rect x="100" y="49" width="20" height="5" rx="2" fill="#3be2f7" opacity="0.9"/></g>' +
      /* Layer 7: Weapon wireframe/silhouette */
      '<g data-layer="weapon"><path ' + slotStyle('weapon', 'M166 90 L176 90 L176 196 L166 196 Z M160 156 L182 156 L182 162 L160 162 Z') + '/></g>' +
      '</svg>';
  }

  function renderModularMecha(container, ST, lib, options) {
    if (!container) return;
    options = options || {};
    var eq = (ST && ST.eq) || {};
    if (lib && lib !== LIB) BG.setLib(lib);
    var findFn = BG.findItem;
    var flashSlot = options.flashSlot || '';
    var hideCompanions = !!options.hideCompanions;
    var slots = ['wing', 'backpack', 'body', 'leg', 'boot', 'shoulder', 'arm', 'glove', 'head', 'weapon'];
    if (!hideCompanions) slots.push('pet', 'drone');

    var layersHtml = slots.map(function (slot) {
      var id = eq[slot];
      if (!id) return '';
      if (NEEDBP[slot] && !eq.backpack) return '';
      var an = BG.ANCHORS[slot];
      if (!an) return '';
      var it = findFn(id);
      var col = it ? RC[it.r] : '#e07a6a';
      var imgUrl = it && it.d && (isImgSrc(it.d.layerImg) ? it.d.layerImg : (isImgSrc(it.d.img) ? it.d.img : ''));
      var cls = 'mm-layer mm-slot-' + slot + (flashSlot === slot ? ' mm-flash' : '');
      var st = 'left:' + an.x + '%;top:' + an.y + '%;width:' + an.w + '%;height:' + an.h + '%;z-index:' + an.z + ';--rc:' + col + ';transform:translate(-50%,-50%)' + (an.flipX ? ' scaleX(-1)' : '');

      /* Tầng 1: có ảnh tách lớp hoặc sprite bộ phận */
      if (imgUrl) {
        return '<div class="' + cls + ' has-img" data-mslot="' + slot + '" style="' + st + '">' +
          '<img alt="' + esc(it.d.name) + '" src="' + esc(imgUrl) + '">' +
          '</div>';
      }
      /* Tầng 2: chưa có ảnh riêng -> hào quang & huy hiệu phẩm chất tại điểm neo */
      var label = it ? (SLM[slot] ? SLM[slot][2] : '⚙') : '⚠';
      return '<div class="' + cls + ' no-img" data-mslot="' + slot + '" style="' + st + '" title="' + esc(it ? it.d.name : id) + '">' +
        '<span class="mm-aura">' + label + '</span>' +
        '</div>';
    }).join('');

    container.innerHTML = '<div class="mm-wrap">' +
      '<div class="mm-halo" aria-hidden="true"></div>' +
      baseMechaSvg(eq, findFn, flashSlot) +
      layersHtml +
      '</div>';
  }
  BG.renderModularMecha = renderModularMecha;

  function companionFallbackSvg(slot, dtype) {
    if (slot === 'pet' || dtype === 'repair') {
      return '<svg class="mm-comp-svg" viewBox="0 0 32 32" aria-hidden="true">' +
        '<rect x="7" y="13" width="16" height="9" fill="#4b6375"/><rect x="9" y="15" width="12" height="5" fill="#7c98ad"/>' +
        '<rect x="19" y="8" width="8" height="8" fill="#5e798d"/><rect x="20" y="5" width="2" height="3" fill="#ffd96a"/><rect x="24" y="5" width="2" height="3" fill="#ffd96a"/>' +
        '<rect x="23" y="10" width="3" height="2" fill="#3fe3f7"/>' +
        '<rect x="4" y="11" width="3" height="4" fill="#3fe3f7"/><rect x="8" y="22" width="3" height="5" fill="#334756"/><rect x="19" y="22" width="3" height="5" fill="#334756"/>' +
        '</svg>';
    }
    var acc = dtype === 'shield' ? '#3dd9eb' : (dtype === 'repair' ? '#54d18b' : '#ff6b57');
    return '<svg class="mm-comp-svg" viewBox="0 0 32 32" aria-hidden="true">' +
      '<rect x="6" y="11" width="20" height="8" fill="#364959"/><rect x="10" y="7" width="12" height="4" fill="#5f7c91"/>' +
      '<rect x="12" y="13" width="8" height="4" fill="' + acc + '"/>' +
      '<rect x="3" y="13" width="3" height="4" fill="' + acc + '"/><rect x="26" y="13" width="3" height="4" fill="' + acc + '"/>' +
      '<rect x="13" y="20" width="6" height="2" fill="#9bc0d0"/>' +
      '</svg>';
  }

  BG.renderCompanion = function (container, ST, slot, lib, options) {
    if (!container) return false;
    options = options || {};
    var eq = (ST && ST.eq) || {};
    if (lib && lib !== LIB) BG.setLib(lib);
    var forced = options.forcedType || '';
    if (!forced) {
      if (!eq.backpack || !eq[slot]) { container.innerHTML = ''; return false; }
      var it = BG.findItem(eq[slot]);
      var col = it ? RC[it.r] : '#e07a6a';
      var name = (it && it.d && it.d.name) || options.name || eq[slot];
      var imgUrl = it && it.d && (isImgSrc(it.d.layerImg) ? it.d.layerImg : (isImgSrc(it.d.img) ? it.d.img : ''));
      if (imgUrl) {
        container.innerHTML = '<div class="mm-comp mm-comp-' + slot + ' has-img" data-mslot="' + slot + '" style="--rc:' + col + '" title="' + esc(name) + '">' +
          '<img alt="' + esc(name) + '" src="' + esc(imgUrl) + '"></div>';
        return true;
      }
      var dtype = it && it.d && it.d.dtype ? String(it.d.dtype).toLowerCase() : '';
      container.innerHTML = '<div class="mm-comp mm-comp-' + slot + ' no-img" data-mslot="' + slot + '" style="--rc:' + col + '" title="' + esc(name) + '">' +
        companionFallbackSvg(slot, dtype) + '</div>';
      return true;
    }
    container.innerHTML = '<div class="mm-comp mm-comp-' + slot + ' no-img" data-mslot="' + slot + '" style="--rc:#3fe3f7" title="' + esc(options.name || forced) + '">' +
      companionFallbackSvg(slot, forced) + '</div>';
    return true;
  };

  /* ===== Giao diện Split-View (Bám sát Thiết Kế & Ảnh Sample) ===== */
  var X = null, S = null, root = null, css = null, tmr = 0, flashTmr = 0;

  var CSS =
    '#vgb{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:calc(8px + env(safe-area-inset-top,0px)) calc(8px + env(safe-area-inset-right,0px)) calc(8px + env(safe-area-inset-bottom,0px)) calc(8px + env(safe-area-inset-left,0px));background:rgba(4,10,16,.86);backdrop-filter:blur(5px);font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#dff3fa}' +
    '#vgb *{box-sizing:border-box}' +
    '#vgb .bx{width:min(1240px,100%);height:min(760px,100%);display:flex;flex-direction:column;background:radial-gradient(circle at 22% 10%,#152d3c,#0a151e 65%,#070f16);border:1.5px solid #2b6f86;border-radius:12px;box-shadow:0 14px 48px #000d,inset 0 0 0 1px #42d4ec28;overflow:hidden;position:relative}' +
    '#vgb .bx::before,#vgb .bx::after{content:"";position:absolute;width:16px;height:16px;border:2px solid #3fe3f7;pointer-events:none;z-index:2}' +
    '#vgb .bx::before{left:6px;top:6px;border-right:0;border-bottom:0;border-top-left-radius:4px}' +
    '#vgb .bx::after{right:6px;bottom:6px;border-left:0;border-top:0;border-bottom-right-radius:4px}' +

    /* Header */
    '#vgb .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:linear-gradient(180deg,#122938,#0c1b26);border-bottom:1px solid #265d73;flex:none}' +
    '#vgb .hd-l{display:flex;align-items:center;gap:10px;min-width:0}' +
    '#vgb .hd-ico{width:34px;height:34px;border-radius:8px;border:1px solid #3fe3f788;background:radial-gradient(circle,#1e546b,#0c212e);display:grid;place-items:center;font-size:18px;flex:none;box-shadow:0 0 12px #2fd4e633}' +
    '#vgb .hd-t{min-width:0}' +
    '#vgb .hd-t b{display:block;font-size:16px;letter-spacing:.05em;color:#e9fbff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#vgb .hd-t small{display:block;font-size:10.5px;letter-spacing:.08em;color:#7fb4c8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#vgb .hd-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}' +
    '#vgb .pill{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;background:#0a1721;border:1px solid #255568;font-size:12px;color:#cde8f2;white-space:nowrap}' +
    '#vgb .pill .st-v{font-weight:700}' +
    '#vgb .x{width:34px;height:34px;border-radius:8px;border:1px solid #336d82;background:#132a38;color:#c7eef9;font-size:16px;cursor:pointer;display:grid;place-items:center;flex:none}' +
    '#vgb .x:hover{background:#1b3c4f;border-color:#53e3f7;color:#fff}' +

    /* Main Split-View */
    '#vgb .main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(380px,46%) 1fr;gap:12px;padding:12px;overflow:hidden}' +
    '#vgb .col-eq,#vgb .col-bag{min-height:0;display:flex;flex-direction:column;background:linear-gradient(165deg,#0f202c,#09141d);border:1px solid #225468;border-radius:10px;overflow:hidden}' +

    /* Left Panel: Equipment */
    '#vgb .eq-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 11px;background:#0c1b26;border-bottom:1px solid #1e4b5e;flex:none}' +
    '#vgb .eq-who{min-width:0;flex:1}' +
    '#vgb .eq-who > b{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#dff6ff;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#vgb .eq-stats{display:flex;flex-wrap:wrap;gap:2px 10px;margin-top:3px;font-size:10.5px;color:#9cc2d2;align-items:baseline}' +
    '#vgb .eq-stats span{white-space:nowrap}' +
    '#vgb .eq-stats span b{display:inline;color:#fff;font-size:11px}' +
    '#vgb .eq-stats i{font-style:normal;color:#4fa86a;font-weight:700;margin-left:2px}' +
    '#vgb .eq-toggle{display:none;min-height:32px;padding:0 10px;border-radius:7px;border:1px solid #2d6f85;background:#132b3a;color:#8ee9fa;font-size:11.5px;font-weight:700;cursor:pointer;flex:none}' +

    '#vgb .eq-body{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px 10px;overflow-y:auto}' +
    '#vgb .stage-grid{position:relative;flex:1;min-height:220px;display:grid;grid-template-columns:minmax(130px,31.5%) 1fr minmax(130px,31.5%);gap:6px;align-items:stretch}' +
    '#vgb .vgb-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}' +
    '#vgb .slot-col{display:flex;flex-direction:column;justify-content:space-between;gap:4px;z-index:2}' +
    '#vgb .sl{position:relative;flex:1;min-height:38px;display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:8px;border:1.5px solid var(--rc,#265468);background:linear-gradient(145deg,#122431,#0b1721);color:#e5f5fb;text-align:left;cursor:pointer;overflow:hidden;transition:border-color .15s,box-shadow .15s}' +
    '#vgb .sl:hover{border-color:#53e3f7}' +
    '#vgb .sl.on{border-color:#3fe3f7 !important;box-shadow:0 0 0 1px #3fe3f766,0 0 14px #3fe3f744;background:linear-gradient(145deg,#163244,#0d202d)}' +
    '#vgb .sl.em{border-style:dashed;border-color:#2c596e;background:#0a1620cc;color:#7ca4b8}' +
    '#vgb .sl.lk{border-style:dashed;border-color:#384956;background:#0a131acc;color:#6f8291;opacity:.85}' +
    '#vgb .sl.orph{border-color:#d65545;background:#261315}' +
    '#vgb .sl-th{width:30px;height:30px;border-radius:6px;border:1px solid var(--rc,#2a5c70);background:#081219;display:grid;place-items:center;font-size:15px;flex:none;overflow:hidden}' +
    '#vgb .sl-th img{width:88%;height:88%;object-fit:contain}' +
    '#vgb .sl-tx{min-width:0;flex:1;line-height:1.18}' +
    '#vgb .sl-tx small{display:block;font-size:10px;color:#8bb6c9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#vgb .sl-tx b{display:block;font-size:11px;font-weight:700;color:#eef9ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#vgb .sl-tx em{display:block;font-style:normal;font-size:9.5px;font-weight:700;color:var(--rc,#7ca4b8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +

    /* Center Modular Mecha Stage */
    '#vgb .stage-mid{position:relative;display:flex;align-items:center;justify-content:center;min-height:210px;z-index:2;overflow:hidden}' +
    '#vgb .mm-wrap{position:relative;width:min(100%,210px);height:auto;aspect-ratio:220/300;margin:auto;flex:none}' +
    '#vgb .mm-halo{position:absolute;left:50%;top:48%;width:84%;height:74%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#26a6c428,#0b192400 72%);pointer-events:none}' +
    '#vgb .mm-svg{position:relative;z-index:1;width:100%;height:100%;display:block}' +
    '#vgb .mm-wire{fill:#13283655;stroke:#388ca8;stroke-width:1.3;stroke-dasharray:3 2}' +
    '#vgb .mm-plate{fill:url(#mmMetal);stroke:var(--sc,#3fe3f7);stroke-width:1.6;filter:drop-shadow(0 0 4px var(--sc,#3fe3f7))}' +
    '#vgb .mm-layer{position:absolute;pointer-events:none;display:flex;align-items:center;justify-content:center}' +
    '#vgb .mm-layer.has-img img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 2px 6px #000b) drop-shadow(0 0 6px var(--rc,#3fe3f7))}' +
    '#vgb .mm-layer.no-img .mm-aura{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#0a1924dd;border:1.5px solid var(--rc,#ffd96a);box-shadow:0 0 10px var(--rc,#ffd96a);font-size:12px}' +
    '@keyframes vgbFlash{0%{filter:brightness(2.2) drop-shadow(0 0 12px #5ef2ff);transform:scale(1.08)}100%{filter:none;transform:scale(1)}}' +
    '#vgb .mm-flash{animation:vgbFlash .65s ease-out}' +

    /* Companion Row */
    '#vgb .comp-hd{display:flex;align-items:center;gap:8px;margin:5px 0 4px;font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#8bb6c9;text-align:center}' +
    '#vgb .comp-hd::before,#vgb .comp-hd::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,#2c6a82,transparent)}' +
    '#vgb .comp-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:none}' +
    '#vgb .comp-row .sl{min-height:42px}' +

    /* Right Panel: Bag & Inspector */
    '#vgb .bag-top{padding:8px 10px;background:#0c1b26;border-bottom:1px solid #1e4b5e;display:flex;flex-direction:column;gap:7px;flex:none}' +
    '#vgb .tabs{display:flex;gap:5px;flex-wrap:wrap;align-items:center}' +
    '#vgb .tabs button{flex:1 1 auto;min-height:34px;padding:0 10px;border-radius:7px;border:1px solid #255468;background:#10222f;color:#9bc0d0;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}' +
    '#vgb .tabs button.on{background:linear-gradient(180deg,#1f6680,#144256);border-color:#44d6ec;color:#fff;box-shadow:0 0 10px #2fd4e633}' +
    '#vgb .tabs button.pet-sw{flex:0 0 auto;border-color:#7d6232;color:#f3d284;background:#1a1e24}' +
    '#vgb .tabs button.pet-sw.on{background:linear-gradient(180deg,#8a6627,#594015);border-color:#ffd96a;color:#fff}' +

    '#vgb .flt{display:flex;gap:6px;align-items:center;flex-wrap:wrap}' +
    '#vgb .flt select,#vgb .flt input{height:32px;border-radius:7px;border:1px solid #245265;background:#09151e;color:#dff3fa;font-size:12px;padding:0 8px}' +
    '#vgb .flt select{max-width:140px;cursor:pointer}' +
    '#vgb .flt input{flex:1;min-width:130px}' +
    '#vgb .flt input::placeholder{color:#658b9c}' +
    '#vgb .chip-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}' +
    '#vgb .chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:14px;background:#163d4f;border:1px solid #44d6ec;color:#dffaff;font-size:11.5px;font-weight:700;cursor:pointer}' +
    '#vgb .ban{margin:4px 0 0;padding:7px 10px;border-radius:7px;border:1px dashed #c9a24a;background:#231c10;color:#f4d88c;font-size:11.5px}' +

    '#vgb .grid-wrap{flex:1;min-height:110px;overflow-y:auto;padding:10px}' +
    '#vgb .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:6px}' +
    '#vgb .c{position:relative;aspect-ratio:1;border-radius:8px;border:1.5px solid var(--rc,#265468);background:linear-gradient(155deg,#132837,#0b1721);padding:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#e7f6fc;font-size:22px;overflow:hidden}' +
    '#vgb .c:hover{border-color:#53e3f7}' +
    '#vgb .c.on{border-color:#3fe3f7 !important;box-shadow:0 0 0 1px #3fe3f7,0 0 12px #3fe3f766}' +
    '#vgb .c img{width:86%;height:86%;object-fit:contain}' +
    '#vgb .c .qty{position:absolute;right:4px;bottom:2px;font:700 10.5px system-ui;color:#fff;text-shadow:0 1px 2px #000,0 0 4px #000}' +
    '#vgb .c .eq-tag{position:absolute;left:0;top:0;padding:1px 4px;background:#2b9f63;color:#fff;font:700 8.5px system-ui;letter-spacing:.03em;border-bottom-right-radius:5px;box-shadow:0 1px 3px #0008}' +
    '#vgb .c.e{border:1px dashed #1f4456;background:#09151e77;cursor:default}' +
    '#vgb .nil{padding:22px 12px;text-align:center;color:#7ca4b8;font-size:12.5px}' +

    /* Inspector */
    '#vgb .insp{flex:none;border-top:1.5px solid #266076;background:linear-gradient(180deg,#0e202c,#08131c);padding:10px 12px;max-height:46%;overflow-y:auto}' +
    '#vgb .insp-empty{padding:12px;text-align:center;color:#7ca4b8;font-size:12px}' +
    '#vgb .insp-top{display:grid;grid-template-columns:60px 1fr;gap:10px;align-items:start}' +
    '#vgb .insp-th{width:60px;height:60px;border-radius:9px;border:2px solid var(--rc,#3fe3f7);background:#081219;display:grid;place-items:center;font-size:28px;overflow:hidden}' +
    '#vgb .insp-th img{width:88%;height:88%;object-fit:contain}' +
    '#vgb .insp-hd{display:flex;justify-content:space-between;gap:10px;align-items:start}' +
    '#vgb .insp-title h4{margin:0;font-size:14.5px;color:var(--rc,#ffd96a)}' +
    '#vgb .insp-sub{font-size:11.5px;color:#9dc4d4;margin-top:2px}' +
    '#vgb .insp-stars{color:#f5c542;font-size:11px;letter-spacing:1px;margin-top:2px}' +
    '#vgb .insp-desc{margin:5px 0 0;font-size:12px;color:#b2cedb;line-height:1.35}' +
    '#vgb .diff-tbl{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin-top:8px;padding:7px 9px;border-radius:7px;background:#08131b;border:1px solid #1b4354;font-size:12px}' +
    '#vgb .diff-row{display:flex;justify-content:space-between;gap:8px;align-items:center}' +
    '#vgb .diff-row span:first-child{color:#8eb5c6}' +
    '#vgb .diff-row b{color:#eef9ff}' +
    '#vgb .up{color:#4fa86a;font-weight:700}.dn{color:#e07a6a;font-weight:700}.eq0{color:#7996a5}' +
    '#vgb .sk-list{margin-top:8px;display:flex;flex-direction:column;gap:5px}' +
    '#vgb .sk-box{padding:6px 8px;border-radius:7px;background:#102533;border-left:3px solid #f0b840;font-size:11.5px}' +
    '#vgb .sk-box b{color:#ffe082;font-size:12px}' +
    '#vgb .sk-box .sk-tp{display:inline-block;margin-left:5px;padding:1px 6px;border-radius:9px;background:#1c3d52;color:#9ee8f8;font-size:10px}' +
    '#vgb .insp-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:9px;flex-wrap:wrap}' +
    '#vgb .gain-pill{padding:3px 9px;border-radius:12px;background:#1b4d38;border:1px solid #4fa86a;color:#9ef2b8;font-size:11px;font-weight:700}' +
    '#vgb .btn-act{min-height:36px;padding:0 14px;border-radius:7px;border:1px solid #3fe3f7;background:linear-gradient(180deg,#1f83a3,#135269);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer}' +
    '#vgb .btn-act.rm{border-color:#c95a4b;background:linear-gradient(180deg,#7a2c26,#4e1b17);color:#ffd9d4}' +
    '#vgb .btn-act:disabled{opacity:.45;cursor:not-allowed}' +

    /* Toast */
    '#vgb .tt{position:absolute;left:16px;right:16px;top:58px;z-index:20;padding:9px 14px;border-radius:9px;background:#0d212ef5;border:1px solid #3fe3f7;color:#e4f9ff;font-size:12.5px;font-weight:700;box-shadow:0 6px 20px #000c;text-align:center}' +

    /* Responsive Mobile (< 768px) */
    '@media(max-width:767px){' +
    '#vgb{padding:0}' +
    '#vgb .bx{width:100%;height:100%;border-radius:0;border:0}' +
    '#vgb .hd{padding:8px 10px}' +
    '#vgb .hd-t b{font-size:13.5px}#vgb .hd-t small{font-size:9.5px}' +
    '#vgb .pill{padding:3px 7px;font-size:10.5px}' +
    '#vgb .main{grid-template-columns:1fr;grid-template-rows:auto 1fr;gap:8px;padding:8px;overflow-y:auto}' +
    '#vgb .col-eq{flex:none;overflow:visible}' +
    '#vgb .eq-toggle{display:inline-flex;align-items:center}' +
    '#vgb .col-eq.collapsed .eq-body{display:none}' +
    '#vgb .stage-grid{grid-template-columns:minmax(96px,31%) 1fr minmax(96px,31%);min-height:230px}' +
    '#vgb .sl{padding:4px 5px;gap:5px;min-height:42px}' +
    '#vgb .sl-th{width:28px;height:28px;font-size:14px}' +
    '#vgb .sl-tx b{font-size:10.5px}#vgb .sl-tx small{font-size:9.5px}' +
    '#vgb .col-bag{min-height:360px}' +
    '#vgb .insp{max-height:none}' +
    '#vgb .diff-tbl{grid-template-columns:1fr}' +
    '}';

  function say(m) {
    if (!root) return;
    var t = root.querySelector('.tt');
    if (!t) {
      t = document.createElement('div');
      t.className = 'tt';
      root.querySelector('.bx').appendChild(t);
    }
    t.textContent = m;
    t.style.display = 'block';
    clearTimeout(tmr);
    tmr = setTimeout(function () { if (t) t.style.display = 'none'; }, 3600);
    try { X && X.toast && X.toast(m); } catch (e) {}
  }

  function iconHtml(it) {
    var d = it.d || {};
    var src = isImgSrc(d.img) ? d.img : (isImgSrc(d.layerImg) ? d.layerImg : '');
    if (src) return '<img alt="" src="' + esc(src) + '">';
    if (it.k === 'e') return SLM[d.slot] ? SLM[d.slot][2] : '⚙';
    return KIC[it.k === 'c' ? it.id : (it.k === 'i' ? d.type : d.branch)] || '📦';
  }

  function selItem(ST) {
    var s = S.sel;
    if (!s) return null;
    if (s.src === 'slot') return { slot: s.slot, empty: true };
    if (s.src === 'eq') {
      var id = ST.eq[s.slot];
      if (!id) return { slot: s.slot, empty: true };
      var it = BG.findItem(id);
      if (it && it.k === 'e') return { slot: s.slot, eqd: true, it: { id: id, k: it.k, d: it.d, q: 1, r: it.r } };
      return {
        slot: s.slot,
        eqd: true,
        orphan: true,
        it: { id: id, k: 'x', d: { id: id, name: '(Dữ liệu không tồn tại)', desc: 'ID "' + id + '" không có trong database hiện tại.' }, q: 1, r: 1 }
      };
    }
    var map = s.src === 'pet' ? ST.petBag : ST.inv;
    var q = LEG[s.id] && s.src === 'bag' ? num(ST.items[s.id]) : num(map[s.id]);
    if (q <= 0) return null;
    var resolved = BG.findItem(s.id);
    if (resolved && (resolved.k === 'e' || resolved.k === 'i' || resolved.k === 'm' || resolved.k === 'c')) {
      return { it: { id: s.id, k: resolved.k, d: resolved.d, q: q, r: resolved.r }, src: s.src };
    }
    return {
      it: { id: s.id, k: 'x', d: { id: s.id, name: 'Vật phẩm không rõ', desc: 'Không có trong database hiện tại (ID ' + s.id + ').' }, q: q, r: 1 },
      src: s.src
    };
  }

  function currentMechaName(ST) {
    var eq = ST.eq || {}, counts = {};
    Object.keys(eq).forEach(function (s) {
      var it = BG.findItem(eq[s]);
      if (!it || !it.d) return;
      var setName = it.d.set || (String(it.d.name || '').indexOf('SOL-') === 0 ? String(it.d.name).split('·')[0].trim() : '');
      if (setName) counts[setName] = (counts[setName] || 0) + 1;
    });
    var top = '', best = 0;
    Object.keys(counts).forEach(function (k) { if (counts[k] > best) { best = counts[k]; top = k; } });
    var baseName = (ST.char && ST.char.name) ? ST.char.name : 'Vân Giáp';
    return top ? (baseName + ' · ' + top) : baseName;
  }

  function connectorSvgHtml(ST) {
    var eq = ST.eq || {};
    var lines = [];
    var addLine = function (slot, x1, y1) {
      var an = BG.ANCHORS[slot];
      if (!an) return;
      var tx = 31.5 + (an.dotX / 100) * 37;
      var ty = an.dotY;
      var mx = x1 < 50 ? x1 + 4 : x1 - 4;
      var id = eq[slot];
      var locked = NEEDBP[slot] && !eq.backpack;
      var it = id && !locked ? BG.findItem(id) : null;
      var col = it ? RC[it.r] : (locked ? '#3e4f5c' : '#2a566b');
      var selOn = S.sel && S.sel.slot === slot && S.sel.src !== 'bag' && S.sel.src !== 'pet';
      if (selOn) col = '#3fe3f7';
      lines.push('<polyline points="' + x1 + ',' + y1 + ' ' + mx + ',' + y1 + ' ' + tx.toFixed(1) + ',' + ty.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + (selOn ? '0.65' : '0.42') + '" stroke-opacity="' + (it || selOn ? '0.9' : '0.45') + '"' + (it ? '' : ' stroke-dasharray="1.5 1.2"') + '/>');
      lines.push('<circle cx="' + tx.toFixed(1) + '" cy="' + ty.toFixed(1) + '" r="' + (selOn ? '1.3' : '0.95') + '" fill="' + col + '" fill-opacity="' + (it || selOn ? '1' : '0.6') + '"/>');
    };
    LEFT.forEach(function (s, i) { addLine(s, 31.5, 10 + i * 20); });
    RIGHT.forEach(function (s, i) { addLine(s, 68.5, 10 + i * 20); });
    return '<svg class="vgb-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + lines.join('') + '</svg>';
  }

  function slotButtonHtml(ST, s) {
    var eq = ST.eq || {}, id = eq[s], locked = NEEDBP[s] && !eq.backpack;
    var selected = S.sel && S.sel.slot === s && S.sel.src !== 'bag' && S.sel.src !== 'pet';
    var nameSlot = SLM[s] ? SLM[s][1] : s;
    var icSlot = SLM[s] ? SLM[s][2] : '⚙';

    if (locked && !id) {
      return '<button type="button" class="sl lk' + (selected ? ' on' : '') + '" data-b="slot" data-v="' + s + '">' +
        '<div class="sl-th">🔒</div><div class="sl-tx"><small>' + esc(nameSlot) + '</small><b>[ 🔒 ] Cần Backpack</b></div></button>';
    }
    if (!id) {
      return '<button type="button" class="sl em' + (selected ? ' on' : '') + '" data-b="slot" data-v="' + s + '">' +
        '<div class="sl-th">' + icSlot + '</div><div class="sl-tx"><small>' + esc(nameSlot) + '</small><b>[ + ] ' + esc(nameSlot) + '</b></div></button>';
    }
    var it = BG.findItem(id);
    if (!it || it.k !== 'e') {
      return '<button type="button" class="sl orph' + (selected ? ' on' : '') + '" data-b="slot" data-v="' + s + '">' +
        '<div class="sl-th">⚠</div><div class="sl-tx"><small>' + esc(nameSlot) + '</small><b>(Dữ liệu không tồn tại)</b><em>' + esc(id) + '</em></div></button>';
    }
    var r = it.r, rc = RC[r];
    return '<button type="button" class="sl' + (selected ? ' on' : '') + '" style="--rc:' + rc + '" data-b="slot" data-v="' + s + '">' +
      '<div class="sl-th">' + iconHtml(it) + '</div>' +
      '<div class="sl-tx"><small>' + esc(nameSlot) + (locked ? ' (Khóa)' : '') + '</small><b>' + esc(it.d.name) + '</b><em>' + esc(RN[r]) + '</em></div></button>';
  }

  function filteredBagEntries(ST) {
    var pet = S.sub === 'pet';
    var ent = pet ? entries(ST, ST.petBag, false) : entries(ST, ST.inv, true);
    if (!pet) {
      if (S.bagTab === 'equip') ent = ent.filter(function (x) { return x.k === 'e' && x.d.slot !== 'pet' && x.d.slot !== 'drone'; });
      else if (S.bagTab === 'consumable') ent = ent.filter(function (x) { return x.k === 'i' || x.k === 'c'; });
      else if (S.bagTab === 'material') ent = ent.filter(function (x) { return x.k === 'm'; });
      else if (S.bagTab === 'companion') ent = ent.filter(function (x) { return x.k === 'e' && (x.d.slot === 'pet' || x.d.slot === 'drone'); });
    }
    if (S.fRar) ent = ent.filter(function (x) { return x.r === S.fRar; });
    if (S.fSlot && !pet) ent = ent.filter(function (x) { return x.k === 'e' && x.d.slot === S.fSlot; });
    if (S.search) {
      var q = fold(S.search.trim());
      if (q) ent = ent.filter(function (x) { return fold(x.d.name).indexOf(q) >= 0 || fold(x.id).indexOf(q) >= 0; });
    }
    return sortList(ent, S.sort);
  }

  function gridHtml(ST) {
    var pet = S.sub === 'pet';
    var ent = filteredBagEntries(ST);
    var cap = pet ? BG.PETCAP : BG.CAP;
    var eqMap = equippedSetMap(ST);
    var filt = S.fRar || (S.fSlot && !pet) || (S.search && S.search.trim()) || (!pet && S.bagTab !== 'all');

    var cells = ent.map(function (x) {
      var on = S.sel && S.sel.id === x.id && S.sel.src === (pet ? 'pet' : 'bag');
      var isEqd = !pet && !!eqMap[x.id];
      return '<button type="button" class="c' + (on ? ' on' : '') + '" style="--rc:' + RC[x.r] + '" data-b="sel" data-src="' + (pet ? 'pet' : 'bag') + '" data-id="' + esc(x.id) + '" aria-label="' + esc(x.d.name) + '">' +
        (isEqd ? '<span class="eq-tag">ĐANG MẶC</span>' : '') +
        iconHtml(x) +
        '<span class="qty">×' + fmt(x.q) + '</span></button>';
    });
    if (!filt) {
      var emptyMax = Math.min(cap, Math.max(40, ent.length + 12));
      for (var i = ent.length; i < emptyMax; i++) cells.push('<i class="c e"></i>');
    }
    if (!ent.length && filt) return '<div class="nil">Không có vật phẩm phù hợp bộ lọc.</div>';
    if (!ent.length && !filt) return '<div class="nil">Túi trống. Vật phẩm sẽ xuất hiện khi bạn nhận được.</div>';
    return '<div class="grid">' + cells.join('') + '</div>';
  }

  function diffSpan(val, curVal, unit) {
    var df = val - curVal;
    if (df > 0) return '<span class="up">(+' + fmt(df) + (unit || '') + ' ↗)</span>';
    if (df < 0) return '<span class="dn">(' + fmt(df) + (unit || '') + ' ↘)</span>';
    return '<span class="eq0">(0)</span>';
  }

  function inspectorHtml(ST) {
    var sel = selItem(ST);
    if (!sel) {
      return '<div class="insp-empty">Chọn một ô trang bị bên trái hoặc vật phẩm trong túi để xem chi tiết &amp; so sánh chỉ số.</div>';
    }
    if (sel.empty) {
      var sd = SLM[sel.slot] || [sel.slot, sel.slot, '⚙'];
      var needBp = NEEDBP[sel.slot] && !ST.eq.backpack;
      return '<div class="insp-top"><div class="insp-th">' + (needBp ? '🔒' : sd[2]) + '</div><div>' +
        '<div class="insp-title"><h4>Ô ' + esc(sd[1]) + (needBp ? ' (Bị khóa)' : ' (Trống)') + '</h4>' +
        '<div class="insp-sub">' + (needBp ? 'Cần trang bị Ba lô (Backpack) trước khi lắp vào vị trí này.' : 'Chọn trang bị phù hợp ở danh sách phía trên để mặc vào ô này.') + '</div></div></div></div>';
    }

    var it = sel.it, d = it.d || {}, rc = sel.orphan ? '#d65545' : RC[it.r];
    if (sel.orphan) {
      return '<div class="insp-top" style="--rc:' + rc + '"><div class="insp-th">⚠</div><div>' +
        '<div class="insp-title"><h4>(Dữ liệu không tồn tại)</h4>' +
        '<div class="insp-sub">Vị trí: ' + esc(SLM[sel.slot] ? SLM[sel.slot][1] : sel.slot) + ' · ID: ' + esc(it.id) + '</div></div>' +
        '<p class="insp-desc">Trang bị này không còn trong database hiện tại. Bấm Gỡ bỏ để làm sạch ô trang bị.</p>' +
        '<div class="insp-foot"><button type="button" class="btn-act rm" data-b="purge" data-v="' + esc(sel.slot) + '">GỠ BỎ</button></div></div></div>';
    }

    var isE = it.k === 'e';
    var isPD = isE && (d.slot === 'pet' || d.slot === 'drone');
    var sub = '';
    if (isE) sub = (SLM[d.slot] ? SLM[d.slot][1] : d.slot) + ' · Bậc ' + it.r + ' - ' + RN[it.r];
    else if (it.k === 'i' || it.k === 'c') sub = 'Vật phẩm tiêu hao · Bậc ' + it.r + ' - ' + RN[it.r];
    else if (it.k === 'm') sub = 'Nguyên liệu (' + (BRANCH_NAMES[d.branch] || 'Khác') + ') · Bậc ' + it.r + ' - ' + RN[it.r];
    else sub = 'Vật phẩm · ID ' + it.id;

    var stars = isE ? '<div class="insp-stars">' + '★'.repeat(it.r) + '☆'.repeat(5 - it.r) + '</div>' : '';
    var bodyHtml = '';
    var footHtml = '';

    if (isE && !isPD) {
      var curId = ST.eq[d.slot];
      var curIt = !sel.eqd && curId ? BG.findItem(curId) : null;
      var cmpD = !sel.eqd ? (curIt ? curIt.d : {}) : null;
      var stats = [['hp', 'HP'], ['atk', 'Tấn công'], ['spd', 'Tốc độ'], ['shield', 'Lá chắn']];
      if (num(d.mastery) || (cmpD && num(cmpD.mastery))) stats.push(['mastery', 'Thuần thục']);
      if (num(d.move) || (cmpD && num(cmpD.move))) stats.push(['move', 'Di chuyển']);

      bodyHtml += '<div class="diff-tbl">' + stats.map(function (st) {
        var v = num(d[st[0]]);
        var valStr = (v > 0 ? '+' : '') + fmt(v);
        var df = cmpD ? ' ' + diffSpan(v, num(cmpD[st[0]])) : '';
        return '<div class="diff-row"><span>' + st[1] + '</span><span><b>' + valStr + '</b>' + df + '</span></div>';
      }).join('') + '</div>';

      if (VG.skill && Array.isArray(d.skills) && d.skills.length) {
        bodyHtml += '<div class="sk-list">' + d.skills.map(function (r) {
          var sk = VG.skill.norm(r), tp = VG.skill.TYPES[sk.type] || { n: 'Kỹ năng' };
          var modeLabel = VG.skill.act(sk) ? 'Chủ động' : 'Bị động';
          return '<div class="sk-box"><div>' + esc(sk.ic) + ' <b>' + esc(sk.name) + '</b><span class="sk-tp">' + esc(modeLabel + ' · ' + tp.n) + '</span></div>' +
            '<div>' + esc(VG.skill.effText(sk)) + ' · <span style="color:#9ec4d4">' + esc(VG.skill.costText(sk)) + '</span></div>' +
            (sk.desc ? '<div style="color:#8db2c3">' + esc(sk.desc) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
      }

      if (sel.eqd) {
        footHtml = '<button type="button" class="btn-act rm" data-b="unequip" data-v="' + esc(sel.slot) + '">THÁO RA</button>';
      } else if (sel.src === 'pet') {
        footHtml = '<button type="button" class="btn-act" data-b="frompet">CHUYỂN VỀ TÚI</button>';
      } else {
        var lockedEquip = NEEDBP[d.slot] && !ST.eq.backpack;
        var gains = [];
        if (cmpD) {
          [['atk', 'ATK'], ['hp', 'HP'], ['spd', 'SPD'], ['shield', 'Lá chắn']].forEach(function (g) {
            var df = num(d[g[0]]) - num(cmpD[g[0]]);
            if (df > 0) gains.push('+' + fmt(df) + ' ' + g[1]);
          });
        }
        footHtml = (gains.length ? '<span class="gain-pill">' + esc(gains.slice(0, 2).join(' · ')) + '</span>' : '') +
          (curId === it.id ? '<span style="font-size:11px;color:#8ee9fa">Đang mặc 1 bản sao ở ô này</span>' : '') +
          '<button type="button" class="btn-act" data-b="equip"' + (lockedEquip ? ' disabled title="Cần mặc Ba lô trước"' : '') + '>' +
          (lockedEquip ? 'CẦN BA LÔ' : (curId ? 'HOÁN ĐỔI' : 'MẶC TRANG BỊ')) + '</button>';
      }
    } else if (isPD) {
      var pd = calcPdStats(d);
      var dtypeMap = { sentry: 'Sentry', repair: 'Repair', shield: 'Shield' };
      var skRef = d.skill ? BG.findItem(d.skill) : null;
      bodyHtml += '<div class="diff-tbl">' +
        '<div class="diff-row"><span>HP riêng</span><b>' + fmt(pd.v.hp) + (pd.add.hp ? ' <span class="up">(+' + fmt(pd.add.hp) + ')</span>' : '') + '</b></div>' +
        '<div class="diff-row"><span>Sát thương</span><b>' + fmt(pd.v.dmg) + (pd.add.dmg ? ' <span class="up">(+' + fmt(pd.add.dmg) + ')</span>' : '') + '</b></div>' +
        '<div class="diff-row"><span>MP/đòn</span><b>' + fmt(pd.v.mpAtk) + (pd.add.mpAtk ? ' <span class="up">(' + (pd.add.mpAtk > 0 ? '+' : '') + fmt(pd.add.mpAtk) + ')</span>' : '') + '</b></div>' +
        '<div class="diff-row"><span>Chính xác</span><b>' + fmt(pd.v.acc) + '%' + (pd.add.acc ? ' <span class="up">(+' + fmt(pd.add.acc) + ')</span>' : '') + '</b></div>' +
        (d.dtype ? '<div class="diff-row"><span>Loại</span><b>' + esc(dtypeMap[String(d.dtype).toLowerCase()] || d.dtype) + '</b></div>' : '') +
        (skRef ? '<div class="diff-row"><span>Skill riêng</span><b>' + esc(skRef.d.name) + '</b></div>' : '') +
        '</div>';
      if (Array.isArray(d.recipe) && d.recipe.length) {
        bodyHtml += '<div class="insp-desc"><b>Nguyên liệu đã gắn:</b> ' + d.recipe.map(function (x) {
          var m = BG.findItem(x.m);
          return esc((m ? m.d.name : x.m) + ' ×' + (num(x.q) || 1));
        }).join(', ') + '</div>';
      }
      if (VG.skill && Array.isArray(d.skills) && d.skills.length) {
        bodyHtml += '<div class="sk-list">' + d.skills.map(function (r) {
          var sk = VG.skill.norm(r), tp = VG.skill.TYPES[sk.type] || { n: 'Kỹ năng' };
          return '<div class="sk-box"><div>' + esc(sk.ic) + ' <b>' + esc(sk.name) + '</b><span class="sk-tp">' + esc(tp.n) + '</span></div><div>' + esc(VG.skill.effText(sk)) + '</div></div>';
        }).join('') + '</div>';
      }
      if (sel.eqd) {
        footHtml = '<button type="button" class="btn-act rm" data-b="unequip" data-v="' + esc(sel.slot) + '">THÁO RA</button>';
      } else if (sel.src === 'pet') {
        footHtml = '<button type="button" class="btn-act" data-b="frompet">CHUYỂN VỀ TÚI</button>';
      } else {
        var lockedPd = !ST.eq.backpack;
        footHtml = '<button type="button" class="btn-act" data-b="equip"' + (lockedPd ? ' disabled' : '') + '>' +
          (lockedPd ? 'CẦN BA LÔ ĐỂ MANG THEO' : (ST.eq[d.slot] ? 'HOÁN ĐỔI' : 'MANG THEO')) + '</button>';
      }
    } else if (it.k === 'c' || it.k === 'i') {
      var isBattleOnly = (it.k === 'c' && it.id === 'shcell') || (it.k === 'i' && d.type === 'shcell');
      var effLabel = { cell: 'Hồi Năng lượng', tonic: 'Hồi Hồn lực', nano: 'Hồi HP (%)', shcell: 'Nạp Lá chắn' }[d.type] || d.type || 'Hồi phục';
      if (it.k === 'i') {
        bodyHtml += '<div class="diff-tbl"><div class="diff-row"><span>Tác dụng</span><b>' + esc(effLabel) + (d.val ? ' +' + fmt(num(d.val)) + (d.type === 'nano' ? '%' : '') : '') + '</b></div></div>';
      }
      if (sel.src === 'pet') {
        footHtml = '<button type="button" class="btn-act" data-b="frompet">CHUYỂN VỀ TÚI</button>';
      } else {
        footHtml = (isBattleOnly ? '<span style="font-size:11px;color:#e07a6a">Chỉ dùng khi chiến đấu</span>' : '') +
          '<button type="button" class="btn-act" data-b="use"' + (isBattleOnly ? ' disabled' : '') + '>SỬ DỤNG</button>';
      }
    } else if (it.k === 'm') {
      var buffs = [
        ['fxHp', 'HP'], ['fxMp', 'MP/đòn'], ['fxDmg', 'Sát thương'], ['fxAcc', 'Chính xác'], ['fxDur', 'Độ bền']
      ].filter(function (f) { return num(d[f[0]]) !== 0 || (d.fx && num(d.fx[f[0].slice(2).toLowerCase()]) !== 0); })
        .map(function (f) {
          var v = num(d[f[0]]) || (d.fx && num(d.fx[f[0].slice(2).toLowerCase()])) || 0;
          return f[1] + ' ' + (v > 0 ? '+' : '') + fmt(v);
        });
      bodyHtml += '<div class="diff-tbl">' +
        '<div class="diff-row"><span>Nhánh</span><b>' + esc(BRANCH_NAMES[d.branch] || d.branch || '—') + '</b></div>' +
        (d.realm != null && d.realm !== '' ? '<div class="diff-row"><span>Cảnh giới</span><b>' + esc(GM && GM.rankName ? GM.rankName(d.realm) : d.realm) + '</b></div>' : '') +
        (d.he && d.he !== '—' ? '<div class="diff-row"><span>Ngũ hành</span><b>' + esc(d.he) + '</b></div>' : '') +
        (buffs.length ? '<div class="diff-row"><span>Buff Pet/Drone</span><b class="up">' + esc(buffs.join(', ')) + '</b></div>' : '') +
        '</div>';
      if (sel.src === 'pet') footHtml = '<button type="button" class="btn-act" data-b="frompet">CHUYỂN VỀ TÚI</button>';
    } else if (sel.src === 'pet') {
      footHtml = '<button type="button" class="btn-act" data-b="frompet">CHUYỂN VỀ TÚI</button>';
    }

    return '<div class="insp-top" style="--rc:' + rc + '">' +
      '<div class="insp-th">' + iconHtml(it) + '</div>' +
      '<div><div class="insp-hd"><div class="insp-title"><h4>' + esc(d.name || it.id) + '</h4>' +
      '<div class="insp-sub">' + esc(sub) + (it.q > 1 ? ' · Đang có: ×' + fmt(it.q) : '') + '</div>' + stars + '</div></div>' +
      (d.desc ? '<p class="insp-desc">' + esc(d.desc) + '</p>' : '') +
      bodyHtml +
      (footHtml ? '<div class="insp-foot">' + footHtml + '</div>' : '') +
      '</div></div>';
  }

  function render() {
    if (!root) return;
    var ST = BG.init(X.get()), p = ST.p, e = BG.eff(ST), stones = ST.stones || {};
    var bodyEl = root.querySelector('.eq-body'), eqScroll = bodyEl ? bodyEl.scrollTop : 0;
    var gridEl = root.querySelector('.grid-wrap'), gridScroll = gridEl ? gridEl.scrollTop : 0;
    var petUsed = cnt(ST.petBag), petMode = S.sub === 'pet';

    var h = '<div class="bx">' +
      '<header class="hd">' +
      '<div class="hd-l"><div class="hd-ico">⚙</div><div class="hd-t"><b>VÂN GIÁP · MECHA STAR LINK</b><small>HỆ THỐNG TRANG BỊ &amp; TÚI ĐỒ (MODULAR BUILDER)</small></div></div>' +
      '<div class="hd-r">' +
      '<div class="pill" title="Linh Thạch hiện có">Linh Thạch: ' +
      '<span class="st-v" style="color:#cfd8d6">' + fmt(num(stones.thuong)) + ' T</span> · ' +
      '<span class="st-v" style="color:#5cc8ff">' + fmt(num(stones.trung)) + ' Tr</span> · ' +
      '<span class="st-v" style="color:#f08a65">' + fmt(num(stones.cao)) + ' C</span> · ' +
      '<span class="st-v" style="color:#ffd96a">' + fmt(num(stones.sieu)) + ' S</span></div>' +
      '<div class="pill">Túi đồ: <b>' + BG.used(ST) + '/' + BG.CAP + ' ô</b></div>' +
      '<button type="button" class="x" data-b="close" aria-label="Đóng">✕</button>' +
      '</div></header>';

    h += '<div class="main">';
    /* Left Column: Equipment + Modular Mecha Stage */
    h += '<section class="col-eq' + (S.eqCollapsed ? ' collapsed' : '') + '">' +
      '<div class="eq-bar"><div class="eq-who"><b>⚙ MECHA HIỆN TẠI: ' + esc(currentMechaName(ST)) + '</b>' +
      '<div class="eq-stats">' +
      '<span>HP: <b>' + fmt(e.max) + '</b>' + (num(e.b.max) ? '<i>+' + fmt(e.b.max) + '</i>' : '') + '</span>' +
      '<span>ATK: <b>' + fmt(e.atk) + '</b>' + (num(e.b.atk) ? '<i>+' + fmt(e.b.atk) + '</i>' : '') + '</span>' +
      '<span>SPD: <b>' + fmt(e.spd) + '</b>' + (num(e.b.spd) ? '<i>+' + fmt(e.b.spd) + '</i>' : '') + '</span>' +
      '<span>LÁ CHẮN: <b>' + fmt(e.sh) + '</b>' + (p.gear && num(e.b.sh) ? '<i>+' + fmt(e.b.sh) + '</i>' : '') + '</span>' +
      '<span>NĂNG LƯỢNG: <b>' + fmt(p.en) + '/' + fmt(p.enMax) + '</b></span>' +
      '</div></div>' +
      '<button type="button" class="eq-toggle" data-b="toggleeq">' + (S.eqCollapsed ? 'Mở rộng Trang bị ▾' : 'Thu gọn ▴') + '</button></div>';

    h += '<div class="eq-body">' +
      '<div class="stage-grid">' +
      connectorSvgHtml(ST) +
      '<div class="slot-col">' + LEFT.map(function (s) { return slotButtonHtml(ST, s); }).join('') + '</div>' +
      '<div class="stage-mid" id="vgb-stage"></div>' +
      '<div class="slot-col">' + RIGHT.map(function (s) { return slotButtonHtml(ST, s); }).join('') + '</div>' +
      '</div>' +
      '<div class="comp-hd">ĐỒNG HÀNH</div>' +
      '<div class="comp-row">' + COMP.map(function (s) { return slotButtonHtml(ST, s); }).join('') + '</div>' +
      '</div></section>';

    /* Right Column: Bag + Inspector */
    h += '<section class="col-bag">' +
      '<div class="bag-top">';
    if (!LIB) {
      h += '<div class="ban">' + (libP ? 'Đang đọc database/mecha-studio.json…' : 'Không đọc được database/mecha-studio.json. Dữ liệu trong túi vẫn được giữ nguyên.') + '</div>';
    }
    var tabs = [
      ['all', 'Tất cả'], ['equip', 'Trang bị'], ['consumable', 'Tiêu hao'],
      ['material', 'Nguyên liệu'], ['companion', 'Pet & Drone']
    ];
    h += '<div class="tabs">' +
      tabs.map(function (t) {
        return '<button type="button" data-b="btab" data-v="' + t[0] + '" class="' + (!petMode && S.bagTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
      }).join('') +
      '<button type="button" data-b="petbag" class="pet-sw' + (petMode ? ' on' : '') + '">🐾 Túi Pet ' + petUsed + '/' + BG.PETCAP + '</button>' +
      '</div>';

    h += '<div class="flt">' +
      '<select data-b="frar" aria-label="Phẩm chất"><option value="0">Phẩm chất: Tất cả</option>' +
      [1, 2, 3, 4, 5].map(function (i) { return '<option value="' + i + '"' + (S.fRar === i ? ' selected' : '') + '>' + RN[i] + '</option>'; }).join('') +
      '</select>' +
      '<select data-b="sort" aria-label="Sắp xếp">' +
      [['def', 'Sắp xếp: Mặc định'], ['rar', 'Theo phẩm chất'], ['name', 'Theo tên'], ['type', 'Theo loại'], ['qty', 'Theo số lượng']].map(function (o) {
        return '<option value="' + o[0] + '"' + (S.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') +
      '</select>' +
      '<input type="search" data-b="search" placeholder="Tìm kiếm vật phẩm..." value="' + esc(S.search || '') + '" aria-label="Tìm kiếm vật phẩm">' +
      '</div>';

    h += '<div class="chip-row" id="vgb-chips">' +
      (S.fSlot && !petMode ? '<button type="button" class="chip" data-b="clrslot">Đang lọc: ' + esc(SLM[S.fSlot][1]) + ' ✕</button>' : '') +
      '</div></div>';

    h += '<div class="grid-wrap" id="vgb-grid-wrap">' + gridHtml(ST) + '</div>';
    h += '<div class="insp" id="vgb-insp">' + inspectorHtml(ST) + '</div>';
    h += '</section></div></div>';

    root.innerHTML = h;
    renderModularMecha(root.querySelector('#vgb-stage'), ST, LIB, { flashSlot: S.flashSlot });

    var nb = root.querySelector('.eq-body');
    if (nb) nb.scrollTop = eqScroll;
    var ng = root.querySelector('.grid-wrap');
    if (ng) ng.scrollTop = gridScroll;
  }

  function renderGridOnly() {
    if (!root) return;
    var ST = BG.init(X.get());
    var gw = root.querySelector('#vgb-grid-wrap');
    if (gw) gw.innerHTML = gridHtml(ST);
    var ch = root.querySelector('#vgb-chips');
    if (ch) ch.innerHTML = (S.fSlot && S.sub !== 'pet' ? '<button type="button" class="chip" data-b="clrslot">Đang lọc: ' + esc(SLM[S.fSlot][1]) + ' ✕</button>' : '');
  }

  function sync(ST) {
    if (LIB) ST.eqB = BG.calc(ST);
    var e = BG.eff(ST);
    if (ST.p.hp > e.max) ST.p.hp = e.max;
  }

  function triggerFlash(slot) {
    S.flashSlot = slot || '';
    clearTimeout(flashTmr);
    if (slot) flashTmr = setTimeout(function () { if (S) S.flashSlot = ''; }, 700);
  }

  function done() {
    X.persist();
    try { X.after && X.after(); } catch (e) {}
    render();
  }

  function doEquip() {
    var ST = BG.init(X.get()), id = S.sel && S.sel.id;
    var it = BG.findItem(id);
    if (!it || it.k !== 'e' || !SLM[it.d.slot]) return say('Trang bị này chưa có vị trí hợp lệ trong database.');
    var s = it.d.slot;
    if (NEEDBP[s] && !ST.eq.backpack) return say('Cần mặc Ba lô (Backpack) trước khi gắn ' + SLM[s][1] + '.');
    if (S.sel.src === 'pet') return;
    if (num(ST.inv[id]) < 1) return;

    var old = ST.eq[s];
    ST.inv[id] = num(ST.inv[id]) - 1;
    if (ST.inv[id] <= 0) delete ST.inv[id];

    if (old) {
      var r = BG.add(ST, old, 1, { noPet: true });
      if (!r.ok) {
        ST.inv[id] = num(ST.inv[id]) + 1;
        return say('Túi đầy, không thể hoán đổi: ' + r.msg);
      }
    }
    ST.eq[s] = id;
    sync(ST);
    S.sel = { src: 'eq', slot: s };
    S.fSlot = '';
    triggerFlash(s);
    say((old ? 'Đã hoán đổi: ' : 'Đã mặc: ') + it.d.name);
    done();
  }

  function doUnequip(s) {
    var ST = BG.init(X.get()), id = ST.eq[s];
    if (!id) return;

    /* Edge Case 1: Túi đầy khi tháo đồ */
    if (BG.used(ST) >= BG.CAP) {
      return say('Túi đã đầy, không thể tháo trang bị.');
    }

    /* Edge Case 3: Tháo backpack kéo theo tháo wing/pet/drone */
    if (s === 'backpack') {
      var deps = ['wing', 'pet', 'drone'].filter(function (k) { return !!ST.eq[k]; });
      if (deps.length) {
        if (ST.eq.pet && cnt(ST.petBag) > 0) {
          return say('Túi Pet còn vật phẩm: hãy chuyển về túi chính trước khi tháo Ba lô / Pet.');
        }
        var need = deps.length + 1;
        var free = bagFree(ST);
        if (free < need) {
          return say('Không đủ chỗ trong túi! Cần ' + need + ' ô trống để tháo Ba lô và ' + deps.length + ' trang bị phụ thuộc (còn ' + free + ' ô trống).');
        }
        var snapInv = Object.assign({}, ST.inv);
        var snapEq = Object.assign({}, ST.eq);
        var toRemove = ['backpack'].concat(deps);
        for (var i = 0; i < toRemove.length; i++) {
          var sl = toRemove[i], rmId = ST.eq[sl];
          var r = BG.add(ST, rmId, 1, { noPet: true });
          if (!r.ok) {
            ST.inv = snapInv;
            ST.eq = snapEq;
            return say('Không thể tháo: ' + r.msg);
          }
          delete ST.eq[sl];
        }
        sync(ST);
        S.sel = { src: 'slot', slot: s };
        triggerFlash(s);
        say('Đã tháo Ba lô cùng ' + deps.length + ' trang bị phụ thuộc về túi.');
        return done();
      }
    }

    if (s === 'pet' && cnt(ST.petBag) > 0) {
      return say('Túi Pet còn vật phẩm: hãy chuyển về túi chính trước khi tháo Pet.');
    }

    var res = BG.add(ST, id, 1, { noPet: true });
    if (!res.ok) return say('Không thể tháo: ' + res.msg);
    delete ST.eq[s];
    sync(ST);
    S.sel = { src: 'slot', slot: s };
    triggerFlash(s);
    say('Đã tháo: ' + nm(id));
    done();
  }

  /* Edge Case 4: Gỡ bỏ Orphan ID không tồn tại trong database */
  function doPurge(s) {
    var ST = BG.init(X.get()), id = ST.eq[s];
    if (!id) return;
    delete ST.eq[s];
    sync(ST);
    S.sel = { src: 'slot', slot: s };
    say('Đã gỡ bỏ dữ liệu không tồn tại khỏi ô ' + (SLM[s] ? SLM[s][1] : s) + '.');
    done();
  }

  function doFromPet() {
    var ST = BG.init(X.get()), id = S.sel && S.sel.id, q = num(ST.petBag[id]);
    if (q <= 0) return;
    delete ST.petBag[id];
    var r = BG.add(ST, id, q, { noPet: true });
    if (!r.ok) { ST.petBag[id] = q; return say(r.msg); }
    S.sel = null;
    say('Đã chuyển "' + nm(id) + '" về túi chính.');
    done();
  }

  function doUse() {
    var ST = BG.init(X.get()), id = S.sel && S.sel.id;
    if (!id) return;
    if (LEG[id]) {
      X.useLegacy && X.useLegacy(id);
      if (num(ST.items[id]) <= 0) S.sel = null;
      say('Đã dùng: ' + LEG[id][0]);
      render();
      return;
    }
    var it = BG.findItem(id);
    if (!it || it.k !== 'i') return;
    var d = it.d, v = num(d.val), p = ST.p, e = BG.eff(ST);
    if (d.type === 'shcell') return say('Pin lá chắn chỉ dùng khi chiến đấu.');
    if (num(ST.inv[id]) < 1) return;
    if (d.type === 'cell') p.en = Math.min(p.enMax, p.en + v);
    else if (d.type === 'tonic') p.soul = Math.min(p.soulMax, p.soul + v);
    else if (d.type === 'nano') p.hp = Math.min(e.max, p.hp + Math.round(e.max * v / 100));
    else return say('Loại vật phẩm này chưa được hỗ trợ.');
    ST.inv[id] = num(ST.inv[id]) - 1;
    if (ST.inv[id] <= 0) { delete ST.inv[id]; S.sel = null; }
    say('Đã dùng: ' + d.name);
    done();
  }

  function onClick(ev) {
    var b = ev.target.closest('[data-b]');
    if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
    var a = b.dataset.b;
    if (a === 'close') return BG.close();
    if (a === 'toggleeq') { S.eqCollapsed = !S.eqCollapsed; render(); return; }
    if (a === 'btab') {
      S.sub = 'main';
      S.bagTab = b.dataset.v;
      S.sel = null;
      S.fSlot = '';
      render();
      return;
    }
    if (a === 'petbag') {
      S.sub = S.sub === 'pet' ? 'main' : 'pet';
      S.sel = null;
      S.fSlot = '';
      render();
      return;
    }
    if (a === 'slot') {
      var s = b.dataset.v, ST = BG.init(X.get());
      var locked = NEEDBP[s] && !ST.eq.backpack;
      S.sub = 'main';
      S.sel = { src: ST.eq[s] ? 'eq' : 'slot', slot: s };
      S.fSlot = s;
      if (s === 'pet' || s === 'drone') S.bagTab = 'companion';
      else if (S.bagTab !== 'all' && S.bagTab !== 'equip') S.bagTab = 'equip';
      render();
      if (locked && !ST.eq[s]) say('Cần mặc Ba lô (Backpack) trước khi lắp ' + (SLM[s] ? SLM[s][1] : s) + '.');
      return;
    }
    if (a === 'sel') {
      S.sel = { src: b.dataset.src, id: b.dataset.id };
      render();
      return;
    }
    if (a === 'clrslot') { S.fSlot = ''; render(); return; }
    if (a === 'equip') return doEquip();
    if (a === 'unequip') return doUnequip(b.dataset.v);
    if (a === 'purge') return doPurge(b.dataset.v);
    if (a === 'frompet') return doFromPet();
    if (a === 'use') return doUse();
  }

  function onChange(ev) {
    var t = ev.target;
    if (t.dataset.b === 'frar') S.fRar = +t.value || 0;
    else if (t.dataset.b === 'sort') S.sort = t.value;
    else return;
    render();
  }

  function onInput(ev) {
    var t = ev.target;
    if (t.dataset.b === 'search') {
      S.search = t.value;
      renderGridOnly();
    }
  }

  BG.close = function () {
    if (!root) return;
    clearTimeout(tmr);
    clearTimeout(flashTmr);
    document.removeEventListener('keydown', onKey);
    root.remove();
    root = null;
    if (css) { css.remove(); css = null; }
    var f = X && X.onClose;
    if (f) f();
  };

  function onKey(e) { if (e.key === 'Escape') BG.close(); }

  /* ctx: { get:()=>ST, persist:fn, toast:fn, IT, loadLib:()=>Promise<lib>, useLegacy:fn(id), after:fn, onClose:fn } */
  BG.open = function (ctx, tab) {
    X = ctx;
    if (ctx.IT) BG.setLegacy(ctx.IT);
    if (BG.grantStarter(X.get())) try { X.persist(); } catch (e) {}
    if (root) { render(); return; }

    var isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    S = {
      bagTab: tab === 'equip' ? 'equip' : 'all',
      sub: 'main',
      fRar: 0,
      sort: 'def',
      fSlot: '',
      search: '',
      sel: null,
      flashSlot: '',
      eqCollapsed: isMobile && tab === 'bag'
    };

    css = document.createElement('style');
    css.textContent = CSS;
    document.head.appendChild(css);

    root = document.createElement('div');
    root.id = 'vgb';
    document.body.appendChild(root);

    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    root.addEventListener('click', function (e) { if (e.target === root) BG.close(); });

    render();

    if (!LIB && ctx.loadLib && !libP) {
      libP = ctx.loadLib().then(function (l) {
        if (l) {
          BG.setLib(l);
          var ST = BG.init(X.get());
          if (Object.keys(ST.eq).length) { sync(ST); X.persist(); }
        }
      }).catch(function () {}).then(function () { libP = null; render(); });
    } else if (LIB) {
      var ST0 = BG.init(X.get());
      if (Object.keys(ST0.eq).length) { sync(ST0); X.persist(); }
    }
  };
})(typeof window != 'undefined' ? window : globalThis);
