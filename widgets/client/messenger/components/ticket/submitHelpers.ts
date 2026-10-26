// 위젯 티켓 제출 화면용 순수 도우미

type Contact = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | number;
};

const HANGUL = /[ㄱ-힝]/;

// 연락처 한 줄 요약: "이름 · 이메일(없으면 전화번호)"
export const contactSummary = ({
  firstName,
  lastName,
  email,
  phone,
}: Contact): string => {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  // 한글 이름은 성+이름을 붙여 쓴다(신예지), 그 밖은 이름 성(Jane Doe)
  const name = HANGUL.test(first + last)
    ? `${last}${first}`
    : [first, last].filter(Boolean).join(' ');
  const reach = (email || '').trim() || (phone ? String(phone).trim() : '');

  return [name, reach].filter(Boolean).join(' · ');
};

type Draft = { ticketType?: string; title?: string; description?: string };

export const canSubmitTicket = ({
  ticketType,
  title,
  description,
}: Draft): boolean =>
  !!(ticketType && (title || '').trim() && (description || '').trim());
