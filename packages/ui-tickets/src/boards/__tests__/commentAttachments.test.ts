// ui-tickets에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다(descriptionHistory.test.ts와 같은 설정, testMatch만 이 파일로)
jest.mock('@erxes/ui/src/utils/uploadHandler', () => jest.fn());
jest.mock('@erxes/ui/src/utils/Alert', () => ({ error: jest.fn() }));
// coreui는 모듈 페더레이션 별칭이라 테스트에는 없다
jest.mock('coreui/utils', () => ({ __: (text: string) => text }), {
  virtual: true,
});

import {
  canSubmitComment,
  commentAttachmentsReducer,
  initialCommentAttachments,
  isImageAttachment,
  toAttachmentInputs,
} from '../commentAttachments';

const photo = { name: 'a.png', url: 'key-a.png', type: 'image/png', size: 10 };

describe('commentAttachmentsReducer', () => {
  it('올리기 시작하면 올리는 중, 끝나면 첨부 목록에 들어간다', () => {
    const started = commentAttachmentsReducer(initialCommentAttachments, {
      type: 'start',
      id: 'f1',
    });
    expect(started.pending).toEqual(['f1']);

    const done = commentAttachmentsReducer(started, {
      type: 'done',
      id: 'f1',
      attachment: photo,
    });
    expect(done).toEqual({ pending: [], attachments: [photo] });
  });

  it('실패하면 올리는 중에서만 빠지고 첨부는 늘지 않는다', () => {
    const state = { pending: ['f1', 'f2'], attachments: [] };
    expect(
      commentAttachmentsReducer(state, { type: 'done', id: 'f1' }),
    ).toEqual({ pending: ['f2'], attachments: [] });
  });

  it('시간이 지나 실패로 친 뒤 늦게 성공해도 첨부는 들어간다', () => {
    expect(
      commentAttachmentsReducer(initialCommentAttachments, {
        type: 'done',
        id: 'late',
        attachment: photo,
      }).attachments,
    ).toEqual([photo]);
  });

  it('빼기·비우기', () => {
    const other = { ...photo, url: 'key-b.png' };
    const state = { pending: ['f9'], attachments: [photo, other] };
    expect(
      commentAttachmentsReducer(state, { type: 'remove', index: 0 })
        .attachments,
    ).toEqual([other]);
    // 저장 뒤 비우기: 올리는 중인 것은 그대로 둔다
    expect(commentAttachmentsReducer(state, { type: 'reset' })).toEqual({
      pending: ['f9'],
      attachments: [],
    });
  });
});

describe('canSubmitComment', () => {
  it('글이나 사진 중 하나라도 있으면 저장할 수 있다', () => {
    expect(canSubmitComment('안녕하세요', initialCommentAttachments)).toBe(
      true,
    );
    expect(canSubmitComment('  ', { pending: [], attachments: [photo] })).toBe(
      true,
    );
    expect(canSubmitComment('  ', initialCommentAttachments)).toBe(false);
  });

  it('사진을 올리는 중에는 저장하지 않는다(올라가기 전 저장하면 사진이 빠짐)', () => {
    expect(
      canSubmitComment('글', { pending: ['f1'], attachments: [photo] }),
    ).toBe(false);
  });
});

describe('toAttachmentInputs', () => {
  it('서버 입력 형식(url·name·type·size)만 남기고 주소 없는 것은 뺀다', () => {
    expect(
      toAttachmentInputs([
        { ...photo, duration: 0 } as any,
        { name: 'x.png', url: '' },
      ]),
    ).toEqual([photo]);
  });
});

describe('isImageAttachment', () => {
  it('사진이면 미리보기 그림, 그 밖의 파일은 이름 칸으로 보인다', () => {
    expect(isImageAttachment(photo)).toBe(true);
    expect(
      isImageAttachment({
        name: '견적서.pdf',
        url: 'k.pdf',
        type: 'application/pdf',
      }),
    ).toBe(false);
    expect(
      isImageAttachment({
        name: '보고서.hwp',
        url: 'k.hwp',
        type: 'application/haansoft-hwp',
      }),
    ).toBe(false);
    // 형식 정보가 없으면 그림으로 그리지 않는다(깨진 그림 대신 이름)
    expect(isImageAttachment({ name: 'a.png', url: 'k.png' })).toBe(false);
  });
});
