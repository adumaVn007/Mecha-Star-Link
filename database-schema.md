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

## Phẩm chất — trường `rarity` (MỚI, tùy chọn) trên `equips[]`, `items[]`, `materials[]`
Số 1–6: 1 Phổ thông · 2 Tốt · 3 Hiếm · 4 Sử thi · 5 Truyền thuyết · 6 Thần thoại. Thiếu trường = 1. Thêm/sửa trong Mecha Studio (`admin.html`, ô "Phẩm chất"). Dữ liệu cũ vẫn đọc được.

## Túi đồ & Trang bị của người chơi — nằm trong SAVE (`vg_save_v1`), KHÔNG ghi vào database (MỚI)
Module `vg-bag.js`. Khóa tùy chọn trong save: `inv {id:số lượng}` (id = id trong `mecha-studio.json`), `eq {slot:id}` (slot: head, body, shoulder, arm, glove, leg, boot, weapon, backpack, wing, pet, drone), `petBag {id:số lượng}`, `eqB {max,atk,spd,sh}` (tổng chỉ số trang bị, tính lại từ database mỗi lần mặc/tháo/mở túi). Vật phẩm cũ `cell/tonic/nano/shcell` vẫn ở `ST.items`. Save cũ không có các khóa này vẫn chạy.
Sức chứa túi chính 200 ô (10 ô/hàng), mỗi id là 1 ô (cộng dồn số lượng). Túi đầy → vào `petBag` (cần mặc Ba lô + Pet, tối đa 20 ô); không có Pet thì báo không nhặt được. Hàm nhặt đồ: `VG.bag.add(ST, id, qty)` → `{ok, where, msg}`.
Pet/Drone: `hp` là HP riêng, không cộng vào chỉ số Mecha. Cánh/Drone/Pet cần mặc Ba lô trước.

## `database/monsters.json` (v:1) — Quái & Boss (MỚI)
Tạo/sửa bằng `AdminEditMonster.html`. `{ v:1, monsters:[ … ] }`. Trộn vào `world.monsters` theo `id` (trùng id = ghi đè quái gốc trong `world-events.json`); quái thiếu `hp`/`atk`/`spd` > 0 thì bị bỏ qua (chưa vào game).
Mỗi quái: `id`, `name`, `kind` (`monster`|`boss`), `shape` (wolf|turtle|tiger), `rank` (0–48, cùng hệ cảnh giới người chơi), `hp`/`atk`/`spd`/`sh` (chỉ số cơ bản, lấy từ database), `weight` (trọng số xuất hiện), `xp` (tùy chọn, trống = theo sự kiện), `terrain[]` (trống = mọi nơi), `roam` (di chuyển trên bản đồ; 5 phút/bước theo đồng hồ thật), `range` (phạm vi tấn công, ô; 0 = tự động theo bậc), `angry` (0–100, độ hung dữ), `img` (data URL), `desc`.
Boss: `bossMap {x, y, roam (bán kính đi lại), respawnDays, respawnKills, tier}`; hạ boss thì hồi sinh sau số ngày hoặc số trận (`ST.bossDown` trong save).
Kích thước trên bản đồ: `0.8 + 0.025 × rank`; `rank 48` (Thần Giai) chiếm 3×3 ô. Số quái trên bản đồ = ×3 bản cũ; vùng ngoài lãnh thổ và xa thành dày hơn trong lãnh thổ. Quái chọn theo cảnh giới người chơi (±4 bậc, lệch theo cấp sự kiện), mỗi lần giao chiến có 35% đổi sang loại khác cùng cỡ ô.
