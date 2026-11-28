/* ============================================================
 * battle-ui.js — lớp HIỂN THỊ của màn chiến đấu MSL (không chứa logic trận)
 *
 * Logic chiến đấu (JS hôm nay, server/Godot sau này) chỉ cần gọi API bên dưới:
 *   BattleUI.init({scene, sceneName, round})
 *   BattleUI.addUnit({...}) / updateUnit(id, patch) / setActive(id) / setTarget(id) / markDead(id)
 *   BattleUI.setHand(skills, {nl, hl, canAct}) / setResources(nl, hl) / setCanAct(bool)
 *   BattleUI.fx.{lunge, hit, pop, beam, slash, shake, camera, hitStop}
 *   BattleUI.on('skill'|'end'|'run'|'bag'|'summon'|'auto'|'speed'|'settings'|'target', fn)
 * Chi tiết: README.md
 * ============================================================ */
(function (global) {
  'use strict';

  const W = 640, H = 360;
  const Q = new URLSearchParams(location.search);
  const $ = (s, r) => (r || document).querySelector(s);
  const mk = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- cấu hình (đổi ở đây, đừng rải số khắp code) ---------- */
  const CFG = {
    playerId: 'pm',
    hideBasic: true,                                   // bài quạt CHỈ hiện skill, bỏ đánh thường
    isBasic: s => !!(s.basic || s.cat === 'basic' || !s.r),
    fan: { flat: true, cx: 320, bottom: 356, radius: 420, spacing: 46, maxSpread: 424, w: 48, h: 68 },   // hàng bài thẳng, giữa màn hình (x≈84..574); flat:false = quạt cong
    scaleMode: Q.get('scale') === 'fit' ? 'fit' : 'int',   // int: từ ×2 trở lên chỉ phóng số nguyên; fit: luôn co dãn vừa màn
    speeds: [1, 2, 3, 5],
    bgFormats: ['png', 'webp']                         // thứ tự thử đuôi ảnh nền (tầng 2 của fallback)
  };
  /* Tâm chân (feet) của từng vị trí đứng, toạ độ trong khung 640x360 */
  const SLOTS = {
    ally0: { x: 196, y: 274 }, ally1: { x: 104, y: 282 }, ally2: { x: 108, y: 258 }, ally3: { x: 52, y: 262 },
    enemy0: { x: 448, y: 266 }, enemy1: { x: 548, y: 238 }, enemy2: { x: 572, y: 276 }, enemy3: { x: 510, y: 284 }
  };
  const SCENES = { grass: 'Đồng bằng', forest: 'Rừng', water: 'Mặt nước', rock: 'Núi đá', sand: 'Bãi cát', snow: 'Tuyết sơn',
    swamp: 'Đầm lầy', road: 'Đường mòn', ruin: 'Phế tích', herb: 'Linh thảo', wall: 'Tường thành', city: 'Thành trì' };
  const RC = ['#a89f8d', '#8fb36a', '#4aa3d8', '#a56bd9', '#e0763a', '#d9a21b'];   // màu viền theo phẩm chất
  const typeOf = eff => eff === 'dmg' ? ['ATTACK', 't-attack'] : eff === 'buff' ? ['BUFF', 't-buff'] : ['SUPPORT', 't-support'];

  const UI = {
    cfg: CFG, scale: 1, units: new Map(), targetId: null, activeId: null,
    hand: { skills: [], nl: 0, hl: 0, canAct: false }, handlers: {}, auto: false, speed: 1
  };
  global.BattleUI = UI;

  /* ---------- sự kiện ---------- */
  UI.on = (e, fn) => { (UI.handlers[e] = UI.handlers[e] || []).push(fn); return UI; };
  const emit = (e, ...a) => (UI.handlers[e] || []).forEach(fn => fn(...a));

  /* ============ scale số nguyên cho khung 640x360 ============ */
  function fit() {
    const g = $('#game'), vw = innerWidth, vh = innerHeight;
    let s = Math.min(vw / W, vh / H);
    const forced = parseFloat(Q.get('scale'));
    if (forced > 0) s = forced;
    else if (CFG.scaleMode === 'int' && s >= 2) s = Math.floor(s);   // ≥×2: số nguyên (pixel sắc nét); <×2: co vừa màn
    const t = 'translate(' + Math.round((vw - W * s) / 2) + 'px,' + Math.round((vh - H * s) / 2) + 'px) scale(' + s + ')';
    g.style.transform = t; g.style.setProperty('--gt', t);
    UI.scale = s;
  }

  /* ============ nền (3 tầng fallback: custom → assets/combat-bg → SVG cũ) ============ */
  UI.setScene = function (key, name, customUrl) {
    $('#sceneName').textContent = name || SCENES[key] || key;
    const bg = $('#bg'), fb = $('#bg-fallback');
    const list = [customUrl].concat(CFG.bgFormats.map(f => 'assets/combat-bg/' + key + '.' + f)).filter(Boolean);
    (function next(i) {
      if (i >= list.length) { bg.style.display = 'none'; fb.style.display = ''; emit('bgfallback', key); return; }
      const im = new Image();
      im.onload = () => { bg.src = list[i]; bg.style.display = ''; fb.style.display = 'none'; $('#letterbox').style.backgroundImage = 'url(' + list[i] + ')'; };
      im.onerror = () => next(i + 1);
      im.src = list[i];
    })(0);
  };
  UI.setRound = n => { $('#roundNo').textContent = n; };

  /* ============ đơn vị trên sân ============ */
  function mountBar(sel, o) { const b = new Bar(o); $(sel).appendChild(b.el); return b; }

  UI.addUnit = function (d) {
    d = Object.assign({ hp: 1, hpMax: 1, shield: 0, shieldMax: 0, atb: 0, buffs: [], icon: '❔', name: d.id }, d);
    const slot = typeof d.slot === 'string' ? SLOTS[d.slot] : d.slot;
    const sp = d.sprite || { w: 96, h: 96, bodyH: 80 };
    const lift = d.lift || 0;
    const team = d.team === 'enemy' ? 'enemy' : 'ally';
    const el = mk('div', 'unit ' + team + (d.fly ? ' fly' : ''));
    el.dataset.id = d.id;
    el.style.left = slot.x + 'px'; el.style.top = slot.y + 'px'; el.style.zIndex = Math.round(slot.y);
    el.style.setProperty('--team', team === 'ally' ? 'var(--ally)' : 'var(--foe)');
    el.style.setProperty('--sw', Math.round(sp.w * 0.62) + 'px');
    el.style.setProperty('--lift', lift);
    el.appendChild(mk('div', 'u-shadow')); el.appendChild(mk('div', 'u-ring'));

    const fly = mk('div', 'u-fly'), body = mk('div', 'u-body'), spr = mk('div', 'u-sprite');
    if (d.domId) spr.id = d.domId;                       // #pm #dm #petm #em (giữ id cũ cho test)
    Object.assign(spr.style, { width: sp.w + 'px', height: sp.h + 'px', left: (-sp.w / 2) + 'px', top: (-sp.h) + 'px' });
    if (typeof d.mount === 'function') d.mount(spr);     // ráp renderer cũ, vd VG.bag.renderModularMecha(spr, SV, LIB)
    else if (sp.src) { const im = new Image(); im.src = sp.src; im.draggable = false; if (d.flip) im.style.transform = 'scaleX(-1)'; spr.appendChild(im); }
    body.appendChild(spr); fly.appendChild(body); el.appendChild(fly);

    const hudW = d.hudW || 56;
    const hud = mk('div', 'hud');
    hud.style.bottom = (lift + (sp.bodyH || sp.h) + 3) + 'px';
    hud.innerHTML = '<div class="hud-name"><span class="nm"></span></div><div class="hud-bars"></div><div class="hud-buffs"></div>';
    const bars = $('.hud-bars', hud);
    const sh = new Bar({ kind: 'slant', color: 'cyan', width: hudW });
    const hp = new Bar({ kind: 'slant', color: team === 'ally' ? 'green' : 'red', width: hudW });
    const atb = new Bar({ kind: 'pill_sm', color: 'silver', width: hudW - 6, clipDiv: true, fillId: d.atbId });
    bars.appendChild(sh.el); bars.appendChild(hp.el);
    if (d.hudAtb) bars.appendChild(atb.el);               // mặc định tắt: ATB xem ở turn rail + panel
    el.appendChild(hud);
    $('#units').appendChild(el);

    const item = mk('div', 'tr-item ' + team, esc(d.icon));
    $('#turn-rail').appendChild(item);

    const u = { d, el, body, spr, slot, sp, lift, team, hud: { root: hud, hp, sh, atb, name: $('.nm', hud), buffs: $('.hud-buffs', hud) }, rail: item, first: true };
    UI.units.set(d.id, u);
    el.addEventListener('click', () => { if (team === 'enemy' && !u.dead) { UI.setTarget(d.id); emit('target', d.id); } });
    apply(u, null);
    u.first = false;
    if (team === 'enemy' && !UI.targetId) UI.setTarget(d.id);
    return u;
  };

  UI.updateUnit = function (id, patch) {
    const u = UI.units.get(id); if (!u) return;
    Object.assign(u.d, patch);
    apply(u, patch);
  };

  /* patch = null → vẽ tất cả */
  function apply(u, patch) {
    const d = u.d, has = k => !patch || k in patch, h = u.hud, inst = u.first;
    if (has('name')) h.name.textContent = d.name;
    if (has('hp') || has('hpMax')) h.hp.set(d.hp, d.hpMax, inst);
    if (has('shield') || has('shieldMax')) { const on = d.shield > 0; h.sh.show(on); h.sh.set(d.shield, d.shieldMax || d.shield, inst); }
    if (has('atb')) { h.atb.set(d.atb, 1, true); railUpdate(); }
    if (has('buffs')) renderBuffs(h.buffs, d.buffs, 2);
    if (has('icon')) u.rail.innerHTML = esc(d.icon);
    if (d.id === CFG.playerId) panelPlayer(u, patch);
    if (d.id === UI.targetId) panelEnemy(u, patch);
  }

  function renderBuffs(box, list, max) {
    box.innerHTML = '';
    (list || []).slice(0, max).forEach(b => box.appendChild(mk('span', 'chip ' + (b.kind || ''), esc(b.label) + (b.turns != null ? ' (' + b.turns + ')' : ''))));
    if ((list || []).length > max) box.appendChild(mk('span', 'chip', '+' + (list.length - max)));
  }

  /* ---------- panel phe mình / mục tiêu ---------- */
  const P = {};
  function buildPanels() {
    P.hp = mountBar('#ppHp', { kind: 'slant', color: 'green', width: 52 });
    P.sh = mountBar('#ppSh', { kind: 'slant', color: 'cyan', width: 52 });
    P.atb = mountBar('#ppAtb', { kind: 'pill_sm', color: 'silver', width: 52, clipDiv: true, fillId: 'pa' });
    P.nl = mountBar('#ppNl', { kind: 'pill_lg', color: 'yellow', width: 54, lag: false });
    P.hl = mountBar('#ppHl', { kind: 'slant', color: 'purple', width: 54 });
    P.ehp = mountBar('#epHp', { kind: 'slant', color: 'red', width: 110 });
    P.eatb = mountBar('#epAtb', { kind: 'pill_sm', color: 'silver', width: 80, clipDiv: true, fillId: 'ea' });
  }
  function panelPlayer(u, patch) {
    const d = u.d, has = k => !patch || k in patch;
    if (has('name')) $('#ppName').textContent = d.name;
    if (has('tag')) { $('#ppTag').textContent = d.tag || ''; $('#ppTag').style.display = d.tag ? '' : 'none'; }
    if (has('icon')) $('#ppIcon').textContent = d.icon;
    if (has('hp') || has('hpMax')) { P.hp.set(d.hp, d.hpMax, u.first); $('#ppHpN').textContent = Math.round(d.hp) + '/' + d.hpMax; }
    if (has('shield') || has('shieldMax')) { P.sh.set(d.shield, d.shieldMax || 1, u.first); $('#ppShN').textContent = Math.round(d.shield) + '/' + (d.shieldMax || 0); }
    if (has('atb')) P.atb.set(d.atb, 1, true);
    if (has('nl') || has('nlMax')) { P.nl.set(d.nl, d.nlMax, true); $('#ppNlN').textContent = Math.round(d.nl) + '/' + d.nlMax; }
    if (has('hl') || has('hlMax')) { P.hl.set(d.hl, d.hlMax, u.first); $('#ppHlN').textContent = Math.round(d.hl) + '/' + d.hlMax; }
    if (has('buffs')) renderBuffs($('#ppBuffs'), d.buffs, 3);
  }
  function panelEnemy(u, patch) {
    const d = u.d, has = k => !patch || k in patch;
    if (has('name')) $('#epName').textContent = d.name;
    if (has('tag')) { $('#epTag').textContent = d.tag || ''; $('#epTag').style.display = d.tag ? '' : 'none'; }
    if (has('icon')) $('#epIcon').textContent = d.icon;
    if (has('hp') || has('hpMax')) { P.ehp.set(d.hp, d.hpMax, !patch); $('#epHpN').textContent = Math.round(d.hp) + '/' + d.hpMax; }
    if (has('atb')) P.eatb.set(d.atb, 1, true);
    if (has('nl')) $('#epNl').textContent = d.nl != null ? Math.round(d.nl) : '';
    if (has('buffs')) renderBuffs($('#epBuffs'), d.buffs, 3);
  }

  UI.setTarget = function (id) {
    const u = UI.units.get(id); if (!u) return;
    UI.targetId = id;
    UI.units.forEach(x => x.el.classList.toggle('target', x.d.id === id));
    panelEnemy(u, null);
    P.ehp.set(u.d.hp, u.d.hpMax, true);
  };
  UI.setActive = function (id) {
    UI.activeId = id;
    UI.units.forEach(x => { x.el.classList.toggle('active', x.d.id === id); x.rail.classList.toggle('on', x.d.id === id); });
    railUpdate();
  };
  UI.markDead = function (id) {
    const u = UI.units.get(id); if (!u) return;
    u.dead = true; u.el.classList.add('dead'); u.rail.classList.add('dead');
    if (UI.targetId === id) { const n = [...UI.units.values()].find(x => x.team === 'enemy' && !x.dead); if (n) UI.setTarget(n.d.id); }
  };
  UI.revive = function (id) {
    const u = UI.units.get(id); if (!u) return;
    u.dead = false; u.el.classList.remove('dead'); u.rail.classList.remove('dead');
  };

  /* ---------- thứ tự lượt: chân dung chạy dọc theo ATB, trên cùng = sắp ra đòn ---------- */
  function railUpdate() {
    const track = 256 - 22, list = [...UI.units.values()].filter(u => !u.dead);
    list.sort((a, b) => (b.d.id === UI.activeId) - (a.d.id === UI.activeId) || b.d.atb - a.d.atb);
    let prev = -99;
    list.forEach(u => {
      let y = Math.round((1 - clamp(u.d.atb, 0, 1)) * track * 0.92) + 4;
      if (u.d.id === UI.activeId) y = 4;
      y = Math.max(y, prev + 25); prev = y;
      u.rail.style.top = Math.min(y, track) + 'px';
    });
  }

  /* ============ bài quạt cong — chỉ skill ============ */
  const can = s => !s.locked && UI.hand.canAct && UI.hand.nl >= (s.nl || 0) && UI.hand.hl >= (s.hl || 0);

  UI.setHand = function (skills, ctx) {
    Object.assign(UI.hand, ctx || {}); UI.hand.skills = skills || [];
    const box = $('#skills'); box.innerHTML = ''; hideTip();
    const list = UI.hand.skills.filter(s => !(CFG.hideBasic && CFG.isBasic(s)));
    UI.hand.shown = list;
    if (!list.length) { box.appendChild(mk('div', 'empty', 'Chưa có kỹ năng')); return; }
    const f = CFG.fan, n = list.length;
    const sp = Math.min(f.spacing, f.maxSpread / Math.max(1, n - 1));
    list.forEach((s, i) => {
      const th = f.flat ? 0 : (i - (n - 1) / 2) * sp / f.radius;          // rad
      const bx = f.flat ? f.cx + (i - (n - 1) / 2) * sp : f.cx + f.radius * Math.sin(th);
      const by = f.flat ? f.bottom : f.bottom + f.radius - f.radius * Math.cos(th);   // đáy-giữa của lá bài
      const [label, tcls] = typeOf(s.eff);
      const b = mk('button', 'sk ' + tcls + (s.locked ? ' locked' : ''));
      b.type = 'button';
      b.style.setProperty('--x', Math.round(bx - f.w / 2) + 'px');
      b.style.setProperty('--y', Math.round(by - f.h) + 'px');
      b.style.setProperty('--r', (th * 180 / Math.PI).toFixed(1) + 'deg');
      b.style.setProperty('--z', i + 1);
      b.style.setProperty('--rc', RC[clamp(s.r || 1, 0, 5)]);
      b.innerHTML = '<span class="sk-face"></span>' +
        '<span class="sk-cb sk-nl">⚡' + (s.nl || 0) + '</span><span class="sk-cb sk-hl">✦' + (s.hl || 0) + '</span>' +
        '<span class="sk-stars">' + '★'.repeat(clamp(s.r || 0, 0, 5)) + '</span>' +
        '<span class="sk-ic">' + (s.img ? '<img src="' + esc(s.img) + '" alt="">' : esc(s.ic || '✦')) + '</span>' +
        '<span class="sk-type">' + label + '</span><span class="sk-name">' + esc(s.n) + '</span>';
      b._s = s; b._tc = tcls; b._label = label;
      b.addEventListener('mouseenter', () => showTip(b));
      b.addEventListener('mouseleave', hideTip);
      b.addEventListener('click', () => {
        const touch = matchMedia('(hover: none)').matches;
        if (touch && !b.classList.contains('sel')) { box.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); showTip(b); return; }
        if (!can(s)) return;
        box.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); hideTip();
        emit('skill', s, UI.hand.skills.indexOf(s));
      });
      box.appendChild(b);
    });
    handState();
  };
  function handState() { $('#skills').querySelectorAll('.sk').forEach(b => b.classList.toggle('off', !can(b._s))); }
  UI.setResources = (nl, hl) => { UI.hand.nl = nl; UI.hand.hl = hl; handState(); };
  UI.setCanAct = on => { UI.hand.canAct = !!on; handState(); const e = $('#bEnd'); e.disabled = !on; e.classList.toggle('ready', !!on); };

  function showTip(b) {
    const s = b._s, tip = $('#skill-tip');
    tip.style.setProperty('--tc', getComputedStyle(b).getPropertyValue('--tc') || '#277da1');
    tip.innerHTML = '<div class="tt">' + esc(s.n) + '<span class="tg">' + b._label + '</span></div>' + esc(s.d || '') +
      '<div class="cost">Tiêu hao: <span class="nl">⚡ ' + (s.nl || 0) + ' NL</span> · <span class="hl">✦ ' + (s.hl || 0) + ' HL</span></div>';
    tip.classList.remove('hidden');
    const cx = parseFloat(b.style.getPropertyValue('--x')) + CFG.fan.w / 2;       // căn giữa theo lá bài, giữ trong vùng 330..590
    tip.style.left = clamp(Math.round(cx - 107), 84, 574 - 214) + 'px';
  }
  function hideTip() { $('#skill-tip').classList.add('hidden'); }

  /* ============ hiệu ứng ============ */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const center = u => ({ x: u.slot.x, y: u.slot.y - u.lift - (u.sp.bodyH || u.sp.h) * 0.5 });
  const head = u => ({ x: u.slot.x, y: u.slot.y - u.lift - (u.sp.bodyH || u.sp.h) * 0.78 });
  const put = (el, x, y, life) => { el.style.left = x + 'px'; el.style.top = y + 'px'; $('#fx').appendChild(el); setTimeout(() => el.remove(), life); return el; };

  UI.fx = {
    lunge(id) { const u = UI.units.get(id); if (!u) return; const c = u.team === 'ally' ? 'lunge-r' : 'lunge-l'; u.body.classList.remove('lunge-r', 'lunge-l'); void u.body.offsetWidth; u.body.classList.add(c); setTimeout(() => u.body.classList.remove(c), 300); },
    hit(id, ms) { const u = UI.units.get(id); if (!u) return; u.el.classList.add('hit'); setTimeout(() => u.el.classList.remove('hit'), ms || 260); },
    pop(id, text, kind) { const u = UI.units.get(id); if (!u) return; const p = head(u); put(mk('div', 'pop ' + (kind || 'dmg'), esc(text)), p.x + (Math.random() * 14 - 7), p.y, 900); },
    beam(fromId, toId, color) {
      const a = UI.units.get(fromId), b = UI.units.get(toId); if (!a || !b) return;
      const p = center(a), q = center(b), dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
      const e = mk('div', 'beam'); e.style.width = len + 'px'; e.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)'; if (color) e.style.setProperty('--bc', color);
      put(e, p.x, p.y, 260);
    },
    slash(id) { const u = UI.units.get(id); if (!u) return; const p = center(u); put(mk('div', 'slash'), p.x, p.y, 260); },
    shake() { const g = $('#game'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); setTimeout(() => g.classList.remove('shake'), 220); },
    camera(id, zoom, ms) {
      const u = UI.units.get(id), w = $('#world'); if (!u) return;
      const p = center(u);
      w.style.transitionDuration = ((ms || 220) / 1000) + 's';
      w.style.transformOrigin = p.x + 'px ' + p.y + 'px';
      w.style.transform = 'scale(' + (zoom || 1.06) + ')';
    },
    cameraReset(ms) { const w = $('#world'); w.style.transitionDuration = ((ms || 300) / 1000) + 's'; w.style.transform = 'scale(1)'; },
    async hitStop(ms) { const g = $('#game'); g.classList.add('freeze'); await sleep(ms || 80); g.classList.remove('freeze'); }
  };

  UI.banner = function (text) { const b = $('#banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); };
  UI.log = function (html) { const l = $('#log'); const p = mk('p', '', html); l.insertBefore(p, l.firstChild); while (l.children.length > 80) l.lastChild.remove(); };
  UI.showPassives = function (items) {
    const p = $('#pasv');
    p.innerHTML = '<h4>Nội tại</h4><ul>' + (items || []).map(i => '<li><b>' + esc(i.n) + '</b> — ' + esc(i.d) + '</li>').join('') + '</ul>';
    p.classList.toggle('hidden');
  };
  UI.modal = {
    open(content) { const m = $('#modal'); m.innerHTML = ''; const box = mk('div', 'box px'); if (typeof content === 'string') box.innerHTML = content; else box.appendChild(content); m.appendChild(box); m.classList.remove('hidden'); },
    close() { $('#modal').classList.add('hidden'); }
  };

  /* ============ khởi tạo ============ */
  UI.init = function (o) {
    o = o || {};
    if (o.cfg) Object.assign(CFG, o.cfg);
    if (Q.get('debug')) $('#game').classList.add('debug');
    fit(); addEventListener('resize', fit);
    buildPanels();
    UI.setScene(o.scene || 'forest', o.sceneName, o.customBg);
    UI.setRound(o.round || 1);

    $('#bLog').onclick = () => $('#log').classList.toggle('open');
    $('#bPas').onclick = () => emit('passives');
    $('#bBag').onclick = () => emit('bag');
    $('#bSum').onclick = () => emit('summon');
    $('#bRun').onclick = () => emit('run');
    $('#bEnd').onclick = () => emit('end');
    $('#bSet').onclick = () => emit('settings');
    $('#bAuto').onclick = () => { UI.auto = !UI.auto; $('#bAuto').textContent = 'Auto ' + (UI.auto ? '●' : '○'); $('#bAuto').classList.toggle('on', UI.auto); emit('auto', UI.auto); };
    $('#bSpd').onclick = () => { const i = (CFG.speeds.indexOf(UI.speed) + 1) % CFG.speeds.length; UI.speed = CFG.speeds[i]; $('#bSpd').textContent = 'x' + UI.speed; emit('speed', UI.speed); };
    const fs = $('#bFs');
    if (fs) {
      if (!document.documentElement.requestFullscreen) fs.style.display = 'none';
      else fs.onclick = () => {
        const d = document;
        if (d.fullscreenElement) { d.exitFullscreen(); return; }
        d.documentElement.requestFullscreen().then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
      };
    }
    addEventListener('orientationchange', () => setTimeout(fit, 120));
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') UI.modal.close(); });
    $('#pasv').addEventListener('click', () => $('#pasv').classList.add('hidden'));
    return UI;
  };
})(window);
