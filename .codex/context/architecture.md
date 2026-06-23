# Ngữ Cảnh Kiến Trúc

## Hình Dạng Ứng Dụng

Đây là ứng dụng desktop quản trị/POS của Rạp Chiếu Phim Quốc Gia. Dự án dùng Electron + electron-vite và renderer React 19 + TypeScript. Ứng dụng quản lý các luồng như phim, suất chiếu, kế hoạch chiếu, sơ đồ ghế, booking online, đơn hàng, vé, hoàn tiền, báo cáo, voucher, người dùng/vai trò, cài đặt, in ấn, QR/thanh toán và màn hình khách hàng.

## Electron Main Process

`src/main/index.ts` quản lý vòng đời app, single-instance lock, cửa sổ chính, cửa sổ khách hàng, kiosk mode, phím tắt DevTools, lưu theme, xác nhận thoát, setup updater, truy cập máy in, handler export/save/read file, export ảnh vé, đồng bộ dữ liệu màn hình khách hàng, đồng bộ QR, đồng bộ trạng thái ghế và đăng ký IPC. Các service hỗ trợ nằm ở `src/main/config.service.ts`, `print.service.ts` và `updater.service.ts`. Asset/template packaged nằm trong `resources` và `build`.

## Preload Bridge

`src/preload/index.ts` expose cầu nối typed `window.api` dựa trên `src/preload/api.types.ts`. Cầu nối này wrap `ipcRenderer.invoke/send/on` cho config, customer screen, seat sync, QR sync, in vé, export/save/read file, updater events, danh sách máy in, theme sync và thoát app. Các API dạng listener trả về cleanup function.

## Renderer App

`src/renderer/src/main.tsx` import CSS/font/chart setup, đọc config qua `window.api`, khởi tạo URL Axios và Socket.io, connect socket khi có auth token, đồng bộ theme từ main, rồi render các provider: `AntdProvider`, `UpdaterProvider`, `QueryClientProvider`, `NuqsAdapter`, `PermissionBootstrap` và `RouterProvider`.

## Routing

`src/renderer/src/router.tsx` dùng `createHashRouter`. `/login` là route public. Root route dùng `ProtectedLayout`, sau đó `DashboardLayout` cho phần lớn page admin. Route được bảo vệ bằng `PermissionGuard`, permission key, alternate permissions và exception customer-mode cho một số luồng.

## State Management

Zustand store nằm trong `src/renderer/src/store`: auth, permissions, theme, POS/branch settings và printer state. Auth và permission store persist vào `sessionStorage`; logout clear permissions và `queryClient`. Theme store bật/tắt class `dark` trên `document.documentElement`.

## API Và Service

`src/renderer/src/api/client.ts` sở hữu Axios instances, `baseURL` từ config, inject bearer token, queue refresh-token, logout khi refresh fail và reconnect socket sau khi refresh token. Domain API nằm trong `src/renderer/src/api/*.api.ts` và trả về response data. React Query hook nằm trong `src/renderer/src/hooks`, thường group theo domain và có `keys.ts`.

## Tổ Chức UI

Feature page và component nội bộ nằm trong `src/renderer/src/features`. UI dùng chung nằm trong `components`, layout shell trong `layouts`, permission helper trong `permissions`, utility trong `lib`, style/asset trong `assets`. UI thường dùng Ant Design cho table, form, modal, tabs, dropdown, date picker, upload, message và notification, kết hợp Tailwind cho layout/density. `AntdProvider` thiết lập locale tiếng Việt, plugin/timezone dayjs, theme token và dark/default algorithm.

## Luồng Domain Quan Trọng

Các luồng có thể thấy gồm CRUD phim với upload và filter, lập kế hoạch suất chiếu, chọn ghế trong plan-screening, đồng bộ màn hình khách hàng, đồng bộ dialog QR payment, tạo/hủy/đổi ghế đơn hàng, in/export vé, báo cáo, thông báo updater, bootstrap phân quyền và update đơn/thanh toán qua socket.

Nếu convention chưa rõ, follow the existing local pattern in the touched module.
