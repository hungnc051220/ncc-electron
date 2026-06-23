# Prompt Release Phiên Bản Mới

Dùng prompt này khi user nói ngắn như “Tôi đã tăng version trong package.json, hãy release phiên bản mới”, “Đẩy code và release bản mới”, hoặc “Chuẩn bị release phiên bản mới”.

## Mục Tiêu

Tự chạy đầy đủ flow kiểm tra pre-push và release Electron của repo, dựa trên logic từ:

- `.codex/prompts/pre-push-release.md`
- `.codex/skills/pre-push-check/SKILL.md`
- `.codex/skills/electron-release/SKILL.md`
- `.codex/memory/project-decisions.md`

Không tự bịa script, remote, secret, bucket hoặc release server. Không tự push, publish hoặc upload nếu user chưa xác nhận rõ hành động cuối.

## Inspect Bắt Buộc

Trước khi chạy flow, đọc và báo ngắn:

- Version hiện tại trong `package.json`.
- `git branch --show-current`.
- `git remote -v`.
- `git status --short`.
- `git diff` hoặc diff phạm vi liên quan.
- `.github/workflows/release.yml`.
- `electron-builder.yml`.
- `src/main/update-policy.json`.
- `src/main/updater.service.ts`.

Nếu version chưa tăng hoặc tag `v<version>` có khả năng đã tồn tại, dừng và yêu cầu user xác nhận trước khi release.

## Flow Thực Hiện

1. Xác định version đang release từ `package.json`.
2. Kiểm tra branch hiện tại, working tree, staged/untracked file và remote thật.
3. Chạy local checks bắt buộc bằng script có thật trong `package.json`:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
4. Không chạy `npm test` trong flow release mặc định; chỉ chạy khi user yêu cầu rõ hoặc thay đổi có rủi ro test đáng kể.
5. Nếu bất kỳ check bắt buộc nào fail, dừng ngay; không push và không xử lý release.
6. Nếu local checks pass, tiếp tục flow release Electron theo target phù hợp:
   - Nếu user chỉ nói release chung trên Windows, ưu tiên `npm run build:win` vì repo có Windows NSIS artifact.
   - Nếu user yêu cầu target khác, chỉ dùng script thật như `npm run build:unpack` hoặc `npm run build:linux:wsl`.
7. Sau build/release, kiểm tra artifact mới trong `dist` theo version và `LastWriteTime`:
   - Windows: `dist/ncc-system-<version>-setup.exe`, `.blockmap`, metadata `.yml`.
   - Linux: `dist/*.AppImage`, `dist/*.deb`, `.blockmap`, `.yml` nếu target Linux.
8. Chỉ khi artifact hợp lệ mới xử lý hoặc đề xuất xử lý `src/main/update-policy.json`.
9. Chuẩn bị push theo policy repo:
   - GitHub là remote chính để chạy GitHub Actions.
   - Bitbucket là mirror/backup hoặc review nội bộ.
   - Nếu push nhiều remote, push GitHub trước, Bitbucket sau.
   - Nếu push GitHub fail, không push tiếp Bitbucket trừ khi user yêu cầu rõ.
10. Nếu thiếu thông tin về release target, workflow trigger, secret, bucket hoặc server ngoài GitHub Releases, dừng và hỏi/ghi rõ cần user cung cấp gì.

## Quy Tắc An Toàn

- Không push khi `typecheck`, `lint` hoặc `build` fail.
- `npm test` là check tùy chọn trong release flow; nếu đã chạy và fail, báo rõ rủi ro trước khi tiếp tục.
- Không xử lý hoặc push `update-policy.json` nếu build fail hoặc artifact release chưa tồn tại.
- GitHub Releases là release target chính nếu repo không thể hiện server/bucket khác.
- Workflow hiện tại chỉ release chính thức từ `main`; nếu user muốn release `dev`, phải confirm lại workflow trigger trước khi bật.
- Nếu cần validate skill nhưng môi trường thiếu Python, ghi rõ không chạy được validator và fallback bằng review thủ công.

## Output Bắt Buộc

Luôn báo theo format:

1. **Version release**: version từ `package.json`, branch hiện tại và remote liên quan.
2. **Kết quả từng bước**: pass/fail cho `typecheck`, `lint`, `build`, release build/artifact check; nếu có chạy `npm test` thì báo thêm kết quả test.
3. **Artifact**: file đã tạo hoặc file còn thiếu, kèm đường dẫn `dist/...`.
4. **update-policy.json**: có đủ điều kiện xử lý chưa, field nào cần đổi nếu có.
5. **Trạng thái push/release**: có thể push/release ngay chưa.
6. **Hành động cuối cần xác nhận**: lệnh push/publish/update-policy cuối cùng cần user xác nhận, hoặc lý do đã dừng.
