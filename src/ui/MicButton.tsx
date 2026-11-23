import { Icon } from './Icon';
import styles from './MicButton.module.css';

export type MicState = 'idle' | 'listening' | 'error' | 'unsupported';

export interface MicButtonProps {
  state: MicState;
  idleLabel?: string;
  listeningLabel?: string;
  size?: 'md' | 'lg';
  onClick: () => void;
}

export function MicButton({
  state,
  idleLabel = 'Nói bằng micro',
  listeningLabel = 'Đang thu trực tiếp… bấm để dừng',
  size = 'md',
  onClick,
}: MicButtonProps) {
  const isListening = state === 'listening';
  const isError = state === 'error';
  const isUnsupported = state === 'unsupported';

  const label = isListening
    ? listeningLabel
    : isError
      ? 'Micro bị chặn'
      : isUnsupported
        ? 'Trình duyệt không hỗ trợ micro'
        : idleLabel;

  return (
    <button
      type="button"
      className={[
        styles.mic,
        isListening ? styles.listening : '',
        isError ? styles.error : '',
        size === 'lg' ? styles.large : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={isListening}
      disabled={isError || isUnsupported}
      onClick={onClick}
    >
      <span className={styles.lampWrap} aria-hidden="true">
        {isListening ? (
          <span className={styles.waves}>
            <span className={styles.bar} />
            <span className={`${styles.bar} ${styles.bar2}`} />
            <span className={`${styles.bar} ${styles.bar3}`} />
            <span className={`${styles.bar} ${styles.bar4}`} />
            <span className={`${styles.bar} ${styles.bar5}`} />
          </span>
        ) : (
          <span className={styles.recLamp}>
            <Icon name={isError || isUnsupported ? 'mic-off' : 'mic'} size={18} />
          </span>
        )}
      </span>
      <span className={styles.textWrap}>
        <span className={styles.label}>{label}</span>
        {!isError && !isUnsupported ? (
          <span className={styles.sub} aria-hidden="true">
            {isListening ? 'ON AIR · Đang thu âm' : 'Ghi âm trực tiếp'}
          </span>
        ) : null}
      </span>
    </button>
  );
}
