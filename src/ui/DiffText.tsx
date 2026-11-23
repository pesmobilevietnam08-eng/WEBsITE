import styles from './DiffText.module.css';

export type DiffTokenType = 'match' | 'wrong' | 'missing' | 'extra';

export interface DiffToken {
  type: DiffTokenType;
  text: string;
}

export interface DiffTextProps {
  tokens: readonly DiffToken[];
  showLegend?: boolean;
}

export function DiffText({ tokens, showLegend = false }: DiffTextProps) {
  return (
    <div>
      <div className={styles.diff} lang="ja">
        {tokens.map((tok, i) => {
          if (tok.type === 'match') {
            return (
              <span key={i} className={styles.match}>
                {tok.text}
              </span>
            );
          }
          if (tok.type === 'wrong') {
            return (
              <span key={i} className={styles.wrong} title="Đọc khác mẫu">
                <span className="sr-only">Sai: </span>
                {tok.text}
              </span>
            );
          }
          if (tok.type === 'missing') {
            return (
              <span key={i} className={styles.missing} title="Thiếu chữ">
                <span className="sr-only">Thiếu: </span>[{tok.text}]
              </span>
            );
          }
          return (
            <span key={i} className={styles.extra} title="Đọc thừa chữ">
              <span className="sr-only">Thừa: </span>+{tok.text}
            </span>
          );
        })}
      </div>
      {showLegend ? (
        <div className={styles.legend} aria-label="Chú thích so khớp">
          <span className={styles.legendItem}>
            <span className={styles.wrong} lang="ja">
              あ
            </span>
            <span>Đọc sai (gạch sóng)</span>
          </span>
          <span className={styles.legendItem}>
            <span className={styles.missing} lang="ja">
              [あ]
            </span>
            <span>Thiếu chữ (ngoặc vuông)</span>
          </span>
          <span className={styles.legendItem}>
            <span className={styles.extra} lang="ja">
              +あ
            </span>
            <span>Thừa chữ (gạch ngang)</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
