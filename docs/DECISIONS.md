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
- **Quyết định:** Bật `ignore-scripts=true` và `save-exact=true` trong `.npmrc`; cam kết `package-lock.json`; sinh SBOM định dạng CycloneDX 1.5 (`sbom.cdx.json`) qua `npm run sbom` (`@cyclonedx/cyclonedx-npm`); cấu hình git hook qua `core.hooksPath=.githooks` thay vì phụ thuộc postinstall script của package bên thứ ba. Bổ sung wrapper `scripts/run-npm-audit.mjs` để tách `npm_config_allow_scripts` khi chạy lồng `npm run audit` trên npm 11+.
- **Lý do:** Giảm bề mặt tấn công supply chain theo `docs/04-SECURITY.md` mục 4 mà vẫn chạy được pre-commit lint/typecheck.

## ADR-010: Xử lý mã lỗi `R9` thiếu trong `data.scale` mà không sửa file nguồn `data/`
- **Ngày:** 2026-11-24
- **Quyết định:** Không sửa `data/data.json` (tuân thủ quy tắc cứng không sửa nội dung trong `data/`). Ghi nhận chi tiết 10 câu Bài 3 dùng mã `R9` thiếu trong `data.scale` vào `docs/DATA-REPORT.md`. `validateAllSources()` fail theo mặc định với mọi mã lỗi không tồn tại trong `scale` (có unit test chứng minh), còn CLI `npm run validate:data` áp dụng danh sách ngoại lệ duy nhất `Set(['R9'])` (có thể tắt bằng cờ `--strict-scale`). Khi UI cần hiển thị mô tả tổng quan cho `R9`, `src/engine/scale.ts` cung cấp fallback `R9_FALLBACK_SCALE`.
- **Lý do:** Giữ nguyên dữ liệu gốc 100%, không bỏ qua bất kỳ lỗi schema mới nào, và đảm bảo engine chấm khớp 100% với bản gốc.

## ADR-011: Bật `z.config({ jitless: true })` cho Zod v4 để tuân thủ tuyệt đối CSP & Trusted Types
- **Ngày:** 2026-11-24
- **Quyết định:** Cấu hình `z.config({ jitless: true })` tại điểm khởi chạy ứng dụng (`src/main.tsx`, `src/storage/schema.ts`, `src/data/schema.ts`).
- **Lý do:** Mặc định Zod v4 thử gọi `new Function(...)` (JIT) khi parse schema, gây cảnh báo vi phạm Trusted Types (`This document requires 'TrustedScript' assignment`) dưới chính sách CSP `require-trusted-types-for 'script'`. Chế độ `jitless: true` vô hiệu hóa hoàn toàn việc sinh mã động, đạt 0 vi phạm CSP trong console.

## ADR-012: Gia cố hậu kiểm toán bảo mật độc lập (M-01..M-08 & L-02..L-08)
- **Ngày:** 2026-11-24
- **Quyết định:**
  1. Đổi `/images/*` trong `public/_headers` từ `immutable` sang `public, max-age=86400, must-revalidate` vì tên tệp ảnh chưa chứa content hash (Workbox vẫn precache ảnh kèm mã revision nên giữ nguyên tốc độ ngoại tuyến).
  2. Giới hạn độ sâu JSON (`MAX_JSON_DEPTH = 20`) và chuyển kiểm tra prototype pollution sang duyệt lặp trong `safeJsonParse`; siết regex khóa và giới hạn `<= 300` bản ghi cho `attempts`/`readAttempts` (cả v3 lẫn migrate v2); đối chiếu dung lượng payload sau sanitize `<= 900 KB` khi import.
  3. Cắt lại chuỗi sau `.normalize('NFKC')` và cuối `norm()`/`readNorm()` để triệt tiêu khuếch đại 15× từ ký tự NFKC/số, chuyển DP sang `Int32Array` có trần độ dài, đồng thời giữ nguyên 100% khớp 1.818 ca golden test.
  4. Đồng bộ cập nhật Service Worker qua sự kiện `controllerchange`, tránh ghi ngược `localStorage` ngay sau `resetAllData()`, gỡ `runtimeCaching` `.woff2` dư thừa, và cấm `npx --yes` tải gói ngoài lockfile trong `scripts/run-lighthouse.mjs`.
- **Lý do:** Đóng toàn bộ 8 phát hiện mức Medium từ cuộc kiểm toán bảo mật độc lập ([docs/SECURITY-AUDIT.md](./SECURITY-AUDIT.md)), nâng kết luận phát hành từ `CONDITIONAL GO` lên `GO`.

