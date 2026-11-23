import type { ReactNode } from 'react';
import styles from './Ruby.module.css';

export interface RubyProps {
  base: ReactNode;
  reading: ReactNode;
  variant?: 'plain' | 'han';
  className?: string;
}

export function Ruby({ base, reading, variant = 'plain', className }: RubyProps) {
  return (
    <ruby
      className={[styles.ruby, variant === 'han' ? styles.han : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      lang="ja"
    >
      {base}
      <rp>(</rp>
      <rt className={styles.rt}>{reading}</rt>
      <rp>)</rp>
    </ruby>
  );
}
