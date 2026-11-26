# Vân Giáp — Định dạng dữ liệu của `database/mecha-studio.json` (cập nhật)

> Phần đánh dấu MỚI do bản `admin.html` này thêm. Trường cũ giữ nguyên, dữ liệu cũ vẫn đọc được.

## Cảnh giới chính thức (MỚI) — trường `realm` (số 0–48, trống = chưa đặt)
| realm | Cảnh giới |
|---|---|
| 0–11 | Hoàng / Huyền / Địa / Thiên Giai, mỗi giai: Sơ, Trung, Hậu kỳ (0–2 Hoàng, 3–5 Huyền, 6–8 Địa, 9–11 Thiên) |
| 12–47 | Thánh Giai: 12 tầng × (Sơ, Trung, Hậu) = 36 bậc |
| 48 | Thần Giai |

Trường cũ `rank` (nhân vật) và `lv` (quái) vẫn là "Thánh Giai bậc N" mà game hiện tại dùng, KHÔNG đổi. `realm` là trường mới đứng cạnh. Cần chủ dự án quyết định cách nối hai hệ (xem ghi chú bàn giao).

## Nhân vật `humans[]` — thêm `str`, `agi`, `int`, `realm`
Sức mạnh (máu, sát thương cơ bản) · Nhanh nhẹn (tốc độ, chính xác) · Trí tuệ (mana, khả năng áp dụng hiệu ứng).

## Pet và Drone — vẫn là `equips[]` với `slot:"pet"` hoặc `slot:"drone"`
Trường mới: `mpAtk`, `dmg`, `dmgType:"nontype"`, `dmgShape:"single"|"aoe"`, `acc`, `skill:"<id nguyên liệu nhánh skill>"`, `dur` (ẩn), `recipe:[{m:"<id nguyên liệu>", q:số lượng}]`.
`hp` của Pet/Drone là HP riêng của nó (không phải "+HP" cho Mecha). `dtype` (Sentry/Repair/Shield) giữ nguyên.
`dur`: số lần hư hỏng/thu hồi tối đa trước khi bị phá hủy hoàn toàn.
Chỉ số cuối = giá trị gốc + Σ (q × ảnh hưởng của nguyên liệu).

## `materials[]` — Nguyên liệu (MỚI)
`{ id, name, img?, desc, branch:"monster"|"herb"|"pill"|"method"|"skill", realm?, fxHp, fxMp, fxDmg, fxAcc, fxDur }`
- monster = Tài liệu từ quái vật · herb = Linh dược / quả kì bí · pill = Đan dược · method = Công pháp · skill = Skill.
- `realm` dùng cho Công pháp và Skill. Các `fx*` là ảnh hưởng lên Pet/Drone cho mỗi 1 nguyên liệu (Skill không có `fx*`).

## `database/stat-formula.json` (v:3)
Xuất từ trang Công thức. Trang Hồ sơ đọc tệp này. Có thể chưa tồn tại trên GitHub.

## Hàm GitHub cho trang Công thức/Hồ sơ (`vg-github.js`)
`VG.loadDB()`, `VG.loadFormula()`, `VG.save(path, obj, message)`. Chỉ ghi được `database/stat-formula.json`. Token lưu sessionStorage.
Mecha Studio (`admin.html`) có đồng bộ GitHub riêng, đã có sẵn từ trước.

## `database/npc.json` (v:1) — NPC trong game (MỚI)
Tạo/sửa bằng `AdminEditNPCPlayer.html` (trước đây là `player.html`). `{ v:1, npcs:[ … ] }`
Mỗi NPC: `id`, `name`, `title`, `role` (dan|thuong|dan_su|tho_ren|nhiem_vu|thu_ve|tong_mon|khac), `faction`, `rank` (0–48, cảnh giới như `realm`), `level`, `str`/`agi`/`int` (chỉ số gốc), `zone` (id trong `world-events.json`), `x`/`y` (ô trên bản đồ), `attitude` (friendly|neutral|hostile), `lines[]` (lời thoại), `bio`, `img` (data URL).
Ràng buộc khi lưu: ô nằm trong bản đồ khu vực, không trùng điểm xuất phát, không trùng NPC khác cùng ô.

