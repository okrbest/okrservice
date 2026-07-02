import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

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

export function CalloutView({ node, updateAttributes, selected }) {
  const { emoji = '💡', bg = '#eff6ff', border = '#3b82f6' } = node.attrs;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) setShowEmojiPicker(false);
  }, [selected]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <NodeViewWrapper>
      <div style={{ position: 'relative' }}>
        {/* 선택 시 상단에 툴바 표시 */}
        {selected && (
          <div
            contentEditable={false}
            style={{
              position: 'absolute',
              top: '-44px',
              left: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1f2937',
              borderRadius: '8px',
              padding: '6px 10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              zIndex: 50,
              flexWrap: 'wrap',
            }}
          >
            {/* 색상 스와치 */}
            {PRESET_COLORS.map((c) => (
              <button
                key={c.label}
                title={c.label}
                onClick={() => updateAttributes({ bg: c.bg, border: c.border })}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '3px',
                  background: c.bg,
                  border: `2px solid ${c.border}`,
                  cursor: 'pointer',
                  outline: bg === c.bg ? '2px solid #fff' : 'none',
                  outlineOffset: '1px',
                  flexShrink: 0,
                }}
              />
            ))}

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

            {/* 이모지 버튼들 */}
            {PRESET_EMOJIS.map((e) => (
              <button
                key={e === '' ? 'none' : e}
                title={e === '' ? '없음' : e}
                onClick={() => updateAttributes({ emoji: e })}
                style={{
                  fontSize: e === '' ? '10px' : '14px',
                  background: emoji === e ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '1px 4px',
                  lineHeight: 1.4,
                  color: '#d1d5db',
                  minWidth: '22px',
                  textAlign: 'center',
                }}
              >
                {e === '' ? '없음' : e}
              </button>
            ))}
          </div>
        )}

        {/* 콜아웃 본체 */}
        <div
          style={{
            background: bg,
            borderLeft: `4px solid ${border}`,
            borderRadius: '6px',
            padding: '14px 16px',
            margin: '8px 0',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            outline: selected ? `2px solid ${border}` : 'none',
            outlineOffset: '2px',
          }}
        >
          {emoji && (
            <span
              contentEditable={false}
              style={{ fontSize: '20px', flexShrink: 0, lineHeight: 1, userSelect: 'none', paddingTop: '2px' }}
            >
              {emoji}
            </span>
          )}
          <NodeViewContent className="callout-content" style={{ flex: 1, minWidth: 0, margin: 0 }} />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
