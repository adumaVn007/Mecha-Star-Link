/* city-ui.js — Giao diện Thành/Làng: Sự vụ, Phường thị, Đấu giá, Vạn Bảo, Sòng bạc, Thư viện
 * Dùng: <script src="city-ui.js"></script>  →  CityUI.open({name:'Hàn Phong Trì', type:'city'})
 * Nối vào game thật: CityUI.configure({ ...ghi đè các hàm của adapter }) (xem cuối file)
 * Đơn vị tiền: quy đổi về "Thường". 1 Trung=100 Thường, 1 Cao=100 Trung, 1 Siêu=100 Cao. */
(function (global) {
'use strict';
const ST = [{k:'thuong',n:'Thường',v:1},{k:'trung',n:'Trung',v:100},{k:'cao',n:'Cao',v:10000},{k:'sieu',n:'Siêu',v:1000000}];
const TIER = ['', 'Phàm phẩm', 'Hạ phẩm', 'Trung phẩm', 'Thượng phẩm', 'Cực phẩm'];
const TCOL = ['', '#9aa', '#7bc47f', '#5aa9e6', '#b583e8', '#f0b24a'];
const TYPE = {thao:'Linh Thảo', dan:'Đan Dược', khi:'Pháp Khí', phu:'Phù Chú', khoang:'Khoáng Liệu'};
const ICON = {thao:'🌿', dan:'💊', khi:'⚔️', phu:'📜', khoang:'💎'};
const fmt = n => Math.round(n).toLocaleString('en-US');
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function rng(seed) { let h = 1779033703 ^ String(seed).length; const s = String(seed);
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ===== DATABASE VẬT PHẨM (thêm/sửa tại đây hoặc CityUI.items.push) ===== */
const ITEMS = [
 // [id, tên, loại, phẩm(1-5), giá trị (Thường), hệ, mô tả]
 ['linh_thao','Linh Thảo','thao',1,40,'Mộc','Cỏ linh khí phổ thông, nguyên liệu căn bản.'],
 ['huyet_tam_thao','Huyết Tâm Thảo','thao',1,90,'Hỏa','Lá đỏ như máu, dùng luyện đan hồi huyết.'],
 ['minh_dang_thao','Minh Đăng Thảo','thao',1,142,'Ám · Mộc','Cỏ mọc trên nấm mộ, đêm đến ngọn cỏ sáng lân xanh như đèn.'],
 ['bang_tam_lien','Băng Tâm Liên','thao',2,400,'Thủy','Sen mọc nơi hàn đàm, thanh tâm tịnh khí.'],
 ['tu_van_qua','Tử Vân Quả','thao',2,750,'Mộc','Quả tím nở rộ khi mây tụ, bổ linh lực.'],
 ['kim_nguyen_hoa','Kim Nguyên Hoa','thao',3,3000,'Kim','Hoa kim sắc, nguyên liệu Trúc Cơ Đan.'],
 ['huyen_nguyet_chi','Huyền Nguyệt Chi','thao',4,25000,'Ám','Linh chi hấp thụ nguyệt hoa trăm năm.'],
 ['cuu_diep_linh_chi','Cửu Diệp Linh Chi','thao',5,300000,'Mộc','Cực phẩm linh dược, vạn năm khó gặp.'],
 ['hoi_khi_dan','Hồi Khí Đan','dan',1,120,'—','Hồi một lượng nhỏ linh lực.'],
 ['hoi_huyet_dan','Hồi Huyết Đan','dan',1,100,'—','Hồi một lượng nhỏ HP.'],
 ['giai_doc_dan','Giải Độc Đan','dan',1,150,'—','Giải độc tố cấp thấp.'],
 ['tay_tuy_dan','Tẩy Tủy Đan','dan',2,800,'—','Thanh lọc tạp chất trong cơ thể.'],
 ['tu_khi_dan','Tụ Khí Đan','dan',2,1200,'—','Tăng tốc tu luyện Luyện Khí kỳ.'],
 ['truc_co_dan','Trúc Cơ Đan','dan',3,5000,'—','Hỗ trợ đột phá Trúc Cơ.'],
 ['ket_dan_dan','Kết Đan Đan','dan',4,40000,'—','Hỗ trợ ngưng kết kim đan.'],
 ['pha_canh_dan','Phá Cảnh Đan','dan',5,400000,'—','Tăng mạnh xác suất phá cảnh giới.'],
 ['thiet_kiem','Thiết Kiếm','khi',1,200,'Kim','Kiếm sắt phàm, bền chắc.'],
 ['hac_vu_phu_but','Hạc Vũ Phù Bút','khi',2,476,'Mộc','Bút lông hạc, vẽ phù thêm linh lực.'],
 ['thanh_phong_kiem','Thanh Phong Kiếm','khi',2,1500,'Mộc','Nhẹ như gió, tốc độ cao.'],
 ['han_thiet_giap','Hàn Thiết Giáp','khi',3,4500,'Kim','Giáp luyện từ hàn thiết.'],
 ['ly_hoa_kiem','Ly Hỏa Kiếm','khi',4,30000,'Hỏa','Kiếm mang hỏa diễm.'],
 ['tru_than_chung','Trụ Thần Chung','khi',5,350000,'Thổ','Pháp bảo phòng ngự cực phẩm.'],
 ['hoa_cau_phu','Hỏa Cầu Phù','phu',1,80,'Hỏa','Phù tấn công cơ bản.'],
 ['tinh_than_phu','Tĩnh Thần Phù','phu',2,600,'—','Giữ vững thần thức.'],
 ['truyen_tong_phu','Truyền Tống Phù','phu',3,3500,'—','Dịch chuyển tức thời một quãng ngắn.'],
 ['ho_than_phu','Hộ Thân Phù','phu',4,20000,'—','Tạo lá chắn chặn sát thương lớn.'],
 ['han_thiet','Hàn Thiết','khoang',1,60,'Kim','Quặng sắt lạnh.'],
 ['thanh_diep_thao','Thanh Diệp Thảo','thao',1,55,'Mộc','Lá xanh mướt, dùng làm phụ liệu luyện đan.'],
 ['hoa_van_qua','Hỏa Vân Quả','thao',2,680,'Hỏa','Quả đỏ rực mọc gần mạch địa hỏa.'],
 ['bach_ngoc_sam','Bạch Ngọc Sâm','thao',3,3800,'Thổ','Nhân sâm trắng ngà, đại bổ nguyên khí.'],
 ['thien_tam_thao','Thiên Tâm Thảo','thao',4,22000,'Thủy','Chỉ nở khi sương đầu mùa đông rơi.'],
 ['trung_hoi_khi_dan','Trung Hồi Khí Đan','dan',2,650,'—','Hồi 150 linh lực.'],
 ['cao_hoi_khi_dan','Cao Hồi Khí Đan','dan',3,3000,'—','Hồi 400 linh lực.'],
 ['trung_hoi_huyet_dan','Trung Hồi Huyết Đan','dan',2,900,'—','Hồi 50% HP.'],
 ['cao_hoi_huyet_dan','Cao Hồi Huyết Đan','dan',3,4000,'—','Hồi 100% HP.'],
 ['ngung_hon_dan','Ngưng Hồn Đan','dan',2,800,'—','Hồi 60 hồn lực.'],
 ['cao_ngung_hon_dan','Cao Ngưng Hồn Đan','dan',3,3500,'—','Hồi 200 hồn lực.'],
 ['bo_huyet_dan','Bổ Huyết Đan','dan',2,700,'—','Dược liệu hậu kỳ cho luyện thể.'],
 ['thanh_dong','Thanh Đồng','khoang',1,70,'Kim','Đồng xanh phổ thông.'],
 ['bach_ngan','Bạch Ngân','khoang',2,450,'Kim','Bạc tinh luyện, dẫn linh khí tốt.'],
 ['tinh_kim','Tinh Kim','khoang',2,500,'Kim','Kim loại tinh luyện.'],
 ['huyen_bang_thiet','Huyền Băng Thiết','khoang',3,2500,'Thủy','Thiết lạnh vạn năm.'],
 ['thien_ngoc','Thiên Ngọc','khoang',4,18000,'Thổ','Ngọc chứa linh khí đậm đặc.'],
 ['ngu_hanh_tinh','Ngũ Hành Tinh','khoang',5,250000,'Ngũ hành','Kết tinh năm hệ, vật liệu luyện bảo tối thượng.']
].map(a => ({id:a[0], name:a[1], type:a[2], tier:a[3], price:a[4], he:a[5], desc:a[6]}));
ITEMS.forEach(i => { i.id = 'cty_' + i.id; });
const IT = id => ITEMS.find(i => i.id === id);

/* ===== CÔNG THỨC LUYỆN ĐAN ===== */
const RECIPES = [
 {out:'hoi_khi_dan', in:{linh_thao:3}, fee:20, rate:.9},
 {out:'hoi_huyet_dan', in:{huyet_tam_thao:2, linh_thao:1}, fee:20, rate:.9},
 {out:'giai_doc_dan', in:{linh_thao:2, minh_dang_thao:1}, fee:30, rate:.85},
 {out:'tay_tuy_dan', in:{bang_tam_lien:2, minh_dang_thao:1}, fee:150, rate:.75},
 {out:'tu_khi_dan', in:{tu_van_qua:2, linh_thao:2}, fee:200, rate:.75},
 {out:'truc_co_dan', in:{kim_nguyen_hoa:2, tu_van_qua:2}, fee:1000, rate:.6},
 {out:'ket_dan_dan', in:{huyen_nguyet_chi:2, kim_nguyen_hoa:2}, fee:8000, rate:.45},
 {out:'trung_hoi_khi_dan', in:{tu_van_qua:1, linh_thao:2}, fee:120, rate:.8},
 {out:'cao_hoi_khi_dan', in:{kim_nguyen_hoa:1, tu_van_qua:2}, fee:600, rate:.65},
 {out:'trung_hoi_huyet_dan', in:{hoa_van_qua:1, huyet_tam_thao:2}, fee:150, rate:.8},
 {out:'cao_hoi_huyet_dan', in:{bach_ngoc_sam:1, hoa_van_qua:2}, fee:700, rate:.65},
 {out:'ngung_hon_dan', in:{minh_dang_thao:2, thanh_diep_thao:2}, fee:140, rate:.8},
 {out:'cao_ngung_hon_dan', in:{thien_tam_thao:1, minh_dang_thao:2}, fee:2500, rate:.55}
];
RECIPES.forEach(r => { r.out = 'cty_' + r.out; const o = {}; Object.keys(r.in).forEach(k => { o['cty_' + k] = r.in[k]; }); r.in = o; });

/* ===== ADAPTER: nối vào game thật bằng CityUI.configure({...}) ===== */
const KEY = 'cityui_state_v1', NKEY = 'cityui_npcs_v1';
const A = {
  s: null,
  _load() { if (A.s) return; try { A.s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!A.s) A.s = {stones:{thuong:1114, trung:12, cao:0, sieu:0}, bag:{cty_linh_thao:6, cty_minh_dang_thao:2}, day:1, quests:{}, cap:50}; },
  _save() { try { localStorage.setItem(KEY, JSON.stringify(A.s)); } catch (e) {} },
  getStones() { A._load(); return A.s.stones; },
  addStones(k, n) { A._load(); A.s.stones[k] = Math.max(0, (A.s.stones[k] || 0) + n); A._save(); },
  wealth() { const s = A.getStones(); return ST.reduce((t, x) => t + (s[x.k] || 0) * x.v, 0); },
  pay(n) { if (A.wealth() < n) return false; let left = A.wealth() - n; const s = A.getStones();
    for (let i = ST.length - 1; i >= 0; i--) { s[ST[i].k] = Math.floor(left / ST[i].v); left -= s[ST[i].k] * ST[i].v; } A._save(); return true; },
  earn(n) { A.addStones('thuong', Math.round(n)); },
  getBag() { A._load(); return A.s.bag; },
  count(id) { return A.getBag()[id] || 0; },
  bagFree() { const u = Object.values(A.getBag()).reduce((a, b) => a + b, 0); return A.s.cap - u; },
  addItem(id, n = 1) { const b = A.getBag(); b[id] = (b[id] || 0) + n; A._save(); },
  removeItem(id, n = 1) { const b = A.getBag(); if ((b[id] || 0) < n) return false; b[id] -= n; if (!b[id]) delete b[id]; A._save(); return true; },
  getDay() { A._load(); return A.s.day; },
  nextDay() { A._load(); A.s.day++; A._save(); },
  hasQuest(id) { A._load(); return !!A.s.quests[id]; },
  questState(q) { return A.hasQuest(q.id) ? 'active' : 'avail'; },   // game thật: 'avail'|'active'|'done'|'claimed'
  claimQuest(id) { return {ok:false, msg:'Chưa nối hệ thống nhận thưởng.'}; },
  acceptQuest(q) { A._load(); A.s.quests[q.id] = q; A._save(); },      // game thật: đẩy vào thanh nhiệm vụ
  loadNpcs() { try { return JSON.parse(localStorage.getItem(NKEY)); } catch (e) { return null; } },
  saveNpcs(n) { try { localStorage.setItem(NKEY, JSON.stringify(n)); } catch (e) {} },
  onRest() { A.nextDay(); return 'Đã nghỉ ngơi. Hồi đầy HP, linh lực, hồn lực. Qua một ngày.'; }, // game thật: hồi chỉ số + qua ngày
  onLeave() {}
};

/* ===== 50 NPC ĐẤU GIÁ (lưu database) ===== */
function npcs() {
  let n = A.loadNpcs(); if (n && n.length >= 50) return n;
  const sur = ['Lý','Trần','Nguyễn','Hàn','Mộ Dung','Âu Dương','Tư Mã','Lăng','Diệp','Bạch','Hoắc','Tô','Vân','Thẩm','Cố'];
  const giv = ['Trúc','Nguyên Thiết','Thanh Phong','Huyền Cơ','Vô Ngân','Tử Yên','Hạo Thiên','Minh Nguyệt','Phong Vân','Tuyết Nhi','Khải Hoàn','Linh San','Thiên Ân','Dạ Lan','Chí Cường','Bích Hà','Hàn Băng','Xà Uông','Thu Thủy','Kiếm Tâm'];
  const aff = ['Tán tu','Tiểu thư Lý gia','Hàn Phong Tông','Bích Thủy Môn','Thương hội Ngân Thành','Đan Các','Tiểu thư Mộ gia'];
  const realm = ['Luyện Khí','Trúc Cơ','Kết Đan','Nguyên Anh'], base = [800, 6000, 60000, 500000];
  const used = new Set(); n = [];
  while (n.length < 50) { const nm = pick(sur) + ' ' + pick(giv); if (used.has(nm)) continue; used.add(nm);
    const r = Math.min(3, Math.floor(Math.pow(Math.random(), 1.6) * 4)), b = Math.round(base[r] * (.5 + Math.random()));
    n.push({id:n.length, name:nm, aff:pick(aff), realm:realm[r], budget:b, cap:b, greed:+(.5 + Math.random() * .5).toFixed(2), taste:pick(Object.keys(TYPE))}); }
  A.saveNpcs(n); return n;
}
function npcMax(b, it) { // giới hạn tiền NPC có thể tranh
  const base = it.price * (.8 + b.greed * .9) * (b.taste === it.type ? 1.3 : 1);
  return Math.floor(Math.min(b.budget * .7, base)); }
function makeBidders(it, start) {
  const db = npcs(); db.forEach(b => { b.budget = Math.min(b.cap, b.budget + Math.round(b.cap * .15)); });
  return shuffle(db).slice(0, rnd(3, 6)).map(b => ({npc:b, max:npcMax(b, it), out:false, last:0})).filter(x => x.max >= start * .8).slice(0, 6); }

/* ===== ĐẤU GIÁ ===== */
let AU = null;
const minBid = l => l.leader ? l.cur + l.step : l.start;
function newLot(it, tier) { const start = Math.max(1, Math.round(it.price * .5)), step = Math.max(1, Math.round(start * .1));
  return {item:it, start, step, cur:start, leader:null, bidders:makeBidders(it, start), done:false, result:null}; }
function auSession() {
  const key = cfg.name + ':' + A.getDay(); if (AU && AU.key === key) return AU;
  const used = new Set();
  const lots = [1,1,1,2,2,2,3,3,4,5].map(t => { let it, g = 0; do { it = pick(ITEMS.filter(i => i.tier === t)); } while (used.has(it.id) && ++g < 20); used.add(it.id); return newLot(it); });
  AU = {key, lots, idx:0, finished:false, consign:3, input:lots[0].start}; return AU; }
function npcCounter(l) {
  const need = l.cur + l.step; l.bidders.forEach(b => { if (b.max < need) b.out = true; });
  const el = l.bidders.filter(b => !b.out && b !== l.leader && Math.random() < .85); if (!el.length) return false;
  const b = pick(el); l.cur = Math.min(b.max, need + l.step * rnd(0, 2)); l.leader = b; b.last = l.cur; return true; }
function npcChain(l) {
  if (!l.leader) { const el = l.bidders.filter(b => b.max >= l.start); if (!el.length) return; l.leader = pick(el); l.cur = l.start; l.leader.last = l.cur; }
  for (let i = 0; i < 80 && npcCounter(l); i++); }
function closeLot(l, byPlayer) {
  l.done = true;
  if (byPlayer) { A.pay(l.cur); A.addItem(l.item.id); l.result = {who:'Bạn', price:l.cur, me:true}; }
  else if (l.leader) { l.leader.npc.budget = Math.max(0, l.leader.npc.budget - l.cur); A.saveNpcs(npcs()); l.result = {who:l.leader.npc.name, price:l.cur}; }
  else l.result = {who:null, price:0};
  const n = AU.lots.findIndex(x => !x.done); if (n < 0) AU.finished = true; else { AU.idx = n; AU.input = minBid(AU.lots[n]); } }
function auBid(amt) {
  const l = AU.lots[AU.idx]; amt = Math.round(amt);
  if (A.bagFree() < 1) return no(fullMsg('ra giá') + ' Chưa bị trừ linh thạch.');
  if (amt < minBid(l)) return no('Giá ' + fmt(amt) + ' thấp hơn mức tối thiểu ' + fmt(minBid(l)) + ' (giá hiện tại + 1 nấc). Ra giá không hợp lệ.');
  if (A.wealth() < amt) return no(needMsg(amt, 'để ra giá'));
  l.cur = amt; l.leader = 'player';
  if (!npcCounter(l)) { closeLot(l, true); ok('Chốt! Bạn đấu giá thành công ' + l.item.name + ' với ' + fmt(l.cur) + '. Đã trừ ' + fmt(l.cur) + ' linh thạch (quy Thường), vật phẩm đã vào túi. ' + wal()); }
  else { inf(l.leader.npc.name + ' ra giá ' + fmt(l.cur) + ', vượt giá của bạn. Linh thạch chỉ bị trừ khi bạn chốt thắng lô.'); AU.input = minBid(l); } }
function auPass() { const l = AU.lots[AU.idx]; npcChain(l); closeLot(l, false);
  inf((l.result.who ? l.result.who + ' đấu được ' + l.item.name + ' với ' + fmt(l.result.price) + '.' : 'Lô ' + l.item.name + ' không ai ra giá.') + ' Bạn bỏ qua lô này, không mất linh thạch.'); }
function auConsign(id) {
  const it = IT(id); if (!it || !A.count(id)) return;
  if (AU.consign < 1) return no('Hết lượt gửi bán trong phiên này.');
  const start = Math.round(it.price * .6), step = Math.max(1, Math.round(start * .1));
  const mx = makeBidders(it, start).map(b => b.max).sort((a, b) => b - a);
  AU.consign--; A.removeItem(id);
  if (!mx.length || mx[0] < start) { A.addItem(id); return inf('Không ai ra giá ' + it.name + '. Vật phẩm đã trả lại túi, đã mất 1 lượt gửi bán, không thu phí.'); }
  const price = Math.min(mx[0], Math.max(start, (mx[1] || 0) + step)), net = Math.round(price * .95);
  A.earn(net); ok('Đã bán ' + it.name + ' giá ' + fmt(price) + '. Phí 5% (' + fmt(price - net) + '), bạn nhận ' + fmt(net) + ' linh thạch Thường. ' + wal()); }

function auHtml() {
  const S = auSession(), l = S.lots[S.idx];
  const strip = '<div class="cu-strip">' + S.lots.map((x, i) => '<div class="cu-chip' + (i === S.idx && !S.finished ? ' on' : '') + (x.done ? ' dn' : '') + '"><b style="color:' + TCOL[x.item.tier] + '">' + esc(x.item.name) + '</b><small>' +
    (x.done ? (x.result.who ? (x.result.me ? '✔ Bạn ' : esc(x.result.who) + ' ') + fmt(x.result.price) : 'Lưu phách') : 'Khởi ' + fmt(x.start)) + '</small></div>').join('') + '</div>';
  const gl = consignBtn(S);
  if (S.finished) return strip + '<p class="cu-m">Phiên đấu giá hôm nay đã kết thúc. Phiên mới mở vào ngày mai.</p>' + gl + '<button class="cu-b" data-a="back">Rời đi</button>';
  const it = l.item, full = A.bagFree() < 1;
  const lead = l.leader === 'player' ? 'Bạn đang dẫn đầu' : l.leader ? esc(l.leader.npc.name) + ' đang dẫn đầu' : 'Chưa ai ra giá. Còn ' + l.bidders.filter(b => !b.out).length + ' người theo.';
  const rows = l.bidders.map(b => '<div class="cu-r' + (b.out ? ' out' : '') + '"><b>' + esc(b.npc.name) + '</b> · ' + esc(b.npc.aff) + ' · ' + b.npc.realm + '<span>' + (b.out ? 'Bỏ cuộc' : b.last ? 'Hô ' + fmt(b.last) : 'Chờ giá') + '</span></div>').join('');
  const mb = minBid(l), dis = full ? ' disabled' : '';
  return strip + '<div class="cu-card"><div class="cu-ic">' + ICON[it.type] + '</div><div><b class="cu-nm" style="color:' + TCOL[it.tier] + '">' + esc(it.name) + '</b><div class="cu-s">' + TYPE[it.type] + ' · ' + TIER[it.tier] + ' · Hệ: ' + esc(it.he) + '</div><div class="cu-s">' + esc(it.desc) + '</div></div></div>' +
    '<div class="cu-s">Giá khởi điểm ' + fmt(l.start) + ' · mỗi nấc ' + fmt(l.step) + '</div><div class="cu-big">Giá hiện tại <b>' + fmt(l.cur) + '</b></div><div class="cu-s">' + lead + '</div><div class="cu-list">' + rows + '</div>' +
    '<div class="cu-two"><button class="cu-b" data-a="bid" data-v="' + mb + '"' + dis + '>Ra giá · ' + fmt(mb) + '</button><button class="cu-b" data-a="bid" data-v="' + (mb + l.step * 2) + '"' + dis + '>Ra giá mạnh · ' + fmt(mb + l.step * 2) + '</button></div>' +
    '<button class="cu-b alt" data-a="pass">Bỏ qua lô</button>' +
    '<div class="cu-hoi"><span>Hô giá</span><button class="cu-sm" data-a="inc" data-v="-' + l.step + '">−</button><input id="cu-in" type="number" data-i="au" value="' + Math.max(S.input, mb) + '"><button class="cu-sm" data-a="inc" data-v="' + l.step + '">+</button><button class="cu-b" data-a="hoi"' + dis + '>Hô</button></div>' +
    (full ? '<p class="cu-err">Túi đầy, cất bớt đồ rồi hãy ra giá.</p>' : '') + gl; }
const consignBtn = S => '<div class="cu-two"><button class="cu-b alt" data-a="consign"' + (S.consign < 1 ? ' disabled' : '') + '>Gửi bán (còn ' + S.consign + ' lượt)</button><button class="cu-b alt" data-a="back">Rời đi</button></div>';
function consignHtml() {
  const rows = Object.keys(A.getBag()).map(IT).filter(Boolean).map(i => '<div class="cu-r"><b style="color:' + TCOL[i.tier] + '">' + esc(i.name) + '</b> ×' + A.count(i.id) + '<span><button class="cu-sm" data-a="cs" data-v="' + i.id + '">Gửi · khởi ' + fmt(i.price * .6) + '</button></span></div>').join('');
  return '<p class="cu-s">Chọn vật phẩm trong túi gửi lên đấu giá (phí 5%). Còn ' + AU.consign + ' lượt.</p><div class="cu-list">' + (rows || '<p class="cu-m">Túi trống.</p>') + '</div>'; }

/* ===== SỰ VỤ ===== */
function questsFor(city) {
  const r = rng('q:' + city), G = [['Mộ Dung Tiên Sinh','Chấp sự'],['Vân Nương','Chủ tiệm thuốc'],['Thiết Ngưu','Đội trưởng thủ vệ'],['Lão Bạch','Thợ rèn']];
  const gs = shuffle(G).slice(0, 3), herb = ITEMS.filter(i => i.type === 'thao' && i.tier <= 2), h = herb[Math.floor(r() * herb.length)];
  const k = 5 + Math.floor(r() * 11), c = 3 + Math.floor(r() * 6);
  return [
    {id:'cty:' + city + ':0', city, giver:gs[0], name:'Dọn dẹp dị thú quanh ' + city, line:'Dị thú đang quấy phá ngoài thành. Xin đạo hữu ra tay trừ hại.',
      objectives:[{t:'kill', target:'*', n:k}], rewards:{xp:k * 8, stones:{thuong:k * 60}, items:[{id:'cty_hoi_huyet_dan', q:2}]}, repeat:{days:3}},
    {id:'cty:' + city + ':1', city, giver:gs[1], name:'Thu thập ' + h.name, line:'Tiệm đang thiếu ' + h.name + '. Mang về giúp ta, sẽ không để đạo hữu thiệt.',
      objectives:[{t:'collect', target:h.id, n:c, consume:true}], rewards:{xp:c * 10, stones:{thuong:Math.round(c * h.price * 1.5)}, items:[]}, repeat:{days:2}},
    {id:'cty:' + city + ':2', city, giver:gs[2], name:'Thám thính các thành lân cận', line:'Ta cần người đi xem tình hình các thành trì khác. Ghé thăm hai nơi rồi về báo.',
      objectives:[{t:'visit', n:2}], rewards:{xp:60, stones:{thuong:400}, items:[{id:'cty_hac_vu_phu_but', q:1}]}, repeat:{days:5}}
  ]; }
const rewardTxt = w => [w.xp ? '+' + w.xp + ' KN' : '', w.stones && w.stones.thuong ? fmt(w.stones.thuong) + ' Thường' : ''].concat((w.items || []).map(i => (IT(i.id) ? IT(i.id).name : i.id) + ' ×' + (i.q || 1))).filter(Boolean).join(', ');
const objTxt = o => o.t === 'kill' ? 'Tiêu diệt ' + o.n + ' dị thú bất kỳ' : o.t === 'collect' ? 'Thu thập ' + o.n + ' ' + (IT(o.target) ? IT(o.target).name : o.target) : 'Ghé thăm ' + o.n + ' thành trì';
function questHtml() {
  return questsFor(cfg.name).map(q => { const st = A.questState ? A.questState(q) : (A.hasQuest(q.id) ? 'active' : 'avail');
    const why = whyQ(q, st), btn = st === 'avail' ? '<button class="cu-b" data-a="quest" data-v="' + q.id + '">Nhận nhiệm vụ</button>' : st === 'done' ? '<button class="cu-b gold" data-a="qclaim" data-v="' + q.id + '">Nhận thưởng</button>' :
      '<button class="cu-b alt" disabled>' + (st === 'active' ? 'Đang làm (xem ở thanh Nhiệm vụ)' : st === 'claimed' ? 'Đã hoàn thành' : 'Chưa mở') + '</button>';
    return '<div class="cu-card col"><div><b>' + esc(q.giver[0]) + '</b> <small>· ' + esc(q.giver[1]) + '</small></div><div class="cu-say">“' + esc(q.line) + '”</div><div><b>' + esc(q.name) + '</b></div>' +
      '<div class="cu-s">' + q.objectives.map(objTxt).join(' · ') + '</div><div class="cu-s">Thưởng: ' + esc(rewardTxt(q.rewards)) + '</div>' + (why ? '<div class="cu-s cu-why">ℹ ' + esc(why) + '</div>' : '') + btn + '</div>'; }).join(''); }
function whyQ(q, st) {
  if (st === 'avail') return '';
  if (st === 'active') return 'Bạn đang làm nhiệm vụ này nên không thể nhận lại. Tiến độ xem ở thanh Nhiệm vụ.';
  if (st === 'done') return 'Đã đủ mục tiêu — bấm Nhận thưởng để hoàn thành.';
  if (st === 'claimed') return q.repeat && q.repeat.days ? 'Đã hoàn thành. Nhiệm vụ lặp lại, có thể nhận lại sau ' + q.repeat.days + ' ngày kể từ lần nhận thưởng.' : 'Đã hoàn thành, không thể nhận lại.';
  return 'Chưa đủ điều kiện mở nhiệm vụ này (cấp bậc hoặc nhiệm vụ tiền đề).'; }

/* ===== PHƯỜNG THỊ ===== */
let PT = 'buy';
function ptHtml() {
  const tabs = '<div class="cu-two"><button class="cu-b' + (PT === 'buy' ? '' : ' alt') + '" data-a="pt" data-v="buy">Mua</button><button class="cu-b' + (PT === 'sell' ? '' : ' alt') + '" data-a="pt" data-v="sell">Bán</button></div>';
  if (PT === 'buy') return tabs + '<div class="cu-list">' + ITEMS.filter(i => i.tier <= 3).map(i => { const p = Math.round(i.price * 1.2);
    return row(i, fmt(p) + ' Thường', '<button class="cu-sm" data-a="buy" data-v="' + i.id + '|' + p + '|1">Mua</button><button class="cu-sm" data-a="buy" data-v="' + i.id + '|' + p + '|5">×5</button>'); }).join('') + '</div>';
  const own = Object.keys(A.getBag()).map(IT).filter(i => i && i.tier <= 3);
  return tabs + '<div class="cu-list">' + (own.map(i => { const p = Math.round(i.price * .5);
    return row(i, '×' + A.count(i.id) + ' · ' + fmt(p) + ' Thường/cái', '<button class="cu-sm" data-a="sell" data-v="' + i.id + '|' + p + '|1">Bán</button><button class="cu-sm" data-a="sell" data-v="' + i.id + '|' + p + '|all">Hết</button>'); }).join('') || '<p class="cu-m">Không có vật phẩm phù hợp để bán (chỉ nhận phẩm cấp Phàm → Trung).</p>') + '</div>'; }
const row = (i, sub, btns) => '<div class="cu-r"><div><b style="color:' + TCOL[i.tier] + '">' + ICON[i.type] + ' ' + esc(i.name) + '</b><div class="cu-s">' + sub + '</div></div><span>' + btns + '</span></div>';
function buy(id, p, q) { const it = IT(id); q = +q; const t = p * q;
  if (A.bagFree() < q) return no(fullMsg('mua ×' + q) + ' (cần ' + q + ' ô trống, còn ' + Math.max(0, A.bagFree()) + '). Chưa bị trừ linh thạch.');
  if (!A.pay(t)) return no(needMsg(t, 'để mua ' + it.name + ' ×' + q));
  A.addItem(id, q); ok('Đã mua ' + it.name + ' ×' + q + '. Đã trừ ' + fmt(t) + ' linh thạch (quy Thường). ' + wal()); }
function sell(id, p, q) { const have = A.count(id); q = q === 'all' ? have : +q; if (!q || have < q) return no('Không thể bán: bạn chỉ có ' + have + ' ' + IT(id).name + '.'); A.removeItem(id, q); A.earn(p * q); ok('Đã bán ' + IT(id).name + ' ×' + q + ', nhận ' + fmt(p * q) + ' linh thạch Thường. ' + wal()); }

/* ===== VẠN BẢO ===== */
let VB = null;
function vbStock() { const key = cfg.name + ':' + A.getDay(); if (VB && VB.key === key) return VB;
  const r = rng('vb:' + key), pool = ITEMS.filter(i => i.tier >= 3), n = 10 + Math.floor(r() * 6);
  const arr = pool.map(i => [r(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const list = []; for (let i = 0; i < n; i++) { const it = arr[i % arr.length]; if (list.find(x => x.id === it.id)) continue; list.push({id:it.id, qty:1 + Math.floor(r() * 3), price:Math.round(it.price * (1.2 + r() * .2))}); }
  VB = {key, list: list.sort((a, b) => IT(a.id).tier - IT(b.id).tier)}; return VB; }
function vbHtml() { return '<p class="cu-s">Mỗi phiên bán ' + vbStock().list.length + ' vật phẩm Trung → Cực phẩm. Làm mới mỗi ngày.</p><div class="cu-list">' + vbStock().list.map(s => { const i = IT(s.id);
  return row(i, 'Còn ' + s.qty + ' · ' + fmt(s.price) + ' Thường', '<button class="cu-sm" data-a="vbuy" data-v="' + s.id + '"' + (s.qty ? '' : ' disabled') + '>Mua</button>'); }).join('') + '</div>'; }
function alchHtml() { return '<p class="cu-s">Nguyên liệu bị tiêu hao cả khi thất bại.</p><div class="cu-list">' + RECIPES.map((r, n) => { const o = IT(r.out);
  const need = Object.keys(r.in).map(id => { const ok = A.count(id) >= r.in[id]; return '<span class="' + (ok ? 'ok' : 'no') + '">' + IT(id).name + ' ' + A.count(id) + '/' + r.in[id] + '</span>'; }).join(' · ');
  return '<div class="cu-r"><div><b style="color:' + TCOL[o.tier] + '">💊 ' + esc(o.name) + '</b> <small>' + Math.round(r.rate * 100) + '%</small><div class="cu-s">' + need + ' · Phí ' + fmt(r.fee) + '</div></div><span><button class="cu-sm" data-a="alch" data-v="' + n + '">Luyện</button></span></div>'; }).join('') + '</div>'; }

/* ===== THƯ VIỆN ===== */
let LB = {type:'', q:''};
function libList() { const q = LB.q.trim().toLowerCase();
  return ITEMS.filter(i => (!LB.type || i.type === LB.type) && (!q || i.name.toLowerCase().includes(q))).map(i =>
    '<div class="cu-r"><div><b style="color:' + TCOL[i.tier] + '">' + ICON[i.type] + ' ' + esc(i.name) + '</b> <small>' + TIER[i.tier] + ' · ' + TYPE[i.type] + ' · Hệ ' + esc(i.he) + '</small><div class="cu-s">' + esc(i.desc) + ' · Giá trị ~' + fmt(i.price) + '</div></div></div>').join('') || '<p class="cu-m">Không tìm thấy.</p>'; }
function libHtml() { return '<input class="cu-q" data-i="lib" placeholder="Tìm theo tên..." value="' + esc(LB.q) + '"><div class="cu-tabs"><button class="cu-sm' + (LB.type ? '' : ' on') + '" data-a="lt" data-v="">Tất cả</button>' +
  Object.keys(TYPE).map(t => '<button class="cu-sm' + (LB.type === t ? ' on' : '') + '" data-a="lt" data-v="' + t + '">' + TYPE[t] + '</button>').join('') + '</div><div class="cu-list" id="cu-lib">' + libList() + '</div>'; }

/* ===== SÒNG BẠC ===== */
const CS = {stone:'thuong', bet:100, game:'tx', msg:'', cards:null};
const MAXBET = 10000, GAMES = {tx:'Tài / Xỉu (x2)', quay:'Quay số (đến x5)', the:'Lật thẻ (x5)'};
function wager(mult, text) { const k = CS.stone; A.addStones(k, -CS.bet); const win = Math.round(CS.bet * mult); if (win) A.addStones(k, win);
  CS.msg = text + (mult ? ' → trả x' + mult + ' (' + fmt(win) + ')' : ' → thua ' + fmt(CS.bet)) + ' ' + stName(k);
  mult > 1 ? ok('Thắng! Nhận ' + fmt(win) + ' ' + stName(k) + ' (lãi ' + fmt(win - CS.bet) + '). ' + wal()) : mult === 1 ? inf('Hòa vốn: cược ' + fmt(CS.bet) + ' được trả lại đủ. ' + wal()) : no('Thua! Đã trừ ' + fmt(CS.bet) + ' linh thạch ' + stName(k) + '. ' + wal()); }
const stName = k => ST.find(s => s.k === k).n;
function casinoHtml() {
  const bal = A.getStones()[CS.stone] || 0;
  return '<div class="cu-tabs">' + ST.slice(0, 3).map(s => '<button class="cu-sm' + (CS.stone === s.k ? ' on' : '') + '" data-a="cst" data-v="' + s.k + '">' + s.n + ' (' + fmt(A.getStones()[s.k] || 0) + ')</button>').join('') + '</div>' +
    '<div class="cu-hoi"><span>Cược</span><button class="cu-sm" data-a="cbet" data-v="/2">½</button><input type="number" data-i="bet" value="' + CS.bet + '" min="1" max="' + MAXBET + '"><button class="cu-sm" data-a="cbet" data-v="*2">x2</button><button class="cu-sm" data-a="cbet" data-v="max">Max</button></div>' +
    '<p class="cu-s">Tối đa ' + fmt(MAXBET) + ' mỗi lần · Trúng cao nhất x5.</p>' +
    '<div class="cu-tabs">' + Object.keys(GAMES).map(g => '<button class="cu-sm' + (CS.game === g ? ' on' : '') + '" data-a="cg" data-v="' + g + '">' + GAMES[g] + '</button>').join('') + '</div>' +
    (CS.game === 'tx' ? '<div class="cu-two"><button class="cu-b" data-a="play" data-v="tai">🎲 Tài (11-17)</button><button class="cu-b" data-a="play" data-v="xiu">🎲 Xỉu (4-10)</button></div><p class="cu-s">Ba con xúc xắc giống nhau (bão) nhà ăn hết.</p>' :
     CS.game === 'quay' ? '<button class="cu-b" data-a="play" data-v="quay">🎡 Quay</button>' :
     '<div class="cu-cards">' + [0,1,2,3,4,5,6].map(i => '<button class="cu-card2" data-a="play" data-v="' + i + '">' + (CS.cards ? CS.cards[i] : '🂠') + '</button>').join('') + '</div><p class="cu-s">Chọn 1 trong 7 thẻ.</p>') +
    (CS.msg ? '<div class="cu-res">' + esc(CS.msg) + '</div>' : '') + '<p class="cu-s">Số dư ' + stName(CS.stone) + ': ' + fmt(bal) + '</p>'; }
function play(v) {
  if (CS.bet < 1 || CS.bet > MAXBET) return CS.msg = '', no('Mức cược không hợp lệ: chỉ được cược từ 1 đến ' + fmt(MAXBET) + '.');
  if ((A.getStones()[CS.stone] || 0) < CS.bet) return CS.msg = '', no('Không đủ linh thạch ' + stName(CS.stone) + ': cược ' + fmt(CS.bet) + ', bạn có ' + fmt(A.getStones()[CS.stone] || 0) + '. Chưa bị trừ gì.');
  if (CS.game === 'tx') { const d = [rnd(1,6), rnd(1,6), rnd(1,6)], s = d[0] + d[1] + d[2], bao = d[0] === d[1] && d[1] === d[2];
    wager(!bao && ((s >= 11) === (v === 'tai')) ? 2 : 0, '🎲 ' + d.join('-') + ' = ' + s + (bao ? ' (bão)' : s >= 11 ? ' Tài' : ' Xỉu')); }
  else if (CS.game === 'quay') { let r = Math.random(), m = 0; const W = [[.52,0],[.22,1],[.14,2],[.07,3],[.03,4],[.02,5]];
    for (const [p, x] of W) { if (r < p) { m = x; break; } r -= p; } wager(m, '🎡 Ra x' + m); }
  else { const c = shuffle(['x5','x1','x0','x0','x0','x0','x0']); CS.cards = c; const m = +c[+v].slice(1); wager(m, '🂠 Thẻ ' + (+v + 1) + ': ' + c[+v]); } }

/* ===== KHUNG UI ===== */
let cfg, root, stack = [], note = '', noteT = 'info';
const ok = m => (noteT = 'ok', note = m), no = m => (noteT = 'no', note = m), inf = m => (noteT = 'info', note = m);
const wal = () => { const w = A.getStones(); return 'Số dư: ' + ST.map(x => x.n + ' ' + fmt(w[x.k] || 0)).join(' · ') + '.'; };
const needMsg = (n, what) => 'Không đủ linh thạch ' + what + ': cần ' + fmt(n) + ', bạn có ' + fmt(A.wealth()) + ' (quy Thường). Chưa bị trừ gì.';
const fullMsg = what => 'Túi đã đầy (0 ô trống), không thể ' + what + '. Cất bớt đồ rồi thử lại.';
const FEAT = {
  su_vu:['📋','Sự vụ','Nhận nhiệm vụ của ' , () => go({title:'Sự vụ', html:questHtml})],
  phuong_thi:['🏮','Phường thị tu sĩ','Mua bán vật phẩm cơ bản → trung bình', () => go({title:'Phường thị tu sĩ', html:ptHtml})],
  dau_gia:['🔨','Đại hội đấu giá','10 vật phẩm mỗi phiên, tranh giá cùng tu sĩ khác', () => { auSession(); go({title:'Đấu giá lâu', sub:cfg.name, parch:1, html:() => AU.consigning ? consignHtml() : auHtml()}); }],
  van_bao:['🏛️','Phân hội Vạn Bảo','Vật phẩm cao cấp · Lò luyện đan · Thư viện', () => go({title:'Phân hội Vạn Bảo', html:() => '<button class="cu-b" data-a="go" data-v="vb">Vật phẩm trung → cao cấp</button><button class="cu-b" data-a="go" data-v="alch">Lò luyện đan</button><button class="cu-b" data-a="go" data-v="lib">Thư viện</button>'})],
  song_bac:['🎲','Sòng bạc','Đánh bạc bằng linh thạch', () => go({title:'Sòng bạc', html:casinoHtml})],
  thu_vien:['📚','Thư viện','Tra cứu Đan dược, Linh thảo, Vật phẩm...', () => go({title:'Thư viện', html:libHtml})]
};
function menuHtml() {
  const f = cfg.features || (cfg.type === 'village' ? ['su_vu','phuong_thi'] : Object.keys(FEAT));
  return '<button class="cu-b gold" data-a="rest"><b>🏯 Nghỉ ngơi trong thành</b><small>Hồi đầy HP, linh lực, hồn lực. Qua một ngày. Miễn phí.</small></button>' +
    f.map(k => '<button class="cu-b" data-a="feat" data-v="' + k + '"><b>' + FEAT[k][0] + ' ' + FEAT[k][1] + '</b><small>' + FEAT[k][2] + (k === 'su_vu' ? esc(cfg.name) : '') + '</small></button>').join('') +
    '<button class="cu-b" data-a="close">Rời thành</button>'; }
function css() { if (document.getElementById('cu-css')) return; const s = document.createElement('style'); s.id = 'cu-css'; s.textContent = `
.cu-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;font-family:Georgia,'Times New Roman',serif}
.cu-box{width:min(96vw,560px);max-height:94vh;display:flex;flex-direction:column;background:linear-gradient(#1b3a4a,#14283a);border:2px solid #c9a24d;border-radius:18px;color:#d9d2bd;padding:14px;box-sizing:border-box}
.cu-box.parch{background:#efe6cf;color:#3b3226;border-color:#8b2a24}
.cu-hd{display:flex;align-items:center;gap:8px}.cu-hd h2{flex:1;margin:0;font-size:22px;color:#e8c872}.parch .cu-hd h2{color:#8b2a24}
.cu-x,.cu-back{background:#6b4a2b;color:#fff;border:1px solid #c9a24d;border-radius:8px;width:38px;height:38px;font-size:18px;cursor:pointer}
.cu-wal{font-size:12px;opacity:.85;margin:6px 0}.cu-bd{overflow:auto;flex:1}
.cu-b{display:block;width:100%;text-align:left;margin:8px 0;padding:12px 14px;border-radius:12px;border:1px solid #3b5d73;background:rgba(255,255,255,.05);color:inherit;font:inherit;font-size:17px;cursor:pointer}
.cu-b small{display:block;opacity:.75;font-size:13px;margin-top:2px}.cu-b.gold{background:linear-gradient(#c19a55,#a8803d);color:#2a1d08;border-color:#e0bd72}
.parch .cu-b{background:#f6efd9;border:2px solid #3b3226;text-align:center;font-weight:bold}.cu-b.alt{opacity:.85}.cu-b:disabled,.cu-sm:disabled{opacity:.4;cursor:not-allowed}
.cu-two{display:flex;gap:8px}.cu-two .cu-b{text-align:center;font-size:15px}
.cu-sm{padding:6px 10px;margin:2px;border-radius:8px;border:1px solid #3b5d73;background:rgba(255,255,255,.08);color:inherit;font:inherit;cursor:pointer}.cu-sm.on{background:#c9a24d;color:#222}
.parch .cu-sm{border-color:#3b3226}
.cu-r{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:7px 4px;border-bottom:1px solid rgba(128,128,128,.3)}.cu-r.out{opacity:.45}.cu-r span{white-space:nowrap;font-size:13px}
.cu-s{font-size:13px;opacity:.8;margin:3px 0}.cu-m{opacity:.7;text-align:center}.cu-err{color:#a11;font-weight:bold}.ok{color:#7bc47f}.no{color:#e07070}
.cu-card{display:flex;gap:10px;padding:10px;border:1px solid rgba(128,128,128,.4);border-radius:10px;margin:8px 0}.cu-card.col{flex-direction:column}.cu-say{font-style:italic;opacity:.9}
.cu-ic{font-size:34px}.cu-nm{font-size:19px}.cu-big{font-size:18px;margin:6px 0}.cu-big b{font-size:30px;color:#1f7a4a}
.cu-strip{display:flex;gap:6px;overflow:auto;padding-bottom:6px}.cu-chip{min-width:110px;padding:6px;border:1px solid rgba(128,128,128,.5);border-radius:8px;font-size:13px}.cu-chip.on{border-width:2px;border-color:#c9a24d}.cu-chip.dn{opacity:.55}.cu-chip small{display:block;opacity:.8}
.cu-hoi{display:flex;align-items:center;gap:6px;margin:8px 0}.cu-hoi span{flex:0 0 auto}.cu-hoi input,.cu-q{flex:1;min-width:0;padding:8px;font:inherit;border-radius:8px;border:1px solid #888;background:#fffdf5;color:#222;text-align:center}.cu-hoi .cu-b{width:auto;margin:0}.cu-q{width:100%;box-sizing:border-box;text-align:left;margin-bottom:6px}
.cu-tabs{display:flex;flex-wrap:wrap;gap:2px;margin:6px 0}.cu-note{background:rgba(201,162,77,.2);border:1px solid #c9a24d;border-radius:8px;padding:8px;margin:6px 0;font-size:14px}
.cu-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.cu-card2{font-size:26px;padding:14px 0;border-radius:8px;border:1px solid #888;background:rgba(255,255,255,.08);color:inherit;cursor:pointer}
.cu-nt{display:none;align-items:flex-start;gap:8px;margin:4px 0;padding:8px 10px;border-radius:8px;font-size:14px;line-height:1.35;border:1px solid #c9a24d;background:rgba(201,162,77,.22)}.cu-nt.show{display:flex}.cu-nt div{flex:1}.cu-nt span{font-weight:bold}.cu-nt button{background:none;border:0;color:inherit;font-size:20px;line-height:1;cursor:pointer;min-width:32px;min-height:32px}.cu-nt.ok{border-color:#3f9b55;background:rgba(63,155,85,.2)}.cu-nt.no{border-color:#c0443b;background:rgba(192,68,59,.2)}.cu-why{font-style:italic}
.cu-res{margin:10px 0;padding:10px;border-radius:8px;background:rgba(201,162,77,.2);font-size:16px}`; document.head.appendChild(s); }
function render(keep) {
  const s = stack[stack.length - 1], bd = root.querySelector('.cu-bd'), top = keep ? bd.scrollTop : 0;
  root.querySelector('.cu-box').classList.toggle('parch', !!s.parch);
  root.querySelector('h2').textContent = s.title; root.querySelector('.cu-back').style.display = stack.length > 1 ? '' : 'none';
  const w = A.getStones(); root.querySelector('.cu-wal').innerHTML = (s.sub ? esc(s.sub) + ' · ' : '') + '💎 ' + ST.map(x => x.n + ' ' + fmt(w[x.k] || 0)).join(' · ');
  const nt = root.querySelector('.cu-nt'); nt.className = 'cu-nt' + (note ? ' show ' + noteT : ''); nt.innerHTML = note ? '<span>' + (noteT === 'ok' ? '✔' : noteT === 'no' ? '✖' : 'ℹ') + '</span><div>' + esc(note) + '</div><button data-a="nclose">×</button>' : '';
  bd.innerHTML = s.html(); bd.scrollTop = top; }
function go(s) { note = ''; stack.push(s); render(); }
const ACT = {
  nclose() { note = ''; render(true); },
  close() { root.remove(); root = null; stack = []; A.onLeave && A.onLeave(); },
  back() { note = ''; if (AU && AU.consigning) AU.consigning = false; else if (stack.length > 1) stack.pop(); render(); },
  rest() { ok(A.onRest() + ' Không tốn linh thạch.'); render(true); },
  feat(d) { FEAT[d.v][3](); },
  go(d) { go({vb:{title:'Vạn Bảo · Vật phẩm', html:vbHtml}, alch:{title:'Lò luyện đan', html:alchHtml}, lib:{title:'Thư viện', html:libHtml}}[d.v]); },
  quest(d) { const q = questsFor(cfg.name).find(x => x.id === d.v); if (!q) { no('Không tìm thấy nhiệm vụ.'); return render(true); }
    const st = A.questState ? A.questState(q) : 'avail';
    if (st !== 'avail') no('Không thể nhận «' + q.name + '». ' + whyQ(q, st));
    else { const r = A.acceptQuest(q); (r && r.ok === false ? no : ok)(((r && r.msg) || 'Đã nhận nhiệm vụ: ' + q.name + '.') + (r && r.ok === false ? '' : ' Nhiệm vụ không tốn linh thạch; xem tiến độ ở thanh Nhiệm vụ.')); }
    render(true); },
  qclaim(d) { const r = A.claimQuest(d.v); (r && r.ok === false ? no : ok)((r && r.msg) || 'Đã nhận thưởng.'); render(true); },
  pt(d) { PT = d.v; render(); }, buy(d) { const [i, p, q] = d.v.split('|'); buy(i, +p, q); render(true); }, sell(d) { const [i, p, q] = d.v.split('|'); sell(i, +p, q); render(true); },
  vbuy(d) { const s = vbStock().list.find(x => x.id === d.v); if (!s) return;
    if (s.qty < 1) no(IT(s.id).name + ' đã bán hết trong phiên hôm nay. Làm mới vào ngày mai.'); else if (A.bagFree() < 1) no(fullMsg('mua') + ' Chưa bị trừ linh thạch.'); else if (!A.pay(s.price)) no(needMsg(s.price, 'để mua ' + IT(s.id).name));
    else { s.qty--; A.addItem(s.id); ok('Đã mua ' + IT(s.id).name + '. Đã trừ ' + fmt(s.price) + ' linh thạch (quy Thường). ' + wal()); } render(true); },
  alch(d) { const r = RECIPES[+d.v], o = IT(r.out);
    const miss = Object.keys(r.in).filter(id => A.count(id) < r.in[id]).map(id => (IT(id) ? IT(id).name : id) + ' (cần ' + r.in[id] + ', có ' + A.count(id) + ')');
    if (miss.length) no('Thiếu nguyên liệu: ' + miss.join(', ') + '. Chưa tiêu hao gì.'); else if (A.bagFree() < 1) no(fullMsg('luyện') + ' Chưa tiêu hao gì.'); else if (!A.pay(r.fee)) no(needMsg(r.fee, 'trả phí lò'));
    else { Object.keys(r.in).forEach(id => A.removeItem(id, r.in[id])); const cost = 'Đã trừ phí lò ' + fmt(r.fee) + ' linh thạch và tiêu hao nguyên liệu. ';
      if (Math.random() < r.rate) { A.addItem(r.out); ok('Luyện thành công: ' + o.name + '! ' + cost + wal()); } else no('Luyện thất bại, nguyên liệu hóa tro. ' + cost + wal()); } render(true); },
  lt(d) { LB.type = d.v; render(true); },
  bid(d) { auBid(+d.v); render(true); }, hoi() { auBid(+AU.input); render(true); }, pass() { auPass(); render(true); },
  inc(d) { AU.input = Math.max(minBid(AU.lots[AU.idx]), (+AU.input || 0) + +d.v); render(true); },
  consign() { AU.consigning = true; render(); }, cs(d) { auConsign(d.v); AU.consigning = false; render(true); },
  cst(d) { CS.stone = d.v; render(true); }, cg(d) { CS.game = d.v; CS.cards = null; CS.msg = ''; render(true); },
  cbet(d) { CS.bet = d.v === 'max' ? MAXBET : d.v === '/2' ? Math.max(1, Math.floor(CS.bet / 2)) : Math.min(MAXBET, CS.bet * 2); render(true); },
  play(d) { play(d.v); if (CS.game !== 'the') CS.cards = null; render(true); }
};
function open(c) { cfg = Object.assign({name:'Thành', type:'city'}, c || {}); if (root) root.remove(); css();
  root = document.createElement('div'); root.className = 'cu-ov';
  root.innerHTML = '<div class="cu-box"><div class="cu-hd"><button class="cu-back" data-a="back">‹</button><h2></h2><button class="cu-x" data-a="close">✕</button></div><div class="cu-wal"></div><div class="cu-nt"></div><div class="cu-bd"></div></div>';
  const openedAt = Date.now(); /* chạm ô thành mở bảng ngay lúc nhấc tay; cú click theo sau sẽ rơi trúng nút bên dưới ngón tay (vd. Đấu giá) → bỏ qua click trong 600ms đầu */
  root.addEventListener('click', e => { if (Date.now() - openedAt < 600) { e.preventDefault(); e.stopPropagation(); return; } const t = e.target.closest('[data-a]'); if (!t || t.disabled) return; const f = ACT[t.dataset.a]; f && f(t.dataset); });
  root.addEventListener('input', e => { const t = e.target, k = t.dataset.i; if (k === 'au') AU.input = +t.value; else if (k === 'bet') CS.bet = Math.max(0, Math.min(MAXBET, Math.floor(+t.value || 0))); else if (k === 'lib') { LB.q = t.value; root.querySelector('#cu-lib').innerHTML = libList(); } });
  if (AU) AU.consigning = false; document.body.appendChild(root); note = ''; noteT = 'info'; stack = [{title:cfg.name, html:menuHtml}]; render(); }

function setItems(db) { // nạp từ database/city-items.json
  const toT = {herb:'thao', pill:'dan', artifact:'khi', talisman:'phu', ore:'khoang'}, L = [];
  ['materials', 'items'].forEach(k => (db[k] || []).forEach(e => { if (e && e.id && e.cat) L.push({id:e.id, name:e.name, type:e.cat, tier:Math.min(5, Math.max(1, e.rarity | 0 || 1)), price:+e.price || 1, he:e.he || '—', desc:e.desc || ''}); }));
  if (L.length) { ITEMS.length = 0; L.forEach(x => ITEMS.push(x)); }
  if (Array.isArray(db.recipes) && db.recipes.length) { const R = db.recipes.slice(); RECIPES.length = 0; R.forEach(x => RECIPES.push(x)); } }
function toDB() { // xuất ITEMS hiện có thành format database của game
  const br = {thao:'herb', dan:'pill', khi:'artifact', phu:'talisman', khoang:'ore'}, use = {cty_hoi_khi_dan:['cell',40], cty_trung_hoi_khi_dan:['cell',150], cty_cao_hoi_khi_dan:['cell',400],
    cty_hoi_huyet_dan:['nano',25], cty_trung_hoi_huyet_dan:['nano',50], cty_cao_hoi_huyet_dan:['nano',100], cty_ngung_hon_dan:['tonic',60], cty_cao_ngung_hon_dan:['tonic',200]};
  const db = {_note:'Vật phẩm của hệ thống Thành/Làng (city-ui.js). Có thể sửa tay: price = giá trị quy về linh thạch Thường, cat = thao|dan|khi|phu|khoang.', materials:[], items:[], recipes:RECIPES};
  ITEMS.forEach(i => { const e = {id:i.id, name:i.name, rarity:i.tier, desc:i.desc, price:i.price, he:i.he, cat:i.type};
    if (use[i.id]) { e.type = use[i.id][0]; e.val = use[i.id][1]; db.items.push(e); } else { e.branch = br[i.type]; db.materials.push(e); } });
  return db; }
global.CityUI = {setItems, toDB, open, close:() => root && ACT.close(), configure:o => Object.assign(A, o), adapter:A, items:ITEMS, recipes:RECIPES, npcs};
})(window);
