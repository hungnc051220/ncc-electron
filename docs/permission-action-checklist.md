# Checklist Phân Quyền FE

Checklist này dùng để rà soát và duy trì phân quyền ở FE theo catalog hiện tại trong [definitions.ts](/d:/Projects/ncc-admin-app-new/src/renderer/src/permissions/definitions.ts).

## Nguyên tắc chung

- `access`: được vào route/module
- `list`: được xem màn danh sách hoặc nội dung chính của module
- `view`: được xem chi tiết, popup chi tiết, dialog detail
- `create`: được thêm mới hoặc khởi tạo nghiệp vụ
- `update`: được sửa, đổi trạng thái, giữ chỗ, cập nhật cấu hình
- `delete`: được xóa, hủy, bỏ chọn khỏi kế hoạch, hủy vé
- `approve`: được gửi duyệt, duyệt, từ chối, lưu trữ, khôi phục
- `print`: được in hoặc xuất vé
- `export`: được xuất file
- `configure`: được cấu hình, chỉnh seat map, thiết lập online

## Rule triển khai chuẩn

- Menu trái/top phải check `access`
- Router phải check `access`
- Nút thao tác trong page phải check action tương ứng
- Dialog hoặc popup mở từ action phải không thể mở nếu không có quyền
- Với màn CRUD phẳng, nên áp dụng:
  - `view => list`
  - `update/delete => view`
  - `create/update/delete/approve/print/export/configure => access`
- Không mặc định mở quyền khi permission store chưa nạp xong

## Trạng thái tổng quan

- Đã phủ route-level: gần như toàn bộ module trong router
- Đã phủ menu-level: các mục chính trong navigation
- Đã phủ action-level phần lớn module nghiệp vụ chính
- Còn cần giữ thói quen rà khi thêm màn mới hoặc thêm nút mới trong màn cũ

## Checklist Theo Module

### 1. Hệ thống

#### `users` - `/users`

- Route: phải check `access`
- Danh sách: phải check `list`
- Nút `Thêm người dùng`: `create`
- Menu `Cập nhật`: `update`
- Menu `Ẩn/hiện`: `update`
- Menu `Xóa`: `delete`
- Trạng thái hiện tại: đã check

#### `user_roles` - `/user-roles`

- Route: phải check `access`
- Danh sách role/nhóm: `list`
- Xem chi tiết quyền của nhóm: `view`
- Lưu cập nhật quyền: `update`
- Nếu có cấu hình nâng cao theo user hoặc import quyền: `configure`
- Trạng thái hiện tại: đã check route và luồng cập nhật chính

#### `machine_serials` - `/machine-serials`

- Route: `access`
- Xem danh sách: `list`
- Xem chi tiết: `view`
- Trạng thái hiện tại: route-level

#### `settings` - `/settings`

- Route: `access`
- Xem tab cấu hình: `view`
- `Đổi mật khẩu`: `update`
- `Lưu cấu hình POS`: `update`
- `Lưu cấu hình máy in`: `update`
- `Lưu endpoint`: `configure`
- Trạng thái hiện tại: đã check

### 2. Quản lý danh sách

#### `films` - `/films`

- Thêm phim: `create`
- Cập nhật: `update`
- Xóa: `delete`
- Trạng thái hiện tại: đã check

#### `manufacturers` - `/manufacturers`

- Thêm hãng phim: `create`
- Cập nhật: `update`
- Xóa: `delete`
- Trạng thái hiện tại: đã check

#### `invoices` - `/invoices`

- Xem danh sách hóa đơn: `list`
- Cập nhật trạng thái/thông tin: `update`
- In hóa đơn nếu có: `print`
- Trạng thái hiện tại: đã check action chính

#### `revenue_sharing` - `/revenue-sharing`

- Route/menu: `access`
- Nếu sau này có CRUD:
  - Thêm: `create`
  - Cập nhật: `update`
  - Xóa: `delete`
- Trạng thái hiện tại: mới có route khung, chưa có API

#### `seat_types` - `/seat-types`

- Thêm loại ghế: `create`
- Cập nhật: `update`
- Xóa: `delete`
- Trạng thái hiện tại: đã check

#### `screening_rooms` - `/screening-rooms`

- Thêm phòng chiếu: `create`
- Cập nhật: `update`
- Ẩn/hiện: `update`
- Xóa: `delete`
- Xem sơ đồ ghế: `configure`
- Route `/screening-rooms/:id/seat-map`: `access`
- Nút `Cập nhật` seat map: `configure`
- Trạng thái hiện tại: đã check

