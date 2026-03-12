# Phan quyen POS - Tai lieu gui BE

## 1. Nguon chuan FE da define

FE da define bo permission moi tai:

- `src/renderer/src/permissions/definitions.ts`
- `src/shared/types/permission.types.ts`

BE nen dung `key` lam dinh danh chuan, `route` de map man hinh, va `actions` de luu quyen chi tiet.

## 2. Danh sach action

```json
[
  "access",
  "list",
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "export",
  "print",
  "configure"
]
```

Goi y y nghia:

- `access`: duoc vao man hinh
- `list`: duoc xem danh sach
- `view`: duoc xem chi tiet
- `create`: duoc tao moi
- `update`: duoc cap nhat
- `delete`: duoc xoa/huy
- `approve`: duoc duyet
- `export`: duoc xuat file
- `print`: duoc in
- `configure`: duoc cau hinh/thiet lap

## 3. Contract API moi FE da khai bao

### 3.1 Lay catalog quyen

- `GET /api/pos/permissions/catalog`

Response mau:

```json
{
  "version": "2026-03-12",
  "permissions": [
    {
      "key": "users",
      "module": "He thong",
      "label": "Quan ly nguoi dung",
      "route": "/users",
      "actions": ["access", "list", "view", "create", "update", "delete"]
    },
    {
      "key": "plan_cinema",
      "module": "Ke hoach chieu phim",
      "label": "Lap ke hoach chieu phim",
      "route": "/plan-cinema",
      "actions": ["access", "list", "view", "create", "update", "delete", "approve"]
    }
  ]
}
```

### 3.2 Lay quyen theo role

- `POST /api/pos/permissions/roles`

Request mau:

```json
{
  "roleIds": [1, 3],
  "includePermissionCatalog": true
}
```

Response mau:

```json
[
  {
    "roleId": 1,
    "roleName": "Quan tri he thong",
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
      },
      {
        "permissionKey": "refunds",
        "actions": {
          "access": true,
          "list": true,
          "view": true,
          "update": true,
          "approve": true
        }
      }
    ]
  },
  {
    "roleId": 3,
    "roleName": "Thu ngan",
    "updatedAt": "2026-03-11T15:20:00Z",
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
]
```

### 3.3 Lay quyen thuc te cua user

- `POST /api/pos/permissions/staff`

Request mau:

```json
{
  "userId": 1024,
  "includePermissionCatalog": false
}
```

