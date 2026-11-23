import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  valueLabel?: string;
  tone?: 'accent' | 'hanko' | 'kata' | 'good';
}

export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  tone = 'accent',
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.max(0, Math.min(safeMax, value));
  const pct = Math.round((clamped / safeMax) * 100);

  return (
    <div className={styles.wrap}>
      {label || valueLabel ? (
        <div className={styles.head}>
          {label ? <span className={styles.label}>{label}</span> : <span />}
          <span className={styles.valueText}>{valueLabel ?? `${pct}%`}</span>
        </div>
      ) : null}
      <progress
        className={[styles.bar, tone !== 'accent' ? styles[tone] : ''].filter(Boolean).join(' ')}
        value={clamped}
        max={safeMax}
        aria-label={label ?? 'Tiến độ'}
      />
    </div>
  );
}