#### `holidays` - `/holidays`

- Thêm ngày lễ: `create`
- Cập nhật: `update`
- Cập nhật lại ngày: `update`
- Xóa: `delete`
- Trạng thái hiện tại: đã check

#### `showtime_slots` - `/showtime-slots`

- Thêm khung giờ: `create`
- Cập nhật: `update`
- Xóa: `delete`
- Trạng thái hiện tại: đã check

#### `cancellation_reasons` - `/cancellation-reasons`

- Thêm lý do: `create`
- Cập nhật: `update`
- Xóa: `delete`
- Trạng thái hiện tại: đã check

#### `ticket_prices` - `/ticket-prices`

- Thêm giá vé: `create`
- Cập nhật: `update`
- Xóa: `delete`
- Trạng thái hiện tại: đã check

#### `vouchers` - `/vouchers`

- Hiện tại là màn read-only
- Nếu sau này thêm CRUD:
  - Thêm: `create`
  - Cập nhật: `update`
  - Xóa: `delete`
- Trạng thái hiện tại: route-level, chưa cần action-level

### 3. Kế hoạch chiếu phim

#### `plan_cinema` - `/plan-cinema`

- Thêm kế hoạch: `create`
- Xóa kế hoạch: `delete`
- Thêm phim vào kế hoạch: `update`
- Kéo thả đổi thứ tự phim: `update`
- Xóa phim khỏi kế hoạch: `delete`
- Thêm ca chiếu mới: `update`
- Xóa ca chiếu: `delete`
- Gửi duyệt: `approve`
- Chấp nhận / Không chấp nhận: `approve`
- Lưu trữ / Khôi phục: `approve`
- Trạng thái hiện tại: đã check

#### `showtime_schedule` - `/showtime-schedule`

- Route/menu: `access`
- Xem danh sách: `list`
- Xem popup chi tiết: `view`
- Trạng thái hiện tại: đã check

#### `plan_screening` - `/plan-screening/:id`

- Route: `access`
- Xem chi tiết sơ đồ ghế / dữ liệu suất chiếu: `view`
- Bán vé / tạo order: `create`
- Giữ chỗ / hủy giữ / hủy vé / xuất hóa đơn: `update`
- In vé: `print`
- Nếu có cấu hình kỹ thuật riêng cho màn này: `configure`
- Trạng thái hiện tại: đã check theo `showtimes.create/update/print` cho luồng bán vé thực tế
- Lưu ý:
  - Đây là màn cần kiểm tra lại mỗi khi thêm nút nghiệp vụ mới
  - Các nút như `Đổi quà` hiện chưa có catalog action riêng

#### `online_seat_booking` - `/online-seat-booking/create`

- Route: `access`
- Xem sơ đồ ghế online: `view`
- Bán online / hủy bán online theo ghế: `update`
- Nếu có cấu hình nâng cao: `configure`
- Trạng thái hiện tại: đã check action chính

#### `online_showtime_booking` - `/online-showtime-booking`

- Route: `access`
- Danh sách suất chiếu: `list`
- Xem chi tiết nếu có: `view`
- Bật/tắt bán online theo ca chiếu: `update`
- Trạng thái hiện tại: đã check

#### `discount_settings` - `/discount-settings`

- Thêm cấu hình: `create`
- Cập nhật: `update`
- Xóa: `delete`
- Nếu có popup cấu hình nâng cao: `configure`
- Trạng thái hiện tại: đã check

### 4. Bán vé

#### `showtimes` - `/showtimes`

- Route: `access`
- Danh sách suất chiếu: `list`
- Chọn để vào màn bán vé: `view`
- Trạng thái hiện tại: route-level đã check
- Lưu ý:
  - Màn này chủ yếu là entrypoint
  - Action bán vé thật đang check ở `plan_screening`

#### `print_online_tickets` - `/print-online-tickets`

- Xem chi tiết vé: `view`
- In vé / cho phép in lại: `print`
- Trạng thái hiện tại: đã check

#### `find_online_tickets` - `/find-online-tickets`

- Xem chi tiết: `view`
- Trạng thái hiện tại: đã check

#### `cancellation_tickets` - `/cancellation-tickets`

- Route: `access`
- Danh sách: `list`
- Xem chi tiết nếu có: `view`
- Nếu sau này có thao tác cập nhật / hoàn tác / xóa: `update` hoặc `delete`
- Trạng thái hiện tại: màn đang read-only

#### `refunds` - `/refunds`

- Xem chi tiết: `view`
- Thao tác cập nhật / xác nhận: `update`
- Duyệt hoàn tiền nếu có: `approve`
- Trạng thái hiện tại: đã check action chính

