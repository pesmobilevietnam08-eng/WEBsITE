# JPD113 Speaking Trainer

Ứng dụng web luyện thi nói tiếng Nhật môn **JPD113** (luyện đọc thành tiếng, vấn đáp có tranh/không tranh, thi thử có giới hạn thời gian) — chạy hoàn toàn trên máy người dùng, hỗ trợ **PWA ngoại tuyến**, bảo mật chặt (CSP + Trusted Types) và không theo dõi người học.

## Cài đặt & Chạy phát triển

Yêu cầu: **Node.js ≥ 22** và **npm ≥ 10**.

```bash
# Cài phụ thuộc (tôn trọng ignore-scripts=true trong .npmrc)
npm ci --ignore-scripts

# Chạy môi trường phát triển (tự tách dữ liệu & tối ưu ảnh trước khi khởi chạy Vite)
npm run dev

# Build bản production (ra thư mục dist/)
npm run build

# Xem trước bản production kèm đầy đủ CSP & security headers từ public/_headers
npm run preview
```

## Lệnh kiểm thử & bảo mật

```bash
npm run check          # validate:data + lint + typecheck + unit/golden test + build + headers + contrast + static security
npm run test:coverage  # Vitest + báo cáo coverage engine
npm run test:e2e       # Playwright E2E + axe-core + PWA offline + XSS/import tests (desktop & mobile)
npm run audit          # npm audit --audit-level=high + headers + contrast + static security
npm run sbom           # Sinh CycloneDX SBOM (sbom.cdx.json)
npm run validate:data  # Kiểm tra Zod schema + đối chiếu chéo dữ liệu nguồn
```

## Kiến trúc thư mục

```
src/
  app/            AppProvider, AppShell (sidebar desktop / bottom tabs mobile), PWA Trusted Types SW
  engine/         Lõi chấm điểm thuần TypeScript (không đụng DOM/React/localStorage), khớp 100% 1.818 golden tests
  data/           Zod schema, adapter chuẩn hóa, lazy loaders theo từng Bài, alt text tranh tình huống
  storage/        Lưu trữ phiên bản hóa (jpd113.v3), migrate không phá hủy từ rbl-jpd113-web-v2, backup SHA-256
  speech/         TTS tiếng Nhật, STT nhận giọng có xin quyền minh bạch, phát hiện in-app browser
  ui/             Design System Washi & Sumi (tokens.css, Button, Tabs, ScoreRing, MicButton, DiffText, FeedbackLadder, Ruby…)
  features/       dashboard/, read/, qa/, exam/, settings/, promo/ (mặc định TẮT), shared/
  lib/            Sanitize tên, chống prototype pollution, whitelist URL ngoài, SHA-256, streak & spaced repetition
data/             JSON nguồn bất biến (KHÔNG sửa nội dung)
assets/           28 ảnh PNG nguồn gốc
public/           _headers (CSP chặt + HSTS/COOP/CORP), robots.txt, icons PWA
tests/            golden/ (1.818 ca), unit/, e2e/ (Playwright + axe-core)
docs/             PRD, kiến trúc, design system, bảo mật, DATA-REPORT, DECISIONS, DEPLOY, ACCESSIBILITY-AUDIT, SECURITY-AUDIT
```

## Lưu ý bản quyền nội dung
Dữ liệu đề luyện trong `data/` và ảnh trong `assets/images/pictures/` được giữ nguyên từ tệp gốc (`legacy/index.original.html`). Khối quảng bá bên thứ ba (JPDspeak – `manabiman.io.vn`) đã tách riêng thành module tuỳ chọn và **mặc định tắt**. Hãy đảm bảo bạn có quyền sử dụng nội dung đề trước khi công khai trên tên miền thật.
