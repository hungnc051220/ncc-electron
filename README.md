# NCC Admin App

Ứng dụng desktop Electron cho hệ thống quản trị NCC, dùng React + TypeScript + electron-vite.

## Công nghệ chính

- Electron
- React
- TypeScript
- Vite / electron-vite
- electron-builder
- electron-updater
- Ant Design

## Yêu cầu môi trường

- Node.js 22
- Yarn 1.x
- Windows để build file cài đặt `.exe`

## Cài đặt

```bash
yarn
```

Sau khi cài dependency, `postinstall` sẽ tự chạy:

```bash
electron-builder install-app-deps
```

## Chạy local

Chạy môi trường development:

```bash
yarn dev
```

Một số lệnh hữu ích:

```bash
yarn lint
yarn typecheck
yarn test
yarn test:e2e
```

## Build thủ công

Build source:

```bash
yarn build
```

Build file cài đặt cho Windows:

```bash
yarn build:win
```

Các lệnh khác:

```bash
yarn build:unpack
yarn build:mac
yarn build:linux
yarn build:linux:wsl
```

## Release tự động bằng GitHub Actions

Workflow release nằm tại:

- `.github/workflows/release.yml`

Workflow này chạy khi có `push` lên 2 nhánh:

- `main`
- `dev`

Mỗi lần push, workflow sẽ:

1. Cài dependency
2. Chạy `yarn build`
3. Đóng gói app Windows bằng `electron-builder`
4. Tạo GitHub Release và upload các file build trong thư mục `dist`

## Quy ước release theo nhánh

### Nhánh `main`

- Dùng release channel: `latest`
- Tạo release chính thức
- Không tự bật DevTools trong bản đóng gói

### Nhánh `dev`

- Dùng release channel: `dev`
- Tạo prerelease
- Bản đóng gói cho phép mở DevTools
- Khi mở app, DevTools sẽ tự bật ở chế độ `detach`
- Có thể bật/tắt lại bằng `F12` hoặc `Ctrl/Cmd + Shift + I`

## Cách sinh version trong CI

Workflow không dùng trực tiếp patch version trong `package.json` cho từng lần release.

Thay vào đó, CI sinh version động theo dạng:

```text
main: <major>.<minor>.<buildNumber>
dev:  <major>.<minor>.<buildNumber>-dev
```

Ví dụ:

```text
1.0.24501
1.0.24501-dev
```

Việc này giúp:

- Mỗi lần push đều có version riêng
- Không bị trùng tag/release
- `main` và `dev` không ghi đè lẫn nhau

## Repo phát hành release

App updater hiện đang trỏ tới GitHub repo:

```text
hungnc051220/ncc-electron
```

Vì vậy source code cần được đẩy lên chính repo GitHub này để GitHub Actions build và publish release ngay trong cùng một nơi.

## Quyền cần cấu hình trên GitHub

Workflow hiện dùng `secrets.GITHUB_TOKEN` mặc định của GitHub Actions để tạo release.

Cần đảm bảo trong workflow có:

```yaml
permissions:
  contents: write
```

Không cần tạo thêm secret riêng nếu workflow chạy trực tiếp trong repo `hungnc051220/ncc-electron`.

## File release được upload

Workflow hiện upload các file:

- `dist/*.exe`
- `dist/*.blockmap`
- `dist/*.yml`

Các file `.yml` là metadata cần cho `electron-updater`.

## Auto update

App dùng `electron-updater`.

Khi build từ CI:

- bản `main` sẽ kiểm tra update ở channel `latest`
- bản `dev` sẽ kiểm tra update ở channel `dev` và chấp nhận prerelease

Điều này giúp bản `dev` chỉ nhận update từ nhánh `dev`, còn bản stable chỉ nhận release từ `main`.

## Các file liên quan đến release

- `electron-builder.yml`: cấu hình đóng gói và publish provider
- `electron.vite.config.ts`: inject biến build-time cho channel và DevTools
- `src/main/index.ts`: cấu hình updater, channel và DevTools cho app đã đóng gói
- `.github/workflows/release.yml`: workflow build và publish release

## Gợi ý quy trình làm việc

### Phát triển tính năng

```bash
git checkout dev
yarn dev
```

Khi push lên `dev`:

- GitHub Actions sẽ build prerelease
- Bản build này mở được DevTools

### Phát hành chính thức

Merge hoặc push code lên `main`.

Khi push lên `main`:

- GitHub Actions sẽ build release chính thức
- App stable sẽ nhận update từ channel `latest`

## Kiểm tra nhanh sau khi sửa cấu hình release

Nên chạy:

```bash
yarn typecheck
yarn build
```

## Ghi chú

- Workflow hiện build Windows installer vì đây là luồng phát hành chính của dự án.
- Nếu cần phát hành thêm macOS hoặc Linux trên CI, có thể mở rộng workflow bằng matrix build.
