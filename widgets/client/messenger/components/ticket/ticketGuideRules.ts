// 티켓 진행 상황 화면의 첫 안내("새 탭에서 보기"·사진 "원본"으로 크게 보기) 규칙.
// "확인"을 누르면 위젯 저장소(고객 홈페이지 쪽 브라우저)에 남겨 다시 보이지 않는다.

export const TICKET_GUIDE_SEEN_KEY = 'ticketViewGuideSeen';

export type TicketGuideRow = 'newTab' | 'original';

/** 위젯 저장소 값은 문자열로 남는다(setLocalStorageItem) */
export const isTicketGuideSeen = (value: unknown): boolean =>
  value === true || value === 'true';

/** "새 탭에서 보기" 버튼이 보일 때만 그 줄을 넣는다. 사진 "원본" 줄은 항상(다음 티켓에서도 쓰니까) */
export const ticketGuideRows = (canOpenNewTab: boolean): TicketGuideRow[] =>
  canOpenNewTab ? ['newTab', 'original'] : ['original'];
