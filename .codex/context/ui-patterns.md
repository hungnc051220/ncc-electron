# Ngữ Cảnh UI Patterns

## Nền Tảng UI

Renderer dùng Ant Design kết hợp Tailwind CSS. `src/renderer/src/providers/AntdProvider.tsx` cấu hình locale `vi_VN`, dayjs locale tiếng Việt, timezone mặc định `Asia/Ho_Chi_Minh`, font `Inter`, `colorPrimary: #464FB4`, token theo light/dark theme và hover background riêng cho Table. Theme được đồng bộ qua `useThemeStore`, `ThemeSync` và class `dark` trên `document.documentElement`.

## Layout Page

Các page vận hành thường dùng layout:

- Wrapper chính: `flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4`.
- Header: `PageHeader` với `AppBreadcrumb`, filter/action bên phải và `RefreshButton`.
- Bảng dữ liệu: `AutoHeightTable`, `bordered`, `size="small"`, pagination có `showTotal`.

Khi thêm page hoặc sửa page hiện có, ưu tiên copy pattern cục bộ trong feature gần nhất.

## Bảng Và Cột

Bảng Antd thường khai báo `TableProps<T>["columns"]`. Cột nên có `title`, `key`, `dataIndex` khi hợp lý, `width`, `align`, `sorter` dùng helper như `compareText`, `compareNumber`, `compareDate`, `compareNaturalText`. Fallback phổ biến:

- Text thiếu: `"--"`, `"-"` hoặc chuỗi rỗng tùy module đang sửa.
- Số tiền: `formatMoney(value || 0)`.
- Số lượng: `formatNumber(value || 0)`.
- Không giới hạn/không yêu cầu: dùng nhãn tiếng Việt theo module.

Không đổi style/fallback hàng loạt nếu task chỉ yêu cầu thêm một cột.

## Form, Modal Và Feedback

Form thường dùng Antd `Form.useForm`, `Form.Item` typed, `layout="vertical"`, rule message tiếng Việt và convert dayjs ở submit boundary. Modal dùng `open`, `onOpenChange` hoặc `onCancel`, `okButtonProps.loading/disabled` theo mutation state. Message/notification lấy qua `useAntdApp`; lỗi API hiển thị bằng `getApiErrorMessage` khi module đã dùng helper này.

## Styling

Ưu tiên Tailwind class sẵn có và token CSS của app: `bg-app-bg-container`, `border-app-border`, `text-slate-*`, `dark:*`. Không tạo palette mới nếu không cần. Khi sửa UI, kiểm tra cả light/dark theme, đặc biệt table hover, modal/card nền, border, text contrast và trạng thái disabled/loading.

## Icon Và Action

Repo dùng Ant Design icons và `lucide-react`. Action trong bảng thường dùng `Dropdown` với `MoreOutlined`; button chính có icon khi có pattern sẵn. Không thêm text hướng dẫn trong UI nếu feature đã rõ qua label/action.

Nếu convention chưa rõ, follow the existing local pattern in the touched module.
