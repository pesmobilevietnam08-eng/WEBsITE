import { useId } from 'react';
import styles from './Switch.module.css';

export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ label, description, checked, onChange, disabled = false }: SwitchProps) {
  const labelId = useId();
  const descId = useId();

  return (
    <div className={styles.row}>
      <div className={styles.texts}>
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        {description ? (
          <span id={descId} className={styles.hint}>
            {description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        className={styles.track}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
    </div>
  );
}
