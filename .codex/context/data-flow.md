# Ngữ Cảnh Data Flow

## Bootstrap Dữ Liệu

`src/renderer/src/main.tsx` đọc config qua `window.api.getConfig()`, sau đó gọi `initApi(apiBaseUrl)` và `initSocket(socketUrl)`. Nếu auth store đã có token thì renderer connect socket ngay. App được bọc bởi `QueryClientProvider`, `PermissionBootstrap`, Antd provider và router.

## API Layer

HTTP call đi qua `src/renderer/src/api/client.ts`. `api` tự set `baseURL`, inject bearer token từ `useAuthStore`, xử lý refresh-token queue khi gặp 401, cập nhật auth store, reconnect socket sau refresh và logout/clear cache khi refresh fail. Domain API nằm trong `src/renderer/src/api/*.api.ts` và thường trả về `res.data`.

Component không nên gọi Axios trực tiếp. Nếu cần endpoint mới, thêm method vào domain API hoặc tạo domain API mới theo pattern hiện có.

## React Query

React Query client ở `src/renderer/src/lib/queryClient.ts`:

- Query retry `1`, stale time `1 phút`, gc time `5 phút`.
- Refetch khi focus/reconnect/mount.
- Mutation retry `0`.

Domain hook nằm trong `src/renderer/src/hooks`, thường group theo domain và có `keys.ts`. Query key phải chứa đủ params/dto. List query có phân trang/filter thường dùng `keepPreviousData`. Mutation nên invalidate broad domain key như `ordersKeys.all`, `filmsKey.all`, hoặc key tương ứng của domain.

## Zustand

Zustand store nằm trong `src/renderer/src/store`. Auth và permission persist vào `sessionStorage`. `logout` clear permission assignments và `queryClient`. Theme store bật/tắt class `dark`. Store dùng cho state app/session/UI; không dùng để nhân bản server cache đã nằm trong React Query.

## Socket

Socket.io client nằm trong `src/renderer/src/socket/socket.ts`. Socket URL được init từ config. `connectSocket(token)` tái dùng socket nếu token không đổi, disconnect/recreate nếu token đổi, và bind lại managed listeners. Các helper `onOrderCreated`, `onOrderUpdated`, `onTicketsCancelled`, `onSocketConnect` trả về unsubscribe function. Khi dùng socket trong React effect, luôn cleanup.

## Permissions Và Route

Route được khai báo trong `src/renderer/src/router.tsx` bằng `createHashRouter`. `PermissionGuard` kiểm tra permission từ `usePermission`, hỗ trợ alternate permissions và customer-mode exception. Khi thêm route/menu, cần giữ đồng bộ router, `navConfig`, permission definitions và fallback path nếu có.

## Dòng Dữ Liệu Chuẩn

UI page -> hook domain -> domain API -> `api/client` -> BE. Mutation success -> invalidate query key -> UI refetch. Native capability -> renderer gọi `window.api` -> preload -> main IPC -> trả kết quả/event về renderer.

Nếu convention chưa rõ, follow the existing local pattern in the touched module.
