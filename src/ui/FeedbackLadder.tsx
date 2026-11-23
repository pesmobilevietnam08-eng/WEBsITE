import { useState } from 'react';
import { Icon } from './Icon';
import styles from './FeedbackLadder.module.css';

export interface FeedbackLadderEntry {
  id: string;
  code: string;
  penalty: string;
  why: string;
  hint: string;
  sample?: string;
  active?: boolean;
}

export interface FeedbackLadderProps {
  entries: readonly FeedbackLadderEntry[];
  defaultOpenAll?: boolean;
}

export function FeedbackLadder({ entries, defaultOpenAll = false }: FeedbackLadderProps) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        defaultOpenAll
          ? entries.map((e) => e.id)
          : entries.filter((e) => e.active).map((e) => e.id),
      ),
  );

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.list}>
      {entries.map((entry) => {
        const isOpen = openIds.has(entry.id);
        const panelId = `ladder-panel-${entry.id}`;
        return (
          <div
            key={entry.id}
            className={[styles.item, entry.active ? styles.itemActive : '']
              .filter(Boolean)
              .join(' ')}
          >
            <button
              type="button"
              className={styles.trigger}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(entry.id)}
            >
              <span className={styles.code}>{entry.code}</span>
              <span className={styles.title}>{entry.why}</span>
              <span className={styles.pen}>{entry.penalty}</span>
              <Icon
                name="chevron-down"
                size={18}
                className={[styles.chevron, isOpen ? styles.chevronOpen : '']
                  .filter(Boolean)
                  .join(' ')}
              />
            </button>
            {isOpen ? (
              <div id={panelId} className={styles.body}>
                {entry.sample ? (
                  <p className={styles.sample} lang="ja">
                    {entry.sample}
                  </p>
                ) : null}
                <p>{entry.hint}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
