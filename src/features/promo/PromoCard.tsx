import { validateExternalUrl } from '../../lib/externalLinks';
import { Icon } from '../../ui';
import styles from './PromoCard.module.css';

export interface PromoCardProps {
  readonly enabled: boolean;
  readonly context?: 'general' | 'read-result' | 'qa-result';
}

const PROMO_URLS = {
  general: 'https://manabiman.io.vn/app/#/thi/JPD113/mau',
  'read-result': 'https://manabiman.io.vn/app/#/on-nhanh/JPD113/chu/han',
  'qa-result': 'https://manabiman.io.vn/app/#/on-nhanh/JPD113/dang',
} as const;

/**
 * Optional third-party JPDspeak promo module.
 * Strictly OFF by default (`enabled = false`); receives all state via pure props.
 */
export function PromoCard({ enabled, context = 'general' }: PromoCardProps) {
  if (!enabled) return null;

  const safeHref = validateExternalUrl(PROMO_URLS[context]);
  if (!safeHref) return null;

  const copy =
    context === 'read-result'
      ? {
          title: 'Luyện thêm chữ Hán & Katakana theo chủ đề',
          sub: 'Liên kết ngoài tới JPDspeak (manabiman.io.vn)',
        }
      : context === 'qa-result'
        ? {
            title: 'Ôn nhanh các dạng câu hỏi JPD113',
            sub: 'Liên kết ngoài tới JPDspeak (manabiman.io.vn)',
          }
        : {
            title: 'JPDspeak — Thi thử nói có bài mẫu tham khảo',
            sub: 'Liên kết ngoài tới dịch vụ bên thứ ba (manabiman.io.vn)',
          };

  return (
    <a className={styles.promo} href={safeHref} target="_blank" rel="noopener noreferrer">
      <span className={styles.meta}>
        <span className={styles.badge}>Liên kết ngoài · Bên thứ ba</span>
        <span className={styles.title}>{copy.title}</span>
        <span className={styles.sub}>{copy.sub}</span>
      </span>
      <span className={styles.ext}>
        <span>Mở trang ngoài</span>
        <Icon name="external" size={16} />
      </span>
    </a>
  );
}
