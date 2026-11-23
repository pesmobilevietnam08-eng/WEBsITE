import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { loadAllLessons, loadCfg, loadLesson, loadScale } from '../../data/loaders';
import type { FreeQuestion, LessonData, PicQuestion } from '../../data/normalize';
import {
  formatQuestionText,
  romajiText,
  type FreeCheckItem,
  type PicGradeResult,
} from '../../engine';
import { speakQuestion, startSpeechRecognition, stopSpeak, type SttController } from '../../speech';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  MicButton,
  SkeletonGrid,
  type MicState,
} from '../../ui';
import { PictureView } from '../shared/PictureView';
import { RomajiHelpBox } from '../shared/RomajiHelpBox';
import { VoiceConsentDialog } from '../shared/VoiceConsentDialog';
import { QaResultPanel } from './QaResultPanel';
import styles from './QaPracticePage.module.css';

type AnyQaQuestion = PicQuestion | FreeQuestion;

function shuffleCopy<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function QaPracticePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, activeVoice, capabilities, updateSettings, recordPic, recordFree } = useApp();

  const isRandomMode = id === 'random';
  const paramBai = Number(searchParams.get('bai'));
  const targetBai = [1, 2, 3].includes(paramBai) ? paramBai : state.settings.lastBai || 1;
  const fromTab = searchParams.get('tab') || (isRandomMode ? 'rand' : '');

  const routeKey = `${id ?? ''}:${targetBai}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    lesson: LessonData | null;
    question: AnyQaQuestion | null;
    notFound: boolean;
  }>({
    key: '',
    lesson: null,
    question: null,
    notFound: false,
  });
  const [randomOverride, setRandomOverride] = useState<AnyQaQuestion | null>(null);

  const [slow, setSlow] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [ttsWarning, setTtsWarning] = useState(false);

  const [answer, setAnswer] = useState('');
  const [micState, setMicState] = useState<MicState>(() =>
    capabilities.hasSTT ? 'idle' : 'unsupported',
  );
  const [micMessage, setMicMessage] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);

  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [picResult, setPicResult] = useState<PicGradeResult | null>(null);
  const [freeResult, setFreeResult] = useState<readonly FreeCheckItem[] | null>(null);
  const [grading, setGrading] = useState(false);

  const randomBagRef = useRef<AnyQaQuestion[]>([]);
  const lastRandomIdRef = useRef<string | null>(null);
  const sttRef = useRef<SttController | null>(null);
  const answerRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaId = useId();

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  const stopAudioAndMic = useCallback(() => {
    stopSpeak();
    if (sttRef.current) {
      sttRef.current.abort();
      sttRef.current = null;
      setMicState((prev) => (prev === 'listening' ? 'idle' : prev));
    }
  }, []);

  useEffect(() => () => stopAudioAndMic(), [stopAudioAndMic]);

  const drawNextRandom = useCallback((l: LessonData): AnyQaQuestion | null => {
    const pool: AnyQaQuestion[] = [...l.pic, ...l.free];
    if (pool.length === 0) return null;
    if (randomBagRef.current.length === 0) {
      const nextBag = shuffleCopy(pool);
      if (nextBag.length > 1 && nextBag[nextBag.length - 1]?.id === lastRandomIdRef.current) {
        nextBag.reverse();
      }
      randomBagRef.current = nextBag;
    }
    const picked = randomBagRef.current.pop() ?? pool[0] ?? null;
    lastRandomIdRef.current = picked?.id ?? null;
    return picked;
  }, []);

  const resetQuestionUi = useCallback(() => {
    stopAudioAndMic();
    setPeekOpen(false);
    setTtsWarning(false);
    setAnswer('');
    setSubmittedText(null);
    setPicResult(null);
    setFreeResult(null);
    setMicMessage(null);
  }, [stopAudioAndMic]);

  // Load lesson & resolve current question
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (isRandomMode) {
          const l = await loadLesson(targetBai);
          if (!active) return;
          randomBagRef.current = [];
          const picked = drawNextRandom(l);
          resetQuestionUi();
          setRandomOverride(null);
          setLoaded({ key: routeKey, lesson: l, question: picked, notFound: !picked });
          return;
        }

        const decodedId = id ? decodeURIComponent(id) : '';
        const firstLesson = await loadLesson(targetBai);
        let found: AnyQaQuestion | undefined =
          firstLesson.pic.find((q) => q.id === decodedId) ??
          firstLesson.free.find((q) => q.id === decodedId);
        let resolvedLesson = firstLesson;

        if (!found) {
          const all = await loadAllLessons();
          for (const l of all) {
            const match =
              l.pic.find((q) => q.id === decodedId) ?? l.free.find((q) => q.id === decodedId);
            if (match) {
              found = match;
              resolvedLesson = l;
              break;
            }
          }
        }

        if (!active) return;
        resetQuestionUi();
        setRandomOverride(null);
        setLoaded({
          key: routeKey,
          lesson: resolvedLesson,
          question: found ?? null,
          notFound: !found,
        });
      } catch {
        if (!active) return;
        setLoaded({ key: routeKey, lesson: null, question: null, notFound: true });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id, isRandomMode, targetBai, routeKey, drawNextRandom, resetQuestionUi]);

  const loading = loaded.key !== routeKey;
  const lesson = loaded.key === routeKey ? loaded.lesson : null;
  const question = loaded.key === routeKey ? (randomOverride ?? loaded.question) : null;
  const notFound = loaded.key === routeKey && loaded.notFound;

  const spokenText = useMemo(
    () => (question ? formatQuestionText(question.questionRead, state.name) : ''),
    [question, state.name],
  );

  const romajiLivePreview = useMemo(() => {
    if (!/[A-Za-zāīūēōĀĪŪĒŌ]/.test(answer)) return null;
    const converted = romajiText(answer);
    return converted !== answer ? converted : null;
  }, [answer]);

  const handlePlayQuestion = () => {
    if (!spokenText) return;
    const ok = speakQuestion(spokenText, {
      slow,
      voiceURI: activeVoice?.voiceURI ?? state.settings.voiceURI,
    });
    if (!ok || !activeVoice) {
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
            'Trang này không được phép dùng micro của trình duyệt. Em hãy dùng micro trên bàn phím (điện thoại), Windows+H, hoặc gõ tiếng Nhật/Romaji.',
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

  const handleSubmit = async () => {
    if (!question) return;
    stopAudioAndMic();
    const trimmed = answer.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }

    setGrading(true);
    try {
      const [engine, cfg, scale] = await Promise.all([
        import('../../engine'),
        loadCfg(),
        loadScale(),
      ]);

      if (question.kind === 'pic') {
        const allLessons = await loadAllLessons();
        const allPicQuestions = allLessons.flatMap((l) => l.pic.map((p) => p.raw));
        const res = engine.gradePic(question.raw, trimmed, { cfg, scale, allPicQuestions });
        setPicResult(res);
        setFreeResult(null);
        setSubmittedText(trimmed);
        recordPic(
          question.id,
          res.s,
          res.p,
          trimmed,
          res.items.map((it) => it.c),
        );
      } else {
        const res = engine.gradeFree(question.raw, trimmed, cfg);
        setFreeResult(res);
        setPicResult(null);
        setSubmittedText(trimmed);
        const passed = res.filter((c) => c.ok).length;
        recordFree(question.id, passed, res.length, trimmed);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setGrading(false);
    }
  };

  const backToList = () => {
    stopAudioAndMic();
    const tabParam = fromTab || (question?.kind === 'pic' ? 'pic' : 'free');
    navigate(`/qa?bai=${lesson?.bai ?? targetBai}&tab=${tabParam}`);
  };

  const nextTarget = useMemo(() => {
    if (!lesson || !question || isRandomMode) return null;
    const list: readonly AnyQaQuestion[] = question.kind === 'pic' ? lesson.pic : lesson.free;
    const idx = list.findIndex((q) => q.id === question.id);
    if (idx < 0 || idx >= list.length - 1) return null;
    return list[idx + 1] ?? null;
  }, [lesson, question, isRandomMode]);

  const handleNext = () => {
    if (isRandomMode && lesson) {
      resetQuestionUi();
      const next = drawNextRandom(lesson);
      setRandomOverride(next);
      window.scrollTo({ top: 0 });
      return;
    }
    if (nextTarget) {
      navigate(
        `/qa/${encodeURIComponent(nextTarget.id)}?bai=${lesson?.bai ?? targetBai}&tab=${nextTarget.kind}`,
      );
      window.scrollTo({ top: 0 });
      return;
    }
    backToList();
  };

  if (loading) {
    return <SkeletonGrid count={2} />;
  }

  if (notFound || !question) {
    return (
      <EmptyState
        icon="chat"
        title="Không tìm thấy câu hỏi"
        description="Câu hỏi em tìm không tồn tại hoặc đường dẫn chưa chính xác."
        action={
          <Button variant="primary" onClick={() => navigate('/qa')}>
            Về danh sách vấn đáp
          </Button>
        }
      />
    );
  }

  const listCount =
    lesson && question.kind === 'pic' ? lesson.pic.length : (lesson?.free.length ?? 0);
  const showResult = submittedText !== null && (picResult !== null || freeResult !== null);

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
          <span className={styles.tag}>
            {isRandomMode
              ? `Ngẫu nhiên · Bài ${question.bai}`
              : question.kind === 'pic'
                ? `Có tranh · Bài ${question.bai}`
                : `Không tranh · Bài ${question.bai}`}
          </span>
          {!isRandomMode ? (
            <span className={styles.counter}>
              Câu {question.index}/{listCount}
            </span>
          ) : null}
        </div>
      </div>

      {showResult ? (
        <>
          <QaResultPanel
            question={question}
            learnerName={state.name}
            submittedText={submittedText}
            picResult={picResult}
            freeResult={freeResult}
            voiceURI={activeVoice?.voiceURI ?? state.settings.voiceURI}
            showPromo={state.settings.showPromo}
          />
          <div className={styles.actionRow}>
            <Button
              variant="secondary"
              icon={<Icon name="speaker" size={18} />}
              onClick={handlePlayQuestion}
            >
              Nghe lại câu hỏi
            </Button>
            <Button variant="secondary" onClick={resetQuestionUi}>
              Nói lại câu này
            </Button>
            <Button variant="primary" onClick={handleNext}>
              {isRandomMode ? 'Câu ngẫu nhiên khác' : nextTarget ? 'Câu tiếp theo' : 'Về danh sách'}
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.split}>
          {/* Left column: Prompt & Picture */}
          <Card ruled className={styles.col}>
            {question.kind === 'pic' ? (
              <PictureView picKey={question.picKey} alt={question.picAlt} priority />
            ) : null}
            <p className={styles.note}>
              {question.kind === 'pic'
                ? 'Nhìn tranh, nghe câu hỏi (chưa hiện chữ) rồi trả lời ngắn gọn, đúng trọng tâm.'
                : 'Nghe câu hỏi (chưa hiện chữ) rồi trả lời về chính em. Trả lời ngắn gọn, đúng trọng tâm.'}
            </p>
            <div className={styles.controls}>
              <Button
                variant="primary"
                icon={<Icon name="speaker" size={18} />}
                onClick={handlePlayQuestion}
              >
                Nghe câu hỏi
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
                Trình duyệt này chưa có giọng đọc tiếng Nhật. Em bấm “Hiện chữ câu hỏi” bên dưới để
                đọc.
              </Banner>
            ) : null}

            <button
              type="button"
              className={styles.peekBtn}
              aria-expanded={peekOpen}
              onClick={() => setPeekOpen((v) => !v)}
            >
              {peekOpen ? 'Ẩn chữ câu hỏi' : 'Không nghe được? Hiện chữ câu hỏi (đề thật không có)'}
            </button>

            {peekOpen ? (
              <div className={styles.peekText} lang="ja">
                {spokenText}
              </div>
            ) : null}
          </Card>

          {/* Right column: Answer input & grading */}
          <Card className={styles.col}>
            <label htmlFor={textareaId} className={styles.label}>
              Câu trả lời của em
            </label>
            <textarea
              ref={textareaRef}
              id={textareaId}
              className={styles.textarea}
              lang="ja"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Bấm Nói rồi trả lời, hoặc gõ tiếng Nhật hay Romaji (vd: roshia desu). Xong bấm Chấm câu trả lời."
              autoComplete="off"
              spellCheck={false}
            />

            {romajiLivePreview ? (
              <div className={styles.romajiPreview}>
                <span>Đọc theo Romaji:</span>
                <span className={styles.romajiKana} lang="ja">
                  {romajiLivePreview}
                </span>
              </div>
            ) : null}

            <div className={styles.actionRow}>
              {!state.settings.typingOnly && capabilities.hasSTT ? (
                <MicButton state={micState} idleLabel="Nói" onClick={handleMicToggle} />
              ) : null}
              <Button variant="primary" loading={grading} onClick={handleSubmit}>
                Chấm câu trả lời
              </Button>
            </div>

            {micMessage ? (
              <Banner tone="warn" role="alert">
                {micMessage}
              </Banner>
            ) : null}

            <RomajiHelpBox />

            <p className={styles.hint}>
              {state.settings.typingOnly
                ? 'Đang bật chế độ Chỉ gõ (có thể đổi lại trong Cài đặt). '
                : !capabilities.hasSTT
                  ? 'Trình duyệt này không có micro tự nhận giọng (nên dùng Chrome hoặc Edge). '
                  : ''}
              Máy không tự chấm: em kiểm tra, sửa chữ nếu cần rồi bấm “Chấm câu trả lời”.
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
