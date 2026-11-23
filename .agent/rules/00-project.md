# Rule: dự án JPD113 (luôn áp dụng)

- Đọc `AGENTS.md` và các file trong `docs/` trước khi sửa code.
- Không sửa nội dung trong `data/` (câu hỏi, đáp án, thang điểm).
- Engine chấm điểm chỉ thay đổi khi golden test xanh trước và sau.
- Cấm `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`, inline script/handler.
- Không gọi mạng ngoài lúc runtime; font và thư viện tự host.
- UI tiếng Việt; tiếng Nhật dùng `lang="ja"` và font Noto Sans JP.
- Hoàn thành một Milestone = `npm run check` xanh + ảnh chụp + báo cáo ngắn, rồi dừng.
