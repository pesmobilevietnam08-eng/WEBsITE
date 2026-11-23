import { t } from '../../lib/i18n';
import { Button, Dialog } from '../../ui';

export interface VoiceConsentDialogProps {
  open: boolean;
  onAccept: () => void;
  onUseTypingOnly: () => void;
  onClose: () => void;
}

export function VoiceConsentDialog({
  open,
  onAccept,
  onUseTypingOnly,
  onClose,
}: VoiceConsentDialogProps) {
  return (
    <Dialog
      open={open}
      title="Cho phép sử dụng micro nhận giọng?"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onUseTypingOnly}>
            Chỉ dùng bàn phím
          </Button>
          <Button variant="primary" onClick={onAccept}>
            Hiểu rõ &amp; bật micro
          </Button>
        </>
      }
    >
      <p>{t('speechPrivacyNotice')}</p>
      <p>
        Sau khi bấm đồng ý, trình duyệt sẽ hỏi quyền truy cập micro cho trang này. Em vẫn có thể
        chỉnh sửa chữ nhận được trước khi bấm chấm điểm.
      </p>
    </Dialog>
  );
}
