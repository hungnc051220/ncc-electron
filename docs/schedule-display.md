# Màn hình TV lịch chiếu

Ứng dụng POS phục vụ trang lịch chiếu qua mạng LAN tại:

```text
http://<IP-MÁY-POS>:17890/schedule
```

Trang này dành cho Chrome/WebView trên Android box. Ứng dụng POS phải đang chạy và Android box phải cùng mạng LAN với máy POS.

## Cấu hình

1. Mở **Cài đặt → Màn hình TV** trong ứng dụng POS.
2. Nhập khóa API, chọn **Kiểm tra kết nối**, sau đó lưu.
3. Sao chép **Địa chỉ đề xuất** vào Android box.
4. Không đưa khóa API vào URL hoặc cấu hình của Android box.

Khóa API được lưu bằng `safeStorage` trong thư mục dữ liệu người dùng của Electron. File cấu hình chỉ chứa dữ liệu mã hóa.

## Nghiệm thu mạng LAN

Thực hiện theo thứ tự:

1. Trên máy POS, kiểm tra cổng đang lắng nghe:

   ```powershell
   Get-NetTCPConnection -LocalPort 17890 -State Listen
   ```

2. Trên máy POS, mở `http://127.0.0.1:17890/schedule`.
3. Trên máy POS, mở `http://<IP-MÁY-POS>:17890/schedule`.
4. Trên Android box, mở cùng địa chỉ LAN.

Nếu bước 2 thành công nhưng bước 3 hoặc 4 thất bại, kiểm tra network profile và Windows Firewall. Cho phép inbound TCP cổng `17890` trên profile **Private** theo quy trình quản trị của rạp. Ứng dụng không tự thay đổi firewall hoặc yêu cầu quyền quản trị.

## Nghiệm thu màn hình dọc

Production ưu tiên TV xoay dọc. Kiểm tra ở CSS viewport `1080×1920` và `2160×3840`; kiểm tra thêm `1920×1080` và `3840×2160` để bảo đảm fallback landscape không vỡ.

Trên Android box, ghi nhận thông số thực tế trong DevTools/remote debugging:

```js
console.log({
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio,
  screenWidth: window.screen.width,
  screenHeight: window.screen.height
});
```

Xác nhận không có thanh cuộn, tên phim tối đa hai dòng và giờ chiếu đọc được từ vị trí khách đứng. Lịch chiếu có tối đa 16 phim mỗi trang, xếp theo hàng trong grid hai cột. Khi có nhiều hơn 16 phim, chỉ vùng phim tự trượt ngang mỗi 15 giây và lặp về trang đầu; header, đồng hồ và footer đứng yên. Trang cuối ít phim vẫn dùng chiều cao card của trang đầu.

Metadata hiển thị dạng `Thể loại | Quốc gia | 120 phút`, bỏ trường không có dữ liệu. Renderer hỗ trợ hai trường tùy chọn `genre` và `country`; nguồn `/schedule/api` hiện tại chưa cung cấp chúng nên không tự suy đoán từ tên phim hoặc mã ngôn ngữ. Giờ chiếu được chia hàng trong vùng co giãn riêng; đã kiểm tra trường hợp 12 suất cùng tên dài và cảnh báo tuổi ở `2160×3840` và `1080×1920`.

## Xử lý sự cố

- **Cổng 17890 bị chiếm:** trang Cài đặt hiển thị lỗi server; đóng dịch vụ đang dùng cổng hoặc đổi cấu hình của dịch vụ đó.
- **Chưa có khóa:** nhập và kiểm tra khóa trong Cài đặt → Màn hình TV.
- **API tạm lỗi:** TV giữ dữ liệu thành công gần nhất và hiển thị thời điểm dữ liệu.
- **Poster lỗi:** TV tự dùng poster thay thế; lịch và giờ chiếu vẫn hiển thị.
- **Không thấy địa chỉ LAN:** kiểm tra card mạng, DHCP và kết nối cùng subnet; ưu tiên đặt DHCP reservation cho máy POS.
