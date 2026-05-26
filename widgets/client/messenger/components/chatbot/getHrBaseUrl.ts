const DEFAULT_HR_BASE_URL = 'https://api.5240.cloud';

function getBuiltInHrBaseUrl(): string | undefined {
  try {
    if (typeof process === 'undefined' || !process.env) {
      return undefined;
    }

    const value = process.env.HR_BASE_URL;
    if (value != null && String(value).trim() !== '') {
      return String(value).trim().replace(/\/$/, '');
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export const getHrBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const fromWindow = (window as any).erxesEnv?.HR_BASE_URL;
    if (fromWindow != null && String(fromWindow).trim() !== '') {
      return String(fromWindow).trim().replace(/\/$/, '');
    }
  }

  return getBuiltInHrBaseUrl() || DEFAULT_HR_BASE_URL;
};

export const buildHrUrl = (pathOrUrl: string): string => {
  const value = pathOrUrl.trim();
  if (!value) {
    return getHrBaseUrl();
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const base = getHrBaseUrl();
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${base}${path}`;
};
