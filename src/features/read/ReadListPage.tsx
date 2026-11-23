import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { loadLesson } from '../../data/loaders';
import type { LessonData } from '../../data/normalize';
import { plainK, splitSentences } from '../../engine';
import { t } from '../../lib/i18n';
import {
  Banner,
  EmptyState,
  ProgressBar,
  QuestionCard,
  SegmentedControl,
  SkeletonGrid,
} from '../../ui';
import { VoiceQuickBar } from '../shared/VoiceQuickBar';
import styles from './ReadListPage.module.css';

export function ReadListPage() {
  const { state, updateSettings } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const paramBai = Number(searchParams.get('bai'));
  const bai = [1, 2, 3].includes(paramBai) ? paramBai : state.settings.lastBai || 1;

  const [loaded, setLoaded] = useState<{
    bai: number;
    data: LessonData | null;
    error: string | null;
  }>({
    bai: -1,
    data: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    void loadLesson(bai)
      .then((data) => {
        if (!active) return;
        setLoaded({ bai, data, error: null });
      })
      .catch(() => {
        if (!active) return;
        setLoaded({ bai, data: null, error: 'Không thể tải danh sách bài đọc cho Bài này.' });
      });
    return () => {
      active = false;
    };
  }, [bai]);

  const loading = loaded.bai !== bai;
  const lesson = loaded.bai === bai ? loaded.data : null;
  const error = loaded.bai === bai ? loaded.error : null;

  const handleBaiChange = (nextBai: number) => {
    updateSettings({ lastBai: nextBai });
    setSearchParams({ bai: String(nextBai) });
  };

  const passages = lesson?.read ?? [];
  const doneCount = passages.filter((p) => Boolean(state.readAttempts[p.id])).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.bgWord} aria-hidden="true" lang="ja">
          朗読
        </span>
        <h1 className={styles.title}>Luyện đọc đoạn văn</h1>
        <p className={styles.lead}>
          Nghe mẫu từng câu, đọc thành tiếng hoặc gõ cách đọc để máy chấm theo 3 nhóm: Chữ Hán
          (30%), Katakana (30%) và Hiragana (40%).
        </p>
      </header>

      <SegmentedControl
        ariaLabel="Chọn Bài luyện đọc"
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
          max={Math.max(1, passages.length)}
          label={`Bài ${bai}: đã đọc ${doneCount}/${passages.length} đoạn`}
          valueLabel={`${Math.round((doneCount / Math.max(1, passages.length)) * 100)}%`}
        />
      ) : null}

      <VoiceQuickBar />

      {error ? (
        <Banner tone="danger" role="alert" title="Lỗi tải dữ liệu">
          {error}
        </Banner>
      ) : null}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : passages.length === 0 ? (
        <EmptyState
          icon="book"
          title="Sắp có bài đọc"
          description="Bài đọc của phần này sẽ được bổ sung sau. Em chuyển sang phần Vấn đáp hoặc chọn Bài khác."
        />
      ) : (
        <>
          <p className={styles.intro}>
            Mỗi đoạn gồm chữ Hán trọng tâm (gạch chân đỏ) và Katakana (màu xanh). Chọn một đoạn bên
            dưới để bắt đầu luyện đọc.
          </p>
          <div className={styles.grid}>
            {passages.map((p) => {
              const rec = state.readAttempts[p.id];
              const firstSent = splitSentences(p.markup)[0] ?? p.markup;
              const preview = `${plainK(firstSent)
                .replace(/[「」]/g, '')
                .slice(0, 16)}…`;
              const statusText = rec ? `Tốt nhất ${rec.best}% (${rec.count} lần)` : 'Chưa luyện';
              const tone = !rec ? 'new' : rec.best >= 93 ? 'good' : rec.best >= 60 ? 'warn' : 'bad';

              return (
                <QuestionCard
                  key={p.id}
                  indexLabel={`Đoạn ${p.index}`}
                  tag={p.id}
                  title={preview}
                  titleLang="ja"
                  statusText={statusText}
                  statusTone={tone}
                  done={Boolean(rec)}
                  mastered={Boolean(rec && rec.best >= 93)}
                  onClick={() => navigate(`/read/${encodeURIComponent(p.id)}?bai=${bai}`)}
                />
              );
            })}
          </div>
        </>
      )}

      <p className={styles.foot}>{t('disclaimerRead')}</p>
    </div>
  );
}
