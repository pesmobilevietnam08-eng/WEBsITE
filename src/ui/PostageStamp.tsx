import styles from './PostageStamp.module.css';

export interface PostageStampProps {
  readonly days: number;
  readonly totalDays: number;
}

export function PostageStamp({ days, totalDays }: PostageStampProps) {
  return (
    <div
      className={styles.wrap}
      aria-label={`Chuỗi ngày luyện ${days} ngày, tổng ${totalDays} ngày học`}
    >
      <div className={styles.stamp}>
        <div className={styles.inner}>
          <div className={styles.topRow}>
            <span className={styles.postMark} lang="ja">
              〒 JPD113
            </span>
            <span className={styles.jpTag} lang="ja">
              切手
            </span>
          </div>
          <div className={styles.center}>
            <span className={styles.num}>{days} ngày</span>
            <span className={styles.label}>Chuỗi giữ phong độ</span>
          </div>
          <div className={styles.foot}>
            <span className="tabular">Tổng {totalDays} ngày học</span>
            <span className={styles.yen} lang="ja">
              壱百拾参
            </span>
          </div>
        </div>
      </div>

      {/* Subtle Japanese postal cancellation wave mark */}
      <svg
        className={styles.cancel}
        viewBox="0 0 110 42"
        width="110"
        height="42"
        aria-hidden="true"
      >
        <circle cx="20" cy="21" r="16" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="6" y1="21" x2="34" y2="21" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M42 12 Q 52 7, 62 12 T 82 12 T 104 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M42 21 Q 52 16, 62 21 T 82 21 T 104 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M42 30 Q 52 25, 62 30 T 82 30 T 104 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
}
