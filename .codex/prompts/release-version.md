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
   - `npm test` nếu script test tồn tại
   - `npm run build`
4. Nếu bất kỳ check bắt buộc nào fail, dừng ngay; không push và không xử lý release.
5. Nếu local checks pass, chuẩn bị commit/push phần code release lên GitHub trước để GitHub Actions chạy. Không đưa thay đổi `src/main/update-policy.json` vào bước push release đầu tiên.
6. Theo dõi hoặc yêu cầu xác nhận GitHub Actions build/release đã hoàn tất thành công; xác nhận GitHub Release/artifact hợp lệ theo workflow thực tế.
7. Chỉ sau khi GitHub Actions thành công và artifact/release hợp lệ mới cập nhật hoặc đề xuất cập nhật `src/main/update-policy.json`.
8. Khi cập nhật `update-policy.json`, kiểm tra field thật đang có (`enabled`, `latestVersion`, `minSupportedVersion`, `mode`, `messages`, `releaseNotesUrl`) và không tự bịa field mới.
9. Nếu cần cập nhật `messages`, chuyển nội dung task kỹ thuật thành changelog dễ hiểu cho người dùng cuối:
   - Viết tiếng Việt tự nhiên, ngắn gọn, đọc được trong popup cập nhật.
   - Mô tả lợi ích/hành vi mới theo góc nhìn người dùng.
   - Không dùng thuật ngữ kỹ thuật như build, artifact, pipeline, workflow, Electron, IPC, refactor, patch, commit, release job.
   - Ví dụ `Thêm context menu copy/paste` -> `Thêm menu chuột phải giúp sao chép, dán và chọn nội dung nhanh hơn.`
10. Nếu không rõ thay đổi nào nên đưa vào `messages`, đọc git diff để đề xuất message user-facing; nếu vẫn không chắc, hỏi user xác nhận. Không tự ghi message kỹ thuật.
11. Sau khi update-policy hợp lệ, chuẩn bị push tiếp theo policy repo:
   - GitHub là remote chính để chạy GitHub Actions.
   - Bitbucket là mirror/backup hoặc review nội bộ.
   - Nếu push nhiều remote, push GitHub trước, Bitbucket sau.
   - Nếu push GitHub fail, không push tiếp Bitbucket trừ khi user yêu cầu rõ.
12. Nếu thiếu thông tin về release target, workflow trigger, secret, bucket hoặc server ngoài GitHub Releases, dừng và hỏi/ghi rõ cần user cung cấp gì.

## Quy Tắc An Toàn

- Không push khi `typecheck`, `lint`, `test` nếu có, hoặc `build` fail.
- Không xử lý hoặc push `update-policy.json` nếu GitHub Actions build/release chưa thành công hoặc artifact/release chưa hợp lệ.
- `messages` trong `update-policy.json` là changelog cho người dùng cuối, không phải log kỹ thuật, log build hoặc thông báo CI/CD.
- GitHub Releases là release target chính nếu repo không thể hiện server/bucket khác.
- Workflow hiện tại chỉ release chính thức từ `main`; nếu user muốn release `dev`, phải confirm lại workflow trigger trước khi bật.
- Nếu cần validate skill nhưng môi trường thiếu Python, ghi rõ không chạy được validator và fallback bằng review thủ công.

## Output Bắt Buộc

Luôn báo theo format:

1. **Version release**: version từ `package.json`, branch hiện tại và remote liên quan.
2. **Kết quả từng bước**: pass/fail cho `typecheck`, `lint`, `test` nếu có, `build`, GitHub Actions release, artifact/release check.
3. **Artifact**: file đã tạo hoặc file còn thiếu, kèm đường dẫn `dist/...`.
4. **update-policy.json**: có đủ điều kiện xử lý chưa, field nào cần đổi nếu có, và `messages` user-facing dự kiến.
5. **Trạng thái push/release**: có thể push/release ngay chưa.
6. **Hành động cuối cần xác nhận**: lệnh push/publish/update-policy cuối cùng cần user xác nhận, hoặc lý do đã dừng.
