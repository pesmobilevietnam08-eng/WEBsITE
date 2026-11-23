# 04 — Bảo mật (điều kiện hoàn thành)

App tĩnh, không backend, không tài khoản → bề mặt tấn công chính là **XSS, chuỗi cung ứng, dữ liệu cục bộ bị sửa, quyền micro, riêng tư giọng nói, liên kết ngoài**. Dưới đây là hiện trạng bản gốc và yêu cầu bản mới.

## Hiện trạng bản gốc (cần khắc phục)
| Vấn đề | Chi tiết | Xử lý |
|--------|----------|-------|
| `innerHTML` với template string | ≥ 10 chỗ (`#grid`, `#vQ`, `#vR`, `#rGrid`, voice select…). Có `esc()` nhưng dễ sót | Render bằng React; cấm `dangerouslySetInnerHTML`; lint rule chặn |
| Inline `<script>` + inline `<style>` | Không thể bật CSP chặt | Tách file, CSP `script-src 'self'` |
| Google Fonts từ CDN | Lộ IP người học cho bên thứ ba, phụ thuộc mạng | Tự host |
| Liên kết `target=_blank` ra manabiman.io.vn | Quảng cáo + điều hướng ngoài | Module `promo` tắt mặc định; mọi link ngoài `rel="noopener noreferrer"`, hiển thị rõ là link ngoài |
| `MutationObserver` + monkey-patch hàm (`renderResult = …`) cho promo | Mong manh, khó audit | Bỏ; promo nhận dữ liệu qua props |
| `localStorage` đọc `JSON.parse` không kiểm | Dữ liệu hỏng/bị sửa làm app crash | Zod validate + migrate + fallback |
| Ảnh base64 trong HTML | Không cache được, nặng 1,2 MB | Ảnh file riêng, hash tên, precache |
| Không có header bảo mật | | `_headers` bên dưới |

## Yêu cầu bắt buộc

### 1. Content Security Policy (qua header, không chỉ `<meta>`)
```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  style-src 'self';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  media-src 'self' blob:;
  manifest-src 'self';
  worker-src 'self';
  base-uri 'none';
  form-action 'none';
  frame-ancestors 'none';
  object-src 'none';
  upgrade-insecure-requests;
  require-trusted-types-for 'script';
  trusted-types default;   # nếu thư viện cần; mục tiêu: không cần
```
Nếu Vite/React bắt buộc `style-src 'unsafe-inline'` thì dùng **nonce/hash**, không `unsafe-inline`. Test e2e: mở app, **0 vi phạm CSP** trong console.

### 2. Header khác (`public/_headers`)
`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` ·
`X-Content-Type-Options: nosniff` · `Referrer-Policy: no-referrer` ·
`Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()` ·
`Cross-Origin-Opener-Policy: same-origin` · `Cross-Origin-Resource-Policy: same-origin` ·
`X-Frame-Options: DENY` (dự phòng cho trình duyệt cũ) · cache dài `immutable` cho file có hash, `no-cache` cho `index.html`/`sw.js`.

### 3. Chống XSS
- Không `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`eval`/`new Function`/`setTimeout(string)`; ESLint `no-restricted-syntax` + `react/no-danger` = error.
- Tên người học (nhập tự do) và mọi chuỗi từ storage coi là **không tin cậy**: giới hạn độ dài, whitelist ký tự (kana/kanji/latin/số), render dạng text.
- Link ngoài: chỉ `https:`, whitelist domain trong một file duy nhất.

### 4. Chuỗi cung ứng
- `package-lock.json` commit; `npm ci` trong CI; `npm audit --audit-level=high` phải sạch.
- Ghim phiên bản chính xác; bật Dependabot/Renovate; không cài package < 2 tuần tuổi nếu không cần.
- Không chạy script `postinstall` lạ (`ignore-scripts=true` mặc định, whitelist riêng).
- Sinh **SBOM** (CycloneDX) khi build. Không tải script từ CDN; nếu bắt buộc có SRI.
- Service worker chỉ precache file cùng origin, có cơ chế cập nhật + thông báo "có phiên bản mới".

### 5. Dữ liệu cục bộ
- Một lớp `storage/` duy nhất; schema Zod; giới hạn kích thước; try/catch (private mode, quota).
- **Xuất/nhập tiến độ**: parse an toàn, validate schema, giới hạn 1 MB, từ chối khoá lạ (chống prototype pollution: dùng `Object.create(null)`/lọc `__proto__`, `constructor`, `prototype`).
- Nút "Xoá toàn bộ dữ liệu" xoá localStorage + cache SW.
- Không lưu audio. Không lưu thông tin nhận dạng cá nhân ngoài tên hiển thị.

### 6. Micro & riêng tư giọng nói
- Xin quyền micro **chỉ khi người dùng bấm** nút; giải thích bằng tiếng Việt trước khi xin.
- **Cảnh báo minh bạch** trong Cài đặt/lần dùng đầu: Web Speech API của Chrome/Edge có thể gửi âm thanh tới máy chủ của hãng trình duyệt để nhận dạng; app không thu/lưu/gửi âm thanh đi đâu khác. Cho phép chọn chế độ "chỉ gõ".
- Phát hiện in-app browser (Zalo/FB/Messenger/…) → banner hướng dẫn mở bằng Chrome/Safari.
- Không dùng analytics/tracker. Nếu sau này cần đo lường → ADR + banner đồng ý, ưu tiên tự host, không cookie.

### 7. Chống clickjacking / điều hướng
`frame-ancestors 'none'`; không dùng `window.open` không `noopener`; không `target=_blank` thiếu `rel`.

### 8. Kiểm thử bảo mật tự động
- Unit test: hàm sanitize/validate tên, import JSON độc hại (`__proto__`, chuỗi 10 MB, kiểu sai), URL `javascript:`.
- E2E: nhập tên `<img src=x onerror=alert(1)>` và import file độc hại → không thực thi, không crash.
- CI: `npm audit`, `eslint-plugin-security`, kiểm tra header bằng script đọc `_headers`, quét bundle không chứa `eval(`/`innerHTML`.
- Mozilla Observatory / securityheaders.com mục tiêu **A+** sau khi deploy.

## Không cần (tránh làm quá)
Không thêm đăng nhập, mã hoá localStorage "cho oai" (không có khoá an toàn phía client), hay captcha.
