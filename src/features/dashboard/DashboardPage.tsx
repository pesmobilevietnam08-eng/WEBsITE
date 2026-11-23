import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../app/AppContext';
import { loadCatalog, loadScale, type CatalogData, type CatalogItem } from '../../data/loaders';
import type { ScaleMap } from '../../data/schema';
import { R9_FALLBACK_SCALE } from '../../engine/scale';
import { computeStreak, formatShortDateTime } from '../../lib/date';
import {
  Button,
  EmptyState,
  HankoStamp,
  Icon,
  PostageStamp,
  ProgressBar,
  ScoreRing,
  SkeletonGrid,
} from '../../ui';
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
              reason: `Điểm đọc còn thấp (${rec.best}%), đấu lại cho chắc`,
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
              reason: `Vấn đáp có tranh (${rec.best}%), cần gỡ điểm trừ`,
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
        reason: `Ván mới, Bài ${it.bai} (${kindLabel(it.kind)})`,
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
  const watermarkText = '日本語試験';

  return (
    <div className={styles.page}>
      {/* SPOTLIGHT 1 — Magazine Cover × Tournament Poster Hero */}
      <section className={styles.coverSpread} aria-label="Bìa sổ tay luyện thi JPD113">
        {/* Giant cropped Japanese display typography as background cover art */}
        <div className={styles.bgGlyph} aria-hidden="true" lang="ja">
          {watermarkText}
        </div>

        <div className={styles.coverSpine} aria-hidden="true">
          <span className="jp-spine" lang="ja">
            日本語・試験
          </span>
        </div>

        <div className={styles.coverMain}>
          <header className={styles.masthead}>
            <h1 className={styles.title}>
              Chào{' '}
              <span className={styles.nameJp} lang="ja">
                {state.name}さん
              </span>
            </h1>
            <p className={styles.lead}>
              Đã qua{' '}
              <strong className="tabular">
                {stats.practicedItems}/{stats.totalItems}
              </strong>{' '}
              ván trên 3 Bài. Mọi điểm số lưu riêng trên máy này, sẵn sàng chạy không cần mạng.
            </p>
          </header>

          {/* Primary Focal Tournament Match Box (Riso offset shadow) */}
          {featured ? (
            <div
              className={`${styles.matchPoster} ${
                featured.tone === 'bad' || featured.tone === 'warn' ? styles.matchPosterHot : ''
              }`}
            >
              <div className={styles.matchTop}>
                <span className={styles.matchTag}>
                  Bài {featured.item.bai}, {kindLabel(featured.item.kind)}
                </span>
                <span className={styles.matchReason}>{featured.reason}</span>
              </div>
              <p className={styles.matchJp} lang="ja">
                {featured.item.jp.slice(0, 72)}
                {featured.item.jp.length > 72 ? '…' : ''}
              </p>
              {featured.item.kind !== 'read' ? (
                <p className={styles.matchSub}>{featured.item.title}</p>
              ) : null}
              <div className={styles.matchActions}>
                <Button variant="primary" size="lg" onClick={() => openItem(featured.item)}>
                  Vào phòng thi ngay
                </Button>
                <Button
                  variant="secondary"
                  icon={<Icon name="shuffle" size={16} />}
                  onClick={() => navigate(`/qa/random?bai=${state.settings.lastBai}`)}
                >
                  Bốc câu ngẫu nhiên
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Asymmetric Poster Column: Postage Stamp Streak + Big ScoreRing + Hanko Seal */}
        <aside className={styles.coverAside}>
          <div className={styles.stampRow}>
            <PostageStamp days={streak} totalDays={state.activityDays.length} />
          </div>

          <div className={styles.scorePoster}>
            <div className={styles.scorePosterHead}>
              <ScoreRing
                value={stats.avgPct}
                max={100}
                size="sm"
                label={stats.practicedItems > 0 ? 'Điểm TB chung' : 'Chưa chấm ván nào'}
                sublabel={
                  stats.practicedItems > 0 ? 'Trên các bài đã chấm' : 'Bấm Vào phòng thi để mở màn'
                }
              />
              {stats.practicedItems > 0 ? (
                <HankoStamp
                  glyph={stats.avgPct >= 85 ? '優' : stats.avgPct >= 65 ? '良' : '挑'}
                  caption={stats.avgPct >= 85 ? '合格圏' : '修行中'}
                  tone="hanko"
                  size="sm"
                />
              ) : (
                <HankoStamp glyph="戦" caption="開戦" tone="hanko" size="sm" animate={false} />
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* Bold print-ruled breakdown ledger */}
      <section className={styles.printStrip} aria-label="Thống kê ba phần thi">
        <div className={styles.stripCell}>
          <span className={styles.stripLabel}>Luyện đọc thành tiếng</span>
          <span className={styles.stripNum}>
            {stats.readDone}
            <span className={styles.stripDen}>/{stats.readTotal}</span>
          </span>
          <span className={styles.stripSub}>44 đoạn văn, chấm 30/30/40</span>
        </div>
        <div className={styles.stripCell}>
          <span className={styles.stripLabel}>Vấn đáp có tranh</span>
          <span className={styles.stripNum}>
            {stats.picDone}
            <span className={styles.stripDen}>/{stats.picTotal}</span>
          </span>
          <span className={styles.stripSub}>Thang 15 điểm theo lỗi R0–R11</span>
        </div>
        <div className={styles.stripCell}>
          <span className={styles.stripLabel}>Vấn đáp không tranh</span>
          <span className={styles.stripNum}>
            {stats.freeDone}
            <span className={styles.stripDen}>/{stats.freeTotal}</span>
          </span>
          <span className={styles.stripSub}>Bảng tự soát theo chủ đề L01–L14</span>
        </div>
      </section>

      {/* Asymmetric 58 / 42 Editorial Spread */}
      <div className={styles.spread}>
        <section className={styles.spreadMain}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Câu nên ôn hôm nay</h2>
            <span className={styles.hint}>Ưu tiên câu dễ mất điểm hoặc đến hạn</span>
          </div>
          <div className={styles.ledgerList}>
            {remainingQueue.map((entry, idx) => (
              <button
                key={entry.item.id}
                type="button"
                className={`${styles.ledgerRow} ${
                  entry.tone === 'bad' || entry.tone === 'warn' ? styles.ledgerRowAlert : ''
                }`}
                onClick={() => openItem(entry.item)}
              >
                <span className={styles.rowIdx}>{String(idx + 1).padStart(2, '0')}</span>
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
                        : styles.stampRiso
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
            <h2 className={styles.secTitle}>Bản đồ 3 Bài</h2>
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
            <h3 className={styles.subTitle}>Bút đỏ lưu ý gần đây</h3>
            {stats.topErrors.length === 0 ? (
              <p className={styles.hint}>
                Chưa có lỗi vấn đáp nào. Khi luyện câu có tranh, các lỗi lặp lại (R0–R11) sẽ được
                khoanh đỏ tại đây.
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

      {/* Offline Quick Search directly on print paper */}
      <section className={styles.flatSection}>
        <div className={styles.secHead}>
          <h2 className={styles.secTitle}>Tra cứu nhanh 107 mục</h2>
          <span className={styles.hint}>Tìm tức thì ngay cả khi ngoại tuyến</span>
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
              description="Thử từ khoá ngắn hơn hoặc chuyển bộ lọc về Tất cả."
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
                  <span className={`${styles.stamp} ${styles.stampRiso}`}>Bài {item.bai}</span>
                </button>
              ))}
            </div>
          )
        ) : null}
      </section>

      {/* Recent mock exam history */}
      {state.examHistory.length > 0 ? (
        <section className={styles.flatSection}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>Lịch sử thi thử gần đây</h2>
            <Button variant="secondary" size="sm" onClick={() => navigate('/exam')}>
              Thi đề mới
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
                  <span className={`${styles.stamp} ${styles.stampRiso}`}>{ex.overallPct}%</span>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
