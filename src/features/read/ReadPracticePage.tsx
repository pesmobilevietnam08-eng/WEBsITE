import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { loadAllLessons, loadCfg, loadLesson } from '../../data/loaders';
import type { LessonData, ReadingPassage } from '../../data/normalize';
import type { CfgData } from '../../data/schema';
import {
  gradeRead,
  labelOf,
  prepareReadingPassage,
  type PreparedReadingPassage,
  type ReadGradeResult,
} from '../../engine';
import { speakSeq, startSpeechRecognition, stopSpeak, type SttController } from '../../speech';
import {
  Banner,
  Button,
  Card,
  CountUpNumber,
  DiffText,
  EmptyState,
  HankoStamp,
  Icon,
  MicButton,
  ProgressBar,
  Ruby,
  SkeletonGrid,
  Switch,
  type MicState,
} from '../../ui';
import { PromoCard } from '../promo/PromoCard';
import { RomajiHelpBox } from '../shared/RomajiHelpBox';
import { VoiceConsentDialog } from '../shared/VoiceConsentDialog';
import { PassageText } from './PassageText';
import styles from './ReadPracticePage.module.css';

const GROUP_LABEL: Readonly<Record<'h' | 'k' | 'i', string>> = {
  h: 'Chữ Hán',
  k: 'Katakana',
  i: 'Hiragana',
};

