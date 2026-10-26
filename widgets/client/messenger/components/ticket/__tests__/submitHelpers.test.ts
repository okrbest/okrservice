import { canSubmitTicket, contactSummary } from '../submitHelpers';

describe('contactSummary', () => {
  it('이메일을 먼저, 없으면 전화번호, 이름이 있으면 앞에', () => {
    expect(
      contactSummary({
        email: 'kim@okr.com',
        firstName: '예지',
        lastName: '신',
      }),
    ).toBe('신예지 · kim@okr.com');
    expect(contactSummary({ phone: '01012345678' })).toBe('01012345678');
    expect(
      contactSummary({ firstName: 'Jane', lastName: 'Doe', email: 'j@x.com' }),
    ).toBe('Jane Doe · j@x.com');
  });

  it('아무것도 없으면 빈 문자열(칸을 펼쳐서 받는다)', () => {
    expect(contactSummary({ phone: 0, email: '' })).toBe('');
  });
});

describe('canSubmitTicket', () => {
  it('요청 구분·제목·내용이 모두 있어야 접수할 수 있다', () => {
    expect(
      canSubmitTicket({
        ticketType: 'inquiry',
        title: '제목',
        description: '내용',
      }),
    ).toBe(true);
    expect(
      canSubmitTicket({
        ticketType: 'inquiry',
        title: '  ',
        description: '내용',
      }),
    ).toBe(false);
    expect(
      canSubmitTicket({ ticketType: '', title: '제목', description: '내용' }),
    ).toBe(false);
    expect(
      canSubmitTicket({ ticketType: 'error', title: '제목', description: '' }),
    ).toBe(false);
  });
});
