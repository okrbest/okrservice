import * as React from 'react';
import { chatbotTheme } from '../chatbotTheme';
import type { OrgChartData } from '../vizRenderers';

export default function OrgChartTree({
  data,
}: {
  data: OrgChartData;
}): React.ReactElement {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 4px',
      }}
    >
      <div
        style={{
          padding: '8px 16px',
          borderRadius: chatbotTheme.radius.lg,
          background: chatbotTheme.color.accentSoft,
          border: `1px solid ${chatbotTheme.color.accent}`,
          color: chatbotTheme.color.foreground,
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {data.root}
      </div>
      <div
        style={{ width: 2, height: 16, background: chatbotTheme.color.border }}
      />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px 16px',
          width: '100%',
          paddingTop: 12,
          borderTop: `2px solid ${chatbotTheme.color.border}`,
        }}
      >
        {data.members.map((m, i) => (
          <div
            key={`${m.name}-${i}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              minWidth: 88,
              padding: '8px 12px',
              borderRadius: chatbotTheme.radius.md,
              background: chatbotTheme.color.card,
              border: `1px solid ${
                hoveredIndex === i
                  ? chatbotTheme.color.accent
                  : chatbotTheme.color.border
              }`,
              boxShadow:
                hoveredIndex === i ? chatbotTheme.shadow.subtle : 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: chatbotTheme.color.cardForeground,
              }}
            >
              {m.name}
            </div>
            {m.title ? (
              <div
                style={{
                  fontSize: 11,
                  color: chatbotTheme.color.mutedForeground,
                  marginTop: 2,
                }}
              >
                {m.title}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
