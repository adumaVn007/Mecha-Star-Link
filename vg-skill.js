/* vg-skill.js — Hệ thống Skill Mecha cho Vân Giáp (dùng chung: battle.html, vg-bag.js, admin.html).
   Skill gắn trên TRANG BỊ: database/mecha-studio.json → equips[].skills = [ {id,name,type,ic,en,so,mul,hits,eff,stat,pct,val,turns,desc} ].
   Mecha chỉ có skill của trang bị ĐANG MẶC; không mặc gì thì chỉ có skill cơ bản (BASIC).
   Loại: 1 Tấn công chủ động · 2 Tấn công bị động (Drone/Sentry/Pet) · 3 Nội tại bị động · 4 Nội tại chủ động · 5 Hỗ trợ chủ động · 6 Hỗ trợ bị động · 7 Kỹ năng cơ bản.
   eff: dmg (sát thương ×mul × hits) | heal (pct % HP tối đa) | shield (val lá chắn) | buff (stat +pct% trong turns lượt) | en (+val năng lượng) | soul (+val hồn lực) | stat (loại 3: +pct% chỉ số, luôn có). */
(function (g) {
  var VG = g.VG = g.VG || {}, S = VG.skill = {};
  S.TYPES = {
    1: { n: 'Tấn công chủ động', s: 'Tấn công', act: true },
    2: { n: 'Tấn công bị động', s: 'TC bị động', act: false },
    3: { n: 'Nội tại bị động', s: 'Nội tại', act: false },
    4: { n: 'Nội tại chủ động', s: 'Nội tại CĐ', act: true },
    5: { n: 'Hỗ trợ chủ động', s: 'Hỗ trợ', act: true },
    6: { n: 'Hỗ trợ bị động', s: 'HT bị động', act: false },
    7: { n: 'Kỹ năng cơ bản', s: 'Cơ bản', act: true }
  };
  S.STATS = { atk: 'Tấn công', spd: 'Tốc độ', max: 'HP tối đa', sh: 'Lá chắn tối đa', dmgRed: 'Giảm sát thương nhận' };
  S.EFFS = { 1: ['dmg'], 2: ['dmg'], 3: ['stat'], 4: ['buff'], 5: ['heal', 'shield', 'buff'], 6: ['heal', 'shield', 'en', 'soul'], 7: ['dmg', 'heal', 'shield', 'buff'] };
  S.EFFN = { dmg: 'Gây sát thương', heal: 'Hồi HP', shield: 'Nạp lá chắn', buff: 'Cường hóa', en: 'Hồi năng lượng', soul: 'Hồi hồn lực', stat: 'Cộng chỉ số' };
  var num = function (v) { v = +v; return isFinite(v) ? v : 0; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fm = function (v) { return String(Math.round(num(v) * 100) / 100); };

  /* Chuẩn hóa 1 skill từ database (thiếu/lỗi → mặc định an toàn) */
  S.norm = function (s) {
    s = s || {}; var t = Math.round(num(s.type)); if (t < 1 || t > 7) t = 7;
    var ok = S.EFFS[t], eff = ok.indexOf(s.eff) >= 0 ? s.eff : ok[0];
    return { id: String(s.id || ''), name: String(s.name || 'Skill'), type: t, ic: s.ic || '✨', lv: Math.max(0, Math.round(num(s.lv))), en: Math.max(0, num(s.en)), so: Math.max(0, num(s.so)),
      mul: num(s.mul) > 0 ? num(s.mul) : 1, hits: Math.max(1, Math.round(num(s.hits)) || 1), eff: eff, stat: S.STATS[s.stat] ? s.stat : 'atk', pct: num(s.pct), val: num(s.val), turns: Math.max(1, Math.round(num(s.turns)) || 1), desc: String(s.desc || '') };
  };
  S.blank = function () { return { id: 'sk_' + Math.random().toString(36).slice(2, 8), name: 'Skill mới', type: 1, ic: '✨', en: 10, so: 3, mul: 1.5, hits: 1, eff: 'dmg', stat: 'atk', pct: 0, val: 0, turns: 3, desc: '' }; };
  S.act = function (s) { return !!(S.TYPES[s.type] && S.TYPES[s.type].act); };
  S.statName = function (k) { return S.STATS[k] || k; };

  /* Mô tả hiệu ứng (tiếng Việt, đầy đủ số liệu) */
  S.effText = function (s) {
    var per = s.type === 6 ? 'Mỗi lượt: ' : '';
    if (s.type === 3) return '+' + fm(s.pct) + '% ' + S.statName(s.stat) + ' (luôn có khi đang mặc)';
    if (s.eff === 'dmg') return (s.type === 2 ? 'Tự bắn mỗi nhịp: ' : '') + 'Sát thương ×' + fm(s.mul) + (s.hits > 1 ? ' × ' + s.hits + ' đòn' : '');
    if (s.eff === 'heal') return per + 'Hồi ' + fm(s.pct) + '% HP tối đa';
    if (s.eff === 'shield') return per + '+' + fm(s.val) + ' lá chắn';
    if (s.eff === 'en') return per + '+' + fm(s.val) + ' năng lượng';
    if (s.eff === 'soul') return per + '+' + fm(s.val) + ' hồn lực';
    if (s.eff === 'buff') return s.stat === 'dmgRed' ? 'Giảm ' + fm(s.pct) + '% sát thương nhận trong ' + s.turns + ' lượt' : '+' + fm(s.pct) + '% ' + S.statName(s.stat) + ' trong ' + s.turns + ' lượt';
    return '';
  };
  S.costText = function (s) { return S.act(s) ? 'NL ' + fm(s.en) + ' · HL ' + fm(s.so) : 'Không tốn tài nguyên'; };

  /* HTML chi tiết skill (hiện trong bảng chi tiết trang bị của túi đồ) */
  S.html = function (list) {
    if (!Array.isArray(list) || !list.length) return '';
    return list.map(function (r) {
      var s = S.norm(r), t = S.TYPES[s.type];
      return '<div style="margin-top:6px;padding:5px 7px;border-radius:6px;background:#ffffff12;border-left:3px solid #ffd96a"><div style="font:bold 12px system-ui;color:#ffd96a">' + esc(s.ic) + ' ' + esc(s.name) +
        ' <span style="font-size:10px;padding:0 6px;border-radius:8px;background:#3a3340;color:#fff">' + esc(t.n) + '</span></div><div style="font:12px system-ui">' + esc(S.effText(s)) + '</div><div style="font:11px system-ui;color:#cbbd98">' + esc(S.costText(s)) + '</div>' +
        (s.desc ? '<div style="font:11px system-ui;color:#cbbd98">' + esc(s.desc) + '</div>' : '') + '</div>';
    }).join('');
  };

  /* Gom skill của các trang bị ĐANG MẶC (ST.eq) theo database lib. Mỗi skill có thêm slot / src (tên trang bị). */
  S.collect = function (ST, lib) {
    var out = [], eq = (ST && ST.eq) || {}, E = {};
    if (!lib || !Array.isArray(lib.equips)) return out;
    lib.equips.forEach(function (e) { if (e && e.id) E[e.id] = e; });
    Object.keys(eq).forEach(function (slot) {
      var e = E[eq[slot]]; if (!e || !Array.isArray(e.skills)) return;
      e.skills.forEach(function (r) { var s = S.norm(r); s.slot = slot; s.src = e.name; s.eqid = e.id; out.push(s); });
    });
    return out;
  };

  /* Skill cơ bản: luôn có (chuyển từ 8 skill cũ của giao diện chiến đấu). Chỉ số giữ nguyên công thức cũ. */
  S.BASIC = [
    { id: 'beam', name: 'Súng Beam', ic: '🔫', lv: 12, type: 7, en: 8, so: 3, eff: 'dmg', mul: 1, hits: 1 },
    { id: 'saber', name: 'Chém Saber', ic: '⚔️', lv: 12, type: 7, en: 15, so: 5, eff: 'dmg', mul: 1.6, hits: 1 },
    { id: 'burst', name: 'Core Burst', ic: '💥', lv: 12, type: 7, en: 35, so: 10, eff: 'dmg', mul: 2.8, hits: 1 },
    { id: 'rocket', name: 'Tên lửa chùm', ic: '🚀', lv: 13, type: 7, en: 25, so: 8, eff: 'dmg', mul: 0.8, hits: 3 },
    { id: 'guard', name: 'Thủ thế', ic: '🛡️', lv: 14, type: 7, en: 10, so: 2, eff: 'shield', val: 60 },
    { id: 'overdrive', name: 'Overdrive', ic: '⚡', lv: 14, type: 7, en: 20, so: 6, eff: 'buff', stat: 'atk', pct: 50, turns: 1 },
    { id: 'nano', name: 'Nano sửa chữa', ic: '🔧', lv: 15, type: 7, en: 25, so: 6, eff: 'heal', pct: 25 },
    { id: 'void', name: 'Pháo Hư Không', ic: '🌑', lv: 16, type: 7, en: 60, so: 18, eff: 'dmg', mul: 4.5, hits: 1 }
  ].map(S.norm);
  /* Ghi đè skill cơ bản từ database/skills.json (basic:[{id,name,ic,lv,en,so,mul,hits,pct,val,stat,turns,desc}]). id / loại / hiệu ứng giữ nguyên. Gọi lại nhiều lần vẫn đúng. */
  S.BASIC0 = S.BASIC.map(function (b) { return Object.assign({}, b); });
  S.applyBasic = function (list) {
    var m = {}; (Array.isArray(list) ? list : []).forEach(function (r) { if (r && r.id) m[r.id] = r; });
    S.BASIC0.forEach(function (o, i) { var r = m[o.id]; S.BASIC[i] = r ? S.norm(Object.assign({}, o, r, { id: o.id, type: 7, eff: o.eff })) : Object.assign({}, o); });
  };
})(typeof window != 'undefined' ? window : globalThis);
