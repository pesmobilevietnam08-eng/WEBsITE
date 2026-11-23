import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  ruled?: boolean;
  children: ReactNode;
}

export function Card({ ruled = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={[styles.card, ruled ? styles.ruled : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface QuestionCardProps {
  indexLabel: string;
  tag?: string;
  title: string;
  titleLang?: 'ja' | 'vi';
  statusText: string;
  statusTone?: 'new' | 'good' | 'warn' | 'bad';
  mastered?: boolean;
  done?: boolean;
  onClick: () => void;
}

export function QuestionCard({
  indexLabel,
  tag,
  title,
  titleLang = 'vi',
  statusText,
  statusTone = 'new',
  mastered = false,
  done = false,
  onClick,
}: QuestionCardProps) {
  const toneClass =
    statusTone === 'good'
      ? styles.statusGood
      : statusTone === 'warn'
        ? styles.statusWarn
        : statusTone === 'bad'
          ? styles.statusBad
          : styles.statusNew;

  return (
    <button
      type="button"
      className={[styles.qcard, done ? styles.qcardDone : ''].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <div className={styles.qcardHead}>
        <span className={styles.qcardNo}>{indexLabel}</span>
        {tag ? <span className={styles.qcardTag}>{tag}</span> : null}
      </div>
      <span
        className={[styles.qcardTitle, titleLang === 'ja' ? 'jp' : ''].filter(Boolean).join(' ')}
        lang={titleLang === 'ja' ? 'ja' : undefined}
      >
        {title}
      </span>
      <div className={styles.qcardFoot}>
        <span className={`${toneClass} tabular`}>{statusText}</span>
        {mastered ? (
          <span className={styles.hankoSeal} title="Đạt mức xuất sắc" aria-label="Đạt mức xuất sắc">
            優
          </span>
        ) : null}
      </div>
    </button>
  );
}
