# NPC & Nhiệm vụ --- Mecha Star Link

**Repository chuẩn:** https://github.com/adumaVn007/Mecha-Star-Link

## Quy tắc bắt buộc

1.  Trước khi sửa, kiểm tra branch, cấu trúc repo và phiên bản mới nhất
    của các file liên quan. Đọc code, schema và database thực tế; tối
    thiểu rà soát bản đồ/NPC, nhiệm vụ, save, UI và
    `database/mecha-studio.json`, `database-schema.md`.
2.  Hiểu luồng tích hợp hiện tại trước khi thiết kế. Không đoán schema,
    không tạo game/demo thay thế, không viết lại hệ thống đang chạy.
3.  Chỉ sửa tối thiểu các file cần thiết; giữ nguyên bản đồ isometric,
    chiến đấu, nhân vật, túi đồ, taskbar và chức năng hiện có.

## Phạm vi triển khai

### NPC & hội thoại

Tích hợp đủ NPC nhiệm vụ, thương nhân, hướng dẫn và cốt truyện. Mỗi NPC
có ID duy nhất, tên/ảnh/mô tả, vị trí, chức năng, hội thoại, điều kiện
xuất hiện và liên kết nhiệm vụ. Hỗ trợ NPC cố định, di chuyển hoặc xuất
hiện theo thời gian/sự kiện; có lịch trình và hành vi phù hợp.

Hội thoại hỗ trợ dạng đơn giản, lựa chọn và phân nhánh. Nội dung/lựa
chọn có thể thay đổi theo nhiệm vụ, danh tiếng và quyết định trước đó;
lựa chọn phải kích hoạt logic thật (nhận nhiệm vụ, mở cửa hàng/nội dung,
thay đổi trạng thái), không chỉ là chữ trang trí.

### Nhiệm vụ

Hỗ trợ chính tuyến, phụ tuyến, chuỗi nhiệm vụ, nhiệm vụ có điều kiện,
lựa chọn/nhiều kết quả và nhiệm vụ lặp lại khi phù hợp. Mỗi nhiệm vụ cần
có ID, mô tả, NPC liên quan, điều kiện nhận/hoàn thành, mục tiêu và tiến
độ (đối thoại, tiêu diệt, thu thập, khám phá, tương tác), trạng thái và
liên kết mở khóa nhiệm vụ tiếp theo.

Trạng thái tối thiểu: chưa mở, có thể nhận, đang làm, hoàn thành, đã
nhận thưởng. Theo dõi và lưu tiến độ chính xác.

### Phần thưởng & danh tiếng

Dùng các loại EXP, tiền và vật phẩm đã có trong game/database. Bổ sung
danh tiếng theo NPC/phe phái/khu vực nếu kiến trúc hiện tại cho phép;
danh tiếng có thể ảnh hưởng hội thoại, nhiệm vụ, cửa hàng, quan hệ và mở
khóa danh hiệu/khu vực/nội dung. Không tự tạo tiền tệ/vật phẩm hoặc ID
trùng; mọi phần thưởng phải cấu hình được và được trao đúng một lần.

### UI

Giữ phong cách và cấu trúc giao diện hiện tại; tích hợp NPC trên bản đồ,
hội thoại, nhật ký/theo dõi nhiệm vụ và thông báo tiến độ. Không tự ý
đổi bố cục, taskbar hay bản đồ. Tối ưu mobile, đặc biệt màn hình dọc;
mọi nút phải hoạt động.

## Database & save

-   Database dùng chung chỉ lưu định nghĩa NPC, nhiệm vụ, điều kiện và
    phần thưởng.
-   Tiến độ, lựa chọn, danh tiếng và trạng thái riêng của người chơi lưu
    trong save cá nhân; tuyệt đối không ghi save cá nhân vào JSON dùng
    chung trên GitHub.
-   Tuân thủ schema hiện có; nếu cần mở rộng, chọn thay đổi nhỏ nhất và
    tương thích ngược.
-   Giữ nguyên save cũ, có migration/default an toàn; không mất dữ liệu
    hoặc phá luồng lưu/tải.

## Quy trình & nghiệm thu

Triển khai theo thứ tự: **kiểm tra hiện trạng → đề xuất thiết kế/tệp cần
sửa → tích hợp NPC → hội thoại → nhiệm vụ → danh tiếng/phần thưởng →
kiểm thử**. Nếu phát hiện thiếu nền tảng hoặc có nguy cơ phá dữ liệu,
dừng và nêu phương án trước khi sửa diện rộng.

Kiểm tra thực tế: NPC/vị trí/lịch trình; hội thoại và nhánh lựa chọn;
nhận--theo dõi--hoàn thành nhiệm vụ; chuỗi/điều kiện; thưởng không bị
nhân đôi; danh tiếng/mở khóa; lưu/tải và save cũ; mobile; không hồi quy
chức năng cũ.

Kết thúc, báo cáo ngắn: file đã sửa, thay đổi chính, kiểm thử đã chạy và
kết quả, vấn đề còn lại. **Không tuyên bố đã sửa, test, commit hoặc
deploy nếu chưa thực sự thực hiện.**

**Ưu tiên cao nhất: đọc và hiểu repository/database hiện tại trước khi
sửa; tích hợp vào game đang có, bảo toàn dữ liệu và chức năng.**
