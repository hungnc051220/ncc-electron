# Project Decisions Memory

File này lưu các quyết định bền vững cho repo. Không dùng như changelog. Chỉ thêm mục mới khi quyết định có khả năng tái sử dụng trong nhiều task.

## Quyết Định Hiện Tại

- Renderer không import trực tiếp Electron, `ipcRenderer`, `fs` hoặc `path`; mọi native capability đi qua `window.api`.
- HTTP call nằm trong `src/renderer/src/api/*.api.ts`; component ưu tiên gọi hook/domain API pattern hiện có thay vì gọi Axios trực tiếp.
- React Query key phải chứa đủ params/dto; mutation invalidate broad domain key khi dữ liệu list/detail có thể thay đổi.
- Zustand dùng cho state app/session/UI, không dùng để lưu bản sao server cache.
- Với field mới từ BE nhưng dữ liệu cũ có thể thiếu, ưu tiên type optional và fallback UI an toàn.
- Khi thêm cột bảng, đặt gần nhóm thông tin liên quan, dùng helper sort/fallback của module hiện tại, không refactor toàn bộ columns.
- Với thay đổi UI/style, luôn giữ light/dark theme và token/class hiện có như `bg-app-bg-container`, `border-app-border`.
- Test tối thiểu sau thay đổi code là `npm run typecheck`; chạy `npm run lint` khi có sửa TypeScript/TSX. Test chuyên sâu theo phạm vi module.
- GitHub là remote chính để chạy GitHub Actions; Bitbucket là remote mirror/backup hoặc review nội bộ.
- Khi push code lên nhiều remote, ưu tiên push GitHub trước để CI chạy sớm, sau đó mới push Bitbucket.
- Trước khi push/release phải pass local checks bắt buộc theo script có thật trong `package.json`: `typecheck`, `lint`, `build`. `npm test` là check tùy chọn theo phạm vi/rủi ro hoặc khi user yêu cầu rõ. Nếu local check bắt buộc fail thì không push.
- Nếu push GitHub fail thì không push tiếp Bitbucket, trừ khi user yêu cầu rõ.
- Release hiện tại coi GitHub Releases là release target chính nếu repo không thể hiện server, bucket hoặc release target khác.
- Không xử lý hoặc push `src/main/update-policy.json` nếu build fail hoặc artifact release chưa tồn tại.
- Nếu cần release `dev`, phải confirm lại workflow trigger trước khi bật.
- Nếu môi trường thiếu Python nên không validate skill tự động được, ghi rõ trong kết quả và fallback bằng review thủ công.

## Không Lưu Ở Đây

- Bug/task đã xong nhưng không tạo quy ước mới.
- Thông tin tạm thời từ một API response chưa được xác nhận.
- Secret, token, URL private hoặc cấu hình máy cá nhân.
