import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Banner.module.css';

export type BannerTone = 'info' | 'warn' | 'danger' | 'good';

export interface BannerProps {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
  role?: 'status' | 'alert';
}

export function Banner({
  tone = 'info',
  title,
  children,
  actions,
  onDismiss,
  role = 'status',
}: BannerProps) {
  const iconName = tone === 'good' ? 'check' : tone === 'info' ? 'info' : 'alert';

  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={role}>
      <Icon name={iconName} size={20} className={styles.icon} />
      <div className={styles.body}>
        {title ? <div className={styles.title}>{title}</div> : null}
        <div>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className={styles.close}
          aria-label="Đóng thông báo"
          onClick={onDismiss}
        >
          <Icon name="x" size={18} />
        </button>
      ) : null}
    </div>
  );
}
