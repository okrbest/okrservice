import React, { useState } from 'react';

const PRESET_COLORS = [
  { label: '기본', bg: '#F1F1EF', border: '#9B9A97' },
  { label: '갈색', bg: '#F4EEEE', border: '#64473A' },
  { label: '주황', bg: '#FBECDD', border: '#D9730D' },
  { label: '노랑', bg: '#FBF3DB', border: '#DFAB01' },
  { label: '초록', bg: '#EDF3EC', border: '#0F7B6C' },
  { label: '파랑', bg: '#E7F3F8', border: '#0B6E99' },
  { label: '보라', bg: '#F4F0F7', border: '#6940A5' },
  { label: '분홍', bg: '#F9EEF3', border: '#AD1A72' },
  { label: '빨강', bg: '#FDEBEC', border: '#E03E3E' },
];

const PRESET_EMOJIS = ['', '💡', '⚠️', '✅', '🔥', '📌', '📝', '🎯', '💬', '🚀', '❗'];

type Props = {
  onInsert: (attrs: { emoji: string; bg: string; border: string }) => void;
  onCancel: () => void;
};

export function CalloutPicker({ onInsert, onCancel }: Props) {
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('💡');

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        padding: '16px',
        width: '260px',
        fontFamily: 'inherit',
      }}
    >
      {/* 미리보기 */}
      <div
        style={{
          background: selectedColor.bg,
          borderLeft: `4px solid ${selectedColor.border}`,
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#374151',
        }}
      >
        {selectedEmoji && <span style={{ fontSize: '18px' }}>{selectedEmoji}</span>}
        <span style={{ color: '#9ca3af' }}>콜아웃 내용을 입력하세요</span>
      </div>

      {/* 배경색 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
          배경색
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c.label}
              title={c.label}
              onClick={() => setSelectedColor(c)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: c.bg,
                border: `2px solid ${c.border}`,
                cursor: 'pointer',
                outline: selectedColor.bg === c.bg ? '2px solid #374151' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>

      {/* 이모지 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
          이모지
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {PRESET_EMOJIS.map((e) => (
            <button
              key={e === '' ? 'none' : e}
              onClick={() => setSelectedEmoji(e)}
              title={e === '' ? '없음' : e}
              style={{
                fontSize: e === '' ? '11px' : '18px',
                background: selectedEmoji === e ? '#f3f4f6' : 'transparent',
                border: selectedEmoji === e ? '1px solid #d1d5db' : '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '2px 5px',
                lineHeight: 1.4,
                color: '#9ca3af',
                minWidth: '28px',
                textAlign: 'center',
              }}
            >
              {e === '' ? '없음' : e}
            </button>
          ))}
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onInsert({ emoji: selectedEmoji, bg: selectedColor.bg, border: selectedColor.border })}
          style={{
            flex: 1,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          삽입
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}
