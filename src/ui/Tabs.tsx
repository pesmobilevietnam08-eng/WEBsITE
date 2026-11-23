import { useRef, type KeyboardEvent } from 'react';
import styles from './Tabs.module.css';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string> {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  idPrefix?: string;
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  idPrefix = 'tab',
}: TabsProps<T>) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % options.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    else return;

    e.preventDefault();
    const target = options[next];
    if (target) {
      onChange(target.value);
      btnRefs.current[next]?.focus();
    }
  };

  return (
    <div className={styles.tabs} role="tablist" aria-label={ariaLabel}>
      {options.map((opt, idx) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              btnRefs.current[idx] = el;
            }}
            id={`${idPrefix}-${opt.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined ? <span className={styles.badge}>{opt.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
