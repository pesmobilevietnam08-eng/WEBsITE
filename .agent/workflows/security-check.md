---
description: Chạy kiểm tra bảo mật nhanh
---
1. `npm audit --audit-level=high`
2. Tìm trong `src`: `innerHTML`, `dangerouslySetInnerHTML`, `eval(`, `new Function`, `document.write`, `target="_blank"` thiếu `rel`. Phải 0 kết quả (trừ ngoại lệ có ghi chú).
3. Kiểm tra `public/_headers` đủ CSP và header ở `docs/04-SECURITY.md`.
4. Chạy e2e theo dõi network: không có request ra domain ngoài; console 0 vi phạm CSP.
5. Chạy test XSS tên người học và import JSON độc hại.
6. Báo cáo kết quả từng mục.
