# Báo cáo Kiểm toán Bảo mật Độc lập & Khắc phục — JPD113 Speaking Trainer

- **Ngày thực hiện:** 2026-11-24
- **Chuẩn kiểm toán:** 9 hạng mục tại [docs/09-SECURITY-REVIEW-PROMPT.md](./09-SECURITY-REVIEW-PROMPT.md) và yêu cầu bắt buộc tại [docs/04-SECURITY.md](./04-SECURITY.md)
- **Phương pháp:** Kiểm toán tĩnh và thực nghiệm bởi agent độc lập (chỉ đọc, chưa từng tham gia viết mã), sau đó khắc phục toàn bộ phát hiện Medium & các khuyến nghị ưu tiên kèm test hồi quy (unit + E2E).

## 1. Tóm tắt kết quả

| Mức độ | Ban đầu | Đã khắc phục | Còn lại |
|---|---:|---:|---:|
| **Critical** | 0 | 0 | **0** |
| **High** | 0 | 0 | **0** |
| **Medium** | 8 (`M-01`..`M-08`) | **8** | **0** |
| **Low / Info** | 8 (`L-01`..`L-08`) | **7** | **1** (`L-01`: 4 cảnh báo moderate build-time trong `vite-plugin-pwa -> workbox-build -> glob/minimatch`, 0 runtime CVE, đã có Dependabot theo dõi) |

**Kết luận sau khắc phục:** **GO — Sẵn sàng phát hành static app** (sau khi xác nhận bản quyền nội dung đề và tên miền triển khai).

---

## 2. Chi tiết khắc phục các phát hiện Medium (`M-01`..`M-08`)

| Mã | Vấn đề được phát hiện | Biện pháp khắc phục & Bằng chứng kiểm thử |
|---|---|---|
| **M-01** | Khóa legacy `R:__proto__` / `R:constructor` vượt qua bộ lọc sau khi cắt tiền tố/trim trong `src/storage/migrate.ts` | Thêm `isSafeRecordKey()` (`/^[A-Za-z0-9._-]{1,64}$/` + chặn khóa prototype), giới hạn dung lượng `MAX_STORAGE_BYTES` và số mục `<= 300`, dùng `Object.defineProperty`, xác thực lại bằng `StorageV3Schema.safeParse()`. Test hồi quy tại `tests/unit/storage-security.test.ts`. |
| **M-02** | Chưa giới hạn số khóa `attempts`/`readAttempts`; lệch ngưỡng `MAX_IMPORT_BYTES` (1 MB) > `MAX_STORAGE_BYTES` (900 KB); chưa báo lỗi khi `saveStorageState` thất bại | Giới hạn `MAX_RECORD_ENTRIES = 300` & regex khóa trong `StorageV3Schema`; chuẩn hóa timestamp bằng `z.iso.datetime({ offset: true })`; kiểm tra kích thước payload sau sanitize `<= 900 KB` trong `importProgressJson()`; hiển thị banner cảnh báo `storageWarning` trong `AppShell` khi ghi trình duyệt thất bại. Test hồi quy tại `tests/unit/storage-security.test.ts`. |
| **M-03** | `safeJsonParse()` duyệt đệ quy không giới hạn độ sâu (JSON lồng 5.000 tầng gây tràn stack) | Quét tuyến tính O(n) `assertJsonDepthWithinLimit(raw, 20)` trước `JSON.parse()`, ném `JsonDepthError`, và chuyển `inspect()` sang vòng lặp stack. Test hồi quy 5.000 tầng tại `tests/unit/storage-security.test.ts`. |
| **M-04** | Chuẩn hóa NFKC (`U+FDFA` nở 15×) và quy đổi số (`99999999円`) vượt `maxLen` vào thuật toán O(n·m); `Int16Array` có thể tràn ở 32.767; `<textarea>` thiếu `maxLength` | Cắt độ dài lại sau `.normalize('NFKC')` và ở cuối `norm()` / `readNorm()`; chuyển `align()` / `ops()` sang `Int32Array` kèm trần `MAX_DP_LEN = 2500`; giới hạn `classify()` (`<= 512`), `lev()` / `fuzzy()` (`<= 600`); thêm `maxLength` trên 3 `<textarea>` và cắt chuỗi cho `romajiLivePreview`. Đã xác minh giữ nguyên **1.818/1.818** ca golden test (100%) + thêm test `U+FDFA` & `99999999円` trong `tests/unit/engine.property.test.ts`. |
| **M-05** | `public/_headers` đặt `Cache-Control: immutable` (1 năm) cho `/images/*` dù ảnh chưa có content hash | Đổi `/images/*` sang `Cache-Control: public, max-age=86400, must-revalidate` (giữ `immutable` cho `/assets/*` đã có hash tên tệp; Workbox vẫn precache ảnh kèm mã revision). Kiểm chứng trong `tests/e2e/m7-security.spec.ts`. |
| **M-06** | `applyUpdate()` gọi `window.location.reload()` đồng bộ trước khi Service Worker mới kích hoạt (`controllerchange`) | Lắng nghe `navigator.serviceWorker.addEventListener('controllerchange', ...)` với cờ chống lặp trong `src/app/pwa.ts`, chỉ reload sau khi SW mới đã tiếp quản. |
| **M-07** | `resetAllData()` ghi ngược `jpd113.v3` vào `localStorage` qua `useEffect` ngay sau khi xoá; để sót IndexedDB `workbox-expiration` | Dùng `skipNextPersistRef` trong `src/app/AppContext.tsx` sau `RESET_ALL`; gỡ rule `runtimeCaching` `.woff2` dư thừa (vốn tạo `workbox-expiration`) và thêm xóa `indexedDB.deleteDatabase('workbox-expiration')` trong `clearAllUserData()`. Kiểm chứng E2E trong `tests/e2e/m7-security.spec.ts`. |
| **M-08** | `scripts/run-lighthouse.mjs` gọi `npx --yes lighthouse@13.6.0` tải gói từ xa ngoài `package-lock.json` | Gỡ hoàn toàn `npx --yes`; chỉ chạy binary `lighthouse` cài sẵn cục bộ hoặc `LIGHTHOUSE_BIN`, chỉ dùng `--no-sandbox` khi `CI=true`. |

