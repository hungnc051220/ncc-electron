# Prompt Pre-Push Và Release

Dùng prompt này khi cần kiểm tra trước khi push code hoặc chuẩn bị release Electron.

## Prompt

Inspect repo trước, không tự bịa script, remote, secret, bucket hoặc release server. Đọc tối thiểu:

- `package.json`
- `.github/workflows/*`
- `scripts/*`
- `electron-builder.yml`
- `electron.vite.config.ts`
- `src/main/update-policy.json`
- `src/main/updater.service.ts`
- `git remote -v`, `git status --short`, `git diff`

## Checklist Pre-Push

- Xác định branch hiện tại và remote thật bằng `git branch --show-current` và `git remote -v`.
- Kiểm tra working tree, staged/unstaged/untracked file và diff.
- Chỉ chạy command có trong `package.json`. Ưu tiên:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
- `npm test` không nằm trong gate bắt buộc của flow push/release; chỉ chạy khi user yêu cầu rõ hoặc thay đổi có rủi ro test đáng kể.
- Nếu command bắt buộc fail, dừng lại, tóm tắt lỗi, file liên quan và hướng sửa. Không push khi check bắt buộc chưa pass.
- Không chạy `lint:fix`, `format`, build release hoặc push nếu user chưa yêu cầu rõ.
- Nếu user yêu cầu push nhiều remote, ưu tiên GitHub trước để GitHub Actions chạy sớm, sau đó mới push Bitbucket.
- Nếu push GitHub fail, không push tiếp Bitbucket trừ khi user yêu cầu rõ.

## Checklist Release

- Đọc workflow release thực tế trong `.github/workflows/release.yml`.
- Kiểm tra release branch, tag/version và release channel dự kiến.
- Mặc định coi GitHub Releases là release target chính nếu repo không thể hiện server/bucket khác.
- Build bằng script thật trong `package.json`, ví dụ `npm run build:win`, `npm run build:unpack`, `npm run build:linux:wsl` khi user yêu cầu đúng target.
- Sau build, kiểm tra artifact thật trong `dist` theo target:
  - Windows: `dist/*.exe`, `dist/*.blockmap`, `dist/*.yml`
  - Linux CI: `dist/*.AppImage`, `dist/*.deb`, `dist/*.blockmap`, `dist/*.yml`
- Không xử lý hoặc đẩy `src/main/update-policy.json` nếu build fail hoặc artifact release chưa tồn tại.
- Nếu update `update-policy.json`, kiểm tra `latestVersion`, `minSupportedVersion`, `mode`, `messages`, `releaseNotesUrl` và liên hệ với release/tag thực tế.
- Nếu user muốn release `dev`, phải confirm workflow trigger hiện tại trước khi bật hoặc push.
- Nếu cần validate skill nhưng môi trường thiếu Python, ghi rõ không chạy được validator và fallback bằng review thủ công.

## Dạng Output

Trả về:

1. Trạng thái branch, remote và working tree.
2. Command đã chạy hoặc đề xuất chạy, kèm kết quả.
3. Artifact release tìm thấy hoặc còn thiếu.
4. Trạng thái `update-policy.json`.
5. Có được push/release hay chưa.
6. Thông tin còn thiếu cần user cung cấp.

Nhắc lại rõ: không tự push code, không tự publish release, không tự upload `update-policy.json` nếu user chưa yêu cầu rõ.
