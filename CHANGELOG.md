# Changelog

Tất cả thay đổi quan trọng của dự án **JPD113 Speaking Trainer** được ghi nhận tại đây.

## [1.0.0] — 2026-11-24

### Kiến trúc & Nền tảng (M0)
- Dựng lại hoàn toàn từ file HTML đơn 7.294 dòng sang **Vite 6 + React 19 + TypeScript strict + CSS Modules**.
- Áp dụng Design System **"Sổ tay luyện thi hiện đại" (Washi & Sumi)** với đầy đủ Light/Dark theme, 46 cặp tương phản đạt chuẩn WCAG 2.2 AA, không dùng emoji làm icon.
- Tự host font **Be Vietnam Pro** và **Noto Sans JP** (subset woff2 tối ưu, `font-display: swap`), loại bỏ hoàn toàn Google Fonts CDN.
- Thiết lập CSP chặt (`default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `require-trusted-types-for 'script'`, `trusted-types jpd113-sw`) và đầy đủ header bảo mật trong `public/_headers`.
- Cài đặt ESLint (`eslint-plugin-security`, `jsx-a11y`, `react/no-danger`), Prettier, Vitest, Playwright + axe-core, pre-commit hook (`lint-staged`), và GitHub Actions CI.

### Dữ liệu & Engine chấm điểm (M1)
- Xây dựng Zod strict schema (`src/data/schema.ts`), script `npm run validate:data`, adapter chuẩn hóa (`src/data/normalize.ts`) và báo cáo chất lượng dữ liệu (`docs/DATA-REPORT.md`). Giữ nguyên 100% nội dung gốc trong `data/`.
- Sinh bộ golden baseline bất biến gồm **1.818 ca kiểm thử** trực tiếp từ engine gốc (`legacy/app-logic.original.js`).
- Port toàn bộ engine chấm điểm sang TypeScript thuần (`src/engine/*`, 0 phụ thuộc DOM/React/localStorage, 0 chuỗi HTML): **khớp 100% trên 1.818/1.818 ca golden**, bổ sung property-based test (`fast-check`) và kiểm tra chống ReDoS, coverage engine đạt **96,7%**.

### Khung ứng dụng, Lưu trữ & Cài đặt (M2)
- Khung điều hướng đáp ứng: sidebar trái trên Desktop (1440px) và thanh tab đáy vùng ngón cái trên Mobile (390px) có hỗ trợ safe-area.
- Lưu trữ phiên bản hóa (`jpd113.v3`) có kiểm tra Zod và **migrate không phá hủy** dữ liệu cũ từ `rbl-jpd113-web-v2`.
- Trang Cài đặt đầy đủ: tên học viên (lọc ký tự an toàn chống XSS), giọng đọc tiếng Nhật, chủ đề sáng/tối, công tắc Furigana, cỡ chữ Nhật, minh bạch quyền riêng tư Web Speech API + chế độ chỉ gõ, xuất/nhập tiến độ có mã kiểm tra **SHA-256** chống prototype pollution, và nút xoá sạch dữ liệu + SW cache.
- Tách khối quảng cáo bên thứ ba (JPDspeak) thành module độc lập `src/features/promo/`, **mặc định TẮT**.

### Vấn đáp & Luyện đọc (M3–M4)
- **Vấn đáp**: 3 tab (Ngẫu nhiên, Có tranh 31 câu, Không tranh 32 câu), tranh tối ưu AVIF/WebP/PNG kèm `width`/`height` chống CLS, TTS chậm/thường, xem trước chuyển đổi Romaji → Kana, micro có xin quyền minh bạch, màn kết quả 4 bước với `ScoreRing`, `FeedbackLadder` (R0–R11), đáp án mẫu có nút nghe, bẫy thường gặp và phát âm.
- **Luyện đọc**: 44 đoạn văn (Bài 1–3), `<Ruby>` furigana có công tắc ẩn/hiện tức thì bằng CSS, tô sáng câu đang phát TTS, chấm điểm theo tỷ trọng 30/30/40 (Chữ Hán / Katakana / Hiragana), hiển thị `DiffText` đa ký hiệu (không chỉ màu sắc), danh sách lỗi theo nhóm và bảng bản mẫu có cách đọc.

### Tính năng mới, PWA & Bảo mật phát hành (M5–M7)
- **Dashboard tiến độ**: chuỗi ngày luyện tập (streak), điểm trung bình, tiến độ theo Bài, tổng hợp lỗi R0–R11 hay gặp, hàng đợi **Ôn tập thông minh** (spaced repetition), và **tìm kiếm ngoại tuyến** trên toàn bộ 107 câu hỏi/đoạn đọc.
- **Chế độ Thi thử**: bốc ngẫu nhiên đề 6 câu (1 đọc + 3 có tranh + 2 không tranh), đồng hồ đếm ngược, chấm tổng và xuất báo cáo `.txt`.
- **PWA Ngoại tuyến**: Service Worker Workbox precache toàn bộ mã nguồn, dữ liệu, ảnh và font tự host với Trusted Types policy `jpd113-sw`, thông báo khi có bản cập nhật mới (đồng bộ qua `controllerchange`); Google Lighthouse Mobile đạt **Perf 99 · A11y 100 · BP 100 · SEO 100** (LCP 1,26 s, CLS 0,0004).
- **Bảo mật & Phát hành**: Bộ E2E tấn công XSS/import độc hại, sinh SBOM CycloneDX (`sbom.cdx.json`), cấu hình Dependabot (cooldown 14 ngày), kiểm toán bảo mật độc lập (0 Critical / 0 High / 0 Medium còn lại — xem `docs/SECURITY-AUDIT.md`), tài liệu `docs/DEPLOY.md` và `docs/ACCESSIBILITY-AUDIT.md`.
