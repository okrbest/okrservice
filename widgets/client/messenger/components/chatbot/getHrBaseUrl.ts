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
