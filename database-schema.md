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
