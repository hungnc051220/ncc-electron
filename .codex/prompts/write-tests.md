# Prompt Viết Test

Dùng prompt này khi thêm hoặc cập nhật test trong repo.

## Prompt

Inspect các test gần đó và theo style Vitest + React Testing Library hiện có. Test hành vi người dùng và kết quả quan sát được, không test chi tiết implement nội bộ. Chỉ dùng MSW khi cần mock network. Giữ test tập trung và colocate gần module khi phù hợp.

Cover các trạng thái liên quan:

- loading và disabled state
- success path
- error path và message hiển thị
- empty state
- nhánh phân quyền/customer-mode
- edge case như đổi ngày, phân trang, lọc, stale cache, input không hợp lệ hoặc trùng socket event

## Hướng Dẫn Theo Repo

- Vitest config dùng jsdom, globals, CSS support, jest-dom và `src/renderer/src/test/setup.ts`.
- Global setup reset Testing Library, MSW handlers, `sessionStorage`, `queryClient`, auth store, permission store, `matchMedia`, `ResizeObserver`, `scrollTo` và canvas mock.
- MSW nằm trong `src/renderer/src/test/msw`. Thêm handler khi hành vi component phụ thuộc shape HTTP request/response.
- Test mutation hook hiện có có thể spy trực tiếp domain API và wrap hook bằng local `QueryClientProvider`; match pattern này khi phù hợp.
- Với React Query, assert query key, điều kiện `enabled`, invalidation, refetch và loading/error/empty state hiển thị khi liên quan.
- Với UI dựa trên Zustand, khởi tạo store rõ ràng và assert tác động UI/output. Chỉ test nội bộ store khi chính store là unit cần test.
- Với Electron IPC, mock các method `window.api` và kiểm tra call, cleanup function, error handling.
- Với Socket.io, assert unsubscribe/cleanup và tránh duplicate listener sau reconnect.
- Dùng Playwright (`npm run test:e2e`) cho luồng booking/customer-display đầy đủ hoặc tích hợp browser mà jsdom không đại diện tốt.

## Lệnh

- `npm test`: unit/component tests.
- `npm run test:coverage`: coverage.
- `npm run test:e2e`: Playwright.
- `npm run typecheck`: type safety sau khi thêm test lớn.

## Dạng Output

Trả về test plan, file cần chạm, test case và lệnh cần chạy. Nếu không chạy được test, nêu lý do và rủi ro còn lại.
