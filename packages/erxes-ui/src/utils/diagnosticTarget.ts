// Sentry의 tracesSampler는 초기화 시점에 한 번 등록되지만 currentUser는
// 나중에(로그인 후) 알게 되므로, 그 사이를 잇는 공유 플래그.
let isDiagnosticTarget = false;

export const setDiagnosticTarget = (value: boolean) => {
  isDiagnosticTarget = value;
};

export const isDiagnosticTargetEnabled = (): boolean => isDiagnosticTarget;
