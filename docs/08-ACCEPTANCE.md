# 08 — Nghiệm thu

## Chức năng
- [x] Giữ đủ tính năng A–D ở PRD; so với bản gốc bằng ảnh chụp cặp (`docs/baseline/` vs `docs/screenshots/`).
- [x] Golden test engine: 100% khớp baseline (1.818/1.818 ca tại `tests/golden/engine.golden.test.ts`).
- [x] Dữ liệu cũ trong `localStorage` (`rbl-jpd113-web-v2`) tự migrate, không mất điểm (`tests/unit/storage-security.test.ts`, `tests/e2e/m2-shell-settings.spec.ts`).
- [x] Chạy offline sau lần mở đầu; thông báo khi có bản mới (`tests/e2e/m6-pwa-a11y.spec.ts`, `src/app/pwa.ts`).
- [x] Micro bị chặn / không hỗ trợ / in-app browser → có hướng dẫn và đường lui (gõ).

## Giao diện
- [x] Light + dark; 360 → 1440px không vỡ, không cuộn ngang (đã kiểm chứng tự động ở 360px, 390px, 1440px trên toàn bộ 10 màn hình chính qua `scripts/capture-screenshots.mjs`).
- [x] Tương phản đạt AA (script CI `npm run check:contrast`: 46/46 cặp sáng/tối); focus ring thấy rõ; vùng chạm ≥ 44px.
- [x] Không có emoji làm icon, không có giao diện "mẫu" chung chung; có bản sắc theo `03` (Washi & Sumi, `src/ui/Icon.tsx`).
- [x] `prefers-reduced-motion` được tôn trọng (`src/ui/global.css`, `tests/e2e/m6-pwa-a11y.spec.ts`).

## Trợ năng
- [x] axe-core: 0 lỗi serious/critical trên mọi màn (`tests/e2e/m0..m6`, `docs/ACCESSIBILITY-AUDIT.md`).
- [x] Dùng được hoàn toàn bằng bàn phím; kết quả chấm đọc được qua `aria-live`.
- [x] Đoạn Nhật có `lang="ja"`; `<ruby>` đúng cấu trúc.

## Bảo mật
- [x] CSP header chặt như `04`, console 0 vi phạm (`public/_headers`, `scripts/check-headers.mjs`, `tests/e2e/m7-security.spec.ts`).
- [x] 0 `innerHTML`/`dangerouslySetInnerHTML`/`eval` trong `src` (lint + grep CI `npm run check:security`).
- [x] 0 request tới domain ngoài (kiểm bằng Playwright theo dõi network trên mọi màn).
- [x] `npm audit` không có high/critical; lockfile commit; SBOM sinh ra (`npm run sbom` → `sbom.cdx.json`; Dependabot bật ở `.github/dependabot.yml`).
- [x] Test XSS tên người học + import JSON độc hại: pass (`tests/unit/storage-security.test.ts`, `tests/e2e/m7-security.spec.ts`, kiểm toán độc lập `docs/SECURITY-AUDIT.md` 0 Critical/High/Medium còn lại).
- [ ] securityheaders.com / Observatory: A+ (sau deploy — đã kiểm chứng đầy đủ header ở local qua `public/_headers` & `tests/e2e/m7-security.spec.ts`, cần chạy quét lại sau khi xuất bản lên tên miền HTTPS thật).

## Hiệu năng
- [x] Lighthouse mobile: Perf 99 (≥ 95), A11y 100, BP 100, SEO 100 (≥ 95), LCP 1,26 s, CLS 0,0004.
- [x] JS ban đầu 121,7 KB gzip (≤ 150 KB gzip); ảnh lazy (AVIF/WebP/PNG) + kích thước `width`/`height` rõ.

## Chất lượng mã
- [x] TS strict, 0 `any` không giải thích; ESLint 0 lỗi (0 cảnh báo).
- [x] Coverage engine 96,22% lines / 95,15% stmts (≥ 90%), UI luồng chính có 18 bài test E2E (desktop + mobile).
- [x] README dev, `DEPLOY.md`, `CHANGELOG.md`, ADR đầy đủ (`docs/DECISIONS.md` ADR-001..ADR-012, `docs/SECURITY-AUDIT.md`, `docs/ACCESSIBILITY-AUDIT.md`).
