# Ngữ Cảnh Ranh Giới IPC

## Trách Nhiệm Main Process

Code main process thuộc `src/main`. Main sở hữu Electron và Node API: `BrowserWindow`, `app`, `dialog`, `screen`, `shell`, `ipcMain`, filesystem, xử lý path, máy in, updater, lưu config, cửa sổ màn hình khách hàng, xác nhận thoát và render/export vé. Main nên validate IPC payload, kiểm soát filesystem path, xử lý khác biệt path giữa development/packaged app và chỉ gửi dữ liệu cần thiết về renderer window.

## Trách Nhiệm Preload

Code preload thuộc `src/preload`. Đây là layer duy nhất import `ipcRenderer` cho API hướng renderer. `src/preload/api.types.ts` định nghĩa contract `PreloadAPI`, và `src/preload/index.ts` implement contract này. API được expose thành `window.api` qua `contextBridge` khi context isolation bật, kèm fallback assignment khi không bật. Method dạng event subscription phải trả về cleanup function remove đúng listener đã đăng ký.

## Trách Nhiệm Renderer

Code renderer thuộc `src/renderer/src`. Renderer nên xem native capability là async method/event trên `window.api`. Module renderer không được import Electron, `ipcRenderer`, Node `fs` hoặc Node `path`. Renderer xử lý UI, routing, React Query, Zustand state, API call, permissions, socket subscription và tương tác người dùng.

## Pattern IPC Hiện Có

App dùng cả request/response và event channel:

- `ipcMain.handle` + `ipcRenderer.invoke`: config, mở/đóng customer, printers, print tickets, export folder, folder picker, read/save file, export ticket, updater commands.
- `ipcMain.on` + `ipcRenderer.send`: customer init/data, seat updates, QR open/close, theme update/request, app quit.
- Main broadcast bằng `webContents.send`: customer data, seat sync, QR sync, theme update, updater events.
- Wrapper listener trong preload gọi `ipcRenderer.on(...)` và trả về `removeListener(...)`.

Các bridge method chính gồm config, customer screen, seat sync, QR sync, in ấn, export/save/read file, version/update policy/download/install, danh sách máy in, theme sync và quit app.

## Quy Tắc Thêm IPC API

1. Quyết định operation có thuộc main không. Nếu cần Electron/Node/native API thì thuộc main.
2. Thêm hoặc cập nhật shared payload/result type trong `src/shared/types` khi dùng xuyên process.
3. Cập nhật `src/preload/api.types.ts` với method typed.
4. Implement wrapper trong `src/preload/index.ts`; API dạng listener phải trả về cleanup.
5. Đăng ký `ipcMain.handle` hoặc `ipcMain.on` tương ứng trong main hoặc main service tập trung.
6. Validate input trong main, đặc biệt file path, route string, printer name và payload dùng để render/export.
7. Cập nhật renderer để gọi `window.api`.
8. Thêm test hoặc chạy typecheck phù hợp với boundary đã đổi.

## Guardrail Bảo Mật

Giữ bridge hẹp: expose operation cụ thể, không expose raw `ipcRenderer`, `fs` hoặc command execution tổng quát. Không tin path hoặc payload từ renderer nếu chưa validate. Giữ behavior `setWindowOpenHandler` cho external link. Kiểm soát route cho customer-window. Tránh leak token hoặc secret qua IPC log/event. Với filesystem write, xử lý file bị khóa và cancel path như `save-file` hiện có. Với event stream sống lâu, luôn cung cấp cleanup để tránh leak.

Nếu convention chưa rõ, follow the existing local pattern in the touched module.