---

## 3. Khắc phục các khuyến nghị Low / Info (`L-01`..`L-08`)

- **L-01 (Theo dõi):** 4 cảnh báo moderate nằm ở chuỗi build-time `vite-plugin-pwa -> workbox-build -> glob/minimatch`; 0 lỗ hổng runtime (`dependencies` sạch hoàn toàn). Đã cấu hình `.github/dependabot.yml` (kiểm tra hàng tuần, cooldown 14 ngày).
- **L-02 (Đã xử lý một phần lớn):** Bổ sung `--no-install` cho `npx` trong `.githooks/pre-commit` và `.github/workflows/ci.yml`; thêm `sbom.cdx.json` vào `.gitignore` (sinh động bằng `npm run sbom` và upload làm artifact trong CI).
- **L-03 (Đã xử lý):** Chuyển 2 regex bậc hai ở `src/engine/grade-free.ts` sang `.includes(...) && u.endsWith('です')`; giới hạn định lượng chữ số Hán `{1,12}` trong `numbers.ts` và `grade-read.ts`; bổ sung kiểm tra an toàn regex `re:` trong `scripts/validate-data.mjs`.
- **L-04 (Đã xử lý):** Cập nhật mô tả minh bạch quyền riêng tư trong `SettingsPage.tsx` và `src/lib/i18n.ts` nêu rõ giọng TTS nhãn `Online / Natural / Google` gửi nội dung đọc (kèm tên hiển thị) tới máy chủ hãng trình duyệt, khuyến nghị chọn giọng cục bộ nếu muốn ngoại tuyến tuyệt đối.
- **L-05 (Đã xử lý):** Dọn trùng lặp `includeAssets` / `globPatterns`, gỡ `runtimeCaching` `.woff2` dư thừa, và loại trừ `KitchenSinkPage` khỏi precache Service Worker trong `vite.config.ts`.
- **L-06 (Đã xử lý):** Siết `validateExternalUrl()` trong `src/lib/externalLinks.ts` chặn `url.username`, `url.password`, `url.port` (có unit test kiểm chứng).
- **L-07 (Đã xử lý):** Hardening `scripts/preview-server.mjs`: chỉ nhận `GET`/`HEAD`, chặn `\0` và `\`, kiểm tra `resolvedDist + path.sep`, gắn header bảo mật cho phản hồi lỗi.
- **L-08 (Đã xử lý):** Khởi tạo sớm Trusted Types policy `jpd113-sw` trong `src/main.tsx` (chỉ nhận `'./sw.js'`), thêm `browsing-topics=()` vào `Permissions-Policy`, và sửa skip-link `#main-content` trong `AppShell.tsx` để không xung đột với `HashRouter` (kiểm chứng E2E trong `tests/e2e/m7-security.spec.ts`).
