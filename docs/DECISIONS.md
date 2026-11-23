# Architecture Decision Records (ADR) — JPD113 Speaking Trainer

Tài liệu ghi nhận các quyết định kỹ thuật quan trọng theo nguyên tắc ưu tiên phương án an toàn hơn, bảo toàn hành vi chấm điểm gốc và tối giản phụ thuộc runtime.

---

## ADR-001: Gốc dự án & Stack nền tảng
- **Ngày:** 2026-11-24
- **Quyết định:** Khởi tạo codebase trong thư mục `jpd113-pro/` (cùng cấp `AGENTS.md`, `data/`, `docs/`, `legacy/`, `assets/`) sử dụng Vite + React 19 + TypeScript strict + CSS Modules + CSS custom properties.
- **Lý do:** Đúng kiến trúc `docs/02-ARCHITECTURE.md`; tách biệt rõ `src/engine/` thuần TS không đụng DOM, `src/speech/`, `src/storage/`, `src/data/`, `src/ui/`, `src/features/`.

## ADR-002: Định tuyến bằng HashRouter (`react-router`)
- **Ngày:** 2026-11-24
- **Quyết định:** Dùng `HashRouter` từ `react-router` (không cần thêm `react-router-dom`) với các route rõ ràng (`#/`, `#/read`, `#/read/:id`, `#/qa`, `#/qa/:id`, `#/exam`, `#/settings`, `#/kitchen-sink`).
- **Lý do:** App tĩnh triển khai được trên mọi static host (Cloudflare Pages, Netlify, GitHub Pages, subpath) và hoạt động ổn định khi chạy offline qua Service Worker mà không cần cấu hình rewrite phía server. Deep link tới từng câu hỏi/đoạn đọc vẫn giữ nguyên.

## ADR-003: Tự host font & giữ runtime dependencies tối thiểu
- **Ngày:** 2026-11-24
- **Quyết định:** Chỉ giữ 4 runtime dependencies (`react`, `react-dom`, `react-router`, `zod`). Font **Be Vietnam Pro** (400/500/600/700, subset `vietnamese` + `latin`) và **Noto Sans JP** (400/500/700, các subset `woff2` theo unicode-range) được đóng gói nội bộ từ `@fontsource/*` (devDependencies) vào bundle/asset tĩnh cùng origin.
- **Lý do:** Không gọi mạng ngoài lúc runtime (zero request ra `fonts.googleapis.com` / `fonts.gstatic.com`), tối ưu kích thước tải ban đầu nhờ `unicode-range` và `font-display: swap`, đồng thời tương thích CSP `font-src 'self'`.

