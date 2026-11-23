# 08 — Nghiệm thu

## Chức năng
- [ ] Giữ đủ tính năng A–D ở PRD; so với bản gốc bằng ảnh chụp cặp.
- [ ] Golden test engine: 100% khớp baseline.
- [ ] Dữ liệu cũ trong `localStorage` (`rbl-jpd113-web-v2`) tự migrate, không mất điểm.
- [ ] Chạy offline sau lần mở đầu; thông báo khi có bản mới.
- [ ] Micro bị chặn / không hỗ trợ / in-app browser → có hướng dẫn và đường lui (gõ).

## Giao diện
- [ ] Light + dark; 360 → 1440px không vỡ, không cuộn ngang.
- [ ] Tương phản đạt AA (script CI); focus ring thấy rõ; vùng chạm ≥ 44px.
- [ ] Không có emoji làm icon, không có giao diện "mẫu" chung chung; có bản sắc theo `03`.
- [ ] `prefers-reduced-motion` được tôn trọng.

## Trợ năng
- [ ] axe-core: 0 lỗi serious/critical trên mọi màn.
- [ ] Dùng được hoàn toàn bằng bàn phím; kết quả chấm đọc được qua `aria-live`.
- [ ] Đoạn Nhật có `lang="ja"`; `<ruby>` đúng cấu trúc.

## Bảo mật
- [ ] CSP header chặt như `04`, console 0 vi phạm.
- [ ] 0 `innerHTML`/`dangerouslySetInnerHTML`/`eval` trong `src` (lint + grep CI).
- [ ] 0 request tới domain ngoài (kiểm bằng Playwright theo dõi network).
- [ ] `npm audit` không có high/critical; lockfile commit; SBOM sinh ra.
- [ ] Test XSS tên người học + import JSON độc hại: pass.
- [ ] securityheaders.com / Observatory: A+ (sau deploy).

## Hiệu năng
- [ ] Lighthouse mobile: Perf ≥ 95, A11y 100, BP 100, SEO ≥ 95.
- [ ] JS ban đầu ≤ 150 KB gzip; ảnh lazy + kích thước rõ.

## Chất lượng mã
- [ ] TS strict, 0 `any` không giải thích; ESLint 0 lỗi.
- [ ] Coverage engine ≥ 90%, UI luồng chính có e2e.
- [ ] README dev, `DEPLOY.md`, `CHANGELOG.md`, ADR đầy đủ.
