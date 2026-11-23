import { useState, type MouseEvent, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { t } from '../lib/i18n';
import { Banner, Button, Icon, type IconName } from '../ui';
import { useApp } from './AppContext';
import styles from './AppShell.module.css';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: IconName;
  readonly end?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: t('navDashboard'), icon: 'chart', end: true },
  { to: '/read', label: t('navRead'), icon: 'book' },
  { to: '/qa', label: t('navQa'), icon: 'chat' },
  { to: '/exam', label: t('navExam'), icon: 'clock' },
  { to: '/settings', label: t('navSettings'), icon: 'settings' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const {
    state,
    resolvedTheme,
    isOffline,
    storageWarning,
    pwaUpdate,
    capabilities,
    updateSettings,
  } = useApp();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleSkipToMain = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
      main.scrollIntoView();
    }
  };

  const toggleTheme = () => {
    updateSettings({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' });
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
    } catch {
      setCopiedUrl(false);
    }
  };

  return (
    <div className={styles.shell}>
      <a href="#main-content" className="skip-link" onClick={handleSkipToMain}>
        {t('skipToMain')}
      </a>

      {/* Desktop Sidebar */}
      <aside className={styles.sidebar} aria-label="Điều hướng chính">
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            113
            <span className={styles.brandDot} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>JPD113 Speaking</span>
            <span className={styles.brandSub}>Sổ tay luyện thi nói</span>
          </span>
        </Link>

        <nav className={styles.sideNav} aria-label="Các phần luyện">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [styles.sideLink, isActive ? styles.sideLinkActive : ''].filter(Boolean).join(' ')
              }
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sideFoot}>
          <div className={styles.learnerPill}>
            <span>Học viên</span>
            <span className={styles.learnerName} lang="ja">
              {state.name}さん
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            icon={<Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={18} />}
            onClick={toggleTheme}
          >
            {resolvedTheme === 'dark' ? 'Chuyển nền sáng' : 'Chuyển nền tối'}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className={styles.mobileHeader}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            113
            <span className={styles.brandDot} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>JPD113</span>
            <span className={styles.brandSub}>Ôn thi nói</span>
          </span>
        </Link>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={
              resolvedTheme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
            }
            onClick={toggleTheme}
          >
            <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.contentWrap}>
        <div className={styles.banners}>
          {pwaUpdate ? (
            <Banner
              tone="info"
              title="Đã có phiên bản mới"
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Icon name="refresh" size={16} />}
                  onClick={pwaUpdate.applyUpdate}
                >
                  Cập nhật ngay
                </Button>
              }
            >
              Bản cập nhật đã tải xong trong nền. Bấm cập nhật để áp dụng ngay.
            </Banner>
          ) : null}

          {storageWarning ? (
            <Banner tone="warn" title="Không thể lưu tiến độ vào trình duyệt">
              Trình duyệt đang ở chế độ ẩn danh bị hạn chế hoặc bộ nhớ cục bộ đã đầy. Em nên xuất
              tệp sao lưu (.json) trong mục Cài đặt để tránh mất tiến độ.
            </Banner>
          ) : null}

          {isOffline ? (
            <Banner tone="info" title={t('offlineTitle')}>
              {t('offlineBody')}
            </Banner>
          ) : null}

          {capabilities.inAppBrowser ? (
            <Banner
              tone="warn"
              title="Em đang mở trang trong ứng dụng (Zalo, Facebook, Messenger…)"
              actions={
                <Button variant="secondary" size="sm" onClick={copyCurrentUrl}>
                  {copiedUrl ? 'Đã sao chép — dán vào Chrome/Safari' : 'Sao chép địa chỉ trang'}
                </Button>
              }
            >
              Micro thường bị chặn trong trình duyệt của ứng dụng. Hãy bấm biểu tượng ⋯ rồi chọn “Mở
              bằng Chrome/Safari”, hoặc gõ trực tiếp bằng Romaji.
            </Banner>
          ) : null}

          {capabilities.isMobile &&
          !capabilities.inAppBrowser &&
          !state.settings.pcBannerDismissed ? (
            <Banner tone="info" onDismiss={() => updateSettings({ pcBannerDismissed: true })}>
              Nên dùng <strong>máy tính (Chrome hoặc Edge)</strong> để micro nhận giọng tiếng Nhật
              ổn định nhất. Trên điện thoại em vẫn luyện bình thường bằng micro bàn phím hoặc gõ
              Romaji.
            </Banner>
          ) : null}
        </div>

        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className={styles.bottomNav} aria-label="Điều hướng đáy">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [styles.bottomLink, isActive ? styles.bottomLinkActive : ''].filter(Boolean).join(' ')
            }
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
