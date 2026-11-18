import { menuKey } from './menuPermission';

/** iframe이 열린 동안 세션이 살아 있는지 다시 보는 간격 (너무 잦으면 브리지·5240 부담) */
export const IFRAME_SESSION_POLL_MS = 30_000;

const MOBILE_MAIN = menuKey('/MobileMain.do');
const CHG_PWD = menuKey('/MobileChgPwd.do');

export const isOpenedAsMobileMain = (url: string): boolean =>
  menuKey(url) === MOBILE_MAIN;

export const isPasswordChangeUrl = (url: string): boolean =>
  menuKey(url) === CHG_PWD;

/**
 * C 폴백: 휴가·결재 등으로 열었는데 5240이 이벤트 없이 MobileMain으로 보내면
 * 챗봇으로 돌아간다. 출퇴근 체크(MobileMain)로 연 경우는 그대로 둔다.
 */
export const shouldReturnForMobileMainFallback = (
  openedUrl: string,
  currentLocationHref: string | null | undefined,
): boolean => {
  if (!currentLocationHref) {
    return false;
  }
  if (isOpenedAsMobileMain(openedUrl)) {
    return false;
  }
  return menuKey(currentLocationHref) === MOBILE_MAIN;
};

/**
 * same-origin일 때 iframe이 로그인·세션 오류 화면이면 만료로 본다.
 * (위젯 도메인≠5240이면 읽지 못함 — 그때는 chkLoginSession 폴링에 의존)
 */
export const isSessionExpiredIframeLocation = (
  currentLocationHref: string | null | undefined,
): boolean => {
  if (!currentLocationHref) {
    return false;
  }
  const href = String(currentLocationHref);
  if (/Login\.do/i.test(href)) {
    return true;
  }
  if (/Error\.do/i.test(href) && /[?&]code=(905|915)\b/.test(href)) {
    return true;
  }
  if (/logoutUserSessionEnd\.do/i.test(href)) {
    return true;
  }
  return false;
};
