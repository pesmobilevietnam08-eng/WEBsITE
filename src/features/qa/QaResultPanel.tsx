import type { FreeQuestion, PicQuestion } from '../../data/normalize';
import {
  formatQuestionText,
  labelOf,
  parseDisplayHighlight,
  type FreeCheckItem,
  type PicGradeResult,
} from '../../engine';
import { speakQuestion } from '../../speech';
import { Banner, Button, Card, CountUpNumber, FeedbackLadder, HankoStamp, Icon } from '../../ui';
import { PromoCard } from '../promo/PromoCard';
import styles from './QaResultPanel.module.css';

function stripLeadingPenalty(hint: string): string {
  return hint.replace(/^[−-](?:\d+[.,]\d+|\d+)\s*/, '');
}

export interface QaResultPanelProps {
  readonly question: PicQuestion | FreeQuestion;
  readonly learnerName: string;
  readonly submittedText: string;
  readonly picResult: PicGradeResult | null;
  readonly freeResult: readonly FreeCheckItem[] | null;
  readonly voiceURI: string | null;
  readonly showPromo: boolean;
}

export function QaResultPanel({
  question,
  learnerName,
  submittedText,
  picResult,
  freeResult,
  voiceURI,
  showPromo,
}: QaResultPanelProps) {
  const playSample = (jp: string) => {
    speakQuestion(jp.replace(/○○/g, learnerName), { voiceURI });
  };

  if (question.kind === 'pic' && picResult) {
    const label = labelOf(picResult.p);
    const toneClass =
      label.tone === 'good'
        ? styles.toneGood
        : label.tone === 'mid'
          ? styles.toneMid
          : styles.toneLow;

    const stampGlyph = picResult.p >= 93 ? '優' : picResult.p >= 65 ? '良' : '再';
    const stampCaption = picResult.p >= 93 ? '合格' : picResult.p >= 65 ? '採点済' : '再挑戦';

    const displaySpans = parseDisplayHighlight(
      formatQuestionText(question.questionDisplay, learnerName),
    );

    const activeLadderEntries = picResult.items.map((item, idx) => ({
      id: `ded-${item.c}-${idx}`,
      code: item.c,
      penalty: `−${item.pen} điểm`,
      why: item.why || item.c,
      hint: stripLeadingPenalty(item.hint),
      active: true,
    }));

    const referenceLadderEntries = question.ladder
      .filter((row) => row.c !== null)
      .map((row, idx) => ({
        id: `ref-${row.c}-${idx}`,
        code: row.c ?? 'R0',
        penalty: `−${15 - row.s} điểm`,
        why: row.why,
        sample: row.a,
        hint: stripLeadingPenalty(row.hint),
        active: picResult.items.some((it) => it.c === row.c),
      }));

    return (
      <div className={`${styles.panel} page-turn`} aria-live="polite">
        <Card ruled className={`${styles.sheet} ${toneClass}`}>
          {/* SPOTLIGHT 3 — Giant Count-Up Score + Slamming Red Hanko Stamp */}
          <div className={styles.scoreHero}>
            <div className={styles.scoreSpine} aria-hidden="true">
              <span className="jp-spine" lang="ja">
                採点票
              </span>
            </div>

            <div className={styles.scoreMain}>
              <div className={styles.scoreRow}>
                <span className={styles.giantScore}>
                  <CountUpNumber value={picResult.p} suffix="%" />
                </span>
                <span className={styles.fraction}>
                  <strong className="tabular">{picResult.s}</strong>/15 điểm
                </span>
              </div>
              <p className={styles.verdict}>{label.text}</p>
              <p className={styles.smallMuted}>
                Kết quả do máy ước tính từ chữ nhận được, dùng để tự luyện; ngữ điệu không được
                chấm.
              </p>
            </div>

            <div className={styles.stampDock}>
              <HankoStamp
                glyph={stampGlyph}
                caption={stampCaption}
                tone="hanko"
                size="lg"
                label={`Con dấu chấm bài: ${label.text}`}
              />
            </div>
          </div>

          {picResult.zero ? (
            <Banner tone="danger" role="alert">
              Nội dung chưa đúng với tranh hoặc với câu hỏi nên câu này tính 0%.
            </Banner>
          ) : null}

          {/* Section 1 */}
          <div className={styles.section}>
            <h2 className={styles.secTitle}>Câu hỏi này hỏi gì</h2>
            <p className={styles.jpLine} lang="ja">
              {displaySpans.map((span, idx) =>
                span.mark ? (
                  <mark key={idx} className={styles.mark}>
                    {span.text}
                  </mark>
                ) : (
                  <span key={idx}>{span.text}</span>
                ),
              )}
            </p>
            <p>{question.meaningVn}</p>
            <p className={styles.smallMuted}>
              <strong>Từ hỏi:</strong> {question.whHint}
            </p>
            <div>
              <p className={styles.smallMuted}>
                <strong>Em cần nghe 3 chỗ:</strong>
              </p>
              <ul className={styles.list}>
                {question.listenCues.map((cue, idx) => (
                  <li key={idx}>{cue}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div className={styles.section}>
            <h2 className={styles.secTitle}>Em đã nói</h2>
            <div className={styles.saidBox} lang="ja">
              {submittedText}
            </div>
          </div>

          {/* Section 3 — Teacher Red-Pen Corrections */}
          <div className={`${styles.section} ${styles.redPenZone}`}>
            <div className={styles.redPenHead}>
              <h2 className={styles.secTitle}>Bút đỏ chấm lỗi và cách sửa</h2>
              <span className={styles.redPenTag} lang="ja" aria-hidden="true">
                赤ペン添削
              </span>
            </div>
            {picResult.s === 15 ? (
              <div className={styles.okBox}>
                Không bị trừ điểm nào.{' '}
                {(picResult.ok || '').replace(/^Trọn điểm — không có gì phải sửa\. ?/, '')}
              </div>
            ) : (
              <FeedbackLadder entries={activeLadderEntries} defaultOpenAll />
            )}

            {referenceLadderEntries.length > 0 ? (
              <details className={styles.detailsBox}>
                <summary className={styles.detailsSummary}>
                  Xem toàn bộ thang lỗi minh hoạ của câu này ({referenceLadderEntries.length} mức)
                </summary>
                <FeedbackLadder entries={referenceLadderEntries} />
              </details>
            ) : null}
          </div>

          {/* Section 4 */}
          <div className={styles.section}>
            <h2 className={styles.secTitle}>Cách trả lời trọn điểm</h2>
            <p>
              <strong>Mẫu câu:</strong>{' '}
              <span className="jp" lang="ja">
                {question.pattern}
              </span>
            </p>
            {question.steps.length > 0 ? (
              <ol className={styles.steps}>
                {question.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            ) : null}

            <div className={styles.sampleCard}>
              <div className={styles.sampleTexts}>
                <span className={styles.sampleJp} lang="ja">
                  {question.sample1.jp}
                </span>
                <span className={styles.sampleVn}>{question.sample1.vn}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Nghe đáp án mẫu 1"
                icon={<Icon name="speaker" size={16} />}
                onClick={() => playSample(question.sample1.jp)}
              >
                Nghe
              </Button>
            </div>

            <div className={styles.sampleCard}>
              <div className={styles.sampleTexts}>
                <span className={styles.sampleJp} lang="ja">
                  {question.sample2.jp}
                </span>
                <span className={styles.sampleVn}>{question.sample2.vn}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Nghe đáp án mẫu 2"
                icon={<Icon name="speaker" size={16} />}
                onClick={() => playSample(question.sample2.jp)}
              >
                Nghe
              </Button>
            </div>

            {question.trapCues.length > 0 ? (
              <div>
                <p className={styles.smallMuted}>
                  <strong>Bẫy hay gặp:</strong>
                </p>
                <ul className={styles.list}>
                  {question.trapCues.map((cue, idx) => (
                    <li key={idx}>{cue}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {question.pronCues.length > 0 ? (
              <div>
                <p className={styles.smallMuted}>
                  <strong>Phát âm cần chú ý:</strong>
                </p>
                <ul className={styles.list}>
                  {question.pronCues.map((cue, idx) => (
                    <li key={idx}>{cue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>

        <PromoCard enabled={showPromo} context="qa-result" />
      </div>
    );
  }

  if (question.kind === 'free' && freeResult) {
    const passed = freeResult.filter((c) => c.ok).length;
    return (
      <div className={`${styles.panel} page-turn`} aria-live="polite">
        <Card ruled className={styles.sheet}>
          <div className={styles.freeHero}>
            <div>
              <h2 className={styles.freeTitle}>
                Phản hồi tham khảo ({passed}/{freeResult.length} tiêu chí đạt)
              </h2>
              <p className={styles.smallMuted}>
                Câu này không tính điểm cố định. Em tự so câu trả lời của mình với bảng bên dưới.
              </p>
            </div>
            <HankoStamp
              glyph={passed === freeResult.length ? '優' : '検'}
              caption="自習"
              tone={passed === freeResult.length ? 'hanko' : 'warn'}
              size="md"
            />
          </div>

          <div className={styles.section}>
            <h3 className={styles.secTitle}>Câu hỏi</h3>
            <p className={styles.jpLine} lang="ja">
              {formatQuestionText(question.questionRead, learnerName)}
            </p>
            <p>{question.meaningVn}</p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.secTitle}>Máy nghe được</h3>
            <div className={styles.saidBox} lang="ja">
              {submittedText}
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.secTitle}>Bảng tự soát</h3>
            {freeResult.map((check, idx) => (
              <div
                key={idx}
                className={`${styles.checkItem} ${check.ok ? styles.checkPass : styles.checkFail}`}
              >
                <Icon
                  name={check.ok ? 'check' : 'x'}
                  size={18}
                  className={check.ok ? styles.checkIconPass : styles.checkIconFail}
                />
                <div>
                  <div className={styles.checkTitle}>{check.t}</div>
                  {!check.ok ? <div className={styles.checkNote}>{check.note}</div> : null}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <h3 className={styles.secTitle}>Cấu trúc nên dùng</h3>
            <p className="jp" lang="ja">
              {question.pattern}
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.secTitle}>Từ vựng gợi ý</h3>
            <ul className={styles.list}>
              {question.vocabList.map((v, idx) => (
                <li key={idx}>{v}</li>
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <h3 className={styles.secTitle}>Câu trả lời gợi ý</h3>
            <div className={styles.sampleCard}>
              <div className={styles.sampleTexts}>
                <span className={styles.sampleJp} lang="ja">
                  {question.sample1.jp}
                </span>
                <span className={styles.sampleVn}>{question.sample1.vn}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Nghe câu trả lời gợi ý 1"
                icon={<Icon name="speaker" size={16} />}
                onClick={() => playSample(question.sample1.jp)}
              >
                Nghe
              </Button>
            </div>
            <div className={styles.sampleCard}>
              <div className={styles.sampleTexts}>
                <span className={styles.sampleJp} lang="ja">
                  {question.sample2.jp}
                </span>
                <span className={styles.sampleVn}>{question.sample2.vn}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Nghe câu trả lời gợi ý 2"
                icon={<Icon name="speaker" size={16} />}
                onClick={() => playSample(question.sample2.jp)}
              >
                Nghe
              </Button>
            </div>
            <p className={styles.smallMuted}>
              Dấu ○○ là chỗ em tự điền thông tin thực tế của mình.
            </p>
          </div>
        </Card>

        <PromoCard enabled={showPromo} context="qa-result" />
      </div>
    );
  }

  return null;
}
