# Kiểm toán Trợ năng (WCAG 2.2 AA) — JPD113 Speaking Trainer

Ngày kiểm tra: 2026-11-24

## 1. Kiểm tra tự động
- **axe-core (`@axe-core/playwright`)**: 0 lỗi `serious` / `critical` trên toàn bộ các màn hình chính (Dashboard, Luyện đọc, Kết quả đọc, Vấn đáp, Kết quả vấn đáp có tranh/không tranh, Thi thử, Cài đặt, Kitchen Sink) ở cả **Light** và **Dark**, cả **390px** (mobile) và **1440px** (desktop).
- **Google Lighthouse Mobile Accessibility**: **100 / 100**.
- **WCAG 2.2 AA Contrast CI (`npm run check:contrast`)**: **46 / 46** cặp token màu đạt ≥ 4.5:1 (văn bản) và ≥ 3.0:1 (viền/điều khiển tương tác) cho cả hai chủ đề Washi (Light) và Sumi (Dark).

## 2. Kiểm tra điều hướng bàn phím & ngữ nghĩa Screen Reader
| Hạng mục | Kết quả | Ghi chú xác minh |
|---|---|---|
| Skip link (`Bỏ qua tới nội dung chính`) | Đạt | Phím `Tab` đầu tiên focus vào skip link; `Enter` nhảy thẳng tới `<main id="main-content">` |
| Điều hướng toàn cục (Sidebar / Bottom Nav) | Đạt | Mọi liên kết đều là `<a>` chuẩn với `aria-current="page"` từ React Router `NavLink` |
| Tabs (`role="tablist"`, `role="tab"`) | Đạt | Hỗ trợ `ArrowLeft`, `ArrowRight`, `Home`, `End`, roving `tabIndex` |
| Switch (`role="switch"`, `aria-checked`) | Đạt | Bật/tắt bằng `Space` và `Enter`, có nhãn liên kết qua `aria-labelledby` & `aria-describedby` |
| Dialog (`role="dialog"`, `aria-modal="true"`) | Đạt | Focus tự động vào nút đóng khi mở, `Escape` đóng hộp thoại và trả focus về phần tử gọi |
| Vùng thông báo kết quả chấm (`aria-live="polite"`) | Đạt | Màn kết quả Vấn đáp, Luyện đọc, Thi thử và Toast đều công bố điểm tự động cho trình đọc màn hình |
| Ngôn ngữ tiếng Nhật (`lang="ja"`) & `<ruby>` | Đạt | Đoạn đọc, câu hỏi Nhật, ô nhập, đáp án mẫu có `lang="ja"`; `<ruby>` có `<rp>` và `<rt>` đúng cấu trúc |
| Không truyền đạt chỉ bằng màu | Đạt | `DiffText` dùng gạch sóng đỏ (sai), ngoặc vuông `[x]` (thiếu), gạch ngang `+x` (thừa) kèm nhãn `.sr-only`; `Bảng tự soát` dùng icon Check/X SVG |
| Vùng chạm tối thiểu ≥ 44px | Đạt | Toàn bộ nút, tab, ô chọn, nút đóng, thanh điều hướng đáy có `min-height: 44px` |
| `prefers-reduced-motion: reduce` | Đạt | Đã xác minh trong Playwright (`transition-duration <= 0.001s` khi bật `reducedMotion: 'reduce'`) |
