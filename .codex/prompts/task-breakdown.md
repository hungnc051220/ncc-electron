# Prompt Phân Rã Task

Dùng prompt này để biến yêu cầu feature hoặc bug thành các task nhỏ cho repo Electron + React + TypeScript này.

## Prompt

Inspect code liên quan trước khi lập kế hoạch. Dựa trên cấu trúc thật của repository, không tự nghĩ ra script, folder hoặc kiến trúc không tồn tại. Chia yêu cầu thành các task nhỏ.

Với mỗi task, cung cấp:

- **Mục tiêu**: hành vi hoặc lỗi cụ thể cần xử lý.
- **File/folder ảnh hưởng**: route, feature, hook, API module, store, IPC file, style và test có khả năng cần sửa.
- **Ghi chú implement**: cách bám theo pattern cục bộ hiện có.
- **Tiêu chí chấp nhận**: điều kiện ở mức người dùng hoặc code chứng minh task đã xong.
- **Test cần thêm/cập nhật**: coverage bằng Vitest/RTL/MSW hoặc Playwright phù hợp.
- **Rủi ro và edge case**: cache invalidation, phân quyền, dark/light theme, customer display, cleanup IPC, cleanup socket, empty/error state.

## Nhắc Nhở Theo Repo

- Page renderer nằm trong `src/renderer/src/features`; route nằm trong `src/renderer/src/router.tsx`.
- API call thuộc `src/renderer/src/api/*.api.ts`; React Query hook thuộc `src/renderer/src/hooks`.
- Domain hook thường có `keys.ts`; đưa đủ params vào query key và invalidate broad domain key sau mutation.
- Zustand store nằm trong `src/renderer/src/store`; dùng cho state app/session/UI, không dùng làm server cache.
- Native work thuộc `src/main`; renderer truy cập native qua `src/preload` và `window.api`.
- Ưu tiên thay đổi tối thiểu, an toàn. Nếu convention chưa rõ, viết: “Follow the existing local pattern in the touched module.”

## Dạng Output

Trả về:

1. Cách hiểu ngắn về yêu cầu.
2. Danh sách task theo các trường ở trên.
3. Check nên chạy, chỉ dùng script trong `package.json`.
4. Giả định và thông tin còn thiếu.
