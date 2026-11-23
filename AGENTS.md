# AGENTS.md — Quy tắc làm việc cho AI agent (đọc đầu tiên)

Dự án: **JPD113 Speaking Trainer** — web app tĩnh luyện thi nói tiếng Nhật (JPD113), viết lại từ 1 file HTML 7.294 dòng (`legacy/index.original.html`) thành một codebase sạch, đẹp, an toàn.

## Bắt buộc đọc trước khi code
1. `docs/01-PRD.md` — sản phẩm là gì, ai dùng, phạm vi.
2. `docs/02-ARCHITECTURE.md` — stack, cấu trúc thư mục, ranh giới module.
3. `docs/03-DESIGN-SYSTEM.md` — token, typography, component, trạng thái.
4. `docs/04-SECURITY.md` — **checklist bảo mật là điều kiện hoàn thành**, không phải tuỳ chọn.
5. `docs/05-DATA-SCHEMA.md` — cấu trúc dữ liệu (đã tách sẵn trong `data/`).
6. `docs/06-GRADING-ENGINE.md` — logic chấm điểm phải giữ nguyên hành vi.
7. `docs/07-ROADMAP.md` — làm theo thứ tự các Milestone.

## Nguyên tắc cứng
- **Không đổi hành vi chấm điểm** khi chưa có test chứng minh. Engine cũ là tài sản quý nhất. Port sang TypeScript, bọc test, rồi mới refactor.
- **Không sửa nội dung học** (câu hỏi, đáp án, thang điểm, tiếng Việt/Nhật) trong `data/`. Chỉ được validate và sửa lỗi schema; mọi thay đổi nội dung phải liệt kê riêng cho người dùng duyệt.
- **Không dùng `innerHTML` với dữ liệu động.** Chỉ dùng framework render (React) hoặc `textContent`. Ngoại lệ phải qua sanitizer đã whitelist và ghi lý do trong code.
- **Không `eval`, không `new Function`, không inline `<script>`/`onclick=`.** CSP sẽ chặn.
- **Không gọi mạng ngoài lúc runtime** (font, CDN, analytics đều tự host hoặc bỏ). App phải chạy offline.
- **Không commit secret**, không thêm tracking.
- Mỗi PR/commit nhỏ, có test đi kèm; chạy `npm run check` (lint + typecheck + test + build) xanh mới coi là xong.
- Giao diện hoàn thiện cả **light/dark**, **mobile 360px → desktop 1440px**, **bàn phím & screen reader**, **prefers-reduced-motion**.
- Giữ ngôn ngữ UI là **tiếng Việt**; nội dung luyện là tiếng Nhật. Font Nhật: Noto Sans JP; furigana dùng `<ruby>`.
- Khi mơ hồ: chọn phương án an toàn hơn, ghi vào `docs/DECISIONS.md` (ADR ngắn), không hỏi lặt vặt.

## Lệnh chuẩn (sau Milestone 0)
```
npm run dev        # chạy local
npm run check      # lint + typecheck + unit test + build
npm run test:e2e   # Playwright
npm run audit      # npm audit + kiểm tra CSP/headers
```

## Định nghĩa "xong"
Xem `docs/08-ACCEPTANCE.md`. Không báo hoàn thành nếu chưa tick hết mục liên quan.
