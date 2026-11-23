import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../app/AppContext';
import { loadCatalog, loadScale, type CatalogData, type CatalogItem } from '../../data/loaders';
import type { ScaleMap } from '../../data/schema';
import { R9_FALLBACK_SCALE } from '../../engine/scale';
import { computeStreak, formatShortDateTime } from '../../lib/date';
import { Button, Card, EmptyState, Icon, ProgressBar, ScoreRing, SkeletonGrid } from '../../ui';
import styles from './DashboardPage.module.css';

type SearchFilter = 'all' | 'read' | 'pic' | 'free';

interface ReviewCandidate {
  readonly item: CatalogItem;
  readonly reason: string;
  readonly badge: string;
  readonly tone: 'bad' | 'warn' | 'accent';
  readonly priority: number;
}

export function DashboardPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const searchId = useId();

  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [scale, setScale] = useState<ScaleMap | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    void Promise.all([loadCatalog(), loadScale()]).then(([cat, sc]) => {
      if (!active) return;
      setCatalog(cat);
      setScale(sc);
    });
    return () => {
      active = false;
    };
  }, []);

  const streak = useMemo(() => computeStreak(state.activityDays), [state.activityDays]);

  const stats = useMemo(() => {
    if (!catalog) {
      return {
        totalItems: 107,
        practicedItems: 0,
        avgPct: 0,
        readDone: 0,
        readTotal: 44,
        picDone: 0,
        picTotal: 31,
        freeDone: 0,
        freeTotal: 32,
        byBai: [] as { bai: number; done: number; total: number; avg: number }[],
        topErrors: [] as { code: string; name: string; count: number }[],
      };
    }

    let readDone = 0;
    let readTotal = 0;
    let picDone = 0;
    let picTotal = 0;
    let freeDone = 0;
    let freeTotal = 0;

    const scores: number[] = [];
    const baiStats = new Map<number, { done: number; total: number; scores: number[] }>();
    for (const b of catalog.bais) {
      baiStats.set(b, { done: 0, total: 0, scores: [] });
    }

    for (const item of catalog.items) {
      const bucket = baiStats.get(item.bai);
      if (bucket) bucket.total++;

      if (item.kind === 'read') {
        readTotal++;
        const rec = state.readAttempts[item.id];
        if (rec) {
          readDone++;
          scores.push(rec.best);
          if (bucket) {
            bucket.done++;
            bucket.scores.push(rec.best);
          }
        }
      } else if (item.kind === 'pic') {
        picTotal++;
        const rec = state.attempts[item.id];
        if (rec) {
          picDone++;
          scores.push(rec.best);
          if (bucket) {
            bucket.done++;
            bucket.scores.push(rec.best);
          }
        }
      } else {
        freeTotal++;
        const rec = state.attempts[item.id];
        if (rec) {
          freeDone++;
          if (bucket) bucket.done++;
        }
      }
    }

    // Error code frequency across practiced picture questions
    const codeCounts = new Map<string, number>();
    for (const att of Object.values(state.attempts)) {
      for (const code of att.lastCodes ?? []) {
        codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      }
    }
    const topErrors = [...codeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({
        code,
        name:
          (scale && Object.prototype.hasOwnProperty.call(scale, code)
            ? scale[code]?.name
            : undefined) ?? (code === 'R9' ? R9_FALLBACK_SCALE.name : code),
        count,
      }));

    const byBai = catalog.bais.map((bai) => {
      const b = baiStats.get(bai) ?? { done: 0, total: 0, scores: [] };
      const avg = b.scores.length
        ? Math.round(b.scores.reduce((s, x) => s + x, 0) / b.scores.length)
        : 0;
      return { bai, done: b.done, total: b.total, avg };
    });

    const avgPct = scores.length
      ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
      : 0;

    return {
      totalItems: catalog.items.length,
      practicedItems: readDone + picDone + freeDone,
      avgPct,
      readDone,
      readTotal,
      picDone,
      picTotal,
      freeDone,
      freeTotal,
      byBai,
      topErrors,
    };
  }, [catalog, state.attempts, state.readAttempts, scale]);

  // Spaced repetition / smart review queue
  const reviewQueue = useMemo<ReviewCandidate[]>(() => {
    if (!catalog) return [];
    const candidates: ReviewCandidate[] = [];

    for (const item of catalog.items) {
      if (item.kind === 'read') {
        const rec = state.readAttempts[item.id];
        if (rec) {
          const due = rec.nextReviewAt ? Date.parse(rec.nextReviewAt) <= nowMs : false;
          if (rec.best < 80) {
            candidates.push({
              item,
              reason: `Điểm đọc còn thấp (${rec.best}%) — nên luyện lại sớm`,
              badge: `${rec.best}%`,
              tone: rec.best < 60 ? 'bad' : 'warn',
              priority: 100 - rec.best + (due ? 40 : 0),
            });
          } else if (due) {
            candidates.push({
              item,
              reason: `Đến hạn ôn lại (tốt nhất ${rec.best}%)`,
              badge: 'Đến hạn',
              tone: 'accent',
              priority: 30,
            });
          }
        }
      } else if (item.kind === 'pic') {
        const rec = state.attempts[item.id];
        if (rec) {
          const due = rec.nextReviewAt ? Date.parse(rec.nextReviewAt) <= nowMs : false;
          if (rec.best < 85) {
            candidates.push({
              item,
              reason: `Vấn đáp có tranh (${rec.best}%) — cần củng cố mẫu câu`,
              badge: `${rec.best}%`,
              tone: rec.best < 60 ? 'bad' : 'warn',
              priority: 105 - rec.best + (due ? 40 : 0),
            });
          } else if (due) {
            candidates.push({
              item,
              reason: `Đến hạn ôn lại (tốt nhất ${rec.best}%)`,
              badge: 'Đến hạn',
              tone: 'accent',
              priority: 28,
            });
          }
        }
      }
    }

    candidates.sort((a, b) => b.priority - a.priority);
    if (candidates.length >= 5) return candidates.slice(0, 6);

    // Fill with unpracticed starter items from active Bài so new learners always have a clear next step
    const pickedIds = new Set(candidates.map((c) => c.item.id));
    const preferredBai = state.settings.lastBai || 1;
    const starters = catalog.items
      .filter((it) => {
        if (pickedIds.has(it.id)) return false;
        const done =
          it.kind === 'read' ? Boolean(state.readAttempts[it.id]) : Boolean(state.attempts[it.id]);
        return !done;
      })
      .sort((a, b) => (a.bai === preferredBai ? -1 : b.bai === preferredBai ? 1 : a.bai - b.bai));

    for (const it of starters) {
      if (candidates.length >= 5) break;
      candidates.push({
        item: it,
        reason: `Chưa luyện · Bài ${it.bai} (${
          it.kind === 'read' ? 'Luyện đọc' : it.kind === 'pic' ? 'Có tranh' : 'Không tranh'
        })`,
        badge: 'Mới',
        tone: 'accent',
        priority: 10,
      });
    }

    return candidates;
  }, [catalog, nowMs, state.attempts, state.readAttempts, state.settings.lastBai]);

  // Quick search across all 107 items
  const searchResults = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    if (!q && filter === 'all') return [];
    return catalog.items
      .filter((it) => {
        if (filter !== 'all' && it.kind !== filter) return false;
        if (!q) return true;
        return it.keywords.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [catalog, query, filter]);

  const openItem = (item: CatalogItem) => {
    if (item.kind === 'read') {
      navigate(`/read/${encodeURIComponent(item.id)}?bai=${item.bai}`);
    } else {
      navigate(`/qa/${encodeURIComponent(item.id)}?bai=${item.bai}&tab=${item.kind}`);
    }
  };

  if (!catalog) {
    return <SkeletonGrid count={4} />;
  }

  return (
    <div className={styles.page}>
      {/* Hero notebook overview */}
      <Card ruled className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.kicker}>Sổ tay luyện thi JPD113 · Ngoại tuyến</p>
          <h1 className={styles.title}>
            Chào{' '}
            <span className="jp" lang="ja">
              {state.name}さん
            </span>
          </h1>
          <p className={styles.lead}>
            Đã luyện{' '}
            <strong>
              {stats.practicedItems}/{stats.totalItems}
            </strong>{' '}
            mục trên toàn bộ 3 Bài. Mọi tiến độ được lưu riêng trên máy này.
          </p>
          <div className={styles.ctaRow}>
            <Button
              variant="primary"
              icon={<Icon name="book" size={18} />}
              onClick={() => navigate(`/read?bai=${state.settings.lastBai}`)}
            >
              Luyện đọc
            </Button>
            <Button
              variant="secondary"
              icon={<Icon name="shuffle" size={18} />}
              onClick={() => navigate(`/qa/random?bai=${state.settings.lastBai}`)}
            >
              Vấn đáp ngẫu nhiên
            </Button>
            <Button
              variant="secondary"
              icon={<Icon name="clock" size={18} />}
              onClick={() => navigate('/exam')}
            >
              Thi thử
            </Button>
          </div>
        </div>
        <ScoreRing
          value={stats.avgPct}
          max={100}
          label={stats.practicedItems > 0 ? 'Điểm TB chung' : 'Sẵn sàng luyện'}
          sublabel={
            stats.practicedItems > 0 ? `Trên các mục đã chấm` : 'Bắt đầu bài đầu tiên hôm nay'
          }
        />
      </Card>

      {/* Key metrics */}
      <div className={styles.metricsRow}>
        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <span>Chuỗi ngày luyện</span>
            <Icon name="flame" size={18} className={styles.statIconFlame} />
          </div>
          <span className={styles.statNum}>{streak} ngày</span>
          <span className={styles.statSub}>Tổng {state.activityDays.length} ngày có hoạt động</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <span>Luyện đọc</span>
            <Icon name="book" size={18} className={styles.statIcon} />
          </div>
          <span className={styles.statNum}>
            {stats.readDone}/{stats.readTotal}
          </span>
          <span className={styles.statSub}>44 đoạn văn (Bài 1–3)</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <span>Vấn đáp có tranh</span>
            <Icon name="chat" size={18} className={styles.statIcon} />
          </div>
          <span className={styles.statNum}>
            {stats.picDone}/{stats.picTotal}
          </span>
          <span className={styles.statSub}>Thang 15 điểm (R0–R11)</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHead}>
            <span>Vấn đáp không tranh</span>
            <Icon name="stamp" size={18} className={styles.statIcon} />
          </div>
          <span className={styles.statNum}>
            {stats.freeDone}/{stats.freeTotal}
          </span>
          <span className={styles.statSub}>Tự soát theo chủ đề L01–L14</span>
        </div>
      </div>

      {/* Smart Review + Lesson Progress */}
      <div className={styles.twoCol}>
        <Card className={styles.section}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Câu nên ôn hôm nay</h2>
            <span className={styles.hint}>Ôn tập thông minh</span>
          </div>
          <div className={styles.reviewList}>
            {reviewQueue.map((entry) => (
              <button
                key={entry.item.id}
                type="button"
                className={styles.reviewItem}
                onClick={() => openItem(entry.item)}
              >
                <span className={styles.reviewMeta}>
                  <span
                    className={`${styles.reviewTitle} ${entry.item.kind === 'read' ? 'jp' : ''}`}
                    lang={entry.item.kind === 'read' ? 'ja' : undefined}
                  >
                    {entry.item.title}
                  </span>
                  <span className={styles.reviewSub}>{entry.reason}</span>
                </span>
                <span
                  className={`${styles.pill} ${
                    entry.tone === 'bad'
                      ? styles.pillBad
                      : entry.tone === 'warn'
                        ? styles.pillWarn
                        : styles.pillAccent
                  }`}
                >
                  {entry.badge}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className={styles.section}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Tiến độ theo Bài &amp; lỗi hay gặp</h2>
          </div>
          {stats.byBai.map((b) => (
            <ProgressBar
              key={b.bai}
              value={b.done}
              max={Math.max(1, b.total)}
              label={`Bài ${b.bai} (${b.done}/${b.total} mục)`}
              valueLabel={
                b.avg > 0 ? `TB ${b.avg}%` : `${Math.round((b.done / Math.max(1, b.total)) * 100)}%`
              }
            />
          ))}

          <div className={styles.errorTagRow}>
            <span className={styles.hint}>
              <strong>Dạng lỗi cần chú ý gần đây:</strong>
            </span>
            {stats.topErrors.length === 0 ? (
              <p className={styles.hint}>
                Chưa có lỗi vấn đáp nào được ghi nhận. Khi luyện câu có tranh, các lỗi hay gặp
                (R0–R11) sẽ tổng hợp tại đây.
              </p>
            ) : (
              stats.topErrors.map((err) => (
                <div key={err.code} className={styles.errorTag}>
                  <span>
                    <span className={styles.errorCode}>{err.code}</span>
                    {err.name}
                  </span>
                  <span className="tabular">{err.count} câu</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Search */}
      <Card className={styles.section}>
        <div className={styles.secHead}>
          <h2 className={styles.secTitle}>Tìm kiếm nhanh câu hỏi &amp; từ vựng</h2>
          <span className={styles.hint}>107 mục · hoàn toàn ngoại tuyến</span>
        </div>
        <div className={styles.searchBar}>
          <div className={styles.searchInputWrap}>
            <Icon name="search" size={18} className={styles.searchIcon} />
            <label htmlFor={searchId} className="sr-only">
              Tìm câu hỏi, đoạn đọc hoặc từ vựng
            </label>
            <input
              id={searchId}
              type="search"
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Gõ từ tiếng Việt, tiếng Nhật hoặc mã câu (vd: ロシア, パイロット, hỏi giờ, B2-T01)…"
            />
          </div>
          <div className={styles.filterRow} role="group" aria-label="Lọc loại kết quả tìm kiếm">
            {(
              [
                ['all', 'Tất cả'],
                ['read', 'Luyện đọc'],
                ['pic', 'Có tranh'],
                ['free', 'Không tranh'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={styles.filterChip}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {query.trim() || filter !== 'all' ? (
          searchResults.length === 0 ? (
            <EmptyState
              icon="search"
              title="Không tìm thấy kết quả phù hợp"
              description="Thử tìm bằng từ khoá ngắn hơn hoặc chuyển bộ lọc về Tất cả."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Xoá tìm kiếm
                </Button>
              }
            />
          ) : (
            <div className={styles.reviewList}>
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.reviewItem}
                  onClick={() => openItem(item)}
                >
                  <span className={styles.reviewMeta}>
                    <span className={styles.reviewTitle}>
                      {item.id} · {item.title}
                    </span>
                    <span className={`${styles.reviewSub} jp`} lang="ja">
                      {item.jp.slice(0, 64)}
                      {item.jp.length > 64 ? '…' : ''}
                    </span>
                  </span>
                  <span className={`${styles.pill} ${styles.pillAccent}`}>Bài {item.bai}</span>
                </button>
              ))}
            </div>
          )
        ) : null}
      </Card>

      {/* Recent mock exam history */}
      {state.examHistory.length > 0 ? (
        <Card className={styles.section}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Lịch sử thi thử gần đây</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/exam')}>
              Làm đề thi mới
            </Button>
          </div>
          <div className={styles.reviewList}>
            {[...state.examHistory]
              .reverse()
              .slice(0, 5)
              .map((ex) => (
                <div key={ex.id} className={styles.errorTag}>
                  <span>
                    <strong>{formatShortDateTime(ex.at)}</strong> · Đọc {ex.readScore}% · Có tranh{' '}
                    {ex.picAvgPct}% · Không tranh {ex.freePassCount}/{ex.freeTotal}
                  </span>
                  <span className={`${styles.pill} ${styles.pillAccent}`}>{ex.overallPct}%</span>
                </div>
              ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
