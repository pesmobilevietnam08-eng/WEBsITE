# 03 — Design System

## Định hướng thẩm mỹ
Bản gốc: card xanh ngọc nhạt, bố cục một cột 720px, giống "phiếu thi" nhưng nhìn như mẫu có sẵn. Hướng mới: **"Sổ tay luyện thi hiện đại"** — ấm, tập trung, gợi cảm giác giấy washi + mực sumi, kết hợp hiện đại tối giản. Phải có bản sắc, **tránh** gradient tím-xanh, card bo tròn đồng loạt, emoji làm icon, bóng đổ nặng.

Từ khoá: *yên tĩnh, rõ ràng, tập trung, tự tin*. Học viên cần bình tĩnh trước kỳ thi → giảm nhiễu, tăng độ tương phản thông tin quan trọng (câu hỏi, điểm, lỗi).

## Token (CSS variables, định nghĩa trong `src/ui/tokens.css`)
Giữ ngữ nghĩa màu của bản gốc, nâng cấp chất lượng.

| Token | Light | Dark | Dùng cho |
|-------|-------|------|----------|
| `--bg` | `#F6F3EC` (giấy washi) | `#0F1420` | Nền trang |
| `--surface` | `#FFFFFF` | `#171E2E` | Thẻ, panel |
| `--surface-2` | `#EFEBE1` | `#1F2840` | Vùng phụ |
| `--ink` | `#15213B` | `#E9EEF9` | Chữ chính |
| `--ink-2` | `#4A5775` | `#A9B6D0` | Chữ phụ |
| `--line` | `#D9D3C4` | `#2B3A58` | Viền |
| `--accent` | `#0A6E72` | `#5FD0C9` | Hành động chính |
| `--accent-ink` | `#FFFFFF` | `#06282A` | Chữ trên accent |
| `--hanko` | `#C0262D` | `#FF8F87` | Điểm nhấn đỏ (con dấu), lỗi nặng |
| `--good/-soft`, `--warn/-soft`, `--bad/-soft` | giữ từ bản gốc | | Trạng thái chấm |
| `--mark` | `#FFE08A` | `#B88A00` | Tô lỗi/từ khoá |

Kiểm tra tương phản **≥ 4.5:1** (chữ) và **≥ 3:1** (thành phần UI) cho cả hai theme bằng script trong CI.

Khoảng cách: thang 4px (4, 8, 12, 16, 24, 32, 48, 64). Bo góc: 8 / 14 / 22. Bóng: 2 mức, rất nhẹ. Chuyển động: 120–200 ms, `ease-out`; tôn trọng `prefers-reduced-motion`.

## Typography
- UI: **Be Vietnam Pro** 400/500/600/700 (tiếng Việt có dấu đẹp).
- Nhật: **Noto Sans JP** 400/500/700; chữ luyện đọc cỡ lớn (clamp 22–32px), line-height 2.0 để furigana không dính dòng.
- Thang chữ: 13 / 15 / 17 / 20 / 24 / 32 / 44. Số điểm dùng `font-variant-numeric: tabular-nums`.
- Component `<Ruby>` render `<ruby><rb/><rt/></ruby>`; công tắc furigana ẩn/hiện `rt` bằng CSS class gốc, không render lại.

## Layout
- Mobile-first, breakpoint 360 / 640 / 1024 / 1280.
- Mobile: thanh điều hướng đáy (Đọc · Vấn đáp · Tiến độ · Cài đặt), vùng thao tác trong tầm ngón cái, nút micro lớn cố định đáy màn luyện.
- Desktop: sidebar trái thu gọn + nội dung rộng tối đa 960px; màn luyện chia 2 cột (câu hỏi/tranh | khu trả lời & phản hồi).
- Safe-area (`env(safe-area-inset-*)`) cho iPhone.

## Component bắt buộc
Button (primary/secondary/ghost/danger, trạng thái loading), Tabs, Segmented control (chọn Bài), Card câu hỏi (số thứ tự, tag dạng câu, trạng thái đã làm + điểm tốt nhất), **ScoreRing** (điểm /15 hoặc /100), **MicButton** (idle / listening có sóng âm / lỗi), **DiffText** (so khớp từng chữ, đúng/sai/thiếu/thừa — không chỉ dựa vào màu: thêm gạch dưới/ký hiệu), **FeedbackLadder** (bậc lỗi R0–R11 dạng accordion), Banner, Toast, Dialog, Skeleton, EmptyState, Switch, Select, ProgressBar, ErrorBoundary screen.

## Màn hình cần thiết kế (mockup trước khi code)
1. Trang chủ/Tiến độ (streak, vòng điểm, "câu nên ôn hôm nay").
2. Danh sách vấn đáp (lưới thẻ, lọc tab/bài).
3. Luyện một câu (tranh + câu hỏi + khu trả lời + micro).
4. Kết quả vấn đáp (điểm, bậc lỗi, đáp án mẫu 1/2, bẫy thường gặp, phát âm).
5. Luyện đọc + kết quả đọc (DiffText, từ mới, lỗi theo nhóm).
6. Cài đặt (giọng, tên, theme, furigana, xuất/nhập, xoá dữ liệu).

## Trạng thái bắt buộc cho mỗi màn
Loading (skeleton) · Empty · Error (có hướng dẫn tiếng Việt) · Offline · Micro bị chặn · Trình duyệt không hỗ trợ nhận giọng (chuyển sang gõ) · In-app browser.

## Trợ năng (WCAG 2.2 AA)
Điều hướng bàn phím đầy đủ, focus ring rõ (2px offset), `aria-live` cho kết quả chấm, nhãn cho micro, `lang="ja"` trên đoạn tiếng Nhật, không truyền đạt chỉ bằng màu, vùng chạm ≥ 44px.