## `database/jobs.json` (v:1) — Nghề (MỚI)
Tạo/sửa bằng `EditJobMSL.html`. `{ v:1, jobs:[ … ] }`. Mỗi nghề: `id`, `name`, `icon`, `desc`,
`levels[]` (`{name, exp}` — thứ tự = cấp 1,2,3…; `exp` = EXP lên cấp kế tiếp, cấp cuối 0),
`equips[]` (`{id, name, slot, reqLv, desc, img}`), `recipes[]` (`{id, name, reqLv, exp, mats, out, desc}`; `reqLv` = cấp nghề mở khóa, `exp` = EXP nhận khi chế).
Tiến trình nghề của người chơi lưu trong save: `ST.jobs[jobId] = { lv, xp }` (mặc định cấp 1, 0 EXP).

## Phẩm chất — trường `rarity` (tùy chọn) trên `equips[]`, `items[]`, `materials[]` và trang bị nghề (`jobs.json › equips[]`)
5 bậc, thấp → cao: 1 Phổ thông · 2 Tốt · 3 Hiếm · 4 Sử thi · 5 Truyền thuyết. Thiếu trường = 1. Dữ liệu cũ có `rarity` = 6 (Thần thoại, đã bỏ) tự gộp vào 5 khi mở Mecha Studio / vào game.
Thêm/sửa: Mecha Studio (`admin.html`, ô "Phẩm chất", có thanh lọc theo phẩm chất; danh sách xếp từ thấp → cao) và `EditJobMSL.html` (trang bị nghề).

## Phẩm cấp nhiệm vụ — trường `grade` (tùy chọn) trên `quests[]` của `database/quests.json`
Cùng 5 bậc với phẩm chất (1–5, thiếu = 1, lớn hơn 5 gộp về 5). Thêm/sửa trong `editmisson.html` (ô "Phẩm cấp"). Trong game: bảng Nhiệm vụ có thanh lọc phẩm cấp, mỗi nhóm trạng thái xếp thấp → cao, viền màu + nhãn phẩm cấp ở danh sách và chi tiết.

## Giao diện chỉnh sửa dùng chung
`vg-admin.css` + `vg-admin.js` là mẫu duy nhất cho `admin.html`, `AdminEditNPCPlayer.html`, `AdminEditMonster.html`, `EditJobMSL.html`, `editmisson.html`, `stat-formula.html`, `player.html`: màu/phông nằm ở biến `:root` của `vg-admin.css`; `vg-admin.js` chèn thanh điều hướng giữa các công cụ. Trang dạng form gắn `class="ed"` vào `<body>`. `worldmap-editor.html` là trình vẽ bản đồ toàn màn hình nên giữ bố cục riêng (đã có trong thanh điều hướng của các trang khác).

## Túi đồ & Trang bị của người chơi — nằm trong SAVE (`vg_save_v1`), KHÔNG ghi vào database (MỚI)
Module `vg-bag.js`. Khóa tùy chọn trong save: `inv {id:số lượng}` (id = id trong `mecha-studio.json`), `eq {slot:id}` (slot: head, body, shoulder, arm, glove, leg, boot, weapon, backpack, wing, pet, drone), `petBag {id:số lượng}`, `eqB {max,atk,spd,sh}` (tổng chỉ số trang bị, tính lại từ database mỗi lần mặc/tháo/mở túi). Vật phẩm cũ `cell/tonic/nano/shcell` vẫn ở `ST.items`. Save cũ không có các khóa này vẫn chạy.
Sức chứa túi chính 200 ô (10 ô/hàng), mỗi id là 1 ô (cộng dồn số lượng). Túi đầy → vào `petBag` (cần mặc Ba lô + Pet, tối đa 20 ô); không có Pet thì báo không nhặt được. Hàm nhặt đồ: `VG.bag.add(ST, id, qty)` → `{ok, where, msg}`.
Pet/Drone: `hp` là HP riêng, không cộng vào chỉ số Mecha. Cánh/Drone/Pet cần mặc Ba lô trước.

