# 06 — Engine chấm điểm (tài sản cốt lõi)

Mã nguồn gốc: `legacy/app-logic.original.js` (trích từ dòng 4768 của HTML gốc). Các khối chính (số dòng theo file `app-logic.original.js`, có thể lệch vài dòng):

| Khối | Hàm/biến chính | Vai trò |
|------|----------------|---------|
| Chuẩn hoá | `KANJI`, `VS/VSRX`, `KN`, `kanjiNum`, `monthK/dayK/ageK/hourK/minK/kaiK/numK/tsuK`, `norm`, `romaToKana`, `romajiText`, `lenFix`, `vowelOf` | Đưa chữ nhận được (kanji, số, giờ, tiền, tầng, romaji) về kana để so khớp |
| So khớp | `has`, `lev`, `fuzzy`, `repOK`, `PARTMAP`, `fixParticles`, `ALT7`, `SAME` | Khớp mờ, sửa trợ từ, từ đồng nghĩa |
| Chấm có tranh | `gradePic(q, text)` → `{p (0–15), code, why, …}` | Dùng `q.j` (kind, truth, accept, need), phạt theo `scale` |
| Chấm không tranh | `gradeFree`, `genericFree`, `COUNTQ`, `COUNTRY/JOBS/HOBBY/BRAND` | Kiểm tra theo `tu_soat_*`, loại câu hỏi |
| Chấm đọc | `buildRef`, `readNorm`, `align`, `ops`, `classify`, `gradeRead` | So văn bản mẫu với kết quả nhận, phân loại lỗi (h/k/…), tính điểm theo `CFG.w` |
| Phát âm | `speakSeq`, `speak`, `vScore`, `pickVoice` | TTS tiếng Nhật |

## Quy trình port (bắt buộc theo thứ tự)
1. **Chụp baseline**: viết script Node chạy engine gốc (đã trích) với tập đầu vào cố định và lưu kết quả vào `tests/golden/baseline.json`. Tập đầu vào gồm:
   - Mọi `lad[].a` của 31 câu có tranh (điểm kỳ vọng = `lad[].s`, mã lỗi = `lad[].c`) — **đây là oracle có sẵn trong dữ liệu**.
   - Mọi `j.accept[]` phải ra điểm tối đa.
   - Với câu không tranh: `tra_loi_1`, `tra_loi_2` phải qua (thay `○○` bằng mẫu hợp lệ).
   - Mọi đoạn đọc: chính đoạn mẫu → điểm đầy đủ; biến thể có lỗi cố ý (thay 1 chữ, bỏ 1 chữ, đổi trợ từ) → lỗi đúng loại.
   - Thêm ≥ 200 ca ngẫu nhiên có seed (nhiễu ký tự, romaji, số kiểu Hán/Ả Rập).
2. **Port sang TS thuần** (`src/engine/*`), tách file nhỏ, đặt tên rõ, kiểu chặt, không đụng DOM. Hàm có `ReDoS` tiềm ẩn (regex dài trên input người dùng): đặt giới hạn độ dài input (≤ 500 ký tự) và benchmark.
3. **Golden test**: engine mới phải ra **cùng kết quả** với baseline trên 100% ca. Lệch → sửa port, không sửa baseline.
4. Sau khi xanh mới được refactor/tối ưu; mỗi lần đổi chạy lại golden.
5. Bổ sung property-based test (fast-check): `norm` idempotent; chấm không throw với chuỗi bất kỳ (emoji, RTL, 10k ký tự); điểm luôn trong khoảng hợp lệ.

## Hiển thị kết quả
Mỗi kết quả chấm trả về cấu trúc dữ liệu (không HTML): `{ score, max, issues:[{code, penalty, where, message}], diff:[{type, text}] }`. UI quyết định cách vẽ. Tuyệt đối không sinh HTML trong engine.

## Giới hạn phải ghi trên UI
Máy chỉ so chữ nhận được với bản mẫu; ngữ điệu không chấm; kết quả thi thật do giám khảo (giữ nguyên câu chữ cảnh báo của bản gốc).
