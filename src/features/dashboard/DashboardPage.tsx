import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../app/AppContext';
import { loadCatalog, loadScale, type CatalogData, type CatalogItem } from '../../data/loaders';
import type { ScaleMap } from '../../data/schema';
import { R9_FALLBACK_SCALE } from '../../engine/scale';
import { computeStreak, formatShortDateTime } from '../../lib/date';
import { Button, EmptyState, Icon, ProgressBar, ScoreRing, SkeletonGrid } from '../../ui';
import styles from './DashboardPage.module.css';

type SearchFilter = 'all' | 'read' | 'pic' | 'free';

interface ReviewCandidate {
  readonly item: CatalogItem;
  readonly reason: string;
  readonly badge: string;
  readonly tone: 'bad' | 'warn' | 'accent';
  readonly priority: number;
}

function kindLabel(kind: CatalogItem['kind']): string {
  if (kind === 'read') return 'Luyện đọc';
  if (kind === 'pic') return 'Có tranh';
  return 'Không tranh';
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
              reason: `Điểm đọc còn thấp (${rec.best}%), nên luyện lại sớm`,
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
              reason: `Vấn đáp có tranh (${rec.best}%), cần củng cố mẫu câu`,
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
    if (candidates.length >= 6) return candidates.slice(0, 6);

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
      if (candidates.length >= 6) break;
      candidates.push({
        item: it,
        reason: `Chưa luyện, Bài ${it.bai} (${kindLabel(it.kind)})`,
        badge: 'Mới',
        tone: 'accent',
        priority: 10,
      });
    }

    return candidates;
  }, [catalog, nowMs, state.attempts, state.readAttempts, state.settings.lastBai]);

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

  const featured = reviewQueue[0] ?? null;
  const remainingQueue = featured ? reviewQueue.slice(1) : reviewQueue;

  return (
    <div className={styles.page}>
      {/* Editorial masthead directly on washi paper */}
      <header className={styles.masthead}>
        <div className={styles.mastheadText}>
          <h1 className={styles.title}>
            Chào{' '}
            <span className="jp" lang="ja">
              {state.name}さん
            </span>
          </h1>
          <p className={styles.lead}>
            Đã luyện{' '}
            <strong className="tabular">
              {stats.practicedItems}/{stats.totalItems}
            </strong>{' '}
            mục trong 3 Bài. Toàn bộ điểm số và lịch sử luyện tập nằm riêng trên máy này.
          </p>
        </div>
        <div className={styles.quickNav}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="book" size={16} />}
            onClick={() => navigate(`/read?bai=${state.settings.lastBai}`)}
          >
            Luyện đọc
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="shuffle" size={16} />}
            onClick={() => navigate(`/qa/random?bai=${state.settings.lastBai}`)}
          >
            Vấn đáp ngẫu nhiên
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="clock" size={16} />}
            onClick={() => navigate('/exam')}
          >
            Thi thử
          </Button>
        </div>
      </header>

      {/* Hairline-divided notebook progress ledger (no boxy KPI cards) */}
      <section className={styles.ledger} aria-label="Tổng quan tiến độ">
        <div className={styles.ledgerCell}>
          <span className={styles.ledgerLabel}>Chuỗi ngày luyện</span>
          <span className={styles.ledgerNum}>{streak} ngày</span>
          <span className={styles.ledgerSub}>Tổng {state.activityDays.length} ngày học</span>
        </div>
        <div className={styles.ledgerCell}>
          <span className={styles.ledgerLabel}>Luyện đọc</span>
          <span className={styles.ledgerNum}>
            {stats.readDone}/{stats.readTotal}
          </span>
          <span className={styles.ledgerSub}>Đoạn văn Bài 1–3</span>
        </div>
        <div className={styles.ledgerCell}>
          <span className={styles.ledgerLabel}>Vấn đáp có tranh</span>
          <span className={styles.ledgerNum}>
            {stats.picDone}/{stats.picTotal}
          </span>
          <span className={styles.ledgerSub}>Chấm theo thang R0–R11</span>
        </div>
        <div className={styles.ledgerCell}>
          <span className={styles.ledgerLabel}>Vấn đáp không tranh</span>
          <span className={styles.ledgerNum}>
            {stats.freeDone}/{stats.freeTotal}
          </span>
          <span className={styles.ledgerSub}>Tự soát theo chủ đề</span>
        </div>
      </section>

      {/* Single elevated focal artifact: Next-up live Japanese study folio */}
      {featured ? (
        <section
          className={`${styles.focalFolio} ${
            featured.tone === 'bad' || featured.tone === 'warn' ? styles.focalFolioReview : ''
          }`}
          aria-label="Bài luyện gợi ý tiếp theo"
        >
          <div className={styles.focalBody}>
            <div className={styles.focalMeta}>
              <span className={styles.focalTag}>
                Bài {featured.item.bai}, {kindLabel(featured.item.kind)}
              </span>
              <span className={styles.focalReason}>{featured.reason}</span>
            </div>
            <p className={styles.focalJp} lang="ja">
              {featured.item.jp.slice(0, 88)}
              {featured.item.jp.length > 88 ? '…' : ''}
            </p>
            {featured.item.kind !== 'read' ? (
              <p className={styles.focalTitle}>{featured.item.title}</p>
            ) : null}
            <div className={styles.focalActions}>
              <Button variant="primary" onClick={() => openItem(featured.item)}>
                Luyện mục này ngay
              </Button>
            </div>
          </div>
          <div className={styles.focalRing}>
            <ScoreRing
              value={stats.avgPct}
              max={100}
              label={stats.practicedItems > 0 ? 'Điểm TB chung' : 'Chưa có điểm'}
              sublabel={
                stats.practicedItems > 0
                  ? 'Tính trên các mục đã chấm'
                  : 'Hoàn thành mục đầu tiên hôm nay'
              }
            />
          </div>
        </section>
      ) : null}

      {/* Asymmetric editorial spread: Review Ledger (60%) + Lesson Map (40%) */}
      <div className={styles.spread}>
        <section className={styles.spreadMain}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Câu nên ôn hôm nay</h2>
            <span className={styles.hint}>Ưu tiên câu điểm thấp hoặc đến hạn</span>
          </div>
          <div className={styles.ledgerList}>
            {remainingQueue.map((entry) => (
              <button
                key={entry.item.id}
                type="button"
                className={styles.ledgerRow}
                onClick={() => openItem(entry.item)}
              >
                <span className={styles.rowMeta}>
                  <span
                    className={`${styles.rowTitle} ${entry.item.kind === 'read' ? 'jp' : ''}`}
                    lang={entry.item.kind === 'read' ? 'ja' : undefined}
                  >
                    {entry.item.title}
                  </span>
                  <span className={styles.rowSub}>{entry.reason}</span>
                </span>
                <span
                  className={`${styles.stamp} ${
                    entry.tone === 'bad'
                      ? styles.stampBad
                      : entry.tone === 'warn'
                        ? styles.stampWarn
                        : styles.stampAccent
                  }`}
                >
                  {entry.badge}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className={styles.spreadSide}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Tiến độ theo Bài</h2>
          </div>
          <div className={styles.baiBars}>
            {stats.byBai.map((b) => (
              <ProgressBar
                key={b.bai}
                value={b.done}
                max={Math.max(1, b.total)}
                label={`Bài ${b.bai} (${b.done}/${b.total} mục)`}
                valueLabel={
                  b.avg > 0
                    ? `TB ${b.avg}%`
                    : `${Math.round((b.done / Math.max(1, b.total)) * 100)}%`
                }
              />
            ))}
          </div>

          <div className={styles.errorBlock}>
            <h3 className={styles.subTitle}>Lỗi vấn đáp hay gặp</h3>
            {stats.topErrors.length === 0 ? (
              <p className={styles.hint}>
                Khi em luyện các câu vấn đáp có tranh, các lỗi thường lặp lại (R0–R11) sẽ tổng hợp
                tại đây.
              </p>
            ) : (
              <div className={styles.errorList}>
                {stats.topErrors.map((err) => (
                  <div key={err.code} className={styles.errorRow}>
                    <span>
                      <span className={styles.errorCode}>{err.code}</span>
                      {err.name}
                    </span>
                    <span className="tabular">{err.count} câu</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Inline offline search directly on washi */}
      <section className={styles.flatSection}>
        <div className={styles.secHead}>
          <h2 className={styles.secTitle}>Tìm nhanh câu hỏi và từ vựng</h2>
          <span className={styles.hint}>Tra cứu ngoại tuyến trên 107 mục</span>
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
            <div className={styles.ledgerList}>
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.ledgerRow}
                  onClick={() => openItem(item)}
                >
                  <span className={styles.rowMeta}>
                    <span className={styles.rowTitle}>
                      <span className={styles.codeId}>{item.id}</span> {item.title}
                    </span>
                    <span className={`${styles.rowSub} jp`} lang="ja">
                      {item.jp.slice(0, 64)}
                      {item.jp.length > 64 ? '…' : ''}
                    </span>
                  </span>
                  <span className={`${styles.stamp} ${styles.stampAccent}`}>Bài {item.bai}</span>
                </button>
              ))}
            </div>
          )
        ) : null}
      </section>

      {/* Recent mock exam history directly on washi */}
      {state.examHistory.length > 0 ? (
        <section className={styles.flatSection}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Lịch sử thi thử gần đây</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/exam')}>
              Làm đề thi mới
            </Button>
          </div>
          <div className={styles.ledgerList}>
            {[...state.examHistory]
              .reverse()
              .slice(0, 5)
              .map((ex) => (
                <div key={ex.id} className={styles.historyRow}>
                  <span className={styles.historyText}>
                    <strong className="tabular">{formatShortDateTime(ex.at)}</strong>, đọc{' '}
                    {ex.readScore}%, có tranh {ex.picAvgPct}%, không tranh {ex.freePassCount}/
                    {ex.freeTotal}
                  </span>
                  <span className={`${styles.stamp} ${styles.stampAccent}`}>{ex.overallPct}%</span>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
