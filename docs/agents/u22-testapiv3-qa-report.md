# Báo cáo QA tích hợp U22 V6.2 trên testapiv3 (BE develop + FE Electron nhánh U22)

Ngày test: 2026-11-10, 10:36–13:40 (UTC+07:00). Người thực hiện: Claude (phiên QA). Phạm vi: chỉ kiểm thử; **không sửa source BE/FE, không deploy, không commit/push/merge/PR**. Trong repo chỉ thêm báo cáo này (chưa commit) và thư mục bằng chứng `test-results/u22-testapiv3/` (git-ignore). Mục 1–12: QA tích hợp U22. **Mục 13: Revenue & Reporting QA và bộ dữ liệu QA giữ lại trên DEV** (24 đơn 10206655–10206678; Legacy POS / U22 / Voucher P5-P6 Regression; đối chiếu báo cáo). **Mục 13.12 (bổ sung 13:50–14:30): sửa ISS-R03 / ISS-R01 (`u22-usage`)**. Ở mục này **có sửa source BE** trên nhánh local `bug/develop/report-u22-usage`, chưa commit/push/deploy.

Tài liệu liên quan (giữ nguyên, không sửa): [kế hoạch V6.2](../../../ncc-online-be-nestjs/docs/agents/u22-pricing-implementation-plan-v6.md), [báo cáo QA trên BE local](../../../ncc-online-be-nestjs/docs/agents/u22-full-qa-report.md) (`D:\Projects\ncc-online-be-nestjs\docs\agents\`).

---

## 0. Kết luận nhanh

| Câu hỏi | Trả lời |
|---|---|
| Backend testapiv3 có hoạt động đúng không? | **Có.** Toàn bộ hành vi V6.2 đã PASS trên BE local đều PASS lại trên testapiv3 bằng HTTP thật: cấu hình giá 7 ngày, 400/403/409, hai Admin đồng thời, audit, giá theo thứ có hiệu lực ngay, `expectedU22Price` (400/409), chặn `orderDiscount` client, 2D/3D, ngày lễ, ngày thiếu `DateInYear`, 20 thẻ U22 thật (dưới 22 tuổi), Danh sách ngày, Khởi tạo năm (365/366, mẫu A/B, đồng thời 409), populate đồng thời 409, báo cáo theo giá thực bán. Bán + hủy thật (tiền mặt) đúng giá, đúng DB, đúng Mediasoft DEV. Không có regression. |
| Frontend hiện tại có tương thích Backend mới không? | **Có.** App Electron (build từ `3b8b5fe`) chạy với testapiv3: đăng nhập, tab Giá vé U22, dialog sửa giá (409 khi lưu, xung đột phát hiện trước khi lưu), Danh sách ngày, Khởi tạo năm, Thiết lập phân loại ngày, năm thiếu ngày, POS preview, POS 409, POS khóa U22 suất 3D/ngày lễ, bán U22 + in vé (máy in giả) + hủy, voucher giấy + U22. Mọi request HTTP của renderer chỉ tới testapiv3. |
| Có lỗi P0/P1 nào không? | **Không có lỗi P0/P1 trong code U22 V6.2 (BE/FE).** Có **3 rủi ro P1 bảo mật có sẵn** ở BE, không thuộc U22 và không chặn PR FE: ISS-T01 (testapiv3 chấp nhận JWT ký bằng `JWT_SECRET` của `.local.env`, secret **trùng** `.local.prod.env`); ISS-R01 (`/api/reports/*` không cần đăng nhập + báo cáo U22 join cứng CRM **production** ⇒ lộ họ tên, số thẻ khách qua testapiv3); ISS-R02 (API internal tạo/sửa/xóa khách CRM không xác thực). |
| Báo cáo doanh thu có đúng không? (mục 13) | **Có** với báo cáo theo phim/suất (ngày bán, ngày chiếu, lọc phim/nhân viên/hãng), "Doanh thu bán vé" và Lịch sử bán vé: 0 lệch trên bộ dữ liệu QA 24 đơn và 6 cửa sổ dữ liệu thật; đơn hủy loại đúng; voucher giấy không bị trừ hai lần; "Thực nộp" = tiền khách trả. **Sai:** báo cáo giao dịch thẻ U22 (ISS-R03, P2, có sẵn) và một số chỉ tiêu phụ P3. Bán vé thường không bị ảnh hưởng bởi U22. *Cập nhật 14:30:* ISS-R03 đã sửa ở BE local (4 dòng, 252.000đ; 22/22 PASS kể cả Electron), testapiv3 chưa deploy (13.12) |
| Có cần sửa code trước khi tạo PR FE không? | **Không cần sửa code U22.** Chỉ cần ghép `origin/main` vào nhánh FE (ISS-06: thiếu `e4b6c26` fix B3 và `aaad1de`) rồi chạy lại P6 L1. ISS-T02 (race quyền → `/403`, P3, có sẵn từ trước) có thể sửa sau. |
| Điều kiện còn thiếu trước khi merge FE vào develop | Mục 12. |

**FE vào develop: NOT READY, chỉ vì ISS-06.** Code FE U22 tương thích BE đã deploy; sau khi ghép `origin/main`, chạy lại P6 L1 + spec U22 + Vitest đạt thì chuyển READY.

---

## 1. API base URL và môi trường thực tế

| Mục | Giá trị | Nguồn / cách xác minh |
|---|---|---|
| API base URL | `https://testapiv3.chieuphimquocgia.com.vn` | BE `src/application/setup-swagger.ts:86`, `.local.env HOST`; FE `src/main/config.service.ts:10` (mặc định), `%APPDATA%\ncc-system\config.json` máy này |
| Socket | `wss://testapiv3.chieuphimquocgia.com.vn/socket.io` | FE config; WebSocket quan sát được trong Electron (FE-24) |
| Hạ tầng | Cloudflare → Kong 3.3.1 → NestJS | Header `Server: cloudflare`, `Via: kong/3.3.1` |
| Trạng thái | `GET /health` 200 `{"status":"ok"}`; `GET /` "AN VUI Api NCC Online v1.6.0" | preflight |
| Xác thực | **JWT local** (`iss: anvui`, HS256, hết hạn 24 h), tức `AUTH_USE_UMS=false` trên testapiv3 | Giải mã token đăng nhập `admin` (`user_id 39193040`) |
| DB | `WIN-BV1JM9QPTKE / CinemaTicketDev` (CRM `CinemaCrmDev`) | `GET /api/pos/u22-price-config` trả đúng `version 188`, `updatedOnUtc 2026-11-09T15:11:36.316Z` như dòng DB; mọi ghi qua API (PUT giá, ngày lễ, đơn) đều thấy ngay trên DB qua kết nối có guard `@@SERVERNAME`/`DB_NAME()` |
| Mediasoft | `public-api-ncc.tesop.asia` = **tenant DEV** | BE không có `MEDIASOFT_API_URL` → host mặc định. Lịch sử điểm của tenant này chỉ có **275 bản ghi**, đều tham chiếu đơn/khách DEV (vd. đơn DEV 10206605, 10206588 tạo từ máy POS M11/M15 ngày 09/11). Người dùng xác nhận đây là Mediasoft DEV (`ncc.tesop.asia`) |
| Cron DEV (`Setting`) | `runCronjob.publishEticket.offline = true`, `autoExportETickets = true`, `cronjobOrderSyncQueue = true` | Đọc DB. Vì vậy mọi đơn bán thật trong phiên đều bật "Xuất hóa đơn" (`hasManualInvoice = 1`) để không bị phát hành hóa đơn điện tử |
| Dữ liệu DEV | Sao từ production khoảng **giữa tháng 7/2026** (traffic thật ~2.000 đơn/ngày dừng ở `Order.Id ≈ 10206406`) | Thống kê `Order` theo tháng (ISS-T04) |

---

## 2. Git SHA và phiên bản deploy

| Thành phần | Giá trị |
|---|---|
| BE `origin/develop` | `58afe7189f1b` (Merge #59 vá CVE), trên `805a9732ba85` (Merge #60 U22). U22 gồm `3b889c8`, `a1d360d`, `738c7bd`, **`2a79b95`** (2D, audit ngày lễ, populate 409), `f48daa4` |
| Image CI (GitHub Actions, build-and-push) | `805a973` → tag `261109.2348-develop` (16:49Z 09/11); `58afe71` → `261110.0202-develop` (19:36Z 09/11). Deploy làm tay, không có job deploy |
| Bản đang chạy trên testapiv3 | **Không xác minh được SHA/tag**: API chỉ báo `v1.6.0` (mọi nhánh cùng version). Hành vi chứng minh bản deploy **≥ `2a79b95`**: `not_2d` (POS-PV-09), audit `DateInYear` (DT-AUD-01/02), populate đồng thời 409 (DT-CONC-02). Không phân biệt được `805a973` với `58afe71` (khác nhau chỉ ở dependency) |
| FE | `feat/u22-dynamic-pricing` HEAD **`3b8b5fec9e20`**, app version 1.0.120. Build lại lúc test (`npm run build`: typecheck + electron-vite, exit 0). Working tree: chỉ `.vscode/settings.json` sửa và 1 ảnh chưa track (không ảnh hưởng build) |
| FE `origin/main` | `b924ce2dc9a7`; **nhánh U22 thiếu** `e4b6c26` (fix B3), `aaad1de` (P6-E2E-28), cùng 2 merge `b924ce2`, `8ded4ec` (ISS-06) |

Đề xuất: cho `/health` trả git SHA hoặc tag image để QA đối chiếu bản deploy.

---

## 3. Kết quả theo test case

Chi tiết từng case (expected / actual / bằng chứng) ở **Phụ lục A**. Tóm tắt theo nhóm:

| Nhóm | Nội dung | Tổng | PASS | PASS* | FAIL | BLOCKED | NOT RUN |
|---|---|---|---|---|---|---|---|
| U22-CONFIG | GET/PUT, 401/403, 17 ca validate, audit, giá riêng 7 thứ + preview ngay, 409, 2 Admin đồng thời ×3, khôi phục | 42 | 42 | 0 | 0 | 0 | 0 |
| POS-U22 | Preview 17 ca (thẻ hợp lệ/không tồn tại/Member/không thẻ, T2–CN, 3 ngày lễ, 3D, `price_not_eligible`, ngày thiếu `DateInYear`), tạo đơn bị từ chối 10 ca, giá đổi sau preview, không phát sinh đơn | 32 | 32 | 0 | 0 | 0 | 0 |
| P5P6-QUOTE | Quote voucher giấy (thường, U22 thiếu/sai/đúng `expectedU22Price`, không thẻ, `orderDiscount` client, 3D), tồn voucher không đổi | 9 | 8 | 1 | 0 | 0 | 0 |
| DATES | Danh sách ngày (đọc 2026), Khởi tạo năm (quyền, 6 ca sai, mẫu A/B, 365/366, 17 ngày lễ, khởi tạo lại không ghi đè), đánh dấu/đổi tên/bỏ ngày lễ, 403, 404, năm thiếu ngày + bổ sung, đổi phân loại theo thứ, đồng thời ×2, audit | 39 | 37 | 2 | 0 | 0 | 0 |
| ELECTRON | App thật → testapiv3 (mục 6) | 27 | 26 | 0 | 1 | 0 | 0 |
| REPORT | Báo cáo doanh thu theo phim với đơn U22 giá ≠ 55.000 | 4 | 3 | 1 | 0 | 0 | 0 |
| SALE-U22 | 1 đơn U22 tiền mặt thật qua Electron + hủy | 11 | 11 | 0 | 0 | 0 | 0 |
| SALE-P5P6 | 2 đơn voucher giấy thật (thường; U22 + voucher) + hủy | 9 | 8 | 1 | 0 | 0 | 0 |
| REAL-U22-CARDS | **20 thẻ U22 thật** (dữ liệu sao từ production trong `CinemaCrmDev`): 12 thẻ sinh cuối 11/2004 (sắp tròn 22) + 8 thẻ sinh 2005–2014; preview T5/T6 chỉ đọc + 2 dòng tổng hợp | 22 | 22 | 0 | 0 | 0 | 0 |
| BLOCKED / NOT RUN | VietQR, VNPay, hóa đơn điện tử, hoàn tiền qua cổng, SMS; thẻ quá 22 tuổi, 503 thật, P6 E2E, bán ở giá mới, responsive | 10 | 0 | 0 | 0 | 5 | 5 |
| **Tổng** | | **205** | **189** | **5** | **1** | **5** | **5** |

**PASS\*** = lần chạy đầu FAIL do kỳ vọng của harness quá hẹp, đã phân xử lại có bằng chứng:

| ID | Phân xử |
|---|---|
| PV-Q-05 | Quote voucher giấy chặn `orderDiscount` client (`PAPER_VOUCHER_CLIENT_ORDER_DISCOUNT_NOT_ALLOWED`) trước bước U22, giống BYP-04 của QA local. Thêm PV-Q-05b (không gửi `orderDiscount`) → 400 `U22_MEMBER_CARD_REQUIRED` PASS |
| DT-HOL-13/14 | Tên ngày lễ rỗng / 201 ký tự → **422** (ValidationPipe toàn cục), harness kỳ vọng đúng 400. Bị từ chối, không ghi DB (QA local chỉ yêu cầu 4xx) |
| RPT-04 | `/api/reports/*` vẫn không cần đăng nhập trên testapiv3 (ENV-06 có sẵn, ngoài U22) |
| PVS-SAFE | Harness chặn 2 ảnh lô voucher GET từ CDN `res.anvui.vn` (chặn mọi origin ngoài testapiv3). Không có QR/thanh toán, đúng 2 đơn QA |

**FAIL duy nhất: FE-26** (ISS-T02, FE, có sẵn, P3): điều hướng vào route có guard ngay sau khi đăng nhập, trước khi tải xong quyền, thì app chuyển sang `/403`.

Lịch sử chạy Electron (minh bạch): lượt 1 đạt 19/26. 7 ca FAIL đều do harness: selector `.ant-modal-content` không còn trong antd 6.7.0 (đổi thành `.ant-modal-container`), dialog không đóng nên kéo theo 2 ca sau; đọc số tab trước khi dữ liệu về; chọn ghế đã bán; suất quá khứ khóa nút bán. Đã sửa harness và chạy lại từng ca; các ca này PASS ở lượt 2–3. Trong lúc đó phát hiện FE-26.

---

## 4. Tổng PASS / FAIL / BLOCKED / NOT RUN

| | Số ca |
|---|---|
| PASS (gồm 5 PASS*) | **194** |
| FAIL | **1** (FE-26, P3, lỗi FE có sẵn, không thuộc U22) |
| BLOCKED | **5** (VietQR, VNPay, hóa đơn điện tử, hoàn tiền qua cổng, SMS) |
| NOT RUN | **5** |
| **Tổng** | **205** |

Bộ test tự động (mock, chạy trên nhánh FE hiện tại) báo riêng ở mục 5.

---

## 5. Test HTTP thật so với unit / mock

| Loại | Phạm vi | Kết quả |
|---|---|---|
| **HTTP thật → testapiv3** (Node, `fetch`) | U22-CONFIG, POS-U22, P5P6-QUOTE, DATES, REPORT, REAL-U22-CARDS: 148 ca | 148 PASS (gồm 4 PASS*) |
| **Electron thật → testapiv3** | ELECTRON 27 ca + SALE-U22 11 + SALE-P5P6 9 | 45 PASS (gồm 1 PASS*), 1 FAIL |
| Trong Electron có giả lập ở renderer (ghi rõ trong case) | FE-11 (503), FE-12 (403 khi lưu giá), FE-20 (400 khi tạo đơn): kiểm **hiển thị lỗi**. FE-21/22: chỉ đổi ngày hiển thị của suất quá khứ để mở nút bán, `validate-voucher` vẫn do testapiv3 tính. Nhóm ELECTRON: tra thẻ / voucher Mediasoft / proxy Mediasoft được giả lập **trước khi** xác minh Mediasoft là DEV; nhóm SALE-* gọi Mediasoft DEV thật | — |
| **Vitest FE** (mock, `npm`/`npx vitest run` theo nhóm) | `ticketPrices`, `holidays`, `accessHistory`: 9 file | 9/9 file PASS |
| | `paperVouchers`, `orderHistory`, `hooks/orders`, `hooks/paperVouchers`, `api`: 18 file, 155 test | 17 file PASS; `orders.api.test.ts` FAIL 3 test, **trùng baseline `696928e`** (QA local S-07: test kỳ vọng filter không có `deleted: false`) |
| | `planScreening` (trừ `Actions.test.tsx`): 14 file, 183 test | 14/14 PASS |
| | `Actions.test.tsx` (`--testTimeout=60000`) | **86/86 PASS** (394 s, lần này không flaky) |
| BE Jest / P5-P6 MSSQL | Không chạy lại trong phiên này (code BE đã deploy, không đổi). Kết quả gần nhất: BE 1206 PASS, 5 suite fail giống baseline; P5/P6 MSSQL 81/81 (báo cáo QA local) | — |

---

## 6. Electron kết nối testapiv3

Build `out/` mới từ `3b8b5fe`, profile tạm (`config.json` trỏ testapiv3, không đụng cấu hình máy), cửa sổ 1366×768 (viewport 1352×731), máy in giả qua IPC, Chromium chỉ phân giải DNS cho `testapiv3.chieuphimquocgia.com.vn`.

| ID | Case | Kết quả |
|---|---|---|
| FE-01/02 | Khởi động profile tạm; đăng nhập UI → `POST /api/pos/staff/login` 201 | PASS |
| FE-03/04 | Danh sách giá vé (20 dòng); tab Giá vé U22 = 55.000đ / 70.000đ / T7 70.000đ | PASS |
| FE-05 | Link "Mở Danh sách ngày" (sáng) `rgb(22,119,255)` khác chữ thường, mở `#/holidays` | PASS |
| FE-06 | Dialog: "Lưu giá" khóa khi chưa đổi; Hủy không gửi PUT | PASS |
| FE-07 | Chế độ "Chỉnh riêng từng thứ" ở 1366×768: dialog y 52–679, nút Lưu y 627–659 < 731 | PASS |
| FE-08 | Lưu 56.000/71.000 qua UI rồi trả 55/70 qua UI: PUT 200 ×2, tab và DB khớp | PASS |
| FE-09 | Admin khác lưu khi dialog mở → bấm Lưu: PUT **409**, alert "Giá U22 vừa được cập nhật bởi người khác", Lưu khóa, DB giữ giá người kia | PASS |
| FE-10 | Admin khác lưu, sau 62 s app refetch khi focus → alert xung đột hiện **trước khi bấm Lưu**, 0 PUT | PASS |
| FE-11/12 | Hiển thị **503** (alert đỏ + Thử lại, ẩn Chỉnh sửa giá) và **403** khi lưu (mock) | PASS |
| FE-13 | Danh sách ngày 2026: 199 / 149 / 17 = DB | PASS |
| FE-14/15 | Năm QA 2067: "Khởi tạo năm" → mẫu A, **16** ngày lễ mặc định chọn sẵn (Valentine 14/02 trùng Tết Mùng 1, giữ tên luật định); bỏ chọn 01/09 → 201, 365 ngày, 0 lệch thứ, 15 ngày lễ, 01/09 không là lễ | PASS |
| FE-16 | "Thiết lập phân loại ngày" 2067: Lưu khóa khi chưa đổi; 01/09 đã bỏ hiện trong danh sách chưa đánh dấu nhưng **không chọn sẵn**; đổi mẫu B → bulk-create 201, 0 T6 cuối tuần, vẫn 15 ngày lễ | PASS |
| FE-17 | Xóa tháng 12/2067 → cảnh báo "Năm 2067 còn thiếu 31 ngày" + "Tạo các ngày còn thiếu" → 201 `createdDays 31`, cảnh báo biến mất, 24/12 "Giáng sinh" | PASS |
| FE-18 | POS suất T6 410031, ghế VIP, Quẹt thẻ VIP thẻ U22 → `validate-voucher` thật `u22Price 70000`, "Giá vé U22 của suất chiếu này: 70.000 ₫" | PASS |
| FE-19 | Chọn U22, Admin đổi T6 = 71.000, bấm xác nhận → POST gửi `expectedU22Price 70000` → **409** `U22_PRICE_CHANGED` 71.000, toast "… Chưa tạo đơn", không có đơn | PASS |
| FE-20 | Hiển thị **400** `U22_PRICE_CONFIRMATION_REQUIRED` (mock) | PASS |
| FE-21 | POS suất **3D** 395762 → `not_2d` thật, radio U22 khóa, "chỉ áp dụng cho suất chiếu 2D" | PASS |
| FE-22 | POS suất **ngày lễ** 403169 (01/05) → `holiday` thật, radio khóa, hiện "Ngày Quốc tế Lao động" | PASS |
| FE-23 | **Giao diện tối**: tab U22, dialog nâng cao (nút Lưu đáy 659/731), link `rgb(22,104,220)`, Danh sách ngày | PASS |
| FE-24 | Network: renderer gửi 45–98 request HTTP/lượt, **100% tới testapiv3**; WebSocket `wss://testapiv3…/socket.io` | PASS |
| FE-25 | Nhóm ELECTRON không phát sinh đơn (MaxOrderId giữ 10206651) | PASS |
| **FE-26** | Vào `#/ticket-prices` ngay sau đăng nhập: **2/2 lần** chuyển `#/403`, bấm "Thử lại" thì vào được | **FAIL** (ISS-T02) |
| SALE-01…11 | Bán U22 tiền mặt suất T5 410027 ghế V 85.000 + hủy (mục 7) | 11/11 PASS |

Network ngoài renderer (ghi nhận, không phải lỗi): main process tự `fetch` `raw.githubusercontent.com/…/update-policy.json` khi khởi động (GET, updater); màn voucher giấy tải ảnh lô từ CDN `res.anvui.vn`. **Không có request nào tới localhost hay API production** (`api.chieuphimquocgia.com.vn`). Dịch vụ màn hình lịch chiếu chỉ gọi `api.chieuphimquocgia.com.vn/api/GetAllSession` khi đã cấu hình khóa và có màn hình kết nối: profile tạm không có khóa nên không gọi.

Ảnh chụp: `test-results/u22-testapiv3/shots/` (git-ignore), ví dụ `07-u22-dialog-advanced-1366.png`, `09-u22-409-conflict.png`, `10-u22-live-conflict.png`, `11-u22-503-mock.png`, `14-init-year-dialog.png`, `17-partial-year-warning.png`, `18-pos-u22-preview.png`, `19-pos-409.png`, `21-pos-3d-locked.png`, `22-pos-holiday-locked.png`, `23-dark-*.png`, `26-permission-race-*.png`, `S01-sale-preview.png`, `S08-cancel-dialog.png`.

---

## 7. Regression P5/P6 và bán thật

Bán thật chỉ chạy sau khi xác minh Mediasoft của testapiv3 là tenant DEV và người dùng đồng ý (mục 9, ISS-T04). Chỉ tiền mặt, bật "Xuất hóa đơn" (không vào hàng đợi hóa đơn), máy in giả. Harness chỉ cho đúng số lệnh tạo đơn đã định đi qua và chỉ cho hủy đúng các đơn đó.

| Đơn | Nội dung | Kiểm tra | Kết quả |
|---|---|---|---|
| **10206652** | U22, suất T5 410027, ghế V 85.000 | Tra thẻ thật 200; preview 55.000; POST gửi `U22Ticket`, `expectedU22Price 55000`, `hasManualInvoice true` → 201. DB: `OrderTotal 55000`, `OrderDiscount 30000`, `UnitPriceInclTax 55000`, `OriginUnitPriceInclTax 85000`, `HasManualInvoice 1`. In: 1 vé, ghế D6, 55.000 ₫. 0 `Invoice`/`ETicketScheduleJob`. Mediasoft DEV +1.100 điểm (referenceId 10206652). `validate-voucher` → `used_today`. Báo cáo 12/11: 55.000 ×1 → ×2, thực thu 310.000 → 365.000. Hủy qua UI 201 → trạng thái 60, giá giữ 55.000; Mediasoft −1.100 "Thu hồi điểm tích lũy do hoàn trả vé"; thẻ dùng U22 lại được; báo cáo về như trước | 11/11 PASS |
| **10206653** | Vé thường (không U22) + voucher giấy LÔ-005 (30.000), ghế V 85.000 | Popup còn 55.000; POST 201 (`paperVouchers [{batchId 6, qty 1}]`). `OrderTotal 85000` (voucher không trừ vào OrderTotal), header APPLIED: `VoucherApplied 30000`, `RemainingPayable = CollectedAmount = 55000`; 1 usage; `UsedCount` +1. In 1 vé 85.000 ₫. Khách vãng lai: không đồng bộ Mediasoft | PASS |
| **10206654** | **U22 + voucher giấy** LÔ-005, ghế V 85.000 | Quote lại gửi `U22Ticket` + `expectedU22Price 55000` → tổng 55.000, voucher 30.000, còn 25.000; POST 201 gửi `expectedU22Price 55000`. DB `OrderTotal 55000`, `OrderDiscount 30000`, `UnitPriceInclTax 55000`, header `VoucherApplied 30000`, `CollectedAmount 25000`. Mediasoft DEV +1.100 / −1.100 | PASS |
| Báo cáo | Ngày chiếu 12/11 sau 2 đơn voucher | Thực thu +140.000 (= OrderTotal 85.000 + 55.000), Số lượng voucher +2, voucher áp dụng +60.000; sau khi hủy trở về đúng như trước | PASS |
| Hủy 10206653 / 10206654 | Luồng hủy POS hiện có | cancel 201; đơn 60; header Status 30; usage Status 30; `UsedCount` **giữ nguyên** (đúng quy tắc P5: voucher giấy đã xé không hoàn) | PASS |

Quote (chỉ đọc, HTTP thật): PV-Q-01…08 + 05b PASS: không U22 80.000 − 30.000 = 50.000; U22 thiếu/sai `expectedU22Price` → 400/409; U22 70.000 − 30.000 = 40.000; 3D → 400; tồn voucher không đổi.

Không phát sinh thanh toán sai: chỉ tiền mặt, `CollectedAmount` = phần còn lại; 0 request QR/thanh toán (harness chặn, không có request nào bị chặn ngoài 2 ảnh CDN). Voucher bị dùng: đúng 2 voucher LÔ-005 cho 2 đơn test có chủ đích (`UsedCount` 8 → 10, không hoàn theo thiết kế).

**ISS-06 (FE):** xác nhận lại nhánh thiếu `e4b6c26` (khóa nút bán khi thao tác QR đang chạy) và `aaad1de`. Luồng tiền mặt P5 không bị ảnh hưởng (PASS ở trên); luồng QR P6 (VietQR/VNPay) không kiểm được trên testapiv3 (BLOCKED). Đây là thiếu commit ở FE, **không phải lỗi BE đã deploy**.

---

## 8. Lỗi / rủi ro phát hiện

Không có lỗi nào trong code U22 BE/FE. Các mục dưới gồm 1 lỗi FE có sẵn, 1 việc Git và các rủi ro môi trường. Lỗi của giai đoạn báo cáo (ISS-R01…R13, gồm 2 P1 bảo mật và 1 P2 báo cáo U22, đều có sẵn) ở **mục 13.9**.

| ID | Loại | Mức | Mô tả và bằng chứng | Đề xuất |
|---|---|---|---|---|
| **ISS-T01** | Môi trường / bảo mật (không phải U22) | **P1** (chờ DevOps xác minh production) | testapiv3 chấp nhận JWT ký bằng `JWT_SECRET` trong `.local.env` (CFG-AUTH-04: token `user_id 987654321` → GET 200). So sánh khóa (không in giá trị): `JWT_SECRET` và `JWT_REFRESH_SECRET` của `.local.env` **SAME** với `.local.prod.env`. Nếu container production dùng cùng giá trị, ai có file env DEV đều ký được token admin production | Xoay secret, tách secret theo môi trường; không để secret production trong file dùng cho DEV. Phiên này chỉ dùng token tự ký cho staff không tồn tại để thử 403 trên testapiv3 |
| **ISS-T02** | FE, có sẵn (`PermissionGuard`) | P3 | FE-26 tái hiện 2/2 lần: điều hướng route có guard trước khi `useStaffPermissions` trả về → `can()` false → `Navigate` tới `/403`. Bấm "Thử lại" thì vào được. Dễ gặp hơn với độ trễ thật của testapiv3 (deep link, mở nhanh menu sau đăng nhập) | `PermissionGuard` hiện trạng thái đang tải (Spin) cho tới khi quyền đã nạp (thêm cờ `loaded` vào `permission.store`) |
| **ISS-06** | FE, nhánh | P2 | Nhánh thiếu `e4b6c26`, `aaad1de` (cùng `b924ce2`, `8ded4ec`) của `origin/main` | Ghép `origin/main` (không tự làm trong phiên này), chạy lại P6 L1 + spec U22 + Vitest |
| **ISS-T04** | Môi trường / dữ liệu | P2 | DB DEV sao từ production giữa tháng 7/2026: `Order.Id` và ID khách CRM của DEV **chồng lấn** dải ID production. Hủy đơn luôn gọi Mediasoft `Order/refund {orderId}`. Hiện an toàn vì testapiv3 → tenant Mediasoft DEV (275 bản ghi, chỉ dữ liệu DEV). Nếu một tích hợp dùng chung với production theo ID NCC (VietQR/VNPay đang dùng credential production), dữ liệu khách thật có thể bị chạm | Đặt `MEDIASOFT_API_URL`/`MEDIASOFT_API_KEY` tường minh cho từng môi trường (đưa key ra khỏi `config.service.ts`); cân nhắc nâng seed identity trên DEV (vd. `Order` từ 90.000.000) để không trùng production; credential cổng thanh toán sandbox cho DEV |
| ISS-T03 | Môi trường | P3 | Cloudflare chặn **429 "Access denied"** khi một IP gửi loạt request nhanh (~13 req/s, lúc dọn năm QA). Tự hết sau vài phút | Công cụ QA phải giới hạn tốc độ (đã chuyển sang tuần tự); cân nhắc whitelist IP QA |
| ISS-T05 | Dữ liệu DEV | P3 | Năm **2028** có 11 ngày lễ (thiếu 6 ngày NCC); năm **2029** toàn bộ 365 ngày là Ngày thường, 0 ngày lễ (tạo bằng luồng cũ lúc 16:50 ngày 09/11, không phải dữ liệu QA). Suất chiếu các năm này sẽ áp U22 vào ngày lễ / tính T6–CN như ngày thường | Admin dùng "Thiết lập phân loại ngày" cho 2028/2029 (QA không sửa năm vận hành theo yêu cầu) |
| ISS-T06 | Tích hợp / dữ liệu Mediasoft DEV | P3 | 20/20 thẻ U22 thật (và thẻ test) có hạng **MEMBER** trên Mediasoft DEV (`tier-info`), 1 thẻ chưa tồn tại (HTTP 400), trong khi CRM NCC ghi "U22 Member". **Giá U22 không bị ảnh hưởng** vì BE xét theo `CRM_Customer.CardLevelName`; nhưng dialog thẻ VIP trên POS hiển thị huy hiệu hạng từ Mediasoft nên sẽ hiện "MEMBER". Thẻ chưa có trên Mediasoft sẽ được BE tự `Customer/create` khi quẹt | Đồng bộ hạng U22 CRM ↔ Mediasoft (ngoài phạm vi V6.2) |
| ISS-T07 | Dữ liệu CRM / FE–BE lệch điều kiện | P3 | 10.886 thẻ "U22 Member" trên DEV; trong 10.885 thẻ có `CurrentCardId = 12`: 7.228 dưới 22 tuổi, 3.642 đã quá 22 (quẹt thẻ sẽ bị hạ thành Member, backlog R3), ngày sinh tới 2038. Thẻ `2228872167` là "U22 Member" nhưng `CurrentCardId = 11`: BE coi là U22, còn FE chỉ gọi `validate-voucher` khi `currentCardId === 12` (`VipCardDialog.tsx:514`) nên khóa U22. Thẻ `2200034931` là "Member" nhưng `CurrentCardId = 12` | Làm sạch dữ liệu; thống nhất một điều kiện U22 giữa FE và BE |
| ENV-06 | BE, có sẵn | P3 | `/api/reports/*` không yêu cầu đăng nhập (RPT-04) | Ngoài phạm vi U22 |
| OBS-01 | Quan sát | — | Không xác minh được SHA deploy từ API | `/health` trả SHA/tag image |
| OBS-02 | Quan sát | — | Lỗi DTO trả **422** (không phải 400): `expectedU22Price` âm, `weekendDays` > 6, tên ngày lễ rỗng/dài. FE hiển thị thông điệp chung | Chấp nhận (giống local) |

---

## 9. Đối chiếu BE local và testapiv3

| Hạng mục | BE local (báo cáo QA cũ, phụ lục B–E) | testapiv3 (phiên này) | Khác biệt / nguyên nhân |
|---|---|---|---|
| Giá U22 7 ngày, hiệu lực ngay | PASS | PASS (CFG-PUT-01, CFG-WD-*) | Không |
| Version conflict 409, 2 Admin | PASS | PASS (CFG-409-*, CFG-CONC-01 3/3, FE-09/10) | Không |
| Validate giá | PASS | PASS (17 ca) | Không |
| Phân quyền 403 | PASS (JWT local tự ký) | PASS (cùng cách: token tự ký với secret `.local.env`) | QA cũ cho rằng testapiv3 dùng UMS/Keycloak (B-06 BLOCKED). Thực tế testapiv3 dùng JWT local: **môi trường/cấu hình**, đồng thời lộ ISS-T01 |
| AuditLog | PASS | PASS (U22 15 dòng = 15 lần PUT; DateInYear 10 dòng) | Không |
| `expectedU22Price` 400/409, `orderDiscount` client | PASS | PASS (POS-CR-01…07, POS-CHG-02) | Không |
| 2D/3D | PASS | PASS (POS-PV-09/10, POS-CR-08, FE-21) | Không |
| Ngày lễ | PASS | PASS (POS-PV-06…08, POS-CR-09, FE-22) | Dữ liệu DEV khác: 2026 nay có 17 ngày lễ (local lúc test: 11) |
| `U22_SHOW_DATE_NOT_CONFIGURED` | Chỉ unit (N-04) | **PASS thật** (POS-PV-16, suất 31/12/2015) | Bổ sung |
| Danh sách ngày / Khởi tạo năm / năm thiếu ngày | PASS | PASS (DT-*, FE-13…17) | Không |
| Populate / initialize đồng thời | PASS (201 + 409) | PASS | Không |
| POS UI preview / 409 / bán / in / hủy | PASS | PASS (FE-18/19, SALE-*) | Trên testapiv3 có Mediasoft DEV thật (local bị blocker 503) |
| Voucher giấy P5/P6 | MSSQL 81/81, quote DEV | Quote PASS; **bán + hủy thật** tiền mặt PASS | Bổ sung; QR vẫn BLOCKED |
| Báo cáo | PASS | PASS (RPT-01: đơn U22 65.000 nằm ở cột 65.000; SALE-07, PVS-RPT*) | Không |
| Mediasoft create/cancel | BLOCKED | **PASS** trên tenant DEV (SALE-05/09, PVS-MS) | Môi trường đã xác minh |
| Vitest FE | 255/255 + Actions 86/86 | 41/42 file PASS + Actions 86/86; `orders.api.test.ts` 3 test fail | 3 fail có sẵn từ baseline `696928e`, không liên quan U22 |
| Thẻ U22 thật | Chỉ thẻ test `2229055236` | **20 thẻ U22 thật** dưới 22 tuổi: preview đúng 55.000 / 70.000 (REAL-*) | Bổ sung; thẻ quá 22 tuổi không chạy (ghi CRM) |
| Tốc độ / hạ tầng | Không giới hạn | Cloudflare 429 khi chạy loạt nhanh (ISS-T03); độ trễ thật làm lộ ISS-T02 | Môi trường |

Không có hành vi nào khác nhau do source code.

---

## 10. Trạng thái dữ liệu DEV sau test

Snapshot trước test: `snap-00-before.json` (10:48). Sau test: `snap-99-after.json`. Bảng dưới là trạng thái sau phần QA tích hợp (12:10). **Trạng thái cuối cùng, sau khi tạo bộ dữ liệu QA giữ lại (24 đơn, 3 tài khoản, 3 thẻ U22 QA, lô LÔ-029, 2 suất fixture bật lại), xem mục 13.10** (`snap-10-dataset-before.json` → `snap-19-dataset-after.json`).

| Mục | Trước test (10:48) | Sau test (12:10) | Ghi chú |
|---|---|---|---|
| `U22PriceConfig` | 55.000×4 / 70.000×3, Version 188, `admin` | **55.000×4 / 70.000×3**, Version 203, `admin` | Giữ nguyên giá theo snapshot; +15 version = 15 lần PUT thành công (đều đã khôi phục) |
| `DateInYear` 2015–2030 (16 năm vận hành) | Checksum theo năm | **Giống hệt** (0 năm thay đổi) | Không sửa năm vận hành |
| Năm QA 2061, 2062, 2063, 2064, 2067 | 0 dòng | **0 dòng** | Tạo trong test (1.826 dòng), kiểm 0 suất chiếu và không có FK rồi xóa qua `DELETE /api/pos/date-in-year/:date` |
| Đơn hàng | Max `Order.Id` 10206651 | 10206654 | 3 đơn QA, đều **đã hủy (60)**, `HasManualInvoice = 1`, `PosShortName = QAU22T3`: 10206652 (U22 55.000), 10206653 (vé thường + voucher giấy 85.000), 10206654 (U22 + voucher giấy 55.000). Không xóa dòng đơn (dữ liệu giao dịch). Không có đơn nào khác phát sinh trong khung test |
| Hóa đơn điện tử | — | 0 dòng `Invoice` / `ETicketScheduleJob` cho đơn QA | |
| `OrderSyncQueue` | — | 0 | |
| Voucher giấy | LÔ-005 `UsedCount` 8 | **10** | 2 voucher dùng có chủ đích cho 10206653/10206654; theo quy tắc P5, hủy đơn không hoàn voucher. Header + usage của 2 đơn ở trạng thái 30 (đã đảo). Các lô khác không đổi |
| `StaffAuditLog` | Max Id 9561 | Max Id 9586 (+25) | 15 `U22PriceConfig UPDATE`, 6 `DateInYear CREATE` (khởi tạo năm QA), 4 `DateInYear UPDATE` (ngày lễ năm QA). Giữ nguyên (dữ liệu audit) |
| CRM NCC (`CinemaCrmDev`) | — | Không ghi | 20 thẻ U22 thật chỉ preview, kiểm lại `CardLevelName`/`CurrentCardId` không đổi |
| Mediasoft DEV | Thẻ test 0 điểm | **0 điểm**, chi tiêu năm 0 | Mỗi đơn có thẻ: +1.100 khi bán, −1.100 khi hủy (10206652, 10206654). Đơn vãng lai 10206653 không đồng bộ |
| Giữ ghế (Redis/socket) | — | Đã nhả | Ghế chọn ở POS đều được bỏ chọn hoặc đã bán rồi hủy |
| Tiến trình / cấu hình máy | — | Không còn Electron/Node của QA chạy; `%APPDATA%\ncc-system\config.json` không đổi (dùng profile tạm) | |


---

## 11. Test cần chạy thêm

| # | Việc | Điều kiện |
|---|---|---|
| 1 | Ghép `origin/main` vào nhánh FE, chạy lại P6 L1 Electron (`paper-voucher-p6-qr.spec.ts`), spec `u22-pricing.spec.ts`, Vitest đầy đủ | ISS-06; môi trường local pvtest hợp lệ (guard `@@SERVERNAME`) |
| 2 | VietQR / VNPay (U22, U22 + voucher giấy), hoàn tiền qua cổng | Credential sandbox, hoặc NCC duyệt giao dịch số tiền nhỏ và callback về testapiv3 |
| 3 | Hóa đơn điện tử cho đơn U22 / voucher giấy | Xác minh `ETICKET_URL` của container testapiv3 là sandbox |
| 4 | Thẻ U22 quá 22 tuổi (`converted_to_member`); bán/hủy bằng một thẻ U22 thật qua POS | Thẻ test riêng do QA tạo, hoặc người dùng chỉ định thẻ thật được phép ghi CRM DEV + Mediasoft DEV |
| 5 | 503 thật | DB/instance riêng hoặc khung giờ không ai dùng DEV |
| 6 | Bán ở giá mới sau khi Admin đổi giá (đơn thật), đơn nhiều vé, đổi ghế/đổi suất đơn U22 | Cho phép thêm đơn test trên DEV |
| 7 | POS **bản cũ** (không gửi `expectedU22Price`) với BE mới: đơn U22 phải bị 400 `U22_PRICE_CONFIRMATION_REQUIRED` | Có bản build POS cũ; quan trọng vì máy POS khác (M11/M15) đang trỏ testapiv3 |
| 8 | Responsive ngoài 1366×768 | — |
| 9 | Sửa dữ liệu 2028/2029 (ISS-T05) rồi chạy lại preview U22 cho các ngày lễ đó | Admin NCC |

---

## 12. READY / NOT READY đưa FE vào develop

**NOT READY: chỉ còn điều kiện quy trình, không cần sửa code U22.**

Điều kiện trước khi merge FE vào develop:
1. Ghép `origin/main` vào `feat/u22-dynamic-pricing` (ISS-06; ghép thử trước đây không xung đột), build lại, chạy lại P6 L1 Electron + `u22-pricing.spec.ts` + Vitest → đạt.
2. Review PR FE.
3. Phát hành bản POS mới sớm cho các máy đang trỏ testapiv3: BE develop đã bắt buộc `expectedU22Price`, nên POS cũ bán U22 sẽ bị 400 (đơn thường không ảnh hưởng).
4. Không chặn merge nhưng cần giao việc: ISS-T01 (DevOps xác minh và xoay `JWT_SECRET`), ISS-T04 (cấu hình Mediasoft và cổng thanh toán tường minh cho từng môi trường), ISS-T05 (Admin phân loại 2028/2029), ISS-T02 (sửa `PermissionGuard`, P3).
5. BE, độc lập với FE, nên làm sớm: ISS-R01 và ISS-R02 (P1 bảo mật: bật xác thực `/api/reports/*` và API internal khách CRM; bỏ tên DB CRM production viết cứng). Trước khi phát hành U22 lên production: ISS-R03 (báo cáo giao dịch thẻ U22 lọc theo `VoucherCode`, P2). *Cập nhật 10/11 14:30:* ISS-R03 và phần `u22-usage` của ISS-R01 đã sửa ở BE local, sẵn sàng tạo PR BE, chưa deploy (mục 13.12). Còn ISS-R14 (các endpoint báo cáo khác) và ISS-R02.
6. Bộ dữ liệu QA (mục 13.3) được **giữ lại** để kiểm tra trực tiếp Lịch sử bán vé và Báo cáo doanh thu; khóa 3 tài khoản `QA_U22_0x` và lô LÔ-029 khi không còn dùng.

---

## 13. Revenue & Reporting QA (bổ sung 10/11/2026, 11:40–13:40)

Hai đợt: (a) đối chiếu API báo cáo với SQL độc lập trên dữ liệu có sẵn của `CinemaTicketDev`; (b) theo quyền người dùng cấp sau đó, tạo một **bộ dữ liệu QA giữ lại trên DEV** bằng luồng nghiệp vụ thật rồi đối chiếu báo cáo, Lịch sử bán vé và màn Electron với giá trị kỳ vọng tính từ chính các đơn đã bán. Không sửa code, không sửa trực tiếp tiền hay trạng thái đơn trong DB, không gọi cổng thanh toán.

**Tổng giai đoạn này: 182 phép kiểm, 171 PASS (gồm 10 PASS\*), 11 FAIL, 0 BLOCKED.** 11 FAIL đều là **lỗi có sẵn**, không phải regression do U22 V6.2 hay FE nhánh U22 (chi tiết 13.9). Các mục BLOCKED của mục 4 (VietQR, VNPay, hóa đơn điện tử, hoàn tiền qua cổng, SMS) vẫn giữ nguyên.

### 13.1. Định nghĩa chỉ tiêu (theo SQL backend và nghiệp vụ)

| Trường | Ý nghĩa thực tế (đã đối chiếu dữ liệu) |
|---|---|
| `OrderItem.OriginUnitPriceInclTax` | Giá ghế theo cấu hình suất (`PlanScreenings.PriceOfPositionX` theo vị trí ghế) |
| `OrderItem.UnitPriceInclTax` | Giá bán một vé sau ưu đãi (U22: giá U22 của ngày; vé thường: = giá gốc) |
| `OrderItem.PriceInclTax` | `UnitPriceInclTax × Quantity` — **đã là giá sau giảm** cho mọi loại giảm (06/2026: 4.275/4.277 dòng giảm nội bộ, 1.466/1.466 dòng U22) |
| `OrderItem.DiscountAmountInclTax` / `Order.OrderDiscount` | Phần giảm (U22: giá gốc − giá U22) |
| `Order.OrderTotal` | Giá trị đơn sau ưu đãi, **trước voucher giấy** (voucher giấy là phương tiện thanh toán, không giảm `OrderTotal`) |
| `PaperVoucherRedemption.VoucherApplied` | Phần đơn được trả bằng voucher giấy = min(OrderTotal, mệnh giá) |
| `RemainingPayable` / `CollectedAmount` | Phần khách phải trả thêm / số tiền thực thu (tiền mặt: bằng nhau) |
| Báo cáo `totalSale` | Σ giá gốc × SL (giá trước ưu đãi) |
| Báo cáo `actualSale` = "Tổng doanh thu sau KM" | Σ `PriceInclTax` = Σ `OrderTotal`: **doanh thu vé sau U22, trước voucher giấy** |
| "Giảm giá" / "Khuyến mại" | Giảm nội bộ (gồm U22) / khuyến mãi CRM |
| "Tổng doanh thu" (FE) | `actualSale + Khuyến mại CRM` (không cộng "Giảm giá") |
| `paperVoucherApplied` | Σ `VoucherApplied` của header APPLIED (Status 10) của đơn hoàn tất; dùng để trừ khỏi cột QR và "Thực nộp" |
| "Thực nộp" (FE) | `actualSale − VietQR − VNPayQR − paperVoucherApplied` = **tiền mặt khách thực trả** |
| Đơn được tính | Chỉ `OrderStatusId = 30`, `Deleted = 0`, không mời/hợp đồng (riêng cột Giấy mời/Hợp đồng); đơn hủy (60) và đơn hoàn tiền (rời trạng thái 30) bị loại |

### 13.2. Đối chiếu API báo cáo với SQL độc lập trên dữ liệu có sẵn

| Kiểm thử | Kết quả |
|---|---|
| `revenue-by-film` 6 cửa sổ: ngày chiếu 12–13/11, 07/11 (22 đơn voucher giấy), 27/03 (production-copy, U22 nhiều mức giá); ngày bán 09–10/11, 16/07 (đơn hủy một phần), 15/06 (3.016 vé / 1.398 đơn) — từng suất × On/Off, vé, giá gốc, doanh thu, QR, giấy mời/hợp đồng, cơ cấu giá, số/tiền voucher | **0 lệch** ở cả 6 cửa sổ (RPT-W1…W6 + dòng tổng) |
| Bất biến: Σ báo cáo = Σ `OrderTotal`; mọi đơn `OrderTotal = Σ PriceInclTax`; "Thực nộp" = tiền mặt thực thu | PASS 12/12 (RPT-W*-INV1/INV2; W4 PASS\*: dữ liệu ghi `"Pos"`, collation không phân biệt hoa thường) |
| U22 theo giá đã lưu (55.000 / 65.000), giá lịch sử không đổi khi cấu hình đổi 16 lần (10206605 giữ 65.000), U22 quy tắc cũ 80/95/105.000 | PASS (RPT-U22-01…03) |
| Vé thường không bị ảnh hưởng (cột giá = giá gốc vé thường + giá bán vé giảm nội bộ + giá U22) | PASS\*; lệch duy nhất là 143 vé **0đ** bị bỏ khỏi cơ cấu giá (RPT-ZERO, FAIL có sẵn) |
| Đơn hủy (20 đơn ở 410027/410031) bị loại; hủy một phần (đơn hợp đồng 10205378: 19 ghế hủy không còn trong OrderItem, báo cáo "Hợp đồng" = 6 ghế còn lại); 23 đơn có `RefundStatusId` đều đã rời trạng thái 30 | PASS (RPT-CAN-01…03) |
| Voucher giấy 07/11 (22 header): OrderTotal = VoucherApplied + RemainingPayable, tiền mặt = RemainingPayable; báo cáo tính doanh thu một lần, voucher ở cột riêng; header Status 20/30 bị loại | PASS (RPT-PV-01…03) |
| Bộ lọc phim / nhân viên in vé / hãng (27/03); khoảng ngày đảo | PASS 4/4 |
| `toDate` chỉ có ngày (không giờ) ở chế độ ngày bán | PASS\*: trả 0 vé thay vì 6 (so `CreatedOnUtc <= '2026-11-09'`); FE luôn gửi cuối ngày nên UI không bị |
| "Doanh thu bán vé" tab Phim / tab Nhân viên (09–10/11 và 15/06) | PASS 4/4 các cột FE hiển thị. Cột "Doanh thu VietQR" ở tab Phim thực chất là **VietQR online** (PASS\*, ghi chú). Trường API `actualOffSale` (tab Nhân viên, FE không hiển thị) = `PriceInclTax − DiscountAmountInclTax` **trừ giảm giá hai lần**: 15/06 thấp hơn 5.139.000đ, trong đó U22 2.115.000đ (FAIL có sẵn) |
| `revenue-day-in-month` 10–16/06 | Số liệu = SQL (PASS); nhưng Σ cột giá 23.661 ≠ Tổng vé 20.890 vì hai điều kiện lọc khác nhau (FAIL có sẵn) |
| `u22-usage` (Báo cáo giao dịch mua vé thẻ U22) | **FAIL** — xem ISS-R01, ISS-R03 |

### 13.3. Bộ dữ liệu QA giữ lại trên DEV (Persistent DEV Dataset)

**Tài nguyên QA đã tạo bằng API/luồng nghiệp vụ hiện có** (không INSERT trực tiếp):

| Tài nguyên | Cách tạo | Trạng thái / đề xuất |
|---|---|---|
| Nhân viên `QA_U22_01`, `QA_U22_02`, `QA_U22_03` (Id 39193164–39193166) | `POST /api/pos/staff`, **chỉ vai trò 8 "Bộ phận bán vé"** (bán, in, xuất hóa đơn thủ công, hủy vé, 2 báo cáo doanh thu). Đăng nhập thật; không có quyền sửa user/role/giá/ngày lễ/cài đặt | Giữ để lịch sử đơn có người bán; khóa khi không dùng. Mật khẩu ngẫu nhiên trong `test-results/u22-testapiv3/qa-accounts.local.json` (git-ignore), không có trong báo cáo |
| Máy POS `QAP1` "QA POS U22 01 (testapiv3)", `QAP2` "QA POS U22 02 (testapiv3)" | Hệ thống không có bảng máy POS: máy là cấu hình cục bộ (Cài đặt → **Cấu hình máy POS**, `localStorage "pos-settings"`), gửi kèm mỗi đơn và lưu ở `OrderItem.PosName/PosShortName`. Admin đặt qua UI trên **2 profile Electron riêng** (2 máy) | Chỉ tồn tại trên máy QA; không đổi cấu hình máy vận hành |
| Thẻ U22 QA 01–03 (CRM DEV 29056316–29056318, email `qa.u22.card0X@qa-ncc.invalid`, sinh 2008) | `POST /api/web/v1/web-customers/Register` (BE cấp số thẻ) + `PUT /api/v1/internal/web-customers/:id` nâng `U22 Member` / `CurrentCardId 12` (đường tích hợp Mediasoft → NCC; `RegisterU22` web không nâng hạng). Dùng thêm thẻ test có sẵn "Test U22" `2229055236` | Giữ. Không dùng thẻ khách thật cho đơn bán; Mediasoft DEV tự tạo khách khi tra thẻ |
| Lô voucher giấy **LÔ-029** (Id 30, 10 × 30.000đ, hạn 31/12/2026) | `POST /api/pos/paper-vouchers/batches` | Đã dùng 4/10 (2 đơn giữ, 2 đơn hủy — hủy không hoàn voucher theo quy tắc P5). Không đụng lô vận hành |
| Suất 410028 (T4 11/11 22:30) và 410029 (T7 14/11 22:30), phim MA XƯỞNG HÒM-T16 | Fixture của phiên QA trước (đang `Deleted = 1`, 0 đơn), bật lại bằng `PATCH /api/pos/plan-screenings/:id {deleted:false}` | **Giữ bật** vì có đơn QA thành công; `IsOnlineSelling = 0` nên không bán online |
| Giá U22 Thứ 6 = 72.000 | `PUT u22-price-config` tạm 23 giây (05:19:11Z → 05:19:34Z) cho đơn O15 | Đã trả 55.000 / 70.000 (`v205`) |

**Danh sách 24 đơn** (bán xen kẽ qua 6 phiên: S1 QAP1/QA_U22_01 → S2 QAP2/QA_U22_02 → S3 QAP1/QA_U22_03 → S4 QAP2/QA_U22_01 → S5 QAP1/QA_U22_02 → S6 QAP2/QA_U22_03; O01 bán bù cuối cùng do lần đầu harness chưa chọn được ghế). Tất cả tiền mặt (`POS`), bật "Xuất hóa đơn" (`HasManualInvoice = 1`, không vào hàng đợi hóa đơn điện tử), in bằng máy in giả. Không có thông tin cá nhân khách trong bảng.

| Thứ tự | OrderId | Loại vé | Phim / suất | Ngày bán → ngày chiếu | Nhân viên bán | Máy POS | Ghế | Giá trước ưu đãi | Sau ưu đãi (OrderTotal) | Voucher giấy | Khách trả | Trạng thái | Hủy bởi | Đối chiếu DB/in/Mediasoft |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 (O02) | 10206655 | U22 | CONAN: Thiên thần sa ngã (LT) · 410027 · 20:00 | 10/11 12:12 → 12/11 | QA_U22_01 | QAP1 | D11 | 85.000 | 55.000 | — | 55.000 | Đã hủy (60) | QA_U22_01@QAP1 | PASS |
| 2 (O03) | 10206656 | Vé thường | CONAN: Thiên thần sa ngã (LT) · 410027 · 20:00 | 10/11 12:13 → 12/11 | QA_U22_01 | QAP1 | A3,A4 | 160.000 | 160.000 | — | 160.000 | **Thành công (30)** | — | PASS |
| 3 (O04) | 10206657 | Thường + voucher giấy | SHREK 5 · 410031 · 10:00 | 10/11 12:13 → 13/11 | QA_U22_01 | QAP1 | E16 | 80.000 | 80.000 | 30.000 | 50.000 | **Thành công (30)** | — | PASS |
| 4 (O05) | 10206658 | Vé thường | SHREK 5 · 410031 · 10:00 | 10/11 12:13 → 13/11 | QA_U22_01 | QAP1 | A12 | 70.000 | 70.000 | — | 70.000 | Đã hủy (60) | QA_U22_02@QAP2 | PASS |
| 5 (O06) | 10206659 | U22 | MA XƯỞNG HÒM-T16 · 410028 · 22:30 | 10/11 12:14 → 11/11 | QA_U22_02 | QAP2 | E18 | 75.000 | 55.000 | — | 55.000 | **Thành công (30)** | — | PASS |
| 6 (O07) | 10206660 | Vé thường | MA XƯỞNG HÒM-T16 · 410029 · 22:30 | 10/11 12:15 → 14/11 | QA_U22_02 | QAP2 | E14,E16,A14 | 280.000 | 280.000 | — | 280.000 | **Thành công (30)** | — | PASS |
| 7 (O08) | 10206661 | U22 | MA XƯỞNG HÒM-T16 · 410029 · 22:30 | 10/11 12:15 → 14/11 | QA_U22_02 | QAP2 | E20 | 95.000 | 70.000 | — | 70.000 | Đã hủy (60) | QA_U22_03@QAP1 | PASS |
| 8 (O09) | 10206662 | Vé thường | CONAN: Thiên thần sa ngã (LT) · 410027 · 20:00 | 10/11 12:15 → 12/11 | QA_U22_02 | QAP2 | L3 | 90.000 | 90.000 | — | 90.000 | **Thành công (30)** | — | PASS |
| 9 (O10) | 10206663 | U22 + voucher giấy | SHREK 5 · 410031 · 10:00 | 10/11 12:16 → 13/11 | QA_U22_02 | QAP2 | E20 | 80.000 | 70.000 | 30.000 | 40.000 | Đã hủy (60) | QA_U22_03@QAP1 | PASS |
| 10 (O11) | 10206664 | Vé thường | SHREK 5 · 410031 · 10:00 | 10/11 12:17 → 13/11 | QA_U22_03 | QAP1 | E22 | 80.000 | 80.000 | — | 80.000 | **Thành công (30)** | — | PASS |
| 11 (O12) | 10206665 | U22 | MA XƯỞNG HÒM-T16 · 410029 · 22:30 | 10/11 12:17 → 14/11 | QA_U22_03 | QAP1 | E22 | 95.000 | 70.000 | — | 70.000 | **Thành công (30)** | — | PASS |
| 12 (O13) | 10206666 | Vé thường | MA XƯỞNG HÒM-T16 · 410029 · 22:30 | 10/11 12:17 → 14/11 | QA_U22_03 | QAP1 | A16 | 90.000 | 90.000 | — | 90.000 | **Thành công (30)** | — | PASS |
| 13 (O14) | 10206667 | Vé thường | MA XƯỞNG HÒM-T16 · 410028 · 22:30 | 10/11 12:17 → 11/11 | QA_U22_03 | QAP1 | A10,A12 | 140.000 | 140.000 | — | 140.000 | Đã hủy (60) | QA_U22_02@QAP1 | PASS |
| 14 (O20) | 10206668 | U22 | CONAN: Thiên thần sa ngã (LT) · 410027 · 20:00 | 10/11 12:18 → 12/11 | QA_U22_03 | QAP1 | D12 | 85.000 | 55.000 | — | 55.000 | Đã hủy (60) | QA_U22_01@QAP2 | PASS |
| 15 (O15) | 10206669 | U22 | SHREK 5 · 410031 · 10:00 | 10/11 12:19 → 13/11 | QA_U22_01 | QAP2 | E24 | 80.000 | 72.000 | — | 72.000 | **Thành công (30)** | — | PASS |
| 16 (O16) | 10206670 | Vé thường | SHREK 5 · 410031 · 10:00 | 10/11 12:19 → 13/11 | QA_U22_01 | QAP2 | E23 | 80.000 | 80.000 | — | 80.000 | **Thành công (30)** | — | PASS |
| 17 (O17) | 10206671 | U22 + voucher giấy | CONAN: Thiên thần sa ngã (LT) · 410027 · 20:00 | 10/11 12:20 → 12/11 | QA_U22_01 | QAP2 | D9 | 85.000 | 55.000 | 30.000 | 25.000 | **Thành công (30)** | — | PASS |
| 18 (O18) | 10206672 | Thường + voucher giấy | MA XƯỞNG HÒM-T16 · 410028 · 22:30 | 10/11 12:20 → 11/11 | QA_U22_01 | QAP2 | E20 | 75.000 | 75.000 | 30.000 | 45.000 | Đã hủy (60) | QA_U22_02@QAP1 | PASS |
| 19 (O19) | 10206673 | Vé thường | CONAN: Thiên thần sa ngã (LT) · 410027 · 20:00 | 10/11 12:20 → 12/11 | QA_U22_01 | QAP2 | D10 | 85.000 | 85.000 | — | 85.000 | **Thành công (30)** | — | PASS |
| 20 (O21) | 10206674 | Vé thường | MA XƯỞNG HÒM-T16 · 410028 · 22:30 | 10/11 12:21 → 11/11 | QA_U22_02 | QAP1 | E22 | 75.000 | 75.000 | — | 75.000 | **Thành công (30)** | — | PASS |
| 21 (O22) | 10206675 | Vé thường | CONAN: Thiên thần sa ngã (LT) · 410027 · 20:00 | 10/11 12:21 → 12/11 | QA_U22_02 | QAP1 | A5 | 80.000 | 80.000 | — | 80.000 | **Thành công (30)** | — | PASS |
| 22 (O23) | 10206676 | Vé thường | MA XƯỞNG HÒM-T16 · 410029 · 22:30 | 10/11 12:21 → 14/11 | QA_U22_02 | QAP1 | E24 | 95.000 | 95.000 | — | 95.000 | Đã hủy (60) | QA_U22_03@QAP2 | PASS |
| 23 (O24) | 10206677 | Vé thường | SHREK 5 · 410031 · 10:00 | 10/11 12:22 → 13/11 | QA_U22_03 | QAP2 | A14,A16 | 140.000 | 140.000 | — | 140.000 | **Thành công (30)** | — | PASS |
| 24 (O01) | 10206678 | Vé thường | MA XƯỞNG HÒM-T16 · 410028 · 22:30 | 10/11 12:23 → 11/11 | QA_U22_01 | QAP1 | E14 | 75.000 | 75.000 | — | 75.000 | **Thành công (30)** | — | PASS |

Tổng: **24 đơn tạo thành công (HTTP 201), 16 giữ thành công (1.567.000đ), 8 đã hủy (630.000đ)**; 3 phim (MA XƯỞNG HÒM 10 đơn, SHREK 5 7, CONAN 7); 3 nhân viên (10/8/6 đơn); 2 máy (QAP1 13 đơn: 8 giữ / 5 hủy; QAP2 11 đơn: 8 / 3); 4 suất, 4 ngày chiếu (11–14/11), ngày bán 10/11; 14 vé thường (11 giữ / 3 hủy), 6 U22 (3/3), 2 thường + voucher (1/1), 2 U22 + voucher (1/1); đơn 2 vé, 3 vé (V+V+T); ghế V/T/D. Mỗi máy có đơn thành công và đơn hủy; có hủy chéo (đơn của máy/nhân viên khác).

### 13.4. Legacy POS Regression (vé thường)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Bán vé thường không U22, không voucher: 14 đơn | PASS 14/14 | DS-O01, O03, O05, O07, O09, O11, O13, O14, O16, O19, O21–O24 |
| Giá theo cấu hình hiện hữu (vị trí ghế → `PriceOfPosition`), `UnitPrice = OriginUnitPrice`, `OrderDiscount = 0`, `VoucherCode = null` | PASS | 14–15 kiểm tra/đơn (DS-*) |
| Request không gửi `expectedU22Price`/`voucherCode` vẫn 201 | PASS | `sent.expectedU22Price = null` ở mọi đơn thường |
| 1 vé / nhiều vé (2, 3) / loại ghế V 75–95k, T 70–90k, D 90k | PASS | O03, O07, O14, O24; O09 (D) |
| Tiền mặt; "Tiền vừa bán" trên POS = `OrderTotal` | PASS | 24 ảnh `shots/dataset/O*-sold.png` |
| In vé: số vé = số ghế; mỗi vé đúng ghế, giá, phim, giờ, phòng | PASS 24/24 | `dataset-registry.json` → prints |
| Hủy đơn thường (luồng hủy POS): dialog "Hủy toàn bộ đơn vé? Đơn #… gồm N ghế", trạng thái 60 | PASS 3/3 | X-O05, X-O14 (2 ghế), X-O23 |
| Không tạo `U22Ticket` ngoài ý muốn; không áp giá U22 cho đơn thường | PASS | 0/14 đơn thường có `VoucherCode`, 0 có `OrderDiscount` |
| Tính độc lập U22: cùng suất 410031 O11 thường 80.000 → O15 U22 72.000 (cấu hình tạm) → O16 thường 80.000; 410029 O12 U22 70.000 → O13 thường 90.000; cùng ghế V 410028 = 75.000 ở 3 NV/2 máy | PASS 3/3 | LEG-INDEP-01…03 |
| Đơn trước V6.2 đọc đúng qua `GET /api/pos/order/:id` (U22 quy tắc cũ 80.000 tháng 3; vé thường 2 ghế tháng 6; U22 65.000 ngày 09/11) | PASS 3/3 | LEG-OLD-* |
| Lịch sử bán vé (API + Electron): 27 đơn hôm nay, đúng Nhân viên bán, Máy bán, phim, số vé, trạng thái; tìm theo Mã đơn; mở "Xem chi tiết" | PASS | RC-HISTORY-API, UI-HIST-01/02, ảnh `01-order-history-offline-10-11.png` |
| Bộ lọc Lịch sử bán vé | Có: mã đơn, mã vé, SĐT, email, thời gian mua, ngày chiếu, trạng thái, online/offline. **Không có lọc theo nhân viên/máy** (chỉ là cột) | — |
| Audit khi bật lại suất | FAIL có sẵn (P3): ghi Action **DELETE**, `NewValues null` (LEG-AUDIT-01) | `StaffAuditLog` 9590/9591 |

Luồng giảm giá nội bộ/CRM có sẵn không được tạo hay áp mới (không có mã an toàn dành cho QA); hồi quy của chúng được kiểm gián tiếp qua đối chiếu báo cáo trên dữ liệu production-copy (13.2).

### 13.5. U22 Regression

| Hạng mục | Kết quả |
|---|---|
| U22 ngày thường 55.000 (O06 410028 T4; O20 hủy, O02 hủy 410027 T5) | PASS |
| U22 cuối tuần 70.000 (O12 410029 T7; O08 hủy; O10 + voucher hủy 410031 T6) | PASS |
| U22 giá tùy chỉnh 72.000 (O15, Thứ 6 đặt tạm) và đơn thường cùng lúc giữ 80.000 | PASS |
| `expectedU22Price` = giá preview; `OrderDiscount` = giá gốc − giá U22; đơn lưu đúng nhân viên/máy | PASS 8/8 |
| 1 lượt/ngày/thẻ: mỗi thẻ hủy trước rồi mới bán đơn giữ (thẻ 01: O02 → O06; thẻ 02: O08 → O12; thẻ 03: O10 → O15; Test U22: O20 → O17) | PASS |
| Mediasoft DEV: đơn giữ +điểm, đơn hủy + rồi − (thẻ test về 0) | PASS 8/8 |
| Báo cáo giao dịch mua vé thẻ U22 (`u22-usage`, API + Electron) | **FAIL**: 0 dòng cho 4 đơn U22 thành công (kỳ vọng 4 đơn, 252.000đ) — RC-U22USAGE, UI-U22-01 (ISS-R03) |

### 13.6. Voucher P5/P6 Regression

| Hạng mục | Kết quả |
|---|---|
| Thường + voucher (O04 giữ: 80.000 − 30.000 = khách trả 50.000; O18 hủy) | PASS: header APPLIED → 30 khi hủy, usage 10 → 30, `CollectedAmount` = `RemainingPayable` |
| U22 + voucher (O17 giữ: 55.000 − 30.000 = 25.000; O10 hủy) | PASS: quote lại kèm `U22Ticket` + `expectedU22Price`, tạo đơn 201 |
| `UsedCount` LÔ-029 = 4; lô vận hành không đổi | PASS (DS-PVBATCH) |
| Báo cáo tách 3 giá trị: doanh thu sau ưu đãi (80.000 / 55.000), voucher áp dụng 30.000, Thực nộp = khách trả (50.000 / 25.000) — không trừ voucher hai lần | PASS (RC-PV-O04, RC-PV-O17) |
| Chi tiết đơn ở Lịch sử bán vé tách voucher 30.000 và khách trả 50.000 | PASS (UI-HIST-02, ảnh `03-order-10206657-detail.png`) |
| Cột danh sách "Tiền thanh toán" của đơn voucher | **FAIL có sẵn (P3)**: hiển thị 80.000 (= `OrderTotal`) trong khi khách trả 50.000 (RC-HISTORY-PV, ISS-R07) |
| QR (VietQR/VNPay) cho đơn voucher | BLOCKED (credential production) |

### 13.7. Revenue & Reporting Reconciliation (bộ dữ liệu)

Kỳ vọng lấy từ sổ đăng ký các đơn đã bán (độc lập với SQL báo cáo); đơn hủy phải bị loại.

| Chiều đối chiếu | Kỳ vọng | Thực tế API | Kết quả |
|---|---|---|---|
| Ngày bán 10/11 — tổng | 16 đơn, 20 vé, giá gốc 1.650.000, doanh thu 1.567.000; loại trừ 8 đơn hủy (630.000) | 20 vé, 1.567.000, 1.650.000 | PASS |
| Suất 410027 (CONAN, T5) | 6 vé; doanh thu 470.000; giá gốc 500.000; Giảm giá 30.000; voucher 1 / 30.000; Thực nộp 440.000; cơ cấu 55.000×1, 80.000×3, 85.000×1, 90.000×1 | khớp | PASS |
| Suất 410028 (MA XƯỞNG HÒM, T4) | 3 vé; 205.000; 225.000; giảm 20.000; Thực nộp 205.000; 55.000×1, 75.000×2 | khớp | PASS |
| Suất 410029 (MA XƯỞNG HÒM, T7) | 5 vé; 440.000; 465.000; giảm 25.000; 70.000×1, 90.000×2, 95.000×2 | khớp | PASS |
| Suất 410031 (SHREK 5, T6) | 6 vé; 452.000; 460.000; giảm 8.000; voucher 1 / 30.000; Thực nộp 422.000; 70.000×2, 72.000×1, 80.000×3 | khớp | PASS |
| Theo phim (lọc `filmId`) | CONAN 6 vé/470.000/thực nộp 440.000; SHREK 6/452.000/422.000; MA XƯỞNG HÒM 8/645.000/645.000 | khớp | PASS 3/3 |
| Theo nhân viên (lọc `userId`) | QA_U22_01: 8 vé / 607.000 / voucher 60.000; QA_U22_02: 7 / 580.000; QA_U22_03: 5 / 380.000 | khớp | PASS 3/3 |
| Theo ngày chiếu 11–14/11 (bộ dữ liệu + 4 đơn cũ của 09/11) | 410027: 10 vé / 780.000; 410028: 3 / 205.000; 410029: 5 / 440.000; 410031: 7 / 517.000 | khớp | PASS 4/4 |
| "Doanh thu bán vé" tab Nhân viên / tab Phim | Offline vé + "Doanh thu Offline" như trên; QR = 0; online = 0 | khớp | PASS 6/6 |
| Theo máy POS | Không có báo cáo nào theo máy; đối chiếu qua Lịch sử bán vé: QAP1 13 đơn (8 giữ / 5 hủy), QAP2 11 đơn (8 / 3), đúng từng đơn | khớp | PASS (RC-HISTORY-API) |
| Theo trạng thái | Lịch sử bán vé: 16 "Hoàn thành", 8 "Thất bại" (đơn hủy POS) | khớp; nhãn "Thất bại" cho đơn hủy (ISS-R08) | PASS |
| `revenue-day-in-month` ngày in 10/11 | Tổng vé 0 (vé chiếu ngày khác), cột giá 20 vé | 0 / 20 | PASS\* (minh họa ISS-R06) |
| `u22-usage` ngày in 10/11 | 4 đơn U22, 252.000 | **0 dòng** | FAIL (ISS-R03) |

**Electron (admin, 1600×900):** Lịch sử bán vé tab Vé offline (27 bản ghi, cột Nhân viên bán/Máy bán/phim/trạng thái), chi tiết đơn voucher; "Báo cáo doanh thu theo ngày bán" mặc định hôm nay (SHREK 6/452.000/Giảm giá 8.000/voucher 1; MA XƯỞNG HÒM 8/645.000/45.000; CONAN 6/470.000/30.000/1) — ở chế độ mặc định màn hình **không có** cột Thực nộp/QR/cột giá (thiết kế `getRevenueColumnMode`); lọc Nhân viên "QA U22 01" hiện thêm VNPayQR/VietQR/Thực nộp: SHREK 202.000, MA XƯỞNG HÒM 75.000, CONAN 270.000 = 547.000; "Doanh thu bán vé" tab Nhân viên đúng 3 NV QA; tab U22 rỗng. Ảnh: `test-results/u22-testapiv3/shots/reports-ui/` và `shots/dataset/`.

### 13.8. Không có tình trạng "bán thành công nhưng báo cáo không ghi nhận"

Cả 16 đơn thành công đều có trong `revenue-by-film` (cả 2 loại ngày), "Doanh thu bán vé", Lịch sử bán vé; 8 đơn hủy không có trong báo cáo doanh thu và vẫn tra được trong Lịch sử bán vé. Ngoại lệ duy nhất là báo cáo U22 (ISS-R03).

### 13.9. Lỗi phát hiện ở giai đoạn này (đều có sẵn, không do U22 V6.2 hay FE nhánh U22)

| ID | Loại | Mức | Mô tả, bằng chứng | Đề xuất |
|---|---|---|---|---|
| **ISS-R01** | BE, bảo mật / dữ liệu cá nhân | **P1** | `/api/reports/*` không yêu cầu đăng nhập (`@AuthStaff()` bị comment, `report.controller.ts:38`) **và** `u22-usage` join cứng `CinemaCrm2023.dbo.CRM_Customer` (DB CRM production, `u22.usage.query.ts:10`). Trên testapiv3, gọi không token trả 86 dòng **họ tên + số thẻ** khách lấy từ CRM production (RPT-U22USE-01/04; 52/87 khách không tồn tại trong CRM DEV). QA không lưu giá trị PII. **Trạng thái 10/11 14:30: phần `u22-usage` ĐÃ SỬA ở BE local** (nhánh `bug/develop/report-u22-usage`, chưa commit/deploy): bỏ hẳn join CRM, bật `@AuthStaff()` + quyền `staff_revenue_report.access` (401/403 đã kiểm) — mục 13.12. Các endpoint báo cáo khác vẫn công khai → ISS-R14 | Bật xác thực cho report controller; lấy tên DB CRM từ cấu hình (`SQL_SERVER_CRM_DATABASE`); DEV không dùng login `sa` trên instance có DB production |
| **ISS-R02** | BE, bảo mật | **P1** | `api/v1/internal/web-customers` (tạo/sửa/xóa khách CRM, nhận mọi trường kể cả hạng thẻ) có `@InternalAuth()` bị comment (`customer.intenal.controller.ts:14`) | Bật `InternalAuth`; giới hạn trường cho phép cập nhật |
| **ISS-R03** | BE, báo cáo U22 | **P2** | Báo cáo giao dịch thẻ U22 không phản ánh vé U22: lọc theo **hạng thẻ hiện tại** "U22 Member" thay vì `VoucherCode = 'U22Ticket'` (15/06: 86 vé so với 87 vé U22 thực bán); lọc theo `PrintedOnUtc` nhưng hiển thị `CreatedOnUtc`; đơn chưa in không vào; trên DEV trả 0 cho 4 đơn U22 QA (RC-U22USAGE, UI-U22-01). **Trạng thái 10/11 14:30: ĐÃ SỬA ở BE local, chưa deploy** — lọc `VoucherCode = 'U22Ticket'` + ngày mua `CreatedOnUtc`, mỗi đơn một dòng, tên/thẻ lấy từ `Order`; BE local + CinemaTicketDev: 4 dòng, 4 vé, 252.000đ, kịch bản A–H 22/22 PASS kể cả Electron (mục 13.12). testapiv3 vẫn chạy bản cũ nên RC-U22USAGE/UI-U22-01 trên testapiv3 vẫn FAIL tới khi deploy | Lọc theo `VoucherCode`, tiền theo `PriceInclTax`/`OrderTotal` (giá U22 thực bán), join CRM theo cấu hình; nên sửa trước khi phát hành U22 production |
| ISS-R04 | BE, API | P3 | Trường `revenueByEmployee[].actualOffSale` = `PriceInclTax − DiscountAmountInclTax` trừ giảm giá hai lần (bộ dữ liệu: QA_U22_01 569.000 thay vì 607.000; 15/06 thiếu 5.139.000đ). FE không hiển thị | Sửa thành Σ `PriceInclTax` hoặc bỏ trường |
| ISS-R05 | BE, báo cáo | P3 | Cơ cấu theo mức giá bỏ vé 0đ ⇒ Σ cột giá ≠ Tổng vé (27/03: 2.218 so với 2.361) | Thêm cột 0đ hoặc ghi chú |
| ISS-R06 | BE, báo cáo | P3 | `revenue-day-in-month`: Tổng vé chỉ đếm vé chiếu trong ngày in, cột giá đếm mọi vé in (23.661 so với 20.890; bộ dữ liệu: 0 so với 20) | Thống nhất điều kiện |
| ISS-R07 | FE | P3 | Lịch sử bán vé, cột "Tiền thanh toán" = `OrderTotal`; với đơn voucher giấy là 80.000 trong khi khách trả 50.000 (chi tiết đơn thì đúng) | Đổi nhãn "Giá trị đơn" hoặc thêm cột "Khách trả" / "Voucher giấy" |
| ISS-R08 | BE/FE | P3 | Đơn POS bị hủy hiển thị "Thất bại" (luồng hủy đặt `OrderStatus.FAIL = 60`), không phân biệt với thanh toán lỗi | Dùng trạng thái hủy riêng hoặc nhãn theo `CancelTicket` |
| ISS-R09 | FE, cần PO | P3 | "Tổng doanh thu" = Sau KM + Khuyến mại CRM, không cộng "Giảm giá" (gồm U22) ⇒ trên cùng dòng Tổng doanh thu − KM − Giảm giá ≠ Sau KM (SHREK: 452.000 − 0 − 8.000 ≠ 452.000) | PO định nghĩa "Tổng doanh thu" (giá gốc 460.000 hay sau giảm) |
| ISS-R10 | FE/BE | P3 | "Doanh thu bán vé" tab Phim: cột "Doanh thu VietQR" là VietQR **online** (`offSaleVietQr` lọc `IsOnline = 1`); VietQR tại quầy không có cột riêng | Đổi nhãn / tên trường |
| ISS-R11 | BE | P3 | Khôi phục suất (`deleted: false`) ghi audit Action DELETE, `NewValues null` | Ghi UPDATE/RESTORE |
| ISS-R12 | BE | P3 | `POST /api/pos/staff` trả object Sequelize thô (`dataValues.id = null`) | Trả DTO |
| ISS-R13 | Dữ liệu DEV | — | `CinemaCrmDev` thiếu nhiều khách có trong đơn của `CinemaTicketDev` (sao ở hai thời điểm khác nhau); 10.886 thẻ "U22 Member" có 3.642 thẻ quá 22 tuổi | Đồng bộ lại bản sao CRM DEV |
| **ISS-R14** (mới, 13.12) | BE, bảo mật / dữ liệu cá nhân | **P1** | Sau khi khóa `u22-usage`, 14 endpoint `/api/reports/*` còn lại vẫn không cần đăng nhập. Hai endpoint trả dữ liệu cá nhân khi gọi không token (BE local, 10/11, chỉ dữ liệu QA): `GET member-card-transactions` (`CustomerFullName`, `MemberCardCode`) và `POST discount-offline-usage` (`customerName`). Không sửa trong task này theo yêu cầu | Task riêng: bật `@AuthStaff()` + quyền theo màn hình cho toàn bộ report controller, kiểm tra FE gửi token ở mọi màn báo cáo |
| ISS-R15 (mới, 13.12) | Dữ liệu / BE | P3 | Họ và tên trên `Order` lưu không thống nhất thứ tự. So với `FullName` CRM DEV (492 đơn U22 tháng 6 có khách trong CRM DEV): 279 khớp Họ + Tên, 163 lưu đảo, 50 khác hẳn. Khách QA lưu `FirstName = "QA"`, `LastName = "U22 Card 01"` nên báo cáo U22 hiển thị "U22 Card 01 QA" | PO chọn: giữ quy ước Họ + Tên (`buildOrderCustomerName`), hoặc lưu thêm tên đầy đủ lên `Order` lúc bán (cần migration) |

### 13.10. Trạng thái dữ liệu DEV sau giai đoạn này

| Mục | Trạng thái |
|---|---|
| Đơn QA | 10206655–10206678: **16 giữ thành công (30), 8 đã hủy (60)** — **không xóa**. Ghế đã bán: 20 vé trên 410027/410028/410029/410031. Trước đó: 10206652–10206654 (đã hủy) |
| Nhân viên / thẻ / lô / suất QA | Như bảng 13.3 (giữ; đề xuất khóa tài khoản QA và khóa LÔ-029 khi không dùng) |
| `U22PriceConfig` | 55.000 / 70.000, Version 205 (2 lần đổi tạm cho O15) |
| `DateInYear` | Không đổi so với snapshot (16 năm, checksum) |
| `StaffAuditLog` | +8 dòng: 3 `Customer CREATE` (nhân viên), 1 `PaperVoucherBatch CREATE`, 2 `PlanScreenings` (bật lại suất), 2 `U22PriceConfig UPDATE` |
| Hóa đơn điện tử | 0 `Invoice` / `ETicketScheduleJob` cho 24 đơn |
| Mediasoft DEV | Điểm của 4 thẻ U22 QA theo đơn (giữ: +; hủy: + rồi −); khách QA được tạo trên Mediasoft DEV khi tra thẻ |
| Lô vận hành | `UsedCount` không đổi |

### 13.11. Kết luận giai đoạn báo cáo

1. **Dữ liệu mẫu đã đủ để test báo cáo chưa?** Đủ cho bán tại quầy bằng tiền mặt: 24 đơn (16/8), 3 phim, 3 nhân viên, 2 máy, 4 suất và ngày chiếu, ngày bán khác ngày chiếu, vé thường nhiều loại ghế và nhiều vé, U22 55k/70k/72k, U22 + voucher, thường + voucher. Chưa có: thanh toán QR (BLOCKED), đơn online, vé mời/hợp đồng, giảm giá nội bộ/CRM mới (không tạo theo yêu cầu) — các loại này đã được đối chiếu trên dữ liệu production-copy (13.2).
2. **Báo cáo doanh thu có đúng không?** Có, với `revenue-by-film` (ngày bán và ngày chiếu, mọi bộ lọc), "Doanh thu bán vé" (nhân viên/phim) và Lịch sử bán vé: 0 lệch trên bộ dữ liệu QA lẫn 6 cửa sổ dữ liệu thật (tới 3.016 vé/ngày); đơn hủy loại đúng, voucher không bị tính hai lần. **Sai:** báo cáo giao dịch thẻ U22 (ISS-R03, cùng rủi ro P1 ISS-R01) và một số chỉ tiêu phụ P3 (ISS-R04…R10).
3. **Chỉ tiêu `actual` và `CollectedAmount` có dùng đúng nghĩa không?** Có ở báo cáo chính: `actualSale` ("Tổng doanh thu sau KM") = Σ `OrderTotal` = doanh thu vé sau U22/giảm giá, **trước** voucher giấy — đúng nghĩa doanh thu vì voucher giấy là phương tiện thanh toán; voucher tách ở `paperVoucherApplied`; "Thực nộp" = Σ `CollectedAmount` tiền mặt = tiền khách thực trả. Không đúng nghĩa: nhãn "Tiền thanh toán" ở Lịch sử bán vé (= `OrderTotal`, ISS-R07), trường API `actualOffSale` của tab Nhân viên (trừ giảm giá hai lần, ISS-R04), "Tổng doanh thu" không cộng "Giảm giá" (ISS-R09, cần PO).
4. **Có lỗi cần sửa trước khi merge FE U22 vào develop không?** Không có lỗi FE nhánh U22 nào chặn merge (mọi luồng U22, POS, voucher, báo cáo trên FE đều đúng). Điều kiện vẫn là ISS-06 (ghép `origin/main`). Phía BE có hai lỗi bảo mật P1 có sẵn (ISS-R01, ISS-R02) cần sửa sớm, độc lập với FE; ISS-R03 nên sửa trước khi phát hành U22 lên production.

### 13.12. Sửa ISS-R03 và phần `u22-usage` của ISS-R01: Báo cáo giao dịch mua vé thẻ U22 (bổ sung 10/11/2026, 13:50–14:30)

Làm theo yêu cầu "Ưu tiên sửa ngay ISS-R01 / ISS-R03". Phạm vi thay đổi:
- **Có sửa source BE**, trên nhánh local `bug/develop/report-u22-usage` tạo từ `origin/develop` (`58afe71`). **Chưa commit, chưa push, chưa deploy.**
- Không sửa FE, không có migration, không ghi dữ liệu DEV (chỉ SELECT; bộ 24 đơn QA giữ nguyên).
- Mọi kết quả HTTP dưới đây chạy trên **BE local bản sửa** (`127.0.0.1:4013`, dựng bằng `scripts/dev/run-local.js`: cron tắt, API ngoài bị chặn) nối `CinemaTicketDev`. **testapiv3 vẫn chạy bản cũ**, nên kết quả này không tính là PASS trên testapiv3.

**Quyết định nghiệp vụ áp dụng:**
- Giao dịch U22 là đơn có `Order.VoucherCode = 'U22Ticket'`, đã hoàn thành (`OrderStatusId = 30`) và chưa xóa.
- Báo cáo lọc và hiển thị theo ngày mua (`CreatedOnUtc`).
- Không dựa vào hạng thẻ hiện tại của khách, không dựa vào `PrintedOnUtc`.

**Root cause**

| # | Nguyên nhân (code `origin/develop`) | Hậu quả |
|---|---|---|
| 1 | `u22.usage.query.ts:10` join cứng `CinemaCrm2023.dbo.CRM_Customer`. SQL thô chạy trên kết nối Ticket nên bỏ qua `SQL_SERVER_CRM_DATABASE=CinemaCrmDev` | testapiv3 đọc CRM production: trả 0 dòng cho khách QA (chỉ có trong CRM DEV) và lộ tên, số thẻ khách thật. Chỉ đổi tên DB sang `CinemaCrmDev` thì cùng SQL trả đúng 4 dòng, 252.000đ |
| 2 | Lọc `cc.CardLevelName = 'U22 Member'` theo hạng thẻ **hiện tại** | Mất giao dịch khi khách đã chuyển sang Member (BE tự chuyển khi quá 22 tuổi); đơn giá thường của chủ thẻ U22 lại bị tính |
| 3 | Lọc theo `PrintedOnUtc` nhưng hiển thị `CreatedOnUtc`; gom theo `FullName, CardCode, CreatedOnUtc` | Đơn chưa in không vào báo cáo; hai đơn cùng thẻ cùng thời điểm bị gộp làm một |
| 4 | Service truyền cứng `storeId: null` | Bộ lọc rạp không có tác dụng |
| 5 | `@AuthStaff()` của report controller bị comment | Ai cũng gọi được endpoint |

**File thay đổi (BE)**

| File | Thay đổi |
|---|---|
| `src/modules/report/enum/u22.usage.query.ts` | SQL mới (bên dưới) |
| `src/modules/report/report.service.ts` | `getU22UsageReport(query, user)`: kiểm quyền trước khi truy vấn; truyền `storeId`; tham số thiếu thì `null`; cộng tổng bằng `Number()` |
| `src/modules/report/report.controller.ts` | `@AuthStaff()` **chỉ trên** `POST u22-usage`, nhận user từ token; Swagger 201/401/403 |
| `src/modules/report/report.module.ts` | import `PermissionModule` |
| `src/modules/report/utils/report-permission.ts` (mới) | Quyền `staff_revenue_report` + action `access` (cùng quyền FE dùng để mở màn `/staff-revenue-report`); lỗi 403 `STAFF_PERMISSION_DENIED` |
| `src/modules/report/dtos/report.u22.usage.response.dto.ts` | Thêm `orderId`; sửa mô tả Swagger (`numOrders`/`totalOrders` là số vé, giữ tên cho FE) |
| `report.service.spec.ts`, `report.service.paper-voucher.spec.ts` | Thêm tham số `PermissionService` vào constructor |
| `enum/u22.usage.query.spec.ts`, `report.service.u22-usage.spec.ts`, `report.u22-usage.http.spec.ts` (mới) | 27 test |

**SQL cũ**

```sql
select cc.FullName as fullName, cc.CardCode as memberCardCode, o.CreatedOnUtc as paidDate,
       sum(oi.Quantity) numOrders, sum(oi.PriceInclTax) as totalAmount
from [Order] o
         join [OrderItem] oi on o.Id = oi.OrderId
         join CinemaCrm2023.dbo.CRM_Customer cc on o.CustomerId = cc.Id
where (:storeId IS NULL OR o.StoreId = :storeId) AND o.Deleted = 0 AND o.OrderStatusId = 30
  AND (:fromDate IS NULL OR o.PrintedOnUtc >= :fromDate) AND (:toDate IS NULL OR o.PrintedOnUtc <= :toDate)
  AND cc.CardLevelName = 'U22 Member' AND len(o.MemberCardCode) > 0
group by cc.FullName, cc.CardCode, o.CreatedOnUtc
order by o.CreatedOnUtc asc;
```

**SQL mới** (chỉ đọc `Order` và `OrderItem`; `OrderItem` gom theo từng đơn trong `CROSS APPLY` nên mỗi đơn một dòng, không cộng trùng)

```sql
select o.Id                                                                as orderId,
       ltrim(rtrim(concat(o.CustomerLastName, N' ', o.CustomerFirstName))) as fullName,
       o.MemberCardCode                                                    as memberCardCode,
       o.CreatedOnUtc                                                      as paidDate,
       isnull(items.ticketCount, 0)                                        as numOrders,
       isnull(items.amount, 0)                                             as totalAmount
from [Order] o
         cross apply (select sum(oi.Quantity) as ticketCount, sum(oi.PriceInclTax) as amount
                      from [OrderItem] oi where oi.OrderId = o.Id) items
where o.VoucherCode = N'U22Ticket'
  AND o.OrderStatusId = 30
  AND o.Deleted = 0
  AND (:storeId IS NULL OR o.StoreId = :storeId)
  AND (:fromDate IS NULL OR o.CreatedOnUtc >= :fromDate)
  AND (:toDate IS NULL OR o.CreatedOnUtc <= :toDate)
order by o.CreatedOnUtc asc, o.Id asc;
```

Cột đã đối chiếu với `INFORMATION_SCHEMA` của `CinemaTicketDev`:
- `Order`: `Id`, `CustomerFirstName`/`CustomerLastName` nvarchar(max), `MemberCardCode`, `CreatedOnUtc` datetime2, `VoucherCode`, `OrderStatusId`, `Deleted`, `StoreId`.
- `OrderItem`: `OrderId`, `Quantity`, `PriceInclTax` decimal(10,0).

Ngày truyền nguyên như các báo cáo doanh thu khác, không đổi múi giờ. FIX-G-03 xác nhận cửa sổ ngày không lệch 7 giờ.

**Kết quả kiểm thử trên DEV** (BE local bản sửa + `CinemaTicketDev`; 22/22 PASS; bằng chứng: `test-results/u22-testapiv3/fix-u22-usage/`)

| ID | Kịch bản | Kết quả |
|---|---|---|
| FIX-AUTH-01…04 | Gọi không token, token sai chữ ký, token hết hạn, token hỏng định dạng | **401**, body không có tên/số thẻ |
| FIX-AUTH-05 | Nhân viên không có `staff_revenue_report.access` | **403** `STAFF_PERMISSION_DENIED`, không có dữ liệu |
| FIX-AUTH-06/07 | Nhân viên bán vé QA_U22_01 (role 8) / admin | 201, 4 dòng |
| FIX-A-01 | Ngày mua 10/11: 4 đơn U22 thành công | **4 dòng 10206659/65/69/71; 4 vé; 252.000đ** (55.000/70.000/72.000/55.000) |
| FIX-A-02/03 | Tên + số thẻ lấy từ `Order`; hợp đồng response | Khớp `Order`; khóa `fullName, memberCardCode, paidDate, numOrders, totalAmount` + `orderId`; `paidDate` = `CreatedOnUtc` (12:14:58 +07:00) |
| FIX-B-01 | 4 đơn U22 đã hủy (10206655/61/63/68, trạng thái 60) | Không xuất hiện |
| FIX-C-01 | 4 đơn **thường** của khách đang là "U22 Member" (06/2026: 10130861, 10129345, 10141806, 10141811) | Không vào báo cáo (bản cũ tính các đơn này) |
| FIX-D-01 | 180 đơn U22 của khách nay đã là Member (06/2026) | Đủ 180 (bản cũ làm mất) |
| FIX-E-01 | Thẻ có 7 đơn U22 trong 06/2026 | 7 dòng, 7 `orderId` khác nhau |
| FIX-F-01 | 3 đơn U22 hoàn tất nhưng chưa in (10206588/605/611, mua 09/11) | Có trong báo cáo ngày 09/11 |
| FIX-G-01 | 01–30/06/2026 so với SQL độc lập | 1.466 dòng, 1.466 vé, 80.630.000đ = SQL (304 ms) |
| FIX-G-02/03 | 09–10/11; một ngày 15/06 | = SQL (7 đơn; 87 đơn, nếu lệch 7 giờ sẽ là 48) |
| FIX-G-04/05 | `storeId=1` / `storeId=2`; ngày sai định dạng | 4 / 0 dòng; 422 |
| FIX-H-01 | Tham chiếu `CinemaCrm`/`CRM_Customer`/tên DB 3 phần trong src và dist đang chạy | 0 |
| FIX-UI-01 | Electron (FE nhánh U22, **không sửa**) với BE local bản sửa, tab "Báo cáo giao dịch mua vé thẻ U22" ngày 10/11 | 4 dòng, Tổng 4 vé / 252.000 ₫, giờ mua 12:14/12:17/12:19/12:20; FE tự gửi token |

**Test tự động và regression**
- Module report: 7 suite, **52/52 PASS**, trong đó 27 test mới gồm:
  - Hợp đồng SQL: không có DB CRM; chỉ đọc `Order`/`OrderItem`; có `VoucherCode`, `OrderStatusId`/`Deleted`, `storeId`, khoảng `CreatedOnUtc`, không dùng `PrintedOnUtc`; tiền theo `PriceInclTax`; không `group by` ngoài.
  - Service: quyền lấy từ user trong token; 403 trước khi chạy truy vấn; tham số; tổng tiền và số vé.
  - HTTP với guard thật: 401 ×5, 403, 201 với đúng hợp đồng FE, chuỗi ngày được chuyển thành `Date`, bỏ qua `userId` gửi trong body, 422.
- Kiểm tra ngược: chạy lại test với SQL cũ và bỏ `@AuthStaff()` thì 16/18 test FAIL, nên test bắt được lỗi.
- Toàn repo BE: 1.233 PASS, 3 FAIL, 111 skip. 5 suite FAIL **y hệt trên `origin/develop` sạch** (vòng import `Customer` ở app.module/cancel-ticket, plan-screenings, customer-web); không liên quan thay đổi này.
- `tsc --noEmit`: 0 lỗi trong module report; các lỗi còn lại có sẵn ở module khác. ESLint sạch trên file đổi; Prettier sạch trên phần code mới. `nest build` OK.
- Logic bán vé, giảm giá U22, POS, voucher giấy và báo cáo doanh thu tổng hợp không đổi: diff chỉ nằm trong `src/modules/report`, chỉ chạm `u22-usage`.

**Có cần sửa FE hoặc migration không?**
- **FE: không.** Client axios của FE đã gắn `Bearer` cho mọi request và tự refresh khi 401. Hợp đồng response giữ nguyên, chỉ thêm `orderId`.
- Người xem báo cáo cần `staff_revenue_report.access`, cũng là quyền để mở màn này. Trên DEV, các role 1, 2, 7, 8, 9, 12, 13 có quyền; role 3, 5, 14 không.
- **Migration: không.**

**Còn lại / lưu ý**
1. Tên khách ghép theo quy ước Họ + Tên của repo (`CustomerLastName + CustomerFirstName`, như `buildOrderCustomerName`). Dữ liệu tên trên `Order` không thống nhất (ISS-R15, P3), nên khách QA hiện "U22 Card 01 QA".
2. `Order` không có index trên `CreatedOnUtc`/`VoucherCode`, giống các báo cáo doanh thu khác (1 tháng mất 304 ms trên DEV). Chưa cần làm ngay.
3. `numOrders`/`totalUsage.totalOrders` là **số vé** (FE ghi "Số vé"); giữ tên để không phá FE.
4. Sau khi deploy testapiv3 cần chạy lại RC-U22USAGE, UI-U22-01 và FIX-AUTH-01…07 trên testapiv3.
5. ISS-R14: các endpoint `/api/reports/*` khác vẫn công khai, cần task riêng.

**PR Backend: READY để tạo khi được duyệt commit/push.** Nhánh `bug/develop/report-u22-usage` (base `origin/develop`), 11 file trong `src/modules/report`. Sau khi merge thì deploy testapiv3 và chạy lại mục 4 phần "Còn lại / lưu ý" ở trên.


---

## Phụ lục A. Chi tiết từng case

Sinh tự động từ `results.jsonl` (mỗi ID lấy lần chạy cuối). Cột Actual cắt ở 260 ký tự; bản đầy đủ trong `test-results/u22-testapiv3/results.jsonl` và `evidence.jsonl`. Nhóm CLEANUP và DATASET-SETUP là thao tác chuẩn bị/dọn dữ liệu.

#### U22-CONFIG

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| CFG-AUTH-01 | GET không token | 401 | 401  "Unauthorized" | PASS |
| CFG-AUTH-02 | PUT không token | 401 | 401  "Unauthorized" | PASS |
| CFG-AUTH-03 | Token sửa chữ ký | 401 | 401  "Unauthorized" | PASS |
| CFG-GET-01 | GET bởi admin: đủ 7 giá + version + người/ thời điểm cập nhật | 200, khớp DB | 200 {"priceMon":55000,"priceTue":55000,"priceWed":55000,"priceThu":55000,"priceFri":70000,"priceSat":70000,"priceSun":70000,"version":188,"updatedUser":"admin","updatedOnUtc":"2026-11-09T15:11:36.316Z"} | PASS |
| CFG-GET-02 | Giá mặc định T2–T5 55.000 / T6–CN 70.000 (snapshot trước test) | {"priceMon":55000,"priceTue":55000,"priceWed":55000,"priceThu":55000,"priceFri":70000,"priceSat":70000,"priceSun":70000} | {"priceMon":55000,"priceTue":55000,"priceWed":55000,"priceThu":55000,"priceFri":70000,"priceSat":70000,"priceSun":70000} | PASS |
| CFG-AUTH-04 | GET bởi staff không quyền (token ký bằng JWT_SECRET của .local.env, user_id 987654321) | 200 (mọi staff đọc được) – đồng thời chứng minh testapiv3 dùng chung JWT_SECRET với .local.env | 200 {"priceMon":55000,"priceTue":55000,"priceWed":55000,"priceThu":55000,"priceFri":70000,"priceSat":70000,"priceSun":70000,"version":188,"updatedUser":"admin","updatedOnUtc":"2026-11-09T15:11:36.316Z"} | PASS |
| CFG-AUTH-05 | PUT bởi staff thiếu ticket_prices.update | 403 STAFF_PERMISSION_DENIED | 403 STAFF_PERMISSION_DENIED "Bạn không có quyền chỉnh sửa giá vé (ticket_prices.update)." | PASS |
| CFG-AUTH-06 | Staff thiếu quyền gửi userId/user_id/username của admin trong body | 403 | 403 STAFF_PERMISSION_DENIED "Bạn không có quyền chỉnh sửa giá vé (ticket_prices.update)." | PASS |
| CFG-AUTH-07 | PUT bị 403 không ghi DB | Version 188 | Version 188 | PASS |
| CFG-VAL-01 | PUT giá 999 | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceMon): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-02 | PUT giá 1.000.001 | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceMon): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-03 | PUT giá 55.500 (không bội số 1.000) | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceMon): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-04 | PUT giá 0 | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceTue): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-05 | PUT giá âm | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceWed): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-06 | PUT giá thập phân 55000.5 | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceThu): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-07 | PUT giá null | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceFri): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-08 | PUT thiếu priceSun | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceSun): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-09 | PUT giá boolean | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceSat): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-10 | PUT giá mảng | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceSat): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-11 | PUT version 0 | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Phiên bản cấu hình (version) phải là số nguyên dương." | PASS |
| CFG-VAL-12 | PUT version -1 | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Phiên bản cấu hình (version) phải là số nguyên dương." | PASS |
| CFG-VAL-13 | PUT version 1.5 | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Phiên bản cấu hình (version) phải là số nguyên dương." | PASS |
| CFG-VAL-14 | PUT thiếu version | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Phiên bản cấu hình (version) phải là số nguyên dương." | PASS |
| CFG-VAL-15 | PUT body rỗng {} | 400 U22_INVALID_PRICE_CONFIG | 400 U22_INVALID_PRICE_CONFIG "Giá U22 không hợp lệ (priceMon, priceTue, priceWed, priceThu, priceFri, priceSat, priceSun): phải đủ 7 ngày, là số nguyên từ 1.000đ đến 1.000.000đ và là bội số của 1.000đ." | PASS |
| CFG-VAL-16 | PUT JSON hỏng | 4xx | 400  "Expected property name or '}' in JSON at position 1 (line 1 column 2)" | PASS |
| CFG-VAL-17 | Các PUT sai không ghi DB | Version 188 | Version 188 | PASS |
| CFG-PUT-01 | PUT giá riêng 7 thứ (51/52/53/54/66/67/68k), body có userId/updatedUser giả | 200, version +1, DB đúng 7 giá, UpdatedUser = admin (từ token) | 200 v189 updatedUser=admin; DB v189 {"priceMon":51000,"priceTue":52000,"priceWed":53000,"priceThu":54000,"priceFri":66000,"priceSat":67000,"priceSun":68000} admin | PASS |
| CFG-AUD-01 | StaffAuditLog cho PUT: giá cũ/mới, user từ token | 1 dòng U22PriceConfig UPDATE, OldValues = 55/70, NewValues = giá mới, UserId 39193040 | Id 9562 UPDATE user 39193040/admin changed=priceMon,priceTue,priceWed,priceThu,priceFri,priceSat,priceSun,version old.priceFri=70000 new.priceFri=66000 | PASS |
| CFG-WD-T2 | Preview T2 (suất 410030, ghế V 85000) dùng giá riêng ngay | u22Price 51000, giảm 34000 | 201 {"isValid":true,"discountAmount":34000,"reason":"applied","u22Price":51000} | PASS |
| CFG-WD-T3 | Preview T3 (suất 410025, ghế V 75000) dùng giá riêng ngay | u22Price 52000, giảm 23000 | 201 {"isValid":true,"discountAmount":23000,"reason":"applied","u22Price":52000} | PASS |
| CFG-WD-T4 | Preview T4 (suất 410028, ghế V 75000) dùng giá riêng ngay | u22Price 53000, giảm 22000 | 201 {"isValid":true,"discountAmount":22000,"reason":"applied","u22Price":53000} | PASS |
| CFG-WD-T5 | Preview T5 (suất 410027, ghế V 85000) dùng giá riêng ngay | u22Price 54000, giảm 31000 | 201 {"isValid":true,"discountAmount":31000,"reason":"applied","u22Price":54000} | PASS |
| CFG-WD-T6 | Preview T6 (suất 410031, ghế V 80000) dùng giá riêng ngay | u22Price 66000, giảm 14000 | 201 {"isValid":true,"discountAmount":14000,"reason":"applied","u22Price":66000} | PASS |
| CFG-WD-T7 | Preview T7 (suất 410029, ghế V 95000) dùng giá riêng ngay | u22Price 67000, giảm 28000 | 201 {"isValid":true,"discountAmount":28000,"reason":"applied","u22Price":67000} | PASS |
| CFG-WD-CN | Preview CN (suất 409991, ghế V 110000) dùng giá riêng ngay | u22Price 68000, giảm 42000 | 201 {"isValid":true,"discountAmount":42000,"reason":"applied","u22Price":68000} | PASS |
| CFG-409-01 | PUT với version cũ | 409 U22_PRICE_CONFIG_CHANGED kèm details.current; DB không đổi | 409 U22_PRICE_CONFIG_CHANGED "Giá vé U22 vừa được người khác cập nhật. Vui lòng tải lại và thử lại." details={"current":{"priceMon":51000,"priceTue":52000,"priceWed":53000,"priceThu":54000,"priceFri":66000,"priceSat":67000,"priceSun":68000,"version":189,"updat | PASS |
| CFG-409-02 | PUT với version lớn hơn hiện tại | 409 | 409 U22_PRICE_CONFIG_CHANGED "Giá vé U22 vừa được người khác cập nhật. Vui lòng tải lại và thử lại." details={"current":{"priceMon":51000,"priceTue":52000,"priceWed":53000,"priceThu":54000,"priceFri":66000,"priceSat":67000,"priceSun":68000,"version":189,"updat | PASS |
| CFG-CONC-01 | Hai Admin (2 phiên) PUT cùng version cùng lúc, 3 lượt | Mỗi lượt đúng 1×200 + 1×409, DB = bên thắng | 200+409 v189->190; 200+409 v190->191; 200+409 v191->192 | PASS |
| CFG-RESTORE | Khôi phục 55.000/70.000 theo snapshot | 200, DB 55/70 | 200 DB {"priceMon":55000,"priceTue":55000,"priceWed":55000,"priceThu":55000,"priceFri":70000,"priceSat":70000,"priceSun":70000} v193 | PASS |
| CFG-WD-R-T2 | Sau khôi phục: preview T2 = 55000 | u22Price 55000 | 201 u22Price=55000 | PASS |
| CFG-WD-R-T6 | Sau khôi phục: preview T6 = 70000 | u22Price 70000 | 201 u22Price=70000 | PASS |
| CFG-AUD-02 | Số dòng audit U22PriceConfig sinh ra = số PUT thành công (1 + 3 + 1 = 5) | 5 | 5 | PASS |

#### POS-U22

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| POS-PV-01 | Preview: Thẻ U22 hợp lệ, suất ngày thường T3 2D (410025, ghế V 75.000) | applied, u22Price 55.000, giảm 20.000 | 201 {"isValid":true,"discountAmount":20000,"reason":"applied","u22Price":55000} | PASS |
| POS-PV-02 | Preview: Ngày thường T5 2D (410027 tương lai, ghế V 85.000) | u22Price 55.000, giảm 30.000 | 201 {"isValid":true,"discountAmount":30000,"reason":"applied","u22Price":55000} | PASS |
| POS-PV-03 | Preview: Cuối tuần T6 2D (410031 tương lai, ghế V 80.000) | u22Price 70.000, giảm 10.000 | 201 {"isValid":true,"discountAmount":10000,"reason":"applied","u22Price":70000} | PASS |
| POS-PV-04 | Preview: Cuối tuần T7 2D (410029, ghế V 95.000) | u22Price 70.000, giảm 25.000 | 201 {"isValid":true,"discountAmount":25000,"reason":"applied","u22Price":70000} | PASS |
| POS-PV-05 | Preview: Cuối tuần CN 2D (409991, ghế V 110.000) | u22Price 70.000, giảm 40.000 | 201 {"isValid":true,"discountAmount":40000,"reason":"applied","u22Price":70000} | PASS |
| POS-PV-06 | Preview: Ngày lễ T2 (396284, 16/02/2026 Tết 29) | isValid false, reason holiday + tên lễ | 201 {"isValid":false,"discountAmount":0,"reason":"holiday","holidayName":"Tết Nguyên đán (29 Tết)"} | PASS |
| POS-PV-07 | Preview: Ngày lễ CN (402638, 26/04/2026 Giỗ Tổ) | reason holiday | 201 {"isValid":false,"discountAmount":0,"reason":"holiday","holidayName":"Giỗ Tổ Hùng Vương"} | PASS |
| POS-PV-08 | Preview: Ngày lễ T6 (403169, 01/05/2026) | reason holiday | 201 {"isValid":false,"discountAmount":0,"reason":"holiday","holidayName":"Ngày Quốc tế Lao động"} | PASS |
| POS-PV-09 | Preview: Suất 3D (395762) không áp U22 | reason not_2d | 201 {"isValid":false,"discountAmount":0,"reason":"not_2d"} | PASS |
| POS-PV-10 | Preview: Suất 3D vào ngày lễ (393104, 01/01/2026): 2D kiểm trước | reason not_2d | 201 {"isValid":false,"discountAmount":0,"reason":"not_2d"} | PASS |
| POS-PV-11 | Preview: Thẻ không tồn tại 0000000000 | reason card_not_found | 201 {"isValid":false,"discountAmount":0,"reason":"card_not_found"} | PASS |
| POS-PV-12 | Preview: Thẻ Member (không phải U22) 2200046248 | reason not_u22 | 201 {"isValid":false,"discountAmount":0,"reason":"not_u22"} | PASS |
| POS-PV-13 | Preview: Ghế thường 70.000 ở T6 (giá U22 70.000) | price_not_eligible kèm u22Price 70.000 | 201 {"isValid":false,"discountAmount":0,"reason":"price_not_eligible","u22Price":70000} | PASS |
| POS-PV-14 | Preview: không có thẻ | 400 | 400  "memberCardCode là bắt buộc khi sử dụng voucher U22Ticket." | PASS |
| POS-PV-15 | Preview: thẻ rỗng | 400 | 400  "memberCardCode là bắt buộc khi sử dụng voucher U22Ticket." | PASS |
| POS-PV-16 | Preview: suất 2D vào ngày không có dòng DateInYear (89222, 31/12/2015) | 400 U22_SHOW_DATE_NOT_CONFIGURED | 400 U22_SHOW_DATE_NOT_CONFIGURED "Ngày suất chiếu chưa có trong Danh sách ngày." details={"showDate":"2015-12-31"} | PASS |
| POS-PV-17 | Preview: không token | 401 | 401  "Unauthorized" | PASS |
| POS-NET | Lưới an toàn: ghế dùng cho request tạo đơn đều đã bán (đơn COMPLETED) | 3/3 ghế đã bán | 3/3 | PASS |
| POS-CR-01 | Tạo đơn U22 thiếu expectedU22Price | 400 U22_PRICE_CONFIRMATION_REQUIRED | 400 U22_PRICE_CONFIRMATION_REQUIRED "Phiên bản POS chưa hỗ trợ giá U22 mới. Vui lòng cập nhật POS." | PASS |
| POS-CR-02 | expectedU22Price 69.000 khác giá hiện hành 70.000 | 409 U22_PRICE_CHANGED, details.u22Price 70.000 | 409 U22_PRICE_CHANGED "Giá U22 vừa đổi thành 70.000đ. Vui lòng xác nhận lại." details={"u22Price":70000} | PASS |
| POS-CR-03 | expectedU22Price dạng chuỗi "69000" | 409 (bị chuyển kiểu ngầm, ISS-15) | 409 U22_PRICE_CHANGED "Giá U22 vừa đổi thành 70.000đ. Vui lòng xác nhận lại." details={"u22Price":70000} | PASS |
| POS-CR-04 | expectedU22Price âm (-1) | 4xx, không tạo đơn | 422  ["expectedU22Price must not be less than 0"] | PASS |
| POS-CR-05 | U22Ticket không thẻ + orderDiscount 50.000 do client gửi | 400 U22_MEMBER_CARD_REQUIRED | 400 U22_MEMBER_CARD_REQUIRED "Ưu đãi U22 cần quẹt thẻ thành viên U22." | PASS |
| POS-CR-06 | U22Ticket thẻ chỉ khoảng trắng + orderDiscount + expectedU22Price | 400 U22_MEMBER_CARD_REQUIRED | 400 U22_MEMBER_CARD_REQUIRED "Ưu đãi U22 cần quẹt thẻ thành viên U22." | PASS |
| POS-CR-07 | Có thẻ U22 + orderDiscount 70.000 client gửi, expected đúng: BE bỏ orderDiscount client | 409 (giá vẫn do BE tính, client không vượt kiểm tra) | 409 U22_PRICE_CHANGED "Giá U22 vừa đổi thành 70.000đ. Vui lòng xác nhận lại." details={"u22Price":70000} | PASS |
| POS-CR-08 | Suất 3D (395762) tạo đơn U22 | 400 "chỉ áp dụng cho suất chiếu 2D" | 400  "Ưu đãi U22 chỉ áp dụng cho suất chiếu 2D." | PASS |
| POS-CR-09 | Suất ngày lễ (403169, 01/05) tạo đơn U22 | 400 "Ngày suất chiếu là ngày lễ (…)" | 400  "Ngày suất chiếu là ngày lễ (Ngày Quốc tế Lao động), không áp dụng ưu đãi U22." | PASS |
| POS-CR-10 | Đối chứng: expectedU22Price đúng 70.000 → qua kiểm tra U22, dừng ở kiểm ghế (ghế đã bán) | 400 "Some seats have already been booked" (U22 chấp nhận giá, không tạo đơn) | 400  "Some seats have already been booked" | PASS |
| POS-CHG-01 | Preview 70.000 → Admin đổi T6 = 72.000 → preview mới ngay | preview trước 70.000, PUT 200, preview sau 72.000 | before 70000, PUT 200, after 72000 | PASS |
| POS-CHG-02 | Tạo đơn với giá preview cũ 70.000 sau khi giá đổi | 409 U22_PRICE_CHANGED, details.u22Price 72.000, không tạo đơn | 409 U22_PRICE_CHANGED "Giá U22 vừa đổi thành 72.000đ. Vui lòng xác nhận lại." details={"u22Price":72000} | PASS |
| POS-CHG-03 | Khôi phục 55/70 sau ca đổi giá | 200 | 200 v195 | PASS |
| POS-NOORDER | Không phát sinh đơn nào trong nhóm POS | MaxOrderId 10206651 | MaxOrderId 10206651 | PASS |

#### P5P6-QUOTE

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| PV-Q-01 | Quote voucher giấy, không U22 (410031 ghế V 80.000, lô 6 = 30.000) | 2xx; tổng 80.000, voucher 30.000, còn 50.000 | 201 {"businessDate":"2026-11-10","orderTotal":80000,"orderDiscount":0,"voucherQuantity":1,"faceValueTotal":30000,"voucherApplied":30000,"remainingPayable":50000,"excessAmount":0,"lines":[{"batchId":6,"quantity":1,"faceValue":30000,"batchCode":"LÔ-005","faceVal | PASS |
| PV-Q-02 | Quote U22 + voucher giấy thiếu expectedU22Price | 400 U22_PRICE_CONFIRMATION_REQUIRED | 400 U22_PRICE_CONFIRMATION_REQUIRED "Phiên bản POS chưa hỗ trợ giá U22 mới. Vui lòng cập nhật POS." | PASS |
| PV-Q-03 | Quote U22 + voucher giấy expectedU22Price sai | 409 U22_PRICE_CHANGED | 409 U22_PRICE_CHANGED "Giá U22 vừa đổi thành 70.000đ. Vui lòng xác nhận lại." details={"u22Price":70000} | PASS |
| PV-Q-04 | Quote U22 + voucher giấy ở 70.000 | 2xx; tổng 70.000, voucher 30.000, còn 40.000 | 201 {"businessDate":"2026-11-10","orderTotal":70000,"orderDiscount":10000,"voucherQuantity":1,"faceValueTotal":30000,"voucherApplied":30000,"remainingPayable":40000,"excessAmount":0,"lines":[{"batchId":6,"quantity":1,"faceValue":30000,"batchCode":"LÔ-005","fac | PASS |
| PV-Q-05 | Quote U22Ticket không thẻ + orderDiscount | 400 U22_MEMBER_CARD_REQUIRED | 400 PAPER_VOUCHER_CLIENT_ORDER_DISCOUNT_NOT_ALLOWED "Đơn dùng voucher giấy không nhận số tiền giảm giá do máy POS tự gửi" | PASS* — Kỳ vọng harness quá hẹp: quote voucher giấy chặn orderDiscount client trước bước định giá U22 (cùng hành vi BYP-04 của QA local). Mục tiêu 'không vượt U22 bằng orderDiscount' đạt: 400, không báo giá. |
| PV-Q-06 | Quote voucher giấy kèm orderDiscount client (không U22) | 400 PAPER_VOUCHER_CLIENT_ORDER_DISCOUNT_NOT_ALLOWED | 400 PAPER_VOUCHER_CLIENT_ORDER_DISCOUNT_NOT_ALLOWED "Đơn dùng voucher giấy không nhận số tiền giảm giá do máy POS tự gửi" | PASS |
| PV-Q-07 | Quote U22 + voucher giấy ở suất 3D | 400 chỉ áp dụng 2D | 400  "Ưu đãi U22 chỉ áp dụng cho suất chiếu 2D." | PASS |
| PV-Q-08 | Quote không ghi tồn voucher | UsedCount 8 | UsedCount 8 | PASS |
| PV-Q-05b | Quote U22Ticket không thẻ (không orderDiscount) + voucher giấy | 400 U22_MEMBER_CARD_REQUIRED | 400 U22_MEMBER_CARD_REQUIRED "Ưu đãi U22 cần quẹt thẻ thành viên U22." | PASS |

#### DATES

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| DT-PRE | Năm QA 2061–2064 chưa có dữ liệu, không có suất chiếu, không có FK tới DateInYear | 0 dòng, 0 suất | 0 dòng, 0 suất | PASS |
| DT-LIST-01 | GET danh sách năm 2026 (query giống FE getYear): Ngày thường / Cuối tuần / Ngày lễ | = DB 199/149/17 | 200 365 dòng, 199/149/17 | PASS |
| DT-LIST-02 | Trường isHoliday/holidayName có trong response | 02/09/2026 isHoliday true + tên | {"dateValue":"2026-09-02","dateTypeId":1,"createdOnUtc":"2025-12-29T09:21:15+07:00","createdUser":"vanhieu","isHoliday":true,"holidayName":"Quốc Khánh","CreatedOnUtc":"2025-12-29T09:21:15+07:00"} | PASS |
| DT-LIST-03 | GET danh sách không token | 401 | 401  "Unauthorized" | PASS |
| DT-INIT-01 | Khởi tạo năm bởi staff không quyền | 403 STAFF_PERMISSION_DENIED, không tạo gì | 403 STAFF_PERMISSION_DENIED "Bạn không có quyền cập nhật Danh sách ngày (holidays)."; DB 0 dòng | PASS |
| DT-INIT-02 | Khởi tạo năm không token | 401 | 401  "Unauthorized" | PASS |
| DT-INIT-03 | Khởi tạo năm: năm 1999 | 4xx, không tạo gì | 400  "Năm phải từ 2000 đến 2100."; 2061 = 0 dòng | PASS |
| DT-INIT-04 | Khởi tạo năm: năm 2101 | 4xx, không tạo gì | 400  "Năm phải từ 2000 đến 2100."; 2061 = 0 dòng | PASS |
| DT-INIT-05 | Khởi tạo năm: ngày lễ không thuộc năm | 4xx, không tạo gì | 400  "Ngày lễ không thuộc năm 2061 hoặc không hợp lệ: 2062-01-01."; 2061 = 0 dòng | PASS |
| DT-INIT-06 | Khởi tạo năm: weekendDays ngoài 0–6 | 4xx, không tạo gì | 422  ["each value in weekendDays must not be greater than 6"]; 2061 = 0 dòng | PASS |
| DT-INIT-07 | Khởi tạo năm: tên ngày lễ rỗng | 4xx, không tạo gì | 422  ["holidays.0.holidayName should not be empty"]; 2061 = 0 dòng | PASS |
| DT-INIT-08 | Khởi tạo năm: ngày lễ không tồn tại 2061-02-29 | 4xx, không tạo gì | 400  "Ngày lễ không thuộc năm 2061 hoặc không hợp lệ: 2061-02-29."; 2061 = 0 dòng | PASS |
| DT-INIT-10 | Khởi tạo 2061 (năm thường) mẫu A + 17 ngày lễ mặc định | 201, createdDays 365, weekend 157, holidays 17 | 201 {"year":2061,"createdDays":365,"weekendDayCount":157,"holidayCount":17} | PASS |
| DT-INIT-11 | DB 2061: 365 ngày, DateTypeId đúng mẫu A (T6–CN = 2), 0 ngày lệch thứ | 365, 157 cuối tuần, 0 lệch | 365, 157 cuối tuần, 0 lệch | PASS |
| DT-INIT-12 | 17 ngày lễ đúng ngày/tên (11 luật định + 6 NCC), DateTypeId theo thứ (đánh dấu lễ không đổi DateTypeId) | 17 dòng IsHoliday đúng tên; DateTypeId = loại theo thứ | 17 ngày lễ, tên khớp: true | PASS |
| DT-AUD-01 | Audit khởi tạo năm: StaffAuditLog DateInYear CREATE EntityId 2061 | 1 dòng CREATE, user admin | CREATE 2061 admin {"year":2061,"createdDays":365,"weekendDays":[0,5,6],"weekendDayCount":157,"holidayCount":17,"holidays":["2061-01-01 Tết | PASS |
| DT-INIT-13 | Khởi tạo lại 2061 bằng mẫu B, không ngày lễ | createdDays 0, dữ liệu giữ nguyên (checksum) | 201 {"year":2061,"createdDays":0,"weekendDayCount":0,"holidayCount":0}; checksum 155543629 → 155543629 | PASS |
| DT-HOL-01 | Bỏ đánh dấu ngày lễ mặc định 01/09/2061 | 200, IsHoliday 0, tên NULL, giữ dòng, DateTypeId không đổi | 200 {"D":"2061-09-01","T":1,"H":false,"N":null,"W":5} | PASS |
| DT-HOL-02 | Khởi tạo lại 2061 kèm đủ 17 ngày lễ: ngày đã bỏ (01/09) không bị đánh dấu lại | createdDays 0; 01/09 vẫn IsHoliday 0 | 201 created 0; 01/09 H=false | PASS |
| DT-HOL-03 | Đánh dấu ngày lễ 15/06/2061, tên có khoảng trắng | 200, IsHoliday 1, tên đã trim, DateTypeId không đổi | 200 {"D":"2061-06-15","T":1,"H":true,"N":"QA lễ thử testapiv3","W":4} | PASS |
| DT-HOL-04 | Đổi tên ngày lễ | 200, tên mới | 200 QA lễ đổi tên | PASS |
| DT-HOL-05 | Lưu y nguyên tên | 200 | 200 {"dateValue":"2061-06-15","dateTypeId":1,"createdOnUtc":"2026-11-10T10:53:39+07:00","createdUser":"admin","isHoliday":true,"holidayName":"QA lễ đổi tên","CreatedOnUtc":"2026-11-10T10:53:39+07:00"} | PASS |
| DT-HOL-06 | Đánh dấu/đổi tên bởi staff không có holidays.update | 403 STAFF_PERMISSION_DENIED, DB không đổi | 403 STAFF_PERMISSION_DENIED "Bạn không có quyền cập nhật Danh sách ngày (holidays)."; tên QA lễ đổi tên | PASS |
| DT-HOL-07 | Bỏ đánh dấu bởi staff không quyền | 403, DB không đổi | 403 STAFF_PERMISSION_DENIED "Bạn không có quyền cập nhật Danh sách ngày (holidays)."; H=true | PASS |
| DT-HOL-08 | Đánh dấu không token | 401 | 401  "Unauthorized" | PASS |
| DT-HOL-09 | Bỏ đánh dấu 15/06/2061 | 200, IsHoliday 0, tên NULL, giữ dòng, DateTypeId không đổi | 200 {"D":"2061-06-15","T":1,"H":false,"N":null,"W":4} | PASS |
| DT-AUD-02 | Audit ngày lễ: bỏ đánh dấu 01/09, đánh dấu, đổi tên, (lưu y nguyên không ghi), bỏ đánh dấu 15/06; 403 không ghi | 4 dòng UPDATE DateInYear | UPDATE:2061-09-01:isHoliday,holidayName \| UPDATE:2061-06-15:isHoliday,holidayName \| UPDATE:2061-06-15:holidayName \| UPDATE:2061-06-15:isHoliday,holidayName | PASS |
| DT-HOL-10 | Đánh dấu ngày không tồn tại 2061-02-29 | 404 | 404  "Invalid date value 2061-02-29" | PASS |
| DT-HOL-11 | Đánh dấu tháng 13 | 404 | 404  "Invalid date value 2061-13-01" | PASS |
| DT-HOL-12 | Đánh dấu ngày chưa có dòng (2099-01-01) | 404 | 404  "Date in year with date value 2099-01-01 not found" | PASS |
| DT-HOL-13 | Tên ngày lễ rỗng | 400 | 422  ["holidayName should not be empty"] | PASS* — Kỳ vọng harness quá hẹp (400): ValidationPipe toàn cục trả 422 cho lỗi DTO; request bị từ chối, không ghi DB (QA local DAPI-05…08 chỉ yêu cầu 4xx). |
| DT-HOL-14 | Tên ngày lễ 201 ký tự | 400 | 422  ["holidayName must be shorter than or equal to 200 characters"] | PASS* — Kỳ vọng harness quá hẹp (400): ValidationPipe toàn cục trả 422 cho lỗi DTO; request bị từ chối, không ghi DB (QA local DAPI-05…08 chỉ yêu cầu 4xx). |
| DT-PART-01 | Tạo năm thiếu một phần: xóa 31 ngày tháng 12/2061 (route DELETE cũ) | 31 × 200, còn 334 ngày | 31 × 200, còn 334 | PASS |
| DT-PART-02 | Bổ sung ngày còn thiếu (initialize, chỉ ngày lễ trong phần thiếu: 24/12) | createdDays 31, đủ 365, 24/12 là Giáng sinh, tháng 12 đúng mẫu A, 01–11 không đổi | 201 {"year":2061,"createdDays":31,"weekendDayCount":14,"holidayCount":1}; 365 ngày; 24/12 Giáng sinh; lệch 0; checksum 01–11 không đổi | PASS |
| DT-CLS-01 | Đổi phân loại theo thứ (FE bulk-create specialDates): T6 → Ngày thường (mẫu B) | 2xx; 0 ngày lệch mẫu B; ngày lễ giữ cờ và tên | 201; lệch mẫu B 0; ngày lễ giữ: true | PASS |
| DT-CONC-01 | Hai lệnh Khởi tạo năm 2063 đồng thời | 201 + 409 DATE_IN_YEAR_INITIALIZE_CONFLICT (hoặc 201 + 201 với 0 ngày), đúng 365 dòng, không 500 | 201+409 DATE_IN_YEAR_INITIALIZE_CONFLICT; 365 dòng; holidays 17 | PASS |
| DT-CONC-02 | Hai lệnh populate 2062 đồng thời (route cũ) | 201 + 409 (không 500), đúng 365 dòng | 201+409 DATE_IN_YEAR_INITIALIZE_CONFLICT ; 365 dòng | PASS |
| DT-POP-01 | populate năm không hợp lệ (abc) | 400 | 400  "Năm phải từ 2000 đến 2100." | PASS |
| DT-LEAP-01 | Khởi tạo 2064 (năm nhuận) mẫu B + 17 ngày lễ | 366 ngày, có 29/02, T7–CN = 2, T6 = 1, 17 ngày lễ | 201 {"year":2064,"createdDays":366,"weekendDayCount":104,"holidayCount":17}; 366 ngày; 29/02 true; lệch 0; lễ 17 | PASS |

#### ELECTRON

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| FE-01 | Electron khởi động với profile tạm, config.json trỏ testapiv3 | Màn đăng nhập hiện, apiBaseUrl/socketUrl = testapiv3 | {"apiBaseUrl":"https://testapiv3.chieuphimquocgia.com.vn","socketUrl":"wss://testapiv3.chieuphimquocgia.com.vn","theme":"light"}; viewport 1352×731 | PASS |
| FE-02 | Đăng nhập admin qua UI | POST /api/pos/staff/login 201 tới testapiv3, vào màn chính | 201 https://testapiv3.chieuphimquocgia.com.vn/api/pos/staff/login; hash #/ | PASS |
| FE-03 | Danh sách giá vé (tab Giá vé) tải từ testapiv3 | Bảng có dòng, có tab Giá vé U22 | 20 dòng | PASS |
| FE-04 | Tab Giá vé U22 hiển thị đúng cấu hình testapiv3 | T2–T5 55.000đ, T6–CN 70.000đ, T7 70.000đ, người cập nhật | 55.000đ / 70.000đ / T7 70.000đ | PASS |
| FE-05 | Link "Mở Danh sách ngày" (sáng): màu link khác chữ thường, bấm mở Danh sách ngày | màu = colorLink, hash #/holidays | link rgb(22, 119, 255), body rgb(0, 0, 0), hash #/holidays | PASS |
| FE-06 | Dialog chỉnh giá: Lưu khóa khi chưa đổi; Hủy không ghi | Lưu disabled → enabled khi đổi; Hủy: 0 PUT | disabled ban đầu true, sau khi đổi false, PUT 0 | PASS |
| FE-07 | Dialog chế độ "Chỉnh riêng từng thứ" ở 1366×768 không tràn | dialog nằm trong viewport, footer Lưu/Hủy nhìn thấy, thân cuộn được | viewport 1352×731, dialog y 52–679, nút Lưu y 627–659 | PASS |
| FE-08 | Lưu giá qua UI (T2–T5 56.000 / T6–CN 71.000) rồi khôi phục 55/70 qua UI | PUT 200 ×2, toast, tab cập nhật, DB khớp | PUT 200 → tab 56.000đ, DB 56000/71000; PUT 200 → DB 55000/70000 | PASS |
| FE-09 | Conflict: Admin khác lưu khi dialog đang mở, bấm Lưu | PUT 409, alert "vừa được cập nhật bởi người khác", Lưu khóa, DB giữ giá người kia | API khác 200; UI PUT 409; Lưu khóa true; DB 55000/72000 | PASS |
| FE-10 | Conflict phát hiện trước khi bấm Lưu (refetch sau 60 s khi cửa sổ focus lại) | alert xung đột hiện, Lưu khóa, 0 PUT, DB giữ giá người kia | API khác 200; Lưu khóa true; PUT từ UI 0; DB T6 73000 | PASS |
| FE-11 | Hiển thị lỗi 503 trên tab U22 (QA mock route GET) | Alert đỏ "Không đọc được cấu hình giá vé U22" + Thử lại, ẩn Chỉnh sửa giá; Thử lại hồi phục | alert hiện, nút Chỉnh sửa giá hiện: false; Thử lại → tab hồi phục | PASS |
| FE-12 | Hiển thị lỗi 403 khi lưu giá (QA mock route PUT) | Dialog hiện thông báo thiếu quyền, không đóng | Bạn không có quyền chỉnh sửa giá vé (ticket_prices.update). | PASS |
| FE-13 | Danh sách ngày năm 2026 (năm vận hành, chỉ đọc) | 3 tab = DB (Ngày thường / Cuối tuần / Ngày lễ) | Ngày thường (199) \| Cuối tuần (149) \| Ngày lễ (17) ; DB 199/149/17 | PASS |
| FE-14 | Năm QA 2067 trống: nút Khởi tạo năm → popup mẫu A + ngày lễ mặc định (có ngày trùng) | Popup "Khởi tạo năm 2067", mẫu A mặc định, 16 ngày lễ chọn sẵn (14/02 trùng Tết) | 16/16 ngày lễ chọn sẵn; FE getDefaultHolidays(2067) = 16 | PASS |
| FE-15 | Khởi tạo 2067 qua UI, bỏ chọn 01/09 | POST initialize 201; DB 365 ngày, T6–CN = Cuối tuần, 15 ngày lễ, 01/09 không là lễ | 201 {"year":2067,"createdDays":365,"weekendDayCount":157,"holidayCount":15}; DB 365 ngày, lệch 0, lễ 15, 01/09 H=false, 14/02 = Tết Nguyên đán (Mùng 1) | PASS |
| FE-16 | Thiết lập phân loại ngày 2067: Lưu khóa khi chưa đổi; 01/09 đã bỏ không bị đề xuất/đánh dấu lại; đổi mẫu B và lưu | Lưu khóa ban đầu; sau lưu DB 0 T6 cuối tuần, 01/09 vẫn không là lễ, vẫn 15 ngày lễ | ngày lễ mặc định chưa đánh dấu 1 (chọn sẵn 0); Lưu khóa true → mở true; bulk-create 201; T6 cuối tuần 0; 01/09 H=false; lễ 15 | PASS |
| FE-17 | Năm 2067 thiếu tháng 12 (xóa qua API) → cảnh báo + Tạo các ngày còn thiếu | Cảnh báo "còn thiếu 31 ngày"; popup tạo 31 ngày; DB đủ 365; 24/12 Giáng sinh | 201 {"year":2067,"createdDays":31,"weekendDayCount":14,"holidayCount":1}; cảnh báo còn 0; DB 365; 24/12 Giáng sinh | PASS |
| FE-18 | POS suất T6 2D 410031: chọn ghế VIP, Quẹt thẻ VIP thẻ U22 → preview | validate-voucher tới testapiv3, U22 mở, "Giá vé U22 của suất chiếu này" 70.000đ | validate 201 {"isValid":true,"discountAmount":10000,"reason":"applied","u22Price":70000}; radio mở true; "Giá vé U22 của suất chiếu này: 70.000 ₫" | PASS |
| FE-19 | POS: giá đổi giữa preview và bấm xác nhận → 409, không tạo đơn | POST /api/pos/order gửi expectedU22Price 70.000 → 409 U22_PRICE_CHANGED (71.000); toast "Chưa tạo đơn"; U22 bỏ chọn; MaxOrderId không đổi | PUT khác 200; gửi {"voucherCode":"U22Ticket","expectedU22Price":70000,"hasManualInvoice":false}; 409 {"statusCode":409,"code":"U22_PRICE_CHANGED","message":"Giá U22 vừa đổi thành 71.000đ. Vui lòng xác nhận lại.","details":{"u22Price":71000},"timestamp":"2026-1 | PASS |
| FE-20 | POS: hiển thị lỗi 400 khi tạo đơn U22 (QA mock route POST) | Thông báo lỗi, không tạo đơn | Phiên bản POS chưa hỗ trợ giá U22 mới. Vui lòng cập nhật POS. | PASS |
| FE-21 | POS khóa U22 với suất 3D (395762; ngày suất chỉ giả lập ở renderer để mở nút bán, validate-voucher thật) | validate-voucher reason not_2d; radio U22 khóa; thông báo chỉ áp 2D | validate {"isValid":false,"discountAmount":0,"reason":"not_2d"}; radio khóa true | PASS |
| FE-22 | POS khóa U22 ở suất ngày lễ (403169 ngày 01/05/2026; ngày hiển thị giả lập ở renderer, validate-voucher thật) | reason holiday, radio khóa, hiện tên ngày lễ | validate {"isValid":false,"discountAmount":0,"reason":"holiday","holidayName":"Ngày Quốc tế Lao động"}; radio khóa true | PASS |
| FE-23 | Giao diện tối: tab U22, dialog nâng cao 1366×768, link Mở Danh sách ngày, Danh sách ngày | Ảnh chụp đủ; link màu khác chữ; footer dialog trong viewport | dark=true; link rgb(22, 104, 220) vs rgb(0, 0, 0); nút Lưu đáy 659/731 | PASS |
| FE-24 | Network: mọi request HTTP của renderer chỉ tới testapiv3 | 0 request tới localhost/127.0.0.1/api.chieuphimquocgia.com.vn/host khác; WebSocket wss://testapiv3 | 57 request HTTP, host: testapiv3.chieuphimquocgia.com.vn; ngoài testapiv3: 0 ; ws: wss://testapiv3.chieuphimquocgia.com.vn/socket.io/?token=<jwt-redacted> | PASS |
| FE-25 | Không phát sinh đơn từ Electron; harness không phải chặn request tạo đơn nào | MaxOrderId không đổi; createAttempts chỉ gồm ca 409 và ca mock 400 | MaxOrderId 10206651 → 10206651; POST /api/pos/order 0 lần; bị harness chặn 0 | PASS |
| FE-RESTORE | Cấu hình U22 sau nhóm Electron | 55/70 | {"priceMon":55000,"priceTue":55000,"priceWed":55000,"priceThu":55000,"priceFri":70000,"priceSat":70000,"priceSun":70000,"version":203,"updatedUser":"admin","updatedOnUtc":"2026-11-10T04:11:50.955Z"} | PASS |
| FE-26 | Điều hướng route có guard (#/ticket-prices) ngay sau khi đăng nhập, trước khi tải xong quyền (2 lần, phiên mới) | Mở được trang (chờ quyền), không hiện 403 | lần 1: 403=true hash=#/403 → Thử lại → #/ticket-prices; lần 2: 403=true hash=#/403 → Thử lại → #/ticket-prices | FAIL |

#### REPORT

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| RPT-01 | Báo cáo doanh thu theo phim ngày chiếu 2026-11-13: vé U22 vào cột giá thực bán (UnitPriceInclTax) | 2xx; có cột 65000 | 201; U22 DB 65000×1; response chứa giá U22: true; [65000] | PASS |
| RPT-02 | Báo cáo doanh thu theo phim ngày chiếu 2026-11-12: vé U22 vào cột giá thực bán (UnitPriceInclTax) | 2xx; có cột 55000 | 201; U22 DB 55000×1; response chứa giá U22: true; [85000,55000] | PASS |
| RPT-03 | Báo cáo doanh thu theo phim ngày chiếu 2026-03-27: vé U22 vào cột giá thực bán (UnitPriceInclTax) | 2xx; có cột 55000/80000/95000/105000 | 201; U22 DB 55000×1, 80000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 95000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 105000×1, 55000×1, 55000×1, 55000×1, 55000×1, 55000×1, 5500 | PASS |
| RPT-04 | Báo cáo /api/reports/* không token (ENV-06 cũ) | Ghi nhận: 401 nếu đã bật xác thực, 2xx nếu vẫn mở | 201 | PASS* — Endpoint báo cáo vẫn không cần đăng nhập trên testapiv3 (ENV-06, có sẵn, ngoài phạm vi U22) |

#### CLEANUP

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| CLN-2061 | Dọn năm QA 2061 qua DELETE /api/pos/date-in-year/:date (0 suất chiếu, không FK) | xóa hết, còn 0 dòng | 269 dòng, 269 × 200, còn 0 | PASS |
| CLN-2062 | Dọn năm QA 2062 qua DELETE /api/pos/date-in-year/:date (0 suất chiếu, không FK) | xóa hết, còn 0 dòng | 365 dòng, 365 × 200, còn 0 | PASS |
| CLN-2063 | Dọn năm QA 2063 qua DELETE /api/pos/date-in-year/:date (0 suất chiếu, không FK) | xóa hết, còn 0 dòng | 365 dòng, 365 × 200, còn 0 | PASS |
| CLN-2064 | Dọn năm QA 2064 qua DELETE /api/pos/date-in-year/:date (0 suất chiếu, không FK) | xóa hết, còn 0 dòng | 365 dòng, 365 × 200, còn 0 | PASS |
| CLN-2067 | Dọn năm QA 2067 qua DELETE /api/pos/date-in-year/:date (0 suất chiếu, không FK) | xóa hết, còn 0 dòng | 273 dòng, 273 × 200, còn 0 | PASS |

#### SALE-U22

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| SALE-01 | Bán U22 tiền mặt qua Electron: suất T5 410027 (12/11, 2D), ghế V 85.000, Xuất hóa đơn bật | Tra thẻ thật (Mediasoft DEV), preview 55.000; POST /api/pos/order 201 gửi U22Ticket + expectedU22Price 55.000 + hasManualInvoice true | tra thẻ 200; validate {"isValid":true,"discountAmount":30000,"reason":"applied","u22Price":55000}; "Giá vé U22 của suất chiếu này: 55.000 ₫"; gửi {"voucherCode":"U22Ticket","memberCardCode":"2229055236","expectedU22Price":55000,"hasManualInvoice":true,"payment | PASS |
| SALE-02 | Giá lưu DB, tổng đơn, OrderItem | OrderStatus 30, OrderTotal 55.000, OrderDiscount 30.000, UnitPriceInclTax 55.000, OriginUnitPriceInclTax 85.000, U22Ticket, HasManualInvoice 1 | {"Id":10206652,"OrderStatusId":30,"OrderTotal":55000,"OrderDiscount":30000,"VoucherCode":"U22Ticket","MemberCardCode":"2229055236","CustomerId":29055236,"HasManualInvoice":true,"PaymentMethodSystemName":"POS","InvNo":null,"ETicketUrl":null,"UnitPriceInclTax":5 | PASS |
| SALE-03 | In vé bằng máy in giả | 1 lệnh in, ghế đúng, giá vé 55.000 | [{"seat":"D6","price":"55.000 ₫"}] | PASS |
| SALE-04 | Không vào hàng đợi hóa đơn điện tử | 0 dòng ETicketScheduleJob/Invoice cho đơn; InvNo/ETicketUrl rỗng | Invoice 0; ETicketScheduleJob 0; InvNo null; ETicketUrl null | PASS |
| SALE-05 | Đồng bộ Mediasoft DEV khi tạo đơn (đối chiếu giá) | Mediasoft có bản ghi cộng điểm referenceId = đơn mới cho khách Test U22 | 1100 Cộng điểm khi mua 1 vé xem phim ; trước đó 10 bản ghi trang 1 | PASS |
| SALE-06 | Thẻ đã dùng U22 hôm nay | validate-voucher reason used_today | {"isValid":false,"discountAmount":0,"reason":"used_today"} | PASS |
| SALE-07 | Báo cáo doanh thu theo phim (ngày chiếu 12/11) sau khi bán | Thêm 1 vé ở cột 55.000, doanh thu thực +55.000 | 201; 55.000×1 → ×2; actual 310000 → 365000 | PASS |
| SALE-08 | Hủy đơn U22 qua Electron (luồng hủy hiện có) | POST /api/pos/order/cancel 201; đơn trạng thái 60; giá đã bán giữ nguyên | dialog chứa Đơn #10206652: true; cancel 201; DB status 60, UnitPrice 55000 | PASS |
| SALE-09 | Hoàn đơn trên Mediasoft DEV khi hủy | Bản ghi thu hồi điểm referenceId = đơn đã hủy | -1100 Thu hồi điểm tích lũy do hoàn trả vé \| 1100 Cộng điểm khi mua 1 vé xem phim  | PASS |
| SALE-10 | Sau khi hủy: thẻ dùng U22 lại được, báo cáo trở về như trước | preview applied 55.000; báo cáo 55.000 và doanh thu thực như trước bán | preview applied 55000; báo cáo 55.000×1 (trước 1), actual 310000 (trước 310000) | PASS |
| SALE-11 | An toàn: đúng 1 đơn tạo ra, không QR/thanh toán, voucher giấy không đổi | MaxOrderId +1; 0 request QR/payment; tổng UsedCount voucher giấy không đổi | MaxOrderId 10206651 → 10206652 (đơn QA 10206652; đơn khác từ người dùng DEV khác: 0); blocked []; UsedCount 55 → 55 | PASS |

#### SALE-P5P6

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| PVS-A1 | Bán vé thường (không U22) + voucher giấy LÔ-005 30.000, ghế V 85.000, tiền mặt | Báo giá còn 55.000; POST 201; OrderTotal 85.000 (voucher không trừ vào OrderTotal); header APPLIED, VoucherApplied 30.000, Remaining/Collected 55.000; usage 1; UsedCount +1 | popup còn "55.000 ₫"; 201 id 10206653; gửi pv=[{"batchId":6,"quantity":1,"faceValue":30000}] hmi=true; order {"Id":10206653,"OrderStatusId":30,"OrderTotal":85000,"OrderDiscount":0,"VoucherCode":null,"CustomerId":0,"HasManualInvoice":true,"UnitPriceInclTax":850 | PASS |
| PVS-A2 | In vé bằng máy in giả (đơn A) | 1 vé in | [{"seat":"D7","price":"85.000 ₫"}] | PASS |
| PVS-B1 | Bán U22 + voucher giấy LÔ-005, ghế V 85.000 (U22 55.000), tiền mặt | Báo giá lại có U22Ticket + expectedU22Price 55.000; POST 201; OrderTotal 55.000, giảm 30.000; voucher 30.000, thu 25.000; UsedCount +1 | popup trước U22 "55.000 ₫"; validate u22Price 55000; quote 201 gửi voucherCode U22Ticket/expected 55000 → total 55000 applied 30000 còn 25000; tạo 201 id 10206654 gửi expected 55000; order {"Id":10206654,"OrderStatusId":30,"OrderTotal":55000,"OrderDiscount":30 | PASS |
| PVS-RPT1 | Báo cáo doanh thu (ngày chiếu 12/11) sau 2 đơn voucher giấy | Thực thu +85.000 +55.000 = +140.000 (doanh thu = OrderTotal); Số lượng voucher +2; voucher áp dụng +60.000 | actual 310000 → 450000; pvQty 5 → 7; pvApplied 285000 → 345000 | PASS |
| PVS-AC | Hủy đơn A (10206653) qua Electron | cancel 201; đơn 60; header Status 30 (đảo); usage Status 30; UsedCount giữ nguyên (không hoàn voucher) | 201 hasId true; order 60; header {"Status":30,"OrderTotal":85000,"VoucherApplied":30000,"RemainingPayable":55000,"CollectedAmount":55000,"PaymentMethodSystemName":"POS"}; usage [{"BatchId":6,"Status":30,"Quantity":1,"AppliedAmount":30000}]; UsedCount 10 → 10 | PASS |
| PVS-BC | Hủy đơn B (10206654) qua Electron | cancel 201; đơn 60; header Status 30 (đảo); usage Status 30; UsedCount giữ nguyên (không hoàn voucher) | 201 hasId true; order 60; header {"Status":30,"OrderTotal":55000,"VoucherApplied":30000,"RemainingPayable":25000,"CollectedAmount":25000,"PaymentMethodSystemName":"POS"}; usage [{"BatchId":6,"Status":30,"Quantity":1,"AppliedAmount":30000}]; UsedCount 10 → 10 | PASS |
| PVS-RPT2 | Báo cáo sau khi hủy 2 đơn | Thực thu và cột voucher trở về như trước | actual 310000 (trước 310000); pvQty 5 (trước 5); pvApplied 285000 (trước 285000) | PASS |
| PVS-MS | Mediasoft DEV: đơn B (có thẻ) cộng rồi thu hồi điểm; đơn A (vãng lai) không đồng bộ | history-point có +/− cho đơn B, không có đơn A | đơn B: -1100, 1100; đơn A: 0 | PASS |
| PVS-SAFE | An toàn: chỉ 2 đơn QA, không QR/thanh toán, không request bị chặn | MaxOrderId +2 (đơn QA), blocked rỗng | đơn QA 10206653, 10206654; đơn khác 0; creates 2; blocked ["https://res.anvui.vn/dwi5f2bje/image/upload/v1793615752/attachments_ncc/admin/paper-vouchers/voucher1-1793615750989.jpg","https://res.anvui.vn/dwi5f2bje/image/upload/v1793615752/attachments_ncc/admin/ | PASS* — Kỳ vọng "blocked rỗng" quá chặt: danh sách chặn chỉ gồm ảnh lô voucher GET từ CDN res.anvui.vn (harness chặn mọi origin ngoài testapiv3). Không có QR/thanh toán, đúng 2 đơn QA, không đơn khác. |

#### BLOCKED-NOTRUN

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| BLK-01 | VietQR: tạo/đóng QR, thanh toán U22 hoặc U22 + voucher giấy bằng VietQR | — | Credential VietQR trên DEV là của production (P6 progress 24.2, .local.env = .local.prod.env): QR trả được bằng tiền thật, callback có thể không về testapiv3. Cần NCC duyệt số tiền nhỏ hoặc tài khoản VietQR sandbox. | BLOCKED |
| BLK-02 | VNPay QR | — | Credential VNPay (merchant/TMN/hash) trùng production; IPN chưa đăng ký cho testapiv3. Cần sandbox VNPay. | BLOCKED |
| BLK-03 | Hóa đơn điện tử (phát hành/hủy) | — | Không phát hành: mọi đơn bán thật đều bật "Xuất hóa đơn" (hasManualInvoice = 1) nên không vào hàng đợi (SALE-04). ETICKET_URL của container testapiv3 chưa xác minh; Setting runCronjob.publishEticket.offline = true trên DEV nên đơn POS không bật hóa đơn thủ côn | BLOCKED |
| BLK-04 | Hoàn tiền qua cổng thanh toán | — | Phụ thuộc VietQR/VNPay (BLK-01/02). Hoàn điểm Mediasoft khi hủy đã kiểm thật (SALE-09, PVS-MS). | BLOCKED |
| BLK-05 | SMS | — | Luồng POS U22/voucher giấy không gửi SMS; SMS_URL/credential DEV trùng production. Không gọi. | BLOCKED |
| NR-01 | Thẻ U22 quá 22 tuổi (converted_to_member) chạy thật | — | validate-voucher ghi CRM (hạ hạng thẻ của khách DEV có dữ liệu sao từ production) và CDC đẩy sang Mediasoft. Có unit test BE; cần một thẻ test riêng sinh trước 2004 do QA tạo. | NOT RUN |
| NR-02 | 503 U22_PRICE_CONFIG_UNAVAILABLE thật trên testapiv3 | — | Phải làm hỏng/khóa dòng U22PriceConfig trên DB DEV dùng chung (ảnh hưởng người test khác). Đã PASS thật ở BE local; trên testapiv3 chỉ kiểm hiển thị FE bằng mock (FE-11). | NOT RUN |
| NR-03 | Bộ P6 Electron E2E (paper-voucher-p6-qr.spec.ts, 31 ca) và P5/P6 MSSQL | — | Thiết kế cho BE local + DB NCC_PaperVoucher_Test + thanh toán giả lập; không chạy được với testapiv3. Nhánh FE còn thiếu e4b6c26/aaad1de (ISS-06), phải chạy lại sau khi ghép origin/main. | NOT RUN |
| NR-04 | Bán ở giá mới sau khi Admin đổi giá (đơn thật) | — | Chỉ chạy 1 chu trình bán U22 theo giá mặc định. Giá mới có hiệu lực ngay đã chứng minh bằng preview (CFG-WD-*, POS-CHG-01) và tạo đơn bị 409 với giá cũ (POS-CHG-02, FE-19); BE chấp nhận đúng giá (POS-CR-10). | NOT RUN |
| NR-05 | Độ phân giải khác 1366×768, đổi ghế/đổi suất đơn U22 | — | Ngoài phạm vi lần này (giống N-03/N-08 của QA local). | NOT RUN |

#### REAL-U22-CARDS

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| REAL-2200****60 | Thẻ U22 thật 2200****60 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****09 | Thẻ U22 thật 2200****09 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: HTTP 400 | PASS |
| REAL-2200****33 | Thẻ U22 thật 2200****33 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****91 | Thẻ U22 thật 2200****91 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****54 | Thẻ U22 thật 2200****54 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****25 | Thẻ U22 thật 2200****25 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****05 | Thẻ U22 thật 2200****05 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****24 | Thẻ U22 thật 2200****24 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****00 | Thẻ U22 thật 2200****00 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****93 | Thẻ U22 thật 2200****93 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****08 | Thẻ U22 thật 2200****08 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****42 | Thẻ U22 thật 2200****42 (sinh 2004, sắp tròn 22) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-SUM | Tổng hợp 12 thẻ U22 thật | Mọi thẻ applied đúng giá; không đơn; CRM không đổi | 12/12 đúng; MaxOrderId 10206654 → 10206654; thẻ bị đổi hạng trong CRM: 0; hạng Mediasoft DEV: {"MEMBER":11,"HTTP 400":1} | PASS |
| REAL-2200****85 | Thẻ U22 thật 2200****85 (sinh 2006) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****90 | Thẻ U22 thật 2200****90 (sinh 2012) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****15 | Thẻ U22 thật 2200****15 (sinh 2005) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****94 | Thẻ U22 thật 2200****94 (sinh 2007) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****99 | Thẻ U22 thật 2200****99 (sinh 2006) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****67 | Thẻ U22 thật 2200****67 (sinh 2014) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****03 | Thẻ U22 thật 2200****03 (sinh 2011) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-2200****14 | Thẻ U22 thật 2200****14 (sinh 2005) preview T5/T6 | applied: T5 55.000 (giảm 30.000), T6 70.000 (giảm 10.000) | T5 12/11: applied 55000/30000; T6 13/11: applied 70000/10000; hạng Mediasoft DEV: MEMBER | PASS |
| REAL-SUM2 | Tổng hợp 8 thẻ U22 thật | Mọi thẻ applied đúng giá; không đơn; CRM không đổi | 8/8 đúng; MaxOrderId 10206654 → 10206654; thẻ bị đổi hạng trong CRM: 0; hạng Mediasoft DEV: {"MEMBER":8} | PASS |

#### REPORT-QA

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| RPT-W1 | revenue-by-film Ngày chiếu 12–13/11/2026 (U22 55k/65k, U22 + voucher giấy, đơn hủy QA): từng suất × On/Off, mọi cột tiền, cơ cấu theo giá, voucher giấy = SQL | 0 lệch giữa API và SQL đối chiếu | HTTP 201 438 ms; 2 dòng suất×loại; vé 5 (SQL 5), doanh thu thực 375000 (SQL 375000); bỏ qua 20 đơn chưa hoàn tất/đã hủy; lệch 0 | PASS |
| RPT-W1-TOT | revenue-by-film RPT-W1: dòng Tổng cộng = tổng các suất | totalQuantity/actualSale/totalSale khớp tổng SQL | API tổng vé 5 / doanh thu 375000 / giá gốc 420000; SQL 5 / 375000 / 420000 | PASS |
| RPT-W2 | revenue-by-film Ngày bán 09–10/11/2026 (đơn U22/QA/voucher trên DEV): từng suất × On/Off, mọi cột tiền, cơ cấu theo giá, voucher giấy = SQL | 0 lệch giữa API và SQL đối chiếu | HTTP 201 865 ms; 3 dòng suất×loại; vé 6 (SQL 6), doanh thu thực 430000 (SQL 430000); bỏ qua 53 đơn chưa hoàn tất/đã hủy; lệch 0 | PASS |
| RPT-W2-TOT | revenue-by-film RPT-W2: dòng Tổng cộng = tổng các suất | totalQuantity/actualSale/totalSale khớp tổng SQL | API tổng vé 6 / doanh thu 430000 / giá gốc 505000; SQL 6 / 430000 / 505000 | PASS |
| RPT-W3 | revenue-by-film Ngày chiếu 07/11/2026 (22 đơn voucher giấy đã áp dụng): từng suất × On/Off, mọi cột tiền, cơ cấu theo giá, voucher giấy = SQL | 0 lệch giữa API và SQL đối chiếu | HTTP 201 278 ms; 1 dòng suất×loại; vé 39 (SQL 39), doanh thu thực 3394500 (SQL 3394500); bỏ qua 44 đơn chưa hoàn tất/đã hủy; lệch 0 | PASS |
| RPT-W3-TOT | revenue-by-film RPT-W3: dòng Tổng cộng = tổng các suất | totalQuantity/actualSale/totalSale khớp tổng SQL | API tổng vé 39 / doanh thu 3394500 / giá gốc 3650000; SQL 39 / 3394500 / 3650000 | PASS |
| RPT-W4 | revenue-by-film Ngày chiếu 27/03/2026 (dữ liệu sao production, U22 nhiều mức giá, online/QR): từng suất × On/Off, mọi cột tiền, cơ cấu theo giá, voucher giấy = SQL | 0 lệch giữa API và SQL đối chiếu | HTTP 201 343 ms; 136 dòng suất×loại; vé 2361 (SQL 2361), doanh thu thực 199946000 (SQL 199946000); bỏ qua 486 đơn chưa hoàn tất/đã hủy; lệch 0 | PASS |
| RPT-W4-TOT | revenue-by-film RPT-W4: dòng Tổng cộng = tổng các suất | totalQuantity/actualSale/totalSale khớp tổng SQL | API tổng vé 2361 / doanh thu 199946000 / giá gốc 199946000; SQL 2361 / 199946000 / 199946000 | PASS |
| RPT-W5 | revenue-by-film Ngày bán 16/07/2026 (có đơn hủy một phần 10205378): từng suất × On/Off, mọi cột tiền, cơ cấu theo giá, voucher giấy = SQL | 0 lệch giữa API và SQL đối chiếu | HTTP 201 757 ms; 2 dòng suất×loại; vé 0 (SQL 0), doanh thu thực 0 (SQL 0); bỏ qua 4 đơn chưa hoàn tất/đã hủy; lệch 0 | PASS |
| RPT-W5-TOT | revenue-by-film RPT-W5: dòng Tổng cộng = tổng các suất | totalQuantity/actualSale/totalSale khớp tổng SQL | API tổng vé 0 / doanh thu 0 / giá gốc 0; SQL 0 / 0 / 0 | PASS |
| RPT-W6 | revenue-by-film Ngày bán 15/06/2026 (ngày production lớn): từng suất × On/Off, mọi cột tiền, cơ cấu theo giá, voucher giấy = SQL | 0 lệch giữa API và SQL đối chiếu | HTTP 201 866 ms; 199 dòng suất×loại; vé 3016 (SQL 3016), doanh thu thực 235566000 (SQL 235566000); bỏ qua 385 đơn chưa hoàn tất/đã hủy; lệch 0 | PASS |
| RPT-W6-TOT | revenue-by-film RPT-W6: dòng Tổng cộng = tổng các suất | totalQuantity/actualSale/totalSale khớp tổng SQL | API tổng vé 3016 / doanh thu 235566000 / giá gốc 240705000; SQL 3016 / 235566000 / 240705000 | PASS |
| RPT-W1-INV1 | RPT-W1: doanh thu báo cáo = tiền đơn (Σ OrderTotal đơn hoàn tất) — không tính voucher hai lần | Σ PriceInclTax = Σ OrderTotal theo từng đơn; Σ báo cáo = Σ OrderTotal | 4 đơn; đơn lệch OrderTotal ≠ Σ item: 0; Σ OrderTotal 375000 vs báo cáo 375000 | PASS |
| RPT-W1-INV2 | RPT-W1: "Thực nộp" (offline) = tiền mặt thực thu | actualSale − VietQR − VNPayQR − voucher áp dụng = Σ OrderTotal đơn POS không voucher + Σ CollectedAmount đơn POS có voucher | Thực nộp theo báo cáo 90000; tiền mặt từ dữ liệu 90000; đơn offline phương thức khác POS/VietQR/VNPay: 0 (0đ, ) | PASS |
| RPT-W2-INV1 | RPT-W2: doanh thu báo cáo = tiền đơn (Σ OrderTotal đơn hoàn tất) — không tính voucher hai lần | Σ PriceInclTax = Σ OrderTotal theo từng đơn; Σ báo cáo = Σ OrderTotal | 5 đơn; đơn lệch OrderTotal ≠ Σ item: 0; Σ OrderTotal 430000 vs báo cáo 430000 | PASS |
| RPT-W2-INV2 | RPT-W2: "Thực nộp" (offline) = tiền mặt thực thu | actualSale − VietQR − VNPayQR − voucher áp dụng = Σ OrderTotal đơn POS không voucher + Σ CollectedAmount đơn POS có voucher | Thực nộp theo báo cáo 90000; tiền mặt từ dữ liệu 90000; đơn offline phương thức khác POS/VietQR/VNPay: 0 (0đ, ) | PASS |
| RPT-W3-INV1 | RPT-W3: doanh thu báo cáo = tiền đơn (Σ OrderTotal đơn hoàn tất) — không tính voucher hai lần | Σ PriceInclTax = Σ OrderTotal theo từng đơn; Σ báo cáo = Σ OrderTotal | 27 đơn; đơn lệch OrderTotal ≠ Σ item: 0; Σ OrderTotal 3394500 vs báo cáo 3394500 | PASS |
| RPT-W3-INV2 | RPT-W3: "Thực nộp" (offline) = tiền mặt thực thu | actualSale − VietQR − VNPayQR − voucher áp dụng = Σ OrderTotal đơn POS không voucher + Σ CollectedAmount đơn POS có voucher | Thực nộp theo báo cáo 1547500; tiền mặt từ dữ liệu 1547500; đơn offline phương thức khác POS/VietQR/VNPay: 0 (0đ, ) | PASS |
| RPT-W4-INV1 | RPT-W4: doanh thu báo cáo = tiền đơn (Σ OrderTotal đơn hoàn tất) — không tính voucher hai lần | Σ PriceInclTax = Σ OrderTotal theo từng đơn; Σ báo cáo = Σ OrderTotal | 1234 đơn; đơn lệch OrderTotal ≠ Σ item: 0; Σ OrderTotal 199946000 vs báo cáo 199946000 | PASS |
| RPT-W4-INV2 | RPT-W4: "Thực nộp" (offline) = tiền mặt thực thu | actualSale − VietQR − VNPayQR − voucher áp dụng = Σ OrderTotal đơn POS không voucher + Σ CollectedAmount đơn POS có voucher | Thực nộp theo báo cáo 26064000; tiền mặt từ dữ liệu 0; đơn offline phương thức khác POS/VietQR/VNPay: 248 (26064000đ, Pos) | PASS* — Harness so sánh phương thức phân biệt hoa thường; dữ liệu 03/2026 ghi "Pos". Collation SQL Server không phân biệt hoa thường nên báo cáo coi "Pos" là tiền mặt: Thực nộp 26.064.000 = đúng Σ 248 đơn "Pos" (không QR, không voucher). |
| RPT-W5-INV1 | RPT-W5: doanh thu báo cáo = tiền đơn (Σ OrderTotal đơn hoàn tất) — không tính voucher hai lần | Σ PriceInclTax = Σ OrderTotal theo từng đơn; Σ báo cáo = Σ OrderTotal | 0 đơn; đơn lệch OrderTotal ≠ Σ item: 0; Σ OrderTotal 0 vs báo cáo 0 | PASS |
| RPT-W5-INV2 | RPT-W5: "Thực nộp" (offline) = tiền mặt thực thu | actualSale − VietQR − VNPayQR − voucher áp dụng = Σ OrderTotal đơn POS không voucher + Σ CollectedAmount đơn POS có voucher | Thực nộp theo báo cáo 0; tiền mặt từ dữ liệu 0; đơn offline phương thức khác POS/VietQR/VNPay: 0 (0đ, ) | PASS |
| RPT-W6-INV1 | RPT-W6: doanh thu báo cáo = tiền đơn (Σ OrderTotal đơn hoàn tất) — không tính voucher hai lần | Σ PriceInclTax = Σ OrderTotal theo từng đơn; Σ báo cáo = Σ OrderTotal | 1398 đơn; đơn lệch OrderTotal ≠ Σ item: 0; Σ OrderTotal 235566000 vs báo cáo 235566000 | PASS |
| RPT-W6-INV2 | RPT-W6: "Thực nộp" (offline) = tiền mặt thực thu | actualSale − VietQR − VNPayQR − voucher áp dụng = Σ OrderTotal đơn POS không voucher + Σ CollectedAmount đơn POS có voucher | Thực nộp theo báo cáo 34780000; tiền mặt từ dữ liệu 34780000; đơn offline phương thức khác POS/VietQR/VNPay: 0 (0đ, ) | PASS |
| RPT-U22-01 | Vé U22 vào cột giá thực bán (55.000 và 65.000) chứ không vào giá gốc hay 55.000 cố định | Mỗi vé U22 nằm ở cột UnitPriceInclTax của nó | đơn 10206605 suất 410031: lưu 65000 (gốc 80000); cột 65000 của báo cáo = 1 vé; đơn 10206588 suất 410027: lưu 55000 (gốc 85000); cột 55000 của báo cáo = 1 vé | PASS |
| RPT-U22-02 | Đổi cấu hình giá không làm đổi giá lịch sử: đơn 10206605 (U22 T6 bán 65.000 khi cấu hình T6 = 65.000; cấu hình nay T6 = 70.000, đã đổi 16 lần trong phiên) | Báo cáo giữ 65.000 | cấu hình T6 hiện 70000, version 203; OrderItem 65000; cột 65.000 của suất 410031 = 1, cột 70.000 = 0 | PASS |
| RPT-U22-03 | Dữ liệu U22 lịch sử 27/03/2026 nhiều mức giá (quy tắc cũ) vẫn vào đúng cột giá đã lưu | Mọi mức giá U22 có trong OrderItem đều có cột tương ứng | U22 theo giá lưu: {"55000":38,"80000":1,"95000":1,"105000":1}; có cột: true | PASS |
| RPT-REG-01 | Vé thường không bị ảnh hưởng bởi U22 (27/03/2026): cột giá = vé thường theo giá gốc + vé giảm nội bộ theo giá bán + vé U22 theo giá U22 | Mọi cột khớp tách nhóm | 1204 dòng vé thường, 0 dòng giảm nội bộ, 41 dòng U22; cột lệch: 0 | PASS* — Mọi cột giá > 0 khớp tách nhóm (vé thường theo giá gốc, U22 theo giá U22). Chênh lệch duy nhất là nhóm 0đ (143 vé POS) mà báo cáo cố ý bỏ khỏi cơ cấu giá: xem RPT-ZERO. |
| RPT-CAN-01 | Đơn đã hủy (trạng thái 60) không vào báo cáo: 20 đơn hủy ở 410027/410031 (gồm 3 đơn QA đã bán rồi hủy) | Số vé/doanh thu chỉ gồm đơn 30 | đơn hủy 20 (20 vé), trong đó QA 3; báo cáo 410027 off: 4 vé, 410031 off: 1 vé = SQL chỉ đơn 30 | PASS |
| RPT-CAN-02 | Hủy một phần (đơn 10205378, 16/07/2026): chỉ ghế còn lại vào báo cáo | Ghế đã hủy không còn trong OrderItem; báo cáo suất đó = SQL (đã PASS ở RPT-W5) | Đơn 10205378 là đơn HỢP ĐỒNG (IsContract = 1). 19 ghế đã hủy (CancelTicket) không còn trong OrderItem; ghế còn lại: suất 408928 = 6 (5 + 1), suất 408929 = 1. Báo cáo ngày bán 16/07: suất 408928 Offline cột Hợp đồng = 6 = SQL; RPT-W5 0 lệch mọi cột | PASS |
| RPT-CAN-03 | Đơn có trạng thái hoàn tiền (RefundStatusId) từ 06/2026 | Ghi nhận cách báo cáo xử lý: chỉ đơn OrderStatusId = 30 được tính | 23 đơn có RefundStatusId, trong đó 0 đơn vẫn 30 (sẽ được tính) | PASS — Mọi đơn có trạng thái hoàn tiền đều đã rời trạng thái 30 nên không vào báo cáo |
| RPT-PV-01 | Voucher giấy 07/11 (22 đơn): tách giá vé / phần voucher / tiền khách trả | OrderTotal = VoucherApplied + RemainingPayable; tiền mặt = RemainingPayable; báo cáo: doanh thu = Σ OrderTotal (một lần), số voucher, tiền thừa, voucher áp dụng = Σ header | 22 header APPLIED, 22 nhất quán; báo cáo 410026 off: doanh thu 3394500, voucher SL 31, tiền thừa 83000, áp dụng 1847000; Σ header: OrderTotal 2701000, SL 31, thừa 83000, áp dụng 1847000 | PASS |
| RPT-PV-02 | U22 + voucher giấy (đơn 10206588, 410027): giá vé U22 55.000, voucher trừ ở cột voucher, không trừ lần hai trong doanh thu | Doanh thu suất = Σ OrderTotal; voucher áp dụng = Σ header; Thực nộp = doanh thu − QR − voucher | 410027 off: doanh thu 310000, giá 55.000 ×1, voucher áp dụng 285000 (Σ header 285000), VietQR 0, Thực nộp 25000 | PASS |
| RPT-PV-03 | Header voucher chưa áp dụng / đã đảo (Status 20, 30) không vào báo cáo | Chỉ Status 10 của đơn 30 được tính | 32 header khác 10 trong W1/W3 bị loại; số liệu voucher báo cáo = Σ Status 10 (RPT-W1, RPT-W3 PASS) | PASS |
| RPT-F-FILM | Bộ lọc phim 11118 (ngày chiếu 27/03/2026) | Chỉ dữ liệu khớp bộ lọc; số liệu = SQL có cùng điều kiện | HTTP 201; 16 dòng, phim trong kết quả: 11118; vé 561 (SQL 561); lệch 0 | PASS |
| RPT-F-USER | Bộ lọc nhân viên in vé 39193137 (ngày chiếu 27/03/2026) | Chỉ dữ liệu khớp bộ lọc; số liệu = SQL có cùng điều kiện | HTTP 201; 68 dòng, phim trong kết quả: 11011,11060,11101,11133,11041…; vé 271 (SQL 271); lệch 0 | PASS |
| RPT-F-MANU | Bộ lọc hãng 29 (ngày chiếu 27/03/2026) | Chỉ dữ liệu khớp bộ lọc; số liệu = SQL có cùng điều kiện | HTTP 201; 96 dòng, phim trong kết quả: 11039,11060,11101,11041,11088…; vé 1614 (SQL 1614); lệch 0 | PASS |
| RPT-F-DATE | Biên ngày: theo ngày bán, toDate chỉ có ngày (không giờ) so với toDate cuối ngày như FE gửi | Ghi nhận hành vi | toDate "2026-11-09": 0 vé; toDate "…T23:59:59+07:00": 6 vé | PASS* — API so CreatedOnUtc <= toDate: gửi toDate không kèm giờ sẽ bỏ các đơn trong ngày (hành vi cũ, FE luôn gửi cuối ngày nên UI không bị) |
| RPT-F-RANGE | Khoảng ngày đảo (từ > đến) | Không lỗi 500; không có dữ liệu | HTTP 201; 0 vé | PASS |
| RPT-ZERO | Cơ cấu theo mức giá cộng lại = tổng vé (27/03/2026) | Σ số vé các cột giá = Tổng vé | Tổng vé 2.361; Σ cột giá 2.218; thiếu 143 vé giá 0đ (58 dòng OrderItem, POS offline, không phải U22, không mời/hợp đồng): service bỏ giá 0 khỏi priceHeaders/prices (report.service.ts groupPricesByPlanScreen: if (!row.price) return) | FAIL — Lỗi có sẵn, không thuộc U22 (P3): người xem cộng các cột giá sẽ không ra Tổng vé khi có vé 0đ |
| REV-A-FILM | Báo cáo "Doanh thu bán vé" tab Phim, ngày bán 2026-11-09…2026-11-10: từng phim = SQL | 0 lệch (vé online/offline/tổng, VietQR, doanh thu online/offline/tổng) | HTTP 201; 2 phim (SQL 2, thiếu 0); lệch 0 | PASS |
| REV-A-FILM-VQ | Tab Phim, cột "Doanh thu VietQR" (2026-11-09…2026-11-10) là VietQR online hay tại quầy? | Ghi nhận ngữ nghĩa cột | API 0 = VietQR ONLINE 0; VietQR tại quầy 55000 không có cột riêng (nằm trong "Doanh thu Offline") | PASS* — SQL đặt tên offSaleVietQr nhưng lọc IsOnline = 1; cột FE "Doanh thu VietQR" không ghi rõ online. Có sẵn, không thuộc U22 |
| REV-A-STAFF | Báo cáo "Doanh thu bán vé" tab Nhân viên, ngày bán 2026-11-09…2026-11-10: từng nhân viên = SQL (QR đã trừ phần voucher giấy) | 0 lệch các cột FE hiển thị | HTTP 201; 1 nhân viên (SQL 1); lệch 0 | PASS |
| REV-A-STAFF-ACT | Trường API actualOffSale (tab Nhân viên, 2026-11-09…2026-11-10): PriceInclTax − DiscountAmountInclTax | Doanh thu thực tại quầy = Σ PriceInclTax (PriceInclTax đã là giá sau giảm) | API Σ actualOffSale 280000; Σ PriceInclTax offline 310000; chênh 30000 = Σ DiscountAmountInclTax 30000 (trong đó U22 30000) → giảm giá bị trừ hai lần | FAIL — Trường không hiển thị trên FE (tab Nhân viên hiển thị totalSale). Có sẵn, ảnh hưởng mọi vé có giảm, kể cả U22 |
| REV-B-FILM | Báo cáo "Doanh thu bán vé" tab Phim, ngày bán 2026-06-15…2026-06-15: từng phim = SQL | 0 lệch (vé online/offline/tổng, VietQR, doanh thu online/offline/tổng) | HTTP 201; 19 phim (SQL 19, thiếu 0); lệch 0 | PASS |
| REV-B-FILM-VQ | Tab Phim, cột "Doanh thu VietQR" (2026-06-15…2026-06-15) là VietQR online hay tại quầy? | Ghi nhận ngữ nghĩa cột | API 53120000 = VietQR ONLINE 53120000; VietQR tại quầy 46781000 không có cột riêng (nằm trong "Doanh thu Offline") | PASS* — SQL đặt tên offSaleVietQr nhưng lọc IsOnline = 1; cột FE "Doanh thu VietQR" không ghi rõ online. Có sẵn, không thuộc U22 |
| REV-B-STAFF | Báo cáo "Doanh thu bán vé" tab Nhân viên, ngày bán 2026-06-15…2026-06-15: từng nhân viên = SQL (QR đã trừ phần voucher giấy) | 0 lệch các cột FE hiển thị | HTTP 201; 5 nhân viên (SQL 5); lệch 0 | PASS |
| REV-B-STAFF-ACT | Trường API actualOffSale (tab Nhân viên, 2026-06-15…2026-06-15): PriceInclTax − DiscountAmountInclTax | Doanh thu thực tại quầy = Σ PriceInclTax (PriceInclTax đã là giá sau giảm) | API Σ actualOffSale 76422000; Σ PriceInclTax offline 81561000; chênh 5139000 = Σ DiscountAmountInclTax 5139000 (trong đó U22 2115000) → giảm giá bị trừ hai lần | FAIL — Trường không hiển thị trên FE (tab Nhân viên hiển thị totalSale). Có sẵn, ảnh hưởng mọi vé có giảm, kể cả U22 |
| RPT-DAY-01 | revenue-day-in-month 2026-06-10…2026-06-16 (theo ngày in vé) = SQL | Vé, doanh thu, cột giá (UnitPriceInclTax: U22 theo giá bán) khớp SQL | HTTP 201; 14 dòng ngày×loại; lệch 0 | PASS |
| RPT-DAY-02 | revenue-day-in-month: Σ cột giá so với Tổng vé | Cộng các cột giá = Tổng vé | Tổng vé 20890; Σ cột giá 23661: cột giá đếm mọi vé in trong ngày (kể cả vé mời/hợp đồng, vé chiếu ngày khác), Tổng vé chỉ đếm vé bán chiếu trong ngày in | FAIL — Có sẵn, không thuộc U22 (P3): hai điều kiện lọc khác nhau trong cùng một báo cáo |
| RPT-U22USE-01 | u22-usage ngày in 15/06/2026: nguồn CRM | Báo cáo trên testapiv3 đọc CRM DEV (CinemaCrmDev) như phần còn lại của môi trường | HTTP 201; API 86 dòng, 86 vé, 4730000đ. Nếu dùng CRM DEV: 23 vé, 1265000đ. Dòng API có mã thẻ không thuộc đơn DEV: 0; mã thẻ có trong đơn DEV nhưng khách KHÔNG phải "U22 Member" trong CRM DEV: 63. SQL join cứng CinemaCrm2023.dbo.CRM_Customer (DB CRM production | FAIL — Kể cả khi số liệu trùng, câu SQL vẫn đọc DB production: kết quả trùng chỉ vì dữ liệu tháng 6 có trước thời điểm sao DB |
| RPT-U22USE-02 | u22-usage ngày in 15/06/2026: ngữ nghĩa "vé U22" | Báo cáo sử dụng U22 = đơn có ưu đãi U22 (VoucherCode U22Ticket), số vé và tiền theo giá thực bán | Đơn U22Ticket in ngày đó: 87 vé, 4785000đ. Báo cáo: 86 vé, 4730000đ (lọc theo hạng thẻ hiện tại "U22 Member", không theo VoucherCode; lọc ngày theo PrintedOnUtc nhưng hiển thị CreatedOnUtc) | FAIL |
| RPT-U22USE-03 | u22-usage với đơn U22 hoàn tất nhưng chưa in (DEV 09/11: 10206588, 10206605, 10206611) | Ghi nhận | 3 đơn U22 hoàn tất có PrintedOnUtc = NULL không bao giờ vào báo cáo này (lọc theo ngày in), trong khi revenue-by-film có tính | PASS* — Trên POS thật vé được in ngay nên ít gặp; ghi nhận để PO quyết định |
| RPT-U22USE-04 | u22-usage gọi KHÔNG token trên testapiv3 | 401 (báo cáo chứa họ tên + số thẻ khách) | HTTP 201; 86 dòng; có họ tên: true; có số thẻ: true (không lưu giá trị) | FAIL — /api/reports/* để @AuthStaff() bị comment (report.controller.ts:38). Kết hợp RPT-U22USE-01: ai biết URL testapiv3 đều đọc được họ tên + số thẻ từ CRM production |

#### DATASET-SETUP

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| STAFF-01-CREATE | Tạo nhân viên QA_U22_01 (vai trò 8 Bộ phận bán vé) qua POST /api/pos/staff | 2xx | 201 {"dataValues":{"id":null},"_previousDataValues":{},"uniqno":1,"_changed":[],"_options":{"isNewRecord":true,"_schema":null,"_schemaDelimiter":""},"isNewRecord":t | PASS |
| STAFF-01-LOGIN | Đăng nhập thật QA_U22_01, kiểm quyền | Đăng nhập OK; có bán/in/xuất HĐ thủ công (showtimes.create/update/print) + hủy vé; KHÔNG có quyền sửa user/role/giá/ngày lễ/cài đặt | user_id 39193164; showtimes access,list,view,create,update,print; cancellation_tickets access,list,view,update,delete; báo cáo ticket_sales_revenue,staff_revenue_report; quyền vượt mức: không | PASS |
| STAFF-02-CREATE | Tạo nhân viên QA_U22_02 (vai trò 8 Bộ phận bán vé) qua POST /api/pos/staff | 2xx | 201 {"dataValues":{"id":null},"_previousDataValues":{},"uniqno":1,"_changed":[],"_options":{"isNewRecord":true,"_schema":null,"_schemaDelimiter":""},"isNewRecord":t | PASS |
| STAFF-02-LOGIN | Đăng nhập thật QA_U22_02, kiểm quyền | Đăng nhập OK; có bán/in/xuất HĐ thủ công (showtimes.create/update/print) + hủy vé; KHÔNG có quyền sửa user/role/giá/ngày lễ/cài đặt | user_id 39193165; showtimes access,list,view,create,update,print; cancellation_tickets access,list,view,update,delete; báo cáo ticket_sales_revenue,staff_revenue_report; quyền vượt mức: không | PASS |
| STAFF-03-CREATE | Tạo nhân viên QA_U22_03 (vai trò 8 Bộ phận bán vé) qua POST /api/pos/staff | 2xx | 201 {"dataValues":{"id":null},"_previousDataValues":{},"uniqno":1,"_changed":[],"_options":{"isNewRecord":true,"_schema":null,"_schemaDelimiter":""},"isNewRecord":t | PASS |
| STAFF-03-LOGIN | Đăng nhập thật QA_U22_03, kiểm quyền | Đăng nhập OK; có bán/in/xuất HĐ thủ công (showtimes.create/update/print) + hủy vé; KHÔNG có quyền sửa user/role/giá/ngày lễ/cài đặt | user_id 39193166; showtimes access,list,view,create,update,print; cancellation_tickets access,list,view,update,delete; báo cáo ticket_sales_revenue,staff_revenue_report; quyền vượt mức: không | PASS |
| CARD-01-REG | Đăng ký khách QA qa.u22.card01@qa-ncc.invalid qua POST /api/web/v1/web-customers/Register (BE cấp số thẻ) | 2xx, thẻ Member | 201 {"StatusCode":30,"Status":"Đăng Ký thành công","CustomerId":29056316} | PASS |
| CARD-01-U22 | Nâng khách QA 29056316 lên U22 qua PUT /api/v1/internal/web-customers/:id (đường tích hợp Mediasoft → NCC) | 2xx | 200 | PASS |
| CARD-01-CHECK | Thẻ U22 QA 01 dùng được ở POS | CRM: U22 Member / CurrentCardId 12; preview suất T5 = applied 55.000 | Id 29056316, thẻ 2872…(thẻ QA), U22 Member/12; preview {"isValid":true,"discountAmount":30000,"reason":"applied","u22Price":55000} | PASS |
| CARD-02-REG | Đăng ký khách QA qa.u22.card02@qa-ncc.invalid qua POST /api/web/v1/web-customers/Register (BE cấp số thẻ) | 2xx, thẻ Member | 201 {"StatusCode":30,"Status":"Đăng Ký thành công","CustomerId":29056317} | PASS |
| CARD-02-U22 | Nâng khách QA 29056317 lên U22 qua PUT /api/v1/internal/web-customers/:id (đường tích hợp Mediasoft → NCC) | 2xx | 200 | PASS |
| CARD-02-CHECK | Thẻ U22 QA 02 dùng được ở POS | CRM: U22 Member / CurrentCardId 12; preview suất T5 = applied 55.000 | Id 29056317, thẻ 2872…(thẻ QA), U22 Member/12; preview {"isValid":true,"discountAmount":30000,"reason":"applied","u22Price":55000} | PASS |
| CARD-03-REG | Đăng ký khách QA qa.u22.card03@qa-ncc.invalid qua POST /api/web/v1/web-customers/Register (BE cấp số thẻ) | 2xx, thẻ Member | 201 {"StatusCode":30,"Status":"Đăng Ký thành công","CustomerId":29056318} | PASS |
| CARD-03-U22 | Nâng khách QA 29056318 lên U22 qua PUT /api/v1/internal/web-customers/:id (đường tích hợp Mediasoft → NCC) | 2xx | 200 | PASS |
| CARD-03-CHECK | Thẻ U22 QA 03 dùng được ở POS | CRM: U22 Member / CurrentCardId 12; preview suất T5 = applied 55.000 | Id 29056318, thẻ 2872…(thẻ QA), U22 Member/12; preview {"isValid":true,"discountAmount":30000,"reason":"applied","u22Price":55000} | PASS |
| PVB-CREATE | Tạo lô voucher giấy QA (10 × 30.000đ) qua POST /api/pos/paper-vouchers/batches | 2xx | 201 {"id":30,"batchCode":"LÔ-029","name":"QA U22 testapiv3 (dataset 10/11/2026)","faceValue":30000,"totalQuantity":10,"usedCount":0,"remainingQuantity":10,"validFrom":null,"expiresAt":"2026-12-31","isLock | PASS |
| SCR-410028 | Bật lại suất fixture QA 410028 (phim 11267, tạo bởi phiên QA trước) qua PATCH /api/pos/plan-screenings/:id | Deleted = 0; trước đó không có đơn đang hoạt động | đã bật sẵn; Deleted false → false; đơn hoạt động trước khi bật: 0 | PASS |
| SCR-410029 | Bật lại suất fixture QA 410029 (phim 11267, tạo bởi phiên QA trước) qua PATCH /api/pos/plan-screenings/:id | Deleted = 0; trước đó không có đơn đang hoạt động | đã bật sẵn; Deleted false → false; đơn hoạt động trước khi bật: 0 | PASS |

#### DATASET

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| S1-LOGIN | Phiên S1: máy QAP1, đăng nhập QA_U22_01 | Máy cấu hình qua Cài đặt; đăng nhập 201 | đã cấu hình QAP1; login 201 | PASS |
| O01-ERR | O01 lỗi | — | ghế [4:6] không chọn được | PASS* — Lần bán đầu tiên ngay sau đăng nhập: ghế chưa vào trạng thái chọn vì kết nối giữ ghế chưa sẵn sàng (harness chờ 1,3 s). Tăng thời gian chờ, O01 bán thành công ở lượt chạy lại (đơn 10206678, DS-O01 PASS). Không phải lỗi app. |
| O02-SELL | O02 U22 suất 410027 ghế [3:10] — QA_U22_01 @ QAP1 | 201, đơn tạo | 201 id 10206655; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 55.000 ₫"; in 1 vé | PASS |
| O03-SELL | O03 REG suất 410027 ghế [0:2],[0:3] — QA_U22_01 @ QAP1 | 201, đơn tạo | 201 id 10206656; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 160.000 ₫"; in 2 vé | PASS |
| O04-SELL | O04 REG+PV suất 410031 ghế [4:7] — QA_U22_01 @ QAP1 | 201, đơn tạo | 201 id 10206657; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 80.000 ₫"; in 1 vé | PASS |
| O05-SELL | O05 REG suất 410031 ghế [0:5] — QA_U22_01 @ QAP1 | 201, đơn tạo | 201 id 10206658; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 70.000 ₫"; in 1 vé | PASS |
| X-O02 | Hủy O02 (đơn 10206655) — QA_U22_01 @ QAP1 | cancel 201 | 201; dialog: Hủy toàn bộ đơn vé? Đơn #10206655 gồm 1 ghế: D11 Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn mới. | PASS |
| S2-LOGIN | Phiên S2: máy QAP2, đăng nhập QA_U22_02 | Máy cấu hình qua Cài đặt; đăng nhập 201 | admin đặt qua Cài đặt → Cấu hình máy POS: QA POS U22 02 (testapiv3) / QAP2; login 201 | PASS |
| O06-SELL | O06 U22 suất 410028 ghế [4:8] — QA_U22_02 @ QAP2 | 201, đơn tạo | 201 id 10206659; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 55.000 ₫"; in 1 vé | PASS |
| O07-SELL | O07 REG suất 410029 ghế [4:6],[4:7],[0:6] — QA_U22_02 @ QAP2 | 201, đơn tạo | 201 id 10206660; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 280.000 ₫"; in 3 vé | PASS |
| O08-SELL | O08 U22 suất 410029 ghế [4:9] — QA_U22_02 @ QAP2 | 201, đơn tạo | 201 id 10206661; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 70.000 ₫"; in 1 vé | PASS |
| O09-SELL | O09 REG suất 410027 ghế [11:3] — QA_U22_02 @ QAP2 | 201, đơn tạo | 201 id 10206662; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 90.000 ₫"; in 1 vé | PASS |
| O10-SELL | O10 U22+PV suất 410031 ghế [4:9] — QA_U22_02 @ QAP2 | 201, đơn tạo | 201 id 10206663; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 70.000 ₫"; in 1 vé | PASS |
| X-O05 | Hủy O05 (đơn 10206658) — QA_U22_02 @ QAP2 | cancel 201 | 201; dialog: Hủy toàn bộ đơn vé? Đơn #10206658 gồm 1 ghế: A12 Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn mới. | PASS |
| S3-LOGIN | Phiên S3: máy QAP1, đăng nhập QA_U22_03 | Máy cấu hình qua Cài đặt; đăng nhập 201 | đã cấu hình QAP1; login 201 | PASS |
| O11-SELL | O11 REG suất 410031 ghế [4:10] — QA_U22_03 @ QAP1 | 201, đơn tạo | 201 id 10206664; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 80.000 ₫"; in 1 vé | PASS |
| X-O08 | Hủy O08 (đơn 10206661) — QA_U22_03 @ QAP1 | cancel 201 | 201; dialog: Hủy toàn bộ đơn vé? Đơn #10206661 gồm 1 ghế: E20 Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn mới. | PASS |
| O12-SELL | O12 U22 suất 410029 ghế [4:10] — QA_U22_03 @ QAP1 | 201, đơn tạo | 201 id 10206665; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 70.000 ₫"; in 1 vé | PASS |
| O13-SELL | O13 REG suất 410029 ghế [0:7] — QA_U22_03 @ QAP1 | 201, đơn tạo | 201 id 10206666; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 90.000 ₫"; in 1 vé | PASS |
| O14-SELL | O14 REG suất 410028 ghế [0:4],[0:5] — QA_U22_03 @ QAP1 | 201, đơn tạo | 201 id 10206667; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 140.000 ₫"; in 2 vé | PASS |
| X-O10 | Hủy O10 (đơn 10206663) — QA_U22_03 @ QAP1 | cancel 201 | 201; dialog: Hủy toàn bộ đơn vé? Đơn #10206663 gồm 1 ghế: E20 Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn mới. | PASS |
| O20-SELL | O20 U22 suất 410027 ghế [3:11] — QA_U22_03 @ QAP1 | 201, đơn tạo | 201 id 10206668; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 55.000 ₫"; in 1 vé | PASS |
| S4-LOGIN | Phiên S4: máy QAP2, đăng nhập QA_U22_01 | Máy cấu hình qua Cài đặt; đăng nhập 201 | đã cấu hình QAP2; login 201 | PASS |
| CFG-FRI-72000 | Đổi giá U22 Thứ 6 = 72000 (tạm thời, admin) | 200 | 200 v204 | PASS |
| O15-SELL | O15 U22 suất 410031 ghế [4:11] — QA_U22_01 @ QAP2 | 201, đơn tạo | 201 id 10206669; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 72.000 ₫"; in 1 vé | PASS |
| O16-SELL | O16 REG suất 410031 ghế [4:12] — QA_U22_01 @ QAP2 | 201, đơn tạo | 201 id 10206670; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 80.000 ₫"; in 1 vé | PASS |
| CFG-FRI-70000 | Đổi giá U22 Thứ 6 = 70000 (tạm thời, admin) | 200 | 200 v205 | PASS |
| X-O20 | Hủy O20 (đơn 10206668) — QA_U22_01 @ QAP2 | cancel 201 | 201; dialog: Hủy toàn bộ đơn vé? Đơn #10206668 gồm 1 ghế: D12 Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn mới. | PASS |
| O17-SELL | O17 U22+PV suất 410027 ghế [3:8] — QA_U22_01 @ QAP2 | 201, đơn tạo | 201 id 10206671; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 55.000 ₫"; in 1 vé | PASS |
| O18-SELL | O18 REG+PV suất 410028 ghế [4:9] — QA_U22_01 @ QAP2 | 201, đơn tạo | 201 id 10206672; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 75.000 ₫"; in 1 vé | PASS |
| O19-SELL | O19 REG suất 410027 ghế [3:9] — QA_U22_01 @ QAP2 | 201, đơn tạo | 201 id 10206673; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 85.000 ₫"; in 1 vé | PASS |
| S5-LOGIN | Phiên S5: máy QAP1, đăng nhập QA_U22_02 | Máy cấu hình qua Cài đặt; đăng nhập 201 | đã cấu hình QAP1; login 201 | PASS |
| O21-SELL | O21 REG suất 410028 ghế [4:10] — QA_U22_02 @ QAP1 | 201, đơn tạo | 201 id 10206674; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 75.000 ₫"; in 1 vé | PASS |
| O22-SELL | O22 REG suất 410027 ghế [0:4] — QA_U22_02 @ QAP1 | 201, đơn tạo | 201 id 10206675; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 80.000 ₫"; in 1 vé | PASS |
| X-O14 | Hủy O14 (đơn 10206667) — QA_U22_02 @ QAP1 | cancel 201 | 201; dialog: Hủy toàn bộ đơn vé? Đơn #10206667 gồm 2 ghế: A10, A12 Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn | PASS |
| O23-SELL | O23 REG suất 410029 ghế [4:11] — QA_U22_02 @ QAP1 | 201, đơn tạo | 201 id 10206676; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 95.000 ₫"; in 1 vé | PASS |
| X-O18 | Hủy O18 (đơn 10206672) — QA_U22_02 @ QAP1 | cancel 201 | 201; dialog: Hủy toàn bộ đơn vé? Đơn #10206672 gồm 1 ghế: E20 Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn mới. | PASS |
| S6-LOGIN | Phiên S6: máy QAP2, đăng nhập QA_U22_03 | Máy cấu hình qua Cài đặt; đăng nhập 201 | đã cấu hình QAP2; login 201 | PASS |
| O24-SELL | O24 REG suất 410031 ghế [0:6],[0:7] — QA_U22_03 @ QAP2 | 201, đơn tạo | 201 id 10206677; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 140.000 ₫"; in 2 vé | PASS |
| X-O23 | Hủy O23 (đơn 10206676) — QA_U22_03 @ QAP2 | cancel 201 | 201; dialog: Hủy toàn bộ đơn vé? Đơn #10206676 gồm 1 ghế: E24 Bạn không thể hủy riêng từng ghế. Sau khi hủy, bạn cần đặt lại đơn mới. | PASS |
| O01-SELL | O01 REG suất 410028 ghế [4:6] — QA_U22_01 @ QAP1 | 201, đơn tạo | 201 id 10206678; UI trước bán "Thành tiền"; sau bán "Xuất hóa đơn Tiền vừa bán: 75.000 ₫"; in 1 vé | PASS |
| DS-SUMMARY | Độ phủ bộ dữ liệu QA giữ lại trên DEV | ≈24 đơn (14 thường, 6 U22, 2 thường+voucher, 2 U22+voucher), ≈16 thành công / 8 hủy, ≥3 phim, ≥3 NV, ≥2 máy, mỗi nhóm có đơn thành công và hủy, bán xen kẽ | 24 đơn (10206655–10206678), 16 thành công / 8 hủy; nhóm {"U22":{"kept":3,"canc":3},"REG":{"kept":11,"canc":3},"REG+PV":{"kept":1,"canc":1},"U22+PV":{"kept":1,"canc":1}}; phim {"11246":7,"11267":10,"11269":7}; NV {"QA_U22_01":10,"QA_U22_02":8,"QA_U22_03":6}; má | PASS |
| DS-POS-ID | Nhận diện máy POS | 2 máy phân biệt được trong hệ thống | Máy POS = cấu hình cục bộ trên từng máy (Cài đặt → Cấu hình máy POS, lưu localStorage "pos-settings"), gửi kèm mỗi đơn và lưu OrderItem.PosName/PosShortName. Đặt bằng admin qua UI trên 2 profile Electron riêng: QAP1 "QA POS U22 01 (testapiv3)", QAP2 "QA POS U2 | PASS |

#### U22-REG

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| DS-O02 | O02 đơn 10206655 U22 — PHIM ĐIỆN ẢNH THÁM 2026-11-12 20:00, QA_U22_01 @ QAP1, CANCELLED | Mọi kiểm tra đúng | 15/15 kiểm tra đúng | PASS |
| DS-O06 | O06 đơn 10206659 U22 — MA XƯỞNG HÒM-T16 2026-11-11 22:30, QA_U22_02 @ QAP2, SOLD | Mọi kiểm tra đúng | 15/15 kiểm tra đúng | PASS |
| DS-O08 | O08 đơn 10206661 U22 — MA XƯỞNG HÒM-T16 2026-11-14 22:30, QA_U22_02 @ QAP2, CANCELLED | Mọi kiểm tra đúng | 15/15 kiểm tra đúng | PASS |
| DS-O12 | O12 đơn 10206665 U22 — MA XƯỞNG HÒM-T16 2026-11-14 22:30, QA_U22_03 @ QAP1, SOLD | Mọi kiểm tra đúng | 15/15 kiểm tra đúng | PASS |
| DS-O20 | O20 đơn 10206668 U22 — PHIM ĐIỆN ẢNH THÁM 2026-11-12 20:00, QA_U22_03 @ QAP1, CANCELLED | Mọi kiểm tra đúng | 15/15 kiểm tra đúng | PASS |
| DS-O15 | O15 đơn 10206669 U22 — SHREK 5 2026-11-13 10:00, QA_U22_01 @ QAP2, SOLD | Mọi kiểm tra đúng | 15/15 kiểm tra đúng | PASS |
| DS-CFG | Cấu hình U22 sau bộ dữ liệu | 55.000 / 70.000 (giá 72.000 Thứ 6 chỉ đặt tạm 23 giây cho O15) | 55000/70000/70000 v205 | PASS |
| RC-U22USAGE | Báo cáo U22 (u22-usage) ngày in 2026-11-10 | 4 đơn U22 giữ (O06 55.000, O12 70.000, O15 72.000, O17 55.000): 4 vé, 252000đ | HTTP 201; 0 dòng (mã thẻ QA: 0, mã thẻ khác: 0); 0 vé, 0đ — khách QA chỉ có trong CRM DEV, báo cáo join CinemaCrm2023 | FAIL |

#### LEGACY-POS

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| DS-O03 | O03 đơn 10206656 REG — PHIM ĐIỆN ẢNH THÁM 2026-11-12 20:00, QA_U22_01 @ QAP1, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O05 | O05 đơn 10206658 REG — SHREK 5 2026-11-13 10:00, QA_U22_01 @ QAP1, CANCELLED | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O07 | O07 đơn 10206660 REG — MA XƯỞNG HÒM-T16 2026-11-14 22:30, QA_U22_02 @ QAP2, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O09 | O09 đơn 10206662 REG — PHIM ĐIỆN ẢNH THÁM 2026-11-12 20:00, QA_U22_02 @ QAP2, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O11 | O11 đơn 10206664 REG — SHREK 5 2026-11-13 10:00, QA_U22_03 @ QAP1, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O13 | O13 đơn 10206666 REG — MA XƯỞNG HÒM-T16 2026-11-14 22:30, QA_U22_03 @ QAP1, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O14 | O14 đơn 10206667 REG — MA XƯỞNG HÒM-T16 2026-11-11 22:30, QA_U22_03 @ QAP1, CANCELLED | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O16 | O16 đơn 10206670 REG — SHREK 5 2026-11-13 10:00, QA_U22_01 @ QAP2, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O19 | O19 đơn 10206673 REG — PHIM ĐIỆN ẢNH THÁM 2026-11-12 20:00, QA_U22_01 @ QAP2, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O21 | O21 đơn 10206674 REG — MA XƯỞNG HÒM-T16 2026-11-11 22:30, QA_U22_02 @ QAP1, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O22 | O22 đơn 10206675 REG — PHIM ĐIỆN ẢNH THÁM 2026-11-12 20:00, QA_U22_02 @ QAP1, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O23 | O23 đơn 10206676 REG — MA XƯỞNG HÒM-T16 2026-11-14 22:30, QA_U22_02 @ QAP1, CANCELLED | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O24 | O24 đơn 10206677 REG — SHREK 5 2026-11-13 10:00, QA_U22_03 @ QAP2, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O01 | O01 đơn 10206678 REG — MA XƯỞNG HÒM-T16 2026-11-11 22:30, QA_U22_01 @ QAP1, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| LEG-OLD-9998602 | Đơn cũ 9998602: U22 quy tắc cũ (03/2026, 80.000) — đọc chi tiết qua GET /api/pos/order/:id (dùng cho dialog chi tiết) | 200; tiền/giảm giá/mã ưu đãi/số vé = DB, không bị tính lại theo cấu hình U22 mới | HTTP 200; orderTotal 80000 (DB 80000), discount 0 (DB 0), voucherCode U22Ticket (DB U22Ticket), vé 1 (DB 1) | PASS |
| LEG-OLD-10156338 | Đơn cũ 10156338: vé thường nhiều ghế (15/06/2026) — đọc chi tiết qua GET /api/pos/order/:id (dùng cho dialog chi tiết) | 200; tiền/giảm giá/mã ưu đãi/số vé = DB, không bị tính lại theo cấu hình U22 mới | HTTP 200; orderTotal 130000 (DB 130000), discount 0 (DB 0), voucherCode null (DB null), vé 2 (DB 2) | PASS |
| LEG-OLD-10206605 | Đơn cũ 10206605: U22 bán 09/11 trước deploy (65.000) — đọc chi tiết qua GET /api/pos/order/:id (dùng cho dialog chi tiết) | 200; tiền/giảm giá/mã ưu đãi/số vé = DB, không bị tính lại theo cấu hình U22 mới | HTTP 200; orderTotal 65000 (DB 65000), discount 15000 (DB 15000), voucherCode U22Ticket (DB U22Ticket), vé 1 (DB 1) | PASS |
| LEG-INDEP-01 | Độc lập U22 trên cùng suất 410031 (SHREK 5, T6): O11 thường → O15 U22 (giá tùy chỉnh 72.000 đặt tạm) → O16 thường ngay sau | Vé thường V giữ 80.000 trước/sau U22 và trong lúc cấu hình U22 đổi; U22 = 72.000 | O11 80000 (QA_U22_03@QAP1); O15 U22 72000; O16 80000 (QA_U22_01@QAP2); O24 2×T 140000 | PASS |
| LEG-INDEP-02 | Độc lập U22 trên suất 410029 (T7): O12 U22 → O13 thường ngay sau; O07 3 vé hỗn hợp | U22 70.000; thường T 90.000; O07 = 95.000+95.000+90.000 | O12 70000; O13 90000; O07 280000 | PASS |
| LEG-INDEP-03 | Cùng loại ghế, khác nhân viên/máy cho cùng giá (410028 V, T4) | Thường 75.000 ở mọi NV/máy; U22 ngày thường 55.000 | O01 75000 QA_U22_01@QAP1; O21 75000 QA_U22_02@QAP1; O18 75000 QA_U22_01@QAP2; O06 U22 55000 QA_U22_02@QAP2 | PASS |
| LEG-AUDIT-01 | Audit khi bật lại suất (PATCH /api/pos/plan-screenings/:id {deleted:false}) | Ghi UPDATE (deleted true → false) | StaffAuditLog 9590/9591: Action DELETE, NewValues null, ChangedFields null | FAIL — Có sẵn, không thuộc U22 (P3): khôi phục suất bị ghi như xóa |

#### PV-REG

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| DS-O04 | O04 đơn 10206657 REG+PV — SHREK 5 2026-11-13 10:00, QA_U22_01 @ QAP1, SOLD | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-O10 | O10 đơn 10206663 U22+PV — SHREK 5 2026-11-13 10:00, QA_U22_02 @ QAP2, CANCELLED | Mọi kiểm tra đúng | 15/15 kiểm tra đúng | PASS |
| DS-O17 | O17 đơn 10206671 U22+PV — PHIM ĐIỆN ẢNH THÁM 2026-11-12 20:00, QA_U22_01 @ QAP2, SOLD | Mọi kiểm tra đúng | 15/15 kiểm tra đúng | PASS |
| DS-O18 | O18 đơn 10206672 REG+PV — MA XƯỞNG HÒM-T16 2026-11-11 22:30, QA_U22_01 @ QAP2, CANCELLED | Mọi kiểm tra đúng | 14/14 kiểm tra đúng | PASS |
| DS-PVBATCH | Lô QA LÔ-029: UsedCount sau 4 đơn có voucher (2 giữ, 2 hủy) | UsedCount 4 (hủy không hoàn voucher theo quy tắc P5); lô vận hành không đổi | UsedCount 4/10 | PASS |
| RC-PV-O04 | O04 đơn 10206657 (REG+PV): tách 3 giá trị trên báo cáo suất 410031 | Doanh thu sau ưu đãi trước voucher 80000; voucher áp dụng 30000; khách trả 50000 | Doanh thu suất 452000 = 80000 + 372000 (đơn khác); voucher áp dụng 30000; Thực nộp 422000 = 50000 + 372000 | PASS |
| RC-PV-O17 | O17 đơn 10206671 (U22+PV): tách 3 giá trị trên báo cáo suất 410027 | Doanh thu sau ưu đãi trước voucher 55000; voucher áp dụng 30000; khách trả 25000 | Doanh thu suất 470000 = 55000 + 415000 (đơn khác); voucher áp dụng 30000; Thực nộp 440000 = 25000 + 415000 | PASS |
| RC-HISTORY-PV | Lịch sử bán vé: cột "Tiền thanh toán" của đơn có voucher giấy (O04 10206657) | Khách trả 50.000 (80.000 − voucher 30.000) | Cột hiển thị orderTotal = 80000; danh sách không có cột voucher / tiền khách trả | FAIL — Nhãn "Tiền thanh toán" dễ hiểu là tiền khách trả; với đơn voucher giấy đây là giá trị đơn trước voucher (P3, có từ P5) |

#### RECON

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| RC-SALE-410027 | Ngày bán 2026-11-10, suất 410027 (PHIM ĐIỆN ẢNH THÁM TỬ  2026-11-12 20:00): báo cáo = dữ liệu QA | 5 đơn, 6 vé, giá gốc 500000, sau ưu đãi 470000, voucher 30000, khách trả 440000; cơ cấu giá {"55000":1,"80000":3,"85000":1,"90000":1} | vé 6; doanh thu sau ưu đãi (actualSale) 470000; giá gốc (totalSale) 500000; Giảm giá 30000; voucher SL 1 / áp dụng 30000; Thực nộp 440000; QR 0; cơ cấu {"55000":1,"80000":3,"85000":1,"90000":1} | PASS |
| RC-SALE-410028 | Ngày bán 2026-11-10, suất 410028 (MA XƯỞNG HÒM-T16 2026-11-11 22:30): báo cáo = dữ liệu QA | 3 đơn, 3 vé, giá gốc 225000, sau ưu đãi 205000, voucher 0, khách trả 205000; cơ cấu giá {"55000":1,"75000":2} | vé 3; doanh thu sau ưu đãi (actualSale) 205000; giá gốc (totalSale) 225000; Giảm giá 20000; voucher SL 0 / áp dụng 0; Thực nộp 205000; QR 0; cơ cấu {"55000":1,"75000":2} | PASS |
| RC-SALE-410029 | Ngày bán 2026-11-10, suất 410029 (MA XƯỞNG HÒM-T16 2026-11-14 22:30): báo cáo = dữ liệu QA | 3 đơn, 5 vé, giá gốc 465000, sau ưu đãi 440000, voucher 0, khách trả 440000; cơ cấu giá {"70000":1,"90000":2,"95000":2} | vé 5; doanh thu sau ưu đãi (actualSale) 440000; giá gốc (totalSale) 465000; Giảm giá 25000; voucher SL 0 / áp dụng 0; Thực nộp 440000; QR 0; cơ cấu {"70000":1,"90000":2,"95000":2} | PASS |
| RC-SALE-410031 | Ngày bán 2026-11-10, suất 410031 (SHREK 5 2026-11-13 10:00): báo cáo = dữ liệu QA | 5 đơn, 6 vé, giá gốc 460000, sau ưu đãi 452000, voucher 30000, khách trả 422000; cơ cấu giá {"70000":2,"72000":1,"80000":3} | vé 6; doanh thu sau ưu đãi (actualSale) 452000; giá gốc (totalSale) 460000; Giảm giá 8000; voucher SL 1 / áp dụng 30000; Thực nộp 422000; QR 0; cơ cấu {"70000":2,"72000":1,"80000":3} | PASS |
| RC-SALE-TOTAL | Ngày bán 2026-11-10: dòng Tổng cộng; 8 đơn hủy bị loại | Chỉ 16 đơn, 20 vé, giá gốc 1650000, sau ưu đãi 1567000, voucher 60000, khách trả 1507000; loại trừ hủy: 8 đơn, 9 vé, giá gốc 725000, sau ưu đãi 630000, voucher 60000, khách trả 570000 | Tổng vé 20, doanh thu 1567000, giá gốc 1650000 | PASS |
| RC-FILM-11269 | Lọc phim 11269 (PHIM ĐIỆN ẢNH THÁM TỬ LỪ), ngày bán 2026-11-10 | 6 vé, 470000đ, thực nộp 440000; chỉ phim này | 6 vé, 470000đ, thực nộp 440000; phim trong kết quả: 11269 | PASS |
| RC-FILM-11246 | Lọc phim 11246 (SHREK 5), ngày bán 2026-11-10 | 6 vé, 452000đ, thực nộp 422000; chỉ phim này | 6 vé, 452000đ, thực nộp 422000; phim trong kết quả: 11246 | PASS |
| RC-FILM-11267 | Lọc phim 11267 (MA XƯỞNG HÒM-T16), ngày bán 2026-11-10 | 8 vé, 645000đ, thực nộp 645000; chỉ phim này | 8 vé, 645000đ, thực nộp 645000; phim trong kết quả: 11267 | PASS |
| RC-STAFF-QA_U22_01 | Lọc nhân viên QA_U22_01 (CinemaStaff 39193164), ngày bán 2026-11-10 | 7 đơn giữ: 8 vé, 607000đ, voucher 60000 | 8 vé, 607000đ, voucher 60000 | PASS |
| RC-STAFF-QA_U22_02 | Lọc nhân viên QA_U22_02 (CinemaStaff 39193165), ngày bán 2026-11-10 | 5 đơn giữ: 7 vé, 580000đ, voucher 0 | 7 vé, 580000đ, voucher 0 | PASS |
| RC-STAFF-QA_U22_03 | Lọc nhân viên QA_U22_03 (CinemaStaff 39193166), ngày bán 2026-11-10 | 4 đơn giữ: 5 vé, 380000đ, voucher 0 | 5 vé, 380000đ, voucher 0 | PASS |
| RC-SHOW-410027 | Ngày chiếu, suất 410027: dữ liệu QA + đơn cũ trước đó | 10 vé (6 QA + 4 cũ), 780000đ | 10 vé, 780000đ | PASS |
| RC-SHOW-410028 | Ngày chiếu, suất 410028: dữ liệu QA + đơn cũ trước đó | 3 vé (3 QA + 0 cũ), 205000đ | 3 vé, 205000đ | PASS |
| RC-SHOW-410029 | Ngày chiếu, suất 410029: dữ liệu QA + đơn cũ trước đó | 5 vé (5 QA + 0 cũ), 440000đ | 5 vé, 440000đ | PASS |
| RC-SHOW-410031 | Ngày chiếu, suất 410031: dữ liệu QA + đơn cũ trước đó | 7 vé (6 QA + 1 cũ), 517000đ | 7 vé, 517000đ | PASS |
| RC-TAB-STAFF-QA_U22_01 | "Doanh thu bán vé" tab Nhân viên: QA_U22_01 | Offline 8 vé; "Doanh thu Offline" 607000; VNPayQR/VietQR 0 | Offline 8 vé; totalSale 607000; VietQR 0, VNPayQR 0; (API actualOffSale 569000 = 607000 − 38000 giảm U22 ⇒ trừ hai lần) | PASS |
| RC-TAB-STAFF-QA_U22_02 | "Doanh thu bán vé" tab Nhân viên: QA_U22_02 | Offline 7 vé; "Doanh thu Offline" 580000; VNPayQR/VietQR 0 | Offline 7 vé; totalSale 580000; VietQR 0, VNPayQR 0; (API actualOffSale 560000 = 580000 − 20000 giảm U22 ⇒ trừ hai lần) | PASS |
| RC-TAB-STAFF-QA_U22_03 | "Doanh thu bán vé" tab Nhân viên: QA_U22_03 | Offline 5 vé; "Doanh thu Offline" 380000; VNPayQR/VietQR 0 | Offline 5 vé; totalSale 380000; VietQR 0, VNPayQR 0; (API actualOffSale 355000 = 380000 − 25000 giảm U22 ⇒ trừ hai lần) | PASS |
| RC-TAB-FILM-11269 | "Doanh thu bán vé" tab Phim: phim 11269 | Offline 6 vé; Doanh thu Offline = Doanh thu tổng = 470000; Online 0 | Offline 6; actualOffSale 470000; totalSale 470000; online 0 | PASS |
| RC-TAB-FILM-11246 | "Doanh thu bán vé" tab Phim: phim 11246 | Offline 6 vé; Doanh thu Offline = Doanh thu tổng = 452000; Online 0 | Offline 6; actualOffSale 452000; totalSale 452000; online 0 | PASS |
| RC-TAB-FILM-11267 | "Doanh thu bán vé" tab Phim: phim 11267 | Offline 8 vé; Doanh thu Offline = Doanh thu tổng = 645000; Online 0 | Offline 8; actualOffSale 645000; totalSale 645000; online 0 | PASS |
| RC-DAYINMONTH | revenue-day-in-month ngày in 2026-11-10 (vé QA đều chiếu 11–14/11) | Ghi nhận: Tổng vé chỉ tính vé chiếu trong ngày in → 0; cột giá tính mọi vé in → 20 | Tổng vé 0; Σ cột giá 20 | PASS* — Đúng như RPT-DAY-02: hai chỉ tiêu trong cùng báo cáo dùng điều kiện khác nhau (P3, có sẵn) |
| RC-HISTORY-API | API Lịch sử bán vé (GET /api/pos/order, lọc ngày mua 10/11/2026) | 24 đơn QA có đủ và đúng: trạng thái 30/60, Tiền thanh toán (orderTotal), Nhân viên bán (seller), Máy bán (items[0].posName/posShortName), số vé, VoucherCode | HTTP 200; 27 dòng (24 đơn bộ dữ liệu + 3 đơn QA hủy phần trước); lệch 0; mẫu [{"id":10206655,"seller":"QA_U22_01","pos":"QAP1","orderTotal":55000,"status":60,"voucherCode":"U22Ticket"},{"id":10206657,"seller":"QA_U22_01","pos":"QAP1","orderTotal":80000,"status | PASS |

#### UI-REPORT

| ID | Case | Expected | Actual | Kết quả |
|---|---|---|---|---|
| UI-HIST-01 | Lịch sử bán vé (Electron) tab Vé offline, mặc định hôm nay 10/11/2026 | 27 bản ghi (24 đơn bộ dữ liệu + 3 đơn QA trước); hiện Nhân viên bán, Máy bán, phim, trạng thái; đơn đã hủy hiện trạng thái hủy | "Tổng 27 bản ghi"; mã đơn bộ dữ liệu trên trang 1: 20; 2 máy QA: true; NV QA: 3/3; nhãn trạng thái đơn đã hủy: "Thất bại" | PASS |
| UI-HIST-02 | Lịch sử bán vé: tìm theo Mã đơn 10206657 (thường + voucher giấy) và mở chi tiết | Chi tiết hiển thị giá vé 80.000, voucher giấy 30.000, khách trả 50.000; danh sách cột Tiền thanh toán | Dòng: "1 10206657 T5962210EC 80.000 ₫ 12:13 10/11/2026 QA U22 01 QA POS U22 01 (testapiv3) SHREK 5 1 13/11/2026 10:00 1 E16 Hoàn thành "; chi tiết: "Thông tin bán vé MÃ ĐƠN HÀNG 10206657 MÃ ĐẶT VÉ T5962210EC MÁY BÁN QA POS U22 01 (testapiv3) TRẠNG THÁI ĐƠN Hoà | PASS |
| UI-REV-01 | Báo cáo doanh thu theo ngày bán (mặc định hôm nay) | SHREK 5: 6 vé / 452.000 / Thực nộp 422.000; MA XƯỞNG HÒM: 8 / 645.000 / 645.000; CONAN: 6 / 470.000 / 440.000; voucher 1/0/1 | thiếu trên màn hình: 422.000,440.000 | PASS* — Chế độ mặc định của màn (getRevenueColumnMode = default) không hiển thị cột Thực nộp/QR/cột giá; mọi cột đang hiển thị (Tổng vé, Tổng doanh thu, Khuyến mại, Giảm giá, Sau KM, Số lượng Voucher, Tiền thừa Voucher) khớp API: SHREK 6/452.000/8.000/1, MA XƯỞNG HÒM 8/645.000/45.000/0, CONAN 6/470.000/30.000/1; dòng suất On/Off đúng |
| UI-REV-02 | Báo cáo doanh thu theo ngày bán: Bộ lọc Nhân viên = "QA U22 01" | API userId của QA_U22_01: 8 vé, 607.000, voucher áp dụng 60.000, Thực nộp 547.000; màn hình hiện cột Thực nộp | gửi userId 39193164; API 8 vé, 607000, voucher 60000, Thực nộp 547000; cột trên màn hình: Phim / Ngày, Nội dung chi tiết, Tổng vé, Giấy mời, Hợp đồng, Vé bán + HĐ, Tổng doanh thu, Khuyến mại, Giảm giá, VNPayQR, VietQR, Số lượng Voucher, Tiền thừa Voucher, Thực | PASS |
| UI-U22-01 | Tab "Báo cáo giao dịch mua vé thẻ U22" (Electron), 10/11/2026 | 4 giao dịch U22 giữ lại của bộ dữ liệu (252.000) | 0 dòng, tổng 0đ — màn hình rỗng | FAIL — Cùng nguyên nhân RC-U22USAGE: join cứng CinemaCrm2023 |
| UI-TSR-01 | Doanh thu bán vé — tab Doanh thu theo nhân viên, 10/11/2026 | QA_U22_01 8 vé / 607.000; QA_U22_02 7 / 580.000; QA_U22_03 5 / 380.000 | 3 NV QA với doanh thu đúng trên màn hình: true,true,true | PASS |
| UI-REV-01b | Báo cáo doanh thu theo ngày bán: cột Thực nộp từng phim (đọc ô bảng, cuộn phải) | SHREK 422.000; CONAN 440.000; MA XƯỞNG HÒM 645.000 | SHREK: SHREK 5 \|  \|  \|  \| 6 \| 0 \| 0 \| 6 \| 452.000 ₫ \| 0 ₫ \| 8.000 ₫ \| 452.000 ₫ \| 1 \| 0 ₫; CONAN: Ử LỪNG DANH CONAN: THIÊN THẦN SA NGÃ TRÊN XA LỘ - K (LỒNG TIẾNG) \|  \|  \|  \| 6 \| 0 \| 0 \| 6 \| 470.000 ₫ \| 0 ₫ \| 30.000 ₫ \| 470.000 ₫ \| 1 \| 0 ₫; MA: MA XƯỞNG HÒM-T16 | PASS* — Chế độ mặc định của màn (getRevenueColumnMode = default) không hiển thị cột Thực nộp/QR/cột giá; mọi cột đang hiển thị (Tổng vé, Tổng doanh thu, Khuyến mại, Giảm giá, Sau KM, Số lượng Voucher, Tiền thừa Voucher) khớp API: SHREK 6/452.000/8.000/1, MA XƯỞNG HÒM 8/645.000/45.000/0, CONAN 6/470.000/30.000/1; dòng suất On/Off đúng |

## Phụ lục B. Bằng chứng

Thư mục: `D:\Projects\ncc-admin-app-new\test-results\u22-testapiv3\` (git-ignore). Gồm `results.jsonl` (mọi case), `evidence.jsonl` (request/response HTTP), `ms-evidence.jsonl` (truy vấn Mediasoft DEV chỉ đọc), `electron-network.json` / `sale-network.json` / `pv-sale-network.json` (đã che token), `snap-00-before.json`, `snap-99-after.json`, `fe-build.log`, `fe-vitest.log`, `shots\*.png`, và các harness `qa-*.js`, `t1…t9-*.js` (mật khẩu chỉ lấy từ biến môi trường `QA_USER`/`QA_PW`, không ghi trong file).

Bằng chứng giai đoạn báo cáo / bộ dữ liệu: `dataset-registry.json` (24 đơn: body gửi, preview U22, vé in, người/máy bán và hủy), `dataset-table.json/.md`, `report-qa/*.json` (response báo cáo dùng đối chiếu), `snap-10-dataset-before.json`, `snap-19-dataset-after.json`, `dataset-S*.log`, `shots/dataset/*.png` (mỗi đơn: VIP, đã bán, hủy; cấu hình máy POS), `shots/reports-ui/*.png` (Lịch sử bán vé, chi tiết đơn voucher, báo cáo theo ngày bán, lọc nhân viên, tab U22, Doanh thu bán vé), harness `t11…t17`. Mật khẩu 3 tài khoản QA và 3 khách QA nằm trong `qa-accounts.local.json` (git-ignore, chỉ trên máy QA).

Tài khoản dùng: staff `admin` (do người dùng cung cấp, không ghi mật khẩu vào bất kỳ file nào). Thông tin đăng nhập web Mediasoft DEV / CRM admin dev do người dùng cung cấp **không cần dùng**: việc xác minh Mediasoft đã làm bằng API đọc.
