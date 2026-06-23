# Hướng Dẫn Repository

## Tổng Quan Dự Án

Đây là ứng dụng desktop quản trị/POS của Rạp Chiếu Phim Quốc Gia. Dự án dùng Electron + electron-vite, renderer dùng React 19 và TypeScript. Main process xử lý các tác vụ desktop gốc: vòng đời ứng dụng, cửa sổ chính/khách hàng, IPC, in vé, cập nhật, cấu hình, hộp thoại file, truy cập filesystem và xác nhận thoát. Preload expose cầu nối typed `window.api`. Renderer là ứng dụng React dùng React Router, Ant Design, Tailwind CSS, TanStack React Query, Zustand, Axios, Socket.io, dayjs, ExcelJS và các luồng QR/thanh toán.

## Lệnh Quan Trọng

Chỉ dùng các script có thật trong `package.json`:

- `npm run dev`: chạy Electron ở chế độ development.
- `npm run start`: preview ứng dụng đã build.
- `npm run build`: chạy typecheck rồi build bằng electron-vite.
- `npm run lint` / `npm run lint:fix`: chạy ESLint hoặc tự sửa lỗi.
- `npm run format`: chạy Prettier.
- `npm run typecheck`: kiểm tra TypeScript cho Node và web.
- `npm test`: chạy Vitest một lần.
- `npm run test:coverage`: chạy coverage Vitest bằng V8.
- `npm run test:e2e`: chạy Playwright.

## Bản Đồ Repository

- `src/main/index.ts`: vòng đời app, cửa sổ, IPC, đồng bộ theme, export/save/read file, xác nhận thoát.
- `src/main/*.service.ts`: service cập nhật, cấu hình và in vé.
- `src/preload/index.ts`, `src/preload/api.types.ts`: cầu nối typed cho renderer.
- `src/shared/types`: type dùng chung giữa main, preload và renderer.
- `src/renderer/src/main.tsx`: bootstrap renderer; khởi tạo URL API/socket từ config.
- `src/renderer/src/router.tsx`: hash router, layout bảo vệ, route tính năng, guard phân quyền.
- `src/renderer/src/features`: page/screen và component nội bộ của từng tính năng.
- `src/renderer/src/api/*.api.ts`: wrapper Axios dùng `api` từ `api/client.ts`.
- `src/renderer/src/hooks`: hook domain/React Query, thường có `keys.ts`.
- `src/renderer/src/store/*.store.ts`: store Zustand.
- `src/renderer/src/components`, `layouts`, `permissions`, `providers`, `lib`, `socket`, `assets`: UI dùng chung, shell, phân quyền, provider, utility, Socket.io, style/asset.
- `src/renderer/src/test`: setup Vitest và MSW server/handlers.
- `e2e`: test Playwright và harness app.

## Quy Ước Code

Luôn theo pattern cục bộ trong module đang sửa. Dùng TypeScript, React function component, indent 2 spaces, double quotes, semicolon, `printWidth: 100` và không dùng trailing comma. File component/page dùng `PascalCase` (`FilmsPage.tsx`, `FilmDialog.tsx`); hook dùng `useX.ts`; store export `useXStore` từ `*.store.ts`; API wrapper dùng `<domain>.api.ts`.

HTTP call đặt trong `api/*.api.ts`; component nên gọi hook thay vì gọi Axios trực tiếp. Đặt React Query key trong `keys.ts` của domain khi domain đã có file này, đưa đủ query params vào key, và invalidate broad domain key sau mutation. Zustand dùng cho state app/session/UI, không nhân bản server cache. Business transform đặt gần feature sở hữu, hoặc trong `lib` khi thật sự dùng chung.

UI dùng Antd kết hợp Tailwind layout class. Tôn trọng `AntdProvider`, locale tiếng Việt, timezone dayjs, theme token và các class/biến CSS như `bg-app-bg-container`, `border-app-border`. Khi sửa style, kiểm tra cả light và dark theme.

Xem thêm [.codex/context/ui-patterns.md](.codex/context/ui-patterns.md) và [.codex/context/data-flow.md](.codex/context/data-flow.md).

