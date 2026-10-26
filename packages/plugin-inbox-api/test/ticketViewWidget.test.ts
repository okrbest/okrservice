// inbox-api 테스트는 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/plugin-inbox-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/ticketViewWidget.test.ts"]}'
import * as crypto from 'crypto';

import {
  TICKET_VIEW_COMMENT_MAX_ATTACHMENTS,
  TICKET_VIEW_COMMENT_MAX_LENGTH,
  hashTicketViewToken,
  parseAllowedFileTypes,
  validateTicketViewComment,
} from '../src/ticketViewWidget';

describe('hashTicketViewToken', () => {
  it('tickets-api가 저장한 지문과 같은 SHA-256 hex', () => {
    expect(hashTicketViewToken('abc')).toBe(
      crypto.createHash('sha256').update('abc').digest('hex'),
    );
  });

  it('열쇠가 문자열이 아니면 빈 값(조회 시 만료로 처리됨)', () => {
    expect(hashTicketViewToken(undefined as any)).toBe('');
  });
});

describe('validateTicketViewComment', () => {
  const ok = (input: any) => () => validateTicketViewComment(input);

  it('평범한 글과 저장소 키 첨부는 통과', () => {
    expect(
      ok({
        content: '<p>문의</p>',
        attachments: [{ url: 'abc123.png', name: 'a.png' }],
      }),
    ).not.toThrow();
    expect(
      ok({ content: '', attachments: [{ url: 'folder/abc.pdf' }] }),
    ).not.toThrow();
  });

  it('글이 너무 길면 거부', () => {
    expect(TICKET_VIEW_COMMENT_MAX_LENGTH).toBe(10000);
    expect(ok({ content: 'a'.repeat(10001) })).toThrow(
      'TICKET_VIEW_INVALID_INPUT',
    );
  });

  it('첨부가 너무 많으면 거부', () => {
    expect(TICKET_VIEW_COMMENT_MAX_ATTACHMENTS).toBe(10);
    const many = Array.from({ length: 11 }, (_, i) => ({ url: `f${i}.png` }));
    expect(ok({ content: 'x', attachments: many })).toThrow(
      'TICKET_VIEW_INVALID_INPUT',
    );
  });

  it('첨부 주소가 저장소 키가 아니면(스킴·외부 주소) 거부', () => {
    for (const url of [
      'javascript:alert(1)//http',
      'https://evil.example/x.png',
      '//evil.example/x',
      'data:text/html,x',
      '',
    ]) {
      expect(ok({ content: 'x', attachments: [{ url }] })).toThrow(
        'TICKET_VIEW_INVALID_INPUT',
      );
    }
  });

  it('글도 첨부도 없으면 거부', () => {
    expect(ok({ content: '   ', attachments: [] })).toThrow(
      'TICKET_VIEW_INVALID_INPUT',
    );
  });
});

describe('parseAllowedFileTypes', () => {
  it('설정 문자열을 위젯 연결과 같은 방식으로 나눈다', () => {
    expect(parseAllowedFileTypes(' image/*, .pdf ,,')).toEqual([
      'image/*',
      '.pdf',
    ]);
    expect(parseAllowedFileTypes(['a'])).toEqual(['a']);
    expect(parseAllowedFileTypes(undefined)).toEqual([]);
  });
});
