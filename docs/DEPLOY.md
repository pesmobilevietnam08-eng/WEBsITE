# Hướng dẫn triển khai & cập nhật nội dung — JPD113 Speaking Trainer

Ứng dụng là **Static Web App + PWA offline hoàn toàn** (không cần backend, không cần cơ sở dữ liệu).

---

## 1. Build sản phẩm

```bash
npm ci --ignore-scripts
npm run check      # validate:data + lint + typecheck + vitest (1.818 golden) + build + headers + contrast + security
npm run audit      # npm audit --audit-level=high + security checks
npm run sbom       # sinh tệp CycloneDX sbom.cdx.json
```

Thư mục đầu ra nằm tại `dist/` (bao gồm `index.html`, `sw.js`, `manifest.webmanifest`, `_headers`, `assets/`, `images/`). **Quan trọng:** chỉ xuất bản duy nhất thư mục `dist/`, không triển khai thư mục `legacy/` lên môi trường production.

---

## 2. Triển khai trên Static Host (khuyến nghị)

### Phương án A — Cloudflare Pages (khuyến nghị để đạt A+ securityheaders.com)
1. Kết nối repo Git với Cloudflare Pages.
2. Cấu hình build:
   - **Build command:** `npm ci --ignore-scripts && npm run build`
   - **Build output directory:** `dist`
   - **Node version:** `22`
3. Cloudflare Pages **tự động đọc `dist/_headers`** (được copy từ `public/_headers`), tự kích hoạt toàn bộ CSP chặt (`require-trusted-types-for 'script'`), HSTS preload, `X-Frame-Options: DENY`, `Permissions-Policy`, `COOP/CORP` và cache `immutable`.

### Phương án B — Netlify
1. Cấu hình build:
   - **Build command:** `npm ci --ignore-scripts && npm run build`
   - **Publish directory:** `dist`
2. Netlify **tự động đọc `dist/_headers`** chuẩn theo cùng cú pháp Cloudflare Pages.

### Phương án C — GitHub Pages (cần lưu ý header)
- Ứng dụng dùng `HashRouter` nên hoạt động trực tiếp ngay cả khi đặt ở subpath (`/repo-name/`), chỉ cần cấu hình `base: './'` trong `vite.config.ts` nếu triển khai dưới subpath.
- **Lưu ý bảo mật:** GitHub Pages **không hỗ trợ tệp `_headers`**. Để đạt điểm A+ trên Mozilla Observatory / securityheaders.com, hãy đặt Cloudflare proxy hoặc dùng Cloudflare Pages / Netlify.

---

## 3. Kiểm tra bảo mật sau khi lên domain thật

Sau khi triển khai trên HTTPS domain:
1. Kiểm tra header tại `https://securityheaders.com` → mục tiêu **A+**.
2. Kiểm tra tại Mozilla Observatory (`https://developer.mozilla.org/en-US/observatory`) → mục tiêu **A+**.
3. Mở DevTools → Tab **Console**: đảm bảo **0 lỗi CSP / Trusted Types**.
4. Mở DevTools → Tab **Network**: lọc theo tên miền ngoài → đảm bảo **0 request ra bên thứ ba** (font tự host, không Google Fonts, không tracker).
5. Kiểm tra **Application → Service Workers**: bật chế độ **Offline**, tải lại trang, mở bài đọc và chấm câu vấn đáp.

---

## 4. Hướng dẫn cập nhật nội dung (thêm Bài mới)

Dữ liệu nguồn đặt tại thư mục `data/` và `assets/images/pictures/`:
1. Thêm khóa Bài mới (ví dụ `"4"`) vào `data/data.json → bai["4"]` (gồm `pic[]` và `free[]`) và `data/rd.json → "4"[]`.
2. Thêm số `4` vào `data/cfg.json → bais`.
3. Đặt ảnh tình huống mới dạng `.png` vào `assets/images/pictures/<MA_ANH>.png` và thêm mô tả `alt` tiếng Việt trong `src/data/pictureAlt.ts`.
4. Thêm nhánh `else if (bai === 4)` trong `src/data/loaders.ts` (và thêm tùy chọn `Bài 4` trong `SegmentedControl` nếu cần).
5. Chạy kiểm tra:
   ```bash
   npm run validate:data
   npm run prepare:assets
   npm run check
   ```
   Script `prepare:assets` sẽ tự tách JSON theo Bài, nén ảnh sang AVIF/WebP/PNG kèm kích thước thực và tự sinh lại subset font Noto Sans JP bao phủ toàn bộ chữ Hán mới.
