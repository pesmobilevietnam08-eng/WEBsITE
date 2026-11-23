# 02 — Kiến trúc

## Stack (quyết định cố định, đổi phải ghi ADR)
| Lớp | Chọn | Lý do |
|-----|------|-------|
| Build | **Vite 6 + TypeScript strict** | Nhanh, output tĩnh, CSP-friendly (không inline) |
| UI | **React 19** (function components, hooks) | Escape mặc định chống XSS, hệ sinh thái test tốt |
| Router | **React Router (hash hoặc browser + fallback)** | Deep link tới từng câu |
| State | `useReducer` + Context nhỏ; **Zod** validate mọi dữ liệu vào | Không cần Redux |
| CSS | **CSS Modules + CSS variables (design tokens)** | Không Tailwind để kiểm soát token & dark mode |
| PWA | **vite-plugin-pwa (Workbox)**, precache toàn bộ | Offline |
| Test | **Vitest** (unit/golden), **Testing Library**, **Playwright** (e2e + a11y bằng axe) | |
| Lint | ESLint (+ `eslint-plugin-security`, `jsx-a11y`), Prettier | |
| Font | **Self-host** Be Vietnam Pro + Noto Sans JP (subset, `font-display: swap`) | Bỏ Google Fonts runtime |
| Deploy | Static host (Cloudflare Pages / Netlify / GitHub Pages) + file `_headers` | |

Giữ số dependency runtime **tối thiểu** (react, react-dom, react-router, zod). Mỗi dependency mới phải có ADR.

## Cấu trúc thư mục đích
```
src/
  app/            App shell, router, providers, error boundary
  features/
    read/         Luyện đọc: list, practice, result
    qa/           Vấn đáp: list, practice, result, random
    dashboard/    Tiến độ, thống kê, ôn lại
    settings/     Giọng đọc, tên, theme, furigana, xuất/nhập
    promo/        Module bên thứ ba (tắt mặc định)
  engine/         THUẦN TS, không đụng DOM  ← lõi chấm điểm
    normalize/    kanji→kana, số/giờ/tiền, romaji→kana
    match/        lev, fuzzy, align, ops, classify
    grade-pic.ts  grade-free.ts  grade-read.ts
    scale.ts
  speech/         tts.ts (speechSynthesis), stt.ts (SpeechRecognition), capability detection
  data/           loaders (lazy import JSON theo Bài) + Zod schema
  storage/        localStorage wrapper: versioned, validated, migrate, export/import
  ui/             Design system: tokens.css, Button, Tabs, Card, Ruby, ScoreRing, Toast…
  lib/            utils nhỏ (escape, a11y, format)
public/           icons, manifest, _headers, robots.txt
data/             JSON nguồn (copy vào build; KHÔNG sửa nội dung)
tests/            golden, e2e
```

## Ranh giới
- `engine/` **không import** React/DOM/localStorage. Nhận chuỗi + dữ liệu → trả kết quả. Nhờ vậy test nhanh và tái dùng.
- `speech/` bọc API trình duyệt; UI chỉ gọi qua interface, dễ mock.
- `storage/` là nơi duy nhất đụng `localStorage`.
- Dữ liệu tải lazy: `import('../data/bai1.json')`; ảnh tình huống dùng `<img loading="lazy">` WebP/AVIF sinh từ PNG gốc (giữ PNG làm nguồn).

## Mô hình lưu trữ (versioned)
Key `jpd113.v3` → `{ schema:3, name, settings, attempts:{[questionId]:{best,last,count,history[]}}, readAttempts:{...}, createdAt }`. Có migrate từ key cũ `rbl-jpd113-web-v2` (đọc được dữ liệu cũ của người dùng hiện tại) và `jpds-min`.

## Hiệu năng
Code-split theo route; engine tải khi vào màn luyện; không re-render danh sách lớn (memo); ảnh có `width/height` chống CLS.
