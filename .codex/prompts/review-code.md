# Prompt Review Code

Dùng prompt này cho review code cấp senior trong repository này. Ưu tiên correctness và maintainability hơn nit formatting.

## Prompt

Review diff hoặc branch được cung cấp trong ngữ cảnh ứng dụng Electron + React + TypeScript này. Inspect pattern cục bộ gần đó trước khi đánh giá. Đưa findings lên đầu, sắp xếp theo mức độ nghiêm trọng. Kèm file/line reference khi có thể. Không nitpick formatting trừ khi ảnh hưởng maintainability hoặc vi phạm lint/format bắt buộc.

## Checklist

- **Correctness**: hành vi khớp yêu cầu, edge case được xử lý, transform dữ liệu giữ đúng contract API hiện có.
- **TypeScript safety**: tái dùng shared type, tránh `any` trừ boundary hiện có, xử lý nullable rõ ràng.
- **React rendering**: không tạo render loop, dependency bất ổn, stale closure hoặc set state sau unmount.
- **Effect và cleanup**: subscription, timer, IPC listener và socket handler trong `useEffect` được cleanup đúng.
- **React Query**: query key chứa đủ params, `enabled` đúng, mutation invalidate đúng key, stale/previous data là có chủ đích.
- **Zustand**: thay đổi store không tạo global coupling ngoài ý muốn; persisted state và logout/reset vẫn đúng.
- **API layer**: dùng `api` từ `api/client.ts`, không duplicate base URL/auth/refresh logic, xử lý lỗi bằng helper hiện có.
- **Electron IPC**: renderer không import Node/Electron API; preload type khớp implementation; main validate payload và path.
- **Socket**: listener không leak hoặc bị nhân đôi sau reconnect; unsubscribe function được dùng.
- **UI state**: loading, error, empty, disabled, permission-denied và customer-mode state được xử lý.
- **Theme và layout**: thay đổi Antd/Tailwind chạy ổn ở light/dark và không phá layout table/form dày đặc.
- **Test**: hành vi thay đổi có Vitest/RTL/MSW hoặc Playwright phù hợp; cache/store side effect được cover.
- **Maintainability**: thay đổi cục bộ, giữ kiến trúc, tránh rewrite diện rộng.

## Dạng Output

Trả về:

1. Findings trước, theo mức độ nghiêm trọng.
2. Câu hỏi mở hoặc giả định.
3. Tóm tắt ngắn phần ổn.
4. Test gap hoặc check nên chạy.

Nếu không thấy vấn đề, nói rõ và nêu rủi ro còn lại.