## `database/monsters.json` (v:1) — Quái & Boss (MỚI)
Tạo/sửa bằng `AdminEditMonster.html`. `{ v:1, monsters:[ … ] }`. Trộn vào `world.monsters` theo `id` (trùng id = ghi đè quái gốc trong `world-events.json`); quái thiếu `hp`/`atk`/`spd` > 0 thì bị bỏ qua (chưa vào game).
Mỗi quái: `id`, `name`, `kind` (`monster`|`boss`), `shape` (wolf|turtle|tiger), `rank` (0–48, cùng hệ cảnh giới người chơi), `hp`/`atk`/`spd`/`sh` (chỉ số cơ bản, lấy từ database), `weight` (trọng số xuất hiện), `xp` (tùy chọn, trống = theo sự kiện), `terrain[]` (trống = mọi nơi), `roam` (di chuyển trên bản đồ; 5 phút/bước theo đồng hồ thật), `range` (phạm vi tấn công, ô; 0 = tự động theo bậc), `angry` (0–100, độ hung dữ), `img` (data URL), `desc`.
Boss: `bossMap {x, y, roam (bán kính đi lại), respawnDays, respawnKills, tier}`; hạ boss thì hồi sinh sau số ngày hoặc số trận (`ST.bossDown` trong save).
Kích thước trên bản đồ: `0.8 + 0.025 × rank`; `rank 48` (Thần Giai) chiếm 3×3 ô. Số quái trên bản đồ = ×3 bản cũ; vùng ngoài lãnh thổ và xa thành dày hơn trong lãnh thổ. Quái chọn theo cảnh giới người chơi (±4 bậc, lệch theo cấp sự kiện), mỗi lần giao chiến có 35% đổi sang loại khác cùng cỡ ô.

## `database/quests.json` (v:1) — Nhiệm vụ, thành tựu, danh tiếng (MỚI)
Tạo/sửa bằng `editmisson.html`. Chỉ lưu ĐỊNH NGHĨA; tiến độ người chơi nằm trong save (`ST.q`), không ghi lên GitHub.
`{ v, factions[], repLevels[{min,name,discount}], quests[], achievements[] }`
Nhiệm vụ: `id`, `name`, `type` (system|main|side|chain|daily|repeat), `scope` (country|sect|system = tab hiển thị), `desc`, `giver` (id NPC, trống = nhận trong bảng), `giveAt {x,y,r}`, `turnIn` (id NPC trả), `turnAt {x,y,r}`,
`req {rank, country, quest[], notQuest[], questActive[], flag[], noFlag[], rep{phe:số}, season[0-3], day[a,b]}`,
`objectives[] {t: kill|collect|talk|use|explore|visit, target, n, text, x,y,r (explore), fn (use), consume (collect)}`,
`rewards {xp, stones{thuong,trung,cao,sieu}, items[{id,q}], rep{phe:số}, flags[]}`,
`choices[] {text, rewards, rep, flags}` (nhân quả: người chơi chọn khi trả; thưởng cộng vào thưởng gốc), `next[]` (id nhiệm vụ mở khóa), `repeat {days}`, `onGive`, `onDone`.
Thành tựu: `{id, branch (combat|explore|quest|rep), name, stat (kills|boss|cleared|visited|quests|repMax), goal, reward}`.
Save: `ST.q = {st:{id:{s,p[],d,n,ch}}, flags, rep, ach, pin, track{kills,boss,visited,talk,seen,names}}` — thiếu thì tự tạo mặc định (save cũ chạy bình thường).

## `database/npc.json` (v:2) — trường mở rộng cho NPC (tương thích ngược với v:1)
Giữ nguyên trường cũ. Thêm (tùy chọn): `functions[]` (quest | shop | rest | guide | job:<id nghề>), `shop[{id,price{thuong},q}]` (id = vật phẩm cũ cell/tonic/nano/shcell hoặc id trong mecha-studio.json), `restCost{}`, `guide`, `dialog {start,nodes{id:{text|[{if,text}],choices[{text,go,if,do[]}]}}}` (do: accept|flag|rep|give|shop|rest|openquests|end),
`schedule {mode:'patrol', stepMin, path[{x,y}]}`, `showIf` (cùng cú pháp `req`). `zone:'the_gioi_van_giap'` = ô tuyệt đối trên bản đồ 300×600. Module: `vg-quest.js`.

### Biến số trong mô tả nhiệm vụ (`desc`, `onGive`, `onDone`, `objectives[].text`)
`{n}` `{target}` `{from}` `{to}` `{item}` `{x}` `{y}` `{fn}` (của mục tiêu 1; mục tiêu k dùng `{ok.n}`, `{ok.target}`…), `{giver}` `{turnIn}` `{reward}` `{name}`. Tên lấy từ database (quái, NPC, địa điểm). `text` trống = tự sinh theo loại mục tiêu.
Mục tiêu mới `deliver`: `{t:'deliver', from:<id địa điểm hoặc NPC>, to:<id>, itemName}` — tới `from` để nhận, tới `to` để giao (2 bước, lưu trong save).
