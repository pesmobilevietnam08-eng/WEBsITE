# 01 — Product Requirements

## Mục tiêu
Học viên Việt Nam ôn thi nói môn JPD113 (tiếng Nhật sơ cấp) luyện **đọc thành tiếng** và **vấn đáp** tại nhà, nhận phản hồi tức thì, theo dõi tiến độ. Không cần tài khoản, không backend, dữ liệu ở máy người dùng.

## Người dùng
- Sinh viên 18–25 tuổi, dùng **điện thoại là chính**, thường mở link từ Zalo/Facebook (in-app browser, micro hay bị chặn).
- Mạng chập chờn → cần **PWA offline**.
- Không giỏi kỹ thuật → mọi lỗi (micro bị chặn, trình duyệt không hỗ trợ) phải có hướng dẫn tiếng Việt rõ ràng.

## Tính năng hiện có (phải giữ đủ)
**A. Luyện đọc** — chọn Bài (1,2,3) → lưới đoạn văn (44 đoạn) → màn đọc: nghe mẫu (chậm/thường), thu giọng/gõ romaji → chấm → hiển thị so khớp từng chữ, lỗi theo nhóm (hán `h`, katakana `k`…), điểm.
**B. Vấn đáp** — 3 tab: Ngẫu nhiên / Có tranh / Không tranh. Có tranh: 31 câu kèm ảnh tình huống, chấm theo thang 15 điểm với bậc lỗi R0–R11. Không tranh: 32 câu theo chủ đề L01…, dạng WH / YN-N.
**C. Chung** — chọn giọng đọc tiếng Nhật, đặt tên người học (thay "Aさん" trong câu hỏi), thanh tiến độ, nhớ trạng thái, banner cảnh báo in-app browser / nên dùng Chrome-Edge-PC, chế độ sáng/tối.
**D. Gõ thay micro** — ô nhập kana/romaji (`romaToKana`) cho điện thoại dùng micro bàn phím.

## Tính năng mới (mức ưu tiên)
| # | Tính năng | Ưu tiên |
|---|-----------|---------|
| 1 | Dashboard tiến độ: streak, điểm TB theo Bài/dạng lỗi, câu yếu cần ôn lại | P0 |
| 2 | Ôn lại thông minh (spaced repetition đơn giản: câu điểm thấp xuất hiện lại sớm) | P1 |
| 3 | Chế độ "Thi thử": bốc ngẫu nhiên có giới hạn thời gian, chấm tổng, xuất báo cáo | P1 |
| 4 | PWA cài lên màn hình chính, chạy offline | P0 |
| 5 | Xuất/nhập tiến độ (file JSON có checksum) để chuyển máy | P1 |
| 6 | Tìm kiếm nhanh câu hỏi/từ vựng | P2 |
| 7 | Furigana bật/tắt, cỡ chữ Nhật điều chỉnh | P1 |
| 8 | Đa ngôn ngữ UI (vi mặc định; chuẩn bị i18n key) | P2 |
| 9 | Module quảng bá bên thứ ba (JPDspeak) — tách riêng, mặc định tắt | P2 |

## Ngoài phạm vi
Backend, đăng nhập, thanh toán, lưu audio lên server, chấm ngữ điệu. (Ghi rõ trên UI: máy chỉ so chữ nhận được; ngữ điệu không chấm; điểm thi thật do giám khảo.)

## Chỉ số thành công
- Lighthouse (mobile): Performance ≥ 95, Accessibility = 100, Best Practices = 100, SEO ≥ 95.
- Bundle JS ban đầu ≤ 150 KB gzip (dữ liệu + engine tải lazy theo Bài).
- LCP < 1,5 s trên 4G giả lập; thao tác tức thì khi offline.
- 0 lỗi nghiêm trọng trong checklist `04-SECURITY.md`.
