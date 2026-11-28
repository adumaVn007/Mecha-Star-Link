/* vg-char.js — Tạo nhân vật + file save cho Vân Giáp.
   Dùng chung bản lưu vg_save_v1. ST.char v2 thêm modelId; save v1 vẫn hợp lệ. */
(function (g) {
  'use strict';
  var VG = g.VG = g.VG || {}, GM = VG.game, CH = VG.char = {};
  var FALLBACK = [
    { id: 'dan_thuong', name: 'Dân thường', desc: 'Sinh ra nơi thôn dã, không nền tảng nhưng được tự do lựa chọn con đường.', bonus: { stones: { thuong: 50 }, items: { nano: 2 } } },
    { id: 'thuong_nhan', name: 'Thương nhân', desc: 'Lớn lên giữa phố chợ, quen buôn bán trao đổi linh thạch.', bonus: { stones: { thuong: 200, trung: 5 } } },
    { id: 'vo_gia', name: 'Võ gia', desc: 'Con cháu gia tộc luyện võ, thể chất bền bỉ, đòn đánh nặng.', bonus: { max: 60, atk: 6 } },
    { id: 'hoc_do', name: 'Học đồ tông môn', desc: 'Từng theo học trong tông môn, hồn lực và linh lực dồi dào.', bonus: { en: 20, soul: 20 } },
    { id: 'tho_co_khi', name: 'Thợ cơ khí', desc: 'Xuất thân xưởng chế tạo mecha, nhanh tay và có sẵn pin dự phòng.', bonus: { spd: 40, items: { cell: 2, shcell: 1 } } }
  ];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var active = null, opening = null;
  CH.GENDERS = { nam: { n: 'Nam', ic: '👨' }, nu: { n: 'Nữ', ic: '👩' } };
  CH.avatar = function (c) { return c && CH.GENDERS[c.gender] ? CH.GENDERS[c.gender].ic : '⚔'; };
  CH.resolveModel = function (c) {
    var catalog = VG.charPresets;
    if (!catalog || !c) return null;
    var model = catalog.find(c.modelId);
    return model && model.gender === c.gender ? model : catalog.forGender(c.gender)[0] || null;
  };
  CH.modelName = function (c) { var m = CH.resolveModel(c); return m ? m.name + ' · ' + String(m.number).padStart(2, '0') : '—'; };

  CH.loadOrigins = function () {
    return fetch('database/origins.json?t=' + Date.now()).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return VG.fetchJSON ? VG.fetchJSON('database/origins.json').catch(function () { return null; }) : null; })
      .then(function (j) {
        var list = j && Array.isArray(j.origins) ? j.origins.filter(function (o) { return o && typeof o.id === 'string' && o.id && typeof o.name === 'string'; }) : [];
        return list.length ? list : FALLBACK;
      });
  };
  CH.validName = function (s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    var n = Array.from(s).length;
    if (n < 2 || n > 20) return { ok: false, msg: 'Tên phải từ 2 đến 20 ký tự.' };
    if (/[<>&"'\\\u0000-\u001f]/.test(s)) return { ok: false, msg: 'Tên không được chứa ký tự đặc biệt < > & " \' \\.' };
    return { ok: true, name: s };
  };
  function isFresh(ST) { return ST.kills === 0 && ST.cleared === 0 && ST.p.lv === 12 && ST.p.xp === 0; }
  /* Chỉ xác nhận mới ghi lựa chọn; ngoại hình không tham gia tính chỉ số. */
  CH.apply = function (ST, c, origin, spawn, zoneId) {
    var fresh = !ST.char && isFresh(ST), model = CH.resolveModel(c);
    ST.char = { v: 2, name: c.name, gender: c.gender, modelId: model ? model.id : '', origin: c.origin, originName: origin ? origin.name : '', country: c.country, created: Date.now() };
    if (fresh && origin && origin.bonus) {
      var b = origin.bonus, p = ST.p;
      if (b.max) { p.max += b.max; p.hp = p.max; }
      if (b.atk) p.atk += b.atk;
      if (b.spd) p.spd += b.spd;
      if (b.en) { p.enMax += b.en; p.en = p.enMax; }
      if (b.soul) { p.soulMax += b.soul; p.soul = p.soulMax; }
      Object.keys(b.stones || {}).forEach(function (k) { ST.stones[k] = (ST.stones[k] || 0) + b.stones[k]; });
      Object.keys(b.items || {}).forEach(function (k) { ST.items[k] = (ST.items[k] || 0) + b.items[k]; });
    }
    ST.pos = { x: spawn.x, y: spawn.y }; ST.prev = null; ST.zone = zoneId; ST.events = []; ST.route = null;
    return ST;
  };
  function portrait(p, full) {
    var c = p.colors, robe = p.style === 'scholar' || p.style === 'traveler';
    var hair = p.gender === 'nu' ? '<path d="M22 31Q18 7 32 7Q47 7 43 38L37 35 36 16 27 16 26 35Z" fill="' + c.hair + '"/>' : '<path d="M23 19Q19 5 32 7Q46 5 42 21L35 14 25 19Z" fill="' + c.hair + '"/>';
    return '<svg viewBox="0 0 64 120" aria-hidden="true"' + (full ? ' data-active="' + full + '"' : '') + '><ellipse cx="32" cy="114" rx="22" ry="4" fill="#000" opacity=".3"/>' + hair +
      '<path d="M25 73 24 109 30 109 33 78 36 109 42 109 40 73" fill="' + c.secondary + '"/><path d="M24 108 20 114 30 114 30 108M36 108 35 114 46 114 42 108" fill="#18222d"/>' +
      '<path d="M23 34 15 64 20 67 29 43M40 34 49 64 44 67 35 43" fill="' + c.primary + '"/><circle cx="17" cy="68" r="4" fill="' + c.skin + '"/><circle cx="47" cy="68" r="4" fill="' + c.skin + '"/>' +
      '<path d="M24 31 40 31 43 ' + (robe ? '90' : '73') + ' 21 ' + (robe ? '90' : '73') + 'Z" fill="' + c.primary + '"/><path d="M29 32 35 32 35 57 29 57Z" fill="' + c.accent + '"/><path d="M22 58H42V63H22Z" fill="' + c.secondary + '"/>' +
      '<rect x="28" y="24" width="8" height="10" rx="3" fill="' + c.skin + '"/><ellipse cx="32" cy="21" rx="9" ry="11" fill="' + c.skin + '"/>' + hair + '<path d="M28 22h2m5 0h2" stroke="#28313b" stroke-width="1.5"/><path d="M30 27h4" stroke="#9b6c60" stroke-width="1"/></svg>';
  }
  function bonusText(b) {
    b = b || {}; var out = [], stat = { max: 'HP', atk: 'công kích', spd: 'tốc độ', en: 'năng lượng', soul: 'hồn lực' };
    Object.keys(stat).forEach(function (k) { if (+b[k]) out.push((+b[k] > 0 ? '+' : '') + b[k] + ' ' + stat[k]); });
    var stones = { thuong: 'thường', trung: 'trung', cao: 'cao', sieu: 'siêu' }, items = { nano: 'gói nano', cell: 'pin năng lượng', tonic: 'hồn lực', shcell: 'pin lá chắn' };
    Object.keys(b.stones || {}).forEach(function (k) { out.push('+' + b.stones[k] + ' linh thạch ' + (stones[k] || k)); });
    Object.keys(b.items || {}).forEach(function (k) { out.push('+' + b.items[k] + ' ' + (items[k] || k)); });
    return out.length ? out.join(' · ') : 'Không cộng chỉ số khởi đầu.';
  }

  /* API cũ giữ nguyên; previewState chỉ đọc để dựng bảng chỉ số. */
  CH.open = function (opts) {
    if (active) return Promise.resolve(active);
    if (opening) return opening;
    opts = opts || {};
    opening = CH.loadOrigins().then(function (origins) {
      var catalog = VG.charPresets, presets = catalog && catalog.list;
      var countries = Array.isArray(opts.countries) ? opts.countries : [];
      var sel = { name: '', gender: 'nam', modelId: 'nam_01', origin: '', country: '' };
      var base = opts.previewState || GM.defaults();
      var destroyed = false, submitting = false, preview = null, previewTimer = 0, failed = false;
      var oldFocus = document.activeElement, world = document.getElementById('app');
      var root = document.createElement('div'); root.id = 'cc'; root.dataset.tab = 'preview'; root.dataset.preview = 'loading';
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'ccTitle');
      root.innerHTML = '<div class="cc-shell"><header class="cc-top"><div><div class="cc-brand">MECHA STAR LINK / VÂN GIÁP</div><h1 id="ccTitle">Khởi đầu một huyền thoại</h1><p>Chọn diện mạo. Viết nên hành trình của riêng bạn.</p></div><div class="cc-step"><b>01 / 01</b>TẠO NHÂN VẬT</div></header>' +
        '<nav class="cc-tabs" role="tablist" aria-label="Các bảng tạo nhân vật"><button type="button" role="tab" id="ccTabPreview" aria-controls="ccPreviewPanel" aria-selected="true" data-tab="preview">Nhân vật</button><button type="button" role="tab" id="ccTabProfile" aria-controls="ccProfile" aria-selected="false" tabindex="-1" data-tab="profile">Thông tin</button><button type="button" role="tab" id="ccTabSkills" aria-controls="ccSkills" aria-selected="false" tabindex="-1" data-tab="skills">Chỉ số</button></nav>' +
        '<div class="cc-body"><aside class="cc-panel" id="ccProfile" aria-label="Thông tin nhân vật"><div class="cc-panelhead"><span>01</span><h2>Hồ sơ nhân vật</h2></div>' +
        '<label class="cc-label" for="ccN">TÊN NHÂN VẬT</label><input class="cc-input" type="text" id="ccN" maxlength="40" autocomplete="off" placeholder="Tên của bạn…" aria-describedby="ccNameHelp ccE"><p class="cc-help" id="ccNameHelp">Từ 2–20 ký tự. Có thể dùng tiếng Việt.</p>' +
        '<div class="cc-label" id="ccGenderLabel">GIỚI TÍNH</div><div class="cc-genders" role="group" aria-labelledby="ccGenderLabel"><button type="button" data-g="nam" aria-pressed="true"><b>♂</b>Nam</button><button type="button" data-g="nu" aria-pressed="false"><b>♀</b>Nữ</button></div>' +
        '<label class="cc-label" for="ccOrigin">XUẤT THÂN</label><select class="cc-select" id="ccOrigin"><option value="">Chọn xuất thân</option>' + origins.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>'; }).join('') + '</select><div class="cc-origin-note" id="ccOriginNote">Xuất thân quyết định phần thưởng khởi đầu.</div>' +
        '<label class="cc-label" for="ccCountry">QUỐC GIA KHỞI ĐẦU</label><select class="cc-select" id="ccCountry"><option value="">Chọn quốc gia</option>' + countries.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('') + '</select><p class="cc-help" id="ccCountryNote">Bắt đầu hành trình tại quốc gia đã chọn.</p>' +
        '<section class="cc-appearance"><small>DIỆN MẠO ĐANG CHỌN</small><strong id="ccAppearance"></strong><p id="ccAppearanceDesc"></p><p class="cc-neutral">Ngoại hình không cộng chỉ số riêng. Đây là bộ tạo hình 3D tạm.</p></section></aside>' +
        '<main class="cc-stage-wrap" id="ccPreviewPanel" aria-label="Sân khấu chọn nhân vật"><div class="cc-stage" id="ccStage"></div><div class="cc-fallback" id="ccFallback" role="group" aria-label="Năm ngoại hình nhân vật"></div><button class="cc-nav cc-nav-prev" type="button" id="ccPrev" aria-label="Nhân vật trước" title="Nhân vật trước (←)">‹</button><button class="cc-nav cc-nav-next" type="button" id="ccNext" aria-label="Nhân vật tiếp theo" title="Nhân vật tiếp theo (→)">›</button><div class="cc-stage-caption">TINH CHỦ · KHỞI NGUYÊN HÀNH TRÌNH</div><div class="cc-stage-tools"><button class="cc-reset" type="button" id="ccReset">↶ Xem cả đội hình</button></div><div class="cc-stage-footer"><div class="cc-kicker" id="ccSelectedNumber">NGOẠI HÌNH 01 / 05</div><div class="cc-stage-name" id="ccModelName"></div><p class="cc-status" id="ccStatus" role="status">Đang dựng sân khấu 3D…</p></div></main>' +
        '<aside class="cc-panel" id="ccSkills" aria-label="Chỉ số khởi đầu"><div class="cc-panelhead"><span>02</span><h2>Năng lực khởi đầu</h2></div><p class="cc-mini-note">Chỉ số theo trạng thái nhân vật và xuất thân. Cả năm diện mạo có cùng năng lực.</p><div class="cc-stats" id="ccStats"></div></aside></div>' +
        '<div class="cc-submit-wrap"><p class="cc-error" id="ccE" role="alert"></p><button class="cc-go" type="button" id="ccGo" disabled>Bắt đầu hành trình <span aria-hidden="true">→</span></button></div><div class="cc-sr" id="ccAnnounce" aria-live="polite"></div></div>';
      document.body.appendChild(root);
      var $ = function (s) { return root.querySelector(s); };
      function model() { return catalog && catalog.find(sel.modelId); }
      function org() { return origins.find(function (o) { return o.id === sel.origin; }); }
      function validCatalog() {
        return Array.isArray(presets) && presets.length === 10 && ['nam', 'nu'].every(function (gender) {
          var group = catalog.forGender(gender);
          return group.length === 5 && new Set(group.map(function (p) { return p.id; })).size === 5 && group.every(function (p) { return p.gender === gender && p.colors && p.name; });
        });
      }
      function setTab(tab) {
        root.dataset.tab = tab;
        root.querySelectorAll('.cc-tabs [data-tab]').forEach(function (b) { var on = b.dataset.tab === tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      }
      function refresh() {
        var v = CH.validName($('#ccN').value), m = model();
        root.querySelectorAll('[data-g]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.g === sel.gender)); });
        root.querySelectorAll('[data-model]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.model === sel.modelId)); });
        $('#ccGo').disabled = submitting || !validCatalog() || !v.ok || !m || m.gender !== sel.gender || !org() || sel.country === '' || !countries.some(function (c) { return c.id === sel.country; });
        if (!failed) $('#ccE').textContent = $('#ccN').value && !v.ok ? v.msg : '';
      }
      function renderRoster() {
        if (!validCatalog()) { $('#ccE').innerHTML = 'Không tải được danh mục ngoại hình. <button type="button" id="ccRetry">Tải lại</button>'; failed = true; refresh(); return; }
        var list = catalog.forGender(sel.gender);
        $('#ccFallback').innerHTML = list.map(function (p) {
          var on = p.id === sel.modelId;
          return '<button class="cc-fallback-char" type="button" data-model="' + esc(p.id) + '" data-active="' + on + '" aria-pressed="' + on + '" aria-label="' + esc(CH.GENDERS[p.gender].n + ', ngoại hình ' + p.number + ': ' + p.name) + '">' + portrait(p) + '<span>0' + p.number + ' · ' + esc(p.name) + '</span></button>';
        }).join('');
      }
      function renderModel() {
        var m = model(); if (!m) return;
        $('#ccAppearance').textContent = m.name;
        $('#ccAppearanceDesc').textContent = m.desc;
        $('#ccModelName').textContent = m.name;
        $('#ccSelectedNumber').textContent = CH.GENDERS[sel.gender].n.toUpperCase() + ' · NGOẠI HÌNH 0' + m.number + ' / 05';
        Array.from($('#ccFallback').children).forEach(function (btn, i) {
          var on = i === m.number - 1;
          btn.setAttribute('data-active', String(on));
          btn.setAttribute('aria-pressed', String(on));
        });
      }
      function renderDetails() {
        var o = org(), b = o && o.bonus || {}, p = Object.assign({}, base.p);
        if (!base.char && isFresh(base)) {
          ['max', 'atk', 'spd'].forEach(function (k) { p[k] += +b[k] || 0; });
          p.enMax += +b.en || 0; p.soulMax += +b.soul || 0;
        }
        $('#ccOriginNote').innerHTML = o ? '<p>' + esc(o.desc || '') + '</p><p class="cc-bonus">' + esc(bonusText(b)) + '</p>' : 'Xuất thân quyết định phần thưởng khởi đầu.';
        var country = countries.find(function (c) { return c.id === sel.country; });
        $('#ccCountryNote').textContent = country ? 'Khởi đầu tại ' + (country.capital || country.name) + '.' : 'Bắt đầu hành trình tại quốc gia đã chọn.';
        var values = [['HP tối đa', p.max], ['Công kích', p.atk], ['Tốc độ', p.spd], ['Năng lượng', p.enMax], ['Hồn lực', p.soulMax], ['Lá chắn', p.gear ? p.shMax : 0]];
        $('#ccStats').innerHTML = values.map(function (r) { return '<div class="cc-stat"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
      }
      function choose(id, focus) {
        var p = catalog && catalog.find(id); if (!p || p.gender !== sel.gender) return;
        sel.modelId = p.id; failed = false; renderModel(); refresh();
        if (preview) preview.select(id, { focus: focus !== false });
        $('#ccAnnounce').textContent = 'Đã chọn ' + CH.GENDERS[sel.gender].n + ', ' + p.name + ', mẫu ' + p.number + '.';
      }
      function stepModel(delta) {
        if (!validCatalog()) return;
        var list = catalog.forGender(sel.gender), ix = list.findIndex(function (p) { return p.id === sel.modelId; });
        var next = list[((ix < 0 ? 0 : ix) + delta + list.length) % list.length];
        if (next) choose(next.id, true);
      }
      function showPreviewError(message) {
        if (destroyed) return;
        root.dataset.preview = 'fallback'; $('#ccFallback').hidden = false;
        $('#ccStatus').textContent = message || 'Chế độ 2D: bấm trực tiếp vào một trong năm nhân vật ở giữa để chọn.';
        $('#ccStatus').classList.add('cc-warning');
      }
      function dispose() {
        if (destroyed) return; destroyed = true;
        clearTimeout(previewTimer); if (preview) { preview.dispose(); preview = null; }
        root.removeEventListener('keydown', keydown); root.remove(); active = null;
        if (world) world.inert = false;
        if (oldFocus && document.contains(oldFocus)) oldFocus.focus({ preventScroll: true });
      }
      function confirm() {
        if (submitting) return;
        failed = false; refresh(); if ($('#ccGo').disabled) { setTab('profile'); $('#ccN').focus(); return; }
        var v = CH.validName($('#ccN').value), sp;
        try { sp = opts.spawnFor(sel.country); } catch (e) { sp = null; }
        if (!sp || !Number.isFinite(sp.x) || !Number.isFinite(sp.y)) { failed = true; $('#ccE').textContent = 'Không tìm được ô khởi đầu hợp lệ. Hãy chọn quốc gia khác.'; setTab('profile'); return; }
        submitting = true; refresh();
        var c = { name: v.name, gender: sel.gender, modelId: sel.modelId, origin: sel.origin, country: sel.country };
        try { opts.done(c, org(), { x: sp.x, y: sp.y }); dispose(); }
        catch (e) { submitting = false; failed = true; $('#ccE').textContent = 'Chưa thể vào game: ' + (e.message || 'hãy thử lại.'); refresh(); }
      }
      function keydown(e) {
        if (e.key === 'Escape' && preview) { e.preventDefault(); preview.resetView(); }
        var tab = e.target.closest('.cc-tabs [data-tab]');
        if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) >= 0) {
          e.preventDefault(); var tabs = Array.from(root.querySelectorAll('.cc-tabs [data-tab]')), i = tabs.indexOf(tab);
          var next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          setTab(tabs[next].dataset.tab); tabs[next].focus(); return;
        }
        var btn = e.target.closest('#ccFallback [data-model]');
        if (btn && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          e.preventDefault(); var buttons = Array.from($('#ccFallback').querySelectorAll('[data-model]')), ix = buttons.indexOf(btn), at = (ix + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
          choose(buttons[at].dataset.model, true); buttons[at].focus();
        } else if (e.target.closest('#ccPrev, #ccNext') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          e.preventDefault(); stepModel(e.key === 'ArrowRight' ? 1 : -1);
        }
        if (e.key !== 'Tab') return;
        var focusable = Array.from(root.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')).filter(function (el) { return el.getClientRects().length > 0 && el.tabIndex >= 0; });
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      root.addEventListener('keydown', keydown);
      root.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b || submitting) return;
        if (b.dataset.tab) { setTab(b.dataset.tab); return; }
        if (b.dataset.g) {
          var current = model(), n = current ? current.number : 1;
          sel.gender = b.dataset.g; sel.modelId = sel.gender + '_0' + n; failed = false;
          renderRoster(); renderModel(); refresh();
          if (preview) preview.setGender(sel.gender, sel.modelId);
        } else if (b.dataset.model) choose(b.dataset.model, true);
        else if (b.id === 'ccPrev') stepModel(-1);
        else if (b.id === 'ccNext') stepModel(1);
        else if (b.id === 'ccReset' && preview) { preview.resetView(); $('#ccAnnounce').textContent = 'Đang xem cả năm nhân vật.'; }
        else if (b.id === 'ccGo') confirm();
        else if (b.id === 'ccRetry') location.reload();
      });
      $('#ccN').addEventListener('input', function () { failed = false; refresh(); });
      $('#ccOrigin').addEventListener('change', function () { sel.origin = this.value; failed = false; renderDetails(); refresh(); });
      $('#ccCountry').addEventListener('change', function () { sel.country = this.value === '' ? '' : Number(this.value); failed = false; renderDetails(); refresh(); });
      active = { dispose: dispose };
      if (world) world.inert = true;
      renderRoster(); renderModel(); renderDetails(); refresh();
      setTimeout(function () { if (!destroyed) $('#ccTabPreview').getClientRects().length ? $('#ccTabPreview').focus() : $('#ccN').focus(); }, 0);
      if (validCatalog()) {
        var timeout = new Promise(function (_, reject) { previewTimer = setTimeout(function () { reject(new Error('Hết thời gian tải 3D.')); }, 12000); });
        Promise.race([import('./vg-char-preview.js?v=202611283'), timeout]).then(function (mod) {
          clearTimeout(previewTimer); if (destroyed) return;
          preview = mod.createCharacterPreview({ container: $('#ccStage'), presets: presets, gender: sel.gender, selectedId: sel.modelId, reducedMotion: !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches), onSelect: function (id) { choose(id, true); }, onError: showPreviewError });
          root.dataset.preview = 'ready'; $('#ccFallback').hidden = true;
          $('#ccStatus').textContent = 'Bấm trực tiếp vào nhân vật ở giữa để chọn và phóng to · Dùng ‹ › để đổi mẫu';
        }).catch(function () { clearTimeout(previewTimer); showPreviewError('Chế độ 2D: bấm trực tiếp vào một trong năm nhân vật ở giữa để chọn.'); });
      } else { showPreviewError('Danh mục ngoại hình chưa sẵn sàng. Hãy tải lại trang.'); }
      return active;
    }).finally(function () { opening = null; });
    return opening;
  };

  /* ===== File save: xuất / nạp ===== */
  CH.exportSave = function (ST) {
    var data = JSON.stringify({ app: 'van-giap', saveFormat: 1, exported: new Date().toISOString(), save: ST });
    var name = 'vangiap-save-' + ((ST.char && ST.char.name) || 'nhanvat').replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.json';
    var blob = new Blob([data], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return name;
  };
  CH.importSave = function (file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('Không đọc được file.')); };
      fr.onload = function () {
        try {
          var j = JSON.parse(fr.result), s = j && j.app === 'van-giap' ? j.save : null;
          if (!s || typeof s !== 'object' || !s.p || !s.pos || !s.char || !s.char.name) throw 0;
          res(s);
        } catch (e) { rej(new Error('File không phải bản save Vân Giáp hợp lệ.')); }
      };
      fr.readAsText(file);
    });
  };
})(typeof window != 'undefined' ? window : globalThis);
