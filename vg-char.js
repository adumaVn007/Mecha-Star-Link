/* vg-char.js — Tạo nhân vật + file save cho Vân Giáp.
   Dùng chung bản lưu của vg-core.js (localStorage 'vg_save_v1', có bản dự phòng + IndexedDB).
   Dữ liệu nhân vật nằm trong ST.char = {v,name,gender,origin,country,created}. */
(function (g) {
  var VG = g.VG = g.VG || {}, GM = VG.game, CH = VG.char = {};
  var FALLBACK = [
    { id: 'dan_thuong', name: 'Dân thường', desc: 'Sinh ra nơi thôn dã, không nền tảng nhưng được tự do lựa chọn con đường.', bonus: { stones: { thuong: 50 }, items: { nano: 2 } } },
    { id: 'thuong_nhan', name: 'Thương nhân', desc: 'Lớn lên giữa phố chợ, quen buôn bán trao đổi linh thạch.', bonus: { stones: { thuong: 200, trung: 5 } } },
    { id: 'vo_gia', name: 'Võ gia', desc: 'Con cháu gia tộc luyện võ, thể chất bền bỉ, đòn đánh nặng.', bonus: { max: 60, atk: 6 } },
    { id: 'hoc_do', name: 'Học đồ tông môn', desc: 'Từng theo học trong tông môn, hồn lực và linh lực dồi dào.', bonus: { en: 20, soul: 20 } },
    { id: 'tho_co_khi', name: 'Thợ cơ khí', desc: 'Xuất thân xưởng chế tạo mecha, nhanh tay và có sẵn pin dự phòng.', bonus: { spd: 40, items: { cell: 2, shcell: 1 } } }
  ];
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  CH.GENDERS = { nam: { n: 'Nam', ic: '👨' }, nu: { n: 'Nữ', ic: '👩' } };
  CH.avatar = function (c) { return c && CH.GENDERS[c.gender] ? CH.GENDERS[c.gender].ic : '⚔'; };

  CH.loadOrigins = function () {
    return fetch('database/origins.json?t=' + Date.now()).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return VG.fetchJSON ? VG.fetchJSON('database/origins.json').catch(function () { return null; }) : null; })
      .then(function (j) { return (j && j.origins && j.origins.length) ? j.origins : FALLBACK; });
  };

  CH.validName = function (s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    var n = Array.from(s).length;
    if (n < 2 || n > 20) return { ok: false, msg: 'Tên phải từ 2 đến 20 ký tự.' };
    if (/[<>&"'\\\u0000-\u001f]/.test(s)) return { ok: false, msg: 'Tên không được chứa ký tự đặc biệt < > & " \' \\.' };
    return { ok: true, name: s };
  };

  /* Áp nhân vật mới lên trạng thái ST. spawn = {x,y}. Chỉ cộng thưởng xuất thân khi bản lưu còn mới. */
  CH.apply = function (ST, c, origin, spawn, zoneId) {
    var fresh = ST.kills === 0 && ST.cleared === 0 && ST.p.lv === 12 && ST.p.xp === 0;
    ST.char = { v: 1, name: c.name, gender: c.gender, origin: c.origin, originName: origin ? origin.name : '', country: c.country, created: Date.now() };
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

  /* Màn hình tạo nhân vật. opts: {countries:[{id,name,color,capital,cities}], spawnFor(id)->{x,y}|null, done(char,origin,spawn)} */
  CH.open = function (opts) {
    CH.loadOrigins().then(function (origins) {
      var sel = { name: '', gender: '', origin: '', country: 0 };
      var css = document.createElement('style');
      css.textContent = '#cc{position:fixed;inset:0;z-index:50;background:radial-gradient(#1c3440,#0a1117);color:var(--txt,#f3e7c9);overflow-y:auto;-webkit-overflow-scrolling:touch;padding:calc(14px + env(safe-area-inset-top,0px)) 14px calc(20px + env(safe-area-inset-bottom,0px));font:14px/1.45 system-ui,sans-serif}' +
        '#cc .w{max-width:560px;margin:0 auto}#cc h1{font-size:20px;text-align:center;color:#e4c27b;margin:4px 0 2px}#cc .sub{text-align:center;color:#aab8b7;font-size:12px;margin-bottom:12px}' +
        '#cc h2{font-size:13px;color:#e4c27b;margin:16px 0 6px;letter-spacing:.5px}#cc input[type=text]{width:100%;box-sizing:border-box;min-height:46px;padding:10px 12px;border-radius:8px;border:1px solid #8d754b;background:#14242d;color:#f3e7c9;font:inherit;font-size:16px}' +
        '#cc .r2{display:grid;grid-template-columns:1fr 1fr;gap:8px}#cc .o{display:block;width:100%;box-sizing:border-box;text-align:left;min-height:48px;padding:10px 12px;border-radius:8px;border:1px solid #6d5b3d;background:linear-gradient(#2a4047,#18292f);color:#f3e7c9;font:inherit;cursor:pointer;margin-bottom:7px}' +
        '#cc .o small{display:block;color:#aab8b7;font-size:11px;margin-top:2px}#cc .o.on{border-color:#e4c27b;box-shadow:0 0 0 2px #e4c27b88;background:linear-gradient(#3f5a55,#22393a)}#cc .g{text-align:center;font-size:15px}#cc .g b{font-size:26px;display:block}' +
        '#cc .c{border-left-width:8px}#cc .err{color:#ff9b8a;font-size:12px;min-height:16px;margin-top:6px}#cc .go{display:block;width:100%;min-height:50px;margin-top:14px;border-radius:8px;border:1px solid #c9a25e;background:linear-gradient(#b78f50,#77552d);color:#fff;font:inherit;font-weight:bold;font-size:16px;cursor:pointer}#cc .go:disabled{opacity:.45}';
      document.head.appendChild(css);
      var root = document.createElement('div'); root.id = 'cc';
      var oHtml = origins.map(function (o) { return '<button class="o" data-o="' + esc(o.id) + '">' + esc(o.name) + '<small>' + esc(o.desc || '') + '</small></button>'; }).join('');
      var cHtml = opts.countries.map(function (c) { return '<button class="o c" data-c="' + c.id + '" style="border-left-color:' + esc(c.color) + '">' + esc(c.name) + '<small>Khởi đầu tại ' + esc(c.capital || 'kinh đô') + (c.cities ? ' · ' + c.cities + ' thành thuộc quốc gia' : '') + '</small></button>'; }).join('');
      root.innerHTML = '<div class="w"><h1>Khai Mở Tiên Duyên</h1><div class="sub">Tạo nhân vật · Mecha Star Link — Vân Giáp</div>' +
        '<h2>TÊN NHÂN VẬT</h2><input type="text" id="ccN" maxlength="24" autocomplete="off" placeholder="Nhập tên (2–20 ký tự)">' +
        '<h2>GIỚI TÍNH</h2><div class="r2"><button class="o g" data-g="nam"><b>👨</b>Nam</button><button class="o g" data-g="nu"><b>👩</b>Nữ</button></div>' +
        '<h2>XUẤT THÂN</h2>' + oHtml + '<h2>QUỐC GIA KHỞI ĐẦU</h2>' + cHtml +
        '<div class="err" id="ccE"></div><button class="go" id="ccGo" disabled>Bắt đầu hành trình</button></div>';
      document.body.appendChild(root);
      var $ = function (s) { return root.querySelector(s); };
      function refresh() {
        root.querySelectorAll('[data-g]').forEach(function (b) { b.classList.toggle('on', b.dataset.g === sel.gender); });
        root.querySelectorAll('[data-o]').forEach(function (b) { b.classList.toggle('on', b.dataset.o === sel.origin); });
        root.querySelectorAll('[data-c]').forEach(function (b) { b.classList.toggle('on', +b.dataset.c === sel.country); });
        var v = CH.validName($('#ccN').value);
        $('#ccGo').disabled = !(v.ok && sel.gender && sel.origin && sel.country);
        $('#ccE').textContent = $('#ccN').value && !v.ok ? v.msg : '';
      }
      root.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.g) sel.gender = b.dataset.g; else if (b.dataset.o) sel.origin = b.dataset.o; else if (b.dataset.c) sel.country = +b.dataset.c;
        else if (b.id === 'ccGo') {
          var v = CH.validName($('#ccN').value); if (!v.ok) return refresh();
          var sp = opts.spawnFor(sel.country);
          if (!sp) { $('#ccE').textContent = 'Không tìm được ô khởi đầu hợp lệ cho quốc gia này.'; return; }
          var org = origins.filter(function (o) { return o.id === sel.origin; })[0];
          var c = { name: v.name, gender: sel.gender, origin: sel.origin, country: sel.country };
          root.remove(); css.remove(); opts.done(c, org, sp); return;
        }
        refresh();
      });
      $('#ccN').addEventListener('input', refresh);
      refresh();
    });
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
