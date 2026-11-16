// 실행: widgetTicketEdit.test.ts 첫 줄과 같은 명령에서 testMatch만 이 파일로
import { getItemsTotalCountCacheKey } from '../src/graphql/resolvers/customResolvers/itemsTotalCountCacheKey';

const key = (args: any) => getItemsTotalCountCacheKey('stage1', 'user1', args);

describe('getItemsTotalCountCacheKey', () => {
  it('필터가 같으면 같은 키', () => {
    expect(key({ pipelineId: 'p', search: 'a' })).toBe(
      key({ search: 'a', pipelineId: 'p' }),
    );
  });

  it('생성일 필터(extraParams)가 다르면 다른 키 — 필터 전 개수를 다시 쓰지 않는다', () => {
    expect(key({ pipelineId: 'p' })).not.toBe(
      key({
        pipelineId: 'p',
        extraParams: {
          createdStartDate: '2026-10-01',
          createdEndDate: '2026-10-31',
        },
      }),
    );
  });

  it('라벨·부서 같은 다른 필터도 키에 들어간다', () => {
    expect(key({ labelIds: ['l1'] })).not.toBe(key({ labelIds: ['l2'] }));
    expect(key({ departmentIds: ['d1'] })).not.toBe(key({}));
  });

  it('담당자 목록은 순서가 달라도 같은 키', () => {
    expect(key({ assignedUserIds: ['b', 'a'] })).toBe(
      key({ assignedUserIds: ['a', 'b'] }),
    );
  });

  it('값이 비어 있는 필터는 없는 것과 같다', () => {
    expect(key({ search: undefined, labelIds: null })).toBe(key({}));
  });

  it('단계·사용자가 다르면 다른 키', () => {
    expect(getItemsTotalCountCacheKey('s1', 'u', {})).not.toBe(
      getItemsTotalCountCacheKey('s2', 'u', {}),
    );
    expect(getItemsTotalCountCacheKey('s', 'u1', {})).not.toBe(
      getItemsTotalCountCacheKey('s', 'u2', {}),
    );
  });
});
