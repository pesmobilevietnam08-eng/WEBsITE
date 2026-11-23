import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useApp } from '../../app/AppContext';
import { t } from '../../lib/i18n';
import { MAX_LEARNER_NAME_LEN } from '../../lib/sanitize';
import { speakSeq } from '../../speech';
import { exportProgressJson, importProgressJson, type UserSettings } from '../../storage';
import {
  Banner,
  Button,
  Card,
  Dialog,
  Icon,
  SegmentedControl,
  Select,
  Switch,
  useToast,
} from '../../ui';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { state, voices, activeVoice, setName, updateSettings, replaceState, resetAllData } =
    useApp();
  const { pushToast } = useToast();

  const nameInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nameDraft, setNameDraft] = useState(state.name);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSaveName = () => {
    setName(nameDraft);
    pushToast('Đã lưu tên hiển thị.', 'good');
  };

  const handleTestVoice = () => {
    const ok = speakSeq(['はじめまして。わたしは たなかです。', 'おなまえは なんですか？'], {
      voiceURI: activeVoice?.voiceURI ?? state.settings.voiceURI,
    });
    if (!ok) {
      pushToast('Trình duyệt hiện tại không hỗ trợ phát giọng nói.', 'bad');
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportProgressJson(state);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jpd113-progress-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast('Đã xuất tệp sao lưu tiến độ kèm mã kiểm tra SHA-256.', 'good');
    } catch {
      pushToast('Không thể xuất tệp tiến độ lúc này.', 'bad');
    }
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 1_048_576) {
      setImportError('Tệp vượt quá giới hạn an toàn 1 MB.');
      return;
    }

    try {
      const text = await file.text();
      const result = await importProgressJson(text);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      replaceState(result.data);
      setNameDraft(result.data.name);
      pushToast('Đã khôi phục tiến độ học tập thành công.', 'good');
    } catch {
      setImportError('Không thể đọc tệp đã chọn.');
    }
  };

  const handleConfirmClear = async () => {
    setClearing(true);
    try {
      await resetAllData();
      setNameDraft('ミン');
      setConfirmClearOpen(false);
      pushToast('Đã xoá toàn bộ dữ liệu và bộ nhớ đệm trên máy.', 'good');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Thiết lập cá nhân &amp; quyền riêng tư</p>
        <h1 className={styles.title}>Cài đặt</h1>
        <p className={styles.lead}>
          Mọi tuỳ chọn và tiến độ học được lưu cục bộ trên máy này, không gửi lên máy chủ.
        </p>
      </header>

      {/* Learner Name */}
      <Card ruled className={styles.section}>
        <h2 className={styles.sectionTitle}>Tên học viên</h2>
        <div className={styles.field}>
          <label htmlFor={nameInputId} className={styles.label}>
            Tên dùng trong câu hỏi có 「Aさん」 (katakana, hiragana hoặc chữ Latin)
          </label>
          <div className={styles.inputRow}>
            <input
              id={nameInputId}
              className={styles.input}
              value={nameDraft}
              maxLength={MAX_LEARNER_NAME_LEN * 2}
              autoComplete="off"
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => setName(nameDraft)}
            />
            <Button variant="primary" onClick={handleSaveName}>
              Lưu tên
            </Button>
          </div>
          <p className={styles.hint}>
            Ví dụ: ミン、ナム、ハイ. Tối đa {MAX_LEARNER_NAME_LEN} ký tự hợp lệ; ký tự đặc biệt sẽ
            tự động loại bỏ để bảo vệ an toàn.
          </p>
        </div>
        <div className={styles.preview} lang="ja">
          {state.name}さんの おなまえは なんですか。
        </div>
      </Card>

      {/* Japanese Voice */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Giọng đọc tiếng Nhật (TTS)</h2>
        {voices.length > 0 ? (
          <>
            <Select
              label="Chọn giọng đọc"
              value={activeVoice?.voiceURI ?? ''}
              onChange={(val) => updateSettings({ voiceURI: val })}
              options={voices.map((v) => ({ value: v.voiceURI, label: `${v.name} (${v.lang})` }))}
            />
            <div className={styles.row}>
              <Button
                variant="secondary"
                icon={<Icon name="speaker" size={18} />}
                onClick={handleTestVoice}
              >
                Nghe thử giọng đọc
              </Button>
            </div>
            <p className={styles.hint}>
              Nếu giọng nghe còn máy móc, thử chọn giọng khác. Giọng có chữ Online, Natural hoặc
              Google thường tự nhiên hơn. Chrome và Edge thường có giọng tốt nhất.
            </p>
          </>
        ) : (
          <Banner tone="warn" title="Máy này chưa có giọng đọc tiếng Nhật">
            Em có thể mở bằng Chrome hoặc Edge, hoặc cài thêm gói giọng tiếng Nhật trong cài đặt hệ
            điều hành. Màn hình luyện tập luôn có nút “Hiện chữ câu hỏi” dự phòng.
          </Banner>
        )}
      </Card>

      {/* Appearance & Typography */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Giao diện &amp; chữ tiếng Nhật</h2>
        <div className={styles.field}>
          <span className={styles.label}>Chủ đề màu sắc</span>
          <SegmentedControl<UserSettings['theme']>
            ariaLabel="Chọn chủ đề màu sắc"
            value={state.settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'system', label: 'Theo máy' },
              { value: 'light', label: 'Sáng (Washi)' },
              { value: 'dark', label: 'Tối (Sumi)' },
            ]}
          />
        </div>
        <hr className={styles.divider} />
        <Switch
          label="Hiển thị Furigana (cách đọc nhỏ trên chữ Hán)"
          description="Bật/tắt tức thì bằng CSS, tiện khi muốn tự kiểm tra khả năng đọc Hán tự."
          checked={state.settings.furigana}
          onChange={(furigana) => updateSettings({ furigana })}
        />
        <hr className={styles.divider} />
        <div className={styles.field}>
          <span className={styles.label}>Cỡ chữ tiếng Nhật</span>
          <SegmentedControl<UserSettings['jpFontSize']>
            ariaLabel="Chọn cỡ chữ tiếng Nhật"
            value={state.settings.jpFontSize}
            onChange={(jpFontSize) => updateSettings({ jpFontSize })}
            options={[
              { value: 'sm', label: 'Nhỏ' },
              { value: 'md', label: 'Vừa' },
              { value: 'lg', label: 'Lớn' },
              { value: 'xl', label: 'Rất lớn' },
            ]}
          />
        </div>
      </Card>

      {/* Voice Privacy & Typing-only Mode */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Micro &amp; quyền riêng tư giọng nói</h2>
        <Banner tone="info" title="Minh bạch về nhận dạng giọng nói">
          {t('speechPrivacyNotice')}
        </Banner>
        <Switch
          label="Chế độ chỉ gõ (tắt nút micro trình duyệt)"
          description="Phù hợp khi dùng nơi yên tĩnh, ngoại tuyến hoàn toàn, hoặc muốn gõ trực tiếp Kana/Romaji."
          checked={state.settings.typingOnly}
          onChange={(typingOnly) => updateSettings({ typingOnly })}
        />
      </Card>

      {/* Backup & Restore */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Sao lưu &amp; khôi phục tiến độ</h2>
        <p className={styles.hint}>
          Xuất tiến độ ra tệp JSON có mã kiểm tra toàn vẹn SHA-256 để chuyển sang thiết bị khác. Tệp
          nhập vào được kiểm tra cấu trúc chặt chẽ và giới hạn dung lượng 1 MB.
        </p>
        <div className={styles.row}>
          <Button
            variant="secondary"
            icon={<Icon name="download" size={18} />}
            onClick={handleExport}
          >
            Xuất tiến độ (.json)
          </Button>
          <Button
            variant="secondary"
            icon={<Icon name="upload" size={18} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Nhập tiến độ (.json)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Chọn tệp JSON sao lưu tiến độ"
            className={styles.fileInput}
            onChange={handleImportFile}
          />
        </div>
        {importError ? (
          <Banner tone="danger" role="alert" title="Không thể nhập tệp tiến độ">
            {importError}
          </Banner>
        ) : null}
      </Card>

      {/* Optional Third-Party Promo Toggle (Default OFF) */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Liên kết tài liệu bên thứ ba</h2>
        <Switch
          label="Hiển thị gợi ý luyện thêm từ JPDspeak (mặc định tắt)"
          description="Nếu bật, màn kết quả sẽ hiển thị thẻ liên kết ngoài tới manabiman.io.vn. Mọi liên kết ngoài đều mở tab mới an toàn."
          checked={state.settings.showPromo}
          onChange={(showPromo) => updateSettings({ showPromo })}
        />
      </Card>

      {/* Danger Zone */}
      <Card className={`${styles.section} ${styles.dangerCard}`}>
        <h2 className={styles.sectionTitle}>Xoá toàn bộ dữ liệu trên máy</h2>
        <p className={styles.hint}>
          Xoá sạch lịch sử luyện tập, tiến độ lưu trong localStorage và bộ nhớ đệm ngoại tuyến
          (Service Worker cache). Hành động này không thể hoàn tác.
        </p>
        <div className={styles.row}>
          <Button
            variant="danger"
            icon={<Icon name="trash" size={18} />}
            onClick={() => setConfirmClearOpen(true)}
          >
            Xoá toàn bộ dữ liệu
          </Button>
        </div>
      </Card>

      <Dialog
        open={confirmClearOpen}
        title="Xác nhận xoá toàn bộ dữ liệu?"
        onClose={() => setConfirmClearOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClearOpen(false)}>
              Huỷ
            </Button>
            <Button variant="danger" loading={clearing} onClick={handleConfirmClear}>
              Xoá vĩnh viễn
            </Button>
          </>
        }
      >
        <p>
          Toàn bộ điểm luyện đọc, vấn đáp, chuỗi ngày luyện tập và cài đặt trên máy này sẽ bị xoá.
          Nếu muốn giữ lại, em hãy bấm Huỷ và xuất tệp sao lưu trước.
        </p>
      </Dialog>
    </div>
  );
}
