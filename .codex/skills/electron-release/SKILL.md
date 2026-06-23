---
name: electron-release
description: Hỗ trợ build/release Electron cho repo này, kiểm tra artifact, update-policy.json và GitHub Actions release flow. Dùng khi user muốn build release, kiểm tra file release, chuẩn bị cập nhật update-policy hoặc xác minh quy trình publish Electron.
---

# Electron Release

## Khi Dùng

Dùng skill này khi user yêu cầu build release Electron, kiểm tra artifact trong `dist`, xử lý `src/main/update-policy.json`, hoặc review GitHub Actions release flow.

## Nguồn Sự Thật

- `package.json`: script build thật.
- `electron-builder.yml`: artifact name, publish provider và target.
- `.github/workflows/release.yml`: CI release thật.
- `electron.vite.config.ts`: biến build-time như `APP_RELEASE_CHANNEL`, `APP_ENABLE_DEVTOOLS`.
- `src/main/updater.service.ts`: URL policy và channel updater.
- `src/main/update-policy.json`: policy public cho updater.
- GitHub Releases là release target chính nếu repo không thể hiện server, bucket hoặc target khác.

## Checklist Release

1. Kiểm tra branch, working tree và remote bằng git.
2. Đọc workflow release hiện tại; không dựa vào README nếu workflow khác.
3. Xác nhận workflow đang trigger branch release mong muốn; nếu cần release `dev`, phải confirm lại trigger trước khi bật.
4. Chọn command có thật theo target:
   - `npm run build` để build app bằng electron-vite.
   - `npm run build:win` để build Windows installer.
   - `npm run build:unpack` để build thư mục unpack.
   - `npm run build:linux:wsl` nếu cần build Linux từ Windows qua WSL.
5. Sau build, kiểm tra artifact thật trong `dist`.
6. Chỉ xử lý `src/main/update-policy.json` sau khi build pass và artifact đúng target tồn tại.
7. Không upload, push hoặc publish nếu build fail hoặc artifact chưa tồn tại.

## Artifact Cần Kiểm Tra

Theo cấu hình hiện tại:

- Windows NSIS: `dist/ncc-system-<version>-setup.exe`, `.blockmap`, và metadata `.yml`.
- Linux CI: `dist/*.AppImage`, `dist/*.deb`, `.blockmap`, `.yml`.
- `electron-builder.yml` đặt `publish.provider: github`, owner `hungnc051220`, repo `ncc-electron`.
- Workflow GitHub hiện upload `dist/*` sau khi build Windows và Linux.
- Workflow hiện tại chỉ dùng release chính thức từ `main`; không giả định có luồng `dev` nếu trigger không thể hiện rõ.

Khi kiểm tra local, phân biệt artifact mới theo `LastWriteTime`, version trong tên file và metadata `.yml`; không dùng nhầm artifact cũ.

## update-policy.json

- File nằm ở `src/main/update-policy.json`.
- App mặc định fetch policy từ `https://raw.githubusercontent.com/hungnc051220/ncc-electron/main/src/main/update-policy.json`.
- Chỉ cập nhật policy sau khi release build thành công và đã xác nhận version/tag.
- Kiểm tra các field: `enabled`, `latestVersion`, `minSupportedVersion`, `mode`, `messages`, `releaseNotesUrl`.
- Không đẩy riêng `update-policy.json` trước khi artifact release đã tồn tại. Workflow hiện `paths-ignore` file này nên push chỉ policy không kích hoạt release.

## Thông Tin Cần User Cung Cấp Khi Thiếu

- Branch release đích và remote cần push.
- Có phát hành GitHub, Bitbucket hay cả hai không.
- Version/tag mong muốn nếu không dùng `package.json`.
- Có cần cập nhật `update-policy.json` không, và nội dung message/release notes.
- Release server/secret/bucket nếu khác GitHub Releases.
- Python hoặc tool validate skill nếu user yêu cầu validate tự động; nếu thiếu Python, ghi rõ và review thủ công.

## Output Mong Muốn

Tóm tắt:

- Branch/remote và workflow sẽ bị ảnh hưởng.
- Command build đã chạy hoặc cần chạy.
- Artifact đã tìm thấy.
- Trạng thái `update-policy.json`.
- Có đủ điều kiện publish/push policy hay chưa.
