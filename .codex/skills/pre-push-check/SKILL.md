---
name: pre-push-check
description: Kiểm tra trước khi push code trong repo Electron + React + TypeScript này. Dùng khi user sắp push, muốn kiểm tra branch hiện tại, working tree, TypeScript, lint, test, build hoặc cần đảm bảo code an toàn trước khi đẩy lên remote GitHub/Bitbucket.
---

# Pre-Push Check

## Khi Dùng

Dùng skill này khi user nói sắp push, muốn kiểm tra branch, kiểm tra trước commit/push, hoặc muốn đảm bảo code không lỗi TypeScript/build trước khi đẩy lên remote.

## Nguồn Sự Thật

- Đọc `package.json` trước khi chọn command.
- Đọc `.github/workflows/*` nếu push có thể kích hoạt CI/release.
- Kiểm tra remote thật bằng `git remote -v`; repo hiện có `github` và `origin` nhưng không hard-code nếu output đã thay đổi.
- Kiểm tra trạng thái bằng `git status --short`, `git branch --show-current`, và diff phù hợp.
- GitHub là remote chính để chạy GitHub Actions; Bitbucket là mirror/backup hoặc review nội bộ.

## Checklist

1. Xác định branch hiện tại và remote.
2. Kiểm tra file changed, staged/untracked và diff.
3. Chạy hoặc đề xuất chạy command thật trong `package.json`:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
4. Test không phải bước bắt buộc trong quy trình push/release; chỉ chạy khi task yêu cầu hoặc khi cần kiểm tra phạm vi thay đổi.
5. Nếu command bắt buộc fail, dừng quy trình push, tóm tắt lỗi đầu tiên đáng sửa và file liên quan.
6. Nếu check bắt buộc pass, tóm tắt rủi ro còn lại và remote/branch có thể push.

## Quy Tắc Push Hai Remote

- Không push nếu `typecheck`, `lint` hoặc build bắt buộc chưa pass.
- Không tự push nếu user chưa yêu cầu rõ.
- Không tự bịa remote name. Dùng remote từ `git remote -v`.
- Nếu cần đẩy cả GitHub và Bitbucket, ưu tiên push GitHub trước để CI chạy sớm, sau đó mới push Bitbucket.
- Nếu push GitHub fail, không push tiếp Bitbucket trừ khi user yêu cầu rõ.
- Với repo hiện tại, GitHub Actions release liên quan tới remote GitHub; Bitbucket là `origin` theo cấu hình hiện thấy.

## Khi Command Fail

- Không chạy tiếp các bước tốn thời gian nếu lỗi trước đó là blocker rõ ràng.
- Không sửa code trừ khi user yêu cầu.
- Báo command, exit status, lỗi chính, file liên quan và đề xuất hướng sửa.

## Output Mong Muốn

Trả về ngắn gọn:

- Branch/remote hiện tại.
- File changed đáng chú ý.
- Check đã chạy và kết quả.
- Có đủ điều kiện push hay chưa.
- Bước tiếp theo an toàn.
