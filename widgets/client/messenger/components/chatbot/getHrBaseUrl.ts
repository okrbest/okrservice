import { connection } from '../../connection';

const DEFAULT_HR_BASE_URL = 'https://api.5240.cloud';

const normalizeUrl = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const str = String(value).trim().replace(/\/$/, '');
  return str === '' ? undefined : str;
};

const isLocalhost = (value: string): boolean =>
  /localhost|127\.0\.0\.1/i.test(value);

function getBuiltInHrBaseUrl(): string | undefined {
  try {
    if (typeof process === 'undefined' || !process.env) return undefined;
    return normalizeUrl(process.env.HR_BASE_URL);
  } catch {
    return undefined;
  }
}

export const getHrBaseUrl = (): string => {
  // 1. 고객사 명시 변수 (최우선)
  const explicit = normalizeUrl(connection.setting?.hrBaseUrl);
  if (explicit) return explicit;

  // 2. 호스트 페이지 origin 자동 감지 (localhost 제외)
  const hostname = normalizeUrl(connection.browserInfo?.hostname);
  if (hostname && !isLocalhost(hostname)) return hostname;

  // 3. 서버 주입 설정
  if (typeof window !== 'undefined') {
    const fromWindow = normalizeUrl((window as any).erxesEnv?.HR_BASE_URL);
    if (fromWindow) return fromWindow;
  }

  // 4→5. 빌드 env → 하드코딩 폴백
  return getBuiltInHrBaseUrl() || DEFAULT_HR_BASE_URL;
};

export const buildHrUrl = (pathOrUrl: string): string => {
  const value = pathOrUrl.trim();
  if (!value) return getHrBaseUrl();
  if (/^https?:\/\//i.test(value)) return value;
  const base = getHrBaseUrl();
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${base}${path}`;
};

/** HR 메뉴 바로가기 iframe — 5240이 챗봇 진입·완료 후 복귀 이벤트를 구분할 때 사용 */
export const CHATBOT_IFRAME_FROM = 'chatbot';
export const CHATBOT_BACK_EVENT = 'CHATBOT_BACK';

/** 바로가기 iframe URL에 from·backEvent 쿼리를 붙인다 (기존 쿼리는 유지) */
export const appendChatbotIframeQuery = (url: string): string => {
  const value = String(url || '').trim();
  if (!value) return value;

  try {
    const absolute = /^https?:\/\//i.test(value);
    const parsed = absolute
      ? new URL(value)
      : new URL(value, 'https://chatbot-iframe.invalid');
    parsed.searchParams.set('from', CHATBOT_IFRAME_FROM);
    parsed.searchParams.set('backEvent', CHATBOT_BACK_EVENT);
    if (absolute) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const separator = value.includes('?') ? '&' : '?';
    return `${value}${separator}from=${encodeURIComponent(
      CHATBOT_IFRAME_FROM,
    )}&backEvent=${encodeURIComponent(CHATBOT_BACK_EVENT)}`;
  }
};

/** 바로가기로 열 5240 URL (base 결합 + 챗봇 iframe 쿼리) */
export const buildChatbotIframeUrl = (pathOrUrl: string): string =>
  appendChatbotIframeQuery(buildHrUrl(pathOrUrl));

/**
 * 세션 만료 안내의 「5240 새로고침」.
 * 위젯 iframe이 아니라 호스트(5240) 탭 전체를 연다.
 * cross-origin에서는 top.location.reload()가 막히므로 `_top` 네비게이션을 쓴다.
 * 위젯 자신(window)만 reload/이동하는 폴백은 쓰지 않는다.
 */
export const reload5240ForRelogin = (
  win: Window = window,
  hrBaseUrl: string = getHrBaseUrl(),
): void => {
  const siteUrl = `${String(hrBaseUrl).replace(/\/$/, '')}/`;

  // 1) browsing context 이름 `_top` — Location 읽기 없이 최상위만 이동
  try {
    const opened = win.open(siteUrl, '_top');
    if (opened !== undefined) {
      return;
    }
  } catch {
    // open 차단 시 아래로
  }

  // 2) top.location 직접 지정 (읽기 없이 href 쓰기)
  try {
    if (win.top) {
      win.top.location.href = siteUrl;
      return;
    }
  } catch {
    // sandbox 등
  }

  // 3) <a target="_top"> 클릭 — 위젯 location은 건드리지 않음
  try {
    const anchor = win.document.createElement('a');
    anchor.href = siteUrl;
    anchor.target = '_top';
    anchor.rel = 'noopener';
    win.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch {
    // 최후: 여전히 top만 시도 (위젯 reload 금지)
    try {
      win.top!.location.href = siteUrl;
    } catch {
      // no-op — 위젯만 새로고침하지 않음
    }
  }
};
