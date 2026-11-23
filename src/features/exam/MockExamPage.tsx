import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { loadAllLessons, loadCfg, loadScale } from '../../data/loaders';
import type { FreeQuestion, PicQuestion, ReadingPassage } from '../../data/normalize';
import type { CfgData, ScaleMap } from '../../data/schema';
import {
  formatQuestionText,
  gradeFree,
  gradePic,
  gradeRead,
  labelOf,
  prepareReadingPassage,
  type FreeCheckItem,
  type PicGradeResult,
  type PreparedReadingPassage,
  type ReadGradeResult,
} from '../../engine';
import {
  speakQuestion,
  speakSeq,
  startSpeechRecognition,
  stopSpeak,
  type SttController,
} from '../../speech';
import type { ExamRecord } from '../../storage';
import {
  Banner,
  Button,
  Card,
  Icon,
  MicButton,
  ProgressBar,
  ScoreRing,
  SegmentedControl,
  useToast,
  type MicState,
} from '../../ui';
import { PassageText } from '../read/PassageText';
import { PictureView } from '../shared/PictureView';
import { RomajiHelpBox } from '../shared/RomajiHelpBox';
import { VoiceConsentDialog } from '../shared/VoiceConsentDialog';
import styles from './MockExamPage.module.css';

type ExamItem =
  | {
      readonly part: 'read';
      readonly passage: ReadingPassage;
      readonly prepared: PreparedReadingPassage;
    }
  | { readonly part: 'pic'; readonly question: PicQuestion }
  | { readonly part: 'free'; readonly question: FreeQuestion };

interface GradedExamItem {
  readonly item: ExamItem;
  readonly input: string;
  readonly pct: number;
  readonly summary: string;
  readonly readRes?: ReadGradeResult;
  readonly picRes?: PicGradeResult;
  readonly freeRes?: readonly FreeCheckItem[];
}

function sampleRandom<T>(pool: readonly T[], count: number): T[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr.slice(0, Math.min(count, arr.length));
}

function formatClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function MockExamPage() {
  const { state, activeVoice, capabilities, updateSettings, recordExam } = useApp();
  const { pushToast } = useToast();
  const textareaId = useId();

  const [scope, setScope] = useState<'all' | 1 | 2 | 3>('all');
  const [limitMin, setLimitMin] = useState<number>(5);
  const [phase, setPhase] = useState<'setup' | 'running' | 'report'>('setup');
  const [starting, setStarting] = useState(false);

  const [items, setItems] = useState<readonly ExamItem[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number>(0);
  const [peekOpen, setPeekOpen] = useState(false);

  const [cfgData, setCfgData] = useState<CfgData | null>(null);
  const [scaleData, setScaleData] = useState<ScaleMap | null>(null);
  const [allPicsRaw, setAllPicsRaw] = useState<readonly PicQuestion['raw'][]>([]);

  const [gradedItems, setGradedItems] = useState<readonly GradedExamItem[]>([]);
  const [summaryRecord, setSummaryRecord] = useState<ExamRecord | null>(null);

  const [micState, setMicState] = useState<MicState>(() =>
    capabilities.hasSTT ? 'idle' : 'unsupported',
  );
  const [consentOpen, setConsentOpen] = useState(false);

  const sttRef = useRef<SttController | null>(null);
  const answersRef = useRef<string[]>([]);
  const stepIdxRef = useRef(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    stepIdxRef.current = stepIdx;
  }, [stepIdx]);

  const stopMedia = useCallback(() => {
    stopSpeak();
    if (sttRef.current) {
      sttRef.current.abort();
      sttRef.current = null;
      setMicState((prev) => (prev === 'listening' ? 'idle' : prev));
    }
  }, []);

  useEffect(() => () => stopMedia(), [stopMedia]);

  const finishExam = useCallback(
    (finalAnswers: readonly string[]) => {
      stopMedia();
      if (!cfgData || !scaleData || items.length === 0) return;

      const results: GradedExamItem[] = items.map((item, idx) => {
        const input = (finalAnswers[idx] ?? '').trim();
        if (item.part === 'read') {
          const readRes = gradeRead(item.prepared, input, cfgData);
          return {
            item,
            input,
            pct: readRes.total,
            summary: `Đọc ${item.passage.id}: ${readRes.total}% (Hán ${readRes.h.pct}% · Kata ${readRes.k.pct}% · Hira ${readRes.i.pct}%)`,
            readRes,
          };
        }
        if (item.part === 'pic') {
          const picRes = gradePic(item.question.raw, input, {
            cfg: cfgData,
            scale: scaleData,
            allPicQuestions: allPicsRaw,
          });
          const codes = picRes.items.map((x) => x.c).join(', ');
          return {
            item,
            input,
            pct: picRes.p,
            summary: `Có tranh ${item.question.id}: ${picRes.s}/15 (${picRes.p}%)${codes ? ` · Lỗi: ${codes}` : ''}`,
            picRes,
          };
        }
        const freeRes = gradeFree(item.question.raw, input, cfgData);
        const passed = freeRes.filter((c) => c.ok).length;
        const pct = Math.round((passed / freeRes.length) * 100);
        return {
          item,
          input,
          pct,
          summary: `Không tranh ${item.question.id}: đạt ${passed}/${freeRes.length} tiêu chí`,
          freeRes,
        };
      });

      const readItems = results.filter((r) => r.item.part === 'read');
      const picItems = results.filter((r) => r.item.part === 'pic');
      const freeItems = results.filter((r) => r.item.part === 'free');

      const readScore = readItems.length
        ? Math.round(readItems.reduce((s, r) => s + r.pct, 0) / readItems.length)
        : 0;
      const picAvgPct = picItems.length
        ? Math.round(picItems.reduce((s, r) => s + r.pct, 0) / picItems.length)
        : 0;
      const freePassCount = freeItems.filter((r) => r.pct === 100).length;
      const freePct = freeItems.length
        ? Math.round(freeItems.reduce((s, r) => s + r.pct, 0) / freeItems.length)
        : 0;

      // Weighted overall estimate: 40% Reading + 45% Picture QA + 15% Free QA
      const overallPct = Math.round(0.4 * readScore + 0.45 * picAvgPct + 0.15 * freePct);
      const durationSec = Math.max(1, Math.round((Date.now() - startedAtMs) / 1000));

      const rec: ExamRecord = {
        id: `exam-${Date.now()}`,
        at: new Date().toISOString(),
        durationSec,
        readScore,
        picAvgPct,
        freePassCount,
        freeTotal: freeItems.length,
        overallPct,
        itemIds: items.map((it) => (it.part === 'read' ? it.passage.id : it.question.id)),
      };

      setGradedItems(results);
      setSummaryRecord(rec);
      recordExam(rec);
      setPhase('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [allPicsRaw, cfgData, items, recordExam, scaleData, startedAtMs, stopMedia],
  );

  // Countdown timer while running
  useEffect(() => {
    if (phase !== 'running' || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      const id = window.setTimeout(() => finishExam(answersRef.current), 0);
      return () => window.clearTimeout(id);
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, secondsLeft, finishExam]);

  const startExam = async () => {
    setStarting(true);
    try {
      const [cfg, scale, lessons] = await Promise.all([loadCfg(), loadScale(), loadAllLessons()]);
      setCfgData(cfg);
      setScaleData(scale);
      setAllPicsRaw(lessons.flatMap((l) => l.pic.map((p) => p.raw)));

      const poolLessons = scope === 'all' ? lessons : lessons.filter((l) => l.bai === scope);
      const readPool = poolLessons.flatMap((l) => l.read);
      const picPool = poolLessons.flatMap((l) => l.pic);
      const freePool = poolLessons.flatMap((l) => l.free);

      const pickedRead = sampleRandom(readPool, 1).map<ExamItem>((passage) => ({
        part: 'read',
        passage,
        prepared: prepareReadingPassage(passage.raw, cfg.fmt),
      }));
      const pickedPic = sampleRandom(picPool, 3).map<ExamItem>((question) => ({
        part: 'pic',
        question,
      }));
      const pickedFree = sampleRandom(freePool, 2).map<ExamItem>((question) => ({
        part: 'free',
        question,
      }));

      const examPaper: ExamItem[] = [...pickedRead, ...pickedPic, ...pickedFree];
      setItems(examPaper);
      setAnswers(new Array<string>(examPaper.length).fill(''));
      setStepIdx(0);
      setPeekOpen(false);
      setSecondsLeft(limitMin > 0 ? limitMin * 60 : null);
      setStartedAtMs(Date.now());
      setGradedItems([]);
      setSummaryRecord(null);
      setPhase('running');
    } finally {
      setStarting(false);
    }
  };

  const currentItem = items[stepIdx];
  const currentAnswer = answers[stepIdx] ?? '';

  const setCurrentAnswer = (val: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[stepIdxRef.current] = val;
      return next;
    });
  };

  const launchStt = () => {
    const ctrl = startSpeechRecognition({
      getBaseText: () => answersRef.current[stepIdxRef.current] ?? '',
      onTranscript: (full) => setCurrentAnswer(full),
      onStart: () => setMicState('listening'),
      onEnd: (reason) => {
        sttRef.current = null;
        setMicState(reason === 'blocked' ? 'error' : 'idle');
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

  const handlePlayCurrent = () => {
    if (!currentItem) return;
    if (currentItem.part === 'read') {
      speakSeq(currentItem.prepared.tts, {
        voiceURI: activeVoice?.voiceURI ?? state.settings.voiceURI,
      });
    } else {
      const spoken = formatQuestionText(currentItem.question.questionRead, state.name);
      speakQuestion(spoken, { voiceURI: activeVoice?.voiceURI ?? state.settings.voiceURI });
    }
  };

  const handleExportReport = () => {
    if (!summaryRecord) return;
    const lines = [
      'BÁO CÁO THI THỬ NÓI JPD113',
      `Học viên: ${state.name}さん`,
      `Thời điểm: ${summaryRecord.at}`,
      `Thời lượng: ${formatClock(summaryRecord.durationSec)}`,
      `Tổng ước tính: ${summaryRecord.overallPct}% (Đọc ${summaryRecord.readScore}% · Có tranh ${summaryRecord.picAvgPct}% · Không tranh ${summaryRecord.freePassCount}/${summaryRecord.freeTotal})`,
      '',
      'CHI TIẾT TỪNG CÂU:',
      ...gradedItems.map(
        (g, idx) => `${idx + 1}. ${g.summary}\n   Em trả lời: ${g.input || '(chưa nhập)'}`,
      ),
      '',
      'Lưu ý: Kết quả chỉ do máy ước tính từ chữ nhận được để tự luyện, không phải điểm thi thật.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jpd113-exam-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast('Đã xuất báo cáo bài thi thử (.txt).', 'good');
  };

  if (phase === 'setup') {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Thi thử có giới hạn thời gian</h1>
          <p className={styles.lead}>
            Mỗi đề gồm 6 câu bốc ngẫu nhiên: 1 đoạn đọc thành tiếng (40%), 3 câu vấn đáp có tranh
            (45%) và 2 câu vấn đáp không tranh (15%).
          </p>
        </header>

        <Card ruled className={styles.section}>
          <div className={styles.field}>
            <span className={styles.label}>Phạm vi đề thi</span>
            <SegmentedControl<'all' | 1 | 2 | 3>
              ariaLabel="Chọn phạm vi đề thi thử"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: 'Tất cả (1–3)' },
                { value: 1, label: 'Bài 1' },
                { value: 2, label: 'Bài 2' },
                { value: 3, label: 'Bài 3' },
              ]}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Thời gian làm bài</span>
            <SegmentedControl<number>
              ariaLabel="Chọn thời gian thi thử"
              value={limitMin}
              onChange={setLimitMin}
              options={[
                { value: 5, label: '5 phút' },
                { value: 8, label: '8 phút' },
                { value: 0, label: 'Không giới hạn' },
              ]}
            />
          </div>

          <div className={styles.row}>
            <Button
              variant="primary"
              size="lg"
              loading={starting}
              icon={<Icon name="clock" size={20} />}
              onClick={startExam}
            >
              Bắt đầu thi thử (6 câu)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'report' && summaryRecord) {
    const label = labelOf(summaryRecord.overallPct);
    return (
      <div className={styles.page} aria-live="polite">
        <header className={styles.header}>
          <h1 className={styles.title}>Báo cáo tổng kết</h1>
          <p className={styles.lead}>Kết quả ước tính cho bài thi thử 6 câu vừa hoàn thành.</p>
        </header>

        <Card ruled className={styles.section}>
          <ScoreRing
            value={summaryRecord.overallPct}
            max={100}
            label={label.text}
            sublabel={`Thời lượng: ${formatClock(summaryRecord.durationSec)}`}
          />

          <ProgressBar
            value={summaryRecord.readScore}
            max={100}
            tone="hanko"
            label="Phần 1: Đọc thành tiếng (40%)"
            valueLabel={`${summaryRecord.readScore}%`}
          />
          <ProgressBar
            value={summaryRecord.picAvgPct}
            max={100}
            tone="accent"
            label="Phần 2: Vấn đáp có tranh (45%)"
            valueLabel={`${summaryRecord.picAvgPct}%`}
          />
          <ProgressBar
            value={summaryRecord.freePassCount}
            max={Math.max(1, summaryRecord.freeTotal)}
            tone="good"
            label={`Phần 3: Vấn đáp không tranh (${summaryRecord.freePassCount}/${summaryRecord.freeTotal} đạt đủ tiêu chí)`}
            valueLabel={`${Math.round((summaryRecord.freePassCount / Math.max(1, summaryRecord.freeTotal)) * 100)}%`}
          />

          <div className={styles.row}>
            <Button
              variant="primary"
              icon={<Icon name="download" size={18} />}
              onClick={handleExportReport}
            >
              Xuất báo cáo (.txt)
            </Button>
            <Button variant="secondary" onClick={() => setPhase('setup')}>
              Thi đề mới
            </Button>
          </div>
        </Card>

        <Card className={styles.section}>
          <h2>Chi tiết 6 câu đã làm</h2>
          {gradedItems.map((g, idx) => (
            <div key={idx} className={styles.reportRow}>
              <div className={styles.reportHead}>
                <span>
                  Câu {idx + 1} · {g.summary}
                </span>
                <span className="tabular">{g.pct}%</span>
              </div>
              <p className={styles.hint} lang="ja">
                Em trả lời: {g.input || '(chưa trả lời)'}
              </p>
              {g.item.part === 'pic' ? (
                <p className={styles.hint} lang="ja">
                  Đáp án mẫu: {g.item.question.sample1.jp} ({g.item.question.sample1.vn})
                </p>
              ) : null}
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (!currentItem) return null;

  const partLabel =
    currentItem.part === 'read'
      ? 'Phần 1 · Đọc thành tiếng'
      : currentItem.part === 'pic'
        ? 'Phần 2 · Vấn đáp có tranh'
        : 'Phần 3 · Vấn đáp không tranh';

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.stepBadge}>
          Câu {stepIdx + 1}/{items.length} · {partLabel}
        </span>
        {secondsLeft !== null ? (
          <span
            className={`${styles.timer} ${secondsLeft <= 60 ? styles.timerUrgent : ''}`}
            aria-label={`Thời gian còn lại ${formatClock(secondsLeft)}`}
          >
            <Icon name="clock" size={16} />
            <span>{formatClock(secondsLeft)}</span>
          </span>
        ) : null}
      </div>

      <ProgressBar value={stepIdx + 1} max={items.length} label="Tiến trình bài thi" />

      <Card ruled className={styles.section}>
        {currentItem.part === 'read' ? (
          <>
            <p className={styles.hint}>Đọc thành tiếng toàn bộ đoạn văn dưới đây:</p>
            <PassageText passage={currentItem.prepared} mode="practice" />
          </>
        ) : (
          <>
            {currentItem.part === 'pic' ? (
              <PictureView
                picKey={currentItem.question.picKey}
                alt={currentItem.question.picAlt}
                priority
              />
            ) : null}
            <p className={styles.hint}>Nghe câu hỏi rồi trả lời ngắn gọn, đúng trọng tâm.</p>
            <div className={styles.row}>
              <Button
                variant="primary"
                icon={<Icon name="speaker" size={18} />}
                onClick={handlePlayCurrent}
              >
                Nghe câu hỏi
              </Button>
            </div>
            <button type="button" className={styles.peekBtn} onClick={() => setPeekOpen((v) => !v)}>
              {peekOpen ? 'Ẩn chữ câu hỏi' : 'Không nghe được? Hiện chữ câu hỏi'}
            </button>
            {peekOpen ? (
              <div className={styles.peekBox} lang="ja">
                {formatQuestionText(currentItem.question.questionRead, state.name)}
              </div>
            ) : null}
          </>
        )}

        <div className={styles.field}>
          <label htmlFor={textareaId} className={styles.label}>
            Câu trả lời của em
          </label>
          <textarea
            id={textareaId}
            className={styles.textarea}
            lang="ja"
            value={currentAnswer}
            maxLength={3000}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Nói bằng micro hoặc gõ Kana / Romaji…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className={styles.row}>
          {!state.settings.typingOnly && capabilities.hasSTT ? (
            <MicButton state={micState} idleLabel="Nói" onClick={handleMicToggle} />
          ) : null}
          {stepIdx > 0 ? (
            <Button
              variant="secondary"
              onClick={() => {
                stopMedia();
                setPeekOpen(false);
                setStepIdx((i) => Math.max(0, i - 1));
              }}
            >
              Câu trước
            </Button>
          ) : null}
          {stepIdx < items.length - 1 ? (
            <Button
              variant="primary"
              onClick={() => {
                stopMedia();
                setPeekOpen(false);
                setStepIdx((i) => i + 1);
              }}
            >
              Câu tiếp theo
            </Button>
          ) : (
            <Button variant="primary" onClick={() => finishExam(answers)}>
              Nộp bài &amp; chấm điểm
            </Button>
          )}
        </div>

        <RomajiHelpBox />
      </Card>

      {secondsLeft !== null && secondsLeft <= 60 ? (
        <Banner tone="warn">
          Sắp hết giờ ({formatClock(secondsLeft)}). Em hãy hoàn thiện và nộp bài.
        </Banner>
      ) : null}

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
