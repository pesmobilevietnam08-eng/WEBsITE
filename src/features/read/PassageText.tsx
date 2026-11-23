import { Fragment, type ReactNode } from 'react';
import { BRK, kataToHira, segs, type AlignSlot, type PreparedReadingPassage } from '../../engine';
import { Ruby } from '../../ui';
import styles from './PassageText.module.css';

export interface PassageTextProps {
  readonly passage: PreparedReadingPassage;
  readonly mode: 'practice' | 'reference';
  readonly activeSentenceIdx?: number | null;
  readonly alignSlots?: readonly AlignSlot[];
  readonly fmt?: string;
}

type RefCell =
  | {
      readonly kind: 'ruby-han';
      readonly base: string;
      readonly isHan: boolean;
      readonly chars: readonly { ch: string; refIx: number }[];
    }
  | { readonly kind: 'kata'; readonly chars: readonly { ch: string; refIx: number }[] }
  | { readonly kind: 'text'; readonly ch: string }
  | { readonly kind: 'char'; readonly ch: string; readonly refIx: number; readonly alt?: string };

function buildReferenceSentences(
  passage: PreparedReadingPassage,
  isF133: boolean,
): readonly (readonly RefCell[])[] {
  let ix = 0;
  return passage.sents.map((sent) => {
    const cells: RefCell[] = [];
    for (const seg of segs(sent)) {
      if (seg.t === 'h' || seg.t === 'f') {
        const ys = [...kataToHira(seg.y ?? '')];
        const chars = ys.map((ch) => ({ ch, refIx: ix++ }));
        cells.push({ kind: 'ruby-han', base: seg.k ?? '', isHan: seg.t === 'h', chars });
      } else if (seg.t === 'k') {
        const chars = [...(seg.s ?? '')].map((ch) => ({ ch, refIx: ix++ }));
        cells.push({ kind: 'kata', chars });
      } else {
        for (const ch of seg.s ?? '') {
          if (BRK.test(ch)) {
            cells.push({ kind: 'text', ch });
            continue;
          }
          const curIx = ix++;
          const tok = passage.ref[curIx];
          cells.push({
            kind: 'char',
            ch,
            refIx: curIx,
            alt: tok && tok.a && !isF133 ? tok.a : undefined,
          });
        }
      }
    }
    return cells;
  });
}

export function PassageText({
  passage,
  mode,
  activeSentenceIdx = null,
  alignSlots,
  fmt = '113',
}: PassageTextProps) {
  const isF133 = fmt === '133';

  if (mode === 'practice') {
    return (
      <div className={styles.passage} lang="ja">
        {passage.sents.map((sent, si) => {
          const content = segs(sent).map((seg, idx) => {
            if (seg.t === 'h') {
              return (
                <Ruby
                  key={idx}
                  base={seg.k ?? ''}
                  reading={seg.y ?? ''}
                  variant="han"
                  className={styles.han}
                />
              );
            }
            if (seg.t === 'f') {
              return <Ruby key={idx} base={seg.k ?? ''} reading={seg.y ?? ''} />;
            }
            if (seg.t === 'k') {
              return (
                <span key={idx} className={styles.kata}>
                  {seg.s}
                </span>
              );
            }
            return <Fragment key={idx}>{seg.s}</Fragment>;
          });

          const cls = [styles.snt, activeSentenceIdx === si ? styles.sntActive : '']
            .filter(Boolean)
            .join(' ');

          if (si === 0 && passage.title) {
            return (
              <div key={si} className={styles.ptitle}>
                <span className={cls}>{content}</span>
              </div>
            );
          }

          return (
            <Fragment key={si}>
              <span className={cls}>{content}</span>
              {si < passage.sents.length - 1 ? ' ' : ''}
            </Fragment>
          );
        })}
      </div>
    );
  }

  const refSentences = buildReferenceSentences(passage, isF133);

  const renderChar = (ch: string, refIndex: number, key: string): ReactNode => {
    const bad = Boolean(alignSlots && alignSlots[refIndex] && !alignSlots[refIndex]?.ok);
    return (
      <span key={key} className={bad ? styles.errChar : styles.okChar}>
        {bad ? <span className="sr-only">Chưa khớp: </span> : null}
        {ch}
      </span>
    );
  };

  return (
    <div className={styles.passage} lang="ja">
      {refSentences.map((cells, si) => {
        const nodes = cells.map((cell, ci) => {
          if (cell.kind === 'ruby-han') {
            return (
              <ruby key={ci} className={styles.ruby} lang="ja">
                <span className={cell.isHan ? styles.han : undefined}>{cell.base}</span>
                <rp>(</rp>
                <rt className={styles.rt}>
                  {cell.chars.map((item, q) => renderChar(item.ch, item.refIx, `rt-${ci}-${q}`))}
                </rt>
                <rp>)</rp>
              </ruby>
            );
          }
          if (cell.kind === 'kata') {
            return (
              <span key={ci} className={styles.kata}>
                {cell.chars.map((item, q) => renderChar(item.ch, item.refIx, `k-${ci}-${q}`))}
              </span>
            );
          }
          if (cell.kind === 'text') {
            return <Fragment key={ci}>{cell.ch}</Fragment>;
          }
          const chNode = renderChar(cell.ch, cell.refIx, `c-${ci}`);
          if (cell.alt) {
            return (
              <ruby key={ci} className={styles.ruby} lang="ja">
                {chNode}
                <rp>(</rp>
                <rt className={styles.rt}>{cell.alt}</rt>
                <rp>)</rp>
              </ruby>
            );
          }
          return chNode;
        });

        if (si === 0 && passage.title) {
          return (
            <div key={si} className={styles.ptitle}>
              {nodes}
            </div>
          );
        }
        return (
          <Fragment key={si}>
            {nodes}
            {si < refSentences.length - 1 ? ' ' : ''}
          </Fragment>
        );
      })}
    </div>
  );
}
