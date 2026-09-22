/**
 * HR 챗봇 위젯 디자인 토큰 — 구조/레이아웃은 실제 사내 AI 어시스턴트(kiwibox 내장,
 * cmmAiAssistantPanel.jsp/.cmm-ai-* 클래스: 양쪽 말풍선 배경, 아바타 없음, 그래프도
 * 액센트 하나로 통일)를 그대로 따르되, 액센트 색상만 사용자 지정으로 보라 계열
 * 유지(#6366f1/#a78bfa — 이전 okrservice 위젯이 쓰던 색).
 */

export const chatbotTheme = {
  color: {
    background: '#ffffff',
    foreground: '#2b2f36',
    // 대화 스레드 바탕 — 참고 UI의 .cmm-ai-thread 배경
    threadBackground: '#f7f9fc',
    card: '#ffffff',
    cardForeground: '#2b2f36',
    muted: '#f1f4fb',
    mutedForeground: '#8a90a0',
    border: '#e4e8f0',
    input: '#e1e5ee',
    // 단일 보라 액센트 — 유저 말풍선/전송 버튼/링크/포커스링/그래프까지 전부 이 색 하나
    accent: '#6366f1',
    accent2: '#a78bfa',
    accentSoft: '#eef0fd',
    accentForeground: '#ffffff',
    destructive: '#b3261e',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    bubble: '16px',
  },
  shadow: {
    subtle: '0 1px 2px rgba(20, 30, 60, 0.05)',
  },
  font: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: 'Consolas, monospace',
  },
  // recharts — 액센트 하나의 투명도만 다르게 써서 시리즈를 구분한다(색상만 보라로 교체).
  chartAccent: '#6366f1',
  chartPalette: [
    'rgba(99, 102, 241, 0.85)',
    'rgba(99, 102, 241, 0.6)',
    'rgba(99, 102, 241, 0.4)',
    'rgba(99, 102, 241, 0.25)',
  ],
  // 근무현황 막대 전용 — 상태 의미를 색으로 구분한다(정상/경고/위험).
  // 휴가·출장·교육 등 정보성 항목과 매칭 안 되는 라벨은 chartAccent로 폴백.
  status: {
    good: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
  },
} as const;
