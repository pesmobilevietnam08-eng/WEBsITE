import styles from './Skeleton.module.css';

export interface SkeletonProps {
  variant?: 'line' | 'title' | 'card';
  className?: string;
}

export function Skeleton({ variant = 'line', className }: SkeletonProps) {
  return (
    <span
      className={[styles.skel, styles[variant], className ?? ''].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.grid} role="status" aria-label="Đang tải dữ liệu">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  );
}
