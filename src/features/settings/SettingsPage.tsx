import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useApp } from '../../app/AppContext';
import { t } from '../../lib/i18n';
import { MAX_LEARNER_NAME_LEN } from '../../lib/sanitize';
import { speakSeq } from '../../speech';
import { exportProgressJson, importProgressJson, type UserSettings } from '../../storage';
import { Banner, Button, Dialog, Icon, SegmentedControl, Select, Switch, useToast } from '../../ui';
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
        <h1 className={styles.title}>Cài đặt</h1>
        <p className={styles.lead}>
          Mọi tuỳ chọn và tiến độ học nằm riêng trên thiết bị này, không đồng bộ lên máy chủ ngoài.
        </p>
      </header>

      <div className={styles.ledger}>
        {/* Learner Name */}
        <section className={styles.rowSection}>
          <div className={styles.rowAside}>
            <h2 className={styles.sectionTitle}>Tên học viên</h2>
            <p className={styles.hint}>
              Thay cho chữ <span lang="ja">「Aさん」</span> khi máy đọc câu hỏi vấn đáp.
            </p>
          </div>
          <div className={styles.rowMain}>
            <div className={styles.field}>
              <label htmlFor={nameInputId} className={styles.label}>
                Tên dùng trong câu hỏi (katakana, hiragana hoặc chữ Latin)
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
                Ví dụ: <span lang="ja">ミン、ナム、ハイ</span>. Tối đa {MAX_LEARNER_NAME_LEN} ký tự
                hợp lệ; ký tự đặc biệt được tự động lọc bỏ.
              </p>
            </div>
            <div className={styles.preview} lang="ja">
              {state.name}さんの おなまえは なんですか。
            </div>
          </div>
        </section>

        {/* Japanese Voice */}
        <section className={styles.rowSection}>
          <div className={styles.rowAside}>
            <h2 className={styles.sectionTitle}>Giọng đọc tiếng Nhật</h2>
            <p className={styles.hint}>Dùng để phát câu hỏi vấn đáp và đọc mẫu đoạn văn.</p>
          </div>
          <div className={styles.rowMain}>
            {voices.length > 0 ? (
              <>
                <Select
                  label="Chọn giọng đọc"
                  value={activeVoice?.voiceURI ?? ''}
                  onChange={(val) => updateSettings({ voiceURI: val })}
                  options={voices.map((v) => ({
                    value: v.voiceURI,
                    label: `${v.name} (${v.lang})`,
                  }))}
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
                  Giọng có chữ Online, Natural hoặc Google thường tự nhiên hơn nhưng sử dụng dịch vụ
                  đọc trực tuyến của hãng trình duyệt (có thể gửi nội dung câu hỏi kèm tên hiển
                  thị). Chọn giọng cục bộ nếu muốn ngoại tuyến hoàn toàn.
                </p>
              </>
            ) : (
              <Banner tone="warn" title="Máy này chưa có giọng đọc tiếng Nhật">
                Em có thể mở bằng Chrome hoặc Edge, hoặc cài thêm gói giọng tiếng Nhật trong cài đặt
                hệ điều hành. Màn hình luyện tập luôn có nút “Hiện chữ câu hỏi” dự phòng.
              </Banner>
            )}
          </div>
        </section>

        {/* Appearance & Typography */}
        <section className={styles.rowSection}>
          <div className={styles.rowAside}>
            <h2 className={styles.sectionTitle}>Giao diện và chữ tiếng Nhật</h2>
            <p className={styles.hint}>Chỉnh nền giấy sáng/tối, phiên âm furigana và cỡ chữ đọc.</p>
          </div>
          <div className={styles.rowMain}>
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
              description="Ẩn hoặc hiện ngay lập tức, tiện khi tự kiểm tra khả năng đọc Hán tự giống phòng thi."
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
          </div>
        </section>

        {/* Voice Privacy & Typing-only Mode */}
        <section className={styles.rowSection}>
          <div className={styles.rowAside}>
            <h2 className={styles.sectionTitle}>Micro và quyền riêng tư</h2>
            <p className={styles.hint}>Quyền thu âm chỉ được xin khi em chủ động bấm nút nói.</p>
          </div>
          <div className={styles.rowMain}>
            <Banner tone="info" title="Minh bạch về nhận dạng giọng nói">
              {t('speechPrivacyNotice')}
            </Banner>
            <Switch
              label="Chế độ chỉ gõ (ẩn nút micro)"
              description="Phù hợp khi luyện nơi yên tĩnh, ngoại tuyến hoàn toàn hoặc muốn gõ trực tiếp Kana và Romaji."
              checked={state.settings.typingOnly}
              onChange={(typingOnly) => updateSettings({ typingOnly })}
            />
          </div>
        </section>

        {/* Backup & Restore */}
        <section className={styles.rowSection}>
          <div className={styles.rowAside}>
            <h2 className={styles.sectionTitle}>Sao lưu và khôi phục</h2>
            <p className={styles.hint}>
              Chuyển tiến độ sang thiết bị khác bằng tệp sao lưu an toàn.
            </p>
          </div>
          <div className={styles.rowMain}>
            <p className={styles.hint}>
              Tệp xuất ra kèm mã kiểm tra toàn vẹn SHA-256. Khi nhập vào, ứng dụng kiểm tra đúng cấu
              trúc và giới hạn dung lượng tối đa 1 MB.
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
          </div>
        </section>

        {/* Optional Third-Party Promo Toggle (Default OFF) */}
        <section className={styles.rowSection}>
          <div className={styles.rowAside}>
            <h2 className={styles.sectionTitle}>Tài liệu bên thứ ba</h2>
            <p className={styles.hint}>Tắt mặc định để giữ không gian ôn tập yên tĩnh.</p>
          </div>
          <div className={styles.rowMain}>
            <Switch
              label="Hiển thị gợi ý luyện thêm từ JPDspeak (mặc định tắt)"
              description="Khi bật, màn kết quả sẽ hiển thị liên kết ngoài tới manabiman.io.vn và mở trong tab mới."
              checked={state.settings.showPromo}
              onChange={(showPromo) => updateSettings({ showPromo })}
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section className={`${styles.rowSection} ${styles.dangerSection}`}>
          <div className={styles.rowAside}>
            <h2 className={styles.sectionTitle}>Xoá toàn bộ dữ liệu</h2>
            <p className={styles.hint}>
              Hành động này xoá sạch tiến độ trên thiết bị và không thể hoàn tác.
            </p>
          </div>
          <div className={styles.rowMain}>
            <p className={styles.hint}>
              Xoá toàn bộ lịch sử luyện đọc, vấn đáp, chuỗi ngày học và bản nhớ ngoại tuyến trên
              trình duyệt này.
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
          </div>
        </section>
      </div>

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
