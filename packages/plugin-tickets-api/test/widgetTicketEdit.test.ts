// tickets-api에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/widgetTicketEdit.test.ts"]}'
import {
  TICKET_EDIT_INVALID_INPUT,
  TICKET_EDIT_NOT_ALLOWED,
  TICKET_EDIT_STAGE_LOCKED,
  buildCustomerEditActivity,
  computeChangedFields,
  decideEdit,
  isFirstStage,
  isTicketOwner,
  toWidgetDescriptionHtml,
  validateEditAttachments,
} from '../src/widgetTicketEdit';

describe('isTicketOwner', () => {
  it('티켓에 연결된 고객이면 본인', () => {
    expect(
      isTicketOwner({
        customerId: 'a',
        ticketCustomerIds: ['a', 'b'],
        conformityCustomerIds: [],
      }),
    ).toBe(true);
  });

  it('티켓 고객이 아니어도 고객 연결(conformity)이 있으면 본인(위젯 목록과 같은 기준)', () => {
    expect(
      isTicketOwner({
        customerId: 'a',
        ticketCustomerIds: ['b'],
        conformityCustomerIds: ['a'],
      }),
    ).toBe(true);
  });

  it('어느 쪽에도 없으면 본인이 아니다', () => {
    expect(
      isTicketOwner({
        customerId: 'a',
        ticketCustomerIds: ['b'],
        conformityCustomerIds: ['c'],
      }),
    ).toBe(false);
  });

  it('티켓 고객 목록이 비었으면 연결(conformity) 고객을 본다', () => {
    expect(
      isTicketOwner({
        customerId: 'a',
        ticketCustomerIds: [],
        conformityCustomerIds: ['a'],
      }),
    ).toBe(true);
  });

  it('고객 id가 없으면 본인이 아니다(방문자)', () => {
    expect(
      isTicketOwner({
        customerId: '',
        ticketCustomerIds: [''],
        conformityCustomerIds: [],
      }),
    ).toBe(false);
  });
});

describe('isFirstStage', () => {
  const stages = [
    { _id: 's2', order: 2 },
    { _id: 's0', order: 0, status: 'archived' },
    { _id: 's1', order: 1 },
  ];

  it('보관된 단계를 빼고 순서상 맨 앞이면 첫 단계', () => {
    expect(isFirstStage(stages, 's1')).toBe(true);
    expect(isFirstStage(stages, 's2')).toBe(false);
  });

  it('보관된 단계는 첫 단계가 아니다', () => {
    expect(isFirstStage(stages, 's0')).toBe(false);
  });

  it('단계를 모르면 첫 단계가 아니다', () => {
    expect(isFirstStage([], 's1')).toBe(false);
    expect(isFirstStage(stages, undefined)).toBe(false);
  });

  it('단계가 하나뿐이면 그 단계가 첫 단계', () => {
    expect(isFirstStage([{ _id: 'x', order: 5 }], 'x')).toBe(true);
  });
});

describe('toWidgetDescriptionHtml', () => {
  it('줄마다 <p>로 감싸고 빈 줄은 뺀다(접수와 같은 규칙)', () => {
    expect(toWidgetDescriptionHtml('첫 줄\n\n둘째 줄\r\n셋째')).toBe(
      '<p>첫 줄</p><p>둘째 줄</p><p>셋째</p>',
    );
  });

  it('이미 태그가 있으면 그대로 둔다', () => {
    expect(toWidgetDescriptionHtml('<p>a</p>')).toBe('<p>a</p>');
  });
});

describe('computeChangedFields', () => {
  const ticket = {
    type: 'inquiry',
    description: '<p>a</p>',
    attachments: [{ url: 'k1', name: '1.png' }],
    visibility: 'public',
  };

  it('보낸 항목 중 값이 다른 것만', () => {
    expect(
      computeChangedFields(ticket, {
        type: 'error',
        description: '<p>a</p>',
        visibility: 'public',
      }),
    ).toEqual(['type']);
  });

  it('보내지 않은 항목은 비교하지 않는다', () => {
    expect(computeChangedFields(ticket, {})).toEqual([]);
  });

  it('첨부는 주소 목록으로 비교한다', () => {
    expect(
      computeChangedFields(ticket, {
        attachments: [{ url: 'k1', name: '다른 이름' }],
      }),
    ).toEqual([]);
    expect(
      computeChangedFields(ticket, {
        attachments: [
          { url: 'k1', name: '1.png' },
          { url: 'k2', name: '2.png' },
        ],
      }),
    ).toEqual(['attachments']);
  });

  it('공개 설정이 비어 있던 티켓은 회사 공개로 본다', () => {
    expect(
      computeChangedFields(
        { ...ticket, visibility: undefined },
        { visibility: 'public' },
      ),
    ).toEqual([]);
  });
});

describe('validateEditAttachments', () => {
  const current = [{ url: 'https://old.example.com/a.png', name: 'a.png' }];

  it('이미 붙어 있던 첨부와 새 저장 키는 허용', () => {
    expect(() =>
      validateEditAttachments(current, [
        { url: 'https://old.example.com/a.png', name: 'a.png' },
        { url: '0123abc.png', name: 'b.png' },
      ]),
    ).not.toThrow();
  });

  it('새 외부 주소는 거절', () => {
    expect(() =>
      validateEditAttachments(current, [
        { url: 'https://evil.example.com/x.png', name: 'x.png' },
      ]),
    ).toThrow(TICKET_EDIT_INVALID_INPUT);
    expect(() =>
      validateEditAttachments(current, [{ url: 'javascript:alert(1)' }]),
    ).toThrow(TICKET_EDIT_INVALID_INPUT);
  });

  it('개수 상한을 넘으면 거절', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ url: `k${i}` }));

    expect(() => validateEditAttachments([], many)).toThrow(
      TICKET_EDIT_INVALID_INPUT,
    );
  });
});

describe('decideEdit', () => {
  const base = { isOwner: true, isArchived: false, isFirstStage: true };

  it('본인이 아니거나 보관된 티켓이면 NOT_ALLOWED', () => {
    expect(() =>
      decideEdit({ ...base, isOwner: false }, ['visibility']),
    ).toThrow(TICKET_EDIT_NOT_ALLOWED);
    expect(() =>
      decideEdit({ ...base, isArchived: true }, ['visibility']),
    ).toThrow(TICKET_EDIT_NOT_ALLOWED);
  });

  it('첫 단계가 아닌데 공개 설정 외 항목을 바꾸면 STAGE_LOCKED', () => {
    expect(() =>
      decideEdit({ ...base, isFirstStage: false }, [
        'visibility',
        'description',
      ]),
    ).toThrow(TICKET_EDIT_STAGE_LOCKED);
  });

  it('첫 단계가 아니어도 공개 설정만이면 허용', () => {
    expect(() =>
      decideEdit({ ...base, isFirstStage: false }, ['visibility']),
    ).not.toThrow();
  });

  it('첫 단계면 모든 항목 허용', () => {
    expect(() =>
      decideEdit(base, ['type', 'description', 'attachments', 'visibility']),
    ).not.toThrow();
  });
});

describe('buildCustomerEditActivity', () => {
  it('고객 수정 활동 기록 형태', () => {
    expect(buildCustomerEditActivity('t1', 'c1', ['description'])).toEqual({
      action: 'customerEdit',
      data: {
        contentType: 'ticket',
        contentId: 't1',
        action: 'customerEdit',
        createdBy: 'c1',
        content: { changedFields: ['description'] },
      },
    });
  });
});
