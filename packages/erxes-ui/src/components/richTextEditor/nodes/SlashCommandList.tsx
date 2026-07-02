import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { SuggestionProps } from '@tiptap/suggestion';

export type SlashCommandItem = {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: any; range: any }) => void;
};

export type SlashCommandListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

const styles = {
  list: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: '6px',
    minWidth: '260px',
    maxHeight: '360px',
    overflowY: 'auto' as const,
    fontFamily: 'inherit',
  },
  item: (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    background: selected ? '#f3f4f6' : 'transparent',
    border: 'none',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left',
  }),
  icon: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: '#374151',
    flexShrink: 0,
  } as React.CSSProperties,
  title: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  } as React.CSSProperties,
  desc: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '1px',
  } as React.CSSProperties,
};

export const SlashCommandList = forwardRef<
  SlashCommandListRef,
  SuggestionProps<SlashCommandItem>
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) return null;

  return (
    <div style={styles.list}>
      {items.map((item, index) => (
        <button
          key={item.title}
          style={styles.item(index === selectedIndex)}
          onClick={() => selectItem(index)}
        >
          <span style={styles.icon}>{item.icon}</span>
          <div>
            <div style={styles.title}>{item.title}</div>
            <div style={styles.desc}>{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';
