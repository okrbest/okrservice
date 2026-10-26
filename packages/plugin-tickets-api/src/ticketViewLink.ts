// 위젯 티켓 "새 탭에서 보기" 링크 열쇠 규칙(순수 함수).
// 열쇠 원문은 고객에게 한 번만 주고, 서버에는 지문(SHA-256)만 둔다.
// 마지막 사용 후 하루가 지나면 만료되고, 쓰는 동안은 자동으로 하루씩 늘어난다.
import * as crypto from 'crypto';

export const TICKET_VIEW_LINK_TTL_MS = 24 * 60 * 60 * 1000;

// 새로 고침이 잦아도 DB 쓰기가 몰리지 않게, 연장 기록은 5분에 한 번만
export const TICKET_VIEW_EXTEND_THROTTLE_MS = 5 * 60 * 1000;

// 쓰는 동안 연장돼도 발급 후 7일이 지나면 끝난다 — 새어 나간 열쇠가 무기한 살아 있지 않게
export const TICKET_VIEW_LINK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// 발급 남용 막기: 고객당 1분 발급 수, 같은 티켓·고객의 살아 있는 링크 수
export const TICKET_VIEW_ISSUE_LIMIT_PER_MINUTE = 10;
export const TICKET_VIEW_ISSUE_WINDOW_MS = 60 * 1000;
export const TICKET_VIEW_MAX_LINKS_PER_TICKET = 5;

const TOKEN_BYTES = 32;

/** 추측할 수 없는 열쇠(base64url 43자) */
export const generateToken = (): string =>
  crypto.randomBytes(TOKEN_BYTES).toString('base64url');

/** 저장·조회용 지문 — 열쇠 원문은 저장하지 않는다 */
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const isLinkActive = (
  link:
    | {
        expiresAt?: Date | null;
        createdAt?: Date | null;
        revokedAt?: Date | null;
      }
    | null
    | undefined,
  now: Date,
): boolean =>
  Boolean(link?.expiresAt) &&
  !link!.revokedAt &&
  new Date(link!.expiresAt as Date).getTime() > now.getTime() &&
  (!link!.createdAt ||
    new Date(link!.createdAt).getTime() + TICKET_VIEW_LINK_MAX_AGE_MS >
      now.getTime());

/** 같은 티켓·고객의 링크 중 최근 것만 남기고 지울 id(최신 순으로 상한 초과분) */
export const linksToPrune = (
  links: Array<{ _id: string; createdAt: Date }>,
  max: number = TICKET_VIEW_MAX_LINKS_PER_TICKET,
): string[] =>
  links
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(max)
    .map((link) => link._id);

export const nextExpiry = (now: Date): Date =>
  new Date(now.getTime() + TICKET_VIEW_LINK_TTL_MS);

/**
 * 폐기한 링크 기록을 지울 시각. 발급 수를 세는 1분 동안은 남겨 둔다 —
 * 바로 지우면 같은 티켓을 반복 발급할 때 기록이 5개로 유지돼 1분 발급 제한에 걸리지 않는다.
 */
export const revokedExpiry = (now: Date): Date =>
  new Date(now.getTime() + TICKET_VIEW_ISSUE_WINDOW_MS);

export const shouldExtend = (
  link: { lastUsedAt?: Date | null },
  now: Date,
): boolean =>
  !link.lastUsedAt ||
  now.getTime() - new Date(link.lastUsedAt).getTime() >=
    TICKET_VIEW_EXTEND_THROTTLE_MS;

type IssueInput = {
  customerId: string;
  // 티켓에 직접 연결된 고객
  ticketCustomerIds: string[];
  // 티켓–고객 연결(conformity)로 이어진 고객
  conformityCustomerIds: string[];
  // 고객이 속한 회사와 티켓에 연결된 회사 — 위젯 "회사 티켓"과 같은 규칙
  customerCompanyIds: string[];
  ticketCompanyIds: string[];
  // 회사 티켓은 공개(visibility가 public이거나 비어 있음)일 때만 위젯에 보인다
  ticketIsPublic: boolean;
};

/** 위젯에서 이미 볼 수 있는 티켓에만 링크를 발급한다 */
export const canIssueLink = ({
  customerId,
  ticketCustomerIds,
  conformityCustomerIds,
  customerCompanyIds,
  ticketCompanyIds,
  ticketIsPublic,
}: IssueInput): boolean => {
  if (!customerId) {
    return false;
  }

  if (
    ticketCustomerIds.includes(customerId) ||
    conformityCustomerIds.includes(customerId)
  ) {
    return true;
  }

  return (
    ticketIsPublic &&
    customerCompanyIds.some((companyId) => ticketCompanyIds.includes(companyId))
  );
};