## ADR-013: Định hướng thẩm mỹ phá cách "Tạp chí Nhật Bản đương đại gặp áp phích thi đấu" (Brutus × Showa Riso × Hanko)
- **Ngày:** 2026-11-24
- **Quyết định:** Nâng cấp toàn bộ Design System sang ngôn ngữ thị giác **"Tạp chí Nhật Bản đương đại gặp áp phích thi đấu"** trên nền 3 font tự host (**Shippori Mincho** 700/800 cho chữ hiển thị/điểm số/chữ Nhật khổng lồ, **Noto Sans JP** cho nội dung tiếng Nhật, **Be Vietnam Pro** cho UI), màu giấy kem riso (`#F4EFE3`) + mực đen sumi (`#111318`) + một màu nhấn đỏ chu sa gắt (`#C4221B` sáng / `#FF6E5A` tối) + xanh lam riso phụ (`#1D4CB8` / `#82ADFF`), chất liệu hạt giấy SVG tĩnh (`public/textures/washi-grain.svg`), bóng in lệch màu riso và con dấu Hanko đóng nảy.
- **So sánh 3 mức mockup cho từng màn hình điểm nhấn & lựa chọn:**
  1. **Trang chủ (`/#/`):**
     - *1A — Táo bạo:* Bìa tạp chí sạch, chữ nền mờ, 2 cột cân bằng (an toàn nhưng thiếu kịch tính áp phích).
     - *1B — Rất táo bạo (ĐƯỢC CHỌN):* Chữ Nhật khổng lồ cắt mép làm nền bìa (`日本語`), dải dọc 90° (`試験・壱`), khối **Ván đấu tiếp theo** có bóng in lệch riso với nút đỏ chu sa nổi bật ngay màn đầu, ghép **Tem bưu điện răng cưa (`〒 JPD113`)** cho streak và vòng điểm lớn. Vừa phá cách mạnh vừa giúp người mới thấy ngay nút cần bấm trong 1 giây.
     - *1C — Thử nghiệm:* Toàn trang xoay nghiêng kiểu dán tường, chữ dọc phủ 100vh (loại vì khó quét ở 360px và làm người mới rối mắt).
  2. **Luyện một câu (`/#/qa/:id` & `/#/read/:id`):**
     - *2A — Táo bạo:* Khung viền đen đậm cho tranh + nút micro lớn (chưa ra chất trường quay thi đấu).
     - *2B — Rất táo bạo (ĐƯỢC CHỌN):* Tranh tình huống đóng khung kiểu **áp phích Showa** (viền mực dày, bóng in riso xanh, dấu góc in ấn, nhãn dọc 90° `写真`), câu hỏi chữ lớn phẳng dễ đọc tuyệt đối, nút micro thiết kế như bảng **"Ghi âm trực tiếp / ON AIR"** có sóng âm động.
     - *2C — Thử nghiệm:* Ép nền tối phòng thu toàn màn hình có sóng âm sau chữ (loại vì giảm độ rõ furigana và phá nhất quán sáng/tối).
  3. **Kết quả (`QaResultPanel` & `ReadPracticePage` result):**
     - *3A — Táo bạo:* Số điểm 48px + con dấu nhỏ (thiếu cao trào đóng dấu và cảm giác bài thi được thầy chấm).
     - *3B — Rất táo bạo (ĐƯỢC CHỌN):* **Số điểm khổng lồ** dùng Shippori Mincho có hiệu ứng đếm lên, **con dấu Hanko đỏ đóng nảy** (`優`/`良`/`再`) xuống góc phiếu, dải nhãn dọc `採点票`, và khối sửa lỗi mang chất **bút đỏ thầy giáo (`赤ペン`)** khoanh trực tiếp bên lề bài.
     - *3C — Thử nghiệm:* Con dấu phủ 50% màn hình đè lên đáp án mẫu (loại vì che mất nội dung học viên cần sửa).
- **Bảo toàn giới hạn bắt buộc:** Giữ nguyên toàn bộ 46 cặp tương phản WCAG 2.2 AA (`npm run check:contrast`), vùng chạm ≥ 44px, bàn phím đầy đủ, `prefers-reduced-motion`, 0 emoji, 0 tài nguyên mạng ngoài (`assetsInlineLimit: 0` trong `vite.config.ts` để font nhỏ < 4 KB không bị inline dạng `data:` vi phạm `font-src 'self'`), và không cuộn ngang ở 360px.
- **Nhật ký 2 vòng tự phê bình Art Director (dựa trên ảnh chụp 390px & 1440px, sáng & tối):**
  - *Vòng 1 (5 điểm yếu đã sửa):* (1) Loại bỏ điểm trùng và lỗi bẹp `ScoreRing` trên màn kết quả mobile, thêm `flex: none`; (2) Tăng khoảng thở tiêu đề thương hiệu và dời chữ Nhật nền `日本語試験` xuống góc phải-dưới tránh vướng dòng chào; (3) Gỡ khung `<Card>` bọc đôi quanh tấm áp phích tranh `PictureView` ở màn luyện vấn đáp và giữ đúng 2 nút thẳng hàng trong thẻ ván đấu Trang chủ; (4) Thêm `flex: none` cho icon trong `Button` tránh méo trên 390px; (5) Đổi thanh Hiragana từ đỏ sang xanh lá (`tone="good"`) tách biệt hoàn toàn với Chữ Hán (đỏ) & Katakana (xanh lam), đồng nhất con dấu Hanko về màu đỏ chu sa đích thực.
  - *Vòng 2 (5 điểm yếu đã sửa):* (1) Khôi phục kỷ luật "1 màu nhấn gắt dùng cực hạn chế": chuyển `Banner` info và `ProgressBar` mặc định sang xanh lam Riso (`--riso`), chuyển `Switch` sang mực đen Sumi (`--ink`) để màu đỏ chu sa chỉ còn ở CTA chính, con dấu Hanko và bút đỏ sửa lỗi; (2) Căn bằng rộng nút micro `Phòng thu` và nút chấm bài trên màn luyện; (3) Cắt bỏ câu mô tả tỷ trọng đọc bị lặp ở màn kết quả đọc; (4) Sửa chữ mồ côi `"dấu"` trên hộp điểm Trang chủ và đổi viền mẫu tên trong Cài đặt sang xanh Riso; (5) Rà soát độ rõ cho người mở lần đầu trên cả 3 màn điểm nhấn (nhìn thấy nút chính và hành động đầu tiên ngay tức thì).
