import * as React from 'react';
import Container from '../common/Container';
import { CHATBOT_MENUS, CHATBOT_MENU_CATEGORIES } from './chatbotMenus';
import { useRouter } from '../../context/Router';
import { getColor } from '../../utils/util';
import { useChatbotMessages } from './useChatbotMessages';
import { useRpaMessages } from '../../context/RpaMessage';
import { buildHrUrl } from './getHrBaseUrl';
import {
  useChatbotButtonMessages,
  ChatbotButtonCardMessage,
} from '../../context/ChatbotButtonMessages';
import { resolveRpaButtons } from './rpaButtons';
import { ScheduledMessage } from './chatbotMessages';
import { RpaMessageItem } from '../../context/RpaMessage';
import { streamChat } from './teamplgpt';
import { useChatbotKeywordSuggestions } from './useChatbotKeywordSuggestions';
import ChatbotSuggestions from './ChatbotSuggestions';
import { dispatchViz, VizBlockRenderer } from './vizRenderers';
import { chatbotTheme } from './chatbotTheme';

const T = chatbotTheme;
import {
  AiMessage,
  getActiveSessionId,
  startNewSession,
  loadMessages,
  saveMessages,
  upsertIndexEntry,
} from './chatHistory';

const DIVIDER_STYLE: React.CSSProperties = {
  height: '1px',
  background: T.color.border,
  margin: '10px 0',
};

const CARD_BASE_STYLE: React.CSSProperties = {
  background: T.color.card,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: T.color.border,
  borderRadius: T.radius.lg,
  minHeight: '52px',
  height: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontSize: '12px',
  fontWeight: '500',
  color: T.color.foreground,
  cursor: 'pointer',
  lineHeight: 1.35,
  padding: '8px 6px',
  boxShadow: T.shadow.subtle,
  transition: 'all 0.18s ease',
  boxSizing: 'border-box' as const,
  whiteSpace: 'normal' as const,
  wordBreak: 'keep-all' as const,
  overflowWrap: 'anywhere' as const,
  minWidth: 0,
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  WebkitTapHighlightColor: 'transparent',
};

// 사내 AI 어시스턴트(option.insapien.co.kr) 참고 — 무채색 원형 뱃지("AI" 텍스트,
// 이모지 대신 사용해 나머지 무채색 UI와 톤을 맞춤)
const BOT_AVATAR_STYLE: React.CSSProperties = {
  width: '28px',
  height: '28px',
  background: T.color.secondary,
  color: T.color.secondaryForeground,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.02em',
  flexShrink: 0,
};

const MESSAGE_COLUMN_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  flex: 1,
  minWidth: 0,
  maxWidth: 'calc(100% - 36px)',
};

// 봇 메시지는 말풍선 배경 없이 아이콘+텍스트만(참고 UI와 동일) — 표/그래프도
// 카드 없이 본문에 바로 놓인다.
const BUBBLE_STYLE: React.CSSProperties = {
  background: 'transparent',
  padding: '3px 0 0',
  fontSize: '13px',
  color: T.color.foreground,
  lineHeight: 1.65,
  maxWidth: '100%',
  width: 'fit-content',
  alignSelf: 'flex-start',
};

// 마크다운 렌더링 영역 — 코드블록 등이 넘치지 않도록 width: 100%
const MARKDOWN_BUBBLE_STYLE: React.CSSProperties = {
  ...BUBBLE_STYLE,
  width: '100%',
  boxSizing: 'border-box' as const,
};

const ACTION_BUTTON_GROUP_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginBottom: '10px',
  alignSelf: 'flex-start',
  alignItems: 'flex-start',
  width: 'fit-content',
  maxWidth: '100%',
};

