import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Toast.module.css';

export type ToastTone = 'info' | 'good' | 'bad';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  pushToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId++;
      setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3600);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} aria-live="polite" aria-atomic="true">
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              styles.toast,
              item.tone === 'good' ? styles.good : item.tone === 'bad' ? styles.bad : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="status"
          >
            <Icon
              name={item.tone === 'good' ? 'check' : item.tone === 'bad' ? 'alert' : 'info'}
              size={18}
            />
            <span className={styles.msg}>{item.message}</span>
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Đóng thông báo"
              onClick={() => dismiss(item.id)}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      pushToast: () => {
        /* no-op outside provider */
      },
    };
  }
  return ctx;
}
