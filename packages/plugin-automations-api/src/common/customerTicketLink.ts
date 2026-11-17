// 자동화 메일의 {{ customerTicketLink }} — 메일을 받는 고객마다 그 고객 전용 티켓 카드(번호·제목·단계·"티켓 열고 답변 보기" 버튼)로 바꾼다.
// 링크를 받을 수 없는 사람(직원 계정·고객 아님·권한 없음 등)의 메일에서는 칸을 통째로 뺀다.
// 열쇠가 든 본문·주소는 로그에 남기지 않는다.

const PLACEHOLDER = '\\{\\{\\s*customerTicketLink\\s*\\}\\}';
// 다른 링크의 주소 칸에 넣은 경우(편집기가 %7B%7B…로 바꿔 저장하기도 함) — 지원하지 않아 비운다
const ENCODED_PLACEHOLDER =
  '%7B%7B(?:%20|\\s)*customerTicketLink(?:%20|\\s)*%7D%7D';

const placeholderRe = () => new RegExp(PLACEHOLDER, 'g');
const encodedRe = () => new RegExp(ENCODED_PLACEHOLDER, 'gi');
// 태그 속성 값(href="…", alt="…" 등) — 그 안에 든 칸은 링크 태그를 넣으면 HTML이 깨지므로 비운다
const attributeValueRe = () => /=(["'])([^"']*)\1/g;

const BRAND = '#5629B6';
const MUTED = '#6b7280';

const escapeAttr = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeText = (value?: string | null) => escapeAttr(String(value || ''));

// 받는 고객 기준 날짜(예: "12월 1일") — 고객 화면과 같은 한국 시간
const formatUntil = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(date);

export type TicketSummary = {
  number?: string | null;
  name?: string | null;
  stageName?: string | null;
  /** tickets가 위젯과 같은 규칙으로 정한 단계 색 이름 */
  stageTone?: string | null;
};

// 위젯 단계 배지 색(widgets/client/messenger/sass/components/_ticket-progress.scss .tp-tone--*)과 같게 [글자, 바탕]
const STAGE_TONE_COLORS: { [tone: string]: [string, string] } = {
  gray: ['#5f6370', '#f0f1f4'],
  blue: ['#2f6fd6', '#e8f1fd'],
  purple: ['#7a4fd0', '#f1ebfd'],
  teal: ['#12806f', '#e3f5f2'],
  orange: ['#c2620c', '#fff1e3'],
  green: ['#1f9d55', '#e7f6ee'],
  default: ['#4b4fc4', '#eef0fd'],
};

export const hasCustomerTicketLink = (html?: string | null): boolean =>
  Boolean(html) && (placeholderRe().test(html!) || encodedRe().test(html!));

/** 위젯 "새 탭에서 보기"와 같은 주소. 열쇠는 # 뒤에 둬 서버 기록·Referer에 실리지 않게 한다 */
export const buildTicketViewUrl = (widgetsDomain: string, token: string) =>
  `${widgetsDomain.replace(/\/$/, '')}/ticket-view#${token}`;

/**
 * 메일에 들어갈 티켓 카드(번호·제목·현재 단계·버튼·사용 기한).
 * 메일 앱마다 CSS 지원이 달라 표와 인라인 스타일만 쓴다.
 */
export const buildCustomerTicketCardHtml = ({
  url,
  expiresAt,
  ticket,
}: {
  url: string;
  expiresAt: Date | string;
  ticket?: TicketSummary | null;
}) => {
  const number = ticket?.number
    ? `<div style="font-size:12px;color:${MUTED};letter-spacing:0.2px">#${escapeText(ticket.number)}</div>`
    : '';
  const [toneColor, toneBackground] =
    STAGE_TONE_COLORS[ticket?.stageTone || ''] || STAGE_TONE_COLORS.default;
  const stage = ticket?.stageName
    ? `<div style="margin-top:10px"><span style="display:inline-block;font-size:12px;font-weight:600;color:${toneColor};background:${toneBackground};border-radius:999px;padding:3px 10px">현재 단계 · ${escapeText(ticket.stageName)}</span></div>`
    : '';

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;border:1px solid #e3e6ee;border-radius:10px;border-collapse:separate;background:#f8f9fc;margin:16px 0">` +
    `<tr><td style="padding:18px 20px 6px 20px">${number}` +
    `<div style="font-size:17px;font-weight:700;color:#111827;margin-top:4px;line-height:1.4">${escapeText(ticket?.name)}</div>` +
    `${stage}</td></tr>` +
    `<tr><td style="padding:14px 20px 18px 20px">` +
    // ses:no-track — SES 클릭 추적이 주소(열쇠 포함)를 추적 URL에 싣지 않게
    `<a ses:no-track href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:11px 22px;background-color:${BRAND};color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px">티켓 열고 답변 보기</a>` +
    `<div style="font-size:12px;color:${MUTED};margin-top:10px;line-height:1.5">로그인 없이 바로 열려요. 이 버튼은 ${formatUntil(new Date(expiresAt))}까지 쓸 수 있어요.</div>` +
    `</td></tr></table>`
  );
};

/** 받는 사람 몫으로 칸을 채운다. linkHtml이 ''이면 칸을 통째로 뺀다 */
export const fillCustomerTicketLink = (html: string, linkHtml: string) =>
  html
    .replace(
      attributeValueRe(),
      (_match, quote, value) =>
        `=${quote}${value
          .replace(placeholderRe(), '')
          .replace(encodedRe(), '')}${quote}`,
    )
    .replace(encodedRe(), '')
    .replace(placeholderRe(), linkHtml);

type Deps = {
  widgetsDomain?: string;
  /** 같은 메일 주소의 직원 계정이 있으면 그 계정 */
  findUserByEmail: (email: string) => Promise<any>;
  /** tickets의 메일용 열쇠 발급(볼 수 없으면 null) — 카드에 쓸 티켓 요약과 만료 시각을 함께 준다 */
  createEmailLink: (input: {
    ticketId: string;
    customerId: string;
  }) => Promise<{
    token: string;
    expiresAt: Date | string;
    ticket?: TicketSummary | null;
  } | null>;
};

const normalizeEmail = (email?: string | null) =>
  String(email || '')
    .trim()
    .toLowerCase();

/** 받는 사람이 받을 티켓 카드. 받을 수 없거나 실패하면 '' — 메일은 그대로 보낸다 */
export const resolveCustomerTicketLinkHtml = async (
  {
    toEmail,
    customer,
    ticketId,
  }: {
    toEmail: string;
    /** 받는 주소로 찾은 고객 — 그 고객의 대표 메일 주소가 받는 주소와 같을 때만 링크를 만든다 */
    customer?: {
      customerId?: string | null;
      primaryEmail?: string | null;
    } | null;
    ticketId?: string | null;
  },
  deps: Deps,
): Promise<string> => {
  const email = normalizeEmail(toEmail);
  const customerId = customer?.customerId;

  // 공용 주소가 어느 고객의 보조 메일 목록에 들어 있어도, 그 주소로 그 고객 몫의 링크를 보내지 않는다
  if (
    !ticketId ||
    !customerId ||
    !deps.widgetsDomain ||
    !email ||
    normalizeEmail(customer?.primaryEmail) !== email
  ) {
    return '';
  }

  try {
    // 직원 계정 메일은 소문자로 저장된다
    if (await deps.findUserByEmail(email)) {
      return '';
    }

    const link = await deps.createEmailLink({ ticketId, customerId });

    if (!link?.token) {
      return '';
    }

    return buildCustomerTicketCardHtml({
      url: buildTicketViewUrl(deps.widgetsDomain, link.token),
      expiresAt: link.expiresAt,
      ticket: link.ticket,
    });
  } catch {
    return '';
  }
};