## Ranh Giới Electron

Main sở hữu Node/Electron API, BrowserWindow, filesystem, dialog, in ấn, updater, config và IPC handler. Preload sở hữu API typed tối thiểu expose cho renderer. Renderer phải dùng `window.api` cho năng lực native; không import Electron, `ipcRenderer`, `fs` hoặc `path` vào renderer code. Khi thêm IPC, cập nhật `api.types.ts`, implement wrapper preload có cleanup cho listener, và thêm `ipcMain.handle` hoặc `ipcMain.on` tương ứng.

Xem thêm [.codex/context/ipc-boundaries.md](.codex/context/ipc-boundaries.md).

## Quy Trình Thực Hiện Task

1. Inspect trước route, feature, API hook, store, IPC, style và test bị ảnh hưởng.
2. Lập plan nhỏ; ưu tiên thay đổi tối thiểu và an toàn.
3. Implement theo kiến trúc và naming hiện có.
4. Thêm hoặc cập nhật test tập trung gần module đã sửa.
5. Chạy check phù hợp: `npm test`, và khi cần thì `npm run typecheck`, `npm run lint`, hoặc `npm run test:e2e`.
6. Tóm tắt file đã đổi, test đã chạy, rủi ro và giả định.

Prompt tái sử dụng:

- [Phân rã task](.codex/prompts/task-breakdown.md)
- [Viết test](.codex/prompts/write-tests.md)
- [Review code](.codex/prompts/review-code.md)
- [Pre-push và release](.codex/prompts/pre-push-release.md)
- [Release phiên bản mới](.codex/prompts/release-version.md)

Khi user nói ngắn như “Tôi đã tăng version trong package.json, hãy release phiên bản mới”, “Đẩy code và release bản mới”, hoặc “Chuẩn bị release phiên bản mới”, ưu tiên dùng [.codex/prompts/release-version.md](.codex/prompts/release-version.md).

## Hướng Dẫn Test

Vitest chạy trong jsdom với Testing Library, jest-dom, MSW, setup timezone dayjs, reset store và `queryClient.clear()` từ `src/renderer/src/test/setup.ts`. Dùng React Testing Library để test hành vi người dùng và trạng thái hiển thị. Dùng MSW khi cần mô phỏng network behavior; mock trực tiếp domain API cho test mutation hook hẹp nếu test gần đó đang theo pattern này. Dùng Playwright cho luồng end-to-end như booking/customer-display hoặc tích hợp trình duyệt.

Xem thêm [.codex/context/testing.md](.codex/context/testing.md).

## Checklist Review

Kiểm tra correctness, TypeScript safety, render thừa trong React, stale closure, cleanup effect, loading/error/empty state, dark/light behavior với Antd/Tailwind, query key và invalidation, coupling trong Zustand, an toàn ranh giới IPC, validate filesystem/path, cleanup socket listener và thiếu coverage test. Không nitpick formatting trừ khi ảnh hưởng maintainability.

## File Ngữ Cảnh

- [Kiến trúc](.codex/context/architecture.md)
- [Testing](.codex/context/testing.md)
- [Ranh giới IPC](.codex/context/ipc-boundaries.md)
- [UI patterns](.codex/context/ui-patterns.md)
- [Data flow](.codex/context/data-flow.md)
- [Project decisions memory](.codex/memory/project-decisions.md)

## Skill Nội Bộ

- [Pre-push check](.codex/skills/pre-push-check/SKILL.md): dùng trước khi push code lên GitHub/Bitbucket.
- [Electron release](.codex/skills/electron-release/SKILL.md): dùng khi build release, kiểm tra artifact và xử lý `update-policy.json`.

## Ràng Buộc

Không tự nghĩ ra folder, script, tool hoặc pattern không tồn tại. Giữ nguyên ranh giới Electron main/preload/renderer, pattern React Query/Zustand/API, model bảo vệ route và cách styling Antd/Tailwind. Tránh rewrite diện rộng trừ khi được yêu cầu rõ. Commit message nên theo style Conventional Commit hiện có với mô tả tiếng Việt.
