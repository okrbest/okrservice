/**
 * 부팅 진단.
 *
 * 앱이 렌더링되지 못하면 사용자에게는 로딩 화면의 배경색만 남아 원인을 알 수 없다.
 * 실제로 "회색 화면"만 보고 원인을 좁히지 못해 문의가 반복된 사례가 있었다.
 * 여기서는 부팅 실패를 감지해 순수 DOM으로 진단 화면을 띄운다.
 * React가 이미 죽은 상황에서도 동작해야 하므로 React에 의존하지 않는다.
 */

const RENDER_TIMEOUT_MS = 20000;
const MAX_COLLECTED_ERRORS = 5;
const ROOT_ID = 'root';

export const BOOT_FAILURE_CODES = {
  SETUP_FETCH_FAILED: 'SETUP_FETCH_FAILED',
  RENDER_FAILED: 'RENDER_FAILED',
  RENDER_TIMEOUT: 'RENDER_TIMEOUT',
} as const;

export type BootFailureCode =
  (typeof BOOT_FAILURE_CODES)[keyof typeof BOOT_FAILURE_CODES];

type BootFailure = {
  code: BootFailureCode;
  message: string;
};

let hasRendered = false;
let hasShownDiagnostics = false;
let watchdogId: ReturnType<typeof setTimeout> | null = null;
let collectedErrors: string[] = [];

const collectError = (message: string) => {
  if (collectedErrors.length >= MAX_COLLECTED_ERRORS) {
    return;
  }

  // 불변 갱신 — 기존 배열을 변경하지 않는다
  collectedErrors = [...collectedErrors, message.slice(0, 300)];
};

const buildReport = (failure: BootFailure): string => {
  const lines = [
    `오류 코드 : ${failure.code}`,
    `내용      : ${failure.message}`,
    `주소      : ${window.location.href}`,
    `브라우저  : ${navigator.userAgent}`,
    `화면      : ${window.innerWidth}x${window.innerHeight}`,
    `시각      : ${new Date().toISOString()}`,
  ];

  if (collectedErrors.length > 0) {
    return [
      ...lines,
      '',
      '수집된 오류:',
      ...collectedErrors.map((e) => `- ${e}`),
    ].join('\n');
  }

  return lines.join('\n');
};

const styleOf = (styles: Record<string, string>): string =>
  Object.entries(styles)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');

const createButton = (
  label: string,
  onClick: () => void,
): HTMLButtonElement => {
  const button = document.createElement('button');

  button.type = 'button';
  button.textContent = label;
  button.setAttribute(
    'style',
    styleOf({
      padding: '10px 18px',
      'font-size': '14px',
      'font-family': 'inherit',
      color: '#fff',
      background: '#673fbd',
      border: 'none',
      'border-radius': '6px',
      cursor: 'pointer',
    }),
  );
  button.addEventListener('click', onClick);

  return button;
};

const copyReport = async (report: string, button: HTMLButtonElement) => {
  const original = button.textContent || '';

  try {
    await navigator.clipboard.writeText(report);
    button.textContent = '복사되었습니다';
  } catch (e) {
    // clipboard API는 비보안 컨텍스트나 권한 거부 시 실패한다.
    // 그때는 사용자가 직접 선택할 수 있도록 안내만 바꾼다.
    button.textContent = '아래 내용을 길게 눌러 복사해 주세요';
  }

  setTimeout(() => {
    button.textContent = original;
  }, 3000);
};

/**
 * 순수 DOM으로 진단 화면을 그린다. React/번들이 깨진 상황에서도 동작한다.
 */
export const showBootDiagnostics = (failure: BootFailure) => {
  // 앱이 이미 그려졌다면 화면을 덮지 않는다.
  // 초기 설정 조회가 실패해도 로그인 화면까지 진입한 경우가 여기 해당한다.
  if (hasRendered || hasShownDiagnostics) {
    return;
  }
  hasShownDiagnostics = true;

  const root = document.getElementById(ROOT_ID);

  if (!root) {
    return;
  }

  const report = buildReport(failure);

  const wrapper = document.createElement('div');
  wrapper.setAttribute(
    'style',
    styleOf({
      'max-width': '520px',
      margin: '0 auto',
      padding: '40px 24px',
      'font-family':
        'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'font-size': '14px',
      'line-height': '1.6',
      color: '#393c40',
      'text-align': 'left',
    }),
  );

  const title = document.createElement('h2');
  title.textContent = '화면을 불러오지 못했습니다';
  title.setAttribute(
    'style',
    styleOf({ margin: '0 0 8px', 'font-size': '18px' }),
  );

  const guide = document.createElement('p');
  guide.textContent =
    '잠시 후 다시 시도해 주세요. 문제가 계속되면 아래 내용을 고객지원으로 보내주시면 빠르게 확인해 드리겠습니다.';
  guide.setAttribute(
    'style',
    styleOf({ margin: '0 0 20px', color: '#6a818c' }),
  );

  const pre = document.createElement('pre');
  pre.textContent = report;
  pre.setAttribute(
    'style',
    styleOf({
      margin: '0 0 20px',
      padding: '14px',
      background: '#f7f8fc',
      border: '1px solid #dee4e7',
      'border-radius': '6px',
      'font-size': '12px',
      'line-height': '1.5',
      'white-space': 'pre-wrap',
      'word-break': 'break-all',
      'user-select': 'text',
      '-webkit-user-select': 'text',
    }),
  );

  const actions = document.createElement('div');
  actions.setAttribute(
    'style',
    styleOf({ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }),
  );

  const retry = createButton('다시 시도', () => window.location.reload());
  const copy = createButton('오류 내용 복사', () => {
    copyReport(report, copy);
  });

  actions.appendChild(retry);
  actions.appendChild(copy);

  wrapper.appendChild(title);
  wrapper.appendChild(guide);
  wrapper.appendChild(pre);
  wrapper.appendChild(actions);

  root.textContent = '';
  root.appendChild(wrapper);

  console.error(`부팅 실패 [${failure.code}] ${failure.message}`);
};

/** 앱이 정상 렌더링되면 호출한다. 감시 타이머를 해제한다. */
export const markBootRendered = () => {
  hasRendered = true;

  if (watchdogId) {
    clearTimeout(watchdogId);
    watchdogId = null;
  }
};

/**
 * 부팅 감시를 시작한다.
 * 전역 오류를 모아두고, 제한 시간 안에 렌더링되지 않으면 진단 화면을 띄운다.
 */
export const startBootWatchdog = () => {
  window.addEventListener('error', (event) => {
    collectError(event.message || String(event.error || 'unknown error'));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    collectError(reason?.message ? reason.message : String(reason));
  });

  watchdogId = setTimeout(() => {
    if (hasRendered) {
      return;
    }

    showBootDiagnostics({
      code: BOOT_FAILURE_CODES.RENDER_TIMEOUT,
      message: `${RENDER_TIMEOUT_MS / 1000}초 안에 화면이 그려지지 않았습니다.`,
    });
  }, RENDER_TIMEOUT_MS);
};
