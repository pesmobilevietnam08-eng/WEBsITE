import styles from './HankoStamp.module.css';

export interface HankoStampProps {
  readonly glyph: string;
  readonly caption?: string;
  readonly tone?: 'hanko' | 'good' | 'warn';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly animate?: boolean;
  readonly label?: string;
}

export function HankoStamp({
  glyph,
  caption,
  tone = 'hanko',
  size = 'md',
  animate = true,
  label,
}: HankoStampProps) {
  const toneClass = tone === 'good' ? styles.good : tone === 'warn' ? styles.warn : styles.hanko;
  const sizeClass = size === 'lg' ? styles.lg : size === 'sm' ? styles.sm : styles.md;

  return (
    <span
      className={[styles.stamp, toneClass, sizeClass, animate ? styles.animate : '']
        .filter(Boolean)
        .join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      lang="ja"
    >
      <span className={styles.inner}>
        <span className={styles.glyph}>{glyph}</span>
        {caption ? <span className={styles.caption}>{caption}</span> : null}
      </span>
    </span>
  );
}
