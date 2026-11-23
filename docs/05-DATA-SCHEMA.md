# 05 — Dữ liệu

Đã tách sẵn từ file gốc bằng script, **giữ nguyên nội dung**:

| File | Nguồn gốc | Nội dung |
|------|-----------|----------|
| `data/cfg.json` | `const CFG` | `code`, `key`, `bais:[1,2,3]`, `w` + `wt` (trọng số 30/30/40 của 3 phần điểm đọc: `h` chữ Hán, `k` katakana, `i` phần còn lại; xem `gradeRead`), `fmt`, `kx`, `vx` (541 cặp kanji→kana), `vs` (100 gốc động/tính từ→kana) |
| `data/data.json` | `const DATA` | `bai.{1,2,3}.pic[]` (31 câu có tranh), `bai.{1,2,3}.free[]` (32 câu không tranh), `scale` (bậc lỗi R0–R11) |
| `data/rd.json` | `const RD` | `{ "1":[…10], "2":[…10], "3":[…24] }` đoạn luyện đọc |
| `assets/images/pictures/*.png` | `const IMG` (base64) | 28 ảnh, tên = giá trị `pic` của câu (vd `B1-T01`) |

## Câu có tranh (`bai[n].pic[]`)
`id, pic, type, read, disp, vn, wh, ear, steps, pat, a1, n1, a2, n2, trap, pron` (văn bản học, tiếng Nhật + Việt),
`j` = luật chấm: `{ kind:"WH"|"YN", truth:null|"yes"|"no", accept:string[], need:string[][], typ }`,
`lad[]` = "thang minh hoạ" các câu trả lời mẫu: `{ a, s (điểm 0–15), c(mã lỗi R*|null), why, hint }`.
Một số câu dùng chung `pic` (ảnh) → tham chiếu ảnh theo khoá `pic`, không nhân bản.

## Câu không tranh (`bai[n].free[]`)
`id, chu_de (L01…), ten_chu_de, dang_hoi ("WH"|"YN-N"), cau_hoi_doc, nghia_vn, cau_truc, tu_vung, tra_loi_1/2 (+ nghia_1/2), tu_soat_thong_tin, tu_soat_nhac`. Câu hỏi có thể chứa `A` thay cho tên người học (xem `qText()` cũ: thay `^A` bằng tên).

## Đoạn đọc (`rd[n][]`)
`id ("L1.1"…), mk` = markup có furigana: `{漢字|かな}` (hán: người đọc được hiển thị kèm furigana) và `[カタカナ|かな]`; `han[]` = danh sách chữ Hán trọng tâm `[chữ, cách đọc]`. Hàm gốc: `PLAINY`, `PLAINK`, `segs`, `buildRef`, `splitS`.

## Yêu cầu của agent
1. Viết **Zod schema** cho cả bốn nguồn trong `src/data/schema.ts`. Script `npm run validate:data` phải **fail** khi có khoá thiếu/thừa, `pic` trỏ tới ảnh không tồn tại, `accept` rỗng, mã lỗi `c` không có trong `scale`, `id` trùng.
2. In ra **báo cáo chất lượng dữ liệu** (`docs/DATA-REPORT.md`): số câu, câu thiếu ảnh, id trùng, ký tự lạ, mojibake. **Không tự sửa nội dung**; liệt kê để người dùng duyệt.
3. Chuyển `pic` PNG → WebP/AVIF khi build (giữ PNG làm nguồn); thêm `alt` tiếng Việt mô tả (agent tự viết bản nháp, đánh dấu `TODO-review`).
4. Chuẩn hoá tên trường tiếng Việt/Anh lẫn lộn (`cau_hoi_doc`, `read`…) bằng **lớp adapter** `data/normalize.ts` → type nội bộ thống nhất, **không** đổi JSON nguồn.

## Lưu trữ tiến độ cũ (để migrate)
Key `rbl-jpd113-web-v2` trong `localStorage`, object phẳng:
- `store[qid] = { n:số lần, best:điểm cao nhất, last:câu trả lời gần nhất }` (vấn đáp)
- `store["R:"+id] = { n, best, last }` (luyện đọc)
- `_name` (tên), `_voice` (voiceURI), `_pcOff` (đã ẩn banner PC)
Và `jpds-min` = "1" khi người dùng thu nhỏ quảng cáo (bỏ qua khi migrate).
Migration phải **không phá dữ liệu cũ** và có test.
