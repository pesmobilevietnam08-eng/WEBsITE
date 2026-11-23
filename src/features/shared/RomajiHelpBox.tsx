import { Icon } from '../../ui';
import styles from './RomajiHelpBox.module.css';

export function RomajiHelpBox() {
  return (
    <details className={styles.help}>
      <summary className={styles.summary}>
        <span>Gõ Romaji thế nào? · Nói bằng micro bàn phím</span>
        <Icon name="chevron-down" size={18} />
      </summary>
      <div className={styles.body}>
        <p>
          <strong>Gõ Romaji</strong> (không cần cài bàn phím tiếng Nhật): máy tự đổi sang hiragana
          rồi mới so với đáp án.
        </p>
        <ul className={styles.list}>
          <li>
            Viết tách từng từ bằng dấu cách:{' '}
            <span className={styles.code} lang="ja">
              watashi wa Min desu
            </span>
          </li>
          <li>
            Trợ từ <span lang="ja">は</span> gõ <strong>wa</strong>, <span lang="ja">へ</span> gõ{' '}
            <strong>e</strong>, <span lang="ja">を</span> gõ <strong>o</strong> (hoặc wo):{' '}
            <span className={styles.code} lang="ja">
              gakkou e ikimasu
            </span>
            ,{' '}
            <span className={styles.code} lang="ja">
              terebi o mimasu
            </span>
          </li>
          <li>
            Âm kéo dài gõ như viết hiragana:{' '}
            <span className={styles.code} lang="ja">
              sensei
            </span>{' '}
            (<span lang="ja">せんせい</span>),{' '}
            <span className={styles.code} lang="ja">
              toukyou
            </span>{' '}
            (<span lang="ja">とうきょう</span>),{' '}
            <span className={styles.code} lang="ja">
              oneesan
            </span>{' '}
            (<span lang="ja">おねえさん</span>)
          </li>
          <li>
            Âm ngắt <span lang="ja">っ</span>: gấp đôi phụ âm:{' '}
            <span className={styles.code} lang="ja">
              gakkou
            </span>{' '}
            (<span lang="ja">がっこう</span>),{' '}
            <span className={styles.code} lang="ja">
              zasshi
            </span>{' '}
            (<span lang="ja">ざっし</span>)
          </li>
          <li>
            <span lang="ja">ん</span> đứng trước nguyên âm hoặc y: thêm dấu &apos;:{' '}
            <span className={styles.code} lang="ja">
              kin&apos;en
            </span>{' '}
            (<span lang="ja">きんえん</span>)
          </li>
          <li>
            Kiểu Hepburn <span className={styles.code}>shi, chi, tsu, fu, ji</span> hoặc Kunrei{' '}
            <span className={styles.code}>si, ti, tu, hu, zi</span> đều được. Katakana cũng gõ
            Romaji bình thường: <span className={styles.code}>terebi</span>.
          </li>
        </ul>

        <p>
          <strong>Nói bằng điện thoại</strong> khi nút “Nói” không chạy: bấm vào ô trả lời, rồi bấm
          biểu tượng micro trên bàn phím.
        </p>
        <ul className={styles.list}>
          <li>
            Android (Gboard): thêm tiếng Nhật trong Cài đặt → Ngôn ngữ và bàn phím. Bấm giữ phím
            cách hoặc quả cầu để chọn <span lang="ja">日本語</span>, rồi bấm micro.
          </li>
          <li>
            iPhone: Cài đặt → Cài đặt chung → Bàn phím → Thêm bàn phím mới → Tiếng Nhật, bật “Đọc
            chính tả”. Bấm quả cầu chọn <span lang="ja">日本語</span>, rồi bấm micro.
          </li>
          <li>Máy tính Windows: bấm phím Windows + H để đọc chính tả trực tiếp vào ô trả lời.</li>
        </ul>
      </div>
    </details>
  );
}
