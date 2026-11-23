import { useEffect, useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { loadLesson } from '../../data/loaders';
import type { LessonData } from '../../data/normalize';
import { t } from '../../lib/i18n';
import { MAX_LEARNER_NAME_LEN } from '../../lib/sanitize';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  ProgressBar,
  QuestionCard,
  SegmentedControl,
  SkeletonGrid,
  Tabs,
} from '../../ui';
import { VoiceQuickBar } from '../shared/VoiceQuickBar';
import styles from './QaListPage.module.css';

type QaTab = 'rand' | 'pic' | 'free';

export function QaListPage() {
  const { state, setName, updateSettings } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const nameId = useId();

  const paramBai = Number(searchParams.get('bai'));
  const bai = [1, 2, 3].includes(paramBai) ? paramBai : state.settings.lastBai || 1;

  const paramTab = searchParams.get('tab');
  const tab: QaTab =
    paramTab === 'pic' || paramTab === 'free' || paramTab === 'rand' ? paramTab : 'rand';

  const [loaded, setLoaded] = useState<{
    bai: number;
    data: LessonData | null;
    error: string | null;
  }>({
    bai: -1,
    data: null,
    error: null,
  });
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadLesson(bai)
      .then((data) => {
        if (!active) return;
        setLoaded({ bai, data, error: null });
      })
      .catch(() => {
        if (!active) return;
        setLoaded({ bai, data: null, error: 'Không thể tải danh sách câu hỏi cho Bài này.' });
      });
    return () => {
      active = false;
    };
  }, [bai]);

  const loading = loaded.bai !== bai;
  const lesson = loaded.bai === bai ? loaded.data : null;
  const error = loaded.bai === bai ? loaded.error : null;
  const nameInput = nameDraft ?? state.name;

  const handleBaiChange = (nextBai: number) => {
    updateSettings({ lastBai: nextBai });
    setSearchParams({ bai: String(nextBai), tab });
  };

  const handleTabChange = (nextTab: QaTab) => {
    setSearchParams({ bai: String(bai), tab: nextTab });
  };

  const allQuestions = lesson ? [...lesson.pic, ...lesson.free] : [];
  const doneCount = allQuestions.filter((q) => Boolean(state.attempts[q.id])).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.bgWord} aria-hidden="true" lang="ja">
          問答
        </span>
        <h1 className={styles.title}>Luyện vấn đáp</h1>
        <p className={styles.lead}>
          Nghe câu hỏi (chưa hiện chữ), trả lời bằng giọng nói hoặc gõ Romaji và nhận phân tích theo
          thang lỗi R0–R11.
        </p>
      </header>

      <SegmentedControl
        ariaLabel="Chọn Bài"
        value={bai}
        onChange={handleBaiChange}
        options={[
          { value: 1, label: 'Bài 1' },
          { value: 2, label: 'Bài 2' },
          { value: 3, label: 'Bài 3' },
        ]}
      />

      {lesson ? (
        <ProgressBar
          value={doneCount}
          max={Math.max(1, allQuestions.length)}
          label={`Bài ${bai}: đã luyện ${doneCount}/${allQuestions.length} câu`}
          valueLabel={`${Math.round((doneCount / Math.max(1, allQuestions.length)) * 100)}%`}
        />
      ) : null}

      <VoiceQuickBar />

      <Tabs<QaTab>
        ariaLabel="Chọn dạng câu hỏi vấn đáp"
        value={tab}
        onChange={handleTabChange}
        options={[
          { value: 'rand', label: 'Ngẫu nhiên' },
          { value: 'pic', label: 'Có tranh', count: lesson?.pic.length },
          { value: 'free', label: 'Không tranh', count: lesson?.free.length },
        ]}
      />

      {tab !== 'pic' ? (
        <Card className={styles.nameBox}>
          <label htmlFor={nameId} className={styles.hint}>
            <strong>Tên của em</strong> (katakana hoặc hiragana). Câu hỏi có{' '}
            <span className="jp" lang="ja">
              「Aさん」
            </span>{' '}
            sẽ gọi đúng tên này.
          </label>
          <div className={styles.nameRow}>
            <input
              id={nameId}
              className={styles.nameInput}
              value={nameInput}
              maxLength={MAX_LEARNER_NAME_LEN}
              autoComplete="off"
              onChange={(e) => {
                setNameDraft(e.target.value);
                setName(e.target.value);
              }}
              onBlur={() => setNameDraft(null)}
            />
            <span className={styles.hint} lang="ja">
              Ví dụ: ミン、ナム、ハイ
            </span>
          </div>
        </Card>
      ) : null}

      {error ? (
        <Banner tone="danger" role="alert" title="Lỗi tải dữ liệu">
          {error}
        </Banner>
      ) : null}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : lesson ? (
        tab === 'rand' ? (
          <Card ruled className={styles.randCard}>
            <h2 className={styles.randTitle}>Câu hỏi ngẫu nhiên, Bài {bai}</h2>
            <p className={styles.lead}>
              Máy chọn một câu bất kỳ của Bài {bai} ({lesson.pic.length} câu có tranh và{' '}
              {lesson.free.length} câu không tranh). Em chưa biết trước dạng câu nào, giống như vào
              phòng thi thật.
            </p>
            <Button
              variant="primary"
              size="lg"
              icon={<Icon name="shuffle" size={20} />}
              onClick={() => navigate(`/qa/random?bai=${bai}`)}
            >
              Bắt đầu câu ngẫu nhiên
            </Button>
          </Card>
        ) : tab === 'pic' ? (
          lesson.pic.length === 0 ? (
            <EmptyState
              title="Bài này chưa có câu có tranh"
              description="Em chọn Bài khác hoặc chuyển sang tab Không tranh."
            />
          ) : (
            <div className={styles.grid}>
              {lesson.pic.map((q) => {
                const rec = state.attempts[q.id];
                const statusText = rec ? `Tốt nhất ${rec.best}% (${rec.count} lần)` : 'Chưa luyện';
                const tone = !rec
                  ? 'new'
                  : rec.best >= 93
                    ? 'good'
                    : rec.best >= 60
                      ? 'warn'
                      : 'bad';
                return (
                  <QuestionCard
                    key={q.id}
                    indexLabel={`Câu ${q.index}`}
                    tag={q.judge.kind === 'YN' ? 'Có/Không' : 'WH'}
                    title={q.title}
                    statusText={statusText}
                    statusTone={tone}
                    done={Boolean(rec)}
                    mastered={Boolean(rec && rec.best >= 93)}
                    onClick={() => navigate(`/qa/${encodeURIComponent(q.id)}?bai=${bai}&tab=pic`)}
                  />
                );
              })}
            </div>
          )
        ) : lesson.free.length === 0 ? (
          <EmptyState
            title="Bài này chưa có câu không tranh"
            description="Em chọn Bài khác hoặc chuyển sang tab Có tranh."
          />
        ) : (
          <div className={styles.grid}>
            {lesson.free.map((q) => {
              const rec = state.attempts[q.id];
              const statusText = rec ? `Đã luyện ${rec.count} lần` : 'Chưa luyện';
              return (
                <QuestionCard
                  key={q.id}
                  indexLabel={`Câu ${q.index}`}
                  tag={q.topicCode}
                  title={q.title}
                  statusText={statusText}
                  statusTone={rec ? 'good' : 'new'}
                  done={Boolean(rec)}
                  mastered={Boolean(rec && rec.best === 100)}
                  onClick={() => navigate(`/qa/${encodeURIComponent(q.id)}?bai=${bai}&tab=free`)}
                />
              );
            })}
          </div>
        )
      ) : null}

      <p className={styles.foot}>{t('disclaimerQa')}</p>
    </div>
  );
}
