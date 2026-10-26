// 위젯 티켓 "새 탭에서 보기" 링크 도우미(순수 함수)

// 새 탭 주소. 열쇠는 조각(#)에 넣어 서버 요청·접속 기록·Referer에 실리지 않게 한다.
// ROOT_URL 기준이라 리버스 프록시 경로 접두사(예: /widgets)가 유지된다.
export const buildTicketViewUrl = ({
  rootUrl,
  token,
  lang,
}: {
  rootUrl: string;
  token: string;
  lang?: string;
}): string => {
  const base = `${(rootUrl || '').replace(/\/$/, '')}/ticket-view`;
  const query = lang ? `?lang=${encodeURIComponent(lang)}` : '';

  return `${base}${query}#${token}`;
};

// 진행 상황 화면을 열 때 받아 둔 링크. 만료(마지막 사용 후 하루)가 1시간 안으로 다가오면 새로 받는다.
const REFRESH_BEFORE_MS = 60 * 60 * 1000;

export type IssuedLink = { url: string; expiresAt: number };

export const isLinkFresh = (
  link: IssuedLink | undefined,
  now: number = Date.now(),
): boolean => Boolean(link) && link!.expiresAt - now > REFRESH_BEFORE_MS;
