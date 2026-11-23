# 07 — Roadmap (làm tuần tự, mỗi Milestone dừng chờ duyệt)

## M0 — Nền tảng
- Khởi tạo Vite + React + TS strict, ESLint (security, jsx-a11y), Prettier, Vitest, Playwright, husky + lint-staged.
- `npm run check`, CI (GitHub Actions) chạy check + e2e + audit.
- `public/_headers` với CSP + header ở `04-SECURITY.md`; script kiểm tra header.
- Design tokens + font tự host + theme sáng/tối + trang "kitchen sink" các component.
- **Ra:** repo chạy được, CI xanh, ảnh chụp kitchen sink 2 theme × mobile/desktop.

## M1 — Dữ liệu & Engine
- Zod schema, `validate:data`, `DATA-REPORT.md`, adapter chuẩn hoá.
- Baseline golden từ engine gốc → port `src/engine/*` → golden xanh 100%.
- **Ra:** `npm run test` xanh, báo cáo số ca golden, bảng đối chiếu hàm cũ → mới.

## M2 — Khung app & điều hướng
- Router, layout mobile (tab đáy) / desktop (sidebar), ErrorBoundary, trang Cài đặt (tên, giọng, theme, furigana), storage versioned + migrate từ `rbl-jpd113-web-v2`.
- **Ra:** điều hướng mượt, dữ liệu cũ của người dùng tự chuyển sang.

## M3 — Vấn đáp
- Danh sách (3 tab + ngẫu nhiên), màn luyện (ảnh, TTS, micro/gõ romaji), màn kết quả (ScoreRing, FeedbackLadder, đáp án mẫu, bẫy, phát âm).
- **Ra:** đủ hành vi bản gốc + e2e các luồng chính.

## M4 — Luyện đọc
- Lưới đoạn, màn đọc với `<Ruby>`, nghe mẫu chậm/thường, thu/gõ, DiffText, lỗi theo nhóm.
- **Ra:** đủ hành vi bản gốc.

## M5 — Tiến độ & tính năng mới
- Dashboard, streak, ôn lại thông minh, chế độ thi thử, xuất/nhập tiến độ (an toàn), tìm kiếm.

## M6 — PWA, hiệu năng, trợ năng
- Service worker offline + cập nhật, manifest/icon, lazy load theo Bài, ảnh WebP/AVIF.
- Lighthouse ≥ mục tiêu PRD; axe 0 lỗi nghiêm trọng; test bàn phím + screen reader thủ công (ghi kết quả).

## M7 — Bảo mật & phát hành
- Chạy toàn bộ checklist `04-SECURITY.md`, e2e tấn công XSS/import độc hại, SBOM, header A+.
- Chạy `docs/09-SECURITY-REVIEW-PROMPT.md` bằng agent độc lập; sửa phát hiện.
- Tài liệu: `docs/DEPLOY.md`, `CHANGELOG.md`, hướng dẫn cập nhật nội dung (thêm Bài mới chỉ bằng thêm JSON).

## Quy tắc chung
Cuối mỗi Milestone agent phải: chạy `npm run check`, đính kèm ảnh chụp, liệt kê thay đổi + quyết định (ADR) + việc còn dang dở, rồi dừng.
