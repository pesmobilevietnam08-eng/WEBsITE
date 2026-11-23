/**
 * Bản nháp mô tả ảnh (alt text) tiếng Việt cho 28 tranh tình huống JPD113.
 * TODO-review: Cần người biên soạn nội dung đối chiếu từng hình ảnh và hiệu đính trước khi phát hành rộng rãi.
 */
export const PICTURE_ALT_MAP: Readonly<Record<string, string>> = {
  'B1-T01': 'TODO-review: Tranh hai nhân vật Sofia (quốc tịch Nga) và Luca (quốc tịch Ý) kèm thẻ tên tiếng Nhật.',
  'B1-T03': 'TODO-review: Tranh nhân vật Kevin kèm thông tin nghề nghiệp giáo viên trường tiếng Nhật.',
  'B1-T05': 'TODO-review: Tranh nhân vật Minh kèm thông tin sinh viên đại học.',
  'B1-T17': 'TODO-review: Tranh nhân vật Maria kèm thẻ thông tin sinh viên Đại học Sakura.',
  'B1-T07': 'TODO-review: Tranh nhân vật Emma kèm thông tin độ tuổi 20 tuổi.',
  'B1-T09': 'TODO-review: Tranh lịch sinh nhật của nhân vật Julia (7/3) và Roberto (20/9).',
  'B1-T11': 'TODO-review: Tranh minh họa sở thích du lịch và xem phim của nhân vật Tina.',
  'B1-T13': 'TODO-review: Tranh tờ lịch tháng hiển thị các thứ trong tuần và ngày 13 rơi vào thứ Ba.',
  'B1-T15': 'TODO-review: Tranh tờ lịch sự kiện tháng 7 đánh dấu lễ hội pháo hoa ngày 31/7.',
  'B2-T01': 'TODO-review: Tranh chiếc đồng hồ đeo tay gắn thẻ giá 3.800 yên.',
  'B2-T05': 'TODO-review: Tranh quyển sách học tiếng Anh.',
  'B2-T06': 'TODO-review: Tranh bát súp rau củ.',
  'B2-T08': 'TODO-review: Tranh sơ đồ các tầng trong tòa nhà, cửa hàng 100 yên nằm ở tầng 3.',
  'B2-T11': 'TODO-review: Tranh thực đơn gọi món tại quán gồm 3 chiếc bánh ngọt và 2 ly cà phê.',
  'B2-T15': 'TODO-review: Tranh minh họa chiếc ví cầm tay (saifu).',
  'B3-T01': 'TODO-review: Tranh nhân vật Yan xem ti vi vào Chủ nhật.',
  'B3-T03': 'TODO-review: Tranh nhân vật Yan chơi bóng đá vào thứ Bảy.',
  'B3-T08': 'TODO-review: Tranh nhân vật Linh ăn cơm buổi sáng.',
  'B3-T16': 'TODO-review: Tranh nhân vật Yan trượt tuyết vào mùa đông.',
  'B3-T06': 'TODO-review: Tranh nhân vật Yan đi tới công viên vào Chủ nhật.',
  'B3-T17': 'TODO-review: Tranh nhân vật An học bài hằng ngày tại trường.',
  'B3-T34': 'TODO-review: Tranh nhân vật Suzuki đi làm lúc 8 giờ sáng.',
  'B3-T10': 'TODO-review: Tranh mặt đồng hồ chỉ 9 giờ 10 phút.',
  'B3-T12': 'TODO-review: Tranh bảng giờ mở cửa thư viện từ 9 giờ sáng đến 5 giờ chiều.',
  'B3-T30': 'TODO-review: Tranh bảng giờ làm việc bưu điện từ 9 giờ sáng đến 6 giờ chiều.',
  'B3-T35': 'TODO-review: Tranh bữa sáng hằng ngày của Yan gồm cơm và trứng.',
  'B3-T21': 'TODO-review: Tranh nhân vật Yan ở nhà nghỉ ngơi, không đi đâu vào ngày nghỉ.',
  'B3-T36': 'TODO-review: Tranh bảng khung giờ làm việc của Suzuki từ 1 giờ chiều đến 6 giờ chiều.',
};

export function getPictureAlt(picKey: string): string {
  const raw = PICTURE_ALT_MAP[picKey];
  if (!raw) return 'Tranh tình huống của câu hỏi vấn đáp';
  return raw.replace(/^TODO-review:\s*/, '');
}
