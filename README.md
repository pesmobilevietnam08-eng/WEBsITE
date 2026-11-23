# JPD113 Speaking Trainer — gói project cho Antigravity

Đây là **gói đặc tả + dữ liệu** để AI agent (Antigravity) dựng lại ứng dụng ôn thi nói JPD113 từ đầu theo chuẩn kỹ sư: giao diện đẹp, code sạch, bảo mật chặt, test đầy đủ.

## Cách dùng (5 bước)
1. Giải nén, mở thư mục `jpd113-pro` bằng Antigravity (File → Open Folder).
2. Mở **Agent Manager**, tạo workspace trỏ vào thư mục này.
3. Mở file `KICKOFF_PROMPT.md`, copy toàn bộ nội dung dán vào agent. Chọn chế độ có **Planning** để agent lập kế hoạch trước, bạn duyệt rồi mới chạy.
4. Cho agent làm lần lượt từng Milestone trong `docs/07-ROADMAP.md`. Sau mỗi Milestone, bảo agent chạy `npm run check` và cho bạn xem ảnh chụp màn hình.
5. Khi xong, dán prompt trong `docs/09-SECURITY-REVIEW-PROMPT.md` để một agent khác kiểm tra bảo mật độc lập.

## Cấu trúc
```
AGENTS.md                  Luật chung cho agent (đọc đầu tiên)
KICKOFF_PROMPT.md          Prompt khởi động dán vào Antigravity
.agent/rules/              Rule tự nạp cho Antigravity
.agent/workflows/          Workflow dùng bằng lệnh /tên
docs/                      PRD, kiến trúc, design system, bảo mật, schema, engine, roadmap, nghiệm thu
data/                      Dữ liệu đã tách khỏi HTML (JSON) — KHÔNG sửa nội dung
assets/images/pictures/    28 ảnh tình huống đã tách khỏi base64
legacy/                    File gốc + phần logic JS gốc để tham chiếu khi port
```

## Số liệu bản gốc
- 1 file HTML 1,29 MB (ảnh nhúng base64, CSS ~1000 dòng, JS ~5.900 dòng).
- Bài 1–3: 31 câu có tranh, 32 câu không tranh, 44 đoạn luyện đọc.
- Engine chấm: chuẩn hoá kanji/số/giờ/tiền → kana, so khớp mờ (Levenshtein), thang trừ điểm R0–R11.
- Lưu tiến độ bằng `localStorage`, đọc mẫu bằng `speechSynthesis`, nhận giọng bằng Web Speech API.

## Lưu ý bản quyền nội dung
File gốc có khối quảng cáo/liên kết tới dịch vụ bên thứ ba (JPDspeak – manabiman.io.vn) và dữ liệu đề có thể không phải do bạn tự biên soạn. Bản mới tách khối đó thành module tuỳ chọn, mặc định **tắt**. Hãy chắc bạn có quyền dùng nội dung trước khi công khai.