#### `invitation_tickets` - `/invitation-tickets`

- Route/menu: `access`
- Xem danh sách: `list`
- Xem chi tiết: `view`
- `Xem sơ đồ vé`: `create`
- `Thêm vé mời`: `create`
- `Hủy vé mời`: `delete`
- `Xuất vé mời`: `print`
- Route `/invitation-tickets/create`: `access`
- Trạng thái hiện tại: đã check

#### `contract_ticket_sales` - `/contract-ticket-sales`

- Route/menu: `access`
- Xem danh sách: `list`
- Xem thông tin hóa đơn/chi tiết: `view`
- `Thêm hợp đồng`: `create`
- `Cập nhật`: `update`
- `Thiết lập ghế ngồi`: `update`
- `Thêm vé hợp đồng`: `update`
- `Hủy vé hợp đồng`: `delete`
- `In vé`: `print`
- Route `/contract-ticket-sales/:id`: `access`
- Trạng thái hiện tại: đã check

#### `ticket_sales_revenue` - `/ticket-sales-revenue`

- Route/menu: `access`
- Xem danh sách/thống kê: `list`
- Xem sơ đồ/chi tiết: `view`
- Xuất file nếu có: `export`
- Route `/ticket-sales-diagram/view`: `access`
- Trạng thái hiện tại: route-level là chính

### 5. Tra cứu

#### `access_history` - `/access-history`

- Route/menu: `access`
- Xem danh sách/tab lịch sử: `list`
- Xem chi tiết log: `view`
- Xuất file nếu sau này có: `export`
- Trạng thái hiện tại: route-level, màn thực tế đang read-only

#### `order_history` - `/order-history`

- Xem chi tiết đơn: `view`
- Xuất vé điện tử: `export`
- In vé nếu catalog có bổ sung `print`: `print`
- Trạng thái hiện tại: đã check
- Lưu ý:
  - Nếu muốn nút `In vé` hoạt động thật, cần bổ sung `print` vào catalog `order_history`

### 6. Thống kê, báo cáo

#### `staff_revenue_report` - `/staff-revenue-report`

- Route/menu: `access`
- Xem báo cáo: `list/view`
- Tất cả nút `Xuất Excel`: `export`
- Trạng thái hiện tại: đã check ở các `ExportExcel.tsx`

#### `monthly_report` - `/monthly-report`

- Route/menu: `access`
- Xem báo cáo: `list/view`
- Tất cả nút `Xuất Excel`: `export`
- Trạng thái hiện tại: đã check

#### `quarterly_report` - `/quarterly-report`

- Route/menu: `access`
- Xem báo cáo: `list/view`
- Tất cả nút `Xuất Excel`: `export`
- Trạng thái hiện tại: đã check

#### `yearly_report` - `/yearly-report`

- Route/menu: `access`
- Xem báo cáo: `list/view`
- Tất cả nút `Xuất Excel`: `export`
- Trạng thái hiện tại: đã check

## Danh sách rà khi thêm màn mới

- Đã có `permission key` trong catalog chưa
- Route đã bọc `PermissionGuard` chưa
- Menu đã lọc theo `access` chưa
- Nút `Thêm` đã check `create` chưa
- Nút `Sửa` đã check `update` chưa
- Nút `Xóa/Hủy` đã check `delete` chưa
- Nút `Duyệt/Gửi duyệt/Lưu trữ/Khôi phục` đã check `approve` chưa
- Nút `In/Xuất vé` đã check `print` chưa
- Nút `Xuất Excel/PDF` đã check `export` chưa
- Nút `Cấu hình`, `Switch`, `Seat map`, `Endpoint`, `Online selling` đã check `configure/update` chưa
- Dialog chi tiết có thể mở trái phép từ state nội bộ không
- Khi không có quyền thì nên:
  - Ẩn nút
  - Hoặc disable nếu cần giữ layout
- Nếu dùng React Query, đổi quyền xong có invalidate/query cache hợp lý chưa
- Logout/login user khác có clear permission cache chưa

## Các điểm cần nhớ

- `Dashboard` là ngoại lệ: mọi user đã đăng nhập đều vào được, không check quyền
- `Showtimes` chỉ là màn chọn suất chiếu. Quyền bán vé thật đang nằm ở `planScreening`
- Các màn read-only hiện chưa cần action-level nếu không có nút nghiệp vụ
- Khi BE thêm action mới, phải cập nhật:
  - catalog FE
  - màn phân quyền
  - màn nghiệp vụ liên quan

