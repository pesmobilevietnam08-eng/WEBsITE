import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'book', title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.iconBox}>
        <Icon name={icon} size={24} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
