import * as React from 'react';
import { SuggestionItem } from '../../intent/suggestions';

interface SuggestionsProps {
  items: SuggestionItem[];
  onSelect: (item: SuggestionItem) => void;
  onClose: () => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({ items, onSelect, onClose }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        background: '#fff',
        border: '1px solid #e0e0f4',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '6px 12px',
          fontSize: '10px',
          color: '#94a3b8',
          borderBottom: '1px solid #f0f0f8',
        }}
      >
        추천단어
      </div>
      {items.map((item) => (
        <button
          key={item.keyword}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onSelect(item);
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '7px 12px',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            fontSize: '13px',
            color: '#374151',
            cursor: 'pointer',
            outline: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#eef2ff';
            (e.currentTarget as HTMLButtonElement).style.color = '#6366f1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
            (e.currentTarget as HTMLButtonElement).style.color = '#374151';
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default Suggestions;