export function ReadPracticePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, activeVoice, capabilities, updateSettings, recordRead } = useApp();

  const paramBai = Number(searchParams.get('bai'));
  const targetBai = [1, 2, 3].includes(paramBai) ? paramBai : state.settings.lastBai || 1;
  const routeKey = `${id ?? ''}:${targetBai}`;

  const [loaded, setLoaded] = useState<{
    key: string;
    cfg: CfgData | null;
    lesson: LessonData | null;
    passage: ReadingPassage | null;
    notFound: boolean;
  }>({
    key: '',
    cfg: null,
    lesson: null,
    passage: null,
    notFound: false,
  });

  const [slow, setSlow] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeSentIdx, setActiveSentIdx] = useState<number | null>(null);
  const [ttsWarning, setTtsWarning] = useState(false);

  const [answer, setAnswer] = useState('');
  const [micState, setMicState] = useState<MicState>(() =>
    capabilities.hasSTT ? 'idle' : 'unsupported',
  );
  const [micMessage, setMicMessage] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);

  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [result, setResult] = useState<ReadGradeResult | null>(null);

  const sttRef = useRef<SttController | null>(null);
  const answerRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaId = useId();

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  const stopAllMedia = useCallback(() => {
    stopSpeak();
    setPlaying(false);
    setActiveSentIdx(null);
    if (sttRef.current) {
      sttRef.current.abort();
      sttRef.current = null;
      setMicState((prev) => (prev === 'listening' ? 'idle' : prev));
    }
  }, []);

  useEffect(() => () => stopAllMedia(), [stopAllMedia]);

  const resetUi = useCallback(() => {
    stopAllMedia();
    setTtsWarning(false);
    setAnswer('');
    setSubmittedText(null);
    setResult(null);
    setMicMessage(null);
  }, [stopAllMedia]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const decodedId = id ? decodeURIComponent(id) : '';
        const [cfg, firstLesson] = await Promise.all([loadCfg(), loadLesson(targetBai)]);
        let found = firstLesson.read.find((p) => p.id === decodedId);
        let resolvedLesson = firstLesson;

        if (!found) {
          const all = await loadAllLessons();
          for (const l of all) {
            const match = l.read.find((p) => p.id === decodedId);
            if (match) {
              found = match;
              resolvedLesson = l;
              break;
            }
          }
        }
        if (!active) return;
        resetUi();
        setLoaded({
          key: routeKey,
          cfg,
          lesson: resolvedLesson,
          passage: found ?? null,
          notFound: !found,
        });
      } catch {
        if (!active) return;
        setLoaded({ key: routeKey, cfg: null, lesson: null, passage: null, notFound: true });
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id, targetBai, routeKey, resetUi]);

  const loading = loaded.key !== routeKey;
  const cfg = loaded.key === routeKey ? loaded.cfg : null;
  const lesson = loaded.key === routeKey ? loaded.lesson : null;
  const passage = loaded.key === routeKey ? loaded.passage : null;
  const notFound = loaded.key === routeKey && loaded.notFound;

  const prepared: PreparedReadingPassage | null = useMemo(() => {
    if (!passage || !cfg) return null;
    return prepareReadingPassage(passage.raw, cfg.fmt);
  }, [passage, cfg]);

  const handleTogglePlay = () => {
    if (!prepared) return;
    if (playing) {
      stopSpeak();
      setPlaying(false);
      setActiveSentIdx(null);
      return;
    }
    setPlaying(true);
    const ok = speakSeq(prepared.tts, {
      slow,
      voiceURI: activeVoice?.voiceURI ?? state.settings.voiceURI,
      onStart: (si) => setActiveSentIdx(si),
      onEnd: () => {
        setPlaying(false);
        setActiveSentIdx(null);
      },
    });
    if (!ok) {
      setPlaying(false);
      setActiveSentIdx(null);
      setTtsWarning(true);
    }
  };

  const launchStt = () => {
    setMicMessage(null);
    const ctrl = startSpeechRecognition({
      getBaseText: () => answerRef.current,
      onTranscript: (full) => setAnswer(full),
      onStart: () => setMicState('listening'),
      onEnd: (reason) => {
        sttRef.current = null;
        if (reason === 'blocked') {
          setMicState('error');
          setMicMessage(
            'Trang này không được phép dùng micro của trình duyệt. Em hãy dùng micro bàn phím, Windows+H, hoặc gõ cách đọc bằng hiragana/Romaji.',
          );
        } else if (reason === 'idle') {
          setMicState('idle');
          setMicMessage('Máy chưa nghe thấy giọng nói. Bấm lại khi em sẵn sàng.');
        } else {
          setMicState('idle');
        }
      },
    });
    if (!ctrl) {
      setMicState('unsupported');
      return;
    }
    sttRef.current = ctrl;
  };

  const handleMicToggle = () => {
    if (micState === 'listening' && sttRef.current) {
      sttRef.current.stop();
      return;
    }
    if (!state.settings.speechPrivacyAccepted) {
      setConsentOpen(true);
      return;
    }
    launchStt();
  };

  const handleSubmit = () => {
    if (!prepared || !cfg || !passage) return;
    stopAllMedia();
    const trimmed = answer.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }
    const graded = gradeRead(prepared, trimmed, cfg);
    setResult(graded);
    setSubmittedText(trimmed);
    recordRead(
      passage.id,
      graded.total,
      { h: graded.h.pct, k: graded.k.pct, i: graded.i.pct },
      trimmed,
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextPassage = useMemo(() => {
    if (!lesson || !passage) return null;
    const idx = lesson.read.findIndex((p) => p.id === passage.id);
    if (idx < 0 || idx >= lesson.read.length - 1) return null;
    return lesson.read[idx + 1] ?? null;
  }, [lesson, passage]);

  const backToList = () => {
    stopAllMedia();
    navigate(`/read?bai=${lesson?.bai ?? targetBai}`);
  };

  if (loading) {
    return <SkeletonGrid count={2} />;
  }

  if (notFound || !passage || !prepared || !cfg) {
    return (
      <EmptyState
        icon="book"
        title="Không tìm thấy đoạn văn"
        description="Đoạn luyện đọc không tồn tại hoặc đường dẫn chưa chính xác."
        action={
          <Button variant="primary" onClick={() => navigate('/read')}>
            Về danh sách luyện đọc
          </Button>
        }
      />
    );
  }

  const showResult = result !== null && submittedText !== null;
  const label = result ? labelOf(result.total) : null;
  const toneClass =
    label?.tone === 'good'
      ? styles.toneGood
      : label?.tone === 'mid'
        ? styles.toneMid
        : styles.toneLow;
  const tallyEntries = result ? Object.entries(result.tally).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Button
          variant="ghost"
          size="sm"
          icon={<Icon name="arrow-left" size={18} />}
          onClick={backToList}
        >
          Về danh sách
        </Button>
        <div className={styles.metaRow}>
          <span className={styles.tag}>Luyện đọc · Bài {passage.bai}</span>
          <span className={styles.counter}>
            Đoạn {passage.index}/{lesson?.read.length ?? 0} ({passage.id})
          </span>
        </div>
      </div>

      {showResult && label ? (
        <div className={`${styles.page} page-turn`} aria-live="polite">
          <Card ruled className={`${styles.resultCard} ${toneClass}`}>
            {/* SPOTLIGHT 3 — Giant Count-Up Score + Vertical Spine + Slamming Red Hanko */}
            <div className={styles.scoreHero}>
              <div className={styles.scoreSpine} aria-hidden="true">
                <span className="jp-spine" lang="ja">
                  朗読採点
                </span>
              </div>
              <div className={styles.scoreMain}>
                <span className={styles.giantScore}>
                  <CountUpNumber value={result.total} suffix="%" />
                </span>
                <p className={styles.verdict}>{label.text}</p>
                <p className={styles.hint}>
                  Chấm theo 3 nhóm chữ (Chữ Hán {cfg.wt[0]}%, Katakana {cfg.wt[1]}%, Hiragana{' '}
                  {cfg.wt[2]}%). Ngữ điệu không được chấm.
                </p>
              </div>
              <div className={styles.stampDock}>
                <HankoStamp
                  glyph={result.total >= 93 ? '優' : result.total >= 65 ? '良' : '再'}
                  caption={result.total >= 93 ? '合格' : result.total >= 65 ? '採点済' : '再挑戦'}
                  tone="hanko"
                  size="lg"
                  label={`Con dấu chấm bài đọc: ${label.text}`}
                />
              </div>
            </div>
            <p className={styles.hint}>
              {cfg.partial
                ? 'Từ Hán và Katakana được tính điểm một phần theo số chữ đọc đúng.'
                : 'Từ Hán và Katakana chỉ tính đúng khi đọc khớp toàn bộ từ.'}{' '}
              Máy chỉ so chữ nhận được với bản mẫu để em tự sửa trước kỳ thi.
            </p>

            {/* Three groups */}
            <div className={styles.section}>
              <h2 className={styles.secTitle}>Điểm theo ba nhóm chữ</h2>
              <div className={styles.bars}>
                <ProgressBar
                  value={result.h.pct}
                  max={100}
                  tone="hanko"
                  label={`Chữ Hán (đúng ${result.h.right}/${result.h.n} từ)`}
                  valueLabel={`${result.h.pct}%`}
                />
                <ProgressBar
                  value={result.k.pct}
                  max={100}
                  tone="kata"
                  label={`Katakana (đúng ${result.k.right}/${result.k.n} từ)`}
                  valueLabel={`${result.k.pct}%`}
                />
                <ProgressBar
                  value={result.i.pct}
                  max={100}
                  tone="good"
                  label={`Hiragana (đúng ${result.i.ok}/${result.i.n} chữ)`}
                  valueLabel={`${result.i.pct}%`}
                />
              </div>
            </div>

            {/* Character diff & heard text */}
            <div className={styles.section}>
              <h2 className={styles.secTitle}>So khớp từng chữ</h2>
              <DiffText tokens={result.diff} showLegend />
              <div>
                <p className={styles.hint}>
                  <strong>Máy nghe được:</strong>
                </p>
                <div className={styles.saidBox} lang="ja">
                  {submittedText}
                </div>
              </div>
            </div>

            {/* Errors by group — Teacher Red-Pen */}
            <div className={`${styles.section} ${styles.redPenZone}`}>
              <div className={styles.redPenHead}>
                <h2 className={styles.secTitle}>Chỗ cần sửa</h2>
                <span className={styles.redPenTag} lang="ja" aria-hidden="true">
                  赤ペン添削
                </span>
              </div>
              {result.errs.length === 0 ? (
                <div className={styles.okBox}>Em đọc khớp hoàn toàn với bản mẫu.</div>
              ) : (
                <div className={styles.errList}>
                  {result.errs.slice(0, 14).map((err, idx) => (
                    <div key={idx} className={styles.errItem}>
                      <div className={styles.errHead}>
                        <span
                          className={`${styles.errBadge} ${
                            err.g === 'h'
                              ? styles.badgeH
                              : err.g === 'k'
                                ? styles.badgeK
                                : styles.badgeI
                          }`}
                        >
                          {GROUP_LABEL[err.g]}
                        </span>
                        <span className="jp" lang="ja">
                          <strong>{err.word}</strong>
                        </span>
                        <span>→ máy nghe:</span>
                        <span className="jp" lang="ja">
                          {err.seg || '(không có)'}
                        </span>
                      </div>
                      <span className={styles.errReason}>{err.lab.join(', ')}</span>
                    </div>
                  ))}
                  {result.errs.length > 14 ? (
                    <p className={styles.hint}>
                      Còn {result.errs.length - 14} chỗ nữa. Em đọc lại chậm từ đầu sẽ thấy rõ hơn.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Frequent error tally */}
            {tallyEntries.length > 0 ? (
              <div className={styles.section}>
                <h2 className={styles.secTitle}>Lỗi em hay gặp</h2>
                <div className={styles.tallyRow}>
                  {tallyEntries.map(([name, count]) => (
                    <span key={name} className={styles.tallyChip}>
                      {name} ({count} lần)
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Reference passage with readings */}
            <div className={styles.section}>
              <h2 className={styles.secTitle}>Bản mẫu có cách đọc</h2>
              <PassageText
                passage={prepared}
                mode="reference"
                alignSlots={result.st}
                fmt={cfg.fmt}
              />
              <p className={styles.hint}>
                Chữ gạch sóng màu đỏ là chỗ máy chưa nghe khớp. Trợ từ は, へ, を có cách đọc nhỏ ở
                trên đầu.
              </p>
              <div className={styles.controls}>
                <Button
                  variant="secondary"
                  icon={<Icon name={playing ? 'stop' : 'speaker'} size={18} />}
                  onClick={handleTogglePlay}
                >
                  {playing ? 'Dừng nghe mẫu' : 'Nghe mẫu'}
                </Button>
              </div>
            </div>
          </Card>

          <PromoCard enabled={state.settings.showPromo} context="read-result" />

          <div className={styles.actionRow}>
            <Button variant="secondary" onClick={resetUi}>
              Đọc lại đoạn này
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (nextPassage) {
                  navigate(`/read/${encodeURIComponent(nextPassage.id)}?bai=${passage.bai}`);
                  window.scrollTo({ top: 0 });
                } else {
                  backToList();
                }
              }}
            >
              {nextPassage ? 'Đoạn tiếp theo' : 'Về danh sách'}
            </Button>
          </div>
        </div>
      ) : (
        <div key={passage.id} className={`${styles.split} page-turn`}>
          {/* Left column: Magazine Reading Folio & Listen controls */}
          <Card ruled className={styles.col}>
            <div className={styles.folioHead}>
              <span className={styles.folioTitle}>Bản đọc thành tiếng</span>
              <span className={styles.folioJp} lang="ja" aria-hidden="true">
                朗読課題
              </span>
            </div>
            <p className={styles.note}>
              Đọc thành tiếng đoạn văn dưới đây.{' '}
              <span className={styles.hanText}>Chữ Hán gạch chân đỏ</span> và{' '}
              <span className={styles.kataText}>Katakana màu xanh</span> được chấm theo từng từ. Trợ
              từ <span lang="ja">は, へ, を</span> đọc là <span lang="ja">わ, え, お</span>.
            </p>

            <Switch
              label="Hiển thị Furigana (gợi ý đọc chữ Hán)"
              description="Tắt đi để tự kiểm tra khả năng đọc Hán tự giống phòng thi."
              checked={state.settings.furigana}
              onChange={(furigana) => updateSettings({ furigana })}
            />

            <PassageText
              passage={prepared}
              mode="practice"
              activeSentenceIdx={activeSentIdx}
              fmt={cfg.fmt}
            />

            <div className={styles.controls}>
              <Button
                variant="secondary"
                icon={<Icon name={playing ? 'stop' : 'speaker'} size={18} />}
                onClick={handleTogglePlay}
              >
                {playing ? 'Dừng' : 'Nghe mẫu'}
              </Button>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={slow}
                  onChange={(e) => setSlow(e.target.checked)}
                />
                <span>Đọc chậm</span>
              </label>
            </div>

            {ttsWarning ? (
              <Banner tone="warn">
                Trình duyệt này chưa phát được giọng tiếng Nhật. Em vẫn luyện đọc và tự chấm bình
                thường.
              </Banner>
            ) : null}

            {passage.newWords.length > 0 ? (
              <div className={styles.nwBox}>
                <strong>Từ mới:</strong>
                {passage.newWords.map(([word, reading, meaning], idx) => (
                  <span key={idx}>
                    {reading ? (
                      <Ruby base={word} reading={reading} />
                    ) : (
                      <span lang="ja">{word}</span>
                    )}
                    （{meaning}）
                  </span>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Right column: Broadcast Recording / Typing Console */}
          <Card className={`${styles.col} ${styles.studioCol}`}>
            <div className={styles.folioHead}>
              <span className={styles.studioTitle}>
                <span className={styles.liveDot} aria-hidden="true" />
                Phòng thu đọc bài
              </span>
              <span className={styles.folioJp} lang="ja" aria-hidden="true">
                録音
              </span>
            </div>
            <label htmlFor={textareaId} className={styles.label}>
              Em đọc
            </label>
            <textarea
              ref={textareaRef}
              id={textareaId}
              className={styles.textarea}
              lang="ja"
              value={answer}
              maxLength={3000}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Bấm Đọc rồi đọc cả đoạn. Hoặc gõ cách đọc bằng hiragana/katakana hoặc Romaji. Xong bấm Chấm bài đọc."
              autoComplete="off"
              spellCheck={false}
            />

            <div className={styles.actionRow}>
              {!state.settings.typingOnly && capabilities.hasSTT ? (
                <MicButton state={micState} size="lg" idleLabel="Đọc" onClick={handleMicToggle} />
              ) : null}
              <Button variant="primary" size="lg" onClick={handleSubmit}>
                Chấm bài đọc
              </Button>
            </div>

            {micMessage ? (
              <Banner tone="warn" role="alert">
                {micMessage}
              </Banner>
            ) : null}

            <RomajiHelpBox />

            <p className={styles.hint}>
              Máy nghe liên tục cho đến khi em bấm dừng và không tự chấm. Em kiểm tra, sửa chữ nếu
              máy nghe sai rồi bấm “Chấm bài đọc”.
            </p>
          </Card>
        </div>
      )}

      <VoiceConsentDialog
        open={consentOpen}
        onAccept={() => {
          updateSettings({ speechPrivacyAccepted: true });
          setConsentOpen(false);
          launchStt();
        }}
        onUseTypingOnly={() => {
          updateSettings({ typingOnly: true });
          setConsentOpen(false);
        }}
        onClose={() => setConsentOpen(false)}
      />
    </div>
  );
}