Response mau:

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
    },
    {
      "permissionKey": "refunds",
      "actions": {
        "access": false,
        "list": false,
        "view": false,
        "update": false,
        "approve": false
      }
    }
  ]
}
```

### 3.4 Cap nhat quyen cho 1 role

- `POST /api/pos/permissions/roles/update`

Request mau:

```json
{
  "roleId": 3,
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
    },
    {
      "permissionKey": "print_online_tickets",
      "actions": {
        "access": true,
        "list": true,
        "view": true,
        "print": true
      }
    }
  ]
}
```

Response mau:

```json
{
  "roleId": 3,
  "updatedAt": "2026-03-12T10:30:00Z",
  "updatedBy": "admin",
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
    },
    {
      "permissionKey": "print_online_tickets",
      "actions": {
        "access": true,
        "list": true,
        "view": true,
        "print": true
      }
    }
  ]
}
```

## 4. Danh sach permission FE da define

Tong cong: `34` permission keys.

| Key | Module | Label | Route | Actions |
| --- | --- | --- | --- | --- |
| `dashboard` | Tong quan | Trang chu | `/` | `access`, `view` |
| `users` | He thong | Quan ly nguoi dung | `/users` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `user_roles` | He thong | Phan quyen nhom nguoi dung | `/user-roles` | `access`, `list`, `view`, `update`, `configure` |
| `machine_serials` | He thong | Xem seri may | `/machine-serials` | `access`, `list`, `view` |
| `settings` | He thong | Thiet lap he thong | `/settings` | `access`, `view`, `update`, `configure` |
| `films` | Quan ly danh sach | Danh sach phim | `/films` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `manufacturers` | Quan ly danh sach | Danh sach hang phim | `/manufacturers` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `invoices` | Quan ly danh sach | Hoa don dien tu | `/invoices` | `access`, `list`, `view`, `create`, `update`, `print` |
| `seat_types` | Quan ly danh sach | Loai ghe, vi tri | `/seat-types` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `screening_rooms` | Quan ly danh sach | Phong chieu | `/screening-rooms` | `access`, `list`, `view`, `create`, `update`, `delete`, `configure` |
| `holidays` | Quan ly danh sach | Ngay le | `/holidays` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `showtime_slots` | Quan ly danh sach | Khung gio chieu | `/showtime-slots` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `cancellation_reasons` | Quan ly danh sach | Ly do huy ve | `/cancellation-reasons` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `ticket_prices` | Quan ly danh sach | Gia ve | `/ticket-prices` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `vouchers` | Quan ly danh sach | Chuong trinh khuyen mai | `/vouchers` | `access`, `list`, `view`, `create`, `update`, `delete` |
| `plan_cinema` | Ke hoach chieu phim | Lap ke hoach chieu phim | `/plan-cinema` | `access`, `list`, `view`, `create`, `update`, `delete`, `approve` |
| `showtime_schedule` | Ke hoach chieu phim | Xem lich chieu phim | `/showtime-schedule` | `access`, `list`, `view` |
| `plan_screening` | Ke hoach chieu phim | Lap lich suat chieu | `/plan-screening/:id` | `access`, `view`, `create`, `update`, `delete`, `configure` |
| `online_seat_booking` | Ke hoach chieu phim | Thiet lap ban online theo ghe | `/online-seat-booking/create` | `access`, `view`, `update`, `configure` |
| `online_showtime_booking` | Ke hoach chieu phim | Thiet lap ban online theo ca chieu | `/online-showtime-booking` | `access`, `list`, `view`, `update`, `configure` |
| `discount_settings` | Ke hoach chieu phim | Thiet lap giam gia | `/discount-settings` | `access`, `list`, `view`, `create`, `update`, `delete`, `configure` |
| `showtimes` | Ban ve | Ban ve khach le | `/showtimes` | `access`, `list`, `view`, `create`, `update`, `print` |
| `print_online_tickets` | Ban ve | In ve online | `/print-online-tickets` | `access`, `list`, `view`, `print` |
| `find_online_tickets` | Ban ve | Tim ve online | `/find-online-tickets` | `access`, `list`, `view` |
| `cancellation_tickets` | Ban ve | Quan ly ve huy | `/cancellation-tickets` | `access`, `list`, `view`, `update`, `delete` |
| `refunds` | Ban ve | Hoan tien | `/refunds` | `access`, `list`, `view`, `update`, `approve` |
| `invitation_tickets` | Ban ve | Quan ly giay moi | `/invitation-tickets` | `access`, `list`, `view`, `create`, `update`, `delete`, `print` |
| `contract_ticket_sales` | Ban ve | Ban ve hop dong | `/contract-ticket-sales` | `access`, `list`, `view`, `create`, `update`, `delete`, `print` |
| `ticket_sales_revenue` | Ban ve | Thong ke doanh thu ban ve | `/ticket-sales-revenue` | `access`, `list`, `view`, `export` |
| `access_history` | Tra cuu | Lich su hoat dong | `/access-history` | `access`, `list`, `view`, `export` |
| `order_history` | Tra cuu | Lich su ban ve | `/order-history` | `access`, `list`, `view`, `export` |
| `staff_revenue_report` | Thong ke, bao cao | Doanh thu theo nhan vien | `/staff-revenue-report` | `access`, `list`, `view`, `export` |
| `monthly_report` | Thong ke, bao cao | Bao cao thang | `/monthly-report` | `access`, `list`, `view`, `export` |
| `quarterly_report` | Thong ke, bao cao | Bao cao quy | `/quarterly-report` | `access`, `list`, `view`, `export` |

## 5. Luu y quan trong de BE va FE thong nhat

### 5.1 Day la contract moi

FE da define contract permission chi tiet theo `permissionKey + actions`.

BE nen uu tien build theo contract moi o muc 3 thay vi API cu:

- `/api/pos/customer-role/menu`
- `/api/pos/customer-role/menu/update`

Ly do: API cu chi co `readOnly` va `edit`, khong the luu day du cac action chi tiet nhu `approve`, `export`, `print`, `configure`.

### 5.2 Cac route co trong router nhung chua co key rieng

Nhung route sau dang ton tai trong app nhung chua duoc define permission key rieng:

- `/contract-ticket-sales/:id`
- `/invitation-tickets/create`
- `/ticket-sales-diagram/view`
- `/screening-rooms/:id/seat-map`

De xuat:

- Neu xem chung la cung permission voi man hinh cha thi BE co the map chung vao key cha.
- Neu can tach quyen rieng thi can bo sung them permission key moi.

### 5.3 Cac menu dang tro toi route chua ton tai trong router/catalog

Hien menu FE dang co cac route sau nhung router/catalog chua define:

- `/revenue-sharing`
- `/film-sales-detail-report`
- `/annual-report`

BE khong nen build permission cho 3 route nay neu chua co xac nhan nghiep vu.

### 5.4 Route online seat booking dang co su khac nhau

Catalog permission dang define:

- `/online-seat-booking/create`

Nhung menu FE hien tai dang mo theo link:

- `/showtimes?callbackUrl=/online-seat-booking&id=create`

Muc nay can thong nhat lai voi FE truoc khi BE rang buoc route theo URL chinh xac.

## 6. De xuat du lieu luu tru

BE co the luu theo mo hinh:

```json
{
  "roleId": 3,
  "permissions": [
    {
      "permissionKey": "users",
      "actions": {
        "access": true,
        "list": true,
        "view": true,
        "create": false,
        "update": false,
        "delete": false
      }
    }
  ]
}
```

Nguyen tac:

- Chi can tra ve action co y nghia voi permission do.
- Action khong co trong catalog cua permission co the bo qua.
- Khi merge nhieu role cho 1 user, FE dang theo logic OR theo tung action.

## 7. File tham chieu trong FE

- `src/renderer/src/permissions/definitions.ts`
- `src/shared/types/permission.types.ts`
- `src/renderer/src/permissions/utils.ts`
- `src/renderer/src/router.tsx`

