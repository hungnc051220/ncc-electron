# Ngữ Cảnh Testing

## Setup Unit Và Component

Vitest được cấu hình trong `vitest.config.ts` với React plugin, jsdom, global test APIs, CSS support và alias `@renderer`, `@shared`. Test loại trừ `node_modules`, `dist`, `out`, `e2e` và các file config Playwright. Coverage dùng V8 và include TypeScript trong renderer, preload và main.

`src/renderer/src/test/setup.ts` cài jest-dom, cấu hình plugin dayjs và timezone mặc định `Asia/Ho_Chi_Minh`, start MSW với `onUnhandledRequest: "error"`, reset handler sau mỗi test, chạy Testing Library cleanup, clear `sessionStorage`, clear `queryClient`, reset auth store và permission store, mock `matchMedia`, `scrollTo`, `ResizeObserver` và canvas context.

## Vị Trí Test Hiện Có

Test colocate với module bằng naming `*.test.ts` và `*.test.tsx`, ví dụ:

- `src/renderer/src/api/client.test.ts`
- `src/renderer/src/store/auth.store.test.ts`
- `src/renderer/src/socket/socket.test.ts`
- `src/renderer/src/permissions/*.test.tsx`
- `src/renderer/src/features/**/**/*.test.tsx`
- `src/renderer/src/hooks/orders/orderMutations.test.tsx`
- `src/renderer/src/lib/*.test.ts`

## MSW

MSW server và handlers nằm trong `src/renderer/src/test/msw`. Handler mặc định hiện tại cover test health endpoint. Thêm MSW handler khi test component/hook có hành vi phụ thuộc shape HTTP request/response. Với test mutation hook hẹp, code hiện có thường spy domain API method và verify React Query invalidation.

## Test React Query

Dùng local `QueryClient` và `QueryClientProvider` khi test hook. Tắt retry trong test client trừ khi đang test retry behavior. Verify query key, behavior của `enabled`, mutation success/error và invalidation. Với UI test, assert loading, success, error và empty state hiển thị thay vì state private của query.

## Test Zustand

Khởi tạo store rõ ràng trong test. Global setup reset auth và permission store; các store khác nên reset trong test khi liên quan. Ưu tiên assert hành vi UI sinh ra từ store state. Chỉ test trực tiếp store action khi chính store là unit cần test.

## Test Electron Và Socket

Với renderer code dùng IPC, mock method `window.api` và cleanup function của listener. Với thay đổi preload/main, cover type/behavior khi thực tế làm được và chạy typecheck. Socket test nên verify vòng đời kết nối, cleanup event subscription, thay đổi token, bind listener sau reconnect và rủi ro duplicate listener.

## Playwright

Playwright config dùng `testDir: ./e2e`, Chromium, base URL `http://127.0.0.1:4174`, và start `npx vite --config vite.playwright.config.ts --host 127.0.0.1`. E2E hiện có `e2e/plan-screening-flow.spec.ts` với harness trong `e2e/app`. Dùng Playwright cho luồng booking/payment/customer-display đầy đủ và tích hợp browser mà jsdom không đại diện được.

## Lệnh

- `npm test`: chạy Vitest một lần.
- `npm run test:watch`: Vitest watch mode.
- `npm run test:ui`: Vitest UI.
- `npm run test:coverage`: coverage V8.
- `npm run test:e2e`: Playwright.
- `npm run typecheck`: chạy sau thay đổi test hoặc typing lớn.

Nếu convention chưa rõ, follow the existing local pattern in the touched module.

## Lỗi Test Đã Biết

Ghi nhận ngày 2026-11-10, có sẵn từ trước khi nâng antd lên 6.7.0 (đã kiểm chứng lại trên antd 6.5.1). Xóa mục tương ứng khi đã sửa.

- `src/renderer/src/permissions/PermissionGuard.test.tsx`: chạy vòng lặp đến khi hết heap (~4GB) và làm crash worker Vitest, nên `npm test` đầy đủ dừng giữa chừng (`Error: Channel closed`) và không in dòng tổng kết. Khi cần kết quả đầy đủ, chạy riêng các file còn lại hoặc loại file này ra tạm thời.
- `src/renderer/src/api/orders.api.test.ts`: 3 test fail (`serializes combined filters for getAll`, `keeps explicit false filters and omits empty values`, `always excludes authorized payments from getAll`) vì `ordersApi.getAll` đã thêm `deleted:false` vào `filter` nhưng expectation của test chưa cập nhật.
