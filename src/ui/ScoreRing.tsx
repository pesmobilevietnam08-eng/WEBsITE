import styles from './ScoreRing.module.css';

export interface ScoreRingProps {
  value: number;
  max: 15 | 100;
  label?: string;
  sublabel?: string;
  size?: 'md' | 'sm';
}

export function ScoreRing({ value, max, label, sublabel, size = 'md' }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const pct = max > 0 ? Math.round((clamped / max) * 100) : 0;
  const dim = size === 'sm' ? 68 : 96;
  const stroke = size === 'sm' ? 6 : 8;
  const r = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - clamped / max);

  const tone = pct >= 93 ? styles.good : pct >= 60 ? styles.warn : styles.bad;
  const displayVal = max === 100 ? `${Math.round(clamped)}%` : `${clamped}`;
  const ariaText =
    max === 100 ? `Điểm ${Math.round(clamped)} trên 100 phần trăm` : `Điểm ${clamped} trên ${max}`;

  return (
    <div className={styles.wrap}>
      <div
        className={[styles.ringBox, size === 'sm' ? styles.ringBoxSm : '']
          .filter(Boolean)
          .join(' ')}
        role="img"
        aria-label={ariaText}
      >
        <svg className={styles.svg} width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          <circle className={styles.track} cx={dim / 2} cy={dim / 2} r={r} strokeWidth={stroke} />
          <circle
            className={`${styles.arc} ${tone}`}
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className={styles.center} aria-hidden="true">
          <span className={`${styles.value} ${tone}`}>{displayVal}</span>
          {max === 15 ? <span className={styles.max}>/ {max}</span> : null}
        </div>
      </div>
      {label || sublabel ? (
        <div className={styles.meta}>
          {label ? <span className={`${styles.label} ${tone}`}>{label}</span> : null}
          {sublabel ? <span className={styles.sub}>{sublabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