## ADR-004: CSP chặt + Trusted Types policy hẹp cho Service Worker
- **Ngày:** 2026-11-24
- **Quyết định:** Áp dụng đầy đủ CSP từ `docs/04-SECURITY.md` trong `public/_headers` gồm `default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `require-trusted-types-for 'script'`, và `trusted-types jpd113-sw` (chỉ whitelist duy nhất URL Service Worker cùng origin `./sw.js` hoặc `/sw.js`, không mở policy `default` toàn cục). Tránh mọi `<style>` inline và tránh `style="..."` động trên DOM.
- **Lý do:** Trong Chromium, `navigator.serviceWorker.register()` là TrustedScriptURL sink khi bật `require-trusted-types-for 'script'`. Tạo policy có tên riêng `jpd113-sw` an toàn hơn `trusted-types default` và đảm bảo 0 vi phạm CSP trong console.

## ADR-005: Tách dữ liệu theo Bài và tối ưu ảnh lúc build, giữ nguyên thư mục nguồn `data/` và `assets/`
- **Ngày:** 2026-11-24
- **Quyết định:** Không chỉnh sửa bất kỳ tệp nào trong `data/` và `assets/images/pictures/`. Script `scripts/prepare-assets.mjs` chạy lúc build/dev để:
  1. Tách `data/data.json` + `data/rd.json` thành chunk theo từng Bài (`src/data/generated/bai-1.json`, `bai-2.json`, `bai-3.json`) cùng `cfg.json`, `scale.json`, `search-index.json` để tải lazy bằng dynamic `import()`.
  2. Chuyển 28 ảnh PNG gốc sang `.avif` và `.webp` (kèm fallback `.png`) đặt trong `public/images/pictures/` và sinh `src/data/generated/image-meta.json` chứa kích thước `width`/`height` thực để loại bỏ CLS.
- **Lý do:** Đảm bảo quy tắc cứng không sửa `data/`, giữ initial JS bundle ≤ 150 KB gzip và tối ưu LCP/CLS.

## ADR-006: Bộ icon SVG nội bộ (không emoji, không thư viện icon ngoài)
- **Ngày:** 2026-11-24
- **Quyết định:** Xây dựng component `src/ui/Icon.tsx` với bộ icon SVG đường nét mảnh (stroke 1.75–2px, `aria-hidden="true"`), tuyệt đối không dùng emoji làm icon UI.
- **Lý do:** Tuân thủ `docs/03-DESIGN-SYSTEM.md` ("Sổ tay luyện thi hiện đại"), giảm kích thước bundle và đảm bảo sắc nét ở cả light/dark theme.

## ADR-007: Tách riêng module quảng bá JPDspeak (`src/features/promo/`), mặc định TẮT
- **Ngày:** 2026-11-24
- **Quyết định:** Loại bỏ hoàn toàn `MutationObserver` và monkey-patch `renderResult` của bản gốc. Module `promo` nhận dữ liệu qua props thuần, tắt mặc định (`showPromo: false` trong cài đặt), mọi liên kết ngoài đi qua whitelist duy nhất `src/lib/externalLinks.ts` (`https:` + domain cho phép), luôn có `rel="noopener noreferrer"` và ghi rõ biểu tượng liên kết ngoài.
- **Lý do:** Giảm nhiễu học tập, loại bỏ điều hướng ẩn và rủi ro XSS/tabnabbing theo `docs/04-SECURITY.md`.

## ADR-008: Định dạng xuất/nhập tiến độ có checksum SHA-256 & chống Prototype Pollution
- **Ngày:** 2026-11-24
- **Quyết định:** File JSON xuất tiến độ có cấu trúc `{ format: "jpd113-backup", version: 3, exportedAt, payload, sha256 }`. Khi nhập: kiểm tra dung lượng ≤ 1 MB, parse JSON bằng reviver chặn khóa `__proto__`/`constructor`/`prototype`, đối chiếu SHA-256 bằng Web Crypto (`crypto.subtle`, có fallback thuần TS cho môi trường HTTP không secure-context), rồi validate bằng Zod `.strict()`.
- **Lý do:** Đáp ứng PRD mục 5 và checklist `docs/04-SECURITY.md` mục 5.

## ADR-009: Chuỗi cung ứng (`ignore-scripts=true` & ghim phiên bản chính xác)
- **Ngày:** 2026-11-24
- **Quyết định:** Bật `ignore-scripts=true` và `save-exact=true` trong `.npmrc`; cam kết `package-lock.json`; sinh SBOM định dạng CycloneDX trong `scripts/generate-sbom.mjs` / `npm run sbom`; cấu hình git hook qua `core.hooksPath=.githooks` thay vì phụ thuộc postinstall script của package bên thứ ba.
- **Lý do:** Giảm bề mặt tấn công supply chain theo `docs/04-SECURITY.md` mục 4 mà vẫn chạy được pre-commit lint/typecheck.

## ADR-010: Xử lý mã lỗi `R9` thiếu trong `data.scale` mà không sửa file nguồn `data/`
- **Ngày:** 2026-11-24
- **Quyết định:** Không sửa `data/data.json` (tuân thủ quy tắc cứng không sửa nội dung trong `data/`). Ghi nhận chi tiết 10 câu Bài 3 dùng mã `R9` thiếu trong `data.scale` vào `docs/DATA-REPORT.md`. `validateAllSources()` fail theo mặc định với mọi mã lỗi không tồn tại trong `scale` (có unit test chứng minh), còn CLI `npm run validate:data` áp dụng danh sách ngoại lệ duy nhất `Set(['R9'])` (có thể tắt bằng cờ `--strict-scale`). Khi UI cần hiển thị mô tả tổng quan cho `R9`, `src/engine/scale.ts` cung cấp fallback `R9_FALLBACK_SCALE`.
- **Lý do:** Giữ nguyên dữ liệu gốc 100%, không bỏ qua bất kỳ lỗi schema mới nào, và đảm bảo engine chấm khớp 100% với bản gốc.

## ADR-011: Bật `z.config({ jitless: true })` cho Zod v4 để tuân thủ tuyệt đối CSP & Trusted Types
- **Ngày:** 2026-11-24
- **Quyết định:** Cấu hình `z.config({ jitless: true })` tại điểm khởi chạy ứng dụng (`src/main.tsx`, `src/storage/schema.ts`, `src/data/schema.ts`).
- **Lý do:** Mặc định Zod v4 thử gọi `new Function(...)` (JIT) khi parse schema, gây cảnh báo vi phạm Trusted Types (`This document requires 'TrustedScript' assignment`) dưới chính sách CSP `require-trusted-types-for 'script'`. Chế độ `jitless: true` vô hiệu hóa hoàn toàn việc sinh mã động, đạt 0 vi phạm CSP trong console.
