import { useId } from 'react';
import { useApp } from '../../app/AppContext';
import { speakSeq } from '../../speech';
import { Button, Icon } from '../../ui';
import styles from './VoiceQuickBar.module.css';

export function VoiceQuickBar() {
  const { voices, activeVoice, state, updateSettings } = useApp();
  const id = useId();

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <label htmlFor={id} className={styles.label}>
          Giọng đọc tiếng Nhật
        </label>
        {voices.length > 0 ? (
          <>
            <select
              id={id}
              className={styles.select}
              value={activeVoice?.voiceURI ?? ''}
              onChange={(e) => updateSettings({ voiceURI: e.target.value })}
              aria-label="Chọn giọng đọc tiếng Nhật"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon name="speaker" size={16} />}
              onClick={() =>
                speakSeq(['はじめまして。わたしは たなかです。', 'おなまえは なんですか？'], {
                  voiceURI: activeVoice?.voiceURI ?? state.settings.voiceURI,
                })
              }
            >
              Nghe thử
            </Button>
          </>
        ) : null}
      </div>
      <p className={styles.hint}>
        {voices.length > 0
          ? 'Giọng có chữ Online, Natural hoặc Google thường tự nhiên hơn. Chrome và Edge thường có giọng tốt nhất.'
          : 'Máy này chưa có giọng tiếng Nhật. Em mở bằng Chrome hoặc Edge, hoặc cài thêm giọng tiếng Nhật trong cài đặt máy. Phần câu hỏi luôn có nút “Hiện chữ”.'}
      </p>
    </div>
  );
}
