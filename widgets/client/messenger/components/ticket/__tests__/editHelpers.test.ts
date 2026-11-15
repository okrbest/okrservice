import {
  buildEditVariables,
  descriptionToText,
  editErrorNotice,
} from '../editHelpers';

describe('descriptionToText', () => {
  it('문단과 줄바꿈 태그를 줄바꿈으로', () => {
    expect(descriptionToText('<p>첫 줄</p><p>둘째 줄</p>')).toBe(
      '첫 줄\n둘째 줄',
    );
    expect(descriptionToText('a<br>b<br />c')).toBe('a\nb\nc');
  });

  it('다른 태그는 지우고 기본 엔티티를 되돌린다', () => {
    expect(
      descriptionToText(
        '<p><strong>A</strong> &amp; &lt;B&gt; &quot;c&quot; &#39;d&#39;&nbsp;e</p>',
      ),
    ).toBe('A & <B> "c" \'d\' e');
  });

  it('비어 있으면 빈 글', () => {
    expect(descriptionToText(undefined)).toBe('');
    expect(descriptionToText('')).toBe('');
  });
});

describe('buildEditVariables', () => {
  const initial = {
    ticketType: 'inquiry',
    description: '첫 줄',
    visibility: 'public',
    attachments: [{ url: 'k1', name: '1.png' }],
  };
  const ids = { customerId: 'c', ticketId: 't' };

  it('바뀐 항목만 보낸다', () => {
    expect(
      buildEditVariables({
        ...ids,
        canEditContent: true,
        initial,
        form: { ...initial, description: '고친 줄' },
      }),
    ).toEqual({ ...ids, description: '고친 줄' });
  });

  it('첨부는 주소 목록이 달라졌을 때만, 새 파일은 저장 키 그대로', () => {
    expect(
      buildEditVariables({
        ...ids,
        canEditContent: true,
        initial,
        form: {
          ...initial,
          attachments: [{ url: 'k2', name: '2.png', type: 'image/png' }],
        },
      }),
    ).toEqual({
      ...ids,
      attachments: [{ url: 'k2', name: '2.png', type: 'image/png' }],
    });
  });

  it('내용을 고칠 수 없으면 공개 설정만 보낸다', () => {
    expect(
      buildEditVariables({
        ...ids,
        canEditContent: false,
        initial,
        form: {
          ...initial,
          ticketType: 'error',
          description: '고친 줄',
          visibility: 'private',
        },
      }),
    ).toEqual({ ...ids, visibility: 'private' });
  });
});

describe('editErrorNotice', () => {
  it('오류 코드별 안내', () => {
    expect(editErrorNotice({ message: 'TICKET_EDIT_STAGE_LOCKED' })).toBe(
      '이미 처리가 시작되어 공개 설정만 바꿀 수 있어요.',
    );
    expect(
      editErrorNotice({
        graphQLErrors: [{ message: 'TICKET_EDIT_NOT_ALLOWED' }],
      }),
    ).toBe('이 티켓은 수정할 수 없어요.');
    expect(editErrorNotice({ message: 'TICKET_EDIT_INVALID_INPUT' })).toBe(
      '입력한 내용을 확인해 주세요.',
    );
    expect(editErrorNotice(new Error('network'))).toBe(
      '저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  });
});
