// inbox-api 테스트는 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/plugin-inbox-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/widgetTicketEdit.test.ts"]}'
import {
  TICKET_EDIT_INVALID_INPUT,
  validateWidgetTicketEdit,
} from '../src/widgetTicketEdit';

describe('validateWidgetTicketEdit', () => {
  const ok = { customerId: 'c', ticketId: 't' };

  it('보내지 않은 항목은 검사하지 않는다', () => {
    expect(() => validateWidgetTicketEdit(ok)).not.toThrow();
  });

  it('공개 설정은 public / private만', () => {
    expect(() =>
      validateWidgetTicketEdit({ ...ok, visibility: 'private' }),
    ).not.toThrow();
    expect(() =>
      validateWidgetTicketEdit({ ...ok, visibility: 'everyone' }),
    ).toThrow(TICKET_EDIT_INVALID_INPUT);
  });

  it('요청 구분은 접수 화면의 7가지만', () => {
    expect(() =>
      validateWidgetTicketEdit({ ...ok, type: 'usage_guide' }),
    ).not.toThrow();
    expect(() => validateWidgetTicketEdit({ ...ok, type: 'hack' })).toThrow(
      TICKET_EDIT_INVALID_INPUT,
    );
  });

  it('설명은 보냈다면 비울 수 없고 길이 상한이 있다', () => {
    expect(() =>
      validateWidgetTicketEdit({ ...ok, description: '  \n ' }),
    ).toThrow(TICKET_EDIT_INVALID_INPUT);
    expect(() =>
      validateWidgetTicketEdit({ ...ok, description: 'a'.repeat(10001) }),
    ).toThrow(TICKET_EDIT_INVALID_INPUT);
  });

  it('첨부는 개수 상한과 url 문자열 필수', () => {
    expect(() =>
      validateWidgetTicketEdit({
        ...ok,
        attachments: Array.from({ length: 11 }, () => ({ url: 'k' })),
      }),
    ).toThrow(TICKET_EDIT_INVALID_INPUT);
    expect(() =>
      validateWidgetTicketEdit({ ...ok, attachments: [{ url: '' }] }),
    ).toThrow(TICKET_EDIT_INVALID_INPUT);
  });

  it('티켓·고객 id가 없으면 거절', () => {
    expect(() =>
      validateWidgetTicketEdit({ customerId: '', ticketId: 't' }),
    ).toThrow(TICKET_EDIT_INVALID_INPUT);
  });
});
