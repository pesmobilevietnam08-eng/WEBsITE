export type Locale = 'vi';

export const UI_STRINGS = {
  vi: {
    appTitle: 'JPD113 Speaking Trainer',
    appSubtitle: 'Sổ tay luyện thi nói tiếng Nhật',
    navDashboard: 'Tiến độ',
    navRead: 'Luyện đọc',
    navQa: 'Vấn đáp',
    navExam: 'Thi thử',
    navSettings: 'Cài đặt',
    skipToMain: 'Bỏ qua tới nội dung chính',
    disclaimerRead:
      'Máy chỉ so chữ nhận được với bản mẫu để em tự luyện. Ngữ điệu không được chấm. Kết quả thi thật do giám khảo chấm.',
    disclaimerQa:
      'Điểm và phản hồi do máy ước tính từ chữ nhận được để em tự luyện. Ngữ điệu không được chấm. Kết quả thi thật do giám khảo chấm.',
    speechPrivacyNotice:
      'Lưu ý quyền riêng tư giọng nói: Khi bấm nút Micro, trình duyệt (Chrome/Edge) sử dụng Web Speech API và có thể gửi âm thanh tới máy chủ của hãng trình duyệt để chuyển giọng thành chữ. Ứng dụng này không thu, không lưu và không gửi âm thanh đi bất kỳ đâu khác. Em có thể bật chế độ “Chỉ gõ” bất kỳ lúc nào.',
    offlineTitle: 'Đang chạy ngoại tuyến',
    offlineBody:
      'Toàn bộ đề luyện đọc, vấn đáp và tranh tình huống đã sẵn sàng trên máy. Chức năng gõ Romaji/Kana hoạt động bình thường khi không có mạng.',
  },
} as const;

export function t(key: keyof (typeof UI_STRINGS)['vi'], locale: Locale = 'vi'): string {
  return UI_STRINGS[locale][key];
}
