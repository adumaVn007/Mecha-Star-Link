/* vg-quest.js — NPC + Nhiệm vụ + Danh tiếng + Thành tựu cho Vân Giáp.
   Định nghĩa (dùng chung): database/quests.json, database/npc.json. Tiến độ người chơi: ST.q trong save (vg_save_v1) — KHÔNG ghi lên GitHub.
   ST.q = { st:{id:{s:'active'|'claimed',p:[…],d:ngày,n:số lần,ch:lựa chọn}}, flags:{}, rep:{phe:số}, ach:{id:1}, pin:id,
            track:{kills:{monId:n},boss:n,visited:{placeId:1},talk:{npcId:n},seen:{}} } */
(function (g) {
  var VG = g.VG = g.VG || {}, Q = VG.quest = { D: { quests: [], factions: [], repLevels: [], achievements: [] }, N: [], C: null, legacy: null, res: {} };
  var ST = function () { return Q.C.ST(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SN = ['thuong', 'trung', 'cao', 'sieu'], SL = { thuong: 'Thường', trung: 'Trung', cao: 'Cao', sieu: 'Siêu' };

  function J(p) {
    return fetch(p + '?t=' + Date.now()).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return VG.fetchJSON ? VG.fetchJSON(p).catch(function () { return null; }) : null; });
  }
  /* ===== Nạp dữ liệu ===== */
  Q.load = function () {
    return Promise.all([J('database/quests.json'), J('database/npc.json')]).then(function (a) {
      var q = a[0], n = a[1];
      if (q && Array.isArray(q.quests)) Q.D = Object.assign({ factions: [], repLevels: [], achievements: [] }, q);
      Q.N = n && Array.isArray(n.npcs) ? n.npcs.filter(function (x) { return x && x.id && x.x !== '' && x.y !== '' && !isNaN(x.x) && !isNaN(x.y); }) : [];
      Q.res = {};
      Q.N.forEach(function (x) { Q.pathOf(x).forEach(function (p) { Q.res[p.x * 1000 + p.y] = 1; }); });
    });
  };
  Q.pathOf = function (n) {
    var o = Q.legacy && n.zone === Q.legacy.id ? Q.legacy : { ox: 0, oy: 0 }, s = n.schedule, L = [];
    if (s && s.mode === 'patrol' && Array.isArray(s.path) && s.path.length) L = s.path.map(function (p) { return { x: +p.x + o.ox, y: +p.y + o.oy }; });
    if (!L.length) L = [{ x: +n.x + o.ox, y: +n.y + o.oy }];
    return L;
  };
  Q.pos = function (n, now) {
    var L = Q.pathOf(n), m = Math.max(1, +(n.schedule && n.schedule.stepMin) || 5) * 60000;
    return L[Math.floor((now || Date.now()) / m) % L.length];
  };
  Q.def = function (id) { return Q.D.quests.filter(function (q) { return q.id === id; })[0]; };
  Q.npc = function (id) { return Q.N.filter(function (n) { return n.id === id; })[0]; };

  /* ===== Save: mặc định an toàn (save cũ không có ST.q vẫn chạy) ===== */
  Q.ensure = function (S) {
    var q = S.q = (S.q && typeof S.q === 'object') ? S.q : {};
    q.st = q.st || {}; q.flags = q.flags || {}; q.rep = q.rep || {}; q.ach = q.ach || {};
    var t = q.track = q.track || {}; t.kills = t.kills || {}; t.boss = t.boss || 0; t.visited = t.visited || {}; t.talk = t.talk || {}; t.seen = t.seen || {};
    return q;
  };

  /* ===== Điều kiện (dùng cho nhiệm vụ, NPC xuất hiện, hội thoại) ===== */
  Q.cond = function (c) {
    if (!c) return true;
    var S = ST(), q = Q.ensure(S), ok = true;
    if (c.rank != null && c.rank !== '' && S.p.lv < +c.rank) ok = false;
    if (c.country != null && c.country !== '' && !(S.char && +S.char.country === +c.country)) ok = false;
    (c.quest || []).forEach(function (id) { var s = q.st[id]; if (!s || !(s.n > 0)) ok = false; });
    (c.notQuest || []).forEach(function (id) { var s = q.st[id]; if (s && s.n > 0) ok = false; });
    (c.questActive || []).forEach(function (id) { var s = q.st[id]; if (!s || s.s !== 'active') ok = false; });
    (c.flag || []).forEach(function (k) { if (!q.flags[k]) ok = false; });
    (c.noFlag || []).forEach(function (k) { if (q.flags[k]) ok = false; });
    if (c.rep) for (var f in c.rep) if ((q.rep[f] || 0) < +c.rep[f]) ok = false;
    if (c.season && c.season.length) { var sn = Math.floor((S.day - 1) / 30) % 4; if (c.season.indexOf(sn) < 0) ok = false; }
    if (c.day && c.day.length === 2) { var d = ((S.day - 1) % 30) + 1; if (d < +c.day[0] || d > +c.day[1]) ok = false; }
    return ok;
  };
  Q.visible = function (n) { return Q.cond(n.showIf); };
  Q.npcAt = function (x, y) {
    if (!Q.C) return null; var now = Date.now();
    return Q.N.filter(function (n) { if (!Q.visible(n)) return false; var p = Q.pos(n, now); return p.x === x && p.y === y; })[0] || null;
  };
  Q.visibleNpcs = function () { var now = Date.now(); return Q.N.filter(Q.visible).map(function (n) { var p = Q.pos(n, now); return { n: n, x: p.x, y: p.y }; }); };

  /* ===== Danh tiếng ===== */
  Q.rep = function (f) { return (Q.ensure(ST()).rep[f] || 0); };
  Q.repLevel = function (f) {
    var v = Q.rep(f), L = (Q.D.repLevels || []).slice().sort(function (a, b) { return a.min - b.min; }), r = L[0] || { name: 'Trung lập', discount: 0, min: 0 };
    L.forEach(function (l) { if (v >= l.min) r = l; }); return r;
  };

  /* ===== Trạng thái nhiệm vụ ===== */
  Q.objN = function (o) { return o.t === 'deliver' ? 2 : Math.max(1, +o.n || 1); };
  Q.have = function (id) { var S = ST(); return (S.inv && S.inv[id] | 0) + (S.petBag && S.petBag[id] | 0) + (S.items && S.items[id] | 0); };
  Q.prog = function (q, i) {
    var o = q.objectives[i], st = Q.ensure(ST()).st[q.id], n = Q.objN(o);
    if (o.t === 'collect') return Math.min(n, Q.have(o.target));
    return Math.min(n, st && st.p ? st.p[i] | 0 : 0);
  };
  Q.complete = function (q) { return (q.objectives || []).every(function (o, i) { return Q.prog(q, i) >= Q.objN(o); }); };
  Q.parents = function (id) { return Q.D.quests.filter(function (p) { return (p.next || []).indexOf(id) >= 0; }); };
  /* locked | avail | active | done (đủ mục tiêu, chưa nhận thưởng) | claimed */
  Q.state = function (q) {
    var S = ST(), st = Q.ensure(S).st[q.id];
    if (st && st.s === 'active') return Q.complete(q) ? 'done' : 'active';
    if (st && st.s === 'claimed') {
      if (q.repeat && +q.repeat.days > 0 && S.day - (st.d | 0) >= +q.repeat.days) return Q.cond(q.req) ? 'avail' : 'locked';
      return 'claimed';
    }
    var ps = Q.parents(q.id);
    if (ps.length && !(q.req && q.req.quest && q.req.quest.length) && !ps.some(function (p) { var s = Q.ensure(S).st[p.id]; return s && s.n > 0; })) return 'locked';
    return Q.cond(q.req) ? 'avail' : 'locked';
  };
  var STN = { locked: 'Chưa mở', avail: 'Có thể nhận', active: 'Đang làm', done: 'Hoàn thành — chờ nhận thưởng', claimed: 'Đã nhận thưởng' };
  Q.stateName = function (s) { return STN[s] || s; };

  function near(at) { var p = ST().pos; return Math.max(Math.abs(p.x - at.x), Math.abs(p.y - at.y)) <= (+at.r || 0); }
  Q.accept = function (id) {
    var q = Q.def(id), S = ST(); if (!q) return { ok: false, msg: 'Không tìm thấy nhiệm vụ.' };
    if (Q.state(q) !== 'avail') return { ok: false, msg: 'Nhiệm vụ chưa thể nhận.' };
    var old = Q.ensure(S).st[id];
    S.q.st[id] = { s: 'active', p: (q.objectives || []).map(function () { return 0; }), d: S.day, n: old ? old.n | 0 : 0, ch: -1 };
    if (!S.q.pin || !Q.def(S.q.pin) || Q.state(Q.def(S.q.pin)) === 'claimed') S.q.pin = id;
    Q.C.say('Nhận nhiệm vụ: ' + q.name + '.'); Q.C.persist(); Q.move(); Q.refresh();
    if (Q.C.placeHere) Q.reach(Q.C.placeHere());
    return { ok: true, msg: 'Đã nhận nhiệm vụ: ' + q.name };
  };

  /* ===== Biến số trong mô tả: {n} {target} {from} {to} {item} {x} {y} {fn} | {o2.n} … | {giver} {turnIn} {reward} {name} ===== */
  Q.nameOf = function (id) {
    if (id === '*' || id === '' || id == null) return '';
    if (id === 'boss') return 'Boss';
    var n = Q.npc(id); if (n) return n.name;
    var C = Q.C, v = C.placeName && C.placeName(id); if (v) return v;
    v = C.monName && C.monName(id); if (v) return v;
    return (C.IT && C.IT[id] && C.IT[id][0]) || (VG.bag && VG.bag.nameOf && VG.bag.nameOf(id)) || id;
  };
  Q.vars = function (q) {
    var V = { name: q.name || '', giver: Q.nameOf(q.giver) || 'bảng nhiệm vụ', turnIn: Q.nameOf(q.turnIn || q.giver) || 'bảng nhiệm vụ', reward: Q.rewardText(q.rewards) };
    (q.objectives || []).forEach(function (o, i) {
      var tg = o.t === 'kill' && (!o.target || o.target === '*') ? 'dị thú bất kỳ' : (o.t === 'visit' && !o.target ? 'thành trì bất kỳ' : Q.nameOf(o.target)),
        m = { n: Q.objN(o), target: tg, from: Q.nameOf(o.from) || o.from || '?', to: Q.nameOf(o.to) || o.to || '?', item: o.itemName || Q.nameOf(o.item) || o.item || 'vật phẩm', x: o.x, y: o.y, fn: o.fn || '' };
      if (o.t === 'deliver') m.n = 1;
      for (var k in m) { V['o' + (i + 1) + '.' + k] = m[k]; if (i === 0) V[k] = m[k]; }
    });
    return V;
  };
  Q.fmt = function (t, V) { return String(t == null ? '' : t).replace(/\{([A-Za-z0-9_.]+)\}/g, function (a, k) { return V && V[k] != null ? V[k] : a; }); };
  var DEF = { kill: 'Tiêu diệt {n} {target}', collect: 'Thu thập {n} {target}', talk: 'Trò chuyện với {target}', use: 'Dùng chức năng {fn} của {target}', explore: 'Đến ô ({x}, {y})', visit: 'Ghé thăm {n} thành trì', deliver: 'Giao {item} từ {from} đến {to}' };
  Q.objText = function (q, i) {
    var o = q.objectives[i], V = Q.vars(q), m = {};
    ['n', 'target', 'from', 'to', 'item', 'x', 'y', 'fn'].forEach(function (k) { m[k] = V['o' + (i + 1) + '.' + k]; });
    return Q.fmt(o.text || DEF[o.t] || o.t, Object.assign({}, V, m));
  };
  Q.progText = function (q, i) {
    var o = q.objectives[i], v = Q.prog(q, i);
    if (o.t === 'deliver') return v >= 2 ? 'Đã giao' : v === 1 ? 'Đã nhận vật phẩm — đang đi giao' : 'Chưa nhận vật phẩm';
    return v + '/' + Q.objN(o);
  };
  var nq = [], nt = 0;
  Q.notify = function (m) { nq.push(m); clearTimeout(nt); nt = setTimeout(function () { var t = nq.join(' · '); nq = []; Q.C.toast(t); }, 80); };

  /* ===== Sự kiện tiến độ ===== */
  function bump(test) {
    var S = ST(), q = Q.ensure(S), changed = false;
    Q.D.quests.forEach(function (d) {
      var st = q.st[d.id]; if (!st || st.s !== 'active') return;
      var was = Q.complete(d), hit = -1;
      (d.objectives || []).forEach(function (o, i) { if (o.t === 'collect' || o.t === 'deliver') return; if (test(o, i, st) && (st.p[i] | 0) < Q.objN(o)) { st.p[i] = (st.p[i] | 0) + 1; changed = true; hit = i; } });
      if (hit >= 0) {
        if (Q.complete(d)) Q.notify('✔ ' + d.name + ': ' + Q.objText(d, hit) + ' ' + Q.progText(d, hit) + ' — đủ mục tiêu, hãy nhận thưởng');
        else Q.notify('📜 ' + d.name + ': ' + Q.objText(d, hit) + ' ' + Q.progText(d, hit));
        Q.C.say(d.name + ': ' + Q.objText(d, hit) + ' ' + Q.progText(d, hit));
      } else if (!was && Q.complete(d)) Q.notify('✔ Đủ mục tiêu: ' + d.name);
    });
    if (changed) { Q.C.persist(); Q.refresh(); }
  }
  /* Giao vật phẩm: tới nơi nhận (from) → p=1; tới nơi giao (to) → p=2. id = id thành trì/địa điểm hoặc id NPC. */
  Q.reach = function (id) {
    if (!id) return; var S = ST(), q = Q.ensure(S), ch = false;
    Q.D.quests.forEach(function (d) {
      var st = q.st[d.id]; if (!st || st.s !== 'active') return;
      (d.objectives || []).forEach(function (o, i) {
        if (o.t !== 'deliver') return; var p = st.p[i] | 0;
        if (p === 0 && o.from === id) { st.p[i] = 1; ch = true; Q.notify('📦 ' + d.name + ': đã nhận ' + (o.itemName || 'vật phẩm') + ' tại ' + Q.nameOf(id)); }
        else if (p === 1 && o.to === id) { st.p[i] = 2; ch = true; Q.notify(Q.complete(d) ? '✔ ' + d.name + ': đã giao ' + (o.itemName || 'vật phẩm') + ' tại ' + Q.nameOf(id) + ' — hãy nhận thưởng' : '📦 ' + d.name + ': đã giao tại ' + Q.nameOf(id)); }
      });
    });
    if (ch) { Q.C.persist(); Q.refresh(); }
  };
  Q.kill = function (monId, isBoss, name) {
    var t = Q.ensure(ST()).track; if (monId) t.kills[monId] = (t.kills[monId] || 0) + 1; if (isBoss) t.boss++;
    t.names = t.names || {}; if (monId && name) t.names[monId] = name;
    bump(function (o) { return o.t === 'kill' && (!o.target || o.target === '*' || o.target === monId || (o.target === 'boss' && isBoss)); }); Q.achCheck();
  };
  Q.talk = function (npcId) { var t = Q.ensure(ST()).track; t.talk[npcId] = (t.talk[npcId] || 0) + 1; bump(function (o) { return o.t === 'talk' && o.target === npcId; }); };
  Q.use = function (npcId, fn) { bump(function (o) { return o.t === 'use' && o.target === npcId && (!o.fn || o.fn === fn); }); };
  Q.visit = function (placeId) {
    var t = Q.ensure(ST()).track; if (!placeId) return;
    var first = !t.visited[placeId]; t.visited[placeId] = 1;
    bump(function (o) { return o.t === 'visit' && (first || o.repeat) && (!o.target || o.target === placeId); }); Q.achCheck();
  };
  Q.move = function () {
    var S = ST(), q = Q.ensure(S), p = S.pos, changed = false;
    Q.D.quests.forEach(function (d) {
      var st = q.st[d.id]; if (!st || st.s !== 'active') return;
      (d.objectives || []).forEach(function (o, i) {
        if (o.t === 'explore' && !(st.p[i] | 0) && Math.max(Math.abs(p.x - +o.x), Math.abs(p.y - +o.y)) <= (+o.r || 0)) { st.p[i] = 1; changed = true; Q.notify('✔ ' + d.name + ': đã tới ' + (o.text || 'điểm đến')); }
      });
    });
    if (changed) { Q.C.persist(); Q.refresh(); }
  };

  /* ===== Phần thưởng — trao đúng 1 lần (ghi trạng thái sau khi trao thành công; túi đầy thì hoàn tác) ===== */
  function levelUp(S) {
    var p = S.p, G = Q.C.GM;
    while (p.lv < G.MAXR && p.xp >= G.need(p.lv)) {
      p.xp -= G.need(p.lv); p.lv++; p.max = Math.round(p.max * 1.1); p.hp = Math.min(p.max, p.hp + Math.round(p.max * .4)); p.atk = Math.round(p.atk * 1.08);
      p.enMax += 8; p.reg += 1; p.soulMax += 4; p.spd += 8;
    }
    if (p.lv >= G.MAXR) p.xp = 0;
  }
  function merge(a, b) {
    var r = JSON.parse(JSON.stringify(a || {})); b = b || {};
    if (b.xp) r.xp = (r.xp | 0) + (+b.xp | 0);
    if (b.stones) { r.stones = r.stones || {}; SN.forEach(function (k) { if (b.stones[k]) r.stones[k] = (r.stones[k] | 0) + (+b.stones[k] | 0); }); }
    if (b.items) r.items = (r.items || []).concat(b.items);
    return r;
  }
  Q.grant = function (r) {
    var S = ST(), snap = JSON.stringify({ inv: S.inv, petBag: S.petBag, items: S.items, eqB: S.eqB }), parts = [], ok = true, fail = '';
    (r.items || []).forEach(function (it) {
      if (!ok || !it || !it.id) return; var n = Math.max(1, +it.q || 1);
      if (S.items && Object.prototype.hasOwnProperty.call(S.items, it.id) && Q.C.IT && Q.C.IT[it.id]) { S.items[it.id] = (S.items[it.id] | 0) + n; parts.push(n + '× ' + Q.C.IT[it.id][0]); return; }
      var res = VG.bag && VG.bag.add ? VG.bag.add(S, it.id, n) : { ok: false, msg: 'Chưa có hệ thống túi đồ.' };
      if (res && res.ok) parts.push(n + '× ' + ((VG.bag && VG.bag.nameOf && VG.bag.nameOf(it.id)) || it.id)); else { ok = false; fail = (res && res.msg) || 'Túi đồ đầy.'; }
    });
    if (!ok) { var o = JSON.parse(snap); S.inv = o.inv; S.petBag = o.petBag; S.items = o.items; S.eqB = o.eqB; return { ok: false, msg: fail }; }
    if (r.xp) { S.p.xp += +r.xp; parts.unshift('+' + r.xp + ' KN'); levelUp(S); }
    SN.forEach(function (k) { if (r.stones && r.stones[k]) { S.stones[k] = (S.stones[k] | 0) + +r.stones[k]; parts.push('+' + r.stones[k] + ' LT ' + SL[k]); } });
    return { ok: true, msg: parts.join(', ') };
  };
  Q.rewardText = function (r) {
    r = r || {}; var a = [];
    if (r.xp) a.push('+' + r.xp + ' KN');
    SN.forEach(function (k) { if (r.stones && r.stones[k]) a.push('+' + r.stones[k] + ' LT ' + SL[k]); });
    (r.items || []).forEach(function (i) { a.push((i.q || 1) + '× ' + (Q.C.IT && Q.C.IT[i.id] ? Q.C.IT[i.id][0] : ((VG.bag && VG.bag.nameOf && VG.bag.nameOf(i.id)) || i.id))); });
    if (r.rep) for (var f in r.rep) if (r.rep[f]) a.push((r.rep[f] > 0 ? '+' : '') + r.rep[f] + ' danh tiếng ' + f);
    return a.join(', ') || '—';
  };
  Q.claim = function (id, ci) {
    var q = Q.def(id), S = ST(); if (!q || Q.state(q) !== 'done') return { ok: false, msg: 'Chưa thể nhận thưởng.' };
    var ch = q.choices && q.choices.length ? q.choices[ci | 0] : null;
    if (q.choices && q.choices.length && !ch) return { ok: false, msg: 'Hãy chọn một hướng giải quyết.' };
    var rw = merge(q.rewards, ch && ch.rewards);
    /* vật phẩm "collect + consume": trừ sau khi chắc chắn trao được thưởng */
    var res = Q.grant(rw); if (!res.ok) return res;
    (q.objectives || []).forEach(function (o) { if (o.t === 'collect' && o.consume) { var n = Q.objN(o), t = n; ['inv', 'petBag', 'items'].forEach(function (k) { if (t > 0 && S[k] && S[k][o.target]) { var d = Math.min(t, S[k][o.target]); S[k][o.target] -= d; t -= d; if (S[k][o.target] <= 0 && k !== 'items') delete S[k][o.target]; } }); } });
    var rp = {}; [q.rewards && q.rewards.rep, ch && ch.rep].forEach(function (m) { if (m) for (var f in m) rp[f] = (rp[f] || 0) + (+m[f] || 0); });
    for (var f in rp) if (rp[f]) S.q.rep[f] = (S.q.rep[f] || 0) + rp[f];
    ((q.rewards && q.rewards.flags) || []).concat((ch && ch.flags) || []).forEach(function (k) { S.q.flags[k] = 1; });
    var st = S.q.st[id]; st.s = 'claimed'; st.d = S.day; st.n = (st.n | 0) + 1; st.ch = ch ? ci | 0 : -1;
    var nx = (q.next || []).map(function (i) { return Q.def(i); }).filter(Boolean).filter(function (d) { return Q.state(d) === 'avail'; }).map(function (d) { return d.name; });
    Q.C.say('Hoàn thành nhiệm vụ: ' + q.name + '.'); Q.C.persist(); Q.C.renderHUD(); Q.achCheck(); Q.refresh();
    return { ok: true, msg: 'Nhận thưởng: ' + (res.msg || '—') + (nx.length ? ' · Mở khóa: ' + nx.join(', ') : ''), done: q };
  };

  /* ===== Thành tựu (có phân nhánh) ===== */
  var BR = [['combat', '⚔ Chiến đấu'], ['explore', '🧭 Khám phá'], ['quest', '📜 Nhiệm vụ'], ['rep', '🏅 Danh tiếng']];
  Q.stat = function (k) {
    var S = ST(), q = Q.ensure(S), t = q.track;
    if (k === 'kills') return S.kills | 0; if (k === 'cleared') return S.cleared | 0; if (k === 'boss') return t.boss | 0;
    if (k === 'visited') return Object.keys(t.visited).length;
    if (k === 'quests') return Object.keys(q.st).reduce(function (a, i) { return a + (q.st[i].n | 0); }, 0);
    if (k === 'repMax') return Object.keys(q.rep).reduce(function (a, f) { return Math.max(a, q.rep[f]); }, 0);
    return 0;
  };
  Q.achCheck = function () {
    var S = ST(), q = Q.ensure(S), ch = false;
    (Q.D.achievements || []).forEach(function (a) { if (!q.track.seen[a.id] && Q.stat(a.stat) >= +a.goal) { q.track.seen[a.id] = 1; ch = true; Q.notify('🏆 Thành tựu: ' + a.name); } });
    if (ch) Q.C.persist();
  };
  Q.achClaim = function (id) {
    var a = (Q.D.achievements || []).filter(function (x) { return x.id === id; })[0], q = Q.ensure(ST());
    if (!a || q.ach[id] || Q.stat(a.stat) < +a.goal) return { ok: false, msg: 'Chưa đạt thành tựu.' };
    var r = Q.grant(a.reward || {}); if (!r.ok) return r;
    q.ach[id] = 1; Q.C.persist(); Q.C.renderHUD(); return { ok: true, msg: 'Nhận thưởng thành tựu: ' + (r.msg || '—') };
  };

  /* ===== Giao diện (cùng phong cách khung hiện tại: .row .btn .tabs .note) ===== */
  var row = function (a, b) { return '<div class="row"><span>' + a + '</span><span>' + b + '</span></div>'; };
  var bar = function (v, n) { return '<div class="jbar"><i style="width:' + Math.min(100, v / n * 100) + '%"></i></div>'; };
  Q.refresh = function () {
    var el = document.getElementById('qtrack'), S = ST(); if (!el || !S) return;
    var q = S.q && S.q.pin ? Q.def(S.q.pin) : null, s = q ? Q.state(q) : '';
    if (!q || (s !== 'active' && s !== 'done')) { el.style.display = 'none'; return; }
    var t = s === 'done' ? '✔ Đủ mục tiêu — nhận thưởng' : (q.objectives || []).map(function (o, i) { return Q.objText(q, i) + ' ' + Q.progText(q, i); }).join(' · ');
    el.innerHTML = '<b>' + esc(q.name) + '</b><span>' + esc(t) + '</span>'; el.style.display = 'block';
  };
  function where(id, at) { var n = id && Q.npc(id); if (n) return 'NPC ' + esc(n.name); if (at) return 'ô (' + at.x + ', ' + at.y + ')'; return null; }
  /* 5 phẩm cấp nhiệm vụ (thấp → cao), cùng hệ với phẩm chất trang bị. q.grade thiếu = 1 */
  Q.GN = ['', 'Phổ thông', 'Tốt', 'Hiếm', 'Sử thi', 'Truyền thuyết']; Q.GC = ['', '#a89f8d', '#4fa86a', '#3d7fd6', '#8c52d6', '#d9a21b']; Q.fg = 0;
  Q.grade = function (q) { var g = Math.round(+(q && q.grade)); return g >= 1 ? Math.min(5, g) : 1; };
  Q.list = function (scope) {
    var by = { active: [], done: [], avail: [], claimed: [] };
    Q.D.quests.forEach(function (q) { if ((q.scope || 'system') !== scope) return; if (Q.fg && Q.grade(q) !== Q.fg) return; var s = Q.state(q); if (by[s]) by[s].push(q); });
    Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return Q.grade(a) - Q.grade(b); }); });
    var one = function (q, s) {
      var o = q.objectives || [], pr = o.length ? o.map(function (x, i) { return x.t === 'deliver' ? (Q.prog(q, i) >= 2 ? '2/2' : Q.prog(q, i) + '/2') : Q.prog(q, i) + '/' + Q.objN(x); }).join(' · ') : '';
      return '<button class="btn" style="border-left:4px solid ' + Q.GC[Q.grade(q)] + '" data-a="q:d:' + esc(q.id) + '">' + (s === 'done' ? '✔ ' : s === 'avail' ? '❗ ' : s === 'claimed' ? '✓ ' : '📜 ') + esc(q.name) + '<small>◆ ' + Q.GN[Q.grade(q)] + ' · ' + Q.stateName(s) + (pr && (s === 'active' || s === 'done') ? ' · ' + pr : '') + '</small></button>';
    };
    var h = '', add = function (t, k) { if (by[k].length) h += '<h2 style="font-size:13px;margin:10px 0 2px;color:var(--gold)">' + t + ' (' + by[k].length + ')</h2>' + by[k].map(function (q) { return one(q, k); }).join(''); };
    add('Đang làm', 'active'); add('Chờ nhận thưởng', 'done'); add('Có thể nhận', 'avail'); add('Đã hoàn thành', 'claimed');
    return h || '<p>Chưa có nhiệm vụ nào ở mục này.</p>';
  };
  Q.panel = function (scope) {
    scope = scope || 'country';
    var tabs = '<div class="tabs"><button data-a="q:tab:country"' + (scope === 'country' ? ' class="on"' : '') + '>Quốc gia</button><button data-a="q:tab:sect"' + (scope === 'sect' ? ' class="on"' : '') + '>Tông môn</button><button data-a="q:tab:system"' + (scope === 'system' ? ' class="on"' : '') + '>Hệ thống</button></div>';
    var has = Q.D.quests.some(function (q) { return (q.scope || 'system') === scope; }), body = '';
    if (has) tabs += '<div class="tabs" style="flex-wrap:wrap"><button data-a="q:fg:' + scope + ':0"' + (!Q.fg ? ' class="on"' : '') + '>Mọi phẩm cấp</button>' + [1, 2, 3, 4, 5].map(function (i) { return '<button data-a="q:fg:' + scope + ':' + i + '"' + (Q.fg === i ? ' class="on"' : '') + ' style="border-left:4px solid ' + Q.GC[i] + '">' + Q.GN[i] + '</button>'; }).join('') + '</div>';
    if (scope === 'sect' && !has) body = '<p>Nhiệm vụ tông môn.</p><div class="note">⚠ Chưa kết nối hệ thống thật: chưa có nhiệm vụ tông môn nào trong database/quests.json (thêm bằng editmisson.html, chọn phạm vi “Tông môn”).</div>';
    else body = Q.list(scope);
    body += '<button class="btn" data-a="q:ach:combat">🏆 Thành tựu<small>Dị thú đã hạ, sự kiện hoàn thành, v.v.</small></button>';
    return ['Nhiệm vụ', tabs + body];
  };
  Q.detail = function (id) {
    var q = Q.def(id); if (!q) return Q.panel(); var s = Q.state(q), S = ST(), h = '';
    h += '<p><span class="tag" style="background:#e4c27b">' + esc({ main: 'Chính tuyến', side: 'Phụ tuyến', chain: 'Chuỗi', system: 'Hệ thống', daily: 'Lặp lại', repeat: 'Lặp lại' }[q.type] || q.type || 'Nhiệm vụ') + '</span><span class="tag" style="background:' + Q.GC[Q.grade(q)] + ';color:#fff">' + Q.GN[Q.grade(q)] + '</span><b style="color:var(--gold)">' + esc(q.name) + '</b></p>';
    h += '<p>' + esc(Q.fmt(q.desc || '', Q.vars(q))) + '</p>' + row('Trạng thái', Q.stateName(s));
    (q.objectives || []).forEach(function (o, i) { var v = Q.prog(q, i), n = Q.objN(o); h += '<div class="jr" style="padding:6px 0;border-bottom:1px dotted #776644">' + (v >= n ? '✔ ' : '◻ ') + esc(Q.objText(q, i)) + '<small style="display:block;color:var(--mut)">' + esc(Q.progText(q, i)) + '</small>' + bar(v, n) + '</div>'; });
    h += row('Thưởng', esc(Q.rewardText(q.rewards)));
    if (q.choices && q.choices.length) h += '<div class="note">Khi trả nhiệm vụ bạn sẽ chọn hướng giải quyết — lựa chọn ảnh hưởng danh tiếng và các nhiệm vụ/hội thoại sau này.</div>';
    var gv = where(q.giver, q.giveAt), tn = where(q.turnIn || (q.giver || ''), q.turnAt);
    if (s === 'avail') {
      if (q.giver && Q.npc(q.giver)) h += '<div class="note">Nhận tại ' + gv + '.</div>';
      else if (q.giveAt && !near(q.giveAt)) h += '<div class="note">Cần đến ' + gv + ' (bán kính ' + (+q.giveAt.r || 0) + ' ô) để nhận.</div>';
      else h += '<button class="btn pri" data-a="q:acc:' + esc(q.id) + '">Nhận nhiệm vụ</button>';
    }
    if (s === 'active' || s === 'done') {
      h += '<button class="btn" data-a="q:pin:' + esc(q.id) + '">📌 ' + (S.q.pin === q.id ? 'Đang theo dõi' : 'Theo dõi trên bản đồ') + '</button>';
      if (s === 'done') {
        var tnpc = q.turnIn || q.giver;
        if (tnpc && Q.npc(tnpc)) h += '<div class="note">Trả nhiệm vụ tại ' + tn + '.</div>';
        else if (q.turnAt && !near(q.turnAt)) h += '<div class="note">Cần đến ' + tn + ' (bán kính ' + (+q.turnAt.r || 0) + ' ô) để nhận thưởng.</div>';
        else h += claimBtns(q);
      }
    }
    h += '<button class="btn" data-a="q:tab:' + esc(q.scope || 'system') + '">← Danh sách</button>';
    return [q.name, h];
  };
  function claimBtns(q) {
    if (q.choices && q.choices.length) return '<div class="note">Chọn hướng giải quyết:</div>' + q.choices.map(function (c, i) { return '<button class="btn pri" data-a="q:claim:' + esc(q.id) + ':' + i + '">' + esc(c.text) + '<small>' + esc(Q.rewardText(merge(q.rewards, c.rewards)) + (c.rep && Object.keys(c.rep).some(function (k) { return +c.rep[k]; }) ? ' · ' + Q.rewardText({ rep: c.rep }) : '')) + '</small></button>'; }).join('');
    return '<button class="btn pri" data-a="q:claim:' + esc(q.id) + ':0">Nhận thưởng</button>';
  }
  Q.achPanel = function (br) {
    var S = ST(), q = Q.ensure(S), tabs = '<div class="tabs" style="flex-wrap:wrap">' + BR.map(function (b) { return '<button data-a="q:ach:' + b[0] + '"' + (b[0] === br ? ' class="on"' : '') + '>' + b[1] + '</button>'; }).join('') + '</div>', h = '';
    if (br === 'combat') {
      h += row('Dị thú đã hạ', S.kills) + row('Boss đã hạ', q.track.boss | 0);
      var names = q.track.names || {}, ks = Object.keys(q.track.kills);
      ks.sort(function (a, b) { return q.track.kills[b] - q.track.kills[a]; }).forEach(function (id) { h += row('· ' + esc(names[id] || id), q.track.kills[id]); });
    } else if (br === 'explore') {
      h += row('Sự kiện hoàn thành', S.cleared) + row('Thành trì đã ghé', Q.stat('visited'));
    } else if (br === 'quest') {
      h += row('Nhiệm vụ đã hoàn thành', Q.stat('quests'));
    } else {
      var fs = Q.D.factions || []; if (!fs.length) h += '<p>Chưa có phe phái.</p>';
      fs.forEach(function (f) { var l = Q.repLevel(f); h += row(esc(f), (q.rep[f] || 0) + ' · ' + esc(l.name)); });
    }
    var A = (Q.D.achievements || []).filter(function (a) { return a.branch === br; });
    h += '<h2 style="font-size:13px;margin:12px 0 2px;color:var(--gold)">Mốc thành tựu</h2>';
    h += A.map(function (a) {
      var v = Q.stat(a.stat), n = +a.goal || 1, ok = v >= n, got = q.ach[a.id];
      return '<div class="jr" style="padding:6px 0;border-bottom:1px dotted #776644">' + (got ? '🏆 ' : ok ? '🎁 ' : '◻ ') + esc(a.name) + '<small style="display:block;color:var(--mut)">' + Math.min(v, n) + '/' + n + (a.reward ? ' · Thưởng: ' + esc(Q.rewardText(a.reward)) : '') + '</small>' + bar(v, n) + (ok && !got ? '<button class="btn pri" data-a="q:achc:' + esc(a.id) + ':' + br + '">Nhận thưởng</button>' : '') + '</div>';
    }).join('') || '<p>Chưa có mốc nào.</p>';
    return ['Thành tựu', tabs + h];
  };

  /* ===== NPC + hội thoại ===== */
  var ICON = { nhiem_vu: '📜', thuong: '🏪', dan: '🙂', dan_su: '📖', tho_ren: '⚒', thu_ve: '🛡', tong_mon: '🏯', khac: '🧑' };
  var V = null; /* phiên hội thoại hiện tại {npc,node,msg,view} */
  function pick(t) { if (Array.isArray(t)) { var r = t.filter(function (x) { return Q.cond(x['if']); })[0]; return r ? r.text : ''; } return t || ''; }
  Q.openNpc = function (n, first) {
    if (first !== false) { V = { npc: n.id, node: null, msg: '', view: 'main' }; Q.talk(n.id); Q.reach(n.id); }
    Q.render();
  };
  Q.render = function () {
    var n = Q.npc(V && V.npc); if (!n) return Q.C.closeModal();
    var S = ST(), dlg = n.dialog && n.dialog.nodes, node = V.node && dlg ? dlg[V.node] : null, h = '', lv = Q.repLevel(n.faction || ''), C = Q.C;
    var av = n.img && /^data:image\//.test(n.img) ? '<img src="' + esc(n.img) + '" style="width:100%;height:100%;object-fit:cover" alt="">' : (ICON[n.role] || '🧑');
    h += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><div class="av" style="width:46px;height:46px;font-size:24px">' + av + '</div><div class="nm"><b style="font-size:14px">' + esc(n.name) + '</b><small>' + esc(n.title || '') + (n.faction ? ' · ' + esc(n.faction) + ' (' + esc(lv.name) + ')' : '') + '</small></div></div>';
    if (V.msg) h += '<div class="note" style="margin:0 0 8px;color:var(--gold)">' + esc(V.msg) + '</div>';
    if (V.view === 'shop') h += shopHtml(n);
    else if (V.view === 'turn') h += turnHtml(n, V.q);
    else if (V.view === 'guide') h += '<p>' + esc(n.guide || '') + '</p><button class="btn" data-a="n:main">← Quay lại</button>';
    else if (node) {
      h += '<p style="color:var(--txt)">' + esc(pick(node.text)) + '</p>';
      (node.choices || []).forEach(function (c, i) { if (Q.cond(c['if'])) h += '<button class="btn" data-a="n:ch:' + i + '">' + esc(c.text) + '</button>'; });
      if (!(node.choices || []).length) h += '<button class="btn" data-a="n:main">← Quay lại</button>';
    } else h += mainHtml(n);
    C.openModal(n.name, h);
  };
  function mainHtml(n) {
    var S = ST(), h = '', dlg = n.dialog, fns = n.functions || [], lines = n.lines || [];
    var greet = dlg && dlg.nodes && dlg.start && dlg.nodes[dlg.start] ? pick(dlg.nodes[dlg.start].text) : (lines.length ? lines[Math.floor(Math.random() * lines.length)] : '');
    if (greet) h += '<p style="color:var(--txt)">' + esc(greet) + '</p>';
    if (dlg && dlg.start && dlg.nodes && dlg.nodes[dlg.start]) h += '<button class="btn" data-a="n:go:' + esc(dlg.start) + '">💬 Trò chuyện</button>';
    var qs = Q.D.quests.filter(function (q) { return q.giver === n.id || q.turnIn === n.id; });
    qs.forEach(function (q) {
      var s = Q.state(q);
      if (s === 'avail' && q.giver === n.id && (!q.giveAt || near(q.giveAt))) h += '<button class="btn pri" data-a="n:acc:' + esc(q.id) + '">❗ ' + esc(q.name) + '<small>Nhận nhiệm vụ · ' + esc(Q.rewardText(q.rewards)) + '</small></button>';
      else if (s === 'done' && (q.turnIn || q.giver) === n.id && (!q.turnAt || near(q.turnAt))) h += '<button class="btn pri" data-a="n:turn:' + esc(q.id) + '">✔ ' + esc(q.name) + '<small>Trả nhiệm vụ</small></button>';
      else if (s === 'active' && (q.turnIn || q.giver) === n.id) h += '<button class="btn" data-a="q:d:' + esc(q.id) + '">📜 ' + esc(q.name) + '<small>Đang làm · xem tiến độ</small></button>';
    });
    fns.forEach(function (f) {
      if (f === 'shop' && (n.shop || []).length) h += '<button class="btn" data-a="n:fn:shop">🏪 Cửa hàng<small>Giá phụ thuộc danh tiếng</small></button>';
      else if (f === 'rest') { var c = n.restCost || {}, ct = Q.rewardText({ stones: c }); h += '<button class="btn" data-a="n:fn:rest">🛏 Nghỉ ngơi<small>Hồi đầy HP, linh lực, hồn lực · ' + (ct === '—' ? 'Miễn phí' : 'Phí ' + esc(ct.replace(/\+/g, ''))) + '</small></button>'; }
      else if (f === 'guide' && n.guide) h += '<button class="btn" data-a="n:fn:guide">📖 Hướng dẫn</button>';
      else if (f.indexOf('job:') === 0) { var jid = f.slice(4), jn = Q.C.jobName(jid); if (jn) h += '<button class="btn" data-a="n:fn:' + esc(f) + '">⚒ Học nghề ' + esc(jn) + '<small>' + (S.jobs && S.jobs[jid] ? 'Đã học' : 'Bắt đầu từ cấp 1') + '</small></button>'; }
    });
    return h + '<button class="btn" data-a="close">Rời đi</button>';
  }
  function shopHtml(n) {
    var S = ST(), d = Q.repLevel(n.faction || '').discount | 0, h = '<p>Linh thạch hiện có: ' + SN.map(function (k) { return (S.stones[k] | 0) + ' ' + SL[k]; }).join(' · ') + (d ? ' · Chiết khấu danh tiếng ' + d + '%' : '') + '</p>';
    (n.shop || []).forEach(function (it, i) {
      var nm = Q.C.IT && Q.C.IT[it.id] ? Q.C.IT[it.id][0] : it.id, pr = price(it, d);
      h += '<button class="btn" data-a="n:buy:' + i + '">' + esc(nm) + '<small>' + esc(SN.filter(function (k) { return pr[k]; }).map(function (k) { return pr[k] + ' LT ' + SL[k]; }).join(' + ') || 'Miễn phí') + '</small></button>';
    });
    return h + '<button class="btn" data-a="n:main">← Quay lại</button>';
  }
  function price(it, d) { var o = {}; SN.forEach(function (k) { if (it.price && it.price[k]) o[k] = Math.max(1, Math.round(+it.price[k] * (100 - (d || 0)) / 100)); }); return o; }
  function turnHtml(n, id) {
    var q = Q.def(id); if (!q) return '';
    return '<p>' + esc(Q.fmt(q.onDone || 'Ngươi đã hoàn thành rồi sao?', Q.vars(q))) + '</p>' + claimBtns(q).replace(/data-a="q:claim:/g, 'data-a="n:claim:') + '<button class="btn" data-a="n:main">← Quay lại</button>';
  }
  function doActs(n, acts) {
    var S = ST(), q = Q.ensure(S), end = false;
    (acts || []).forEach(function (a) {
      if (a.a === 'accept') { var r = Q.accept(a.q); V.msg = r.msg; Q.reach(n.id); }
      else if (a.a === 'flag') q.flags[a.k] = a.v === 0 ? 0 : 1;
      else if (a.a === 'rep') q.rep[a.f] = (q.rep[a.f] || 0) + (+a.n || 0);
      else if (a.a === 'give') { var r2 = Q.grant({ xp: a.xp, stones: a.stones, items: a.items }); V.msg = r2.ok ? 'Nhận: ' + r2.msg : r2.msg; }
      else if (a.a === 'openquests') V.node = null;
      else if (a.a === 'shop') V.view = 'shop';
      else if (a.a === 'rest') fn(n, 'rest');
      else if (a.a === 'end') end = true;
    });
    Q.C.persist(); Q.refresh(); return end;
  }
  function fn(n, f) {
    var S = ST(), c = n.restCost || {};
    if (f === 'shop') { V.view = 'shop'; Q.use(n.id, 'shop'); }
    else if (f === 'guide') { V.view = 'guide'; Q.use(n.id, 'guide'); }
    else if (f === 'rest') {
      if (!SN.every(function (k) { return (S.stones[k] | 0) >= (+c[k] || 0); })) { V.msg = 'Không đủ linh thạch để nghỉ ngơi.'; return; }
      SN.forEach(function (k) { if (c[k]) S.stones[k] -= +c[k]; }); Q.C.rest(true); V.msg = 'Đã nghỉ ngơi: HP, linh lực, hồn lực đầy. Qua một ngày.'; Q.use(n.id, 'rest');
    } else if (f.indexOf('job:') === 0) {
      var jid = f.slice(4); if (!Q.C.jobName(jid)) { V.msg = 'Nghề này chưa có trong database.'; return; }
      S.jobs = S.jobs || {}; if (S.jobs[jid]) V.msg = 'Bạn đã học nghề này.'; else { S.jobs[jid] = { lv: 1, xp: 0 }; V.msg = 'Đã học nghề ' + Q.C.jobName(jid) + ' (cấp 1).'; Q.C.say('Học nghề ' + Q.C.jobName(jid) + '.'); }
      Q.use(n.id, f);
    }
    Q.C.persist(); Q.C.renderHUD();
  }
  /* Bộ định tuyến hành động từ index.html: trả true nếu đã xử lý */
  Q.act = function (a) {
    var C = Q.C, p = a.split(':'), S = ST(), r, n;
    if (p[0] === 'q') {
      if (p[1] === 'tab') { var x = Q.panel(p[2]); C.openModal(x[0], x[1]); }
      else if (p[1] === 'fg') { Q.fg = +p[3] || 0; var xf = Q.panel(p[2]); C.openModal(xf[0], xf[1]); }
      else if (p[1] === 'd') { var d = Q.detail(p[2]); C.openModal(d[0], d[1]); }
      else if (p[1] === 'acc') { var qd = Q.def(p[2]); if (qd && qd.giver && Q.npc(qd.giver)) C.toast('Nhận nhiệm vụ này tại NPC.'); else if (qd && qd.giveAt && !near(qd.giveAt)) C.toast('Chưa đến đúng vị trí nhận nhiệm vụ.'); else { r = Q.accept(p[2]); C.toast(r.msg); } var d2 = Q.detail(p[2]); C.openModal(d2[0], d2[1]); }
      else if (p[1] === 'claim') { var qc = Q.def(p[2]); if (qc && (qc.turnIn || qc.giver) && Q.npc(qc.turnIn || qc.giver)) C.toast('Trả nhiệm vụ này tại NPC.'); else if (qc && qc.turnAt && !near(qc.turnAt)) C.toast('Chưa đến đúng vị trí trả nhiệm vụ.'); else { r = Q.claim(p[2], +p[3] || 0); C.toast(r.msg); } var d3 = Q.detail(p[2]); C.openModal(d3[0], d3[1]); }
      else if (p[1] === 'pin') { Q.ensure(S).pin = p[2]; C.persist(); Q.refresh(); var d4 = Q.detail(p[2]); C.openModal(d4[0], d4[1]); }
      else if (p[1] === 'ach') { var ap = Q.achPanel(p[2]); C.openModal(ap[0], ap[1]); }
      else if (p[1] === 'achc') { r = Q.achClaim(p[2]); C.toast(r.msg); var ap2 = Q.achPanel(p[3]); C.openModal(ap2[0], ap2[1]); }
      return true;
    }
    if (p[0] !== 'n') return false;
    n = Q.npc(V && V.npc); if (!n) return true;
    V.msg = '';
    if (p[1] === 'main') { V.node = null; V.view = 'main'; }
    else if (p[1] === 'go') { V.node = p[2]; V.view = 'main'; }
    else if (p[1] === 'ch') {
      var node = n.dialog.nodes[V.node], c = node && (node.choices || [])[+p[2]]; if (c) { var end = doActs(n, c.do); if (end) { C.closeModal(); return true; } if (c.go) V.node = c.go; else if (!(c.do || []).some(function (z) { return z.a === 'openquests' || z.a === 'shop'; })) V.node = null; }
    }
    else if (p[1] === 'acc') { r = Q.accept(p[2]); V.msg = r.msg; Q.reach(n.id); }
    else if (p[1] === 'turn') { var q = Q.def(p[2]); if (q && q.choices && q.choices.length) { V.view = 'turn'; V.q = p[2]; } else { r = Q.claim(p[2], 0); V.msg = r.msg; } }
    else if (p[1] === 'claim') { r = Q.claim(p[2], +p[3] || 0); V.msg = r.msg; V.view = 'main'; if (r.ok && r.done && r.done.onDone) V.msg = r.done.onDone + ' — ' + r.msg; }
    else if (p[1] === 'fn') { var f = p.slice(2).join(':'); if (f === 'shop' || f === 'guide' || f === 'rest' || f.indexOf('job:') === 0) fn(n, f); }
    else if (p[1] === 'buy') {
      var it = (n.shop || [])[+p[2]]; if (it) {
        var pr = price(it, Q.repLevel(n.faction || '').discount | 0);
        if (!SN.every(function (k) { return (S.stones[k] | 0) >= (pr[k] || 0); })) V.msg = 'Không đủ linh thạch.';
        else { var g2 = Q.grant({ items: [{ id: it.id, q: it.q || 1 }] }); if (g2.ok) { SN.forEach(function (k) { if (pr[k]) S.stones[k] -= pr[k]; }); V.msg = 'Đã mua: ' + g2.msg; Q.use(n.id, 'buy'); C.persist(); C.renderHUD(); } else V.msg = g2.msg; }
      }
    }
    Q.render(); return true;
  };
  Q.init = function (ctx) { Q.C = ctx; };
})(typeof window != 'undefined' ? window : globalThis);
(function (g) {
  var Q = g.VG.quest;
  /* Dấu trên đầu NPC: '!' có nhiệm vụ để nhận, '?' có nhiệm vụ để trả */
  Q.mark = function (id) {
    var m = '', S = Q.C.ST(), p = S.pos;
    Q.D.quests.forEach(function (q) {
      var s = Q.state(q), n = q.giver === id;
      if (s === 'done' && (q.turnIn || q.giver) === id && (!q.turnAt || Math.max(Math.abs(p.x - q.turnAt.x), Math.abs(p.y - q.turnAt.y)) <= (+q.turnAt.r || 0))) m = '?';
      else if (!m && s === 'avail' && n && (!q.giveAt || Math.max(Math.abs(p.x - q.giveAt.x), Math.abs(p.y - q.giveAt.y)) <= (+q.giveAt.r || 0))) m = '!';
    });
    return m;
  };
})(typeof window != 'undefined' ? window : globalThis);
