# Báo cáo chất lượng dữ liệu nguồn (`data/` & `assets/`)

Ngày kiểm tra: 2026-11-24  
Công cụ kiểm tra: `npm run validate:data` (Zod strict schema + đối chiếu chéo)

> **Nguyên tắc:** Không tự ý sửa nội dung trong `data/*.json` và `assets/images/pictures/*.png`. Mọi phát hiện dưới đây được liệt kê đầy đủ để chủ dự án duyệt.

---

## 1. Tổng quan số liệu

| Nguồn | Bài 1 | Bài 2 | Bài 3 | Tổng cộng |
|---|---:|---:|---:|---:|
| Câu hỏi vấn đáp có tranh (`bai[n].pic`) | 10 | 6 | 15 | **31** |
| Câu hỏi vấn đáp không tranh (`bai[n].free`) | 7 | 9 | 16 | **32** |
| Đoạn luyện đọc (`rd[n]`) | 10 | 10 | 24 | **44** |
| Ảnh tình huống (`assets/images/pictures/*.png`) | — | — | — | **28** |
| Từ điển chuyển Kanji → Kana (`cfg.vx`) | — | — | — | **541** cặp |
| Gốc động/tính từ (`cfg.vs`) | — | — | — | **100** mục |
| Mức lỗi trong thang điểm (`data.scale`) | — | — | — | **13** mã (`R0`–`R11`) |

### Ảnh dùng chung giữa nhiều câu hỏi (hợp lệ, tham chiếu theo khóa `pic`)
- `B1-T09` → dùng chung bởi `B1-T09-1` và `B1-T09-2`
- `B3-T12` → dùng chung bởi `B3-T12-1` và `B3-T12-2`
- `B3-T30` → dùng chung bởi `B3-T30-1` và `B3-T30-2`

---

## 2. Các mục kiểm tra ĐẠT (0 lỗi)
- **Thiếu ảnh (`pic` trỏ tới ảnh không tồn tại):** 0
- **Ảnh thừa không được câu nào dùng:** 0
- **Trùng `id` toàn bộ dữ liệu (pic + free + read):** 0
- **Mảng `j.accept` rỗng:** 0
- **Trùng khóa trong `cfg.vx`:** 0
- **Sai lệch `s` / `c` nội bộ trong `lad[]` (`s === 15` nhưng `c !== null` hoặc ngược lại):** 0
- **Sai lệch danh sách `han[]` so với markup `{漢字|かな}` trong `rd.json`:** 0
- **Mojibake / ký tự mã hóa hỏng / ký tự điều khiển lạ:** 0

---

## 3. Phát hiện cần người dùng duyệt (không tự sửa trong `data/`)

### Phát hiện 1 — Mã lỗi `R9` xuất hiện trong `lad[].c` nhưng thiếu định nghĩa trong `data.scale`
- **Mức độ:** Trung bình (Schema/thang điểm chưa đồng bộ).
- **Chi tiết:** 10 câu hỏi có tranh thuộc **Bài 3** sử dụng mã lỗi `"c": "R9"` với điểm `"s": 5` (trừ 10 điểm, mô tả: *"Sai ngữ pháp hoàn toàn (câu hỏi ます mà trả lời bằng danh từ＋です)"*), và engine gốc có kiểm tra trực tiếp `L.some(x => x.c === 'R9')`. Tuy nhiên, đối tượng `data.scale` trong `data/data.json` hiện chỉ có 13 khóa (`R0`, `R1`, `R2`, `R2b`, `R3`, `R4`, `R5a`, `R5b`, `R6a`, `R6b`, `R7a`, `R10`, `R11`) và **thiếu `R9`**.
- **Danh sách 10 câu bị ảnh hưởng:**
  `B3-T01-1`, `B3-T03-1`, `B3-T08-1`, `B3-T16-1`, `B3-T06-1`, `B3-T17-1`, `B3-T34-1`, `B3-T35-1`, `B3-T21-1`, `B3-T36-1`.
- **Cách ứng xử hiện tại (an toàn, không sửa `data/`):**
  - `src/data/schema.ts` từ chối mọi mã lỗi thiếu trong `scale` khi chạy chế độ strict (đã có unit test chứng minh).
  - `npm run validate:data` ghi nhận ngoại lệ có chủ đích duy nhất cho `R9` (xem `docs/DECISIONS.md` ADR-010) để không sửa `data/data.json`, đồng thời vẫn **fail ngay** nếu xuất hiện bất kỳ mã lạ nào khác.
  - Khi cần hiển thị thang lỗi tổng quan, UI bổ sung mô tả tham chiếu cho `R9` từ chính nội dung `lad[]` mà không sửa file nguồn.
- **Đề xuất cho chủ dự án:** Bổ sung khóa `"R9"` vào `data/data.json → scale` khi duyệt cập nhật nội dung đợt sau.

### Phát hiện 2 — Trường `pron` bằng `null` ở câu `B1-T13-1`
- **Mức độ:** Thấp (có chủ đích vì câu không có lưu ý phát âm riêng).
- **Chi tiết:** 30/31 câu có tranh có `pron` là chuỗi mô tả phát âm; riêng `B1-T13-1` có `"pron": null`.
- **Cách ứng xử hiện tại:** Zod schema cho phép `pron: string | null`; UI chỉ hiển thị mục "Phát âm cần chú ý" khi `pron` khác `null` (khớp bản gốc).

### Phát hiện 3 — Nháp mô tả ảnh `alt` tiếng Việt (`TODO-review`)
- Theo `docs/05-DATA-SCHEMA.md`, 28 ảnh tình huống đã được gán bản nháp văn bản thay thế `alt` tiếng Việt trong `src/data/pictureAlt.ts` (đánh dấu `TODO-review`) để đảm bảo trợ năng screen reader. Cần người biên soạn kiểm duyệt lại độ chính xác chi tiết hình vẽ.
