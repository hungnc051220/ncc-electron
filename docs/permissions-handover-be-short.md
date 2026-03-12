# Tóm tắt gửi BE - Phân quyền POS

BE build giúp phần phân quyền mới theo contract dưới đây.

## 1. Nguồn chuẩn FE đã define

- Danh sách quyền: `src/renderer/src/permissions/definitions.ts`
- Kiểu dữ liệu API: `src/shared/types/permission.types.ts`

Nguyên tắc:

- Dùng `permissionKey` làm định danh chuẩn
- Dùng `route` để map màn hình
- Dùng `actions` để lưu quyền chi tiết

## 2. Danh sách action

- `access`: được vào màn hình
- `list`: được xem danh sách
- `view`: được xem chi tiết
- `create`: được tạo mới
- `update`: được cập nhật
- `delete`: được xóa hoặc hủy
- `approve`: được duyệt
- `export`: được xuất file
- `print`: được in
- `configure`: được cấu hình hoặc thiết lập

## 3. API mới cần build

### 3.1 Lấy catalog quyền

- `GET /api/pos/permissions/catalog`

Response mẫu:

```json
{
  "version": "2026-03-12",
  "permissions": [
    {
      "key": "users",
      "module": "Hệ thống",
      "label": "Quản lý người dùng",
      "route": "/users",
      "actions": ["access", "list", "view", "create", "update", "delete"]
    }
  ]
}
```

### 3.2 Lấy quyền theo role

- `POST /api/pos/permissions/roles`

Request mẫu:

```json
{
  "roleIds": [1, 3],
  "includePermissionCatalog": true
}
```

Response mẫu:

```json
[
  {
    "roleId": 1,
    "roleName": "Quản trị hệ thống",
    "updatedAt": "2026-03-12T09:10:00Z",
    "updatedBy": "admin",
    "permissions": [
      {
        "permissionKey": "users",
        "actions": {
          "access": true,
          "list": true,
          "view": true,
          "create": true,
          "update": true,
          "delete": true
        }
      }
    ]
  }
]
```

### 3.3 Lấy quyền thực tế của user

- `POST /api/pos/permissions/staff`

Request mẫu:

```json
{
  "userId": 1024,
  "includePermissionCatalog": false
}
```

Response mẫu:

```json
{
  "userId": 1024,
  "roleIds": [1, 3],
  "permissions": [
    {
      "permissionKey": "dashboard",
      "actions": {
        "access": true,
        "view": true
      }
    },
    {
      "permissionKey": "showtimes",
      "actions": {
        "access": true,
        "list": true,
        "view": true,
        "create": true,
        "update": true,
        "print": true
      }
    }
  ]
}
```

### 3.4 Cập nhật quyền cho 1 role

- `POST /api/pos/permissions/roles/update`

Request mẫu:

```json
{
  "roleId": 3,
  "permissions": [
    {
      "permissionKey": "showtimes",
      "actions": {
        "access": true,
        "list": true,
        "view": true,
        "create": true,
        "update": true,
        "print": true
      }
    },
    {
      "permissionKey": "refunds",
      "actions": {
        "access": true,
        "list": true,
        "view": true,
        "update": true,
        "approve": false
      }
    }
  ]
}
```

Response mẫu:

```json
{
  "roleId": 3,
  "updatedAt": "2026-03-12T10:30:00Z",
  "updatedBy": "admin",
  "permissions": [
    {
      "permissionKey": "showtimes",
      "actions": {
        "access": true,
        "list": true,
        "view": true,
        "create": true,
        "update": true,
        "print": true
      }
    }
  ]
}
```

## 4. Danh sách màn hình FE đã define quyền

Tổng cộng hiện có `34` permission keys.

- `dashboard` -> `/`
- `users` -> `/users`
- `user_roles` -> `/user-roles`
- `machine_serials` -> `/machine-serials`
- `settings` -> `/settings`
- `films` -> `/films`
- `manufacturers` -> `/manufacturers`
- `invoices` -> `/invoices`
- `seat_types` -> `/seat-types`
- `screening_rooms` -> `/screening-rooms`
- `holidays` -> `/holidays`
- `showtime_slots` -> `/showtime-slots`
- `cancellation_reasons` -> `/cancellation-reasons`
- `ticket_prices` -> `/ticket-prices`
- `vouchers` -> `/vouchers`
- `plan_cinema` -> `/plan-cinema`
- `showtime_schedule` -> `/showtime-schedule`
- `plan_screening` -> `/plan-screening/:id`
- `online_seat_booking` -> `/online-seat-booking/create`
- `online_showtime_booking` -> `/online-showtime-booking`
- `discount_settings` -> `/discount-settings`
- `showtimes` -> `/showtimes`
- `print_online_tickets` -> `/print-online-tickets`
- `find_online_tickets` -> `/find-online-tickets`
- `cancellation_tickets` -> `/cancellation-tickets`
- `refunds` -> `/refunds`
- `invitation_tickets` -> `/invitation-tickets`
- `contract_ticket_sales` -> `/contract-ticket-sales`
- `ticket_sales_revenue` -> `/ticket-sales-revenue`
- `access_history` -> `/access-history`
- `order_history` -> `/order-history`
- `staff_revenue_report` -> `/staff-revenue-report`
- `monthly_report` -> `/monthly-report`
- `quarterly_report` -> `/quarterly-report`

## 5. Lưu ý để tránh build sai

- FE đã define model quyền mới theo `permissionKey + actions`
- Không nên build tiếp theo API cũ `/api/pos/customer-role/menu`
- API cũ chỉ có `readOnly/edit`, không đủ để lưu các quyền như `approve`, `export`, `print`, `configure`

Các route đang có trong app nhưng chưa tách permission key riêng:

- `/contract-ticket-sales/:id`
- `/invitation-tickets/create`
- `/ticket-sales-diagram/view`
- `/screening-rooms/:id/seat-map`

Các route đang xuất hiện ở menu nhưng chưa có trong router/catalog:

- `/revenue-sharing`
- `/film-sales-detail-report`
- `/annual-report`

Route cần thống nhất lại với FE:

- Catalog đang define: `/online-seat-booking/create`
- Nhưng menu hiện đang mở qua: `/showtimes?callbackUrl=/online-seat-booking&id=create`

## 6. Đề xuất xử lý BE

- Build 4 API ở mục 3
- Lưu quyền theo từng `permissionKey`
- Mỗi `permissionKey` lưu object `actions`
- Khi trả quyền cho user, có thể merge quyền từ nhiều role theo logic OR trên từng action

