import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import {
  Banner,
  Button,
  Card,
  Dialog,
  DiffText,
  EmptyState,
  FeedbackLadder,
  Icon,
  MicButton,
  ProgressBar,
  QuestionCard,
  Ruby,
  ScoreRing,
  SegmentedControl,
  Select,
  Skeleton,
  SkeletonGrid,
  Switch,
  Tabs,
  useToast,
  type MicState,
} from '../../ui';
import styles from './KitchenSinkPage.module.css';

export function KitchenSinkPage() {
  const { pushToast } = useToast();
  const { state, resolvedTheme, updateSettings } = useApp();
  const [bai, setBai] = useState<number>(1);
  const [tab, setTab] = useState<'rand' | 'pic' | 'free'>('pic');
  const [micState, setMicState] = useState<MicState>('idle');
  const [voice, setVoice] = useState('ja-JP-Nanami');
  const [dialogOpen, setDialogOpen] = useState(false);

  const dark = resolvedTheme === 'dark';
  const furigana = state.settings.furigana;

  const toggleTheme = () => {
    updateSettings({ theme: dark ? 'light' : 'dark' });
  };

  const toggleFurigana = (checked: boolean) => {
    updateSettings({ furigana: checked });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>JPD113 Design System · Washi &amp; Sumi</p>
          <h1 className={styles.h1}>Sổ tay luyện thi — Thư viện thành phần</h1>
        </div>
        <div className={styles.row}>
          <Button
            variant="secondary"
            icon={<Icon name={dark ? 'sun' : 'moon'} size={18} />}
            onClick={toggleTheme}
          >
            {dark ? 'Chế độ sáng' : 'Chế độ tối'}
          </Button>
          <Button variant="primary" onClick={() => pushToast('Đã lưu thiết lập mẫu', 'good')}>
            Thử Toast
          </Button>
        </div>
      </header>

      <Card ruled className={styles.section}>
        <h2 className={styles.sectionTitle}>Nút bấm &amp; micro</h2>
        <div className={styles.row}>
          <Button variant="primary" icon={<Icon name="speaker" size={18} />}>
            Nghe câu hỏi
          </Button>
          <Button variant="secondary">Nói lại câu này</Button>
          <Button variant="ghost" icon={<Icon name="arrow-left" size={18} />}>
            Về danh sách
          </Button>
          <Button variant="danger" icon={<Icon name="trash" size={18} />}>
            Xoá dữ liệu
          </Button>
          <Button variant="primary" loading>
            Đang chấm
          </Button>
        </div>
        <div className={styles.row}>
          <MicButton
            state={micState}
            onClick={() =>
              setMicState((prev) =>
                prev === 'idle' ? 'listening' : prev === 'listening' ? 'idle' : 'idle',
              )
            }
          />
          <MicButton state="listening" onClick={() => setMicState('idle')} />
          <MicButton state="error" onClick={() => undefined} />
        </div>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Điều hướng Bài &amp; Tab</h2>
        <SegmentedControl
          ariaLabel="Chọn Bài"
          value={bai}
          onChange={setBai}
          options={[
            { value: 1, label: 'Bài 1' },
            { value: 2, label: 'Bài 2' },
            { value: 3, label: 'Bài 3' },
          ]}
        />
        <Tabs
          ariaLabel="Loại câu hỏi vấn đáp"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'rand', label: 'Ngẫu nhiên' },
            { value: 'pic', label: 'Có tranh', count: 10 },
            { value: 'free', label: 'Không tranh', count: 7 },
          ]}
        />
        <ProgressBar value={12} max={17} label="Bài 1: đã luyện 12/17 câu" valueLabel="71%" />
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Thẻ câu hỏi &amp; vòng điểm</h2>
        <div className={styles.row}>
          <ScoreRing value={15} max={15} label="Rất tốt" sublabel="Trọn điểm câu hỏi" />
          <ScoreRing value={12} max={15} label="Khá ổn" sublabel="Cần sửa nhỏ 1 lỗi" />
          <ScoreRing value={55} max={100} label="Cần chỉnh thêm" sublabel="Điểm luyện đọc" />
        </div>
        <div className={styles.grid}>
          <QuestionCard
            indexLabel="Câu 1"
            tag="Có tranh"
            title="Hỏi nước (おくには どちらですか)"
            statusText="Tốt nhất 100% · 3 lần"
            statusTone="good"
            done
            mastered
            onClick={() => undefined}
          />
          <QuestionCard
            indexLabel="Câu 2"
            tag="Có tranh"
            title="Hỏi nghề (おしごとは なんですか)"
            statusText="Tốt nhất 80% · 1 lần"
            statusTone="warn"
            done
            onClick={() => undefined}
          />
          <QuestionCard
            indexLabel="Đoạn 1"
            tag="Bài 1"
            title="かぞくの しごとです。ちちは 52才の…"
            titleLang="ja"
            statusText="Chưa luyện"
            statusTone="new"
            onClick={() => undefined}
          />
        </div>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Chữ Nhật, Furigana &amp; DiffText</h2>
        <Switch
          label="Hiển thị Furigana"
          description="Ẩn/hiện chữ đọc nhỏ trên đầu chữ Hán bằng CSS, không render lại."
          checked={furigana}
          onChange={toggleFurigana}
        />
        <p className="jp-reading" lang="ja">
          ちちは <Ruby base="52才" reading="ごじゅうにさい" variant="han" /> の パイロットです。
          <Ruby base="日本語" reading="にほんご" variant="han" /> の きょうしです。
        </p>
        <DiffText
          showLegend
          tokens={[
            { type: 'match', text: 'かぞくのしごとです。ちちはごじゅう' },
            { type: 'missing', text: 'に' },
            { type: 'match', text: 'さいの' },
            { type: 'wrong', text: 'ぱいろと' },
            { type: 'extra', text: 'です' },
            { type: 'match', text: 'です。' },
          ]}
        />
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Bậc lỗi R0–R11 (FeedbackLadder)</h2>
        <FeedbackLadder
          entries={[
            {
              id: 'r11',
              code: 'R11',
              penalty: '−3 điểm',
              why: 'Nói quốc tịch (～じん) thay vì tên nước',
              sample: 'ロシアじんです。',
              hint: 'Hỏi おくに → nói TÊN NƯỚC (ロシアです), không thêm じん.',
              active: true,
            },
            {
              id: 'r4',
              code: 'R4',
              penalty: '−3 điểm',
              why: 'Câu cụt: thiếu です／ます',
              sample: 'ロシア。',
              hint: 'Thêm です hoặc ます ở cuối câu.',
            },
          ]}
        />
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Thông báo, Biểu mẫu, Hộp thoại &amp; Trạng thái</h2>
        <div className={styles.stack}>
          <Banner tone="warn" title="Đang mở trong trình duyệt ứng dụng">
            Micro thường bị chặn trong Zalo/Facebook. Hãy mở bằng Chrome hoặc Safari.
          </Banner>
          <Banner tone="info" title="Đang ở chế độ ngoại tuyến">
            Mọi bài đọc và câu hỏi đã được lưu sẵn trên máy.
          </Banner>
          <Select
            label="Giọng đọc tiếng Nhật"
            value={voice}
            onChange={setVoice}
            options={[
              { value: 'ja-JP-Nanami', label: 'Microsoft Nanami Online (Natural)' },
              { value: 'Google-ja-JP', label: 'Google 日本語' },
            ]}
          />
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Mở hộp thoại xác nhận
            </Button>
          </div>
          <EmptyState
            icon="search"
            title="Chưa tìm thấy câu hỏi phù hợp"
            description="Thử tìm bằng từ khoá khác hoặc xoá bộ lọc hiện tại."
            action={<Button variant="secondary">Xoá bộ lọc</Button>}
          />
          <div className={styles.stack}>
            <Skeleton variant="title" />
            <SkeletonGrid count={3} />
          </div>
        </div>
      </Card>

      <Dialog
        open={dialogOpen}
        title="Xoá toàn bộ tiến độ?"
        onClose={() => setDialogOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              Xác nhận xoá
            </Button>
          </>
        }
      >
        <p>Thao tác này sẽ xoá điểm luyện tập đã lưu trên máy. Em có thể xuất bản sao lưu trước.</p>
      </Dialog>
    </div>
  );
}
