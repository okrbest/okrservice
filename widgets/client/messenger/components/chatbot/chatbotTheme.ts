/**
 * HR 챗봇 위젯 디자인 토큰 — 사내 관리자용 AI 어시스턴트(option.insapien.co.kr)의
 * shadcn/ui zinc 팔레트를 참고해 라이트 테마로 이식.
 * (다크모드·레이아웃 구조는 그대로 두고 색상·타이포·라운드값만 교체)
 */

export const chatbotTheme = {
  color: {
    background: '#ffffff',
    foreground: '#09090b',
    card: '#ffffff',
    cardForeground: '#09090b',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    border: '#e4e4e7',
    input: '#d4d4d8',
    primary: '#18181b',
    primaryForeground: '#fafafa',
    secondary: '#f4f4f5',
    secondaryForeground: '#18181b',
    accent: '#f4f4f5',
    accentForeground: '#18181b',
    destructive: '#dc2626',
    ring: '#a1a1aa',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    pill: '20px',
  },
  shadow: {
    subtle: '0 1px 2px rgba(0, 0, 0, 0.04)',
  },
  font: {
    sans: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  },
  // Chart.js/Mermaid — UI 크롬(말풍선·표·코드블록)은 무채색으로 통일했지만
  // 그래프는 가독성·구분감을 위해 기존 컬러 아이덴티티(인디고/보라 계열) 유지.
  // 급여추세처럼 다중 시리즈가 필요한 경우 순서대로 순환.
  chartPalette: ['#7c7ee0', '#f59e0b', '#10b981', '#ef4444'],
  chartAccent: '#7c7ee0',
} as const;
