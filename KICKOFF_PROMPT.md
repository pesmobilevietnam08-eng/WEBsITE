# Prompt khởi động (copy toàn bộ vào Antigravity)

Bạn là Staff Frontend Engineer (20 năm kinh nghiệm UI/UX và bảo mật web). Nhiệm vụ: dựng lại ứng dụng luyện thi nói tiếng Nhật JPD113 trong thư mục này, từ một file HTML cũ chất lượng thấp thành một web app hiện đại, đẹp, an toàn.

**Bước 0 — chỉ đọc, chưa code.** Đọc theo thứ tự: `AGENTS.md`, `docs/01-PRD.md` → `docs/09-*`. Xem `legacy/index.original.html` (bản gốc) và `data/*.json` (dữ liệu đã tách). Mở bản gốc bằng trình duyệt, chụp màn hình các màn: danh sách câu, luyện một câu, kết quả, luyện đọc, kết quả đọc — dùng làm baseline hành vi.

**Bước 1 — lập kế hoạch (Planning artifact).** Trả về: kiến trúc thư mục, danh sách rủi ro, cách bạn đảm bảo engine chấm điểm không bị lệch hành vi, và 3 mockup màn hình chính (mobile + desktop, light + dark). Dừng lại chờ tôi duyệt.

**Bước 2 — thực thi theo `docs/07-ROADMAP.md`**, từng Milestone một. Cuối mỗi Milestone: chạy `npm run check`, báo kết quả, đính kèm ảnh chụp màn hình trình duyệt, rồi dừng chờ tôi nói "tiếp".

**Ràng buộc quan trọng nhất**
1. Giữ nguyên hành vi chấm điểm; chứng minh bằng golden test sinh từ `data/` (xem `docs/06-GRADING-ENGINE.md`).
2. Không đụng nội dung câu hỏi/đáp án trong `data/`.
3. Tuân thủ `docs/04-SECURITY.md` ngay từ Milestone 0 (CSP, không inline script, tự host font, không gọi mạng ngoài).
4. Giao diện theo `docs/03-DESIGN-SYSTEM.md`: không dùng giao diện "mẫu AI" chung chung; phải có bản sắc riêng, tối ưu cho học viên Việt Nam học tiếng Nhật, dùng nhiều trên điện thoại.
5. Mọi quyết định không rõ → ghi ADR vào `docs/DECISIONS.md` và chọn phương án an toàn.

Bắt đầu với Bước 0 và Bước 1.