function createActionButtonStyle(
  primaryColor: string,
  isHovered: boolean,
): React.CSSProperties {
  return {
    width: 'fit-content',
    maxWidth: '100%',
    padding: '10px 18px',
    // 테넌트 브랜드 색상(primaryColor)은 그대로 쓰되, 고정된 보라색으로
    // 블렌딩하던 그라디언트/그림자는 제거 — 브랜드색과 무관한 색이 섞이지 않도록
    background: isHovered
      ? `color-mix(in srgb, ${primaryColor} 85%, black)`
      : primaryColor,
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    boxShadow: isHovered
      ? '0 6px 16px rgba(0,0,0,0.18)'
      : '0 2px 8px rgba(0,0,0,0.12)',
    transform: isHovered ? 'translateY(-1px)' : 'none',
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap',
  };
}

function formatMessageTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getMessageTimestamp(value?: string): number {
  if (!value) return 0;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    // seconds 단위이면 ms로 변환 (10^10 미만이면 초 단위로 판단)
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getRpaDisplayText(msg: { message?: string }): string {
  return msg.message || '알림이 도착했습니다.';
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern =
    /(\*\*(.+?)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2] !== undefined) {
      // **bold**
      parts.push(<strong key={`${keyPrefix}-${i++}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      // *italic*
      parts.push(<em key={`${keyPrefix}-${i++}`}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      // `inline code`
      parts.push(
        <code
          key={`${keyPrefix}-${i++}`}
          style={{
            background: T.color.muted,
            borderRadius: '4px',
            padding: '1px 5px',
            fontSize: '11.5px',
            fontFamily: T.font.mono,
            color: T.color.foreground,
            border: `1px solid ${T.color.border}`,
          }}
        >
          {match[4]}
        </code>,
      );
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // [link text](url)
      parts.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: T.color.primary,
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          {match[5]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

function isTableSeparator(line: string): boolean {
  return /^\|[-:\s|]+\|$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseColAligns(
  separatorLine: string,
): Array<'left' | 'center' | 'right'> {
  return separatorLine
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => {
      const c = cell.trim();
      if (c.startsWith(':') && c.endsWith(':')) return 'center';
      if (c.endsWith(':')) return 'right';
      return 'left';
    });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' = 'ul';
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';
  let nodeIdx = 0;

  // 테이블 버퍼
  let tableHeaders: string[] = [];
  let tableAligns: Array<'left' | 'center' | 'right'> = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const nextKey = () => nodeIdx++;

  const flushList = () => {
    if (listItems.length === 0) return;
    const key = `list-${nextKey()}`;
    if (listType === 'ol') {
      nodes.push(
        <ol
          key={key}
          style={{ margin: '6px 0', paddingLeft: '20px', lineHeight: 1.7 }}
        >
          {listItems}
        </ol>,
      );
    } else {
      nodes.push(
        <ul
          key={key}
          style={{ margin: '6px 0', paddingLeft: '20px', lineHeight: 1.7 }}
        >
          {listItems}
        </ul>,
      );
    }
    listItems = [];
  };

  const flushTable = () => {
    if (tableHeaders.length === 0) return;
    const key = `table-${nextKey()}`;
    const cellStyle = (
      align: 'left' | 'center' | 'right',
    ): React.CSSProperties => ({
      padding: '6px 10px',
      textAlign: align,
      borderBottom: `1px solid ${T.color.border}`,
      fontSize: '12px',
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'keep-all' as const,
    });
    nodes.push(
      <div
        key={key}
        style={{
          overflowX: 'auto',
          margin: '8px 0',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: '12px',
          }}
        >
          <thead>
            <tr style={{ background: T.color.muted }}>
              {tableHeaders.map((h, ci) => (
                <th
                  key={ci}
                  style={{
                    ...cellStyle(tableAligns[ci] || 'left'),
                    fontWeight: 700,
                    color: T.color.foreground,
                    borderBottom: `1px solid ${T.color.border}`,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {renderInline(h, `th-${key}-${ci}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              // 참고 UI와 동일하게 줄무늬 없이 border-bottom만 사용
              <tr key={ri}>
                {tableHeaders.map((_, ci) => (
                  <td key={ci} style={cellStyle(tableAligns[ci] || 'left')}>
                    {renderInline(row[ci] ?? '', `td-${key}-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableHeaders = [];
    tableAligns = [];
    tableRows = [];
    inTable = false;
  };

  const flushPlainCodeBlock = (key: string) => {
    nodes.push(
      <pre
        key={key}
        style={{
          background: T.color.muted,
          borderRadius: T.radius.md,
          padding: '12px 14px',
          overflowX: 'auto',
          margin: '8px 0',
          fontSize: '11.5px',
          lineHeight: 1.6,
          color: T.color.foreground,
          fontFamily: T.font.mono,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {codeLang && (
          <div
            style={{
              color: T.color.mutedForeground,
              fontSize: '10px',
              marginBottom: '6px',
              opacity: 0.8,
            }}
          >
            {codeLang}
          </div>
        )}
        <code>{codeLines.join('\n')}</code>
      </pre>,
    );
  };

  const flushCodeBlock = () => {
    const key = `code-${nextKey()}`;
    // specs/014-hr-chatbot-viz — ```viz 블록만 그래프/다이어그램으로 마운트.
    // 파싱·스키마 실패 시 원본 코드블록 평문 표시로 폴백(크래시 없음, FR-006).
    // LLM이 간혹 언어 태그를 json으로 잘못 붙이는 사례가 실측됐으므로(가드 지시에도
    // 재발 가능) viz/json 둘 다 시도하고, 실제로 우리 스키마(type 3종)와 맞을 때만
    // 렌더한다 — 무관한 일반 json 코드블록은 그대로 dispatch.kind==="invalid"로
    // 폴백되므로 안전하다.
    const lang = codeLang.trim().toLowerCase();
    if (lang === 'viz' || lang === 'json') {
      const dispatch = dispatchViz(codeLines.join('\n'));
      if (dispatch.kind === 'invalid' || dispatch.result.status === 'invalid') {
        flushPlainCodeBlock(key);
      } else {
        nodes.push(<VizBlockRenderer key={key} dispatch={dispatch} />);
      }
    } else {
      flushPlainCodeBlock(key);
    }
    codeLines = [];
    codeLang = '';
  };

  lines.forEach((line) => {
    // 코드 블록 시작/종료
    const codeBlockFence = line.match(/^```(.*)/);
    if (codeBlockFence) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = codeBlockFence[1].trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // 테이블 처리
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
    if (isTableRow) {
      if (isTableSeparator(line)) {
        // 구분선 행 — 정렬 정보 파싱 (헤더 다음에 오는 행)
        tableAligns = parseColAligns(line);
        inTable = true;
      } else if (!inTable && tableHeaders.length === 0) {
        // 첫 번째 행 = 헤더
        flushList();
        tableHeaders = parseTableRow(line);
      } else if (inTable) {
        // 데이터 행
        tableRows.push(parseTableRow(line));
      }
      return;
    } else if (tableHeaders.length > 0) {
      // 테이블이 끝남
      flushTable();
    }

    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const hr = line.match(/^(-{3,}|\*{3,}|_{3,})$/);
    const blockquote = line.match(/^>\s*(.*)/);
    const bullet = line.match(/^[-*+]\s+(.+)/);
    const numbered = line.match(/^(\d+)[.)]\s+(.+)/);

    if (h1) {
      flushList();
      nodes.push(
        <div
          key={nextKey()}
          style={{
            fontWeight: 700,
            fontSize: '14px',
            color: '#1f2937',
            marginTop: '12px',
            marginBottom: '4px',
            paddingBottom: '4px',
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          {renderInline(h1[1], `h1-${nodeIdx}`)}
        </div>,
      );
    } else if (h2) {
      flushList();
      nodes.push(
        <div
          key={nextKey()}
          style={{
            fontWeight: 700,
            fontSize: '13px',
            color: '#374151',
            marginTop: '10px',
            marginBottom: '3px',
            paddingBottom: '3px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {renderInline(h2[1], `h2-${nodeIdx}`)}
        </div>,
      );
    } else if (h3) {
      flushList();
      nodes.push(
        <div
          key={nextKey()}
          style={{
            fontWeight: 600,
            fontSize: '12.5px',
            color: '#4b5563',
            marginTop: '8px',
            marginBottom: '2px',
          }}
        >
          {renderInline(h3[1], `h3-${nodeIdx}`)}
        </div>,
      );
    } else if (hr) {
      flushList();
      nodes.push(
        <hr
          key={nextKey()}
          style={{
            border: 'none',
            borderTop: '1px solid #e5e7eb',
            margin: '8px 0',
          }}
        />,
      );
    } else if (blockquote) {
      flushList();
      nodes.push(
        <div
          key={nextKey()}
          style={{
            borderLeft: `3px solid ${T.color.border}`,
            paddingLeft: '10px',
            margin: '4px 0',
            color: T.color.mutedForeground,
            fontStyle: 'italic',
            fontSize: '12.5px',
            lineHeight: 1.6,
          }}
        >
          {renderInline(blockquote[1], `bq-${nodeIdx}`)}
        </div>,
      );
    } else if (bullet) {
      if (listType === 'ol' && listItems.length > 0) flushList();
      listType = 'ul';
      listItems.push(
        <li key={nodeIdx} style={{ marginBottom: '2px', lineHeight: 1.6 }}>
          {renderInline(bullet[1], `li-${nodeIdx}`)}
        </li>,
      );
    } else if (numbered) {
      if (listType === 'ul' && listItems.length > 0) flushList();
      listType = 'ol';
      listItems.push(
        <li key={nodeIdx} style={{ marginBottom: '2px', lineHeight: 1.6 }}>
          {renderInline(numbered[2], `li-${nodeIdx}`)}
        </li>,
      );
    } else if (line.trim() === '') {
      flushList();
      nodes.push(<div key={nextKey()} style={{ height: '5px' }} />);
    } else {
      flushList();
      nodes.push(
        <div key={nextKey()} style={{ lineHeight: 1.65 }}>
          {renderInline(line, `p-${nodeIdx}`)}
        </div>,
      );
    }
  });

  if (inCodeBlock) flushCodeBlock();
  if (tableHeaders.length > 0) flushTable();
  flushList();
  return nodes;
}

type TimelineItem =
  | { kind: 'scheduled'; sortKey: number; data: ScheduledMessage }
  | { kind: 'rpa'; sortKey: number; data: RpaMessageItem }
  | { kind: 'suggestion'; sortKey: number; data: ChatbotButtonCardMessage }
  | { kind: 'ai-user'; sortKey: number; data: AiMessage }
  | { kind: 'ai-bot'; sortKey: number; data: AiMessage };

function buildTimelineItems(
  scheduledMessages: ScheduledMessage[],
  rpaMessages: RpaMessageItem[],
  buttonCardMessages: ChatbotButtonCardMessage[],
  aiMessages: AiMessage[],
): TimelineItem[] {
  // 모든 메시지를 클라이언트 실제 수신 시각(화면에 나타난 시각) 기준으로 통합 정렬
  // RPA: clientReceivedAt (히스토리=로드시각, 구독=수신시각)
  // AI: createdAt (Date.now() 기반)
  return [
    ...scheduledMessages.map((msg) => ({
      kind: 'scheduled' as const,
      sortKey: getMessageTimestamp(msg.shownAt),
      data: msg,
    })),
    ...rpaMessages.map((msg) => ({
      kind: 'rpa' as const,
      sortKey: msg.clientReceivedAt ?? getMessageTimestamp(msg.receivedAt),
      data: msg,
    })),
    ...buttonCardMessages.map((msg) => ({
      kind: 'suggestion' as const,
      sortKey: getMessageTimestamp(msg.createdAt),
      data: msg,
    })),
    ...aiMessages.map((msg) => ({
      kind: (msg.role === 'user' ? 'ai-user' : 'ai-bot') as
        | 'ai-user'
        | 'ai-bot',
      sortKey: msg.createdAt,
      data: msg,
    })),
  ].sort((a, b) => a.sortKey - b.sortKey);
}

// 참고 UI와 동일하게 유저 메시지만 회색 알약 배경(브랜드 컬러 없음)
const USER_BUBBLE_STYLE: React.CSSProperties = {
  background: T.color.muted,
  borderRadius: T.radius.pill,
  padding: '10px 14px',
  fontSize: '13px',
  color: T.color.foreground,
  lineHeight: 1.55,
  maxWidth: '100%',
  width: 'fit-content',
  alignSelf: 'flex-end',
};

const HEADER_ACTION_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const HEADER_BUTTON_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 12px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.5)',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const ChatbotView: React.FC = () => {
  const { setRoute, setChatbotMenu } = useRouter();
  const primaryColor = getColor() || '#6366f1';
  const [hoveredBtn, setHoveredBtn] = React.useState<string | null>(null);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  const scheduledMessages = useChatbotMessages();
  const { rpaMessages } = useRpaMessages();
  const { buttonCardMessages } = useChatbotButtonMessages();
  const [inputValue, setInputValue] = React.useState('');
  const [inputFocused, setInputFocused] = React.useState(false);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [dismissedForValue, setDismissedForValue] = React.useState<
    string | null
  >(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // 화면 이탈 시 진행 중인 스트림 취소
  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);
  const { menus: suggestionMenus, questions: suggestionQuestions } =
    useChatbotKeywordSuggestions(inputValue);

  const showSuggestions =
    dismissedForValue !== inputValue &&
    (suggestionMenus.length > 0 || suggestionQuestions.length > 0);

  const [sessionId, setSessionId] = React.useState<string>(() =>
    getActiveSessionId(),
  );

  // 활성 세션의 대화 복원. sessionId가 바뀔 때(새 채팅/이력 전환)도 다시 실행된다.
  const [aiMessages, setAiMessages] = React.useState<AiMessage[]>(() =>
    loadMessages(sessionId),
  );

  React.useEffect(() => {
    setAiMessages(loadMessages(sessionId));
  }, [sessionId]);

  // aiMessages 변경 시 저장 + 이력 인덱스 갱신 (streaming 중인 메시지 제외)
  React.useEffect(() => {
    saveMessages(sessionId, aiMessages);
    if (aiMessages.length > 0) {
      const firstUserMessage =
        aiMessages.find((m) => m.role === 'user') ?? aiMessages[0];
      upsertIndexEntry({
        id: sessionId,
        firstMessage: firstUserMessage.text,
        updatedAt: Date.now(),
      });
    }
  }, [aiMessages, sessionId]);

  const handleNewChat = () => {
    if (aiMessages.length === 0) return;
    // sessionId만 바꾸면 다음 렌더에서 아직 초기화되지 않은 이전 aiMessages가
    // 새 sessionId와 함께 저장 이펙트에 걸려 이력에 중복 항목이 남는다.
    // 두 상태를 같은 이벤트 핸들러에서 함께 바꿔 같은 렌더에 반영되게 한다.
    setSessionId(startNewSession());
    setAiMessages([]);
  };

  const timelineItems = React.useMemo(
    () =>
      buildTimelineItems(
        scheduledMessages,
        rpaMessages,
        buttonCardMessages,
        aiMessages,
      ),
    [scheduledMessages, rpaMessages, buttonCardMessages, aiMessages],
  );

  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timelineItems.length, aiMessages]);

  const handleMenuClick = (title: string, pathOrUrl: string) => {
    setChatbotMenu({ title, url: buildHrUrl(pathOrUrl) });
    setRoute('chatbot-iframe');
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    const now = Date.now();
    const userMsg: AiMessage = {
      id: `u-${now}`,
      role: 'user',
      text,
      createdAt: now,
    };
    const botMsgId = `b-${now + 1}`;
    // createdAt은 첫 청크 수신 시점으로 업데이트 — 전송 시점으로 고정하면
    // 그 사이에 도착한 RPA 메시지보다 위에 정렬됨
    const botMsg: AiMessage = {
      id: botMsgId,
      role: 'bot',
      text: '',
      createdAt: now + 1,
      streaming: true,
    };

    setAiMessages((prev) => [...prev, userMsg, botMsg]);
    setInputValue('');
    setDismissedForValue('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let accumulated = '';
      let firstChunk = true;
      for await (const chunk of streamChat(text, sessionId, {
        signal: controller.signal,
      })) {
        // 서버 abort 청크: error가 문자열로 옴 (정상 청크는 false/null)
        if (typeof chunk.error === 'string' && chunk.error) {
          setAiMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    text:
                      accumulated || '오류가 발생했습니다. 다시 시도해주세요.',
                    streaming: false,
                  }
                : m,
            ),
          );
          break;
        }
        accumulated += chunk.textResponse ?? '';
        const receivedAt = Date.now();
        setAiMessages((prev) =>
          prev.map((m) => {
            if (m.id !== botMsgId) return m;
            return {
              ...m,
              text: accumulated,
              streaming: !chunk.close,
              // 첫 청크 수신 시각으로 createdAt 업데이트
              createdAt: firstChunk ? receivedAt : m.createdAt,
            };
          }),
        );
        firstChunk = false;
      }
    } catch (e: any) {
      // unmount로 인한 중단은 에러 표시하지 않음
      if (e?.name !== 'AbortError') {
        setAiMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  text: '오류가 발생했습니다. 다시 시도해주세요.',
                  streaming: false,
                }
              : m,
          ),
        );
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      // close 청크 없이 스트림이 끝나도 "···" 플레이스홀더가 남지 않도록 해제
      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId && m.streaming ? { ...m, streaming: false } : m,
        ),
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Container
      withBottomNavBar={true}
      showBackButton={false}
      title={
        <div style={HEADER_ACTION_ROW_STYLE}>
          <button
            type="button"
            onClick={handleNewChat}
            disabled={aiMessages.length === 0}
            style={{
              ...HEADER_BUTTON_STYLE,
              opacity: aiMessages.length === 0 ? 0.4 : 1,
              cursor: aiMessages.length === 0 ? 'default' : 'pointer',
            }}
          >
            새 채팅
          </button>
          <button
            type="button"
            onClick={() => setRoute('chatbot-history')}
            style={HEADER_BUTTON_STYLE}
          >
            채팅 이력
          </button>
        </div>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          width: '100%',
          minHeight: 0,
          height: '100%',
          background: '#f5f6fc',
        }}
      >
        {/* ── 채팅 영역: 인사 + 시간대 메시지 (스크롤) ── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '16px 16px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* 봇 인사 말풍선 */}
          <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}
          >
            <div style={BOT_AVATAR_STYLE}>AI</div>
            <div style={MESSAGE_COLUMN_STYLE}>
              <div style={BUBBLE_STYLE}>
                안녕하세요! 👋
                <br />
                HR 관련 질문을 AI에게 물어보세요.
              </div>
            </div>
          </div>

          {/* 시간순 통합 메시지 (예약 / RPA / 추천단어) */}
          {timelineItems.map((item) => {
            if (item.kind === 'scheduled') {
              const msg = item.data;
              return (
                <div
                  key={`scheduled-${msg.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <div style={BOT_AVATAR_STYLE}>AI</div>
                  <div style={MESSAGE_COLUMN_STYLE}>
                    <div style={BUBBLE_STYLE}>{msg.text}</div>
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div style={ACTION_BUTTON_GROUP_STYLE}>
                        {msg.buttons.map((btn) => {
                          const btnKey = `${msg.id}-${btn.label}`;
                          const isHovered = hoveredBtn === btnKey;
                          return (
                            <button
                              key={btnKey}
                              type="button"
                              tabIndex={-1}
                              style={createActionButtonStyle(
                                primaryColor,
                                isHovered,
                              )}
                              onMouseEnter={() => setHoveredBtn(btnKey)}
                              onMouseLeave={() => setHoveredBtn(null)}
                              onMouseDown={(e) => e.preventDefault()}
                              onFocus={(e) => e.currentTarget.blur()}
                              onClick={() =>
                                handleMenuClick(btn.label, btn.url)
                              }
                            >
                              {btn.label} →
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!!msg.shownAt && (
                      <span
                        style={{
                          alignSelf: 'flex-end',
                          fontSize: '10px',
                          color: '#94a3b8',
                          marginRight: 2,
                        }}
                      >
                        {formatMessageTime(msg.shownAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            if (item.kind === 'rpa') {
              const msg = item.data;
              const actionButtons = resolveRpaButtons(msg.rpaCode, msg.buttons);
              return (
                <div
                  key={`rpa-${msg._id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <div style={BOT_AVATAR_STYLE}>AI</div>
                  <div style={MESSAGE_COLUMN_STYLE}>
                    <div style={BUBBLE_STYLE}>{getRpaDisplayText(msg)}</div>
                    {actionButtons.length > 0 && (
                      <div style={ACTION_BUTTON_GROUP_STYLE}>
                        {actionButtons.map((btn) => {
                          const btnKey = `${msg._id}-${btn.label}`;
                          const isHovered = hoveredBtn === btnKey;
                          return (
                            <button
                              key={btnKey}
                              type="button"
                              tabIndex={-1}
                              style={createActionButtonStyle(
                                primaryColor,
                                isHovered,
                              )}
                              onMouseEnter={() => setHoveredBtn(btnKey)}
                              onMouseLeave={() => setHoveredBtn(null)}
                              onMouseDown={(e) => e.preventDefault()}
                              onFocus={(e) => e.currentTarget.blur()}
                              onClick={() =>
                                handleMenuClick(btn.label, btn.path)
                              }
                            >
                              {btn.label} →
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!!msg.receivedAt && (
                      <span
                        style={{
                          alignSelf: 'flex-end',
                          fontSize: '10px',
                          color: '#94a3b8',
                          marginRight: 2,
                        }}
                      >
                        {formatMessageTime(msg.receivedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            if (item.kind === 'suggestion') {
              const msg = item.data;
              return (
                <div
                  key={`suggestion-${msg.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <div style={BOT_AVATAR_STYLE}>AI</div>
                  <div style={MESSAGE_COLUMN_STYLE}>
                    <div style={BUBBLE_STYLE}>
                      <strong>{msg.label}</strong> 관련 메뉴입니다.
                    </div>
                    <div style={ACTION_BUTTON_GROUP_STYLE}>
                      {msg.buttons.map((btn) => {
                        const btnKey = `${msg.id}-${btn.label}`;
                        const isHovered = hoveredBtn === btnKey;
                        return (
                          <button
                            key={btnKey}
                            type="button"
                            tabIndex={-1}
                            style={createActionButtonStyle(
                              primaryColor,
                              isHovered,
                            )}
                            onMouseEnter={() => setHoveredBtn(btnKey)}
                            onMouseLeave={() => setHoveredBtn(null)}
                            onMouseDown={(e) => e.preventDefault()}
                            onFocus={(e) => e.currentTarget.blur()}
                            onClick={() => handleMenuClick(btn.label, btn.path)}
                          >
                            {btn.label} →
                          </button>
                        );
                      })}
                    </div>
                    <span
                      style={{
                        alignSelf: 'flex-end',
                        fontSize: '10px',
                        color: '#94a3b8',
                        marginRight: 2,
                      }}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            }

            if (item.kind === 'ai-user') {
              const msg = item.data;
              return (
                <div
                  key={`ai-user-${msg.id}`}
                  style={{ display: 'flex', justifyContent: 'flex-end' }}
                >
                  <div style={USER_BUBBLE_STYLE}>{msg.text}</div>
                </div>
              );
            }

            if (item.kind === 'ai-bot') {
              const msg = item.data;
              return (
                <div
                  key={`ai-bot-${msg.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <div style={BOT_AVATAR_STYLE}>AI</div>
                  <div style={MESSAGE_COLUMN_STYLE}>
                    <div style={MARKDOWN_BUBBLE_STYLE}>
                      {msg.text ? (
                        renderMarkdown(msg.text)
                      ) : msg.streaming ? (
                        <span
                          style={{
                            color: '#94a3b8',
                            fontSize: '18px',
                            letterSpacing: '2px',
                          }}
                        >
                          ···
                        </span>
                      ) : (
                        ''
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* 자동 스크롤 앵커 */}
          <div ref={chatBottomRef} />
        </div>

        {/* ── 키워드 추천 팝업 (overflow 클리핑 방지를 위해 입력 div 밖 형제 요소로 배치) ── */}
        <ChatbotSuggestions
          menus={showSuggestions ? suggestionMenus : []}
          questions={showSuggestions ? suggestionQuestions : []}
          onMenuClick={(menu) => {
            handleMenuClick(menu.label, menu.path);
            setDismissedForValue(inputValue);
          }}
          onQuestionClick={(q) => {
            setInputValue(q);
            setDismissedForValue(q);
          }}
          onClose={() => setDismissedForValue(inputValue)}
        />

        {/* ── AI 채팅 입력 ── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid #ebebf5',
            background: '#fff',
            padding: '12px 14px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            disabled={isStreaming}
            rows={3}
            style={{
              flex: 1,
              border: `1.5px solid ${inputFocused ? primaryColor : T.color.input}`,
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '13px',
              color: T.color.foreground,
              outline: 'none',
              boxSizing: 'border-box',
              background: isStreaming ? T.color.muted : T.color.background,
              resize: 'none',
              lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming || !inputValue.trim()}
            aria-label="전송"
            style={{
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              width: '42px',
              height: '42px',
              // 그래프(Chart.js) 강조색과 동일한 톤으로 통일 — 테넌트 브랜드색 대신 사용
              background:
                isStreaming || !inputValue.trim() ? '#c7c7d4' : T.chartAccent,
              border: 'none',
              borderRadius: '50%',
              cursor:
                isStreaming || !inputValue.trim() ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4Z" />
            </svg>
          </button>
        </div>

        {/* ── 메뉴 그리드 (접기/펼치기) ── 비활성화
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid #ebebf5",
            background: "#f5f6fc",
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onFocus={(e) => e.currentTarget.blur()}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              outline: "none",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#6366f1" }}>
              HR 메뉴
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                transition: "transform 0.2s",
                display: "inline-block",
                transform: isMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▲
            </span>
          </button>

          {isMenuOpen && (
            <div style={{ padding: "0 14px 14px", overflowY: "auto", maxHeight: "260px" }}>
              {CHATBOT_MENU_CATEGORIES.map((cat, catIndex) => {
            const items = CHATBOT_MENUS.filter((m) => m.category === cat.key);
            const gridCols =
              cat.cols === 2
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(auto-fit, minmax(96px, 1fr))";

            return (
              <div key={cat.key}>
                {catIndex > 0 && <div style={DIVIDER_STYLE} />}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridCols,
                    gap: "7px",
                    marginBottom: "4px",
                    alignItems: "stretch",
                  }}
                >
                  {items.map((menu) => {
                    const isHovered = hoveredId === menu.id;
                    return (
                      <button
                        key={menu.id}
                        type="button"
                        tabIndex={-1}
                        className="chatbot-menu-button"
                        style={{
                          ...CARD_BASE_STYLE,
                          ...(isHovered
                            ? {
                                background: `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)`,
                                borderWidth: "1.5px",
                                borderStyle: "solid",
                                borderColor: "transparent",
                                color: "#fff",
                                transform: "translateY(-2px)",
                                boxShadow: `0 6px 16px rgba(99,102,241,0.28)`,
                                outline: "none",
                              }
                            : {
                                borderWidth: "1.5px",
                                borderStyle: "solid",
                                borderColor: "#ebebf5",
                                outline: "none",
                              }),
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        onFocus={(e) => e.currentTarget.blur()}
                        onMouseEnter={() => setHoveredId(menu.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => handleMenuClick(menu.label, menu.path)}
                      >
                        {menu.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
              })}
            </div>
          )}
        </div>
        ── 메뉴 그리드 비활성화 끝 ── */}
      </div>
    </Container>
  );
};

export default ChatbotView;
